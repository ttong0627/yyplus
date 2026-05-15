import { getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

// App.jsx에서 이미 초기화된 Firebase 앱 인스턴스를 재사용
let app, db, auth, storage;

try {
  app = getApps().length ? getApp() : null;
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  }
} catch (error) {
  console.error("Firebase 재사용 에러:", error);
}

export { app, db, auth, storage, collection, doc, setDoc, getDoc, ref, uploadString, getDownloadURL };
