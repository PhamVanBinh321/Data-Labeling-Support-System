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


# ─── Profile endpoints ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    GET /api/auth/me/
    Trả về thông tin user đang đăng nhập.
    """
    return success_response(
        data=UserSerializer(request.user).data,
        message='',
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    PATCH /api/auth/me/
    Body: { name?, avatar? }
    """
    serializer = UpdateProfileSerializer(
        instance=request.user,
        data=request.data,
        partial=True,
    )
    if not serializer.is_valid():
        return error_response(
            message='Dữ liệu không hợp lệ.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.save()
    return success_response(
        data=UserSerializer(user).data,
        message='Cập nhật thông tin thành công.',
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/auth/me/change-password/
    Body: { old_password, new_password, confirm_password }
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request},
    )
    if not serializer.is_valid():
        return error_response(
            message='Không thể đổi mật khẩu.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save(update_fields=['password', 'updated_at'])
    return success_response(message='Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_role(request):
    """
    PATCH /api/auth/me/role/
    Body: { role }  — chỉ set được 1 lần.
    """
    serializer = SetRoleSerializer(
        data=request.data,
        context={'request': request},
    )
    if not serializer.is_valid():
        return error_response(
            message='Không thể đặt role.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = request.user
    user.role = serializer.validated_data['role']
    user.role_confirmed = True
    user.save(update_fields=['role', 'role_confirmed', 'updated_at'])
    return success_response(
        data=UserSerializer(user).data,
        message=f'Role đã được đặt thành "{user.get_role_display()}".',
    )
