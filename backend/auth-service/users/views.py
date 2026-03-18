from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, SetRoleSerializer,
)
from .utils import success_response, error_response


def _make_token_data(user):
    """Tạo JWT tokens + user info để trả về sau login/register."""
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
    }


# ─── Health ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return success_response(
        data={'service': 'auth-service'},
        message='Service đang hoạt động.',
    )


# ─── Auth endpoints ───────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    POST /api/auth/register/
    Body: { name, email, password }
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            message='Dữ liệu đăng ký không hợp lệ.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.save()
    return success_response(
        data=_make_token_data(user),
        message='Đăng ký thành công. Vui lòng chọn role của bạn.',
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    POST /api/auth/login/
    Body: { email, password }
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            message='Đăng nhập thất bại.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.validated_data['user']
    return success_response(
        data=_make_token_data(user),
        message='Đăng nhập thành công.',
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    POST /api/auth/logout/
    Body: { refresh_token }
    Header: Authorization: Bearer <access_token>
    """
    refresh_token = request.data.get('refresh_token')
    if not refresh_token:
        return error_response(
            message='Thiếu refresh_token.',
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return success_response(message='Đăng xuất thành công.')
    except TokenError:
        return error_response(
            message='Token không hợp lệ hoặc đã hết hạn.',
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    POST /api/auth/refresh/
    Body: { refresh_token }
    """
    token_str = request.data.get('refresh_token')
    if not token_str:
        return error_response(
            message='Thiếu refresh_token.',
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        refresh = RefreshToken(token_str)
        return success_response(
            data={'access_token': str(refresh.access_token)},
            message='Token đã được làm mới.',
        )
    except TokenError:
        return error_response(
            message='Refresh token không hợp lệ hoặc đã hết hạn.',
            status=status.HTTP_401_UNAUTHORIZED,
        )
