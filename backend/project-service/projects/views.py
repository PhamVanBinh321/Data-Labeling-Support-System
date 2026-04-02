import requests

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import Project, LabelDefinition, ProjectMember, Dataset
from .permissions import IsManager, IsProjectManager, IsProjectMemberOrManager, IsInternalService
from .serializers import (
    ProjectListSerializer, ProjectDetailSerializer,
    ProjectCreateSerializer, ProjectUpdateSerializer, ProjectStatusSerializer,
    LabelDefinitionSerializer, LabelDefinitionCreateSerializer,
    ProjectMemberSerializer, MyInvitationSerializer, InviteMemberSerializer, UpdateMemberStatusSerializer,
    DatasetSerializer, DatasetCreateSerializer, DatasetUpdateSerializer,
)
from .utils import success_response, error_response


# ─── SERVICE HELPERS ─────────────────────────────────────────────────────────

def _send_notification(recipient_id, notif_type, title, message, task_id, project_id):
    """Gọi notification-service internal API. Fire-and-forget, không raise exception."""
    from django.conf import settings
    try:
        requests.post(
            f'{settings.NOTIFICATION_SERVICE_URL}/api/notify/internal/',
            json={
                'recipient_id': recipient_id,
                'type': notif_type,
                'title': title,
                'message': message,
                'task_id': task_id,
                'project_id': project_id,
            },
            headers={'X-Internal-Service': 'true'},
            timeout=2,
        )
    except Exception:
        pass  # Không để lỗi notify ảnh hưởng project flow


# ─── Projects ─────────────────────────────────────────────────────────────────

class ProjectListCreateView(APIView):
    """
    GET  /api/projects/  — list projects theo role
    POST /api/projects/  — tạo project mới (manager only)
    """

    def get(self, request):
        role = request.user.role
        user_id = request.user.id

        if role == 'manager':
            qs = Project.objects.filter(manager_id=user_id)
        else:
            # annotator / reviewer: chỉ thấy projects mình là member active
            member_project_ids = ProjectMember.objects.filter(
                user_id=user_id,
                status=ProjectMember.Status.ACTIVE,
            ).values_list('project_id', flat=True)
            qs = Project.objects.filter(id__in=member_project_ids)

        serializer = ProjectListSerializer(qs, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        if request.user.role != 'manager':
            return error_response(
                message='Chỉ Manager mới có thể tạo project.',
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ProjectCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        project = serializer.save(manager_id=request.user.id)
        return success_response(
            data=ProjectDetailSerializer(project).data,
            message='Tạo project thành công.',
            status=status.HTTP_201_CREATED,
        )


class MyInvitationsView(APIView):
    """GET /api/projects/my-invitations/ — danh sách lời mời pending của user hiện tại."""

    def get(self, request):
        invitations = ProjectMember.objects.select_related('project').filter(
            user_id=request.user.id,
            status=ProjectMember.Status.PENDING,
        ).order_by('-invited_at')
        return success_response(data=MyInvitationSerializer(invitations, many=True).data)


class ProjectDetailView(APIView):
    """
    GET    /api/projects/{id}/  — chi tiết
    PATCH  /api/projects/{id}/  — cập nhật (manager only)
    DELETE /api/projects/{id}/  — xóa (manager only, chỉ khi draft)
    """

    def _get_project(self, pk):
        try:
            return Project.objects.prefetch_related('labels').get(pk=pk)
        except Project.DoesNotExist:
            return None

    def _check_access(self, request, project):
        """Trả về True nếu user có quyền xem project."""
        if project.manager_id == request.user.id:
            return True
        return ProjectMember.objects.filter(
            project=project,
            user_id=request.user.id,
            status=ProjectMember.Status.ACTIVE,
        ).exists()

    def get(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if not self._check_access(request, project):
            return error_response(message='Bạn không có quyền xem project này.', status=status.HTTP_403_FORBIDDEN)
        return success_response(data=ProjectDetailSerializer(project).data)

    def patch(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectUpdateSerializer(project, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        project = serializer.save()
        return success_response(
            data=ProjectDetailSerializer(project).data,
            message='Cập nhật project thành công.',
        )

    def delete(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        if project.status != Project.Status.DRAFT:
            return error_response(
                message='Chỉ có thể xóa project ở trạng thái Draft.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        project.delete()
        return success_response(message='Đã xóa project.')


class ProjectStatusView(APIView):
    """PATCH /api/projects/{id}/status/ — đổi trạng thái project."""

    def patch(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectStatusSerializer(data=request.data, context={'project': project})
        if not serializer.is_valid():
            return error_response(
                message='Không thể đổi trạng thái.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        project.status = serializer.validated_data['status']
        project.save(update_fields=['status', 'updated_at'])
        return success_response(
            data=ProjectDetailSerializer(project).data,
            message=f'Đã chuyển trạng thái project sang "{project.status}".',
        )


# ─── Labels ───────────────────────────────────────────────────────────────────

class LabelListCreateView(APIView):
    """
    GET  /api/projects/{id}/labels/  — list labels
    POST /api/projects/{id}/labels/  — thêm label (manager only)
    """

    def _get_project(self, pk):
        try:
            return Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return None

    def _check_member_or_manager(self, request, project):
        if project.manager_id == request.user.id:
            return True
        return ProjectMember.objects.filter(
            project=project,
            user_id=request.user.id,
            status=ProjectMember.Status.ACTIVE,
        ).exists()

    def get(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if not self._check_member_or_manager(request, project):
            return error_response(message='Bạn không có quyền truy cập project này.', status=status.HTTP_403_FORBIDDEN)
        labels = project.labels.all()
        return success_response(data=LabelDefinitionSerializer(labels, many=True).data)

    def post(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = LabelDefinitionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu label không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        label = serializer.save(project=project)
        return success_response(
            data=LabelDefinitionSerializer(label).data,
            message='Thêm label thành công.',
            status=status.HTTP_201_CREATED,
        )


class LabelDetailView(APIView):
    """
    PATCH  /api/projects/{id}/labels/{lid}/  — sửa label
    DELETE /api/projects/{id}/labels/{lid}/  — xóa label
    """

    def _get_label(self, project_pk, label_pk):
        try:
            return LabelDefinition.objects.select_related('project').get(
                pk=label_pk, project_id=project_pk
            )
        except LabelDefinition.DoesNotExist:
            return None

    def patch(self, request, pk, lid):
        label = self._get_label(pk, lid)
        if label is None:
            return error_response(message='Label không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if label.project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = LabelDefinitionSerializer(label, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        label = serializer.save()
        return success_response(
            data=LabelDefinitionSerializer(label).data,
            message='Cập nhật label thành công.',
        )

    def delete(self, request, pk, lid):
        label = self._get_label(pk, lid)
        if label is None:
            return error_response(message='Label không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if label.project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        label.delete()
        return success_response(message='Đã xóa label.')


# ─── Members ──────────────────────────────────────────────────────────────────

class MemberListCreateView(APIView):
    """
    GET  /api/projects/{id}/members/  — list members (manager only)
    POST /api/projects/{id}/members/  — mời member (manager only)
    """

    def _get_project(self, pk):
        try:
            return Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return None

    def get(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        members = project.members.all().order_by('-invited_at')
        return success_response(data=ProjectMemberSerializer(members, many=True).data)

    def post(self, request, pk):
        project = self._get_project(pk)
        if project is None:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = InviteMemberSerializer(data=request.data, context={'project': project})
        if not serializer.is_valid():
            return error_response(
                message='Không thể mời thành viên.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        member = ProjectMember.objects.create(
            project=project,
            user_id=serializer.validated_data['user_id'],
            role=serializer.validated_data['role'],
        )
        user_id = serializer.validated_data['user_id']
        _send_notification(
            recipient_id=user_id,
            notif_type='member_invited',
            title='Bạn được mời vào project',
            message=f'Manager đã mời bạn tham gia project "{project.name}".',
            task_id=None,
            project_id=project.id,
        )
        return success_response(
            data=ProjectMemberSerializer(member).data,
            message='Đã gửi lời mời.',
            status=status.HTTP_201_CREATED,
        )


class MemberStatusView(APIView):
    """PATCH /api/projects/{id}/members/{mid}/status/ — accept hoặc decline invite."""

    def patch(self, request, pk, mid):
        try:
            member = ProjectMember.objects.select_related('project').get(pk=mid, project_id=pk)
        except ProjectMember.DoesNotExist:
            return error_response(message='Lời mời không tồn tại.', status=status.HTTP_404_NOT_FOUND)

        # Chỉ chủ nhân của invite mới được accept/decline
        if member.user_id != request.user.id:
            return error_response(
                message='Bạn không có quyền thay đổi lời mời này.',
                status=status.HTTP_403_FORBIDDEN,
            )
        if member.status != ProjectMember.Status.PENDING:
            return error_response(
                message=f'Lời mời đã ở trạng thái "{member.status}", không thể thay đổi.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = UpdateMemberStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_status = serializer.validated_data['status']
        member.status = new_status
        if new_status == ProjectMember.Status.ACTIVE:
            from django.utils import timezone
            member.joined_at = timezone.now()
        member.save()
        msg = 'Đã tham gia project.' if new_status == ProjectMember.Status.ACTIVE else 'Đã từ chối lời mời.'
        return success_response(data=ProjectMemberSerializer(member).data, message=msg)


class MemberDeleteView(APIView):
    """DELETE /api/projects/{id}/members/{mid}/ — kick member (manager only)."""

    def delete(self, request, pk, mid):
        try:
            member = ProjectMember.objects.select_related('project').get(pk=mid, project_id=pk)
        except ProjectMember.DoesNotExist:
            return error_response(message='Thành viên không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if member.project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        member.delete()
        return success_response(message='Đã xóa thành viên khỏi project.')


# ─── Datasets ─────────────────────────────────────────────────────────────────

class DatasetListCreateView(APIView):
    """
    GET  /api/datasets/?project_id={id}  — list datasets
    POST /api/datasets/                   — tạo dataset (manager only)
    """

    def _is_project_accessible(self, request, project):
        if project.manager_id == request.user.id:
            return True
        return ProjectMember.objects.filter(
            project=project,
            user_id=request.user.id,
            status=ProjectMember.Status.ACTIVE,
        ).exists()

    def get(self, request):
        project_id = request.query_params.get('project_id')
        if not project_id:
            return error_response(
                message='Thiếu tham số project_id.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if not self._is_project_accessible(request, project):
            return error_response(message='Bạn không có quyền truy cập project này.', status=status.HTTP_403_FORBIDDEN)
        datasets = Dataset.objects.filter(project=project)
        return success_response(data=DatasetSerializer(datasets, many=True).data)

    def post(self, request):
        project_id = request.data.get('project_id')
        if not project_id:
            return error_response(message='Thiếu project_id.', status=status.HTTP_400_BAD_REQUEST)
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = DatasetCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        dataset = serializer.save(project=project, uploaded_by=request.user.id)
        return success_response(
            data=DatasetSerializer(dataset).data,
            message='Tạo dataset thành công.',
            status=status.HTTP_201_CREATED,
        )


class DatasetDetailView(APIView):
    """
    GET    /api/datasets/{id}/  — chi tiết
    PATCH  /api/datasets/{id}/  — cập nhật status/counters (manager only)
    DELETE /api/datasets/{id}/  — xóa (manager only)
    """

    def _get_dataset(self, pk):
        try:
            return Dataset.objects.select_related('project').get(pk=pk)
        except Dataset.DoesNotExist:
            return None

    def _check_access(self, request, dataset):
        project = dataset.project
        if project.manager_id == request.user.id:
            return True
        return ProjectMember.objects.filter(
            project=project,
            user_id=request.user.id,
            status=ProjectMember.Status.ACTIVE,
        ).exists()

    def get(self, request, pk):
        dataset = self._get_dataset(pk)
        if dataset is None:
            return error_response(message='Dataset không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if not self._check_access(request, dataset):
            return error_response(message='Bạn không có quyền truy cập dataset này.', status=status.HTTP_403_FORBIDDEN)
        return success_response(data=DatasetSerializer(dataset).data)

    def patch(self, request, pk):
        dataset = self._get_dataset(pk)
        if dataset is None:
            return error_response(message='Dataset không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if dataset.project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        serializer = DatasetUpdateSerializer(dataset, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message='Dữ liệu không hợp lệ.',
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        dataset = serializer.save()
        return success_response(data=DatasetSerializer(dataset).data, message='Cập nhật dataset thành công.')

    def delete(self, request, pk):
        dataset = self._get_dataset(pk)
        if dataset is None:
            return error_response(message='Dataset không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        if dataset.project.manager_id != request.user.id:
            return error_response(message='Bạn không phải Manager của project này.', status=status.HTTP_403_FORBIDDEN)
        dataset.delete()
        return success_response(message='Đã xóa dataset.')


# ─── Internal API ─────────────────────────────────────────────────────────────

class InternalProjectView(APIView):
    """GET /api/projects/internal/projects/{id}/ — dùng bởi task-service."""
    permission_classes = [IsInternalService]

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        return success_response(data={
            'id': project.id,
            'name': project.name,
            'type': project.type,
            'status': project.status,
            'manager_id': project.manager_id,
        })


class InternalLabelsView(APIView):
    """GET /api/projects/internal/projects/{id}/labels/ — dùng bởi annotation-service."""
    permission_classes = [IsInternalService]

    def get(self, request, pk):
        try:
            project = Project.objects.prefetch_related('labels').get(pk=pk)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        return success_response(data=LabelDefinitionSerializer(project.labels.all(), many=True).data)


class InternalMembersView(APIView):
    """GET /api/projects/internal/projects/{id}/members/ — dùng bởi task-service."""
    permission_classes = [IsInternalService]

    def get(self, request, pk):
        members = ProjectMember.objects.filter(
            project_id=pk,
            status=ProjectMember.Status.ACTIVE,
        ).values('user_id', 'role')
        return success_response(data=list(members))


class InternalCountersView(APIView):
    """PATCH /api/projects/internal/projects/{id}/counters/ — dùng bởi task-service."""
    permission_classes = [IsInternalService]

    def patch(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return error_response(message='Project không tồn tại.', status=status.HTTP_404_NOT_FOUND)

        update_fields = ['updated_at']
        if 'annotated_images' in request.data:
            project.annotated_images = request.data['annotated_images']
            update_fields.append('annotated_images')
        if 'approved_images' in request.data:
            project.approved_images = request.data['approved_images']
            update_fields.append('approved_images')
        if 'total_images' in request.data:
            project.total_images = request.data['total_images']
            update_fields.append('total_images')

        project.save(update_fields=update_fields)
        return success_response(
            data={'id': project.id, 'total_images': project.total_images,
                  'annotated_images': project.annotated_images,
                  'approved_images': project.approved_images},
            message='Cập nhật counters thành công.',
        )


class InternalDatasetView(APIView):
    """GET /api/projects/internal/datasets/{id}/ — dùng bởi annotation-service."""
    permission_classes = [IsInternalService]

    def get(self, request, pk):
        try:
            dataset = Dataset.objects.get(pk=pk)
        except Dataset.DoesNotExist:
            return error_response(message='Dataset không tồn tại.', status=status.HTTP_404_NOT_FOUND)
        return success_response(data=DatasetSerializer(dataset).data)
