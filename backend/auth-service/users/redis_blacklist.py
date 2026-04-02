"""
Redis-based JWT access token blacklist.

Khi user logout, access token JTI được lưu vào Redis với TTL = thời gian
còn lại của token. Custom authentication class sẽ kiểm tra Redis trước khi
cho phép request.

Key format: blacklist:jti:<jti>
Value: "1" (chỉ cần biết key tồn tại)
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_redis_client = None


def _get_client():
    global _redis_client
    if _redis_client is None:
        import redis
        from django.conf import settings
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis_client


def blacklist_access_token(payload: dict) -> None:
    """
    Thêm access token vào blacklist Redis.
    payload: decoded JWT payload (phải có 'jti' và 'exp').
    """
    try:
        client = _get_client()
        jti = payload.get('jti')
        exp = payload.get('exp')
        if not jti or not exp:
            return

        now = datetime.now(tz=timezone.utc).timestamp()
        ttl = int(exp - now)
        if ttl <= 0:
            return  # Token đã hết hạn rồi, không cần blacklist

        key = f'blacklist:jti:{jti}'
        client.setex(key, ttl, '1')
    except Exception as e:
        logger.warning('Redis blacklist write failed: %s', e)


def is_blacklisted(jti: str) -> bool:
    """
    Kiểm tra JTI có trong blacklist Redis không.
    Trả về False nếu Redis không khả dụng (fail-open để không chặn user).
    """
    try:
        client = _get_client()
        return client.exists(f'blacklist:jti:{jti}') == 1
    except Exception as e:
        logger.warning('Redis blacklist read failed: %s', e)
        return False
