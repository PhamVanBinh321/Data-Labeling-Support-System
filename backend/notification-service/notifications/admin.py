from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient_id', 'type', 'title', 'is_read', 'task_id', 'project_id', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('title', 'message', 'recipient_id')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
