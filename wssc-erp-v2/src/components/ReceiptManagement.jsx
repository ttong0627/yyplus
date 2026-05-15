import React, { useState, useMemo } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';

export const ReceiptManagement = ({ purchaseRequests=[], setPurchaseRequests, payments=[], setPayments, suppliers=[], toast, isLog, setConfirm }) => {
  const [viewPr, setViewPr] = useState(null);
  const grpPRs = useMemo(() => { const grp={}; purchaseRequests.filter(pr=>pr.status==='ordered').forEach(pr=>{if(!grp[pr.requestDate])grp[pr.requestDate]=[];grp[pr.requestDate].push(pr);}); return Object.keys(grp).sort((a,b)=>b.localeCompare(a)).map(date=>({date,list:grp[date]})); }, [purchaseRequests]);
  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0"><div className="flex justify-between items-end mb-2 flex-none"><div><h2 className="text-2xl font-bold">물류창고 입고 전표</h2><p className="text-[11px] text-gray-500 mt-1">확정된 구매요청서를 바탕으로 실제 물건이 입고되었는지 검수합니다.</p></div></div>
      <div className="flex-1 bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto scrollbar-hide">{grpPRs.length===0?<div className="py-20 text-center font-bold text-gray-400">대기중인 입고 전표가 없습니다.</div>:grpPRs.map(g=><div key={g.date} className="mb-8"><h3 className="font-black text-slate-800 text-sm mb-4 border-b border-slate-200 pb-2">{g.date} 전표</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {g.list.map(p=>(
           <div key={p.id} onClick={()=>setViewPr(p)} className="relative p-6 rounded-[2rem] shadow-md border-2 bg-white border-slate-200 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-blue-400 hover:shadow-xl group flex flex-col gap-4 overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 opacity-50"></div>
             <div className="flex items-center gap-4 relative z-10"><div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Ic.Box size={24}/></div><div className="flex-1 min-w-0"><h4 className="font-black text-lg text-slate-800 truncate">{p.supplierName || suppliers.find(x=>x.id===p.supplierId)?.name}</h4></div></div>
             <div className="relative z-10 mt-auto border-t border-slate-100 pt-4"><span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center gap-1"><Ic.Alert size={12}/> 검수 대기</span></div>
           </div>
        ))}
      </div></div>)}</div>
      
      {viewPr && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]"><h3 className="text-xl font-black text-blue-700 flex items-center gap-3"><Ic.Box size={28}/> 실입고 검수: {viewPr.supplierName || suppliers.find(s=>s.id===viewPr.supplierId)?.name}</h3><button onClick={()=>setViewPr(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0"><div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden"><div className="overflow-y-auto flex-1 w-full scrollbar-hide"><table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10"><tr><th className="p-3 border-r w-[8%] break-keep">#</th><th className="p-3 text-left border-r w-[40%] break-keep">품명</th><th className="p-3 bg-blue-50 text-blue-800 border-r w-[17%] break-keep">도착확인수량(Box)</th><th className="p-3 border-r w-[15%] break-keep">단가</th><th className="p-3 text-amber-600 w-[20%] break-keep">청구금액</th></tr></thead><tbody>{viewPr.items.map((it, idx) => (<tr key={`rx-it-${it.itemId}`} className="border-b hover:bg-gray-50"><td className="p-3 text-gray-400 font-bold border-r break-keep">{idx+1}</td><td className="p-3 font-black text-left border-r break-words min-w-[150px]">{it.name} <span className="text-[10px] text-gray-400">({it.unit})</span></td><td className="p-3 font-black text-blue-700 bg-blue-50/20 text-sm border-r break-keep">{Utils.fmt(it.reqBoxes)}</td><td className="p-3 font-bold text-gray-600 border-r break-keep">{Utils.fmt(it.unitPrice)}</td><td className="p-3 font-black text-amber-600 break-keep">{Utils.fmt(it.reqBoxes * it.unitPrice)}</td></tr>))}</tbody></table></div></div></div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-end items-center rounded-b-[2.5rem]"><button onClick={()=>{if(!isLog)return toast('로그인 필요'); setConfirm({is:true, msg:'실제 물건이 일치합니까?\n확정 시 대금 결제 부서로 넘어갑니다.', onC:()=>{const tot=viewPr.items.reduce((a,b)=>a+(b.reqBoxes*b.unitPrice),0); setPayments([{id:`PAY_${Date.now()}`, prId:viewPr.id, supplierId:viewPr.supplierId, supplierName: viewPr.supplierName || suppliers.find(s=>s.id===viewPr.supplierId)?.name || '알수없음', date:new Date().toISOString().split('T')[0], amount:tot, status:'unpaid'}, ...payments]); setPurchaseRequests(purchaseRequests.map(p=>p.id===viewPr.id?{...p,status:'received'}:p)); setConfirm({is:false}); setViewPr(null); toast('입고 확정 완료!');}, onX:()=>setConfirm({is:false})});}} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-black shadow-md text-base transition-transform hover:-translate-y-0.5">이상 없음 (입고 확정 및 결제 요청)</button></div>
          </div>
        </div>
      )}
    </div>
  )
};
