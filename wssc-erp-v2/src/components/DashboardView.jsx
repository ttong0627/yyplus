import React, { useMemo } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';

export const DashboardView = ({ items=[], clients=[], clientOrders=[], payments=[], logs=[], onExport, onImport, sortOrder=[], setOrder, toast }) => {
  const dLog = useMemo(() => { const y = new Date(); y.setDate(y.getDate()-7); return logs.filter(l => new Date(l.date.split('. ')[0].replace(/\./g, '-')) > y).slice(0, 10); }, [logs]);
  const handleDragStart = (e, idx) => e.dataTransfer.setData('text/plain', idx);
  const handleDragOver = e => e.preventDefault();
  const handleDrop = (e, tgtIdx) => { e.preventDefault(); const srcIdx = parseInt(e.dataTransfer.getData('text/plain'), 10); if (isNaN(srcIdx) || srcIdx === tgtIdx) return; const n = [...sortOrder]; const [m] = n.splice(srcIdx, 1); n.splice(tgtIdx, 0, m); setOrder(n); toast('정렬 순서가 저장되었습니다.'); };
  return (
    <div className="space-y-6 w-full animate-fade-in">
      <div><h2 className="text-2xl font-bold flex items-center gap-2"><Ic.Dash size={28} className="text-blue-600"/> 시스템 대시보드</h2><p className="text-[11px] text-gray-500 mt-1">데이터 요약 및 마스터 분류 정렬 순서를 관리합니다.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div><div className="flex justify-between items-start relative z-10"><div><p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">등록 품목</p><h3 className="text-4xl font-black text-slate-800">{items.length}<span className="text-sm font-bold text-slate-400 ml-1">건</span></h3></div><div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600"><Ic.Box size={24}/></div></div></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div><div className="flex justify-between items-start relative z-10"><div><p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">관리 보건소</p><h3 className="text-4xl font-black text-slate-800">{clients.length}<span className="text-sm font-bold text-slate-400 ml-1">개소</span></h3></div><div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600"><Ic.Bldg size={24}/></div></div></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div><div className="flex justify-between items-start relative z-10"><div><p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">당월 발주서</p><h3 className="text-4xl font-black text-slate-800">{clientOrders.length}<span className="text-sm font-bold text-slate-400 ml-1">건</span></h3></div><div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600"><Ic.Clip size={24}/></div></div></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div><div className="flex justify-between items-start relative z-10"><div><p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">미결제 대금</p><h3 className="text-3xl font-black text-slate-800">{payments.filter(p=>p.status==='unpaid').length}<span className="text-sm font-bold text-slate-400 ml-1">건</span></h3></div><div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600"><Ic.Card size={24}/></div></div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm lg:col-span-1 flex flex-col min-h-[400px]">
          <h3 className="font-black text-sm text-slate-800 mb-4 flex items-center gap-2 border-b pb-3"><Ic.ListO size={18} className="text-indigo-500"/> 마스터 분류 정렬 순서 <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded ml-auto">Drag & Drop</span></h3>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-2">
            {sortOrder.length === 0 ? <p className="text-xs text-slate-400 font-bold p-4 text-center bg-slate-50 rounded-xl">등록된 품목을 기반으로 자동 분류됩니다.</p> : sortOrder.map((cat, idx) => (
              <div key={cat} draggable onDragStart={e=>handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={e=>handleDrop(e, idx)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group">
                <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity"><div className="w-1 h-1 bg-slate-400 rounded-full"></div><div className="w-1 h-1 bg-slate-400 rounded-full"></div><div className="w-1 h-1 bg-slate-400 rounded-full"></div></div>
                <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-[10px]">{idx+1}</span>
                {cat}
              </div>
            ))}
          </div>
          {sortOrder.length > 0 && <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">드래그하여 발주서에 출력될 우선순위를 변경하세요.</p>}
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm lg:col-span-2 flex flex-col min-h-[400px]">
          <h3 className="font-black text-sm text-slate-800 mb-4 flex items-center gap-2 border-b pb-3"><Ic.Bell size={18} className="text-blue-500"/> 최근 시스템 로그 (7일)</h3>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
            {dLog.length === 0 ? <p className="text-xs text-slate-400 font-bold p-4 text-center">기록된 최신 로그가 없습니다.</p> : <ul className="space-y-4">
              {dLog.map(l => (
                <li key={l.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-slate-400"><Ic.Settings size={16}/></div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800 break-words leading-relaxed">{l.message}</p><p className="text-[10px] font-bold text-slate-400 mt-1">{l.date}</p></div>
                </li>
              ))}
            </ul>}
          </div>
        </div>
      </div>
    </div>
  );
};
