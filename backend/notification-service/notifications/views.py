from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer, BulkCreateNotificationSerializer
from .permissions import IsAnyRole, IsInternalService
from .utils import success_response, error_response


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
        count = Notification.objects.filter(
            recipient_id=request.user.id,
            is_read=False,
        ).count()
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
        return success_response(message='Đã xóa notification.')
