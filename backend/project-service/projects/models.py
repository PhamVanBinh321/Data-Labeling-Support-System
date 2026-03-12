from django.db import models


class Project(models.Model):
    """
    Một dự án gán nhãn. Manager tạo và quản lý.
    manager_id tham chiếu tới User.id trong auth-service (không FK thật).
    """

    class Type(models.TextChoices):
        BOUNDING_BOX = 'bounding_box', 'Bounding Box'
        POLYGON = 'polygon', 'Polygon'
        CLASSIFICATION = 'classification', 'Classification'
        SEGMENTATION = 'segmentation', 'Segmentation'
        TEXT_CLASSIFICATION = 'text_classification', 'Text Classification'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=30, choices=Type.choices)
    description = models.TextField(blank=True, default='')
    guidelines = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Denormalized counters — cập nhật khi task được approve
    total_images = models.IntegerField(default=0)
    annotated_images = models.IntegerField(default=0)
    approved_images = models.IntegerField(default=0)

    # Reference tới auth-service
    manager_id = models.IntegerField(db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.type})'


class LabelDefinition(models.Model):
    """
    Nhãn (class) được định nghĩa trong project. Mỗi project có N labels.
    attributes lưu dạng JSON: [{"name": "color", "type": "select", "options": ["red","blue"]}]
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='labels')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7)  # Hex: #FF5733
    attributes = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'label_definitions'
        unique_together = ('project', 'name')

    def __str__(self):
        return f'{self.project.name} / {self.name}'


class ProjectMember(models.Model):
    """
    Thành viên được mời vào project. user_id tham chiếu auth-service.
    """

    class Role(models.TextChoices):
        ANNOTATOR = 'annotator', 'Annotator'
        REVIEWER = 'reviewer', 'Reviewer'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        DECLINED = 'declined', 'Declined'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user_id = models.IntegerField(db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    invited_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_members'
        unique_together = ('project', 'user_id')

    def __str__(self):
        return f'Project {self.project_id} / User {self.user_id} ({self.role})'


class Dataset(models.Model):
    """
    Dataset được import vào project. Có thể từ local upload hoặc cloud.
    """

    class Type(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
        TEXT = 'text', 'Text'

    class Status(models.TextChoices):
        IMPORTED = 'imported', 'Imported'
        PROCESSING = 'processing', 'Processing'
        READY = 'ready', 'Ready'
        ERROR = 'error', 'Error'

    class Source(models.TextChoices):
        LOCAL = 'local', 'Local Upload'
        S3 = 's3', 'AWS S3'
        AZURE = 'azure', 'Azure Blob'
        GCS = 'gcs', 'Google Cloud Storage'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.IMAGE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IMPORTED)
    total_files = models.IntegerField(default=0)
    total_size_mb = models.FloatField(default=0.0)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.LOCAL)

    uploaded_by = models.IntegerField()  # user_id từ auth-service
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.name} ({self.project.name})'
