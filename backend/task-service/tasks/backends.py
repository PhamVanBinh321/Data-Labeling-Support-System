from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class TokenUser:
    """
    Lightweight user object được tạo từ JWT claims.
    Không cần DB lookup — đọc role/email trực tiếp từ payload.
    """
    is_authenticated = True
    is_active = True
    is_staff = False

    def __init__(self, payload):
        self.id = payload.get('user_id')
        self.pk = self.id
        self.role = payload.get('role', '')
        self.role_confirmed = payload.get('role_confirmed', False)
        self.email = payload.get('email', '')

    def __str__(self):
        return f'TokenUser(id={self.id}, role={self.role})'


class ServiceJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication cho task-service.
    Override get_user() để trả về TokenUser từ claims thay vì query DB.
    """

    def get_user(self, validated_token):
        try:
            return TokenUser(validated_token)
        except Exception:
            raise AuthenticationFailed('Không thể xác thực token.')
