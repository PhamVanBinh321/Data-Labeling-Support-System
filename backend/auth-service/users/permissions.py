from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    """Chỉ Manager mới được gọi endpoint này."""
    message = 'Chỉ Manager mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'manager'
        )


class IsAnnotator(BasePermission):
    """Chỉ Annotator."""
    message = 'Chỉ Annotator mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'annotator'
        )


class IsReviewer(BasePermission):
    """Chỉ Reviewer."""
    message = 'Chỉ Reviewer mới có quyền thực hiện hành động này.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'reviewer'
        )


class IsManagerOrReadOnly(BasePermission):
    """Manager có full access. Các role khác chỉ GET."""
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return request.user and request.user.is_authenticated
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'manager'
        )


class IsRoleConfirmed(BasePermission):
    """User đã xác nhận role mới được dùng."""
    message = 'Vui lòng chọn role trước khi tiếp tục.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role_confirmed
        )
