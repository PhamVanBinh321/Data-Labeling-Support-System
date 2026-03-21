from datetime import date, datetime, timezone

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
