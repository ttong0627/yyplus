import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Truck, MapPin, Clock, Search, Navigation, CheckCircle2, Box, FileText, UserCircle, Printer } from 'lucide-react';
import { Utils } from '../Utils';

// =========================================================================
// 공통 물류/배송 관리 컨테이너
// =========================================================================
export default function LogisticsModule() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      {/* Content Area - Flattened 100% Height */}
      <div className="w-full h-full bg-white/70 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden flex flex-col relative">
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

  // Firestore 연동 (Where 필터 적용)
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'deliveries'), where('date', '==', targetDate));
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDeliveries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [targetDate]);

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
        <div className="flex items-center gap-4">
          <Truck className="text-blue-600" />
          <h2 className="text-lg font-black text-slate-800">실시간 관제</h2>
        </div>
        <input 
          type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-blue-500"
        />
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
          <div className="w-full h-full flex flex-col justify-center items-center font-bold text-slate-400">
            <Truck size={48} className="text-slate-200 mb-4" />
            해당 날짜에 등록된 배차 내역이 없습니다. (자동 배차 시스템 연동 전입니다)
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map(del => (
              <div key={del.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserCircle size={24}/></div>
                    <div>
                      <h4 className="font-black text-slate-800">{del.driver || '미정'} 기사님</h4>
                      <p className="text-xs font-bold text-slate-500">{del.vehicle || '-'}</p>
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
                    <MapPin size={16} className="text-rose-400" /> 도착지: {del.destination || '미정'}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Clock size={16} className="text-blue-400" /> 예상 도착: {del.time || '-'}
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
// 2. 상차 지시서 (DB 연동 완료)
// =========================================================================
function LoadingOrder() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingData, setLoadingData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLoadingData = async () => {
    setLoading(true);
    try {
      const qOrders = query(collection(db, 'clientOrders'), where('date', '==', targetDate));
      const snapOrders = await getDocs(qOrders);
      const snapClients = await getDocs(collection(db, 'clients'));
      const clientsMap = {};
      snapClients.docs.forEach(d => { clientsMap[d.id] = d.data().name; });

      const itemsMap = {};
      snapOrders.docs.forEach(d => {
        const o = d.data();
        const iName = o.itemName.trim();
        if (!itemsMap[iName]) itemsMap[iName] = { itemName: iName, total: 0, details: [] };
        itemsMap[iName].total += Number(o.reqBoxes) || 0;
        itemsMap[iName].details.push({ clientName: clientsMap[o.clientId] || '기타', reqBoxes: Number(o.reqBoxes) || 0 });
      });
      setLoadingData(Object.values(itemsMap).sort((a,b) => a.itemName.localeCompare(b.itemName)));
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoadingData(); }, [targetDate]);

  const handlePrint = () => {
    if (loadingData.length === 0) return alert('인쇄할 상차 데이터가 없습니다.');
    let html = `<table><thead><tr><th>품목명</th><th>총 상차 수량 (Box)</th><th>상세 분류</th></tr></thead><tbody>`;
    loadingData.forEach(d => {
      html += `<tr><td class="font-bold">\${d.itemName}</td><td class="highlight bg-gray-100">\${d.total}</td><td class="text-xs">`;
      d.details.forEach(det => { html += `[\${det.clientName}: \${det.reqBoxes}박스] `; });
      html += `</td></tr>`;
    });
    html += `</tbody></table>`;
    Utils.printContent(`[\${targetDate}] 전체 상차 지시서`, html);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in bg-white">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-4">
          <Box className="text-blue-500" />
          <h2 className="text-lg font-black text-slate-800">일일 상차 지시서 (DB연동)</h2>
        </div>
        <div className="flex gap-2">
           <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none" />
           <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-black rounded-xl text-sm hover:bg-blue-700 transition-all"><Printer size={16}/> 지시서 인쇄</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {loading ? <div className="text-center font-bold text-slate-400 p-10">데이터 집계 중...</div> : loadingData.length === 0 ? <div className="text-center font-bold text-slate-400 p-10">해당 날짜에 상차할 품목이 없습니다.</div> : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-sm font-black text-slate-500 border-b border-slate-200">품목명</th>
                <th className="px-4 py-3 text-sm font-black text-slate-500 border-b border-slate-200 text-center">총 상차 수량(Box)</th>
                <th className="px-4 py-3 text-sm font-black text-slate-500 border-b border-slate-200">배송처 상세내역</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30">
                  <td className="px-4 py-4 font-black text-slate-800">{row.itemName}</td>
                  <td className="px-4 py-4 font-black text-blue-600 text-xl text-center bg-blue-50/30">{row.total}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-500 leading-relaxed">
                     {row.details.map((det, i) => <span key={i} className="inline-block bg-slate-100 rounded px-2 py-1 mr-1 mb-1">{det.clientName}: {det.reqBoxes}박스</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 3. 수령 확인증 (DB 연동 완료)
// =========================================================================
function DeliveryReceipt() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptData, setReceiptData] = useState([]);
  
  useEffect(() => {
    const fetchReceipts = async () => {
      const qOrders = query(collection(db, 'clientOrders'), where('date', '==', targetDate));
      const snapOrders = await getDocs(qOrders);
      const snapClients = await getDocs(collection(db, 'clients'));
      const clientsMap = {};
      snapClients.docs.forEach(d => { clientsMap[d.id] = d.data().name; });
      
      const clientGroups = {};
      snapOrders.docs.forEach(d => {
        const o = d.data();
        if (!clientGroups[o.clientId]) clientGroups[o.clientId] = { clientId: o.clientId, clientName: clientsMap[o.clientId] || '기타', items: [] };
        clientGroups[o.clientId].items.push({ itemName: o.itemName, reqBoxes: o.reqBoxes });
      });
      setReceiptData(Object.values(clientGroups));
    };
    fetchReceipts();
  }, [targetDate]);

  return (
    <div className="flex flex-col h-full animate-fade-in bg-slate-50">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
        <div className="flex items-center gap-4">
          <CheckCircle2 className="text-emerald-500" />
          <h2 className="text-lg font-black text-slate-800">모바일 수령 확인증</h2>
        </div>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold outline-none" />
      </div>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receiptData.length === 0 ? <div className="col-span-full text-center font-bold text-slate-400 p-10">납품 내역이 없습니다.</div> : (
          receiptData.map((rcpt, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>
               <h3 className="text-xl font-black text-slate-800 mt-2 mb-4">{rcpt.clientName}</h3>
               <div className="space-y-2 mb-6 flex-1">
                 {rcpt.items.map((it, i) => (
                   <div key={i} className="flex justify-between items-center text-sm font-bold border-b border-slate-100 pb-2">
                     <span className="text-slate-600">{it.itemName}</span>
                     <span className="text-emerald-600 text-lg">{it.reqBoxes} Box</span>
                   </div>
                 ))}
               </div>
               <button onClick={() => alert('서명 완료 처리되었습니다.')} className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black hover:bg-emerald-100 transition-colors">
                  서명 및 확인 완료
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
