from django.db import models


class Task(models.Model):
    """
    Một batch công việc được giao cho Annotator.
    Tất cả user IDs tham chiếu auth-service, project_id tham chiếu project-service.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in-progress', 'In Progress'
        IN_REVIEW = 'in-review', 'In Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        COMPLETED = 'completed', 'Completed'

    class Priority(models.TextChoices):
        HIGH = 'High', 'High'
        MEDIUM = 'Medium', 'Medium'
        LOW = 'Low', 'Low'

    # ── Relationships (cross-service, no FK) ──────────────────────────────────
    project_id = models.IntegerField(db_index=True)
    annotator_id = models.IntegerField(db_index=True)
    reviewer_id = models.IntegerField(db_index=True)

    # ── Task info ─────────────────────────────────────────────────────────────
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    deadline = models.DateField()

    # ── Progress ──────────────────────────────────────────────────────────────
    total_images = models.IntegerField(default=0)
    completed_images = models.IntegerField(default=0)

    # ── Review fields ─────────────────────────────────────────────────────────
    submitted_at = models.DateTimeField(null=True, blank=True)
    quality_score = models.FloatField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']

    # ── State machine validation ───────────────────────────────────────────────
    VALID_TRANSITIONS = {
        Status.DRAFT: [Status.PENDING],
        Status.PENDING: [Status.IN_PROGRESS],
        Status.IN_PROGRESS: [Status.IN_REVIEW],
        Status.IN_REVIEW: [Status.APPROVED, Status.REJECTED],
        Status.REJECTED: [Status.IN_PROGRESS],
        Status.APPROVED: [Status.COMPLETED],
        Status.COMPLETED: [],
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def __str__(self):
        return f'Task {self.id}: {self.name} [{self.status}]'


class TaskStatusHistory(models.Model):
    """
    Lịch sử thay đổi trạng thái của task — audit log.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='history')
    from_status = models.CharField(max_length=20, blank=True, default='')
    to_status = models.CharField(max_length=20)
    changed_by = models.IntegerField()  # user_id
    reject_reason = models.TextField(blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_status_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f'Task {self.task_id}: {self.from_status} → {self.to_status}'
