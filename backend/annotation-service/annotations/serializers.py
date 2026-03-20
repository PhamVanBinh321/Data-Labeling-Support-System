import os
from django.conf import settings
from rest_framework import serializers
from PIL import Image as PILImage

from .models import ImageFile, Annotation

# ─── CONSTANTS ────────────────────────────────────────────────────────────────
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ─── IMAGE FILE SERIALIZERS ───────────────────────────────────────────────────

class ImageFileSerializer(serializers.ModelSerializer):
    """Serializer output cho ImageFile — dùng trong list và detail."""

    url = serializers.SerializerMethodField()
    annotation_count = serializers.SerializerMethodField()

    class Meta:
        model = ImageFile
        fields = (
            'id', 'task_id', 'project_id', 'dataset_id',
            'index', 'url', 'original_filename',
            'width', 'height', 'is_confirmed',
            'annotation_count', 'uploaded_at',
        )
        read_only_fields = fields

    def get_url(self, obj):
        return obj.url

    def get_annotation_count(self, obj):
        return obj.annotations.count()


class ImageUploadSerializer(serializers.Serializer):
    """
    Validate file upload.
    Nhận 1 file tại 1 thời điểm — gọi nhiều lần để upload nhiều ảnh.
    task_id, project_id bắt buộc; dataset_id tuỳ chọn.
    """
    file = serializers.ImageField()
    task_id = serializers.IntegerField(min_value=1)
    project_id = serializers.IntegerField(min_value=1)
    dataset_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)

    def validate_file(self, value):
        if value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f'Chỉ chấp nhận JPG, PNG, WebP. Nhận được: {value.content_type}'
            )
        if value.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f'File quá lớn. Tối đa {MAX_FILE_SIZE_MB}MB.'
            )
        return value

    def save_image(self, index: int) -> ImageFile:
        """
        Lưu file vào disk, đọc kích thước ảnh, tạo ImageFile record.
        Trả về instance ImageFile đã được lưu.
        """
        file = self.validated_data['file']
        task_id = self.validated_data['task_id']
        project_id = self.validated_data['project_id']
        dataset_id = self.validated_data.get('dataset_id')

        # Tạo đường dẫn: tasks/<task_id>/<index>_<filename>
        ext = os.path.splitext(file.name)[1].lower() or '.jpg'
        relative_path = f'tasks/{task_id}/{index}_{file.name}'
        abs_path = os.path.join(settings.MEDIA_ROOT, relative_path)

        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        # Đọc width/height
        try:
            with PILImage.open(abs_path) as img:
                width, height = img.size
        except Exception:
            width, height = 0, 0

        return ImageFile.objects.create(
            task_id=task_id,
            project_id=project_id,
            dataset_id=dataset_id,
            index=index,
            file_path=relative_path,
            original_filename=file.name,
            width=width,
            height=height,
        )
