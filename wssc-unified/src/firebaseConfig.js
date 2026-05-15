import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDL4zeVF9SnmIhMeT4fYLRUK6qX7mlIkyA",
  authDomain: "wellshare-tms.firebaseapp.com",
  projectId: "wellshare-tms",
  storageBucket: "wellshare-tms.firebasestorage.app",
  messagingSenderId: "942130472468",
  appId: "1:942130472468:web:44336a27ea99e3242c6901",
  measurementId: "G-DDRBEVZDRB"
};

let app, db, auth, storage;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (e) {
  console.error('Firebase 초기화 오류:', e);
}

export { app, db, auth, storage };
