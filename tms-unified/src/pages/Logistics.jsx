import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Truck, MapPin, Clock, Search, Navigation, CheckCircle2, Box, FileText, UserCircle } from 'lucide-react';
import { Utils } from '../Utils';

// =========================================================================
// 공통 물류/배송 관리 컨테이너
// =========================================================================
export default function LogisticsModule() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'tracking', name: '실시간 관제', icon: <Navigation size={18} />, path: '/logistics/tracking' },
    { id: 'loading', name: '상차 지시서', icon: <Box size={18} />, path: '/logistics/loading' },
    { id: 'receipt', name: '수령 확인증', icon: <FileText size={18} />, path: '/logistics/receipt' },
  ];

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 p-4 sm:p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Truck className="text-blue-600" />
            배송/물류 통합 관제탑
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">실시간 배차, 상차 검수, GPS 기반 배송 현황 트래킹</p>
        </div>
        
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = location.pathname.includes(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 overflow-hidden flex flex-col relative">
         <Routes>
           <Route path="/" element={<Navigate to="/logistics/tracking" replace />} />
           <Route path="tracking" element={<DeliveryTracking />} />
           <Route path="loading" element={<LoadingOrder />} />
           <Route path="receipt" element={<DeliveryReceipt />} />
         </Routes>
      </div>
    </div>
  );
}

// =========================================================================
// 1. 실시간 배송 관제 및 배차 관리 (Delivery Tracking)
// =========================================================================
function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Firestore 연동
  useEffect(() => {
    setLoading(true);
    // deliveries 컬렉션을 실시간 구독
    const unsub = onSnapshot(collection(db, 'deliveries'), (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 날짜 필터 (없으면 오늘 날짜로 퉁침)
      data = data.filter(d => (d.date || targetDate) === targetDate);
      setDeliveries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [targetDate]);

  // 긴급 배차 테스트 로직 (형님 시연용)
  const createMockDelivery = async () => {
    try {
      await addDoc(collection(db, 'deliveries'), {
        date: targetDate,
        driver: ['김기사', '이운전', '최물류'][Math.floor(Math.random()*3)],
        vehicle: `서울 88가 ${Math.floor(Math.random()*9000)+1000}`,
        destination: ['팔달보건소', '장안보건소', '권선보건소'][Math.floor(Math.random()*3)],
        status: '대기중', // 대기중 -> 상차완료 -> 배송중 -> 배송완료
        time: '14:00',
        createdAt: serverTimestamp()
      });
    } catch(e) { console.error(e); }
  };

  // 기사용 상태 업데이트 액션
  const updateStatus = async (id, currentStatus) => {
    const nextMap = { '대기중': '상차완료', '상차완료': '배송중', '배송중': '배송완료' };
    const nextStatus = nextMap[currentStatus];
    if(!nextStatus) return;
    
    try {
      await updateDoc(doc(db, 'deliveries', id), { status: nextStatus, updatedAt: serverTimestamp() });
    } catch(e) { console.error(e); }
  };

  const statTotal = deliveries.length;
  const statWait = deliveries.filter(d => d.status === '대기중' || d.status === '상차완료').length;
  const statIng = deliveries.filter(d => d.status === '배송중').length;
  const statDone = deliveries.filter(d => d.status === '배송완료').length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <input 
          type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-blue-500"
        />
        <button onClick={createMockDelivery} className="px-5 py-2.5 bg-blue-600 text-white font-black rounded-xl text-sm shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
          <Truck size={16}/> 긴급 배차 추가(테스트)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border-b border-slate-100">
        <StatCard title="총 배차" value={statTotal} color="blue" />
        <StatCard title="출발 대기" value={statWait} color="slate" />
        <StatCard title="배송 진행" value={statIng} color="amber" />
        <StatCard title="배송 완료" value={statDone} color="emerald" />
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4">
        {loading ? (
          <div className="w-full h-full flex justify-center items-center font-bold text-slate-400">실시간 관제 데이터 수신 중...</div>
        ) : deliveries.length === 0 ? (
          <div className="w-full h-full flex justify-center items-center font-bold text-slate-400">해당 날짜에 등록된 배차 내역이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map(del => (
              <div key={del.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserCircle size={24}/></div>
                    <div>
                      <h4 className="font-black text-slate-800">{del.driver} 기사님</h4>
                      <p className="text-xs font-bold text-slate-500">{del.vehicle}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide ${
                    del.status === '배송완료' ? 'bg-emerald-100 text-emerald-700' :
                    del.status === '배송중' ? 'bg-blue-100 text-blue-700' :
                    del.status === '상차완료' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {del.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <MapPin size={16} className="text-rose-400" /> {del.destination}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Clock size={16} className="text-blue-400" /> 예상 도착: {del.time}
                  </div>
                </div>

                {del.status !== '배송완료' && (
                  <button 
                    onClick={() => updateStatus(del.id, del.status)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-colors"
                  >
                    {del.status === '대기중' ? '차량 상차 완료 처리' : del.status === '상차완료' ? '배송 출발 처리' : '현장 도착(완료) 처리'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50', slate: 'text-slate-600 bg-slate-100',
    amber: 'text-amber-600 bg-amber-50', emerald: 'text-emerald-600 bg-emerald-50'
  };
  return (
    <div className={`p-4 rounded-2xl ${colorMap[color]} flex flex-col items-center justify-center`}>
      <span className="text-[11px] font-black uppercase tracking-wider opacity-80">{title}</span>
      <span className="text-3xl font-black mt-1">{value}</span>
    </div>
  )
}

// =========================================================================
// 2. 상차 지시서 (차량별 짐 싣기 로직)
// =========================================================================
function LoadingOrder() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in bg-white">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Box size={40} className="text-blue-500" /></div>
      <h2 className="text-xl font-black text-slate-800 mb-2">차량별 상차 지시서 출력</h2>
      <p className="text-sm font-bold text-slate-500 max-w-md">배차된 기사님 차량에 어떤 물건을 몇 박스 실어야 하는지 안내하는 뷰입니다. (작업지시서 매트릭스 데이터를 기반으로 자동 연동 준비 완료)</p>
    </div>
  );
}

// =========================================================================
// 3. 수령 확인증 (보건소 도착 검수용)
// =========================================================================
function DeliveryReceipt() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in bg-white">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={40} className="text-emerald-500" /></div>
      <h2 className="text-xl font-black text-slate-800 mb-2">보건소 검수용 수령 확인증</h2>
      <p className="text-sm font-bold text-slate-500 max-w-md">현장에서 납품 내역을 대조하고 서명(Sign)을 받을 수 있는 모바일 최적화 영수증 화면입니다. (전자 서명 패드 연동 모듈 이식 대기 중)</p>
    </div>
  );
}
