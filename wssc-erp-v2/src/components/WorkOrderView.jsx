import React, { useState, useMemo, useCallback } from 'react';
import { Ic } from '../App.jsx';

const fmt = n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2}));const GLOBAL_PRINT_STYLE = `
@media print { 
    #main-app { display: none !important; }
    .print\\:hidden { display: none !important; } 
    .print\\:block { display: block !important; } 
    
    body, html, #root { 
        background-color: white !important; 
        background: none !important;
        margin: 0; padding: 0; 
        overflow: visible !important; 
        height: auto !important; 
        color: black !important;
    }
    @page { margin: 15mm; size: auto; } 
    table { page-break-inside: auto; width: 100% !important; } 
    th, td { white-space: normal !important; word-break: keep-all !important; border: 1px solid black !important; }
    
    /* 공무원 제출용 깔끔한 라이트 테마 변환 */
    .hp, .hb, .hg, .hr, .header-blue, .header-green {
        background-color: #f8fafc !important;
        color: black !important;
        -webkit-print-color-adjust: exact;
    }
}
`;

export const WorkOrderView = ({ targetMonth, clients=[], items=[], clientOrders=[], mappings=[], categorySortOrder=[], globalMonth }) => {
    // This merges OrderSummaryUnitMatrixView logic.
    // For simplicity, we assume targetWorkDate is today or selected.
    const [targetWorkDate, setTargetWorkDate] = useState(Utils.calculateWorkDate ? Utils.calculateWorkDate(new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]);
    const getMappedWorkDate = useCallback((deliveryDateStr) => {
        return Utils.calculateWorkDate ? Utils.calculateWorkDate(deliveryDateStr) : deliveryDateStr;
    }, []);

    const { d1List, d2List } = useMemo(() => {
        const d1 = [], d2 = [];
        (clients||[]).forEach(c => {
            if(!c || !c.id) return;
            const ord = (clientOrders||[]).find(o => o?.clientId === c?.id && o?.month === targetMonth); if (!ord) return;
            if (ord?.deliveryDate1 && (ord?.items||[]).some(i => Number(i?.qty1) > 0)) { const wDate = getMappedWorkDate(ord.deliveryDate1); if (wDate) d1.push({ date: wDate, cId: c.id, cName: c?.shortName || c?.name || '미지정' }); }
            if (ord?.deliveryDate2 && (ord?.items||[]).some(i => Number(i?.qty2) > 0)) { const wDate = getMappedWorkDate(ord.deliveryDate2); if (wDate) d2.push({ date: wDate, cId: c.id, cName: c?.shortName || c?.name || '미지정' }); }
        });
        return { d1List: d1, d2List: d2 };
    }, [clients, clientOrders, targetMonth, getMappedWorkDate]);

    const TARGET_CATEGORIES = ['쌀', '잡곡', '건어물', '야채', '과일', '버섯', '우유', '김'];

    const matrixRows = useMemo(() => {
        const rowMap = new Map();
        (clientOrders||[]).filter(o => o?.month === targetMonth).forEach(o => {
            const tMap = (mappings||[]).filter(ma => ma?.clientId === o?.clientId).sort((a,b)=>String(b?.month||'').localeCompare(String(a?.month||'')))[0];
            (o?.items||[]).forEach(it => {
                if (Number(it?.qty1) > 0 || Number(it?.qty2) > 0) {
                    const master = (items||[]).find(x => x?.id === it?.itemId);
                    if (master && TARGET_CATEGORIES.includes(master?.category)) {
                        let mItem = tMap?.mappedItems?.find(mi => (it?.mappingUid && mi?.uid === it?.mappingUid) || mi?.itemId === it?.itemId);
                        const unitVal = Number(it?.orderUnit || mItem?.orderUnit || 1);
                        const key = `${it?.itemId}_${unitVal}`;
                        if (!rowMap.has(key)) rowMap.set(key, { key, itemId: it?.itemId, orderUnit: unitVal, master });
                    }
                }
            });
        });
        return Array.from(rowMap.values());
    }, [clientOrders, targetMonth, mappings, items, categorySortOrder]);

    const getQty = useCallback((cId, row, isR1) => {
        const ord = (clientOrders||[]).find(o => o?.clientId === cId && o?.month === targetMonth); if(!ord) return 0;
        const tMap = (mappings||[]).filter(ma => ma?.clientId === cId).sort((a,b)=>String(b?.month||'').localeCompare(String(a?.month||'')))[0];
        let tot = 0;
        (ord?.items||[]).forEach(oi => {
            if (oi?.itemId === row?.itemId) {
                let mItem = tMap?.mappedItems?.find(mi => (oi?.mappingUid && mi?.uid === oi?.mappingUid) || mi?.itemId === oi?.itemId);
                if (Number(oi?.orderUnit || mItem?.orderUnit || 1) === row?.orderUnit) tot += Number(isR1 ? oi?.qty1 : oi?.qty2) || 0;
            }
        });
        return tot;
    }, [clientOrders, targetMonth, mappings]);

    const printPage = () => window.print();

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in">
            <style>{GLOBAL_PRINT_STYLE}</style>
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none">
                <h2 className="text-2xl font-black text-[#E94287] flex items-center gap-3"><Ic.ListP size={28}/> 소분작업 지시서 <span className="text-sm text-slate-500 font-bold ml-2">공무원 제출 및 현장 작업용</span></h2>
                <div className="flex gap-2">
                    <button onClick={printPage} className="bg-gradient-to-r from-[#8b2f97] to-[#E94287] text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"><Ic.Print size={18}/> 인쇄 (PDF 변환)</button>
                </div>
            </div>
            
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-auto">
                <table id="summary-unit-matrix-table" className="min-w-max w-full text-[12.5px] text-center border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-[50] bg-slate-50 shadow-sm">
                        <tr>
                            <th colSpan={3+d1List.length+d2List.length+(d1List.length?1:0)+(d2List.length?1:0)} className="bg-pink-50 text-[#E94287] p-4 text-xl font-black border border-pink-200">{targetMonth}월 보건소별 소분작업 내역</th>
                        </tr>
                        <tr>
                            <th rowSpan="2" className="bg-slate-100 border border-slate-300 px-3 py-2 font-black w-12 min-w-[3rem]">No.</th>
                            <th rowSpan="2" className="bg-slate-100 border border-slate-300 px-4 py-2 font-black min-w-[200px]">마스터 품명</th>
                            {d1List.length>0 && <th colSpan={d1List.length} className="bg-[#29B4E3]/10 border border-cyan-200 py-2 text-[#209bc5] font-black">1차 발주 작업</th>}
                            {d1List.length>0 && <th rowSpan="2" className="bg-[#29B4E3]/20 border border-cyan-200 px-3 min-w-[80px] text-[#1c8ba6] font-black">1차 소계</th>}
                            {d2List.length>0 && <th colSpan={d2List.length} className="bg-[#8b2f97]/10 border border-purple-200 py-2 text-[#8b2f97] font-black">2차 발주 작업</th>}
                            {d2List.length>0 && <th rowSpan="2" className="bg-[#8b2f97]/20 border border-purple-200 px-3 min-w-[80px] text-[#6d2576] font-black">2차 소계</th>}
                            <th rowSpan="2" className="bg-[#E94287]/10 border border-pink-200 px-4 min-w-[90px] text-[#E94287] font-black">총계</th>
                        </tr>
                        <tr>
                            {d1List.map(c => <th key={`h1-${c?.cId}`} className="bg-white border border-slate-300 px-2 py-1.5 min-w-[60px] text-[11px] font-black text-slate-600">{String(c?.cName||'').substring(0,3)}</th>)}
                            {d2List.map(c => <th key={`h2-${c?.cId}`} className="bg-white border border-slate-300 px-2 py-1.5 min-w-[60px] text-[11px] font-black text-slate-600">{String(c?.cName||'').substring(0,3)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {matrixRows.length===0 ? <tr><td colSpan="99" className="py-20 text-slate-400 font-bold text-center">작업 내역이 없습니다.</td></tr> : 
                            matrixRows.map((r, i) => {
                            let t1=0, t2=0; const nm = r?.master?.name;
                            return (
                                <tr key={r?.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                    <td className="border border-slate-300 font-bold text-slate-500 px-2 py-3">{i+1}</td>
                                    <td className="border border-slate-300 font-black text-slate-800 px-4 text-left">{nm}</td>
                                    {d1List.map(c=>{ const v=getQty(c?.cId,r,true); t1+=v; return <td key={`c1-${c?.cId}`} className="border border-slate-300 font-bold px-2 text-slate-600">{v>0?fmt(v):''}</td>; })}
                                    {d1List.length>0 && <td className="bg-[#29B4E3]/10 border border-cyan-200 font-black text-[#209bc5] px-3">{t1>0?fmt(t1):''}</td>}
                                    {d2List.map(c=>{ const v=getQty(c?.cId,r,false); t2+=v; return <td key={`c2-${c?.cId}`} className="border border-slate-300 font-bold px-2 text-slate-600">{v>0?fmt(v):''}</td>; })}
                                    {d2List.length>0 && <td className="bg-[#8b2f97]/10 border border-purple-200 font-black text-[#8b2f97] px-3">{t2>0?fmt(t2):''}</td>}
                                    <td className="bg-[#E94287]/10 border border-pink-200 font-black text-[#E94287] px-4 text-base shadow-inner">{t1+t2>0?fmt(t1+t2):''}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
