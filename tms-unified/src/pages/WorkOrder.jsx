import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
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
      {/* Content Area - Flattened 100% Height */}
      <div className="w-full h-full bg-white/70 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden flex flex-col relative">
         <Routes>
           <Route path="/" element={<Navigate to="/task/subdivide" replace />} />
           <Route path="subdivide" element={<WorkMatrixView />} />
           <Route path="schedule" element={<WorkSchedule />} />
           {/* 기타 하위 라우트들 추가 가능 */}
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
// 간단한 작업 일정 달력 뷰 (Work Schedule)
// =========================================================================
function WorkSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 달력 계산 기초
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
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

       <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="bg-slate-50 text-center py-3 text-xs font-black text-slate-500">{d}</div>
          ))}
          {days.map((d, i) => {
             const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
             return (
               <div key={i} className={`min-h-[100px] p-2 bg-white transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50/30 ring-1 ring-indigo-500 inset-0 z-10' : ''}`}>
                  {d && (
                    <div className="flex flex-col h-full">
                       <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : i%7===0 ? 'text-rose-500' : 'text-slate-700'}`}>
                         {d}
                       </span>
                       {/* 스케줄 더미 블록 */}
                       {Math.random() > 0.6 && (
                         <div className="mt-auto px-2 py-1 bg-emerald-100 border border-emerald-200 rounded text-[10px] font-black text-emerald-700 truncate shadow-sm">작업 예정</div>
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
