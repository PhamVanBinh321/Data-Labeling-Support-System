from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('name', 'email', 'password')

    def create(self, validated_data):
        name = validated_data.pop('name')
        first_name = name.split(' ')[0]
        last_name = ' '.join(name.split(' ')[1:]) if ' ' in name else ''
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Email hoặc mật khẩu không đúng.')
        if not user.is_active:
            raise serializers.ValidationError('Tài khoản đã bị vô hiệu hóa.')
        data['user'] = user
        return data


class SetRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.Role.choices)

    def validate(self, data):
        user = self.context['request'].user
        if user.role_confirmed:
            raise serializers.ValidationError('Role đã được xác nhận, không thể thay đổi.')
        return data


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'name', 'email', 'role', 'role_confirmed',
            'avatar', 'quality_score', 'tasks_completed',
            'created_at',
        )
        read_only_fields = fields

    def get_name(self, obj):
        return obj.get_full_name() or obj.email
