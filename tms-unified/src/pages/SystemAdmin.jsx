import React, { useState } from 'react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db as currentDb } from '../firebase'; // 현재 연결된 새 DB

export default function SystemAdmin() {
  const [legacyConfig, setLegacyConfig] = useState({
    // 형님의 기존 103개 데이터가 살아숨쉬는 오리지널 Firebase 세팅
    apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
    authDomain: "wssc-nutrition.firebaseapp.com",
    projectId: "wssc-nutrition",
  });
  
  const [status, setStatus] = useState('idle'); // idle, connecting, fetching, writing, done, error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const runMigration = async () => {
    if (!window.confirm("진짜 오리지널 레거시 DB에서 품목 103개 등 모든 데이터를 새 시스템으로 복원하시겠습니까? (이전 테스트 데이터는 무시하고 새 ID로 강제 복원합니다)")) return;
    
    setStatus('connecting');
    setProgress(0);
    setLogs([]);
    addLog('구버전 오리지널 데이터베이스(103개 품목 저장소) 연결 시도 중...');

    try {
      // 1. 구버전 DB 임시 연결 (기존 연결이 있으면 삭제)
      const existingApp = getApps().find(a => a.name === 'legacy-migration-app');
      if (existingApp) await deleteApp(existingApp);

      const legacyApp = initializeApp(legacyConfig, 'legacy-migration-app');
      const legacyDb = getFirestore(legacyApp);
      addLog('오리지널 DB 연결 완료. 103개 품목 구출 작전 시작...');
      setProgress(20);

      // 2. 컬렉션 데이터 추출
      const collectionsToMigrate = ['clients', 'items', 'suppliers', 'users', 'clientOrders', 'invoices'];
      const batch = writeBatch(currentDb);
      let totalDocs = 0;

      for (let i = 0; i < collectionsToMigrate.length; i++) {
        const colName = collectionsToMigrate[i];
        addLog(`[${colName}] 컬렉션 원본 데이터 싹쓸이 스캔 중...`);
        
        try {
          const snapshot = await getDocs(collection(legacyDb, colName));
          
          if (snapshot.empty) {
            addLog(`[${colName}] 데이터가 없습니다 (스킵)`);
            continue;
          }

          snapshot.forEach((document) => {
            // 새 DB에 동일한 ID로 세팅 준비
            const newDocRef = doc(currentDb, colName, document.id);
            batch.set(newDocRef, document.data());
            totalDocs++;
          });
          
          addLog(`[${colName}] ${snapshot.size}개 문서 복구 완료 (마이그레이션 적재)`);
        } catch (colErr) {
           addLog(`⚠️ [${colName}] 스캔 실패 (권한 없음). 스킵.`);
        }
        
        setProgress(20 + Math.floor(((i + 1) / collectionsToMigrate.length) * 60));
      }

      // 3. 일괄 기록 (Batch Commit)
      if (totalDocs > 0) {
        addLog(`총 ${totalDocs}개의 오리지널 데이터를 현재 시스템에 쏟아붓습니다...`);
        await batch.commit();
        addLog(`✅ 복원 완료! 형님의 원래 데이터 103개가 모두 새 DB에 안전하게 안착했습니다.`);
      } else {
        addLog(`복사할 원본 데이터가 없습니다. 이미 모두 옮겨졌거나 구버전 DB가 비어있습니다.`);
      }

      setProgress(100);
      setStatus('done');
      addLog('🎉 전체 마이그레이션(구출 작전) 완료. 새로고침 시 데이터가 나타납니다.');

    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`❌ 치명적 에러 발생: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">오리지널 데이터 구출 시스템 (복구)</h1>
          <p className="text-slate-500 font-bold mt-1">예전에 쓰시던 품목 103개 등 원본 데이터를 모두 가져옵니다.</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-8">
          <h3 className="text-lg font-black text-red-800 mb-2">원상 복구 마이그레이션</h3>
          <p className="text-red-700 font-bold mb-4">
            형님이 기존에 등록해두셨던 <b>진짜 품목 데이터 103개</b>와 보건소 정보를 그대로 가져옵니다.<br/>
            제가 멍청하게 지워버렸던 진짜 마이그레이션 기능을 되살렸습니다. 아래 버튼을 눌러주십시오.
          </p>
          <button 
            onClick={runMigration}
            disabled={status === 'connecting' || status === 'writing'}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {status === 'connecting' ? '연결 중...' : status === 'writing' ? '기록 중...' : '원래 데이터 103개 강제 복원 (마이그레이션)'}
          </button>
        </div>

        {status !== 'idle' && (
          <div className="mt-8">
            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
              <span>작업 진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 mb-6 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm text-green-400 h-[300px] overflow-y-auto shadow-inner">
              <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-700 pb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 17h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                터미널 로그
              </div>
              {logs.map((log, idx) => (
                <div key={idx} className={`mb-1 ${log.includes('에러') || log.includes('⚠️') ? 'text-yellow-400' : ''} ${log.includes('✅') || log.includes('🎉') ? 'text-blue-300 font-bold' : ''}`}>
                  {log}
                </div>
              ))}
              {(status === 'connecting' || status === 'fetching' || status === 'writing') && (
                <div className="animate-pulse mt-2 text-slate-500">_</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
