from django.apps import AppConfig


class AnnotationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'annotations'
    verbose_name = 'Annotations'

    def ready(self):
        try:
            from annotations.storage import ensure_bucket_exists
            ensure_bucket_exists()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'MinIO bucket init failed (will retry on first upload): {e}')
