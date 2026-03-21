from datetime import date
from rest_framework import serializers
from .models import Task, TaskStatusHistory


# ─── STATUS HISTORY ───────────────────────────────────────────────────────────

class TaskStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatusHistory
        fields = ('id', 'from_status', 'to_status', 'changed_by', 'reject_reason', 'changed_at')
        read_only_fields = fields


# ─── TASK OUTPUT SERIALIZERS ──────────────────────────────────────────────────

class TaskListSerializer(serializers.ModelSerializer):
    """Output gọn cho list — không kèm history."""
    progress_percent = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id', 'name', 'status', 'priority', 'deadline',
            'project_id', 'annotator_id', 'reviewer_id',
            'total_images', 'completed_images', 'progress_percent',
            'is_overdue', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_progress_percent(self, obj):
        if obj.total_images == 0:
            return 0
        return round(obj.completed_images / obj.total_images * 100, 1)

    def get_is_overdue(self, obj):
        if obj.status in (Task.Status.COMPLETED, Task.Status.APPROVED):
            return False
        return obj.deadline < date.today()


class TaskDetailSerializer(serializers.ModelSerializer):
    """Output đầy đủ cho detail — kèm history."""
    progress_percent = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    history = TaskStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            'id', 'name', 'status', 'priority', 'deadline',
            'project_id', 'annotator_id', 'reviewer_id',
            'total_images', 'completed_images', 'progress_percent',
            'submitted_at', 'quality_score', 'reject_reason',
            'is_overdue', 'history',
            'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_progress_percent(self, obj):
        if obj.total_images == 0:
            return 0
        return round(obj.completed_images / obj.total_images * 100, 1)

    def get_is_overdue(self, obj):
        if obj.status in (Task.Status.COMPLETED, Task.Status.APPROVED):
            return False
        return obj.deadline < date.today()


# ─── TASK INPUT SERIALIZERS ───────────────────────────────────────────────────

class TaskCreateSerializer(serializers.Serializer):
    """Validate khi manager tạo task mới."""
    name = serializers.CharField(max_length=255)
    project_id = serializers.IntegerField(min_value=1)
    annotator_id = serializers.IntegerField(min_value=1)
    reviewer_id = serializers.IntegerField(min_value=1)
    deadline = serializers.DateField()
    priority = serializers.ChoiceField(choices=Task.Priority.choices, default=Task.Priority.MEDIUM)

    def validate_deadline(self, value):
        if value < date.today():
            raise serializers.ValidationError('Deadline không được là ngày trong quá khứ.')
        return value

    def validate(self, data):
        if data.get('annotator_id') == data.get('reviewer_id'):
            raise serializers.ValidationError(
                'annotator_id và reviewer_id không được trùng nhau.'
            )
        return data


class TaskUpdateSerializer(serializers.Serializer):
    """Partial update — manager sửa info task (khi chưa completed)."""
    name = serializers.CharField(max_length=255, required=False)
    annotator_id = serializers.IntegerField(min_value=1, required=False)
    reviewer_id = serializers.IntegerField(min_value=1, required=False)
    deadline = serializers.DateField(required=False)
    priority = serializers.ChoiceField(choices=Task.Priority.choices, required=False)

    def validate_deadline(self, value):
        if value < date.today():
            raise serializers.ValidationError('Deadline không được là ngày trong quá khứ.')
        return value


class TaskStatusSerializer(serializers.Serializer):
    """
    Validate khi đổi trạng thái task.
    Kiểm tra: state machine hợp lệ + role được phép.
    """
    status = serializers.ChoiceField(choices=Task.Status.choices)
    reject_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    # Role rules: which roles can trigger which target status
    ROLE_ALLOWED = {
        Task.Status.PENDING: 'manager',        # draft → pending
        Task.Status.IN_PROGRESS: 'annotator',  # pending/rejected → in-progress
        Task.Status.IN_REVIEW: 'annotator',    # in-progress → in-review
        Task.Status.APPROVED: 'reviewer',      # in-review → approved
        Task.Status.REJECTED: 'reviewer',      # in-review → rejected
        Task.Status.COMPLETED: 'manager',      # approved → completed
    }

    def validate(self, data):
        task = self.context['task']
        user = self.context['user']
        new_status = data['status']

        # 1. Kiểm tra state machine
        if not task.can_transition_to(new_status):
            raise serializers.ValidationError(
                f'Không thể chuyển từ "{task.status}" sang "{new_status}".'
            )

        # 2. Kiểm tra role
        required_role = self.ROLE_ALLOWED.get(new_status)
        if required_role and user.role != required_role:
            raise serializers.ValidationError(
                f'Chỉ {required_role} mới được chuyển task sang trạng thái "{new_status}".'
            )

        # 3. Annotator chỉ được đổi task của mình
        if user.role == 'annotator' and task.annotator_id != user.id:
            raise serializers.ValidationError('Bạn không phải annotator của task này.')

        # 4. Reviewer chỉ được đổi task của mình
        if user.role == 'reviewer' and task.reviewer_id != user.id:
            raise serializers.ValidationError('Bạn không phải reviewer của task này.')

        # 5. Rejected bắt buộc có reject_reason
        if new_status == Task.Status.REJECTED and not data.get('reject_reason', '').strip():
            raise serializers.ValidationError(
                {'reject_reason': 'Phải nhập lý do từ chối khi reject task.'}
            )

        return data
