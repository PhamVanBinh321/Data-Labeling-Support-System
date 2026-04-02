import os
from django.core.management.base import BaseCommand
from django.conf import settings
from annotations.models import ImageFile
from annotations.storage import upload_file, ensure_bucket_exists, get_client


class Command(BaseCommand):
    help = 'Di chuyển ảnh từ local disk (/media) lên MinIO (chạy 1 lần khi migration)'

    def handle(self, *args, **options):
        ensure_bucket_exists()
        client = get_client()

        images = ImageFile.objects.all().order_by('id')
        total = images.count()
        self.stdout.write(f'Tìm thấy {total} ảnh cần migrate...\n')

        success = skipped = failed = 0

        for image in images:
            object_name = image.file_path
            abs_path = os.path.join('/media', object_name)

            # Kiểm tra object đã tồn tại trên MinIO (idempotent)
            try:
                client.stat_object(settings.MINIO_BUCKET, object_name)
                skipped += 1
                continue
            except Exception:
                pass  # Chưa có → cần upload

            if not os.path.exists(abs_path):
                self.stdout.write(self.style.WARNING(
                    f'  [SKIP] File không tồn tại trên disk: {abs_path}'
                ))
                failed += 1
                continue

            try:
                with open(abs_path, 'rb') as f:
                    file_bytes = f.read()

                ext = object_name.rsplit('.', 1)[-1].lower()
                content_type = {
                    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                    'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
                }.get(ext, 'application/octet-stream')

                upload_file(object_name, file_bytes, content_type)
                success += 1
                self.stdout.write(f'  [OK] {object_name}')
            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f'  [FAIL] {object_name}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nHoàn tất: {success} uploaded, {skipped} đã có sẵn, {failed} thất bại / tổng {total}'
        ))
