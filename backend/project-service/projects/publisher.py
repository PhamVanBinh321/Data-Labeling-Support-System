"""
RabbitMQ publisher cho project-service.

Exchange : dlss.events  (topic, durable)
Routing  : notification.project
"""
import json
import logging

import pika
from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = 'dlss.events'
ROUTING_KEY = 'notification.project'


def publish_notification(recipient_id: int, notif_type: str,
                         title: str, message: str,
                         task_id: int = None, project_id: int = None) -> None:
    """
    Publish 1 notification event lên RabbitMQ.
    Fire-and-forget: nếu RabbitMQ không khả dụng → log warning, không raise.
    """
    payload = {
        'recipient_id': recipient_id,
        'type': notif_type,
        'title': title,
        'message': message,
        'task_id': task_id,
        'project_id': project_id,
    }
    try:
        params = pika.URLParameters(settings.RABBITMQ_URL)
        params.socket_timeout = 3
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE, exchange_type='topic', durable=True)
        channel.basic_publish(
            exchange=EXCHANGE,
            routing_key=ROUTING_KEY,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type='application/json',
            ),
        )
        connection.close()
        logger.debug('Published %s notification for user %s', notif_type, recipient_id)
    except Exception as e:
        logger.warning('RabbitMQ publish failed (project-service): %s', e)
