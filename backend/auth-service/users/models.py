from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.
    - username dùng email
    - role chọn 1 lần sau khi đăng ký
    """

    class Role(models.TextChoices):
        MANAGER = 'manager', 'Manager'
        ANNOTATOR = 'annotator', 'Annotator'
        REVIEWER = 'reviewer', 'Reviewer'

    # Override email → unique
    email = models.EmailField(unique=True)

    # Role fields
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        null=True,
        blank=True,
    )
    role_confirmed = models.BooleanField(default=False)

    # Profile fields
    avatar = models.CharField(max_length=255, blank=True, default='')
    quality_score = models.FloatField(default=0.0)
    tasks_completed = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} ({self.role or "no role"})'
