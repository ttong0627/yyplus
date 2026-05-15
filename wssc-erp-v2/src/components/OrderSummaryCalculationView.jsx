import React, { useState, useMemo } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';
import { NumInp } from './shared.jsx';

export const OrderSummaryCalculationView = ({ clients=[], items=[], suppliers=[], clientOrders=[], lossRates={}, setLossRates, itemLossRates={}, setItemLossRates, sortOrder=[], weekMappings={}, clientItemMappings={}, toast, isLog }) => {
  const [sM, setSM] = useState(new Date().toISOString().slice(0, 7));
  const [sW, setSW] = useState('all');
  const [vIt, setVIt] = useState(null), [irV, setIrV] = useState('');

  const dCo = useMemo(() => clientOrders.filter(o => o.targetMonth === sM && (sW === 'all' || o.targetWeek === sW)), [clientOrders, sM, sW]);
  
  const cal = useMemo(() => {
    const res = {};
    dCo.forEach(o => {
        const clId = o.clientId;
        const cMObj = clientItemMappings.find(m => m.clientId === clId) || { items: [] };
        o.items.forEach(it => {
            if (!res[it.itemId]) res[it.itemId] = { rawPieces: 0, byClient: {}, neededBoxes: 0, basicBox: 0 };
            const qty = it.qty || 0;
            res[it.itemId].rawPieces += qty;
            if (!res[it.itemId].byClient[clId]) res[it.itemId].byClient[clId] = 0;
            res[it.itemId].byClient[clId] += qty;
        });
    });
    const final = Object.keys(res).map(itId => {
        const mit = items.find(x => x.id === itId) || { name: '알수없음', category: '미분류', boxQuantity: 1, unitPrice: 0 };
        const d = res[itId], raw = d.rawPieces, bq = mit.boxQuantity || 1;
        const lg = Utils.getLossGroup(mit, lossRates);
        const lRate = itemLossRates[itId] !== undefined ? itemLossRates[itId] : (lg ? lossRates[lg] : 0);
        const lPieces = Math.ceil(raw * (lRate / 100));
        const finalPieces = raw + lPieces;
        const boxes = Math.ceil(finalPieces / bq);
        const amt = boxes * (mit.unitPrice || 0);
        return { id: itId, ms: mit, rawPieces: raw, lossPieces: lPieces, neededBoxes: boxes, basicBox: Math.ceil(raw / bq), amount: amt, byClient: d.byClient, lRate, lg };
    });
    return Utils.sortItems(final.map(x=>({...x, category: x.ms.category})), sortOrder);
  }, [dCo, items, lossRates, itemLossRates, sortOrder, clientItemMappings]);

  const tAmt = cal.reduce((a, b) => a + b.amount, 0);

  const dlEx = () => {
      let h = `<table><thead><tr><th colspan="8" class="hdr">${sM} ${sW==='all'?'월 전체':sW+'주차'} AI 발주 집계</th></tr><tr><th class="bg-g">순번</th><th class="bg-g">분류</th><th class="bg-g">품명</th><th class="bg-g">단위</th><th class="bg-g">입수</th><th class="bg-y">원수량(낱개)</th><th class="bg-b">로스율(%)</th><th class="bg-gr">최종발주(Box)</th></tr></thead><tbody>`;
      cal.forEach((it, idx) => { h += `<tr><td>${idx+1}</td><td>${it.ms.category}</td><td class="l fw-b">${it.ms.name}</td><td>${it.ms.unit}</td><td class="num">${it.ms.boxQuantity||1}</td><td class="num t-b">${it.rawPieces}</td><td class="num t-r">${it.lRate}</td><td class="num t-b fw-b bg-gr">${it.neededBoxes}</td></tr>`; });
      h += `<tr><th colspan="7">총 발주 수량</th><th class="num t-b fw-b">${cal.reduce((a,b)=>a+b.neededBoxes,0)} Box</th></tr></tbody></table>`;
      Utils.dlExcelCustom(h, `AI발주집계_${sM}_${sW}`);
  };

  const dlBySup = () => {
      const bySup = {};
      cal.forEach(it => { const sId = it.ms.supplierId; if(!sId) return; if(!bySup[sId]) bySup[sId] = []; bySup[sId].push(it); });
      let h = `<table><thead><tr><th colspan="7" class="hdr">${sM} ${sW==='all'?'월 전체':sW+'주차'} 거래처별 발주서</th></tr>`;
      Object.keys(bySup).forEach(sId => {
          const sName = suppliers.find(s=>s.id===sId)?.name || '알수없음';
          h += `<tr><th colspan="7" style="background:#8b2f97; color:white; font-size:14pt; padding:8px;">[거래처] ${sName}</th></tr>`;
          h += `<tr><th class="bg-g">품명</th><th class="bg-g">단위</th><th class="bg-g">입수</th><th class="bg-y">원수량(낱개)</th><th class="bg-b">로스율(%)</th><th class="bg-gr">최종발주(Box)</th><th class="bg-r">금액</th></tr>`;
          let stAmt = 0;
          bySup[sId].forEach(it => { stAmt += it.amount; h += `<tr><td class="l fw-b">${it.ms.name}</td><td>${it.ms.unit}</td><td class="num">${it.ms.boxQuantity||1}</td><td class="num t-b">${it.rawPieces}</td><td class="num t-r">${it.lRate}</td><td class="num t-b fw-b bg-gr">${it.neededBoxes}</td><td class="num r fw-b">${it.amount}</td></tr>`; });
          h += `<tr><th colspan="6" style="text-align:right;">${sName} 총계</th><th class="num r fw-b" style="background:#fce4d6;">${stAmt}</th></tr>`;
      });
      h += `</tbody></table>`;
      Utils.dlExcelCustom(h, `거래처별_발주서_${sM}_${sW}`);
  };

  const handleIrSave = () => {
    if(!isLog) return toast('로그인 필요');
    const v = parseInt(irV, 10);
    if(isNaN(v)) {
        const n = {...itemLossRates}; delete n[vIt.id];
        setItemLossRates(n); toast('개별 로스율 해제됨');
    } else {
        setItemLossRates({...itemLossRates, [vIt.id]: v}); toast('개별 로스율 적용됨');
    }
    setVIt(null);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0"><div className="flex justify-between items-end mb-2 flex-none"><div><h2 className="text-2xl font-bold flex items-center gap-2"><Ic.ListP size={28} className="text-blue-600"/> AI 발주 자동 집계</h2><p className="text-[11px] text-gray-500 mt-1">접수된 발주 내역을 모아 로스율을 적용하고 최종 박스 수량을 산출합니다.</p></div><div className="flex gap-2 items-center"><select value={sW} onChange={e=>setSW(e.target.value==='all'?'all':parseInt(e.target.value, 10))} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm text-blue-700 shadow-sm outline-none focus:border-blue-500 cursor-pointer"><option value="all">월 전체 합산</option><option value="1">1주차만 합산</option><option value="2">2주차만 합산</option><option value="3">3주차만 합산</option><option value="4">4주차만 합산</option></select><input type="month" value={sM} onChange={e => setSM(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm text-blue-700 shadow-sm outline-none focus:border-blue-500 cursor-pointer" /><button onClick={dlEx} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-black hover:bg-green-100 transition-colors shadow-sm flex items-center gap-1"><Ic.File size={16}/> 집계 엑셀출력</button><button onClick={dlBySup} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black hover:bg-purple-100 transition-colors shadow-sm flex items-center gap-1"><Ic.File size={16}/> 거래처별 발주서 분리출력</button></div></div>
      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0"><div className="w-full xl:w-80 bg-white p-5 rounded-3xl border shadow-sm flex flex-col flex-none min-h-0"><h3 className="font-black text-sm text-slate-800 mb-4 border-b pb-3 flex items-center gap-2"><Ic.Settings size={18} className="text-blue-500"/> 기본 로스율 세팅 <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold ml-auto border">전역설정</span></h3><div className="overflow-y-auto flex-1 pr-2 scrollbar-hide space-y-3">{Object.keys(lossRates).map(k => (<div key={k} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center hover:border-blue-200 transition-colors group"><div className="font-black text-xs text-slate-700">{k} <span className="text-[10px] text-slate-400 font-bold ml-1">기본치</span></div><div className="flex items-center gap-2"><NumInp v={lossRates[k]} setV={v => { if(!isLog) return toast('로그인 필요'); setLossRates({...lossRates, [k]: v||0}) }} cls="w-14 text-center border-blue-200 focus:border-blue-500 rounded bg-white font-black text-blue-700 shadow-inner group-hover:border-blue-300" /><span className="text-xs font-black text-slate-400">%</span></div></div>))}</div><div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-500 font-bold leading-relaxed bg-slate-50 p-4 rounded-xl"><Ic.Alert size={14} className="inline mr-1 text-blue-500 -mt-0.5" />이 곳에서 설정한 기본 로스율은 그룹에 속한 모든 품목에 일괄 적용됩니다. 우측 표에서 개별 품목을 클릭하면 예외 로스율을 적용할 수 있습니다.</div></div>
      
      <div className="flex-1 bg-white p-6 rounded-3xl border shadow-sm flex flex-col min-h-0 relative">
          <div className="flex justify-between items-center mb-6 flex-none"><div className="flex items-center gap-3"><h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><span className="text-blue-600">{sM} {sW==='all'?'전체':sW+'주차'}</span> 자동 산출 결과 <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold border ml-2">{cal.length}품목</span></h3></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 예상 금액</p><h4 className="text-2xl font-black text-rose-500">{Utils.fmt(tAmt)}<span className="text-sm font-bold text-slate-400 ml-1">원</span></h4></div></div>
          
          <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0"><div className="flex-1 overflow-y-auto scrollbar-hide"><table className="w-full text-center text-[10px] table-fixed"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10 text-slate-600"><tr><th className="p-3 w-[8%] border-r font-bold">순번</th><th className="p-3 w-[12%] border-r font-bold">분류</th><th className="p-3 w-[25%] text-left px-4 border-r font-bold">마스터 품명</th><th className="p-3 w-[8%] border-r font-bold">입수</th><th className="p-3 w-[10%] text-blue-700 bg-blue-50 border-r font-bold">원수량</th><th className="p-3 w-[10%] text-orange-600 bg-orange-50 border-r font-bold">기본로스율</th><th className="p-3 w-[12%] text-indigo-700 bg-indigo-50 border-r font-bold">최종발주(Box)</th><th className="p-3 w-[15%] text-right px-4 font-bold">예상 금액</th></tr></thead><tbody className="divide-y divide-slate-100">{cal.length === 0 ? <tr><td colSpan="8" className="p-20 text-center text-slate-400 font-bold bg-slate-50">해당 조건의 발주 내역이 없습니다.</td></tr> : cal.map((it, idx) => {
              const hasCustom = itemLossRates[it.id] !== undefined;
              return (<tr key={it.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setVIt(it)}><td className="p-3 border-r font-bold text-slate-400">{idx + 1}</td><td className="p-3 border-r font-black text-slate-600">{it.ms.category}</td><td className="p-3 text-left px-4 border-r font-black text-slate-800 break-words">{it.ms.name} <span className="text-[10px] text-slate-400 ml-1">({it.ms.unit})</span></td><td className="p-3 border-r font-bold text-slate-500">{it.ms.boxQuantity || 1}</td><td className="p-3 border-r font-black text-blue-600">{Utils.fmt(it.rawPieces)}<span className="text-[9px] text-slate-400 font-bold ml-1">({it.basicBox}Box)</span></td><td className="p-3 border-r font-black text-orange-500">{hasCustom ? <span className="text-white bg-orange-500 px-1.5 py-0.5 rounded shadow-sm">{it.lRate}%</span> : `${it.lRate}%`}</td><td className="p-3 border-r font-black text-indigo-600 text-sm bg-indigo-50/20">{Utils.fmt(it.neededBoxes)}</td><td className="p-3 text-right px-4 font-black text-rose-500">{Utils.fmt(it.amount)}</td></tr>);
          })}</tbody></table></div></div>
      </div></div>
      
      {vIt && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-4xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem] pr-16"><div><h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.Edit size={28} className="text-orange-500"/> 로스율 개별 세팅 및 보건소별 요청내역</h3><p className="text-[11px] text-gray-500 font-bold mt-1 pl-10"><span className="text-blue-600">{vIt.ms.name}</span> | 원본 수량: {vIt.rawPieces} ({vIt.basicBox}Box)</p></div><button onClick={()=>setVIt(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0"><div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center"><div className="flex-1 flex gap-4 w-full"><div className="flex-1 p-4 bg-slate-50 rounded-xl border"><p className="text-[10px] font-black text-slate-500 mb-1">기본 로스율 그룹</p><p className="font-black text-sm text-slate-700">{vIt.lg || '미지정'} ({vIt.lg ? lossRates[vIt.lg] || 0 : 0}%)</p></div><div className="flex-1 p-4 bg-orange-50/50 rounded-xl border border-orange-200 shadow-inner"><p className="text-[10px] font-black text-orange-600 mb-1">개별 로스율 세팅 (우선적용)</p><div className="flex items-center gap-2"><NumInp v={irV} setV={setIrV} ph={itemLossRates[vIt.id]!==undefined ? itemLossRates[vIt.id] : ''} cls="w-20 px-3 py-2 border-orange-300 focus:border-orange-500 rounded-lg text-sm font-black text-orange-700 bg-white shadow-inner placeholder:text-orange-300" /><span className="text-sm font-black text-orange-400">%</span><button onClick={handleIrSave} className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-black shadow-sm transition-colors">적용</button></div></div></div><div className="text-center bg-indigo-50/50 px-8 py-4 rounded-xl border border-indigo-100"><p className="text-[10px] font-black text-indigo-500 mb-1">최종 발주(Box)</p><div className="text-4xl font-black text-indigo-700">{vIt.neededBoxes}</div></div></div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden"><h4 className="p-4 bg-slate-50 border-b font-black text-sm text-slate-700 flex items-center gap-2"><Ic.Bldg size={16} className="text-slate-400"/> 보건소별 요청 수량 (원본)</h4><div className="flex-1 overflow-y-auto scrollbar-hide"><table className="w-full text-center text-[10px] table-fixed"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10 text-slate-600"><tr><th className="p-3 w-[10%] border-r font-bold">#</th><th className="p-3 w-[60%] text-left px-6 border-r font-bold">보건소명</th><th className="p-3 w-[30%] text-blue-700 bg-blue-50 font-bold">요청 수량 (낱개)</th></tr></thead><tbody className="divide-y divide-slate-100">{Object.keys(vIt.byClient).map((cId, idx) => {
                const cn = clients.find(c => c.id === cId)?.name || '알수없음';
                return (<tr key={cId} className="hover:bg-slate-50"><td className="p-3 border-r text-slate-400 font-bold">{idx + 1}</td><td className="p-3 px-6 text-left border-r font-black text-slate-700">{cn}</td><td className="p-3 font-black text-blue-600 text-sm bg-blue-50/20">{Utils.fmt(vIt.byClient[cId])}</td></tr>);
            })}</tbody></table></div></div></div>
          </div>
        </div>
      )}
    </div>
  );
};
