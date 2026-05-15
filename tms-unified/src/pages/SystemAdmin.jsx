import React, { useState } from 'react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db as newDb } from '../firebase'; // 통합 메인 DB (wellshare-tms)

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
];

const COLLECTIONS_TO_MIGRATE = [
  { from: 'items',         to: 'items',    label: '품목(마스터)' },
  { from: 'clients',      to: 'clients',  label: '보건소' },
  { from: 'suppliers',    to: 'partners', label: '거래처' },
  { from: 'users',        to: 'users',    label: '사용자' },
  { from: 'clientOrders', to: 'orders',   label: '발주내역' },
  { from: 'invoices',     to: 'billing',  label: '청구/정산' },
];

export default function SystemAdmin() {
  const [status, setStatus] = useState('idle'); // idle | confirm | running | done | error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);
  const [selectedCfg, setSelectedCfg] = useState(null);

  const addLog = (msg, type = 'info') => {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : '•';
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${prefix} ${msg}`, ...prev]);
  };

  const handleClickMigrate = (cfg) => {
    setSelectedCfg(cfg);
    setStatus('confirm'); // confirm 팝업을 자체 UI로 표시
  };

  const runMigration = async () => {
    const legacyCfg = selectedCfg;
    setStatus('running');
    setProgress(0);
    setLogs([]);
    setSummary(null);
    addLog(`====== [${legacyCfg.label}] 마이그레이션 시작 ======`);

    let legacyApp = null;
    const migrSummary = {};

    try {
      // 1. 구버전 DB 임시 연결
      const existingApp = getApps().find(a => a.name === legacyCfg.appName);
      if (existingApp) await deleteApp(existingApp);
      legacyApp = initializeApp(legacyCfg.config, legacyCfg.appName);
      const legacyDb = getFirestore(legacyApp);
      addLog(`구 DB [${legacyCfg.label}] 연결 성공`);
      setProgress(10);

      // 2. 컬렉션별 복사
      for (let i = 0; i < COLLECTIONS_TO_MIGRATE.length; i++) {
        const { from, to, label } = COLLECTIONS_TO_MIGRATE[i];
        addLog(`[${label}] 읽는 중... (${from} → ${to})`);

        try {
          const snap = await getDocs(collection(legacyDb, from));
          if (snap.empty) {
            addLog(`[${label}] 원본 없음 - 건너뜀`, 'warn');
            migrSummary[label] = 0;
          } else {
            const docs = snap.docs;
            let written = 0;
            for (let bStart = 0; bStart < docs.length; bStart += 499) {
              const batch = writeBatch(newDb);
              docs.slice(bStart, bStart + 499).forEach(d => {
                batch.set(doc(newDb, to, d.id), d.data(), { merge: true });
              });
              await batch.commit();
              written += Math.min(499, docs.length - bStart);
            }
            addLog(`[${label}] ${written}개 완료!`, 'success');
            migrSummary[label] = written;
          }
        } catch (colErr) {
          addLog(`[${label}] 오류: ${colErr.message}`, 'error');
          migrSummary[label] = '오류';
        }

        setProgress(10 + Math.floor(((i + 1) / COLLECTIONS_TO_MIGRATE.length) * 85));
      }

      setProgress(100);
      setStatus('done');
      setSummary(migrSummary);
      addLog('====== 마이그레이션 완료! ======', 'success');

    } catch (err) {
      addLog(`치명적 오류: ${err.message}`, 'error');
      addLog('👉 Firebase Console에서 wellshare-tms Firestore 보안 규칙을 확인하세요.', 'warn');
      setStatus('error');
    } finally {
      if (legacyApp) { try { await deleteApp(legacyApp); } catch(_) {} }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#f8f9fc] gap-6 overflow-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-black text-slate-800 mb-1">DB연동 / 시스템점검</h2>
        <p className="text-sm text-slate-500 font-bold mb-6">
          현재 통합 DB: <span className="text-indigo-600">wellshare-tms</span> (ttong0627@gmail.com)
        </p>

        {/* 경고 박스 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-black text-amber-700">⚠️ 마이그레이션이란?</p>
          <p className="text-sm text-amber-600 mt-1">기존 구버전 DB(wssc-nutrition)에 들어있던 형님의 실 데이터(103개 품목, 보건소 등)를 새 통합 DB(wellshare-tms)로 복사해옵니다.</p>
        </div>

        {/* 보안 규칙 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-black text-blue-700">📋 버튼 클릭 전 필수 확인사항</p>
          <p className="text-xs text-blue-600 mt-1">Firebase Console → wellshare-tms → Firestore → Rules 탭에서 아래 내용으로 변경 후 [Publish] 클릭:</p>
          <pre className="text-xs text-blue-800 bg-blue-100 p-3 rounded mt-2 leading-relaxed overflow-auto whitespace-pre-wrap">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
        </div>

        {/* 버튼 영역 */}
        {status === 'idle' && (
          <div className="space-y-3">
            {LEGACY_CONFIGS.map(cfg => (
              <button
                key={cfg.appName}
                onClick={() => handleClickMigrate(cfg)}
                className="w-full py-5 px-6 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white font-black rounded-xl text-base hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer select-none"
              >
                🚀 [{cfg.label}] 데이터 통합 DB로 복사
              </button>
            ))}
          </div>
        )}

        {/* 인라인 확인 팝업 (window.confirm 대체) */}
        {status === 'confirm' && selectedCfg && (
          <div className="border-2 border-[#7c3aed] rounded-xl p-6 text-center bg-purple-50">
            <p className="font-black text-slate-800 text-lg mb-2">정말로 마이그레이션 하시겠습니까?</p>
            <p className="text-sm text-slate-600 mb-6">
              [{selectedCfg.label}]의 데이터를 새 통합 DB(wellshare-tms)로 복사합니다.<br/>
              기존 같은 ID 데이터는 최신 내용으로 업데이트(merge)됩니다.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStatus('idle'); setSelectedCfg(null); }}
                className="px-8 py-3 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-all"
              >
                취소
              </button>
              <button
                onClick={runMigration}
                className="px-8 py-3 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white font-black rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                ✅ 네, 지금 바로 복사합니다
              </button>
            </div>
          </div>
        )}

        {/* 진행 중 */}
        {status === 'running' && (
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
              <span>진행률</span><span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-[#7c3aed] to-[#db2777] h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm font-bold text-slate-500 mt-2 animate-pulse">마이그레이션 진행 중... 잠시만 기다려주세요</p>
          </div>
        )}

        {/* 완료 후 재시작 버튼 */}
        {(status === 'done' || status === 'error') && (
          <button
            onClick={() => { setStatus('idle'); setLogs([]); setSummary(null); setProgress(0); }}
            className="w-full py-3 px-6 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-all mt-4"
          >
            🔄 처음으로 돌아가기
          </button>
        )}
      </div>

      {/* 결과 요약 */}
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

      {/* 로그 */}
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
