import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from './config';

const VAPID_KEY = 'BPmR92sGkyAtEz26WGDLLoGH41oCT8wcRZnk9EnqVtKKdYnDCKY9bXNfCLpHY2lKuDtuUnus3Pu7AgxVaOgrsII';

const messaging = getMessaging(firebaseApp);

/**
 * Xin permission và lấy FCM registration token.
 * Trả về token string nếu thành công, null nếu user từ chối hoặc lỗi.
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });
    return token || null;
  } catch (e) {
    console.warn('FCM getToken thất bại:', e);
    return null;
  }
}

/**
 * Lắng nghe notification khi app đang mở (foreground).
 * callback nhận { title, body, recipientId }.
 */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; recipientId: number | null }) => void
) {
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? '';
    const body = payload.notification?.body ?? '';
    const recipientId = payload.data?.recipient_id ? Number(payload.data.recipient_id) : null;
    callback({ title, body, recipientId });
  });
}
