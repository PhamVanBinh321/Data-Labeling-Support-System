from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    message = 'Chỉ Manager mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'manager'
        )


class IsAnnotator(BasePermission):
    message = 'Chỉ Annotator mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'annotator'
        )


class IsReviewer(BasePermission):
    message = 'Chỉ Reviewer mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'reviewer'
        )


class IsAnnotatorOrReviewer(BasePermission):
    message = 'Chỉ Annotator hoặc Reviewer mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('annotator', 'reviewer')
        )


class IsAnyRole(BasePermission):
    """Bất kỳ user đã xác thực với role hợp lệ."""
    message = 'Bạn không có quyền truy cập.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('manager', 'annotator', 'reviewer')
        )


class IsInternalService(BasePermission):
    """Chỉ internal service calls — header: X-Internal-Service: true"""
    message = 'Endpoint này chỉ dành cho internal service.'

    def has_permission(self, request, view):
        return request.headers.get('X-Internal-Service') == 'true'
