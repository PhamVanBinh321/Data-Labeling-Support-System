from rest_framework.permissions import BasePermission


class IsAnyRole(BasePermission):
    """User đã xác thực với role hợp lệ (annotator, reviewer, manager)."""
    message = 'Bạn cần đăng nhập với tài khoản hợp lệ.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('annotator', 'reviewer', 'manager', 'admin')
        )


class IsInternalService(BasePermission):
    """
    Chỉ internal service calls mới được phép.
    Client phải gửi header: X-Internal-Service: true
    """
    message = 'Endpoint này chỉ dành cho internal service.'

    def has_permission(self, request, view):
        return request.headers.get('X-Internal-Service') == 'true'
