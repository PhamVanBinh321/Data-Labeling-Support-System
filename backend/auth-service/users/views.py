from django.db import models as db_models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from django.core.cache import cache

from .tokens import CustomRefreshToken
from .redis_blacklist import blacklist_access_token

USER_CACHE_TTL = 300  # 5 phút


def _user_cache_key(user_id):
    return f'user_profile:{user_id}'


def _cache_user(user):
    cache.set(_user_cache_key(user.id), UserSerializer(user).data, timeout=USER_CACHE_TTL)


def _invalidate_user(user_id):
    cache.delete(_user_cache_key(user_id))

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, SetRoleSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
)
from .utils import success_response, error_response
from .rabbitmq import publish_event
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.conf import settings


def _make_token_data(user):
    """Tạo JWT tokens + user info để trả về sau login/register."""
    refresh = CustomRefreshToken.for_user(user)
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
@permission_classes([AllowAny])
def forgot_password(request):
    """
    POST /api/auth/forgot-password/
    Body: { email }
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            message='Dữ liệu không hợp lệ.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    email = serializer.validated_data['email'].lower()
    try:
        user = User.objects.get(email=email, is_active=True)
        # Tạo token sống trong 15 phút
        signer = TimestampSigner()
        token = signer.sign(str(user.id))
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        event_data = {
            'email': user.email,
            'name': user.get_full_name() or user.email.split('@')[0],
            'reset_link': reset_link
        }
        
        publish_event(
            exchange='auth_events',
            routing_key='user.forgot_password',
            event_type='forgot_password_requested',
            data=event_data
        )
    except User.DoesNotExist:
        # Ngăn chặn dò quét email bằng cách luôn báo thành công
        pass

    return success_response(message='Nếu email tồn tại trong hệ thống, bạn sẽ nhận được một liên kết đặt lại mật khẩu.')


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    POST /api/auth/reset-password/
    Body: { token, new_password, confirm_password }
    """
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            message='Dữ liệu không hợp lệ.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']
    
    signer = TimestampSigner()
    try:
        # Token sống tối đa 15 phút (900s)
        user_id = signer.unsign(token, max_age=900)
        user = User.objects.get(id=user_id, is_active=True)
    except SignatureExpired:
        return error_response(message='Liên kết đã hết hạn. Vui lòng yêu cầu lại.', status=status.HTTP_400_BAD_REQUEST)
    except (BadSignature, User.DoesNotExist):
        return error_response(message='Liên kết không hợp lệ.', status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save(update_fields=['password', 'updated_at'])
    _invalidate_user(user.id)
    
    return success_response(message='Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.')


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
        # Blacklist access token in Redis so it's immediately invalidated
        if hasattr(request, 'auth') and request.auth:
            blacklist_access_token(request.auth.payload)
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
    user_id = request.user.id
    data = cache.get(_user_cache_key(user_id))
    if data is None:
        data = UserSerializer(request.user).data
        cache.set(_user_cache_key(user_id), data, timeout=USER_CACHE_TTL)
    return success_response(data=data, message='')


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
    _invalidate_user(user.id)
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
    _invalidate_user(request.user.id)
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
    _invalidate_user(user.id)
    
    # Generate new tokens with the updated role
    token_data = _make_token_data(user)
    
    return success_response(
        data=token_data,
        message=f'Role đã được đặt thành "{user.get_role_display()}".',
    )


# ─── Internal APIs ────────────────────────────────────────────────────────────
# Các service khác (project, task, ...) gọi những endpoint này để lấy thông tin
# user mà không cần truy cập trực tiếp vào auth DB.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """
    GET /api/auth/users/?role=annotator&search=nguyen
    Manager dùng khi invite member vào project.
    """
    queryset = User.objects.filter(is_active=True, role_confirmed=True)

    role = request.query_params.get('role')
    if role:
        queryset = queryset.filter(role=role)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            db_models.Q(first_name__icontains=search)
            | db_models.Q(last_name__icontains=search)
            | db_models.Q(email__icontains=search)
        )

    # Loại bỏ chính người đang gọi
    queryset = queryset.exclude(id=request.user.id)

    return success_response(
        data=UserSerializer(queryset, many=True).data,
        message='',
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request, user_id):
    """
    GET /api/auth/users/<user_id>/
    Internal endpoint — project/task service gọi để lấy thông tin 1 user.
    """
    data = cache.get(_user_cache_key(user_id))
    if data is None:
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return error_response(
                message=f'Không tìm thấy user với id={user_id}.',
                status=status.HTTP_404_NOT_FOUND,
            )
        data = UserSerializer(user).data
        cache.set(_user_cache_key(user_id), data, timeout=USER_CACHE_TTL)
    return success_response(data=data, message='')


# ─── Admin — Quản lý người dùng ───────────────────────────────────────────────

from .permissions import IsAdmin
from .serializers import AdminUserSerializer, AdminUpdateUserSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_list_users(request):
    """
    GET /api/auth/admin/users/
    Params:
      - search   : tìm theo tên / email
      - role     : manager | annotator | reviewer
      - status   : active | inactive | suspended
      - page     : số trang (mặc định 1)
      - page_size: số mục mỗi trang (mặc định 20, tối đa 100)
    Chỉ admin (is_staff=True) mới gọi được.
    """
    queryset = User.objects.all().order_by('-created_at')

    # Tìm kiếm
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            db_models.Q(first_name__icontains=search)
            | db_models.Q(last_name__icontains=search)
            | db_models.Q(email__icontains=search)
        )

    # Filter theo role
    role = request.query_params.get('role')
    if role:
        queryset = queryset.filter(role=role)

    # Filter theo status (map sang is_active + last_login)
    from django.utils import timezone
    from datetime import timedelta
    status_filter = request.query_params.get('status')
    if status_filter == 'suspended':
        queryset = queryset.filter(is_active=False)
    elif status_filter == 'active':
        threshold = timezone.now() - timedelta(days=30)
        queryset = queryset.filter(is_active=True, last_login__gte=threshold)
    elif status_filter == 'inactive':
        threshold = timezone.now() - timedelta(days=30)
        queryset = queryset.filter(
            is_active=True
        ).filter(
            db_models.Q(last_login__isnull=True) | db_models.Q(last_login__lt=threshold)
        )

    # Phân trang
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except ValueError:
        page, page_size = 1, 20

    total = queryset.count()
    start = (page - 1) * page_size
    users = queryset[start:start + page_size]

    return success_response(
        data={
            'results': AdminUserSerializer(users, many=True).data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),  # ceiling division
        },
        message='',
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_get_user(request, user_id):
    """
    GET /api/auth/admin/users/<user_id>/
    Xem chi tiết bất kỳ user nào (kể cả suspended).
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return error_response(
            message=f'Không tìm thấy người dùng với id={user_id}.',
            status=status.HTTP_404_NOT_FOUND,
        )
    return success_response(data=AdminUserSerializer(user).data, message='')


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_update_user(request, user_id):
    """
    PATCH /api/auth/admin/users/<user_id>/
    Body: { role?, status? }
      - role   : 'manager' | 'annotator' | 'reviewer'
      - status : 'active' | 'suspended'
    Không cho phép sửa tài khoản admin khác hoặc chính mình.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return error_response(
            message=f'Không tìm thấy người dùng với id={user_id}.',
            status=status.HTTP_404_NOT_FOUND,
        )

    if user.id == request.user.id:
        return error_response(
            message='Không thể tự chỉnh sửa tài khoản của mình qua endpoint này.',
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = AdminUpdateUserSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            message='Dữ liệu không hợp lệ.',
            errors=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    update_fields = ['updated_at']

    if 'role' in data:
        user.role = data['role']
        user.role_confirmed = True
        update_fields += ['role', 'role_confirmed']

    if 'status' in data:
        user.is_active = (data['status'] == 'active')
        update_fields.append('is_active')

    user.save(update_fields=update_fields)
    _invalidate_user(user.id)

    return success_response(
        data=AdminUserSerializer(user).data,
        message='Cập nhật người dùng thành công.',
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_user(request, user_id):
    """
    DELETE /api/auth/admin/users/<user_id>/
    Soft delete — đặt is_active=False thay vì xoá khỏi DB.
    Không cho phép xoá chính mình hoặc admin khác.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return error_response(
            message=f'Không tìm thấy người dùng với id={user_id}.',
            status=status.HTTP_404_NOT_FOUND,
        )

    if user.id == request.user.id:
        return error_response(
            message='Không thể xoá tài khoản của chính mình.',
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.is_staff:
        return error_response(
            message='Không thể xoá tài khoản admin.',
            status=status.HTTP_403_FORBIDDEN,
        )

    # Soft delete
    user.is_active = False
    user.save(update_fields=['is_active', 'updated_at'])
    _invalidate_user(user.id)

    return success_response(
        message=f'Đã xoá người dùng "{user.get_full_name() or user.email}".',
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_user_stats(request):
    """
    GET /api/auth/admin/users/stats/
    Trả về thống kê nhanh: tổng user, theo role, theo status.
    """
    from django.utils import timezone
    from datetime import timedelta

    total = User.objects.count()
    active_threshold = timezone.now() - timedelta(days=30)

    stats = {
        'total': total,
        'by_role': {
            'manager':   User.objects.filter(role='manager',   is_active=True).count(),
            'annotator': User.objects.filter(role='annotator', is_active=True).count(),
            'reviewer':  User.objects.filter(role='reviewer',  is_active=True).count(),
        },
        'by_status': {
            'active':    User.objects.filter(is_active=True, last_login__gte=active_threshold).count(),
            'inactive':  User.objects.filter(
                is_active=True
            ).filter(
                db_models.Q(last_login__isnull=True) | db_models.Q(last_login__lt=active_threshold)
            ).count(),
            'suspended': User.objects.filter(is_active=False).count(),
        },
    }
    return success_response(data=stats, message='')

