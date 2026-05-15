import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const COLL = 'wssc_unified';

// 기존 ERP Firestore 경로 후보 (appId가 무엇이었는지 모르므로 순서대로 시도)
const LEGACY_PATHS = [
  ['artifacts', 'default-app-id', 'public', 'data', 'erp_sync', 'main_state'],
  ['artifacts', '1:845373489879:web:acf85d5395f0739d0b2692', 'public', 'data', 'erp_sync', 'main_state'],
];

const DEFAULT_ADMIN = { id: 'admin', password: 'admin1234', name: '관리자', role: 'admin', contact: '' };

const INITIAL_STATE = {
  users: [],
  items: [],
  suppliers: [],
  clients: [],
  clientOrders: [],
  mappings: [],
  packageOrders: [],
  workSchedules: [],
  contracts: [],
  priceMappings: [],
  purchaseRequests: [],
  payments: [],
  rosters: [],
  lossRates: {},
  itemLossRates: {},
  categorySortOrder: [],
  weekMappings: {},
  aiOrderOverrides: {},
  systemLogs: [],
  deliverySettings: {},
  deliveryBlocks: [],
  deliveryTrips: [],
  deliveryRecords: [],
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [fbUser, setFbUser] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [st, setSt] = useState(INITIAL_STATE);
  const [cUser, setCUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wssc_u_session') || 'null'); } catch { return null; }
  });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState({ is: false, msg: '', onOk: null });
  const [globalMonth, setGlobalMonth] = useState(new Date().toISOString().slice(0, 7));

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const showConfirm = useCallback((msg, onOk) => {
    setConfirm({ is: true, msg, onOk });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirm({ is: false, msg: '', onOk: null });
  }, []);

  useEffect(() => {
    if (!auth) { setDbReady(true); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch { setDbReady(true); }
      } else {
        setFbUser(u);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;
    let cancelled = false;
    let unsubSnap = null;

    const init = async () => {
      // 1단계: wssc_unified/users 확인
      const usersSnap = await getDoc(doc(db, COLL, 'users')).catch(() => null);
      const hasNewData = usersSnap?.exists() && Array.isArray(usersSnap.data()?.data) && usersSnap.data().data.length > 0;

      if (!hasNewData && !cancelled) {
        // 2단계: 기존 ERP 경로 순서대로 시도
        let migrated = false;
        for (const pathParts of LEGACY_PATHS) {
          if (migrated || cancelled) break;
          try {
            const oldSnap = await getDoc(doc(db, ...pathParts));
            if (oldSnap.exists()) {
              const oldData = oldSnap.data();
              if (Array.isArray(oldData.users) && oldData.users.length > 0) {
                // 기존 ERP 데이터 발견 → wssc_unified로 이전
                const keys = Object.keys(INITIAL_STATE).filter(k => oldData[k] !== undefined);
                await Promise.all(
                  keys.map(k => setDoc(doc(db, COLL, k), { data: JSON.parse(JSON.stringify(oldData[k])) }))
                );
                migrated = true;
              }
            }
          } catch { /* 권한 없거나 없는 경로는 무시 */ }
        }

        // 3단계: 어디서도 데이터 없으면 기본 관리자 생성
        if (!migrated && !cancelled) {
          await setDoc(doc(db, COLL, 'users'), { data: [DEFAULT_ADMIN] }).catch(() => {});
        }
      }

      if (cancelled) return;

      // 실시간 리스너 시작
      unsubSnap = onSnapshot(collection(db, COLL), (snap) => {
        setSt(prev => {
          const next = { ...prev };
          snap.forEach(d => {
            if (Object.keys(INITIAL_STATE).includes(d.id)) {
              next[d.id] = d.data().data ?? INITIAL_STATE[d.id];
            }
          });
          return next;
        });
        setDbReady(true);
      }, () => setDbReady(true));
    };

    init().catch(() => setDbReady(true));
    return () => { cancelled = true; if (unsubSnap) unsubSnap(); };
  }, [fbUser]);

  const updateSt = useCallback((key, value) => {
    setSt(prev => {
      const newVal = typeof value === 'function' ? value(prev[key]) : value;
      const next = { ...prev, [key]: newVal };
      if (fbUser && db) {
        setDoc(doc(db, COLL, key), { data: JSON.parse(JSON.stringify(newVal)) })
          .catch(e => console.error('저장 오류:', e));
      }
      return next;
    });
  }, [fbUser]);

  const login = useCallback((user, keepLogin) => {
    setCUser(user);
    if (keepLogin) localStorage.setItem('wssc_u_session', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setCUser(null);
    localStorage.removeItem('wssc_u_session');
  }, []);

  const addLog = useCallback((msg) => {
    updateSt('systemLogs', prev => [
      { id: Date.now().toString(), date: new Date().toLocaleString('ko-KR'), message: msg },
      ...(prev || []).slice(0, 99),
    ]);
  }, [updateSt]);

  return (
    <AppContext.Provider value={{
      st, updateSt,
      cUser, login, logout,
      dbReady, fbUser,
      toast, showToast,
      confirm, showConfirm, hideConfirm,
      globalMonth, setGlobalMonth,
      addLog,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
