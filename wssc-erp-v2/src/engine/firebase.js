import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

export const localFirebaseConfig = {
  apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
  authDomain: "wssc-nutrition.firebaseapp.com",
  projectId: "wssc-nutrition",
  storageBucket: "wssc-nutrition.firebasestorage.app",
  messagingSenderId: "845373489879",
  appId: "1:845373489879:web:acf85d5395f0739d0b2692"
};

export const windowErrors = [];
window.firebasePermissionDenied = false;
window.addEventListener('error', e => windowErrors.push(`[JS] ${e.message}`));
window.addEventListener('unhandledrejection', e => windowErrors.push(`[Net] ${e.reason?.message || String(e.reason)}`));

let app = null, auth = null, db = null, firebaseInitError = null;
try {
  const fc = typeof window.__firebase_config === 'undefined' ? localFirebaseConfig : JSON.parse(window.__firebase_config);
  if (fc?.apiKey && fc.apiKey !== "여기에_apiKey를_입력하세요") { 
      app = !getApps().length ? initializeApp(fc) : getApp(); 
      auth = getAuth(app); 
      db = getFirestore(app); 
  }
} catch(e) { 
    firebaseInitError = e.message; 
    windowErrors.push(`[FB Error] ${e.message}`); 
}

const rawAppId = typeof window.__app_id !== 'undefined' ? String(window.__app_id) : 'default-app-id';
export const appId = rawAppId.includes('/') ? rawAppId.split('/')[0] : rawAppId;

export { app, auth, db, firebaseInitError };

export const INITIAL_APP_STATE = {
  users: [{ id: 'admin', password: 'admin', name: '대표이사', contact: '010-0000-0000', note: '총괄', role: 'admin' }],
  items: [{ id: 'I001', category: '농산물', name: '친환경 감자 10kg 박스', unit: '박스', boxQuantity: 10, unitPrice: 2500, supplierId: 'S001', note: '' }],
  suppliers: [{ id: 'S001', name: '햇살농산물', manager: '김햇살', contact: '010-1111-2222', account: '농협', orderType: 'auto', favoriteAt: null }],
  clients: [{ id: 'C001', name: '수원시 팔달구 보건소 본관', shortName: '팔달보건소', manager: '박보건', contact: '031-228-1234', inspectTime: '08:30', inspectLocation: '1층', note: '' }],
  inventory: [], clientOrders: [], mappings: [], payments: [], receipts: [],
  lossRates: { '미곡': 2, '잡곡': 1, '멸치': 3, '야채': 8, '과일': 10, '달걀': 5 },
  categorySortOrder: [], aiOrderOverrides: {}, itemLossRates: {}, purchaseRequests: [], weekMappings: {}, 
  systemLogs: [{ id: 'L01', date: new Date().toLocaleString('ko-KR'), message: '시스템 렌더링 무결성 최적화 및 엑셀 다운로드 계산식 정상화 완료' }],
  localSettings: { savedId: '', rememberId: false, keepLoggedIn: false, lastUserId: null, globalReflectSchedule: false }
};
