"""
Custom JWTAuthentication cho auth-service.

Kiểm tra thêm Redis blacklist: nếu access token JTI có trong Redis
(user đã logout), trả về 401 ngay lập tức.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .redis_blacklist import is_blacklisted


class RedisBlacklistJWTAuthentication(JWTAuthentication):
    """
    JWTAuthentication + Redis blacklist check.
    Thứ tự kiểm tra:
      1. Validate JWT signature + expiry (simplejwt mặc định)
      2. Kiểm tra JTI có trong Redis blacklist không → 401 nếu có
    """

    def get_validated_token(self, raw_token):
        validated = super().get_validated_token(raw_token)
        jti = validated.get('jti')
        if jti and is_blacklisted(jti):
            raise InvalidToken('Token đã bị thu hồi (logout).')
        return validated
