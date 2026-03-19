from django.contrib import admin
from .models import Project, LabelDefinition, ProjectMember, Dataset


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'type', 'status', 'manager_id', 'total_images', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(LabelDefinition)
class LabelDefinitionAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'name', 'color')
    list_filter = ('project',)
    search_fields = ('name',)


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'user_id', 'role', 'status', 'invited_at', 'joined_at')
    list_filter = ('role', 'status')


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'project', 'type', 'status', 'source', 'total_files', 'uploaded_at')
    list_filter = ('type', 'status', 'source')
    search_fields = ('name',)
