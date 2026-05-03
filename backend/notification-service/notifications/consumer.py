"""
RabbitMQ consumer cho notification-service.

Lắng nghe exchange 'dlss.events', binding key 'notification.#'
→ nhận message từ task-service và project-service
→ tạo Notification record trong DB

Chạy bằng: python manage.py run_consumer
"""
import json
import logging

import django
import pika
from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = 'dlss.events'
QUEUE = 'notification.queue'
BINDING_KEY = 'notification.#'


def _handle_message(channel, method, properties, body):
    """Callback xử lý mỗi message nhận được."""
    try:
        payload = json.loads(body)
        
        # Xử lý sự kiện quên mật khẩu từ auth-service
        event_type = payload.get('event')
        if event_type == 'forgot_password_requested':
            event_data = payload.get('data', {})
            email = event_data.get('email')
            name = event_data.get('name')
            reset_link = event_data.get('reset_link')
            
            from django.core.mail import send_mail
            send_mail(
                subject='Yêu cầu đặt lại mật khẩu - Data Labeling System',
                message=f'Chào {name},\n\nVui lòng truy cập đường dẫn sau để đặt lại mật khẩu của bạn:\n{reset_link}\n\nĐường dẫn này có hiệu lực trong 15 phút.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@dlss.com'),
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info('Đã gửi email quên mật khẩu cho %s', email)
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Xử lý in-app notification (cũ)
        data = payload
        recipient_id = data.get('recipient_id')
        notif_type = data.get('type')
        title = data.get('title', '')
        message = data.get('message', '')
        task_id = data.get('task_id')
        project_id = data.get('project_id')

        if not recipient_id or not notif_type:
            logger.warning('Message thiếu recipient_id hoặc type, bỏ qua: %s', data)
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Import ở đây để đảm bảo Django đã setup
        from notifications.models import Notification
        from notifications.cache import invalidate_unread_count, get_fcm_token
        from notifications.firebase import send_push

        Notification.objects.create(
            recipient_id=recipient_id,
            type=notif_type,
            title=title,
            message=message,
            task_id=task_id,
            project_id=project_id,
        )
        invalidate_unread_count(recipient_id)

        # Gửi FCM push nếu user đã đăng ký token
        fcm_token = get_fcm_token(recipient_id)
        if fcm_token:
            send_push(fcm_token, title, message, recipient_id=recipient_id)

        logger.info('Tạo notification %s cho user %s', notif_type, recipient_id)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error('Lỗi xử lý message: %s | body: %s', e, body)
        # Nack và không requeue để tránh vòng lặp lỗi
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def start_consuming():
    """Kết nối RabbitMQ và bắt đầu consume (blocking)."""
    params = pika.URLParameters(settings.RABBITMQ_URL)
    params.heartbeat = 60
    params.blocked_connection_timeout = 300

    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Khai báo exchange + queue + binding (in-app notification)
    channel.exchange_declare(exchange=EXCHANGE, exchange_type='topic', durable=True)
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=BINDING_KEY)

    # Lắng nghe thêm event forgot_password từ auth_events
    channel.exchange_declare(exchange='auth_events', exchange_type='topic', durable=True)
    channel.queue_bind(queue=QUEUE, exchange='auth_events', routing_key='user.forgot_password')

    # Xử lý từng message một (prefetch=1)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE, on_message_callback=_handle_message)

    logger.info('Consumer đang chạy, lắng nghe queue "%s"...', QUEUE)
    channel.start_consuming()
