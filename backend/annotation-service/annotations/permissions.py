from rest_framework.permissions import BasePermission


class IsAnnotator(BasePermission):
    """Chỉ Annotator mới được gọi endpoint này."""
    message = 'Chỉ Annotator mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'annotator'
        )


class IsReviewer(BasePermission):
    """Chỉ Reviewer mới được gọi endpoint này."""
    message = 'Chỉ Reviewer mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'reviewer'
        )


class IsManager(BasePermission):
    """Chỉ Manager mới được gọi endpoint này."""
    message = 'Chỉ Manager mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'manager'
        )


class IsAnnotatorOrReviewer(BasePermission):
    """Annotator hoặc Reviewer đều được phép."""
    message = 'Chỉ Annotator hoặc Reviewer mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('annotator', 'reviewer')
        )


class IsAnnotatorOrReviewerOrManager(BasePermission):
    """Bất kỳ user đã xác thực với role hợp lệ."""
    message = 'Bạn không có quyền truy cập.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('annotator', 'reviewer', 'manager')
        )


class IsInternalService(BasePermission):
    """
    Chỉ internal service calls mới được phép.
    Client phải gửi header: X-Internal-Service: true
    """
    message = 'Endpoint này chỉ dành cho internal service.'

    def has_permission(self, request, view):
        return request.headers.get('X-Internal-Service') == 'true'
