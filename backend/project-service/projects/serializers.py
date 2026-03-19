import re
from rest_framework import serializers
from .models import Project, LabelDefinition, ProjectMember, Dataset


# ─── Label serializers ────────────────────────────────────────────────────────

class LabelDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabelDefinition
        fields = ('id', 'name', 'color', 'attributes')

    def validate_color(self, value):
        if not re.fullmatch(r'#[0-9A-Fa-f]{6}', value):
            raise serializers.ValidationError('Màu phải ở định dạng hex 6 ký tự, ví dụ #FF5733.')
        return value.upper()


class LabelDefinitionCreateSerializer(LabelDefinitionSerializer):
    class Meta(LabelDefinitionSerializer.Meta):
        fields = ('name', 'color', 'attributes')


# ─── Project serializers ──────────────────────────────────────────────────────

class ProjectListSerializer(serializers.ModelSerializer):
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'name', 'type', 'status',
            'total_images', 'annotated_images', 'approved_images',
            'progress_percent', 'manager_id', 'created_at', 'updated_at',
        )

    def get_progress_percent(self, obj):
        if obj.total_images == 0:
            return 0
        return round(obj.approved_images / obj.total_images * 100, 1)


class ProjectDetailSerializer(serializers.ModelSerializer):
    labels = LabelDefinitionSerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'name', 'type', 'description', 'guidelines', 'status',
            'total_images', 'annotated_images', 'approved_images',
            'progress_percent', 'manager_id', 'labels', 'member_count',
            'created_at', 'updated_at',
        )

    def get_progress_percent(self, obj):
        if obj.total_images == 0:
            return 0
        return round(obj.approved_images / obj.total_images * 100, 1)

    def get_member_count(self, obj):
        return obj.members.filter(status=ProjectMember.Status.ACTIVE).count()


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('name', 'type', 'description', 'guidelines')

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Tên project không được để trống.')
        return value


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('name', 'description', 'guidelines')

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Tên project không được để trống.')
        return value


class ProjectStatusSerializer(serializers.Serializer):
    VALID_TRANSITIONS = {
        Project.Status.DRAFT: [Project.Status.ACTIVE],
        Project.Status.ACTIVE: [Project.Status.PAUSED, Project.Status.COMPLETED],
        Project.Status.PAUSED: [Project.Status.ACTIVE, Project.Status.COMPLETED],
        Project.Status.COMPLETED: [],
    }

    status = serializers.ChoiceField(choices=Project.Status.choices)

    def validate_status(self, value):
        current = self.context['project'].status
        allowed = self.VALID_TRANSITIONS.get(current, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f'Không thể chuyển từ "{current}" sang "{value}". '
                f'Các trạng thái hợp lệ: {allowed or "không có"}.'
            )
        return value


# ─── Member serializers ───────────────────────────────────────────────────────

class ProjectMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMember
        fields = ('id', 'project_id', 'user_id', 'role', 'status', 'invited_at', 'joined_at')
        read_only_fields = ('id', 'project_id', 'invited_at', 'joined_at')


class InviteMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=ProjectMember.Role.choices)

    def validate(self, data):
        project = self.context['project']
        if ProjectMember.objects.filter(project=project, user_id=data['user_id']).exists():
            raise serializers.ValidationError('User này đã là thành viên của project.')
        if project.manager_id == data['user_id']:
            raise serializers.ValidationError('Manager không thể tự mời mình vào project.')
        return data


class UpdateMemberStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[ProjectMember.Status.ACTIVE, ProjectMember.Status.DECLINED]
    )


# ─── Dataset serializers ──────────────────────────────────────────────────────

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = (
            'id', 'project_id', 'name', 'type', 'status',
            'total_files', 'total_size_mb', 'source',
            'uploaded_by', 'uploaded_at',
        )
        read_only_fields = ('id', 'uploaded_by', 'uploaded_at')


class DatasetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('name', 'type', 'source')

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Tên dataset không được để trống.')
        return value


class DatasetUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('status', 'total_files', 'total_size_mb')
