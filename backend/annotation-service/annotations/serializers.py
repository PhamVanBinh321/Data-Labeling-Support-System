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
    project_id bắt buộc; task_id tuỳ chọn (null = upload vào project pool chưa assign).
    """
    file = serializers.ImageField()
    project_id = serializers.IntegerField(min_value=1)
    task_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
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
        Upload file lên MinIO, đọc kích thước ảnh từ memory, tạo ImageFile record.
        Nếu task_id=None → lưu vào project pool (chưa assign task).
        """
        import io as _io
        from annotations.storage import upload_file, ensure_bucket_exists

        file = self.validated_data['file']
        task_id = self.validated_data.get('task_id')
        project_id = self.validated_data['project_id']
        dataset_id = self.validated_data.get('dataset_id')

        # Đọc toàn bộ file vào memory một lần
        file_bytes = file.read()

        # Đọc width/height từ memory (không cần ghi ra disk)
        try:
            with PILImage.open(_io.BytesIO(file_bytes)) as img:
                width, height = img.size
        except Exception:
            width, height = 0, 0

        # Object name trong MinIO (giữ cấu trúc path như cũ)
        if task_id:
            object_name = f'tasks/{task_id}/{index}_{file.name}'
        else:
            object_name = f'projects/{project_id}/unassigned/{index}_{file.name}'

        # Detect content type
        ext = file.name.rsplit('.', 1)[-1].lower()
        content_type = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                        'gif': 'image/gif', 'webp': 'image/webp'}.get(ext, 'application/octet-stream')

        ensure_bucket_exists()
        upload_file(object_name, file_bytes, content_type)

        return ImageFile.objects.create(
            task_id=task_id,
            project_id=project_id,
            dataset_id=dataset_id,
            index=index,
            file_path=object_name,
            original_filename=file.name,
            width=width,
            height=height,
        )


# ─── ANNOTATION SERIALIZERS ───────────────────────────────────────────────────

class AnnotationSerializer(serializers.ModelSerializer):
    """Serializer output đầy đủ cho Annotation."""

    class Meta:
        model = Annotation
        fields = (
            'id', 'image_id',
            'label_id', 'label_name', 'label_color',
            'x', 'y', 'width', 'height', 'points',
            'annotation_type', 'comment',
            'created_by', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')


class AnnotationCreateSerializer(serializers.Serializer):
    """Validate dữ liệu khi tạo 1 annotation mới."""

    image_id = serializers.IntegerField(min_value=1)
    label_id = serializers.CharField(max_length=100)
    label_name = serializers.CharField(max_length=100)
    label_color = serializers.CharField(max_length=7)
    annotation_type = serializers.ChoiceField(
        choices=Annotation.AnnotationType.choices,
        default=Annotation.AnnotationType.BOUNDING_BOX,
    )
    x = serializers.FloatField(default=0, min_value=0)
    y = serializers.FloatField(default=0, min_value=0)
    width = serializers.FloatField(default=0, min_value=0)
    height = serializers.FloatField(default=0, min_value=0)
    points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
        required=False,
        allow_null=True,
    )
    comment = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')

    def validate_label_color(self, value):
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError('label_color phải là hex color (#RRGGBB).')
        return value

    def validate(self, data):
        ann_type = data.get('annotation_type', Annotation.AnnotationType.BOUNDING_BOX)
        if ann_type == Annotation.AnnotationType.POLYGON:
            points = data.get('points')
            if not points or len(points) < 3:
                raise serializers.ValidationError(
                    {'points': 'Polygon cần ít nhất 3 điểm.'}
                )
        return data


class AnnotationUpdateSerializer(serializers.Serializer):
    """Partial update — chỉ cho phép sửa tọa độ, label, comment."""

    label_id = serializers.CharField(max_length=100, required=False)
    label_name = serializers.CharField(max_length=100, required=False)
    label_color = serializers.CharField(max_length=7, required=False)
    x = serializers.FloatField(min_value=0, required=False)
    y = serializers.FloatField(min_value=0, required=False)
    width = serializers.FloatField(min_value=0, required=False)
    height = serializers.FloatField(min_value=0, required=False)
    points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
        required=False,
        allow_null=True,
    )
    comment = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_label_color(self, value):
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError('label_color phải là hex color (#RRGGBB).')
        return value


class BulkAnnotationItemSerializer(serializers.Serializer):
    """Một item trong bulk save — không cần image_id (lấy từ URL)."""

    label_id = serializers.CharField(max_length=100, allow_blank=True, default='')
    label_name = serializers.CharField(max_length=100, allow_blank=True, default='')
    label_color = serializers.CharField(max_length=7)
    annotation_type = serializers.ChoiceField(
        choices=Annotation.AnnotationType.choices,
        default=Annotation.AnnotationType.BOUNDING_BOX,
    )
    x = serializers.FloatField(default=0, min_value=0)
    y = serializers.FloatField(default=0, min_value=0)
    width = serializers.FloatField(default=0, min_value=0)
    height = serializers.FloatField(default=0, min_value=0)
    points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
        required=False,
        allow_null=True,
    )
    comment = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')

    def validate_label_color(self, value):
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError('label_color phải là hex color (#RRGGBB).')
        return value


class BulkAnnotationSerializer(serializers.Serializer):
    """
    Nhận danh sách annotations cho 1 ảnh.
    Dùng cho bulk-save: xóa toàn bộ cũ, insert lại từ đầu (atomic).
    """
    annotations = serializers.ListField(
        child=BulkAnnotationItemSerializer(),
        allow_empty=True,
    )
