from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


# ─── Auth serializers ─────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Email này đã được đăng ký.')
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        name = validated_data['name'].strip()
        parts = name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''
        return User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data['email'].lower()
        user = authenticate(username=email, password=data['password'])
        if user is None:
            raise serializers.ValidationError('Email hoặc mật khẩu không đúng.')
        if not user.is_active:
            raise serializers.ValidationError('Tài khoản đã bị vô hiệu hóa.')
        data['user'] = user
        return data


# ─── Profile serializers ──────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'name', 'email', 'role', 'role_confirmed',
            'avatar', 'quality_score', 'tasks_completed', 'created_at',
        )
        read_only_fields = fields

    def get_name(self, obj):
        return obj.get_full_name() or obj.email.split('@')[0]


class UpdateProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=255, required=False)

    class Meta:
        model = User
        fields = ('name', 'avatar')

    def validate_name(self, value):
        return value.strip()

    def update(self, instance, validated_data):
        name = validated_data.pop('name', None)
        if name:
            parts = name.split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''
        if 'avatar' in validated_data:
            instance.avatar = validated_data['avatar']
        instance.save(update_fields=['first_name', 'last_name', 'avatar', 'updated_at'])
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mật khẩu cũ không đúng.')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Mật khẩu xác nhận không khớp.'}
            )
        validate_password(data['new_password'])
        return data


class SetRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.Role.choices)

    def validate(self, data):
        user = self.context['request'].user
        if user.role_confirmed:
            raise serializers.ValidationError('Role đã được xác nhận, không thể thay đổi.')
        return data
