importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDHDdb2HY3Rb4-W9KoIHnxdk7NW88If_9E',
  authDomain: 'data-labeling-support.firebaseapp.com',
  projectId: 'data-labeling-support',
  storageBucket: 'data-labeling-support.firebasestorage.app',
  messagingSenderId: '219079302695',
  appId: '1:219079302695:web:6d58874008bdf57d763802',
});

const messaging = firebase.messaging();

// Xử lý background notification (khi tab không active)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Thông báo mới';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, { body, icon: '/vite.svg' });
});
