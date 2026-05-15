import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const PRINT_STYLE = `
@media print {
    #main-app { display: none !important; }
    .print\\:hidden { display: none !important; }
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
    .print\\:text-\\[24px\\] { font-size: 24px !important; }
    .print\\:text-\\[48px\\] { font-size: 48px !important; }
}`;

export default function PkgPickingPage() {
  const { st, globalMonth } = useApp();
  const [searchParams] = useSearchParams();
  const [workDate, setWorkDate] = useState(searchParams.get('date') || Utils.calculateWorkDate(Utils.today()) || Utils.today());
  const [showPrint, setShowPrint] = useState(false);

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
    if (!deliveryDateStr) return null;
    const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
    if (override) return override.workDate;
    return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

  const ordersToWork = useMemo(() => {
    const result = [];
    (st.clientOrders || []).forEach(o => {
      if (!o) return;
      const wd1 = getMappedWorkDate(o?.deliveryDate1);
      const wd2 = getMappedWorkDate(o?.deliveryDate2);
      if (wd1 === workDate) result.push({ ...o, targetRound: 1 });
      if (wd2 === workDate) result.push({ ...o, targetRound: 2 });
    });
    return result;
  }, [st.clientOrders, workDate, getMappedWorkDate]);

  const getMappedItem = useCallback((clientId, itemId, mappingUid = null) => {
    const masterItem = (st.items || []).find(i => i?.id === itemId) || {};
    const clientMap = (st.mappings || []).find(m => m?.clientId === clientId && m?.month === globalMonth)
      || (st.mappings || []).find(m => m?.clientId === clientId);
    let mapped = null;
    if (clientMap) {
      if (mappingUid) mapped = (clientMap.mappedItems || []).find(m => m?.uid === mappingUid);
      if (!mapped) mapped = (clientMap.mappedItems || []).find(m => m?.itemId === itemId);
    }
    return {
      itemId, mappingUid: mapped?.uid || mappingUid,
      category: masterItem?.category || '미분류',
      name: mapped?.clientItemName || masterItem?.name || '알수없는 품목',
      unit: masterItem?.unit || '',
      orderUnit: mapped?.orderUnit || 1
    };
  }, [st.items, st.mappings, globalMonth]);

  const validPkgs = useMemo(() => {
    const result = [];
    ordersToWork.forEach(orderInfo => {
      const allPkgs = (st.packageOrders || []).filter(p =>
        p?.clientId === orderInfo?.clientId && p?.month === globalMonth &&
        (p?.round === orderInfo?.targetRound || p?.pkgType === '공통')
      );
      const normalPkgs = allPkgs.filter(p => p?.pkgType !== '공통');
      const common23 = allPkgs.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
      const common46 = allPkgs.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');

      normalPkgs.forEach(pkg => {
        let mergedItems = [...(pkg?.items || [])];
        const dn = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
        if (!String(dn).startsWith('4-1')) {
          if ((pkg?.pkgNum === 2 || pkg?.pkgNum === 3) && common23)
            (common23.items || []).forEach(cit => mergedItems.push({ ...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true }));
          else if (pkg?.pkgNum >= 4 && pkg?.pkgNum <= 6 && common46)
            (common46.items || []).forEach(cit => mergedItems.push({ ...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true }));
        }
        result.push({ ...pkg, items: mergedItems });
      });
    });
    return result;
  }, [ordersToWork, st.packageOrders, globalMonth]);

  const pickingList = useMemo(() => {
    const agg = {};
    validPkgs.forEach(pkg => {
      (pkg?.items || []).forEach(it => {
        const qty = Number(it?.qtyPerPerson) * Number(pkg?.personCount);
        if (qty > 0) {
          const aggKey = it?.isManual ? `${it?.itemId}_MANUAL` : (it?.mappingUid || it?.itemId);
          if (!agg[aggKey]) {
            const masterInfo = (st.items || []).find(i => i?.id === it?.itemId) || {};
            const mappedInfo = getMappedItem(pkg?.clientId, it?.itemId, it?.mappingUid);
            const supplierName = (st.suppliers || []).find(s => s?.id === masterInfo?.supplierId)?.name || '';
            agg[aggKey] = {
              itemId: it?.itemId, mappingUid: it?.mappingUid,
              category: mappedInfo?.category || '미분류',
              name: masterInfo?.name || mappedInfo?.name || '알수없음',
              unit: it?.isManual && it?.manualUnit ? it?.manualUnit : (mappedInfo?.unit || ''),
              orderUnit: it?.isManual ? (it?.manualOrderUnit || 1) : (mappedInfo?.orderUnit || 1),
              boxQuantity: masterInfo?.boxQuantity || 1,
              supplierName, totalQty: 0, itemNotes: new Set()
            };
          }
          agg[aggKey].totalQty += qty;
          if (it?.note) agg[aggKey].itemNotes.add(it.note);
        }
      });
    });
    return Utils.sortItems(
      Object.values(agg).map(a => ({ ...a, itemNotesStr: Array.from(a?.itemNotes || []).join(', ') })),
      st.categorySortOrder || []
    );
  }, [validPkgs, st.items, st.suppliers, st.categorySortOrder, getMappedItem]);

  const activeClients = useMemo(() =>
    Array.from(new Set(ordersToWork.map(o => (st.clients || []).find(c => c?.id === o?.clientId)?.shortName || ''))).filter(Boolean).join(', '),
    [ordersToWork, st.clients]
  );

  const pkgNotes = useMemo(() => {
    const notes = [];
    validPkgs.forEach(pkg => {
      if (pkg?.pkgNote) {
        const cName = (st.clients || []).find(c => c?.id === pkg?.clientId)?.shortName || '';
        notes.push(`[${cName}] ${pkg?.pkgGroup} ${pkg?.pkgType === '일반' ? pkg?.pkgNum + '패키지' : pkg?.pkgNum + '-' + pkg?.pkgType} : ${pkg?.pkgNote}`);
      }
    });
    return notes;
  }, [validPkgs, st.clients]);

  const dlPickingExcel = () => {
    if (!pickingList.length) return;
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;font-family:'Malgun Gothic',sans-serif;}th,td{border:1px solid #000;padding:10px;font-size:11pt;vertical-align:middle;white-space:nowrap;text-align:center;}.header{background-color:#f1f5f9;font-weight:bold;}.title{font-size:24pt;font-weight:bold;text-align:center;padding:20px;background-color:#272154;color:#ffffff;}.sub-title{font-size:12pt;font-weight:bold;text-align:left;padding:10px;background-color:#f8fafc;}.warning{color:#e11d48;font-weight:bold;text-align:left;}.qty{font-weight:bold;color:#1d4ed8;}.box-qty{font-weight:bold;color:#047857;background-color:#ecfdf5;}</style></head><body>`;
    html += `<table><tr><td colspan="7" class="title">영플패킹지시서</td></tr><tr><td colspan="2" class="sub-title">작업일자: ${workDate}</td><td colspan="5" class="sub-title">대상 보건소: ${activeClients || '없음'}</td></tr>`;
    if (pkgNotes.length > 0) html += `<tr><td colspan="7" class="warning">🚨 금일 패키지 특이사항 (필독)<br/>${pkgNotes.join('<br/>')}</td></tr>`;
    html += `<tr class="header"><th>순번</th><th>품목명</th><th>작업단위</th><th>수량</th><th>박스수량</th><th>거래처</th><th>특이사항(품목)</th></tr>`;
    pickingList.forEach((it, idx) => {
      const boxQty = (it?.totalQty / (it?.boxQuantity || 1)).toFixed(1).replace('.0', '');
      const wu = Utils.formatWorkUnit(it?.orderUnit, it?.unit);
      html += `<tr><td>${idx + 1}</td><td style="text-align:left;font-weight:bold;">${it?.name || ''}</td><td style="font-weight:bold;color:#475569;">${wu}</td><td class="qty">${Utils.fmt(it?.totalQty)}</td><td class="box-qty">${boxQty} 박스</td><td>${it?.supplierName || ''}</td><td style="text-align:left;">${it?.itemNotesStr || ''}</td></tr>`;
    });
    html += `</table></body></html>`;
    Utils.dlExcel(html, `영플패킹지시서_${workDate}`);
  };

  const PickingDoc = () => (
    <div className="bg-white max-w-[21cm] w-[210mm] mx-auto min-h-[296.5mm] h-max shadow-2xl p-[10mm] print:shadow-none print:m-0 print:border-none print:p-[10mm] flex flex-col shrink-0 text-left box-border text-black relative">
      <div className="text-center mb-4 border-b-4 border-[#272154] pb-3 shrink-0">
        <h1 className="text-[2rem] font-black tracking-widest text-[#272154] mb-3">영플패킹지시서</h1>
        <div className="flex justify-between items-end">
          <div className="text-left"><p className="text-xs font-black text-slate-500 mb-0.5">작업일자</p><p className="text-lg font-black text-[#E94287]">{workDate}</p></div>
          <div className="text-right"><p className="text-xs font-black text-slate-500 mb-0.5">대상 보건소</p><p className="text-sm font-black text-[#272154] max-w-[400px] leading-tight">{activeClients || '지정되지 않음'}</p></div>
        </div>
      </div>

      {pkgNotes.length > 0 && (
        <div className="mb-3 border-2 border-rose-500 p-2 rounded-lg bg-rose-50 shrink-0">
          <h4 className="text-rose-700 font-black text-[11px] mb-1 flex items-center gap-1.5">
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px]">필독</span> 금일 패키지 특이사항
          </h4>
          <div className="space-y-0.5 pl-2">
            {pkgNotes.map((note, i) => <div key={i} className="text-[10px] font-bold text-rose-800">• {note}</div>)}
          </div>
        </div>
      )}

      <table className="w-full text-center border-collapse border-2 border-[#272154] shrink-0 print:table-auto table-fixed">
        <thead>
          <tr className="bg-slate-100 text-[#272154]">
            <th className="border border-slate-400 py-1.5 px-1 font-black text-[11px] w-[6%]">순번</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[30%]">품목명</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[12%]">작업단위</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[10%]">수량</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[12%]">박스수량</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[14%]">거래처</th>
            <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[16%]">특이사항(품목)</th>
          </tr>
        </thead>
        <tbody>
          {pickingList.length === 0 ? (
            <tr><td colSpan="7" className="py-20 text-slate-400 font-bold">데이터가 없습니다.</td></tr>
          ) : pickingList.map((it, idx) => {
            const boxQty = (it?.totalQty / (it?.boxQuantity || 1)).toFixed(1).replace('.0', '');
            const wu = Utils.formatWorkUnit(it?.orderUnit, it?.unit);
            return (
              <tr key={`print-pick-${it?.itemId || idx}`} className="border-b border-slate-300">
                <td className="p-4 border-r border-slate-300 font-bold text-slate-600">{idx + 1}</td>
                <td className="p-4 border-r border-slate-300 font-black text-left text-[#272154] text-[15px] print:whitespace-normal print:break-all">{it?.name || '미지정'}</td>
                <td className="p-4 border-r border-slate-300 font-black text-[13px] text-slate-600 bg-slate-50/50">{wu}</td>
                <td className="p-4 border-r border-slate-300 font-black text-[18px] text-blue-700 bg-blue-50/30">{Utils.fmt(it?.totalQty)}</td>
                <td className="p-4 border-r border-slate-300 font-black text-[14px] text-emerald-700 bg-emerald-50/50">{boxQty} 박스</td>
                <td className="p-4 border-r border-slate-300 font-bold text-slate-700 print:whitespace-normal print:break-all">{it?.supplierName || ''}</td>
                <td className="p-4 font-bold text-rose-600 text-left whitespace-normal break-words">{it?.itemNotesStr || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-auto print:mt-4 pt-4 flex justify-between items-end shrink-0">
        <div className="text-[10px] font-bold text-slate-500">※ 박스 수량은 마스터 입수량 기준의 참조용 수치입니다.</div>
        <table className="border-collapse border-2 border-[#272154] w-48 text-center">
          <tbody>
            <tr>
              <th className="border border-slate-400 bg-slate-100 py-1 text-[10px] text-[#272154] font-black w-8" rowSpan="2">확<br/>인</th>
              <th className="border border-slate-400 bg-slate-50 py-0.5 text-[10px] text-slate-700 font-bold">담당자</th>
              <th className="border border-slate-400 bg-slate-50 py-0.5 text-[10px] text-slate-700 font-bold">관리자</th>
            </tr>
            <tr>
              <td className="border border-slate-400 h-8"></td>
              <td className="border border-slate-400 h-8"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  if (showPrint) {
    return (
      <>
        <style>{PRINT_STYLE}</style>
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto overflow-y-auto whitespace-normal">
          <div className="bg-slate-800 px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              영플패킹지시서 <span className="text-sm font-bold text-indigo-300 ml-3 bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-500/30">{workDate}</span>
            </h2>
            <div className="flex gap-3">
              <button onClick={dlPickingExcel} className="btn-secondary text-sm flex items-center gap-1.5">{Ic.Down} 엑셀 다운로드</button>
              <button onClick={() => setTimeout(() => window.print(), 100)} className="btn-primary text-sm flex items-center gap-1.5">{Ic.Print2} 명세서 인쇄</button>
              <button onClick={() => setShowPrint(false)} className="px-4 py-2 bg-slate-700 hover:bg-rose-500 text-white rounded-xl font-black text-sm">닫기</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative text-center">
            <PickingDoc />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div id="main-app" className="space-y-4 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-black text-white">영플패킹지시서</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl">
              <span className="text-xs font-bold text-slate-400">작업일자</span>
              <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} className="bg-transparent text-white font-black outline-none text-sm" />
            </div>
            <button onClick={dlPickingExcel} className="btn-secondary text-sm flex items-center gap-1.5">{Ic.Down} 엑셀</button>
            <button onClick={() => setShowPrint(true)} className="btn-primary text-sm flex items-center gap-1.5">{Ic.Print2} 인쇄 미리보기</button>
          </div>
        </div>

        {ordersToWork.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-sm">
            <span className="text-slate-400 font-bold">대상 보건소:</span>
            <span className="text-white font-black">{activeClients || '없음'}</span>
          </div>
        )}

        {pkgNotes.length > 0 && (
          <div className="bg-rose-900/20 border border-rose-700/50 p-4 rounded-xl">
            <h4 className="text-rose-400 font-black text-sm mb-2 flex items-center gap-2">
              <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-xs">필독</span> 금일 패키지 특이사항
            </h4>
            {pkgNotes.map((n, i) => <div key={i} className="text-sm font-bold text-rose-300 mt-1">🚨 {n}</div>)}
          </div>
        )}

        <div className="card overflow-x-auto">
          {pickingList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="mb-3">{Ic.Search}</div>
              <p className="font-bold">해당 작업일({workDate})의 피킹 데이터가 없습니다.</p>
              <p className="text-xs mt-1 text-slate-600">작업일정 캘린더에서 날짜를 선택하거나 직접 날짜를 입력하세요.</p>
            </div>
          ) : (
            <table className="table-base text-xs w-full">
              <thead>
                <tr>
                  <th className="w-12">순번</th>
                  <th className="text-left">품목명</th>
                  <th>작업단위</th>
                  <th className="text-right">수량</th>
                  <th className="text-right">박스수량</th>
                  <th>거래처</th>
                  <th className="text-left">특이사항</th>
                </tr>
              </thead>
              <tbody>
                {pickingList.map((it, idx) => {
                  const boxQty = (it?.totalQty / (it?.boxQuantity || 1)).toFixed(1).replace('.0', '');
                  const wu = Utils.formatWorkUnit(it?.orderUnit, it?.unit);
                  return (
                    <tr key={it?.itemId || idx}>
                      <td className="text-center text-slate-400">{idx + 1}</td>
                      <td className="font-black text-white">{it?.name}</td>
                      <td className="text-center text-slate-300">{wu}</td>
                      <td className="text-right font-black text-blue-400">{Utils.fmt(it?.totalQty)}</td>
                      <td className="text-right text-emerald-400 font-bold">{boxQty} 박스</td>
                      <td className="text-slate-400">{it?.supplierName}</td>
                      <td className="text-rose-400 font-bold text-left">{it?.itemNotesStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
