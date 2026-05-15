import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const PRINT_STYLE = `
@media print {
  #main-app { display: none !important; }
  .print\\:hidden { display: none !important; }
  .print\\:block { display: block !important; }
  body, html, #root, .fixed, .inset-0 {
    background-color: white !important; background: none !important;
    margin: 0; padding: 0; overflow: visible !important; height: auto !important;
    -webkit-print-color-adjust: exact; color-adjust: exact;
    color: black !important; font-family: 'NanumSquare', sans-serif !important;
  }
  @page { margin: 15mm; size: auto; }
  table { page-break-inside: auto; width: 100% !important; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { white-space: normal !important; word-break: keep-all !important; border: 1px solid black !important; }
  .hp, .hb, .hg, .hr {
    background-color: #f8fafc !important; color: black !important;
    -webkit-print-color-adjust: exact;
  }
}`;

export default function WorkOrderPage() {
  const { st, globalMonth } = useApp();
  const [showPrint, setShowPrint] = useState(false);

  const clients = st.clients || [];
  const items = useMemo(() => Utils.sortItems(st.items || [], st.categorySortOrder || []), [st.items, st.categorySortOrder]);
  const clientOrders = useMemo(() => (st.clientOrders || []).filter(o => o.month === globalMonth), [st.clientOrders, globalMonth]);
  const mappings = st.mappings || [];

  const fmt = (n) => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2}));

  // 1차/2차 보건소 목록 (날짜 있는 것만)
  const d1List = useMemo(() =>
    clientOrders.filter(o => o.deliveryDate1).map(o => ({
      cId: o.clientId,
      cName: clients.find(c => c.id === o.clientId)?.shortName || o.clientId,
      date: o.deliveryDate1,
    })).sort((a,b) => (a.date||'').localeCompare(b.date||'')),
    [clientOrders, clients]
  );
  const d2List = useMemo(() =>
    clientOrders.filter(o => o.deliveryDate2).map(o => ({
      cId: o.clientId,
      cName: clients.find(c => c.id === o.clientId)?.shortName || o.clientId,
      date: o.deliveryDate2,
    })).sort((a,b) => (a.date||'').localeCompare(b.date||'')),
    [clientOrders, clients]
  );

  // 매트릭스 행 (품목별)
  const matrixRows = useMemo(() => {
    const rowMap = {};
    clientOrders.forEach(order => {
      const mapping = mappings.find(m => m.clientId === order.clientId && m.month === globalMonth);
      (order.items || []).forEach(oi => {
        if (!oi.itemId) return;
        const masterItem = items.find(i => i.id === oi.itemId);
        if (!masterItem) return;
        const key = oi.itemId;
        if (!rowMap[key]) rowMap[key] = { key, master: masterItem, orderUnit: oi.orderUnit || 1, d1:{}, d2:{} };
        if (oi.qty1) rowMap[key].d1[order.clientId] = (rowMap[key].d1[order.clientId]||0) + Number(oi.qty1);
        if (oi.qty2) rowMap[key].d2[order.clientId] = (rowMap[key].d2[order.clientId]||0) + Number(oi.qty2);
      });
    });
    return Utils.sortItems(Object.values(rowMap).map(r => ({...r, category:r.master?.category})), st.categorySortOrder||[]);
  }, [clientOrders, items, mappings, globalMonth, st.categorySortOrder]);

  const getQty = (cId, row, is1) => {
    const val = is1 ? row.d1[cId] : row.d2[cId];
    return Number(val) || 0;
  };

  const dlExcel = () => {
    const el = document.getElementById('work-order-matrix-table');
    if (!el) return;
    Utils.dlExcel(
      `<style>table{border-collapse:collapse;font-size:10pt}th,td{border:.5pt solid windowtext;padding:5px;text-align:center}.hp{background-color:#8B208B;color:white;font-size:16pt}.hb{background-color:#d4e6f1}.hg{background-color:#e9f7ef}.hr{background-color:#fce4d6;color:red}.n{mso-number-format:"\\#\\,\\#\\#0"}.tl{text-align:left}</style>` + el.outerHTML,
      `소분작업내역_${globalMonth}`
    );
  };

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div id="main-app" className="space-y-4 max-w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <h1 className="text-xl font-black text-white">소분 지시서 — {globalMonth}</h1>
          <div className="flex gap-2">
            <button onClick={dlExcel} className="btn-secondary flex items-center gap-1.5">{Ic.Down} 엑셀</button>
            <button onClick={() => window.print()} className="btn-primary flex items-center gap-1.5">{Ic.Print2} 인쇄 (PDF)</button>
          </div>
        </div>

        <div className="card overflow-x-auto print:block print:overflow-visible print:shadow-none print:border-none print:bg-white print:p-0">
          <table id="work-order-matrix-table" className="min-w-max w-full text-[12.5px] text-center border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-[50] bg-slate-800 print:bg-slate-50">
              <tr>
                <th colSpan={3 + d1List.length + d2List.length + (d1List.length?1:0) + (d2List.length?1:0)}
                  className="bg-pink-950/50 text-pink-300 p-3 text-lg font-black border border-pink-800 print:bg-pink-50 print:text-pink-700 hp">
                  {globalMonth}월 보건소별 소분작업 내역
                </th>
              </tr>
              <tr>
                <th rowSpan="2" className="bg-slate-700 border border-slate-500 px-3 py-2 font-black w-10 text-slate-200 print:bg-slate-100 print:text-black">No.</th>
                <th rowSpan="2" className="bg-slate-700 border border-slate-500 px-4 py-2 font-black min-w-[180px] text-left text-slate-200 print:bg-slate-100 print:text-black">마스터 품명</th>
                {d1List.length>0 && <th colSpan={d1List.length} className="bg-sky-900/50 border border-sky-700 py-2 text-sky-300 font-black print:bg-blue-50 print:text-blue-800 hb">1차 발주 작업</th>}
                {d1List.length>0 && <th rowSpan="2" className="bg-sky-900/70 border border-sky-600 px-3 min-w-[70px] text-sky-200 font-black print:bg-blue-100 print:text-blue-900 hb">1차 소계</th>}
                {d2List.length>0 && <th colSpan={d2List.length} className="bg-violet-900/50 border border-violet-700 py-2 text-violet-300 font-black print:bg-purple-50 print:text-purple-800 hg">2차 발주 작업</th>}
                {d2List.length>0 && <th rowSpan="2" className="bg-violet-900/70 border border-violet-600 px-3 min-w-[70px] text-violet-200 font-black print:bg-purple-100 print:text-purple-900 hg">2차 소계</th>}
                <th rowSpan="2" className="bg-rose-900/70 border border-rose-600 px-4 min-w-[80px] text-rose-200 font-black print:bg-rose-50 print:text-rose-800 hr">총계</th>
              </tr>
              <tr>
                {d1List.map(c => <th key={`h1-${c.cId}`} className="bg-slate-700 border border-slate-500 px-2 py-1.5 min-w-[55px] text-[11px] font-black text-slate-300 print:bg-slate-100 print:text-slate-700 hb">{c.cName?.substring(0,3)}<br/><span className="text-[10px] font-normal">{c.date?.substring(5)}</span></th>)}
                {d2List.map(c => <th key={`h2-${c.cId}`} className="bg-slate-700 border border-slate-500 px-2 py-1.5 min-w-[55px] text-[11px] font-black text-slate-300 print:bg-slate-100 print:text-slate-700 hg">{c.cName?.substring(0,3)}<br/><span className="text-[10px] font-normal">{c.date?.substring(5)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {matrixRows.length === 0 ? (
                <tr><td colSpan={99} className="py-16 text-slate-500 text-center font-bold">이번달 발주 내역이 없습니다.</td></tr>
              ) : matrixRows.map((row, i) => {
                let t1=0, t2=0;
                return (
                  <tr key={row.key} className="border-b border-slate-700 hover:bg-slate-700/30 print:border-slate-300 print:hover:bg-transparent">
                    <td className="border border-slate-700 font-bold text-slate-400 px-2 py-2 print:border-slate-400 print:text-slate-500">{i+1}</td>
                    <td className="border border-slate-700 font-black text-slate-100 px-4 text-left print:border-slate-400 print:text-slate-800">{row.master?.name}</td>
                    {d1List.map(c => { const v=getQty(c.cId,row,true); t1+=v; return <td key={`c1-${c.cId}`} className="border border-slate-700 font-bold px-2 text-slate-300 print:border-slate-400 print:text-slate-600 n">{v>0?fmt(v):''}</td>; })}
                    {d1List.length>0 && <td className="bg-sky-900/30 border border-sky-700 font-black text-sky-300 px-3 print:bg-blue-50 print:border-blue-300 print:text-blue-800 hb n">{t1>0?fmt(t1):''}</td>}
                    {d2List.map(c => { const v=getQty(c.cId,row,false); t2+=v; return <td key={`c2-${c.cId}`} className="border border-slate-700 font-bold px-2 text-slate-300 print:border-slate-400 print:text-slate-600 n">{v>0?fmt(v):''}</td>; })}
                    {d2List.length>0 && <td className="bg-violet-900/30 border border-violet-700 font-black text-violet-300 px-3 print:bg-purple-50 print:border-purple-300 print:text-purple-800 hg n">{t2>0?fmt(t2):''}</td>}
                    <td className="bg-rose-900/30 border border-rose-700 font-black text-rose-300 px-4 print:bg-rose-50 print:border-rose-300 print:text-rose-800 hr n">{t1+t2>0?fmt(t1+t2):''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
