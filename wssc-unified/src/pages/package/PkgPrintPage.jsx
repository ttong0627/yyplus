import { useState, useMemo, useCallback } from 'react';
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
    th, td { white-space: normal !important; word-break: keep-all !important; }
    .print\\:text-\\[48px\\] { font-size: 48px !important; line-height: 1.2 !important; }
    .print\\:text-\\[60px\\] { font-size: 60px !important; line-height: 1.2 !important; }
    .print\\:text-\\[80px\\] { font-size: 80px !important; line-height: 1.2 !important; }
    .print\\:text-\\[105px\\] { font-size: 105px !important; line-height: 1.15 !important; }
    .print\\:text-\\[126px\\] { font-size: 126px !important; line-height: 1.05 !important; }
    .print\\:py-8 { padding-top: 32px !important; padding-bottom: 32px !important; }
    .print\\:break-after-page { break-after: page !important; }
    .print\\:mb-0 { margin-bottom: 0 !important; }
    .print\\:table-auto { table-layout: auto !important; }
    .print\\:whitespace-normal { white-space: normal !important; }
    .print\\:break-keep { word-break: keep-all !important; }
    .print\\:shadow-none { box-shadow: none !important; }
    .print\\:m-0 { margin: 0 !important; }
    .print\\:p-0 { padding: 0 !important; }
    .print\\:mt-4 { margin-top: 16px !important; }
    .print\\:overflow-visible { overflow: visible !important; }
    .print\\:bg-white { background-color: white !important; }
    .print\\:h-auto { height: auto !important; }
    .print\\:static { position: static !important; }
}`;

export default function PkgPrintPage() {
  const { st, globalMonth } = useApp();
  const [packDate, setPackDate] = useState(Utils.today());
  const [printPreview, setPrintPreview] = useState(null); // { date, clientIds }

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
    if (!deliveryDateStr) return null;
    const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
    if (override) return override.workDate;
    return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

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

  const packClientsForDate = useMemo(() => {
    const activeIds = new Set();
    (st.clientOrders || []).forEach(o => {
      if (!o) return;
      const wd1 = getMappedWorkDate(o?.deliveryDate1);
      const wd2 = getMappedWorkDate(o?.deliveryDate2);
      if (wd1 === packDate || wd2 === packDate) activeIds.add(o.clientId);
    });
    return (st.clients || []).filter(c => c && activeIds.has(c.id)).sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [st.clientOrders, st.clients, packDate, getMappedWorkDate]);

  const packagePrintData = useMemo(() => {
    if (!printPreview) return [];
    const { date, clientIds } = printPreview;
    const targetOrders = (st.clientOrders || []).filter(o =>
      (clientIds || []).includes(o?.clientId) && o?.month === globalMonth &&
      (getMappedWorkDate(o?.deliveryDate1) === date || getMappedWorkDate(o?.deliveryDate2) === date)
    );
    let allPrintPkgs = [];
    targetOrders.forEach(order => {
      const cId = order?.clientId;
      const clientName = (st.clients || []).find(c => c?.id === cId)?.name || '';
      const targetRounds = [];
      if (getMappedWorkDate(order?.deliveryDate1) === date) targetRounds.push(1);
      if (getMappedWorkDate(order?.deliveryDate2) === date) targetRounds.push(2);
      targetRounds.forEach(round => {
        const allPkgs = (st.packageOrders || []).filter(p =>
          p?.clientId === cId && p?.month === globalMonth && (p?.round === round || p?.pkgType === '공통')
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
          const mappedPkgItems = mergedItems.map(it => {
            const mapped = getMappedItem(pkg?.clientId, it?.itemId, it?.mappingUid);
            return {
              ...mapped, qtyPerPerson: it?.qtyPerPerson, note: it?.note,
              isCommon: it?.isCommon,
              printUnit: it?.isManual && it?.manualUnit ? it?.manualUnit : mapped?.unit,
              orderUnit: it?.isManual ? (it?.manualOrderUnit || 1) : (mapped?.orderUnit || 1)
            };
          });
          allPrintPkgs.push({ ...pkg, clientName, workDate: date, round, mappedItems: Utils.sortItems(mappedPkgItems, st.categorySortOrder || []) });
        });
      });
    });
    return allPrintPkgs.sort((a, b) => (a?.clientName || '').localeCompare(b?.clientName || '') || Number(a?.pkgNum || 0) - Number(b?.pkgNum || 0));
  }, [printPreview, st.clientOrders, st.packageOrders, st.clients, st.categorySortOrder, getMappedItem, getMappedWorkDate, globalMonth]);

  const dlPackageExcel = () => {
    if (!packagePrintData.length) return;
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;font-family:'Malgun Gothic',sans-serif;margin-bottom:50px;}th,td{border:2px solid #000;padding:10px;font-size:11pt;vertical-align:middle;white-space:nowrap;text-align:center;}.title{font-size:20pt;font-weight:bold;text-align:center;padding:15px;background-color:#272154;color:#ffffff;}.header-row{background-color:#f1f5f9;font-weight:bold;}.pkg-name{font-size:16pt;font-weight:bold;text-align:left;}.qty-box{font-size:18pt;font-weight:bold;color:#E94287;}.item-name{font-size:14pt;font-weight:bold;text-align:left;}.item-qty{font-size:16pt;font-weight:bold;color:#1d4ed8;}.warning{color:#e11d48;font-weight:bold;text-align:left;background-color:#fff1f2;}</style></head><body>`;
    packagePrintData.forEach(pkg => {
      const dn = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
      html += `<table><tr><td colspan="6" class="title">영양플러스 패키지 작업 지시서</td></tr><tr><td colspan="2" style="text-align:left;font-weight:bold;">작업일자: ${pkg?.workDate || ''}</td><td colspan="4" style="text-align:right;font-weight:bold;">보건소: ${pkg?.clientName || ''}</td></tr><tr><td colspan="4" class="pkg-name">${dn}${pkg?.pkgNote ? ` <span class="warning">[특이사항: ${pkg?.pkgNote}]</span>` : ''}</td><td colspan="2" class="qty-box">제작수량: ${pkg?.personCount || 0}개</td></tr><tr class="header-row"><th>순번</th><th colspan="3">품명 및 작업단위</th><th colspan="2">수량</th></tr>`;
      (pkg?.mappedItems || []).forEach((it, idx) => {
        const wu = Utils.formatWorkUnit(it?.orderUnit, it?.printUnit);
        const itemName = it?.category === '분유' ? '분유' : (it?.name || '');
        html += `<tr><td>${idx + 1}</td><td colspan="3" class="item-name">${itemName} (${wu})</td><td colspan="2" class="item-qty">${it?.qtyPerPerson || ''}</td></tr>`;
      });
      if ((pkg?.mappedItems || []).some(it => it?.note && String(it?.note).trim() !== '')) {
        html += `<tr><td colspan="6" style="text-align:left;font-weight:bold;color:#e11d48;background-color:#fff1f2;">🚨 품목 특이사항<br/>`;
        (pkg?.mappedItems || []).filter(it => it?.note).forEach(it => { html += `• ${it?.name || ''} : ${it?.note}<br/>`; });
        html += `</td></tr>`;
      }
      html += `</table><br style="mso-data-placement:same-cell;"/>`;
    });
    html += `</body></html>`;
    Utils.dlExcel(html, `영플패키지출력_${printPreview?.date}`);
  };

  const PackageDoc = ({ pkg }) => {
    const dn = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
    return (
      <div className="bg-white w-[210mm] max-w-full mx-auto min-h-[296.5mm] h-max shadow-2xl p-[10mm] print:shadow-none print:m-0 print:p-0 shrink-0 text-left box-border flex flex-col relative overflow-hidden print:break-after-page mb-8 print:mb-0 text-black">
        <div className="border-b-4 border-[#272154] pb-2.5 mb-2.5 flex justify-between items-end shrink-0">
          <div className="flex items-center gap-4 whitespace-nowrap shrink-0">
            <div className="w-16 h-12 bg-[#272154] rounded flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">웰쉐어</span>
            </div>
            <div className="text-[18px] font-black text-[#272154] bg-[#272154]/10 px-3 py-1 rounded-lg tracking-wider shrink-0">{pkg?.clientName || ''}</div>
            <h1 className="text-[22px] font-black tracking-tighter text-[#272154] shrink-0">영양플러스 패키지 작업 지시서</h1>
          </div>
          <div className="text-right whitespace-nowrap shrink-0">
            <div className="text-[11px] font-black text-slate-500 mb-0.5">포장 작업일자</div>
            <div className="text-[14px] font-black text-[#E94287]">{pkg?.workDate || ''}</div>
          </div>
        </div>

        <div className="relative flex justify-center items-center bg-slate-50 py-3 px-4 rounded-xl mb-3 border-2 border-[#272154]/20 shrink-0 min-h-[80px]">
          <div className="text-[32px] font-black text-black tracking-tighter flex flex-col items-center justify-center w-full max-w-[65%] text-center">
            <span className="whitespace-nowrap">{dn}</span>
            {pkg?.pkgNote && <span className="text-[12px] text-rose-600 bg-rose-100 px-3 py-1 mt-1.5 rounded-lg border border-rose-200 inline-block leading-tight">🚨 특이사항: {pkg?.pkgNote}</span>}
          </div>
          <div className="absolute right-4 bg-white border-2 border-[#272154] px-5 py-2 rounded-xl text-center shadow-sm whitespace-nowrap shrink-0">
            <div className="text-[10px] font-black text-slate-600 mb-0.5">제작 패키지 수량</div>
            <div className="text-[48px] tracking-tighter font-black text-[#E94287] leading-none">{pkg?.personCount || 0}<span className="text-[16px] text-black ml-1">개</span></div>
          </div>
        </div>

        <table className="w-full text-left border-collapse border-2 border-[#272154] print:table-auto table-fixed shrink-0">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-[#272154]">
              <th className="py-2 px-2 font-black text-[14px] print:text-[48px] print:py-8 w-[10%] text-center border-r border-slate-300">순번</th>
              <th className="py-2 px-4 font-black text-[15px] print:text-[60px] print:py-8 w-[75%] border-r border-slate-300">품명 및 작업단위</th>
              <th className="py-2 px-4 font-black text-[16px] print:text-[60px] print:py-8 text-center w-[15%] text-[#1DBADF] bg-[#1DBADF]/10">수량</th>
            </tr>
          </thead>
          <tbody>
            {(pkg?.mappedItems || []).map((it, idx) => {
              const wu = Utils.formatWorkUnit(it?.orderUnit, it?.printUnit);
              const hasNote = it?.note && String(it?.note).trim() !== '';
              const itemName = it?.category === '분유' ? '분유' : (it?.name || '');
              return (
                <tr key={`print-it-${it?.itemId || idx}`} className="border-b border-slate-300 shrink-0">
                  <td className="py-1.5 px-2 font-bold text-[14px] print:text-[48px] print:py-8 text-slate-500 text-center border-r border-slate-300">{idx + 1}</td>
                  <td className="py-1.5 px-4 font-black text-[26px] print:text-[105px] print:py-8 leading-[1.15] text-black border-r border-slate-300 print:whitespace-normal print:break-keep tracking-tight">
                    {itemName}
                    <span className="text-[16px] print:text-[60px] font-bold text-[#475569] ml-2 align-baseline whitespace-nowrap">({wu})</span>
                    {hasNote && <span className="text-rose-500 ml-1.5 font-black text-[20px] print:text-[80px] align-top">*</span>}
                  </td>
                  <td className="py-1.5 px-4 font-black text-[30px] print:text-[126px] print:py-8 leading-none text-[#1DBADF] text-center bg-[#1DBADF]/5">{Utils.fmt(it?.qtyPerPerson)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(pkg?.mappedItems || []).some(it => it?.note && String(it?.note).trim() !== '') && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl shrink-0 whitespace-normal break-words">
            <h4 className="text-[12px] font-black text-rose-700 mb-1.5">🚨 품목 특이사항</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {(pkg?.mappedItems || []).filter(it => it?.note).map((it, nIdx) => (
                <div key={nIdx} className="text-[11px] font-bold text-rose-800">• <span className="text-[#272154]">{it?.name || ''}</span> : {it?.note}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 flex justify-between items-end shrink-0">
          <div className="text-[9px] font-bold text-slate-500">※ 수량 부족 시 즉시 보고 바랍니다.</div>
          <table className="border-collapse border-2 border-[#272154] w-40 text-center">
            <tbody>
              <tr>
                <th className="border border-slate-400 bg-slate-100 py-1 text-[9px] text-[#272154] font-black w-8" rowSpan="2">확<br/>인</th>
                <th className="border border-slate-400 bg-slate-50 py-0.5 text-[9px] text-slate-700 font-bold">담당자</th>
                <th className="border border-slate-400 bg-slate-50 py-0.5 text-[9px] text-slate-700 font-bold">관리자</th>
              </tr>
              <tr>
                <td className="border border-slate-400 h-7"></td>
                <td className="border border-slate-400 h-7"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (printPreview) {
    return (
      <>
        <style>{PRINT_STYLE}</style>
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto overflow-y-auto whitespace-normal">
          <div className="bg-slate-800 px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              영플패키지출력 <span className="text-sm font-bold text-indigo-300 ml-3 bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-500/30">{printPreview.date}</span>
            </h2>
            <div className="flex gap-3">
              <button onClick={dlPackageExcel} className="btn-secondary text-sm flex items-center gap-1.5">{Ic.Down} 엑셀 다운로드</button>
              <button onClick={() => setTimeout(() => window.print(), 100)} className="btn-primary text-sm flex items-center gap-1.5">{Ic.Print2} A4 공문서 인쇄</button>
              <button onClick={() => setPrintPreview(null)} className="px-4 py-2 bg-slate-700 hover:bg-rose-500 text-white rounded-xl font-black text-sm">닫기</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative text-center">
            {packagePrintData.length === 0 ? (
              <div className="bg-slate-800 max-w-4xl p-20 mx-auto text-center rounded-2xl font-black text-2xl text-slate-400 print:hidden">
                출력할 패키지 데이터가 없습니다.
              </div>
            ) : packagePrintData.map((pkg, pIdx) => (
              <PackageDoc key={`print-pkg-${pkg?.id || pIdx}`} pkg={pkg} />
            ))}
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
          <h1 className="text-xl font-black text-white">영플패키지출력 — {globalMonth}</h1>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl">
            <span className="text-xs font-bold text-slate-400">출력 대상일</span>
            <input type="date" value={packDate} onChange={e => setPackDate(e.target.value)} className="bg-transparent text-white font-black outline-none text-sm" />
          </div>
        </div>

        {packClientsForDate.length === 0 ? (
          <div className="card text-center py-16 text-slate-500">
            <div className="mb-3 flex justify-center">{Ic.Search}</div>
            <p className="font-bold">선택한 날짜({packDate})에 작업이 등록된 보건소가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card bg-indigo-900/20 border-indigo-800/50">
              <div className="flex items-center justify-between">
                <p className="text-indigo-200 font-bold">해당 날짜의 <strong className="text-white">{packClientsForDate.length}개</strong> 보건소 패키지를 모두 인쇄하시겠습니까?</p>
                <button
                  onClick={() => setPrintPreview({ date: packDate, clientIds: packClientsForDate.map(c => c?.id) })}
                  className="btn-primary flex items-center gap-1.5">
                  {Ic.Print2} 전체 보건소 일괄 출력
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packClientsForDate.map(client => {
                const orders = (st.clientOrders || []).filter(o =>
                  o?.clientId === client?.id && o?.month === globalMonth &&
                  (getMappedWorkDate(o?.deliveryDate1) === packDate || getMappedWorkDate(o?.deliveryDate2) === packDate)
                );
                const pkgs = (st.packageOrders || []).filter(p =>
                  p?.clientId === client?.id && p?.month === globalMonth && p?.pkgType !== '공통' &&
                  (orders.some(o => getMappedWorkDate(o?.deliveryDate1) === packDate && p?.round === 1) ||
                   orders.some(o => getMappedWorkDate(o?.deliveryDate2) === packDate && p?.round === 2))
                );
                return (
                  <div key={client?.id} className="card hover:border-indigo-600/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-black text-white text-base">{client?.name}</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">출력 대기 패키지: <span className="font-black text-rose-400">{pkgs.length}개</span></p>
                    <button
                      onClick={() => setPrintPreview({ date: packDate, clientIds: [client.id] })}
                      className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5">
                      {Ic.Print2} 이 보건소만 출력
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
