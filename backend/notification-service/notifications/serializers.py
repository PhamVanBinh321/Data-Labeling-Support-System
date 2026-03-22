from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Output đầy đủ cho 1 notification."""

    class Meta:
        model = Notification
        fields = (
            'id', 'type', 'title', 'message',
            'task_id', 'project_id',
            'is_read', 'created_at',
        )
        read_only_fields = fields


class CreateNotificationSerializer(serializers.Serializer):
    """Validate dữ liệu khi tạo 1 notification (dùng cho internal API)."""

    recipient_id = serializers.IntegerField(min_value=1)
    type = serializers.ChoiceField(choices=Notification.Type.choices)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    task_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    project_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('title không được để trống.')
        return value

    def validate_message(self, value):
        if not value.strip():
            raise serializers.ValidationError('message không được để trống.')
        return value


class BulkCreateNotificationSerializer(serializers.Serializer):
    """
    Tạo nhiều notifications cùng lúc.
    Body: { "notifications": [ { recipient_id, type, title, message, ... }, ... ] }
    """
    notifications = serializers.ListField(
        child=CreateNotificationSerializer(),
        min_length=1,
    )
