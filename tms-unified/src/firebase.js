import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// wssc-nutrition config (재사용)
const firebaseConfig = {
  apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
  authDomain: "wssc-nutrition.firebaseapp.com",
  projectId: "wssc-nutrition",
  storageBucket: "wssc-nutrition.firebasestorage.app",
  messagingSenderId: "845373489879",
  appId: "1:845373489879:web:acf85d5395f0739d0b2692"
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
