from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer, BulkCreateNotificationSerializer
from .permissions import IsAnyRole, IsInternalService
from .utils import success_response, error_response
from .cache import get_unread_count, set_unread_count, invalidate_unread_count


# ─── PAGINATION ───────────────────────────────────────────────────────────────

class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─── USER-FACING VIEWS ────────────────────────────────────────────────────────

class NotificationListView(APIView):
    """
    GET /api/notify/
    Lấy danh sách notifications của user đang đăng nhập.
    Query params:
        ?is_read=true|false  — lọc theo trạng thái đọc
        ?type=task_assigned  — lọc theo loại
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def get(self, request):
        qs = Notification.objects.filter(recipient_id=request.user.id)

        is_read = request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')

        notif_type = request.query_params.get('type')
        if notif_type:
            qs = qs.filter(type=notif_type)

        paginator = NotificationPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationSerializer(page, many=True)

        return success_response({
            'results': serializer.data,
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


class UnreadCountView(APIView):
    """
    GET /api/notify/unread-count/
    Trả về số lượng notifications chưa đọc.
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def get(self, request):
        user_id = request.user.id
        count = get_unread_count(user_id)
        if count is None:
            count = Notification.objects.filter(
                recipient_id=user_id,
                is_read=False,
            ).count()
            set_unread_count(user_id, count)
        return success_response({'unread_count': count})


class NotificationMarkReadView(APIView):
    """
    POST /api/notify/<pk>/read/
    Đánh dấu 1 notification đã đọc.
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient_id=request.user.id)
        except Notification.DoesNotExist:
            return error_response('Không tìm thấy notification.', status=404)

        if notif.is_read:
            return success_response(NotificationSerializer(notif).data, message='Đã đọc rồi.')

        notif.is_read = True
        notif.save(update_fields=['is_read'])
        invalidate_unread_count(request.user.id)
        return success_response(NotificationSerializer(notif).data, message='Đã đánh dấu đã đọc.')


class NotificationReadAllView(APIView):
    """
    POST /api/notify/read-all/
    Đánh dấu tất cả notifications của user là đã đọc (bulk update).
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient_id=request.user.id,
            is_read=False,
        ).update(is_read=True)
        invalidate_unread_count(request.user.id)
        return success_response(
            {'updated': updated},
            message=f'Đã đánh dấu {updated} notification đã đọc.',
        )


class NotificationDeleteView(APIView):
    """
    DELETE /api/notify/<pk>/
    Xóa 1 notification của user.
    """
    permission_classes = [IsAuthenticated, IsAnyRole]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient_id=request.user.id)
        except Notification.DoesNotExist:
            return error_response('Không tìm thấy notification.', status=404)

        notif.delete()
        invalidate_unread_count(request.user.id)
        return success_response(message='Đã xóa notification.')


# ─── INTERNAL API VIEWS ───────────────────────────────────────────────────────

class InternalCreateNotificationView(APIView):
    """
    POST /api/notify/internal/
    Header: X-Internal-Service: true

    task-service / project-service gọi để tạo 1 notification.
    Body: { recipient_id, type, title, message, task_id?, project_id? }
    """
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = CreateNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        notif = Notification.objects.create(**serializer.validated_data)
        invalidate_unread_count(notif.recipient_id)
        return success_response(
            NotificationSerializer(notif).data,
            message='Tạo notification thành công.',
            status=201,
        )


class InternalBulkCreateNotificationView(APIView):
    """
    POST /api/notify/internal/bulk/
    Header: X-Internal-Service: true

    Tạo nhiều notifications cùng lúc (atomic).
    Body: { "notifications": [ { recipient_id, type, title, message, ... }, ... ] }
    """
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = BulkCreateNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        items = serializer.validated_data['notifications']

        with transaction.atomic():
            new_notifs = Notification.objects.bulk_create([
                Notification(**item) for item in items
            ])

        # Invalidate cache cho từng recipient bị ảnh hưởng
        affected_users = {item['recipient_id'] for item in items}
        for uid in affected_users:
            invalidate_unread_count(uid)

        return success_response(
            NotificationSerializer(new_notifs, many=True).data,
            message=f'Đã tạo {len(new_notifs)} notification.',
            status=201,
        )
