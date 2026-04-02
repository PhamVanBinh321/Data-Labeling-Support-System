"""
Redis cache helpers cho notification-service.

Chỉ cache `unread_count` per-user để giảm DB query trên mỗi request poll.

Key format: notify:unread:<user_id>
TTL: 5 phút — đủ để giảm tải, không quá cũ.
"""
import logging

logger = logging.getLogger(__name__)

UNREAD_COUNT_TTL = 300  # 5 phút


def _cache_key(user_id: int) -> str:
    return f'notify:unread:{user_id}'


def get_unread_count(user_id: int):
    """
    Lấy unread_count từ cache.
    Trả về int nếu có cache hit, None nếu cache miss hoặc Redis lỗi.
    """
    try:
        from django.core.cache import cache
        value = cache.get(_cache_key(user_id))
        return int(value) if value is not None else None
    except Exception as e:
        logger.warning('Redis get_unread_count failed for user %s: %s', user_id, e)
        return None


def set_unread_count(user_id: int, count: int) -> None:
    """Lưu unread_count vào cache với TTL."""
    try:
        from django.core.cache import cache
        cache.set(_cache_key(user_id), count, timeout=UNREAD_COUNT_TTL)
    except Exception as e:
        logger.warning('Redis set_unread_count failed for user %s: %s', user_id, e)


def invalidate_unread_count(user_id: int) -> None:
    """Xóa cache khi có thay đổi (tạo mới / đánh dấu đã đọc / xóa)."""
    try:
        from django.core.cache import cache
        cache.delete(_cache_key(user_id))
    except Exception as e:
        logger.warning('Redis invalidate_unread_count failed for user %s: %s', user_id, e)
