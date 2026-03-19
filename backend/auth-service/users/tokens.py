from rest_framework_simplejwt.tokens import RefreshToken as BaseRefreshToken


class CustomRefreshToken(BaseRefreshToken):
    """
    Mở rộng JWT payload để các service khác đọc được role mà không cần
    gọi auth-service trên mỗi request.
    """

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['role'] = user.role or ''
        token['role_confirmed'] = user.role_confirmed
        token['email'] = user.email
        return token
