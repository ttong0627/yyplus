import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Wrench, Grid, Calendar, Printer, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Utils } from '../Utils';

// =========================================================================
// 공통 작업/배송 관리 컨테이너
// =========================================================================
export default function WorkOrder() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      <div className="w-full h-full bg-white/70 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden flex flex-col relative">
         <Routes>
           <Route path="/" element={<Navigate to="/task/schedule" replace />} />
           <Route path="schedule" element={<WorkSchedule />} />
           <Route path="subdivide" element={<WorkMatrixView />} />
           <Route path="package" element={<PackageOrderView />} />
           <Route path="data" element={<ClassifyDataView />} />
         </Routes>
      </div>
    </div>
  );
}

// =========================================================================
// 매트릭스 뷰 (소분 작업지시서)
// =========================================================================
function WorkMatrixView() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [matrixData, setMatrixData] = useState({ columns: [], rows: [] }); // columns: 보건소 목록, rows: 품목별 수량 데이터
  const [loading, setLoading] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const snapOrders = await getDocs(collection(db, 'clientOrders'));
      const snapClients = await getDocs(collection(db, 'clients'));
      const snapItems = await getDocs(collection(db, 'items'));
      
      const orders = snapOrders.docs.map(d => d.data()).filter(o => o.date === targetDate);
      const clients = snapClients.docs.map(d => ({id: d.id, ...d.data()}));
      const items = snapItems.docs.map(d => d.data());

      // 이번 날짜에 발주된 보건소만 추출 (컬럼 생성)
      const orderedClientIds = [...new Set(orders.map(o => o.clientId))];
      const activeClients = clients.filter(c => orderedClientIds.includes(c.id)).sort((a,b) => a.name.localeCompare(b.name));
      
      // 행 데이터 (품목별)
      const itemMap = {};
      orders.forEach(o => {
        const iName = o.itemName.trim();
        if(!itemMap[iName]) {
          const info = items.find(i => i.name === iName) || {};
          itemMap[iName] = { itemName: iName, category: info.category || '미분류', total: 0, clientVals: {} };
        }
        itemMap[iName].clientVals[o.clientId] = (itemMap[iName].clientVals[o.clientId] || 0) + (Number(o.reqBoxes)||0);
        itemMap[iName].total += (Number(o.reqBoxes)||0);
      });

      const rowData = Object.values(itemMap).sort((a,b) => a.category.localeCompare(b.category) || a.itemName.localeCompare(b.itemName));
      
      setMatrixData({ columns: activeClients, rows: rowData });
    } catch(e) {
      console.error(e);
      alert('매트릭스 데이터를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatrix(); }, [targetDate]);

  // 인쇄 로직 (GLOBAL_PRINT_STYLE 적용)
  const handlePrint = () => {
    if (matrixData.rows.length === 0) return alert('인쇄할 데이터가 없습니다.');
    
    let html = `<table><thead><tr><th>분류</th><th>품목명</th><th>합계</th>`;
    matrixData.columns.forEach(c => html += `<th>${c.shortName || c.name}</th>`);
    html += `</tr></thead><tbody>`;
    
    matrixData.rows.forEach(r => {
      html += `<tr><td>${r.category}</td><td class="text-left font-bold">${r.itemName}</td><td class="highlight bg-gray-100">${r.total}</td>`;
      matrixData.columns.forEach(c => {
        const v = r.clientVals[c.id] || 0;
        html += `<td>${v > 0 ? `<span style="color:blue;font-weight:bold">${v}</span>` : ''}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    
    Utils.printContent(`${targetDate} 소분 작업지시서 (매트릭스)`, html);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <input 
          type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
           <button onClick={fetchMatrix} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-300">새로고침</button>
           <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-black rounded-xl text-sm shadow-md hover:bg-indigo-700 transition-all"><Printer size={16}/> 매트릭스 인쇄</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-4">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">매트릭스 생성 중...</div>
        ) : matrixData.rows.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center flex-col gap-3 font-bold text-slate-400"><Package size={40} className="text-slate-200" /> 해당 일자에 할당된 소분 작업이 없습니다.</div>
        ) : (
          <div className="w-full overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
             <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black border border-slate-700 sticky left-0 bg-slate-800 z-20">분류</th>
                    <th className="px-4 py-3 text-sm font-black border border-slate-700 sticky left-12 bg-slate-800 z-20">품목명</th>
                    <th className="px-4 py-3 text-sm font-black text-center border border-slate-700 bg-indigo-700">총합계</th>
                    {matrixData.columns.map(c => (
                      <th key={c.id} className="px-3 py-3 text-xs font-black text-center border border-slate-700 whitespace-pre-wrap leading-tight">{c.shortName || c.name.replace(' ', '\n')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matrixData.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 sticky left-0 bg-white z-10">{row.category}</td>
                      <td className="px-4 py-2 text-sm font-black text-slate-700 border border-slate-200 sticky left-12 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{row.itemName}</td>
                      <td className="px-4 py-2 text-center font-black text-indigo-600 bg-indigo-50/50 border border-slate-200">{row.total}</td>
                      {matrixData.columns.map(c => {
                         const val = row.clientVals[c.id] || 0;
                         return (
                           <td key={c.id} className={`px-2 py-2 text-center text-sm font-bold border border-slate-200 ${val > 0 ? 'text-slate-800' : 'text-slate-200'}`}>
                              {val > 0 ? val : '-'}
                           </td>
                         )
                      })}
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 간단한 작업 일정 달력 뷰 (Work Schedule) - 실제 DB 연동 완료
// =========================================================================
function WorkSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orderDates, setOrderDates] = useState({}); // { '2026-05-15': 3 } (발주 건수)
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  useEffect(() => {
    // 해당 월의 발주 내역을 모두 가져와서 일자별로 집계 (Where 필터로 해당 월만 조회)
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const startStr = `${targetMonthStr}-01`;
    const endStr = `${targetMonthStr}-31`;
    const q = query(collection(db, 'clientOrders'), where('date', '>=', startStr), where('date', '<=', endStr));

    const unsub = onSnapshot(q, snap => {
       const counts = {};
       snap.docs.forEach(doc => {
         const data = doc.data();
         counts[data.date] = (counts[data.date] || 0) + 1;
       });
       setOrderDates(counts);
    });
    return () => unsub();
  }, [year, month]);

  const days = [];
  for(let i=0; i<firstDay; i++) days.push(null);
  for(let i=1; i<=daysInMonth; i++) days.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="flex flex-col h-full animate-fade-in bg-white p-6">
       <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Calendar className="text-indigo-500"/> {year}년 {month + 1}월 작업 캘린더</h3>
          <div className="flex gap-2">
             <button onClick={prevMonth} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600"><ChevronLeft size={20}/></button>
             <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-slate-600">오늘</button>
             <button onClick={nextMonth} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600"><ChevronRight size={20}/></button>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[500px]">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="bg-slate-50 text-center py-3 text-xs font-black text-slate-500 h-10">{d}</div>
          ))}
          {days.map((d, i) => {
             const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
             const dateStr = d ? `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
             const orderCount = d ? orderDates[dateStr] : 0;
             
             return (
               <div key={i} className={`p-2 bg-white transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50/30 ring-1 ring-indigo-500 inset-0 z-10' : ''}`}>
                  {d && (
                    <div className="flex flex-col h-full">
                       <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : i%7===0 ? 'text-rose-500' : 'text-slate-700'}`}>
                         {d}
                       </span>
                       {/* 실제 DB 연동 스케줄 블록 */}
                       {orderCount > 0 && (
                         <div className="mt-auto px-2 py-1.5 bg-indigo-100 border border-indigo-200 rounded text-xs font-black text-indigo-700 truncate shadow-sm">소분 작업 ({orderCount}건)</div>
                       )}
                    </div>
                  )}
               </div>
             )
          })}
       </div>
    </div>
  );
}

// =========================================================================
// 패키지지시서
// =========================================================================
function PackageOrderView() {
  const [targetDate, setTargetDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const [snapOrders, snapClients] = await Promise.all([
          getDocs(query(collection(db, 'clientOrders'), where('date', '==', targetDate))),
          getDocs(collection(db, 'clients'))
        ]);
        const clientsMap = {};
        snapClients.docs.forEach(d => { clientsMap[d.id] = d.data().name; });
        const grouped = {};
        snapOrders.docs.forEach(d => {
          const o = d.data();
          if (!grouped[o.clientId]) grouped[o.clientId] = { clientName: clientsMap[o.clientId] || o.clientId, items: [] };
          grouped[o.clientId].items.push({ name: o.itemName, qty: o.reqBoxes });
        });
        setPackages(Object.values(grouped).sort((a,b) => a.clientName.localeCompare(b.clientName)));
      } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [targetDate]);
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-black text-slate-800">패키지 지시서</h2>
        <div className="flex gap-2">
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none" />
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white font-black rounded-xl text-sm hover:bg-purple-700"><Printer size={16}/> 인쇄</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center text-slate-400 p-10">불러오는 중...</div>
         : packages.length === 0 ? <div className="col-span-full text-center text-slate-400 p-10">해당 날짜에 발주 내역이 없습니다.</div>
         : packages.map((pkg, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg border-b pb-3 mb-3">{pkg.clientName}</h3>
            <div className="space-y-2">
              {pkg.items.map((it, j) => (
                <div key={j} className="flex justify-between text-sm font-bold">
                  <span className="text-slate-600">{it.name}</span>
                  <span className="text-purple-600">{it.qty} Box</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 분류데이터
// =========================================================================
function ClassifyDataView() {
  const [targetDate, setTargetDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [classData, setClassData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const [snapOrders, snapItems] = await Promise.all([
          getDocs(query(collection(db, 'clientOrders'), where('date', '==', targetDate))),
          getDocs(collection(db, 'items'))
        ]);
        const itemsMap = {};
        snapItems.docs.forEach(d => { const data = d.data(); itemsMap[data.name] = data.category || '미분류'; });
        const catMap = {};
        snapOrders.docs.forEach(d => {
          const o = d.data();
          const cat = itemsMap[o.itemName] || '미분류';
          if (!catMap[cat]) catMap[cat] = { category: cat, total: 0, items: {} };
          catMap[cat].total += Number(o.reqBoxes) || 0;
          catMap[cat].items[o.itemName] = (catMap[cat].items[o.itemName] || 0) + (Number(o.reqBoxes) || 0);
        });
        setClassData(Object.values(catMap).sort((a,b) => b.total - a.total));
      } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [targetDate]);
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-black text-slate-800">분류 데이터</h2>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? <div className="text-center text-slate-400 p-10">불러오는 중...</div>
         : classData.length === 0 ? <div className="text-center text-slate-400 p-10">데이터 없음</div>
         : classData.map((cat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3 border-b pb-3">
              <h3 className="font-black text-teal-700 text-lg">{cat.category}</h3>
              <span className="font-black text-2xl text-slate-800">{cat.total} Box</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(cat.items).map(([name, qty], j) => (
                <div key={j} className="bg-teal-50 rounded-lg px-3 py-2 text-sm font-bold flex justify-between">
                  <span className="text-slate-600 truncate">{name}</span>
                  <span className="text-teal-700 ml-2">{qty}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
