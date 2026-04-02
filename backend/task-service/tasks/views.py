import requests
from datetime import date, datetime, timezone

from django.conf import settings
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Task, TaskStatusHistory
from .serializers import (
    TaskListSerializer, TaskDetailSerializer,
    TaskCreateSerializer, TaskUpdateSerializer,
    TaskStatusSerializer, TaskStatusHistorySerializer,
)
from .permissions import IsManager, IsAnnotator, IsReviewer, IsAnyRole, IsInternalService
from .utils import success_response, error_response
from .publisher import publish_notification


# ─── SERVICE HELPERS ─────────────────────────────────────────────────────────

def _send_notification(recipient_id, notif_type, title, message, task_id, project_id):
    """Publish notification event lên RabbitMQ (thay thế HTTP call trực tiếp)."""
    publish_notification(recipient_id, notif_type, title, message, task_id, project_id)


def _sync_project_counters(project_id):
    """
    Tính lại counters cho project từ tất cả tasks, rồi PATCH sang project-service.
    Fire-and-forget — không raise exception để không ảnh hưởng task flow.
    """
    try:
        tasks = Task.objects.filter(project_id=project_id)
        total     = sum(t.total_images for t in tasks)
        annotated = sum(t.total_images for t in tasks if t.status in (
            Task.Status.IN_REVIEW, Task.Status.APPROVED, Task.Status.COMPLETED
        ))
        approved  = sum(t.total_images for t in tasks if t.status in (
            Task.Status.APPROVED, Task.Status.COMPLETED
        ))
        requests.patch(
            f'{settings.PROJECT_SERVICE_URL}/api/projects/internal/projects/{project_id}/counters/',
            json={'total_images': total, 'annotated_images': annotated, 'approved_images': approved},
            headers={'X-Internal-Service': 'true'},
            timeout=2,
        )
    except Exception:
        pass


# ─── TASK CRUD ────────────────────────────────────────────────────────────────

class TaskListView(APIView):
    """
    GET  /api/tasks/  — list tasks theo role
    POST /api/tasks/  — manager tạo task mới
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def get(self, request):
        role = request.user.role
        uid = request.user.id

        if role == 'manager':
            # Manager có thể filter theo project_id
            project_id = request.query_params.get('project_id')
            qs = Task.objects.all()
            if project_id:
                qs = qs.filter(project_id=project_id)
        elif role == 'annotator':
            qs = Task.objects.filter(annotator_id=uid)
        else:  # reviewer
            qs = Task.objects.filter(reviewer_id=uid)

        # Filter thêm theo status nếu có
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = TaskListSerializer(qs, many=True)
        return success_response(serializer.data)

    def post(self, request):
        if request.user.role != 'manager':
            return error_response('Chỉ Manager mới được tạo task.', status=403)

        serializer = TaskCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        task = Task.objects.create(**serializer.validated_data)

        # Ghi history khởi tạo
        TaskStatusHistory.objects.create(
            task=task,
            from_status='',
            to_status=task.status,
            changed_by=request.user.id,
        )

        return success_response(
            TaskDetailSerializer(task).data,
            message='Tạo task thành công.',
            status=201,
        )


class TaskDetailView(APIView):
    """
    GET    /api/tasks/<pk>/  — xem chi tiết task
    PATCH  /api/tasks/<pk>/  — manager sửa info task
    DELETE /api/tasks/<pk>/  — manager xóa task (chỉ draft/pending)
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def _get_task(self, pk, user):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return None, error_response('Không tìm thấy task.', status=404)

        # Kiểm tra quyền truy cập: manager xem tất cả, annotator/reviewer chỉ xem task của mình
        role = user.role
        uid = user.id
        if role == 'annotator' and task.annotator_id != uid:
            return None, error_response('Bạn không có quyền truy cập task này.', status=403)
        if role == 'reviewer' and task.reviewer_id != uid:
            return None, error_response('Bạn không có quyền truy cập task này.', status=403)

        return task, None

    def get(self, request, pk):
        task, err = self._get_task(pk, request.user)
        if err:
            return err
        return success_response(TaskDetailSerializer(task).data)

    def patch(self, request, pk):
        if request.user.role != 'manager':
            return error_response('Chỉ Manager mới được sửa task.', status=403)

        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        if task.status == Task.Status.COMPLETED:
            return error_response('Không thể sửa task đã hoàn thành.', status=400)

        serializer = TaskUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        for field, value in serializer.validated_data.items():
            setattr(task, field, value)
        task.save()

        return success_response(
            TaskDetailSerializer(task).data,
            message='Cập nhật task thành công.',
        )

    def delete(self, request, pk):
        if request.user.role != 'manager':
            return error_response('Chỉ Manager mới được xóa task.', status=403)

        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        if task.status not in (Task.Status.DRAFT, Task.Status.PENDING):
            return error_response(
                'Chỉ có thể xóa task ở trạng thái draft hoặc pending.', status=400
            )

        task.delete()
        return success_response(message='Đã xóa task.')


# ─── STATE MACHINE + HISTORY ──────────────────────────────────────────────────

class TaskStatusView(APIView):
    """
    PATCH /api/tasks/<pk>/status/
    Đổi trạng thái task theo state machine. Role-based.
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def patch(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        serializer = TaskStatusSerializer(
            data=request.data,
            context={'task': task, 'user': request.user},
        )
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        new_status = serializer.validated_data['status']
        reject_reason = serializer.validated_data.get('reject_reason', '')
        old_status = task.status

        with transaction.atomic():
            task.status = new_status

            if new_status == Task.Status.REJECTED:
                task.reject_reason = reject_reason

            if new_status == Task.Status.IN_REVIEW:
                task.submitted_at = datetime.now(tz=timezone.utc)

            task.save()

            TaskStatusHistory.objects.create(
                task=task,
                from_status=old_status,
                to_status=new_status,
                changed_by=request.user.id,
                reject_reason=reject_reason,
            )

        # Đồng bộ counters sang project-service (fire-and-forget)
        _sync_project_counters(task.project_id)

        # Gửi notification sau khi đổi status (fire-and-forget)
        if new_status == Task.Status.IN_PROGRESS:
            _send_notification(
                task.annotator_id, 'task_assigned',
                'Task đã sẵn sàng',
                f'Task "{task.name}" đã được mở, hãy bắt đầu.',
                task.id, task.project_id,
            )
        elif new_status == Task.Status.IN_REVIEW:
            _send_notification(
                task.reviewer_id, 'task_submitted',
                'Task cần review',
                f'Annotator đã nộp task "{task.name}".',
                task.id, task.project_id,
            )
        elif new_status == Task.Status.APPROVED:
            _send_notification(
                task.annotator_id, 'task_approved',
                'Task được duyệt',
                f'Task "{task.name}" đã được reviewer chấp thuận.',
                task.id, task.project_id,
            )
        elif new_status == Task.Status.REJECTED:
            _send_notification(
                task.annotator_id, 'task_rejected',
                'Task bị từ chối',
                f'Task "{task.name}" bị từ chối: {reject_reason}',
                task.id, task.project_id,
            )

        return success_response(
            TaskDetailSerializer(task).data,
            message=f'Task đã chuyển sang trạng thái "{new_status}".',
        )


class TaskHistoryView(APIView):
    """
    GET /api/tasks/<pk>/history/
    Xem audit log lịch sử thay đổi trạng thái.
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def get(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        # Kiểm tra quyền truy cập
        role = request.user.role
        uid = request.user.id
        if role == 'annotator' and task.annotator_id != uid:
            return error_response('Bạn không có quyền xem task này.', status=403)
        if role == 'reviewer' and task.reviewer_id != uid:
            return error_response('Bạn không có quyền xem task này.', status=403)

        history = task.history.all()
        return success_response(TaskStatusHistorySerializer(history, many=True).data)


# ─── DASHBOARD VIEWS ──────────────────────────────────────────────────────────

class ManagerDashboardView(APIView):
    """
    GET /api/tasks/dashboard/manager/?project_id=<id>
    Thống kê tổng hợp cho Manager.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        qs = Task.objects.all()

        project_id = request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)

        today = date.today()

        total = qs.count()
        status_counts = {}
        for choice in Task.Status.values:
            status_counts[choice.replace('-', '_')] = qs.filter(status=choice).count()

        by_priority = {}
        for p in Task.Priority.values:
            by_priority[p] = qs.filter(priority=p).count()

        overdue = qs.exclude(
            status__in=[Task.Status.COMPLETED, Task.Status.APPROVED]
        ).filter(deadline__lt=today).count()

        return success_response({
            'total': total,
            **status_counts,
            'by_priority': by_priority,
            'overdue': overdue,
        })


class AnnotatorDashboardView(APIView):
    """
    GET /api/tasks/dashboard/annotator/
    Danh sách tasks của annotator, tóm tắt theo status.
    """
    permission_classes = [IsAuthenticated, IsAnnotator]

    def get(self, request):
        uid = request.user.id
        qs = Task.objects.filter(annotator_id=uid)
        today = date.today()

        tasks = TaskListSerializer(qs.order_by('deadline'), many=True).data

        summary = {}
        for choice in Task.Status.values:
            summary[choice.replace('-', '_')] = qs.filter(status=choice).count()

        overdue = qs.exclude(
            status__in=[Task.Status.COMPLETED, Task.Status.APPROVED]
        ).filter(deadline__lt=today).count()

        return success_response({
            'summary': {**summary, 'overdue': overdue},
            'tasks': tasks,
        })


class ReviewerDashboardView(APIView):
    """
    GET /api/tasks/dashboard/reviewer/
    Tasks đang in-review giao cho reviewer, sort by deadline.
    """
    permission_classes = [IsAuthenticated, IsReviewer]

    def get(self, request):
        uid = request.user.id
        qs = Task.objects.filter(reviewer_id=uid)
        today = date.today()

        pending_review = qs.filter(status=Task.Status.IN_REVIEW).order_by('deadline')
        all_tasks = qs.order_by('deadline')

        summary = {}
        for choice in Task.Status.values:
            summary[choice.replace('-', '_')] = qs.filter(status=choice).count()

        overdue = qs.exclude(
            status__in=[Task.Status.COMPLETED, Task.Status.APPROVED]
        ).filter(deadline__lt=today).count()

        return success_response({
            'summary': {**summary, 'overdue': overdue},
            'pending_review': TaskListSerializer(pending_review, many=True).data,
            'all_tasks': TaskListSerializer(all_tasks, many=True).data,
        })


# ─── INTERNAL APIs ────────────────────────────────────────────────────────────

class InternalCountersView(APIView):
    """
    PATCH /api/tasks/internal/tasks/<pk>/counters/
    Header: X-Internal-Service: true

    annotation-service cập nhật tổng số ảnh và số ảnh đã confirm.
    Body: { "total_images": 10, "completed_images": 7 }
    """
    permission_classes = [IsInternalService]

    def patch(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        total = request.data.get('total_images')
        completed = request.data.get('completed_images')

        update_fields = []
        if total is not None:
            task.total_images = int(total)
            update_fields.append('total_images')
        if completed is not None:
            task.completed_images = int(completed)
            update_fields.append('completed_images')

        if update_fields:
            task.save(update_fields=update_fields)

        return success_response({
            'task_id': task.id,
            'total_images': task.total_images,
            'completed_images': task.completed_images,
        }, message='Cập nhật counters thành công.')


class InternalProjectTasksView(APIView):
    """
    GET /api/tasks/internal/projects/<project_id>/tasks/
    Header: X-Internal-Service: true

    project-service lấy danh sách tasks của project.
    """
    permission_classes = [IsInternalService]

    def get(self, request, project_id):
        tasks = Task.objects.filter(project_id=project_id).order_by('-created_at')
        return success_response(TaskListSerializer(tasks, many=True).data)


class InternalTaskDetailView(APIView):
    """
    GET /api/tasks/internal/tasks/<pk>/
    Header: X-Internal-Service: true

    annotation-service lấy thông tin task (project_id, annotator_id, ...).
    """
    permission_classes = [IsInternalService]

    def get(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return error_response('Không tìm thấy task.', status=404)

        return success_response({
            'id': task.id,
            'project_id': task.project_id,
            'annotator_id': task.annotator_id,
            'reviewer_id': task.reviewer_id,
            'status': task.status,
            'name': task.name,
        })
