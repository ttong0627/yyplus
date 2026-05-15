import React, { useState } from 'react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db as currentDb } from '../firebase'; // 현재 연결된 새 DB

export default function SystemAdmin() {
  const [legacyConfig, setLegacyConfig] = useState({
    apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk",
    authDomain: "wssc-nutrition.firebaseapp.com",
    projectId: "wssc-nutrition",
  });
  
  const [status, setStatus] = useState('idle'); // idle, connecting, fetching, writing, done, error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const runMigration = async () => {
    if (!window.confirm("정말로 데이터 마이그레이션을 실행하시겠습니까? (이 작업은 새 DB에 데이터를 덮어씁니다)")) return;
    
    setStatus('connecting');
    setProgress(0);
    setLogs([]);
    addLog('구버전 데이터베이스 연결 시도 중...');

    try {
      // 1. 구버전 DB 임시 연결 (기존 연결이 있으면 삭제)
      const existingApp = getApps().find(a => a.name === 'legacy-migration-app');
      if (existingApp) await deleteApp(existingApp);
      
      const legacyApp = initializeApp({
        apiKey: legacyConfig.apiKey,
        authDomain: legacyConfig.authDomain,
        projectId: legacyConfig.projectId,
      }, 'legacy-migration-app');
      
      const legacyDb = getFirestore(legacyApp);
      addLog('✅ 구버전 데이터베이스 연결 성공');
      
      setStatus('fetching');
      setProgress(10);
      
      // 2. 이관 대상 컬렉션 목록 (단일 파일(App.jsx)에 선언되어 있던 데이터 구조 기반)
      const collectionsToMigrate = ['clients', 'items', 'clientOrders', 'purchaseRequests', 'suppliers', 'mappings'];
      const migrationData = {};
      
      for (let i = 0; i < collectionsToMigrate.length; i++) {
        const colName = collectionsToMigrate[i];
        addLog(`📦 [${colName}] 컬렉션 데이터 추출 중...`);
        
        const snapshot = await getDocs(collection(legacyDb, colName));
        migrationData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        addLog(`✅ [${colName}] ${snapshot.docs.length}건 추출 완료`);
        setProgress(10 + Math.floor(((i + 1) / collectionsToMigrate.length) * 40)); // 10% ~ 50%
      }

      setStatus('writing');
      addLog('🚀 새 데이터베이스로 일괄 이관(Batch Write) 준비 중...');
      
      // 3. 새 DB에 일괄 저장 (Batch Write - Firestore의 최대 한도는 500개이므로 나눠서 처리)
      const CHUNK_SIZE = 400;
      let totalDocs = 0;
      let processedDocs = 0;
      
      // 총 문서 개수 계산
      Object.keys(migrationData).forEach(key => totalDocs += migrationData[key].length);
      
      if (totalDocs === 0) {
        addLog('⚠️ 이전할 데이터가 없습니다.');
        setStatus('done');
        return;
      }

      for (const colName of Object.keys(migrationData)) {
        const docs = migrationData[colName];
        
        // Chunk 단위로 쪼개어 Batch 쓰기
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(currentDb);
          
          chunk.forEach(docData => {
            const docRef = doc(currentDb, colName, docData.id);
            // Firestore에는 id 필드를 넣지 않는 것이 좋으므로 뺄 수도 있지만, 기존 구조 유지를 위해 그대로 복사
            batch.set(docRef, docData);
          });
          
          await batch.commit();
          processedDocs += chunk.length;
          addLog(`💾 [${colName}] ${chunk.length}건 저장 완료... (${processedDocs}/${totalDocs})`);
          setProgress(50 + Math.floor((processedDocs / totalDocs) * 50)); // 50% ~ 100%
        }
      }
      
      addLog(`🎉 모든 마이그레이션이 완료되었습니다! (총 ${totalDocs}건 이관 완료)`);
      setStatus('done');
      setProgress(100);

    } catch (error) {
      console.error(error);
      addLog(`❌ 마이그레이션 실패: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="w-full h-full p-6 animate-fade-in flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white/70 backdrop-blur-md p-8 rounded-[2rem] shadow-xl border border-white flex flex-col items-center">
        <h2 className="text-3xl font-black text-slate-800 mb-2">데이터 베이스 일괄 이관 도구</h2>
        <p className="text-sm text-slate-500 font-bold mb-8 text-center max-w-lg">
          구 시스템(`wssc-nutrition`)의 모든 데이터를 클릭 한 번으로 무손실 추출하여 새로운 통합 플랫폼의 데이터베이스로 안전하게 복사(Migration)합니다.
        </p>

        {/* 설정 카드 */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-600 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Source (구버전 DB)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 pl-1">Project ID</label>
                <input type="text" value={legacyConfig.projectId} onChange={e=>setLegacyConfig({...legacyConfig, projectId: e.target.value})} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 pl-1">API Key</label>
                <input type="text" value={legacyConfig.apiKey} onChange={e=>setLegacyConfig({...legacyConfig, apiKey: e.target.value})} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col justify-center items-center text-center">
             <h3 className="text-sm font-black text-indigo-800 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Target (신규 DB)
            </h3>
            <p className="text-xs text-indigo-600 font-bold mb-4">현재 .env 환경변수로 연결된 데이터베이스</p>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100 text-xs font-black text-slate-700">
               {import.meta.env.VITE_FIREBASE_PROJECT_ID || "wssc-nutrition (현재 동일)"}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <button 
          onClick={runMigration}
          disabled={status === 'connecting' || status === 'fetching' || status === 'writing'}
          className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {status === 'idle' || status === 'error' ? '🚀 마이그레이션 강제 실행' : status === 'done' ? '✅ 이관 완료 (다시 실행)' : '데이터 이관 중...'}
        </button>

        {/* 진행 상태 및 로그 */}
        {status !== 'idle' && (
          <div className="w-full mt-8 flex flex-col gap-4 animate-slide-up">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[11px] text-slate-300 flex flex-col gap-1 shadow-inner">
               {logs.map((log, idx) => (
                 <div key={idx} className={`${log.includes('❌') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : log.includes('🎉') ? 'text-yellow-300 font-bold' : ''}`}>
                   {log}
                 </div>
               ))}
               {logs.length === 0 && <div className="text-slate-600">대기 중...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
