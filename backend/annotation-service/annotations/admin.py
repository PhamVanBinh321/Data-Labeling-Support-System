from django.contrib import admin
from .models import ImageFile, Annotation


@admin.register(ImageFile)
class ImageFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'task_id', 'project_id', 'index', 'original_filename', 'is_confirmed', 'uploaded_at')
    list_filter = ('is_confirmed',)
    search_fields = ('task_id', 'project_id', 'original_filename')
    readonly_fields = ('uploaded_at',)
    ordering = ('task_id', 'index')


@admin.register(Annotation)
class AnnotationAdmin(admin.ModelAdmin):
    list_display = ('id', 'image', 'label_name', 'annotation_type', 'created_by', 'created_at')
    list_filter = ('annotation_type',)
    search_fields = ('label_name', 'label_id')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('image', 'created_at')
