"""
Firebase Cloud Messaging (FCM) helper cho notification-service.

Khởi tạo Firebase Admin SDK 1 lần (singleton), cung cấp hàm
send_push() để gửi push notification đến 1 FCM token.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

_initialized = False


def _init():
    global _initialized
    if _initialized:
        return
    try:
        import firebase_admin
        from firebase_admin import credentials
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        _initialized = True
        logger.info('Firebase Admin SDK đã khởi tạo.')
    except Exception as e:
        logger.error('Không thể khởi tạo Firebase Admin SDK: %s', e)


def send_push(fcm_token: str, title: str, body: str, recipient_id: int = None) -> bool:
    """
    Gửi FCM push notification đến 1 token.
    recipient_id được đính kèm trong data payload để frontend lọc đúng tab.
    Trả về True nếu thành công, False nếu lỗi.
    """
    _init()
    try:
        from firebase_admin import messaging
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={'recipient_id': str(recipient_id)} if recipient_id else {},
            token=fcm_token,
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.warning('FCM send_push thất bại (token: %s...): %s', fcm_token[:20], e)
        return False
