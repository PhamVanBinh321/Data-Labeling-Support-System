import time
import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Chạy RabbitMQ consumer để nhận và xử lý notification events'

    def handle(self, *args, **options):
        from notifications.consumer import start_consuming

        while True:
            try:
                self.stdout.write('Kết nối RabbitMQ...')
                start_consuming()
            except KeyboardInterrupt:
                self.stdout.write(self.style.SUCCESS('Consumer dừng.'))
                break
            except Exception as e:
                logger.error('Consumer lỗi: %s — thử lại sau 5 giây', e)
                self.stdout.write(self.style.WARNING(f'Lỗi: {e} — thử lại sau 5 giây'))
                time.sleep(5)
