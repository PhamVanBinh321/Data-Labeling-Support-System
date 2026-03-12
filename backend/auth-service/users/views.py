from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from .serializers import RegisterSerializer, LoginSerializer, SetRoleSerializer, UserSerializer


def _token_response(user):
    """Tạo JWT tokens và trả về cùng user info."""
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'auth-service'})


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'success': False, 'data': None, 'message': 'Dữ liệu không hợp lệ.', 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.save()
    return Response(
        {'success': True, 'data': _token_response(user), 'message': 'Đăng ký thành công.', 'errors': None},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'success': False, 'data': None, 'message': 'Đăng nhập thất bại.', 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.validated_data['user']
    return Response(
        {'success': True, 'data': _token_response(user), 'message': 'Đăng nhập thành công.', 'errors': None},
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh_token')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'success': True, 'data': None, 'message': 'Đã đăng xuất.', 'errors': None})
    except TokenError:
        return Response(
            {'success': False, 'data': None, 'message': 'Token không hợp lệ.', 'errors': None},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    try:
        refresh = RefreshToken(request.data.get('refresh_token'))
        return Response({
            'success': True,
            'data': {'access_token': str(refresh.access_token)},
            'message': 'Token đã được làm mới.',
            'errors': None,
        })
    except TokenError:
        return Response(
            {'success': False, 'data': None, 'message': 'Refresh token không hợp lệ hoặc đã hết hạn.', 'errors': None},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({
        'success': True,
        'data': UserSerializer(request.user).data,
        'message': '',
        'errors': None,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_role(request):
    serializer = SetRoleSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(
            {'success': False, 'data': None, 'message': 'Không thể đặt role.', 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = request.user
    user.role = serializer.validated_data['role']
    user.role_confirmed = True
    user.save(update_fields=['role', 'role_confirmed'])
    return Response({
        'success': True,
        'data': UserSerializer(user).data,
        'message': f'Role đã được đặt thành {user.role}.',
        'errors': None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """Internal + Manager dùng để browse user khi invite member."""
    users = User.objects.filter(is_active=True).exclude(id=request.user.id)
    role_filter = request.query_params.get('role')
    if role_filter:
        users = users.filter(role=role_filter)
    return Response({
        'success': True,
        'data': UserSerializer(users, many=True).data,
        'message': '',
        'errors': None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request, user_id):
    """Internal endpoint — các service khác gọi để lấy user info."""
    try:
        user = User.objects.get(id=user_id)
        return Response({
            'success': True,
            'data': UserSerializer(user).data,
            'message': '',
            'errors': None,
        })
    except User.DoesNotExist:
        return Response(
            {'success': False, 'data': None, 'message': 'User không tồn tại.', 'errors': None},
            status=status.HTTP_404_NOT_FOUND,
        )
