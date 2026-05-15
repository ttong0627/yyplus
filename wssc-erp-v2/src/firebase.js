import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

export const windowErrors = [];
window.firebasePermissionDenied = false;
window.addEventListener('error', e => windowErrors.push(`[JS] ${e.message}`));
window.addEventListener('unhandledrejection', e => windowErrors.push(`[Net] ${e.reason?.message || String(e.reason)}`));

const localFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null, auth = null, db = null, firebaseInitError = null;
try {
  const fc = typeof __firebase_config === 'undefined' ? localFirebaseConfig : JSON.parse(__firebase_config);
  if (fc?.apiKey && fc.apiKey !== "여기에_apiKey를_입력하세요") { app = !getApps().length ? initializeApp(fc) : getApp(); auth = getAuth(app); db = getFirestore(app); }
} catch(e) { firebaseInitError = e.message; windowErrors.push(`[FB Error] ${e.message}`); }

export { app, auth, db, firebaseInitError };
export { signInAnonymously, signInWithCustomToken, onAuthStateChanged, doc, setDoc, onSnapshot };
