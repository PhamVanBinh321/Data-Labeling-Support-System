from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'get_full_name', 'role', 'role_confirmed', 'quality_score', 'is_active', 'created_at')
    list_filter = ('role', 'role_confirmed', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    readonly_fields = ('created_at', 'updated_at', 'quality_score', 'tasks_completed')
    ordering = ('-created_at',)
    fieldsets = (
        ('Account', {'fields': ('email', 'username', 'password', 'is_active', 'is_staff')}),
        ('Profile', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Role', {'fields': ('role', 'role_confirmed')}),
        ('Stats', {'fields': ('quality_score', 'tasks_completed')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
