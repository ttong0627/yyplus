import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// ✅ [통합 메인 DB] wellshare-tms (ttong0627@gmail.com)
// 절대 변경하지 말 것 (프로젝트 헌법 제9조 적용)
const firebaseConfig = {
  apiKey: "AIzaSyDL4zeVF9SnmIhMeT4fYLRUK6qX7mlIkyA",
  authDomain: "wellshare-tms.firebaseapp.com",
  projectId: "wellshare-tms",
  storageBucket: "wellshare-tms.firebasestorage.app",
  messagingSenderId: "942130472468",
  appId: "1:942130472468:web:44336a27ea99e3242c6901",
  measurementId: "G-DDRBEVZDRB"
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
