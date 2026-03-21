from django.contrib import admin
from .models import Task, TaskStatusHistory


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'priority', 'project_id', 'annotator_id', 'reviewer_id', 'deadline', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'submitted_at')
    ordering = ('-created_at',)


@admin.register(TaskStatusHistory)
class TaskStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'from_status', 'to_status', 'changed_by', 'changed_at')
    readonly_fields = ('changed_at',)
    ordering = ('-changed_at',)
