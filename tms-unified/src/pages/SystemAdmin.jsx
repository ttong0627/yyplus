import React, { useState } from 'react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db as newDb } from '../firebase'; // 통합 메인 DB (wellshare-tms)

// ========================================================
// 레거시 DB 설정 목록 (데이터 퍼올 원본 프로젝트들)
// ========================================================
const LEGACY_CONFIGS = [
  {
    label: 'wssc-nutrition (구 ERP)',
    appName: 'legacy-wssc-nutrition',
    config: {
      apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
      authDomain: "wssc-nutrition.firebaseapp.com",
      projectId: "wssc-nutrition",
      storageBucket: "wssc-nutrition.firebasestorage.app",
      messagingSenderId: "845373489879",
      appId: "1:845373489879:web:acf85d5395f0739d0b2692"
    }
  }
  // 형님이 다른 프로젝트 추가 원하실 때 여기 추가
];

// 마이그레이션 대상 컬렉션 (구버전 DB에서 새 DB로 그대로 이식)
const COLLECTIONS_TO_MIGRATE = [
  { from: 'items',        to: 'items',        label: '품목 (마스터)' },
  { from: 'clients',     to: 'clients',      label: '보건소' },
  { from: 'suppliers',   to: 'partners',     label: '거래처/공급업체' },
  { from: 'users',       to: 'users',        label: '사용자' },
  { from: 'clientOrders',to: 'orders',       label: '발주 내역' },
  { from: 'invoices',    to: 'billing',      label: '청구/정산' },
];

export default function SystemAdmin() {
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  const addLog = (msg, type = 'info') => {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : '•';
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${prefix} ${msg}`, ...prev]);
  };

  const runMigration = async (legacyCfg) => {
    if (!window.confirm(`[${legacyCfg.label}] 의 데이터를 새 통합 DB(wellshare-tms)로 복사하시겠습니까?\n기존에 같은 ID의 데이터가 있으면 덮어씁니다.`)) return;

    setStatus('running');
    setProgress(0);
    setLogs([]);
    setSummary(null);
    addLog(`====== [${legacyCfg.label}] 마이그레이션 시작 ======`);

    let legacyApp = null;
    const migrSummary = {};

    try {
      // 1단계: 구버전 DB 임시 연결
      const existingApp = getApps().find(a => a.name === legacyCfg.appName);
      if (existingApp) await deleteApp(existingApp);
      legacyApp = initializeApp(legacyCfg.config, legacyCfg.appName);
      const legacyDb = getFirestore(legacyApp);
      addLog(`구 DB [${legacyCfg.label}] 연결 성공`);
      setProgress(10);

      // 2단계: 컬렉션별 데이터 추출 및 신규 DB에 기록
      for (let i = 0; i < COLLECTIONS_TO_MIGRATE.length; i++) {
        const { from, to, label } = COLLECTIONS_TO_MIGRATE[i];
        addLog(`[${label}] 원본 데이터 읽는 중... (${from} → ${to})`);

        try {
          const snap = await getDocs(collection(legacyDb, from));
          if (snap.empty) {
            addLog(`[${label}] 원본 없음 - 건너뜀`, 'warn');
            migrSummary[label] = 0;
            continue;
          }

          // 500개 단위로 배치 나눠서 쓰기 (Firestore 제한)
          const docs = snap.docs;
          let written = 0;
          for (let bStart = 0; bStart < docs.length; bStart += 499) {
            const batch = writeBatch(newDb);
            const chunk = docs.slice(bStart, bStart + 499);
            chunk.forEach(d => {
              const ref = doc(newDb, to, d.id);
              batch.set(ref, d.data(), { merge: true }); // merge: 기존 데이터 보존하면서 업데이트
            });
            await batch.commit();
            written += chunk.length;
          }

          addLog(`[${label}] ${written}개 ✅ (${from} → ${to})`, 'success');
          migrSummary[label] = written;
        } catch (colErr) {
          addLog(`[${label}] 읽기 실패: ${colErr.message}`, 'error');
          migrSummary[label] = '오류';
        }

        setProgress(10 + Math.floor(((i + 1) / COLLECTIONS_TO_MIGRATE.length) * 85));
      }

      // 완료
      setProgress(100);
      setStatus('done');
      setSummary(migrSummary);
      addLog(`====== 마이그레이션 완료! 아래 결과를 확인하세요 ======`, 'success');

    } catch (err) {
      addLog(`치명적 오류: ${err.message}`, 'error');
      setStatus('error');
    } finally {
      if (legacyApp) {
        try { await deleteApp(legacyApp); } catch(_) {}
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#f8f9fc] gap-6 overflow-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-black text-slate-800 mb-1">DB연동 / 시스템점검</h2>
        <p className="text-sm text-slate-500 font-bold mb-6">
          현재 통합 DB: <span className="text-indigo-600">wellshare-tms</span> (ttong0627@gmail.com)
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-black text-amber-700">⚠️ 마이그레이션이란?</p>
          <p className="text-sm text-amber-600 mt-1">기존 구버전 DB(wssc-nutrition)에 들어있던 형님의 실 데이터(103개 품목, 보건소 등)를 새 통합 DB(wellshare-tms)로 복사해옵니다. 기존에 같은 데이터가 있으면 최신 내용으로 업데이트(merge)합니다.</p>
        </div>

        {/* 마이그레이션 버튼 - 원본 DB별로 */}
        <div className="space-y-3">
          {LEGACY_CONFIGS.map(cfg => (
            <button
              key={cfg.appName}
              onClick={() => runMigration(cfg)}
              disabled={status === 'running'}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white font-black rounded-xl text-base hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {status === 'running' ? '마이그레이션 진행 중...' : `🚀 [${cfg.label}] 데이터 통합 DB로 복사`}
            </button>
          ))}
        </div>

        {/* 진행률 바 */}
        {status !== 'idle' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
              <span>진행률</span><span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#7c3aed] to-[#db2777] h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 결과 요약 카드 */}
      {summary && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6">
          <h3 className="font-black text-emerald-700 text-lg mb-4">✅ 마이그레이션 결과 요약</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(summary).map(([label, count]) => (
              <div key={label} className={`p-4 rounded-xl text-center ${count === '오류' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className="text-xs font-black text-slate-500 mb-1">{label}</p>
                <p className={`text-2xl font-black ${count === '오류' ? 'text-red-600' : 'text-emerald-600'}`}>{count === '오류' ? '⚠️' : count}</p>
                {count !== '오류' && <p className="text-xs text-slate-400">개 복사됨</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로그 패널 */}
      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-5 flex flex-col gap-1 max-h-80 overflow-auto">
          {logs.map((log, i) => (
            <p key={i} className={`text-xs font-mono ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : log.includes('⚠️') ? 'text-amber-400' : 'text-slate-400'}`}>{log}</p>
          ))}
        </div>
      )}
    </div>
  );
}
