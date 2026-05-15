import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const GLOBAL_PRINT_STYLE = `
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
    th, td { white-space: normal !important; word-break: keep-all !important; }
    .hp { background-color: #8B208B !important; color: white !important; -webkit-print-color-adjust: exact; }
    .hb { background-color: #d4e6f1 !important; -webkit-print-color-adjust: exact; }
    .hg { background-color: #e9f7ef !important; -webkit-print-color-adjust: exact; }
    .hr { background-color: #fce4d6 !important; color: red !important; -webkit-print-color-adjust: exact; }
}`;

const TARGET_CATEGORIES = ['쌀', '잡곡', '건어물', '야채', '과일', '버섯', '우유', '김'];

export default function PkgMatrixPage() {
  const { st, globalMonth } = useApp();
  const [printModal, setPrintModal] = useState(null); // { title, categories }

  const clientOrders = useMemo(() =>
    (st.clientOrders || []).filter(o => o?.month === globalMonth),
    [st.clientOrders, globalMonth]
  );

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
    if (!deliveryDateStr) return null;
    const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
    if (override) return override.workDate;
    return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

  const { d1List, d2List } = useMemo(() => {
    const d1 = [], d2 = [];
    (st.clients || []).forEach(c => {
      if (!c?.id) return;
      const ord = clientOrders.find(o => o?.clientId === c?.id);
      if (!ord) return;
      if (ord?.deliveryDate1 && (ord?.items || []).some(i => Number(i?.qty1) > 0)) {
        const wd = getMappedWorkDate(ord.deliveryDate1);
        if (wd) d1.push({ date: wd, cId: c.id, cName: c?.shortName || c?.name || '' });
      }
      if (ord?.deliveryDate2 && (ord?.items || []).some(i => Number(i?.qty2) > 0)) {
        const wd = getMappedWorkDate(ord.deliveryDate2);
        if (wd) d2.push({ date: wd, cId: c.id, cName: c?.shortName || c?.name || '' });
      }
    });
    d1.sort((a, b) => a.date.localeCompare(b.date) || a.cName.localeCompare(b.cName));
    d2.sort((a, b) => a.date.localeCompare(b.date) || a.cName.localeCompare(b.cName));
    return { d1List: d1, d2List: d2 };
  }, [st.clients, clientOrders, getMappedWorkDate]);

  const matrixRows = useMemo(() => {
    const rowMap = new Map();
    clientOrders.forEach(o => {
      const tMap = (st.mappings || []).filter(ma => ma?.clientId === o?.clientId)
        .sort((a, b) => String(b?.month || '').localeCompare(String(a?.month || '')))[0];
      (o?.items || []).forEach(it => {
        if (Number(it?.qty1) > 0 || Number(it?.qty2) > 0) {
          const master = (st.items || []).find(x => x?.id === it?.itemId);
          if (master && TARGET_CATEGORIES.includes(master?.category)) {
            const mItem = tMap?.mappedItems?.find(mi => (it?.mappingUid && mi?.uid === it?.mappingUid) || mi?.itemId === it?.itemId);
            const unitVal = Number(it?.orderUnit || mItem?.orderUnit || 1);
            const key = `${it?.itemId}_${unitVal}`;
            if (!rowMap.has(key)) rowMap.set(key, { key, itemId: it?.itemId, orderUnit: unitVal, master });
          }
        }
      });
    });
    return Utils.sortItems(
      Array.from(rowMap.values()).map(r => ({ ...r, category: r.master?.category })),
      st.categorySortOrder || []
    );
  }, [clientOrders, st.mappings, st.items, st.categorySortOrder]);

  const getQty = useCallback((cId, row, isR1) => {
    const ord = clientOrders.find(o => o?.clientId === cId);
    if (!ord) return 0;
    const tMap = (st.mappings || []).filter(ma => ma?.clientId === cId)
      .sort((a, b) => String(b?.month || '').localeCompare(String(a?.month || '')))[0];
    let tot = 0;
    (ord?.items || []).forEach(oi => {
      if (oi?.itemId === row?.itemId) {
        const mItem = tMap?.mappedItems?.find(mi => (oi?.mappingUid && mi?.uid === oi?.mappingUid) || mi?.itemId === oi?.itemId);
        if (Number(oi?.orderUnit || mItem?.orderUnit || 1) === row?.orderUnit) {
          tot += Number(isR1 ? oi?.qty1 : oi?.qty2) || 0;
        }
      }
    });
    return tot;
  }, [clientOrders, st.mappings]);

  const getDisplayName = useCallback((mName, oUnit, mUnit) => {
    const num = Number(oUnit), u = String(mUnit || '').trim(), uL = u.toLowerCase();
    if (!mName) return '';
    let fUnit = ['kg', 'g', 'ml', 'l'].includes(uL)
      ? (num < 1 ? (uL === 'kg' ? `${num * 1000}g` : uL === 'l' ? `${num * 1000}ml` : `${num}${u}`) : `${num}${u}`)
      : (num === 1 ? u : `${u}*${num}`);
    return `${mName} ${fUnit}`.trim();
  }, []);

  const displayMonth = globalMonth.split('-')[1] || '';

  const filteredRows = useMemo(() => {
    if (!printModal?.categories) return matrixRows;
    return matrixRows.filter(r => printModal.categories.includes(r.master?.category));
  }, [matrixRows, printModal]);

  const dlExcel = () => {
    const el = document.getElementById('summary-unit-matrix-table');
    if (!el) return;
    Utils.dlExcel(
      `<style>table{border-collapse:collapse;font-size:10pt}th,td{border:.5pt solid windowtext;padding:5px;text-align:center}.hp{background-color:#8B208B;color:white;font-size:16pt}.hb{background-color:#d4e6f1}.hg{background-color:#e9f7ef}.hr{background-color:#fce4d6;color:red}.n{mso-number-format:"\\#\\,\\#\\#0"}.tl{text-align:left}</style>` + el.outerHTML,
      `소분작업내역_${globalMonth}`
    );
  };

  const MatrixTable = ({ rows, tableId }) => (
    <table id={tableId} className="min-w-max w-full text-[12.5px] text-center border-collapse whitespace-nowrap">
      <thead className="sticky top-0 z-[50] shadow-sm">
        <tr>
          <th colSpan={3 + d1List.length + d2List.length + (d1List.length ? 1 : 0) + (d2List.length ? 1 : 0)}
            className="bg-indigo-900 text-white p-3 text-lg font-black border border-slate-700 hp">
            {displayMonth}월 보건소별 소분작업 내역
          </th>
        </tr>
        <tr>
          <th rowSpan="2" className="bg-slate-700 border border-slate-600 px-3 py-2 font-black text-slate-200 w-10 min-w-[2.5rem]">No.</th>
          <th rowSpan="2" className="bg-slate-700 border border-slate-600 px-4 py-2 font-black text-slate-200 min-w-[180px] text-left">마스터 품명</th>
          {d1List.length > 0 && <th colSpan={d1List.length} className="bg-blue-900/40 border border-slate-600 py-2 text-blue-300 font-black hb">1차 발주 작업</th>}
          {d1List.length > 0 && <th rowSpan="2" className="bg-blue-800/60 border border-slate-600 px-3 min-w-[70px] text-white font-black hb">1차 소계</th>}
          {d2List.length > 0 && <th colSpan={d2List.length} className="bg-emerald-900/40 border border-slate-600 py-2 text-emerald-300 font-black hg">2차 발주 작업</th>}
          {d2List.length > 0 && <th rowSpan="2" className="bg-emerald-800/60 border border-slate-600 px-3 min-w-[70px] text-white font-black hg">2차 소계</th>}
          <th rowSpan="2" className="bg-rose-900/50 border border-slate-600 px-4 min-w-[80px] text-rose-300 font-black hr">총계</th>
        </tr>
        <tr>
          {d1List.map(c => (
            <th key={`h1-${c.cId}`} className="bg-blue-900/20 border border-slate-600 px-2 py-1.5 min-w-[55px] text-[11px] font-black text-slate-300 hb">
              {c.cName.substring(0, 3)}<br/><span className="text-[9px] font-normal text-slate-400">({c.date.substring(5)})</span>
            </th>
          ))}
          {d2List.map(c => (
            <th key={`h2-${c.cId}`} className="bg-emerald-900/20 border border-slate-600 px-2 py-1.5 min-w-[55px] text-[11px] font-black text-slate-300 hg">
              {c.cName.substring(0, 3)}<br/><span className="text-[9px] font-normal text-slate-400">({c.date.substring(5)})</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-slate-800">
        {rows.length === 0 ? (
          <tr><td colSpan="99" className="py-16 text-slate-500 font-bold text-center">해당 월에 발주된 지정 품목 내역이 없습니다.</td></tr>
        ) : rows.map((r, i) => {
          let t1 = 0, t2 = 0;
          const nm = getDisplayName(r?.master?.name, r?.orderUnit, r?.master?.unit);
          return (
            <tr key={r.key} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
              <td className="border border-slate-700 font-bold text-slate-400 px-2 py-2">{i + 1}</td>
              <td className="border border-slate-700 font-black text-slate-200 px-4 text-left tl">{nm}</td>
              {d1List.map(c => { const v = getQty(c.cId, r, true); t1 += v; return <td key={`c1-${c.cId}`} className="border border-slate-700 font-bold px-2 text-right n text-slate-300">{v > 0 ? Utils.fmt(v) : ''}</td>; })}
              {d1List.length > 0 && <td className="bg-blue-900/20 border border-slate-700 font-black text-blue-400 text-right px-3 n hb">{t1 > 0 ? Utils.fmt(t1) : ''}</td>}
              {d2List.map(c => { const v = getQty(c.cId, r, false); t2 += v; return <td key={`c2-${c.cId}`} className="border border-slate-700 font-bold px-2 text-right n text-slate-300">{v > 0 ? Utils.fmt(v) : ''}</td>; })}
              {d2List.length > 0 && <td className="bg-emerald-900/20 border border-slate-700 font-black text-emerald-400 text-right px-3 n hg">{t2 > 0 ? Utils.fmt(t2) : ''}</td>}
              <td className="bg-rose-900/20 border border-slate-700 font-black text-rose-400 px-4 text-right n hr">{t1 + t2 > 0 ? Utils.fmt(t1 + t2) : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <style>{GLOBAL_PRINT_STYLE}</style>

      {/* 인쇄 모달 */}
      {printModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto overflow-y-auto whitespace-normal">
          <div className="bg-slate-800 px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
            <h2 className="text-2xl font-black text-white">{printModal.title}</h2>
            <div className="flex gap-3">
              <button onClick={() => Utils.dlExcel(
                `<style>table{border-collapse:collapse;font-size:10pt}th,td{border:.5pt solid windowtext;padding:5px;text-align:center}.hp{background-color:#8B208B;color:white;font-size:16pt}.hb{background-color:#d4e6f1}.hg{background-color:#e9f7ef}.hr{background-color:#fce4d6;color:red}.n{mso-number-format:"\\#\\,\\#\\#0"}.tl{text-align:left}</style>` + document.getElementById('print-matrix-table').outerHTML,
                printModal.title
              )} className="btn-secondary text-sm flex items-center gap-1.5">
                {Ic.Down} 엑셀
              </button>
              <button onClick={() => setTimeout(() => window.print(), 100)} className="btn-primary text-sm flex items-center gap-1.5">
                {Ic.Print2} 인쇄
              </button>
              <button onClick={() => setPrintModal(null)} className="px-4 py-2 bg-slate-700 hover:bg-rose-500 text-white rounded-xl font-black text-sm">닫기</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 print:p-0 print:block print:overflow-visible">
            <MatrixTable rows={filteredRows} tableId="print-matrix-table" />
          </div>
        </div>
      )}

      <div id="main-app" className="space-y-4 max-w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <h1 className="text-xl font-black text-white">소분작업내역 — {globalMonth}</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPrintModal({ title: '전체 소분작업내역', categories: null })} className="btn-secondary text-xs flex items-center gap-1">{Ic.Print2} 전체 인쇄</button>
            <button onClick={() => setPrintModal({ title: '쌀, 잡곡 소분작업내역', categories: ['쌀', '잡곡', '건어물', '김'] })} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1">{Ic.Down} 쌀, 잡곡</button>
            <button onClick={() => setPrintModal({ title: '야채, 과일 소분작업내역', categories: ['야채', '과일', '버섯', '우유'] })} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1">{Ic.Down} 야채, 과일</button>
            <button onClick={dlExcel} className="btn-secondary text-xs flex items-center gap-1">{Ic.Down} 엑셀</button>
          </div>
        </div>

        <div className="card overflow-x-auto print:block print:overflow-visible print:shadow-none print:border-none">
          <MatrixTable rows={matrixRows} tableId="summary-unit-matrix-table" />
        </div>
      </div>
    </>
  );
}
