from django.db import models


class Notification(models.Model):
    """
    In-app notification. Sau này tích hợp Firebase push notification.
    recipient_id tham chiếu auth-service.
    """

    class Type(models.TextChoices):
        TASK_ASSIGNED = 'task_assigned', 'Task Assigned'
        TASK_SUBMITTED = 'task_submitted', 'Task Submitted'
        TASK_APPROVED = 'task_approved', 'Task Approved'
        TASK_REJECTED = 'task_rejected', 'Task Rejected'
        MEMBER_INVITED = 'member_invited', 'Member Invited'
        SYSTEM = 'system', 'System'

    recipient_id = models.IntegerField(db_index=True)
    type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Context references (cross-service, no FK)
    task_id = models.IntegerField(null=True, blank=True)
    project_id = models.IntegerField(null=True, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient_id', 'is_read']),
        ]

    def __str__(self):
        return f'→ User {self.recipient_id}: [{self.type}] {self.title}'
