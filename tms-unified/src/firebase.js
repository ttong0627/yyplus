import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wssc-nutrition.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wssc-nutrition",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wssc-nutrition.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "845373489879",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:845373489879:web:acf85d5395f0739d0b2692"
};

let app, auth, db;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = initializeFirestore(app, { 
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) 
});

export { app, auth, db };
