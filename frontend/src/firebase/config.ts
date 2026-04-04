import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyDHDdb2HY3Rb4-W9KoIHnxdk7NW88If_9E',
  authDomain: 'data-labeling-support.firebaseapp.com',
  projectId: 'data-labeling-support',
  storageBucket: 'data-labeling-support.firebasestorage.app',
  messagingSenderId: '219079302695',
  appId: '1:219079302695:web:6d58874008bdf57d763802',
};

export const firebaseApp = initializeApp(firebaseConfig);
