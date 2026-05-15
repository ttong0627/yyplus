import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const COLL = 'wssc_unified';

// 기존 ERP Firestore 경로 후보
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

// tms-unified 플랫 컬렉션 → wssc_unified 변환 & 저장
async function runTmsMigration(db) {
  const [clientsSnap, itemsSnap, partnersSnap, usersSnap, ordersSnap, delivSnap, invSnap, mapSnap] = await Promise.all([
    getDocs(collection(db, 'clients')),
    getDocs(collection(db, 'items')),
    getDocs(collection(db, 'partners')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'clientOrders')),
    getDocs(collection(db, 'deliveries')),
    getDocs(collection(db, 'invoices')),
    getDocs(collection(db, 'mappings')),
  ]);
  const toArr = snap => snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
  const clients        = toArr(clientsSnap);
  const items          = toArr(itemsSnap);
  const suppliers      = toArr(partnersSnap);
  const tmsUsers       = toArr(usersSnap);
  const clientOrders   = toArr(ordersSnap);
  const deliveryRecords = toArr(delivSnap);
  const payments       = toArr(invSnap);
  const mappings       = toArr(mapSnap);

  const writes = [];
  if (clients.length)        writes.push(setDoc(doc(db, COLL, 'clients'),        { data: clients }));
  if (items.length)          writes.push(setDoc(doc(db, COLL, 'items'),          { data: items }));
  if (suppliers.length)      writes.push(setDoc(doc(db, COLL, 'suppliers'),      { data: suppliers }));
  if (clientOrders.length)   writes.push(setDoc(doc(db, COLL, 'clientOrders'),   { data: clientOrders }));
  if (deliveryRecords.length) writes.push(setDoc(doc(db, COLL, 'deliveryRecords'), { data: deliveryRecords }));
  if (payments.length)       writes.push(setDoc(doc(db, COLL, 'payments'),       { data: payments }));
  if (mappings.length)       writes.push(setDoc(doc(db, COLL, 'mappings'),       { data: mappings }));

  const mergedUsers = tmsUsers.length > 0
    ? [...tmsUsers.map(u => ({ ...u, password: u.password || 'admin1234' })), DEFAULT_ADMIN]
    : [DEFAULT_ADMIN];
  writes.push(setDoc(doc(db, COLL, 'users'), { data: mergedUsers }));

  await Promise.all(writes);
  return { clients: clients.length, items: items.length, suppliers: suppliers.length, clientOrders: clientOrders.length, users: mergedUsers.length };
}

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
      // 1단계: wssc_unified/users + clients 동시 확인 (둘 다 있어야 마이그레이션 완료)
      const [usersSnap, clientsCheckSnap] = await Promise.all([
        getDoc(doc(db, COLL, 'users')).catch(() => null),
        getDoc(doc(db, COLL, 'clients')).catch(() => null),
      ]);
      const hasUsers   = usersSnap?.exists()        && Array.isArray(usersSnap.data()?.data)        && usersSnap.data().data.length > 0;
      const hasClients = clientsCheckSnap?.exists() && Array.isArray(clientsCheckSnap.data()?.data) && clientsCheckSnap.data().data.length > 0;
      const hasNewData = hasUsers && hasClients;

      if (!hasNewData && !cancelled) {
        let migrated = false;

        // 2단계: 기존 wssc-erp-v2 ERP 경로 시도
        for (const pathParts of LEGACY_PATHS) {
          if (migrated || cancelled) break;
          try {
            const oldSnap = await getDoc(doc(db, ...pathParts));
            if (oldSnap.exists()) {
              const oldData = oldSnap.data();
              if (Array.isArray(oldData.users) && oldData.users.length > 0) {
                const keys = Object.keys(INITIAL_STATE).filter(k => oldData[k] !== undefined);
                await Promise.all(keys.map(k => setDoc(doc(db, COLL, k), { data: JSON.parse(JSON.stringify(oldData[k])) })));
                migrated = true;
              }
            }
          } catch { /* 권한 없거나 없는 경로 무시 */ }
        }

        // 3단계: tms-unified 플랫 컬렉션 마이그레이션
        if (!migrated && !cancelled) {
          try {
            const result = await runTmsMigration(db);
            if (result.clients > 0 || result.items > 0) migrated = true;
          } catch { /* 플랫 컬렉션 없으면 무시 */ }
        }

        // 4단계: 아무 데이터 없음 → 기본 관리자만 생성
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

  // SystemPage에서 호출 가능한 강제 마이그레이션 함수
  const migrateTmsData = useCallback(async () => {
    if (!db || !fbUser) throw new Error('DB 미연결');
    return await runTmsMigration(db);
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
      migrateTmsData,
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
