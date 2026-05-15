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
  milkOrders: [],
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

// wssc-erp-v2(단일 doc) + wssc-work-order(wssc_state 컬렉션) → wssc_unified 통합 마이그레이션
const WO_APP_IDS = ['wssc-production', 'default-app-id', '1:845373489879:web:acf85d5395f0739d0b2692'];

const isNonEmpty = v => Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' && Object.keys(v).length > 0);

async function runLegacyMigration(db) {
  const log = [];

  // 1) wssc-erp-v2: 단일 doc (main_state)
  let erpData = null;
  for (const pathParts of LEGACY_PATHS) {
    try {
      const snap = await getDoc(doc(db, ...pathParts));
      if (snap.exists()) {
        const d = snap.data();
        if (d && (Array.isArray(d.users) || Array.isArray(d.clients))) {
          erpData = d;
          log.push(`ERP소스: ${pathParts.join('/')}`);
          log.push(...Object.keys(d).map(k => `  ${k}: ${Array.isArray(d[k]) ? d[k].length + '건' : typeof d[k]}`));
          break;
        }
      }
    } catch { /* 권한 없음 */ }
  }

  // 2) wssc-work-order: wssc_state 컬렉션
  let woData = null;
  for (const appId of WO_APP_IDS) {
    try {
      const cs = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'wssc_state'));
      if (!cs.empty) {
        woData = {};
        cs.forEach(d => { woData[d.id] = d.data().data; });
        log.push(`워크오더소스: wssc_state appId=${appId}`);
        log.push(...Object.keys(woData).map(k => `  ${k}: ${Array.isArray(woData[k]) ? woData[k].length + '건' : typeof woData[k]}`));
        break;
      }
    } catch { /* 없음 */ }
  }

  if (!erpData && !woData) throw new Error('기존 DB를 찾을 수 없습니다. Firestore 권한 또는 데이터가 없습니다.');

  // 3) 현재 wssc_unified 데이터 읽기 (기존 비빈 데이터는 보존)
  const existSnap = await getDocs(collection(db, COLL)).catch(() => null);
  const existing = {};
  if (existSnap) existSnap.forEach(d => { existing[d.id] = d.data().data; });

  // 4) 병합: 소스 우선 (단, 소스가 비어있으면 기존 wssc_unified 값 유지)
  const merged = { ...existing };

  // ERP 데이터 적용 (비어있지 않은 필드만)
  if (erpData) {
    Object.keys(INITIAL_STATE).forEach(k => {
      if (erpData[k] !== undefined && isNonEmpty(erpData[k])) merged[k] = erpData[k];
    });
  }

  // 워크오더 데이터 보완 (ERP에서 비었던 키 채우기 + packageOrders·workSchedules 우선)
  if (woData) {
    Object.keys(woData).forEach(k => {
      if (!Object.keys(INITIAL_STATE).includes(k)) return;
      if (!isNonEmpty(merged[k]) && isNonEmpty(woData[k])) merged[k] = woData[k];
    });
    ['packageOrders', 'workSchedules'].forEach(k => {
      if (isNonEmpty(woData[k])) merged[k] = woData[k];
    });
  }

  // 5) admin 사용자 보장
  const users = Array.isArray(merged.users) ? [...merged.users] : [DEFAULT_ADMIN];
  if (!users.find(u => u.id === 'admin')) users.push(DEFAULT_ADMIN);
  merged.users = users;

  // 6) 비어있지 않은 키만 wssc_unified에 저장
  const toWrite = Object.keys(merged).filter(k => isNonEmpty(merged[k]));
  await Promise.all(
    toWrite.map(k => setDoc(doc(db, COLL, k), { data: JSON.parse(JSON.stringify(merged[k])) }))
  );

  return {
    clients: (merged.clients || []).length,
    items: (merged.items || []).length,
    suppliers: (merged.suppliers || []).length,
    clientOrders: (merged.clientOrders || []).length,
    mappings: (merged.mappings || []).length,
    packageOrders: (merged.packageOrders || []).length,
    priceMappings: (merged.priceMappings || []).length,
    users: users.length,
    log,
  };
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

  // 기존 wssc-erp-v2 + wssc-work-order 전체 데이터 가져오기
  const migrateLegacyData = useCallback(async () => {
    if (!db || !fbUser) throw new Error('DB 미연결');
    return await runLegacyMigration(db);
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
      migrateLegacyData,
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
