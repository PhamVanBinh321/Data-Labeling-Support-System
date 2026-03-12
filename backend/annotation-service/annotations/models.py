from django.db import models


class ImageFile(models.Model):
    """
    File ảnh thuộc về một task. index là thứ tự trong task (0-based).
    task_id và project_id tham chiếu cross-service.
    """

    task_id = models.IntegerField(db_index=True)
    project_id = models.IntegerField(db_index=True)
    dataset_id = models.IntegerField(null=True, blank=True, db_index=True)

    index = models.IntegerField()  # Thứ tự ảnh trong task, 0-based
    file_path = models.CharField(max_length=500)  # Relative path dưới MEDIA_ROOT
    original_filename = models.CharField(max_length=255, blank=True, default='')

    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)

    is_confirmed = models.BooleanField(default=False)  # Annotator đã confirm ảnh này

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'image_files'
        unique_together = ('task_id', 'index')
        ordering = ['task_id', 'index']

    @property
    def url(self):
        return f'/media/{self.file_path}'

    def __str__(self):
        return f'Task {self.task_id} / Image #{self.index}'


class Annotation(models.Model):
    """
    Một annotation (bounding box, polygon, etc.) trên một ảnh.
    Mỗi ảnh có thể có nhiều annotations.

    Toạ độ lưu theo pixel (absolute), không normalize.
    Format: x, y = top-left corner; width, height = kích thước box.
    """

    class AnnotationType(models.TextChoices):
        BOUNDING_BOX = 'bounding_box', 'Bounding Box'
        POLYGON = 'polygon', 'Polygon'
        CLASSIFICATION = 'classification', 'Classification'
        SEGMENTATION = 'segmentation', 'Segmentation'
        TEXT = 'text_classification', 'Text Classification'

    image = models.ForeignKey(ImageFile, on_delete=models.CASCADE, related_name='annotations')

    # Label info (denormalized từ project-service để không cần join)
    label_id = models.CharField(max_length=100)
    label_name = models.CharField(max_length=100)
    label_color = models.CharField(max_length=7)  # Hex color

    # Bounding box coordinates (pixels)
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)
    width = models.FloatField(default=0)
    height = models.FloatField(default=0)

    # Polygon / Segmentation (optional — JSON array of points)
    points = models.JSONField(null=True, blank=True)

    annotation_type = models.CharField(
        max_length=30,
        choices=AnnotationType.choices,
        default=AnnotationType.BOUNDING_BOX,
    )
    comment = models.CharField(max_length=500, blank=True, default='')

    created_by = models.IntegerField()  # user_id từ auth-service
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'annotations'
        ordering = ['image', 'created_at']

    def __str__(self):
        return f'Image {self.image_id} / {self.label_name} @ ({self.x},{self.y})'
