import React, { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase'; 
import { CheckCircle2, AlertCircle, Database, PlusCircle, Activity } from 'lucide-react';

export default function SystemAdmin() {
  const [status, setStatus] = useState('idle'); // idle, seeding, done, error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const runSeeding = async () => {
    if (!window.confirm("DB에 기초 테스트 데이터를 밀어 넣으시겠습니까?\n(기존 데이터는 유지되며, 샘플 데이터가 추가됩니다)")) return;
    
    setStatus('seeding');
    setProgress(0);
    setLogs([]);
    addLog('🚀 1-Click DB Seeding 시작...');

    try {
      const batch = writeBatch(db);
      let opCount = 0;
      const today = new Date().toISOString().split('T')[0];

      // 1. 샘플 보건소 (Clients) 세팅
      addLog('1. 보건소(Clients) 데이터 생성 중...');
      const sampleClients = [
        { id: 'cli_seoul_01', name: '종로구 보건소', type: 'clinic', zone: '강북' },
        { id: 'cli_seoul_02', name: '강남구 보건소', type: 'clinic', zone: '강남' },
        { id: 'cli_gyeong_01', name: '분당구 보건소', type: 'clinic', zone: '경기남부' },
        { id: 'cli_incheon_01', name: '연수구 보건소', type: 'clinic', zone: '인천' }
      ];
      sampleClients.forEach(c => {
        batch.set(doc(collection(db, 'clients'), c.id), c);
        opCount++;
      });
      setProgress(20);

      // 2. 샘플 품목 (Items) 세팅
      addLog('2. 취급 품목(Items) 데이터 생성 중...');
      const sampleItems = [
        { id: 'item_milk_01', name: '서울우유 1L', category: '유제품', price: 2500, unit: '팩' },
        { id: 'item_rice_01', name: '유기농 쌀 10kg', category: '농산물', price: 35000, unit: '포' },
        { id: 'item_veg_01', name: '신선 야채 혼합팩', category: '농산물', price: 12000, unit: '박스' },
        { id: 'item_egg_01', name: '무항생제 계란 30구', category: '축산물', price: 8500, unit: '판' }
      ];
      sampleItems.forEach(i => {
        batch.set(doc(collection(db, 'items'), i.id), i);
        opCount++;
      });
      setProgress(40);

      // 3. 당일 샘플 발주 (ClientOrders) 세팅
      addLog(`3. 당일(${today}) 발주 데이터(ClientOrders) 50건 무작위 생성 중...`);
      for (let i = 0; i < 50; i++) {
        const rClient = sampleClients[Math.floor(Math.random() * sampleClients.length)];
        const rItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
        const qty = Math.floor(Math.random() * 20) + 1; // 1~20 박스
        
        const orderRef = doc(collection(db, 'clientOrders'));
        batch.set(orderRef, {
          clientId: rClient.id,
          itemName: rItem.name,
          reqBoxes: qty,
          date: today,
          status: '배송준비중',
          createdAt: Date.now()
        });
        opCount++;
      }
      setProgress(60);

      // 4. 당일 배송/배차 (Deliveries) 세팅
      addLog(`4. 당일(${today}) 배송 관제 데이터(Deliveries) 생성 중...`);
      const sampleDrivers = ['김기사(11가1234)', '이택배(22나5678)', '박물류(33다9012)'];
      sampleDrivers.forEach((driver, idx) => {
        const delRef = doc(collection(db, 'deliveries'));
        batch.set(delRef, {
          driverName: driver.split('(')[0],
          vehicleNo: driver.split('(')[1].replace(')', ''),
          status: idx === 0 ? '배송중' : '상차대기',
          date: today,
          temperature: (Math.random() * 2 + 2).toFixed(1) + '℃',
          createdAt: Date.now()
        });
        opCount++;
      });
      setProgress(80);

      // 5. 이전 달 계산서 (Invoices) 샘플
      addLog(`5. 이전 달 샘플 청구서(Invoices) 생성 중...`);
      const invRef = doc(collection(db, 'invoices'));
      batch.set(invRef, {
        date: '2026-04-30',
        title: '2026년 04월 종로구 보건소 정산 청구',
        totalAmount: 1450000,
        status: '발급완료',
        createdAt: Date.now()
      });
      opCount++;

      // 일괄 커밋 실행
      addLog(`[Commit] 총 \${opCount}개의 문서를 DB에 일괄 기록합니다...`);
      await batch.commit();

      setProgress(100);
      setStatus('done');
      addLog('✅ 모든 테스트 데이터가 성공적으로 DB에 주입되었습니다!');
      
    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`❌ 에러 발생: \${error.message}`);
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Database className="text-[#805ad5]" size={32} />
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">마이그레이션 & 초기 세팅 도구</h1>
          <p className="text-slate-500 font-bold mt-1">Firestore DB가 비어있을 때 버튼 하나로 실무 테스트용 데이터를 채워 넣습니다.</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 mb-8 flex items-start gap-4">
          <Activity className="text-blue-500 mt-1" size={24}/>
          <div>
            <h3 className="text-lg font-black text-blue-900 mb-2">초기 데이터 자동 주입 (DB Seeding)</h3>
            <p className="text-blue-700 font-bold mb-4">
              현재 연결된 Firebase 프로젝트에 보건소, 품목, <b>당일 발주 50건</b>, <b>배차 내역</b>, <b>과거 청구서</b> 등을 자동 생성합니다. 
              텅 빈 화면을 채우고 실제 시스템이 어떻게 동작하는지 테스트할 수 있습니다.
            </p>
            <button 
              onClick={runSeeding}
              disabled={status === 'seeding'}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              <PlusCircle size={20} />
              {status === 'seeding' ? '데이터 쏟아붓는 중...' : '테스트 데이터 통으로 밀어넣기'}
            </button>
          </div>
        </div>

        {status !== 'idle' && (
          <div className="mt-8">
            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
              <span>작업 진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 mb-6 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-500 \${status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-[#d53f8c] to-[#805ad5]'}`} 
                style={{ width: `\${progress}%` }}
              ></div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm text-green-400 h-[300px] overflow-y-auto shadow-inner">
              <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-700 pb-2">
                <CheckCircle2 size={16} /> 터미널 로그
              </div>
              {logs.map((log, idx) => (
                <div key={idx} className={`mb-1 \${log.includes('에러') ? 'text-red-400' : ''} \${log.includes('완료') ? 'text-blue-300 font-bold' : ''}`}>
                  {log}
                </div>
              ))}
              {status === 'seeding' && (
                <div className="animate-pulse mt-2 text-slate-500">_</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
