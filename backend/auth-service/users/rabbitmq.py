import pika
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def publish_event(exchange, routing_key, event_type, data):
    """
    Hàm tiện ích gửi message qua RabbitMQ.
    """
    try:
        host = getattr(settings, 'RABBITMQ_HOST', 'localhost')
        port = getattr(settings, 'RABBITMQ_PORT', 5672)
        user = getattr(settings, 'RABBITMQ_USER', 'guest')
        password = getattr(settings, 'RABBITMQ_PASSWORD', 'guest')

        credentials = pika.PlainCredentials(user, password)
        parameters = pika.ConnectionParameters(host, port, '/', credentials)
        
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.exchange_declare(exchange=exchange, exchange_type='topic', durable=True)

        message = {
            'event': event_type,
            'data': data
        }

        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent
            )
        )
        connection.close()
    except Exception as e:
        logger.error(f"Failed to publish to RabbitMQ: {e}")
