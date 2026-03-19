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


class IsProjectManager(BasePermission):
    """Object-level: chỉ manager_id == request.user.id mới được thao tác."""
    message = 'Bạn không phải Manager của project này.'

    def has_object_permission(self, request, view, obj):
        from .models import Project
        project = obj if isinstance(obj, Project) else obj.project
        return project.manager_id == request.user.id


class IsProjectMemberOrManager(BasePermission):
    """
    User là member active hoặc là manager của project.
    Dùng cho read-only operations trên resource thuộc project.
    """
    message = 'Bạn không có quyền truy cập project này.'

    def has_object_permission(self, request, view, obj):
        from .models import Project, ProjectMember
        project = obj if isinstance(obj, Project) else obj.project
        if project.manager_id == request.user.id:
            return True
        return ProjectMember.objects.filter(
            project=project,
            user_id=request.user.id,
            status=ProjectMember.Status.ACTIVE,
        ).exists()


class IsInternalService(BasePermission):
    """
    Chỉ internal service calls mới được phép.
    Client phải gửi header: X-Internal-Service: true
    """
    message = 'Endpoint này chỉ dành cho internal service.'

    def has_permission(self, request, view):
        return request.headers.get('X-Internal-Service') == 'true'
