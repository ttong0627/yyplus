import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';
import { NumInp } from './shared.jsx';

export const PurchaseOrderManagement = ({ clients=[], items=[], suppliers=[], clientOrders=[], setClientOrders, purchaseRequests=[], setPurchaseRequests, lossRates={}, itemLossRates={}, aiOrderOverrides=[], payments=[], setPayments, weekMappings={}, toast, isLog, setSuppliers, clientItemMappings=[], globalMonth }) => {
  const [viewSupId, setViewSupId] = useState(null), [activeTab, setActiveTab] = useState('incomplete'), [orderMode, setOrderMode] = useState('all'), [selectedWk, setSelectedWk] = useState('1'), [drafts, setDrafts] = useState({});
  const targetWk = orderMode === 'all' ? 'all' : selectedWk;
  const targetM = globalMonth;

  const weeklyClientStatus = useMemo(() => {
    const weeks = { 1: [], 2: [], 3: [], 4: [] };
    clientOrders.filter(o => o.month === targetM).forEach(o => {
        const client = clients.find(c => c.id === o.clientId), clientName = client ? client.shortName : '알수없음';
        if (o.deliveryDate1) { const w1 = Utils.getWeek(o.deliveryDate1, weekMappings); if (w1 >= 1 && w1 <= 4) { const items1 = o.items.filter(it => Number(it.qty1) > 0); if (items1.length > 0) weeks[w1].push({ name: clientName, type: '1차', isDone: items1.length === items1.filter(it => it.reqBatchId1).length }); } }
        if (o.deliveryDate2) { const w2 = Utils.getWeek(o.deliveryDate2, weekMappings); if (w2 >= 1 && w2 <= 4) { const items2 = o.items.filter(it => Number(it.qty2) > 0); if (items2.length > 0) weeks[w2].push({ name: clientName, type: '2차', isDone: items2.length === items2.filter(it => it.reqBatchId2).length }); } }
    }); return weeks;
  }, [clientOrders, targetM, clients, weekMappings]);

  const getStats = useCallback((itemId) => {
    let rawPieces = 0;
    clientOrders.filter(o => o.month === targetM).forEach(o => { o.items.forEach(oi => { if (oi.itemId === itemId) {
            let oUnit = oi.orderUnit; if (oUnit == null) { const cm = clientItemMappings.filter(ma => ma.clientId === o.clientId); let m = cm.find(ma => ma.month === targetM) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; oUnit = m?.mappedItems?.find(mi => mi.uid === oi.uid)?.orderUnit || 1; }
            const w1 = Utils.getWeek(o.deliveryDate1, weekMappings), w2 = Utils.getWeek(o.deliveryDate2, weekMappings);
            if (targetWk === 'all' || w1 === parseInt(targetWk)) rawPieces += Number(oi.qty1||0) * Number(oUnit);
            if (targetWk === 'all' || w2 === parseInt(targetWk)) rawPieces += Number(oi.qty2||0) * Number(oUnit);
         }
      })
    });
    const ms = items.find(i=>i.id===itemId), bq = ms?.boxQuantity || 1, baseBoxes = Math.ceil(rawPieces / bq), cLoss = itemLossRates[itemId], lg = Utils.getLossGroup(ms, lossRates), appliedLoss = cLoss !== undefined ? cLoss : (lg ? (lossRates[lg] || 0) : 0);
    const calcAiBoxes = Math.ceil(baseBoxes * (1 + (appliedLoss / 100))); let finalNeededBoxes = calcAiBoxes;
    if (aiOrderOverrides[itemId] !== undefined) finalNeededBoxes = aiOrderOverrides[itemId];
    let confirmedBoxes = 0; purchaseRequests.filter(pr => pr.status !== 'requested' && pr.periodKey?.startsWith(targetM)).forEach(pr => { const prWk = pr.periodKey.split('-W')[1]; if (targetWk === 'all' || prWk === String(targetWk) || prWk === 'all') { pr.items.forEach(pi => { if (pi.itemId === itemId) confirmedBoxes += Number(pi.reqBoxes||0); }) } });
    return { neededBoxes: finalNeededBoxes, confirmedBoxes, remainingBoxes: Math.max(0, finalNeededBoxes - confirmedBoxes), rawPieces, baseBoxes, appliedLoss };
  }, [clientOrders, purchaseRequests, targetM, targetWk, items, lossRates, itemLossRates, aiOrderOverrides, weekMappings, clientItemMappings]);

  const reqs = useMemo(()=>purchaseRequests.filter(p=>{ if (!p.periodKey) return true; if (targetWk === 'all') return p.periodKey.startsWith(targetM); return p.periodKey === `${targetM}-W${targetWk}` || p.periodKey === `${targetM}-Wall`; }), [purchaseRequests, targetM, targetWk]);

  const supplierData = useMemo(() => {
     const supMap = {};
     clientOrders.filter(o => o.month === targetM).forEach(or => {
        const p1 = or.deliveryDate1, p2 = or.deliveryDate2, w1 = Utils.getWeek(p1, weekMappings), w2 = Utils.getWeek(p2, weekMappings);
        (or.items || []).forEach(it => {
            const masterItem = items.find(i => i.id === it.itemId); if (!masterItem) return;
            let oUnit = it.orderUnit; if (oUnit == null) { const cm = clientItemMappings.filter(ma => ma.clientId === or.clientId); let m = cm.find(ma => ma.month === targetM) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; oUnit = m?.mappedItems?.find(mi => mi.uid === it.uid)?.orderUnit || 1; }
            const sId = masterItem.supplierId || 'U'; if (!supMap[sId]) supMap[sId] = { id: sId, needed: 0, confirmed: 0, items: {}, prs: [] }; if (!supMap[sId].items[masterItem.id]) supMap[sId].items[masterItem.id] = { ms: masterItem, rawPieces: 0 };
            const addQty = (qtyStr, dt, w) => { if (!dt) return; if (targetWk !== 'all' && String(w) !== String(targetWk)) return; const tot = (parseFloat(qtyStr) || 0) * parseFloat(oUnit); if (tot > 0) supMap[sId].items[masterItem.id].rawPieces += tot; }; addQty(it.qty1, p1, w1); addQty(it.qty2, p2, w2);
        });
     });
     Object.keys(supMap).forEach(sId => { Object.keys(supMap[sId].items).forEach(itemId => { const rawPieces = supMap[sId].items[itemId].rawPieces; if (rawPieces > 0) { const st = getStats(itemId); supMap[sId].items[itemId].neededBoxes = st.neededBoxes; supMap[sId].items[itemId].confirmedBoxes = st.confirmedBoxes; supMap[sId].needed += st.neededBoxes; } else { delete supMap[sId].items[itemId]; } }); });
     reqs.forEach(pr => { const sId = pr.supplierId || 'U'; if (!supMap[sId]) supMap[sId] = { id: sId, needed: 0, confirmed: 0, items: {}, prs: [] }; supMap[sId].prs.push(pr); pr.items.forEach(pi => { const reqB = Number(pi.reqBoxes || 0); if (pr.status !== 'requested') supMap[sId].confirmed += reqB; if (!supMap[sId].items[pi.itemId]) { const masterItem = items.find(i => i.id === pi.itemId); if(masterItem) supMap[sId].items[pi.itemId] = { ms: masterItem, neededBoxes: 0, confirmedBoxes: pr.status !== 'requested' ? reqB : 0, rawPieces: 0 }; } else if (pr.status !== 'requested') { supMap[sId].items[pi.itemId].confirmedBoxes += reqB; } }); });
     return Object.values(supMap).map(s => { const sd = suppliers.find(x => x.id === s.id); s.name = sd?.name || '미지정 거래처'; s.favoriteAt = sd?.favoriteAt || 0; const maxVal = Math.max(s.needed, s.confirmed); s.progress = maxVal > 0 ? Math.floor((s.confirmed / maxVal) * 100) : (s.prs.length > 0 ? 100 : 0); s.totalRemaining = Math.max(0, s.needed - s.confirmed); s.isCompleted = s.progress >= 100 && s.prs.every(r=>r.status!=='requested'); return s; }).filter(s => s.needed > 0 || s.prs.length > 0).sort((a,b) => { if(a.favoriteAt !== b.favoriteAt) return b.favoriteAt - a.favoriteAt; return (a.name||'').localeCompare(b.name||''); });
  }, [clientOrders, targetM, targetWk, items, reqs, suppliers, getStats, weekMappings, clientItemMappings]);

  const viewSup = useMemo(() => supplierData.find(g => g.id === viewSupId), [supplierData, viewSupId]), viewSupPrs = viewSup?.prs || [], viewSupName = viewSup?.name || '알수없음';
  const tabCounts = useMemo(() => { let comp = 0, incomp = 0; supplierData.forEach(s => s.isCompleted ? comp++ : incomp++); return { all: supplierData.length, completed: comp, incomplete: incomp }; }, [supplierData]);
  const filteredSuppliers = useMemo(() => { return supplierData.filter(s => { if (activeTab === 'completed') return s.isCompleted; if (activeTab === 'incomplete') return !s.isCompleted; return true; }); }, [supplierData, activeTab]);

  useEffect(() => { if (viewSup) { const initD = {}; Object.values(viewSup.items).forEach(it => { const st = getStats(it.ms.id); const rem = Math.max(0, st.neededBoxes - st.confirmedBoxes); if(rem > 0) initD[it.ms.id] = { qty: rem, price: it.ms.unitPrice || 0 }; }); setDrafts(initD); } }, [viewSupId, viewSup?.id, getStats]);
  const toggleFav = (e, sId) => { e.stopPropagation(); if(!isLog) return toast('로그인 필요'); setSuppliers(prev => prev.map(s => s.id === sId ? {...s, favoriteAt: s.favoriteAt ? null : Date.now()} : s)); };

  const handleCreatePr = () => {
      if(!isLog) return toast('로그인 필요'); const itemsToOrder = [];
      Object.values(viewSup.items).forEach(it => { const draft = drafts[it.ms.id]; if (!draft) return; const orderQty = Number(draft.qty) || 0, orderPrice = Number(draft.price) || 0; if (orderQty > 0) { itemsToOrder.push({ itemId: it.ms.id, name: it.ms.name, unit: it.ms.unit, category: it.ms.category, boxQuantity: it.ms.boxQuantity, reqBoxes: orderQty, unitPrice: orderPrice, amount: orderQty * orderPrice }); } });
      if (itemsToOrder.length === 0) return toast('발주할 수량이 없습니다.');
      if (!window.confirm(`이 거래처의 ${itemsToOrder.length}건 품목을 구매 확정(전표 발행)하시겠습니까?\n확정 시 바로 물류입고 팀으로 전송됩니다.`)) return;
      setPurchaseRequests(p => [{ id: `PR_${Date.now()}_${viewSup.id}`, supplierId: viewSup.id, supplierName: viewSup.name, requestDate: new Date().toISOString().split('T')[0], periodKey: `${targetM}-${targetWk === 'all' ? 'Wall' : 'W'+targetWk}`, periodLabel: `${targetM} ${targetWk==='all' ? '월 전체' : targetWk+'주차'}`, items: itemsToOrder, status: 'ordered' }, ...p]); toast('발주 전표가 성공적으로 확정 발행되었습니다.');
  };

  const handleCancelConfirmPr = (pr) => { if(!isLog) return toast('로그인 필요'); const msg = pr.status === 'received' ? `[${pr.supplierName}] 입고 처리된 전표입니다!\n정말 취소하시겠습니까?\n(취소 시 미확정 잔량으로 100% 복구되며, 관련된 대금정산 내역도 삭제됩니다.)` : `[${pr.supplierName}] 확정된 전표를 취소하시겠습니까?\n(취소 시 미확정 잔량으로 복구됩니다.)`; if(!window.confirm(msg)) return; setPurchaseRequests(p => p.filter(x => x.id !== pr.id)); if(payments && setPayments) setPayments(p => p.filter(pay => pay.prId !== pr.id)); toast('전표가 완전히 취소되어 잔량이 복구되었습니다.'); };
  const handleCancelAllSupPrs = () => { if(!isLog) return toast('로그인 필요'); const ids = viewSupPrs.filter(p => p.status !== 'requested').map(p => p.id); if (ids.length === 0) return toast('취소할 기확정 전표가 없습니다.'); if(!window.confirm(`이 거래처의 기확정 전표 ${ids.length}건을 모두 취소하시겠습니까?\n물류입고 및 대금정산 목록에서 모두 삭제되고 미확정 잔량으로 100% 롤백됩니다.`)) return; setPurchaseRequests(p => p.filter(x => !ids.includes(x.id))); if(payments && setPayments) setPayments(p => p.filter(pay => !ids.includes(pay.prId))); toast('모든 확정 전표가 일괄 삭제되어 잔량으로 복구되었습니다.'); };

  const downloadAllExcel = () => {
      const fields = [{key: 'supplierName', label: '거래처명'}, {key: 'itemName', label: '품명(규격)'}, {key: 'category', label: '분류'}, {key: 'neededBoxes', label: '필요수량(Box)', type: 'number'}, {key: 'confirmedBoxes', label: '확정수량(Box)', type: 'number'}, {key: 'remainingBoxes', label: '미확정잔량(Box)', type: 'number'}, {key: 'progress', label: '진행률(%)', type: 'number'}, {key: 'unitPrice', label: '단가', type: 'number'}, {key: 'totalAmount', label: '미확정합계금액', type: 'number'}];
      const data = []; filteredSuppliers.forEach(sup => { Object.values(sup.items).forEach(it => { const prog = it.neededBoxes > 0 ? Math.floor((it.confirmedBoxes / it.neededBoxes) * 100) : 100, rem = Math.max(0, it.neededBoxes - it.confirmedBoxes); data.push({ supplierName: sup.name, itemName: `${it.ms.name} (${it.ms.unit})`, category: it.ms.category, neededBoxes: it.neededBoxes, confirmedBoxes: it.confirmedBoxes, remainingBoxes: rem, progress: prog, unitPrice: it.ms.unitPrice || 0, totalAmount: rem * (it.ms.unitPrice || 0) }); }); });
      Utils.dlStyled(fields, data, `전체거래처_발주현황_${targetM}_${targetWk}주차`);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end mb-4 border-b pb-4 border-slate-200 flex-none"><div><h2 className="text-2xl font-bold">구매요청서 송부함</h2><p className="text-[11px] text-gray-500 mt-1">집계된 리스트를 거래처별 발주서 양식으로 변환하여 송부(확정)합니다.</p></div></div>
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap md:flex-nowrap gap-3 mb-2 flex-none">{[1, 2, 3, 4].map(w => (<div key={`po-w-${w}`} className="flex-1 min-w-[120px] md:border-r border-slate-100 last:border-r-0 pr-3 last:pr-0 flex flex-col gap-1.5"><h4 className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 mb-0.5"><span>{w}주차 <span className="font-normal text-[10px]">적용 현황</span></span><span className="bg-white text-slate-600 border px-1.5 py-0.5 rounded-md leading-none">{weeklyClientStatus[w].length}</span></h4><div className="flex flex-wrap gap-1">{weeklyClientStatus[w].length === 0 ? <span className="text-[10px] text-slate-300">없음</span> : weeklyClientStatus[w].map((st, i) => (<span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border flex items-center gap-0.5 ${st.isDone ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'} ${st.type === '1차' ? 'text-blue-600' : 'text-green-600'}`}>{st.name} {st.isDone && <Ic.Chk size={10} className={st.type === '1차' ? 'text-blue-500' : 'text-green-500'}/>}</span>))}</div></div>))}</div>
      <div className="flex flex-wrap gap-2 px-2 mt-4 border-b-2 border-slate-300 relative items-end justify-between flex-none">
        <div className="flex gap-1 flex-wrap">
            <button onClick={()=>setActiveTab('incomplete')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='incomplete' ? 'bg-white border-slate-300 text-blue-600 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>대기 및 미완료 ({tabCounts.incomplete})</button>
            <button onClick={()=>setActiveTab('completed')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='completed' ? 'bg-white border-slate-300 text-green-600 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>발주 확정 완료 ({tabCounts.completed})</button>
            <button onClick={()=>setActiveTab('all')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='all' ? 'bg-white border-slate-300 text-slate-800 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>전체 보기 ({tabCounts.all})</button>
        </div>
        <div className="flex gap-2 pb-2 items-center flex-wrap">
            <div className="flex items-center bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm"><button onClick={()=>setOrderMode('all')} className={`px-4 py-1.5 text-[11px] font-black transition-all ${orderMode==='all' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}><Ic.ListO size={14} className="inline mr-1 -mt-0.5"/> 전체 발주</button><button onClick={()=>setOrderMode('nextWeek')} className={`px-4 py-1.5 text-[11px] font-black transition-all border-l border-blue-200 ${orderMode==='nextWeek' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}><Ic.Cal size={14} className="inline mr-1 -mt-0.5"/> 선택 주차 발주</button>{orderMode === 'nextWeek' && <select value={selectedWk} onChange={e=>setSelectedWk(e.target.value)} className="p-1.5 text-[11px] font-black outline-none bg-blue-50 text-blue-700 border-l border-blue-200 cursor-pointer"><option value="1">1주차</option><option value="2">2주차</option><option value="3">3주차</option><option value="4">4주차</option></select>}</div>
            <button onClick={downloadAllExcel} className="ml-1 px-4 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[11px] font-black shadow-sm hover:bg-green-100 flex items-center gap-1 transition-colors"><Ic.File size={14}/> 목록 엑셀 추출</button>
        </div>
      </div>
      <div className="bg-white border-2 border-t-0 border-slate-300 rounded-b-3xl rounded-tr-3xl p-4 sm:p-5 shadow-sm flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredSuppliers.length === 0 ? <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">표시할 거래처가 없습니다.</div> : null}
          {filteredSuppliers.map(sup => (
            <div key={`sup-card-${sup.id}`} onClick={()=>setViewSupId(sup.id)} className={`relative p-3.5 rounded-[1.2rem] shadow-sm border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md group flex flex-col gap-2 overflow-hidden ${sup.isCompleted ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-white border-slate-200 hover:border-blue-400'}`}>
              <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-50 ${sup.isCompleted ? 'bg-green-100' : 'bg-blue-50'}`}></div>
              <button onClick={(e)=>toggleFav(e, sup.id)} className="absolute top-2 right-2 z-20 p-1.5 rounded-full hover:bg-white/50 transition-colors"><Ic.Star size={14} className={sup.favoriteAt ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} /></button>
              <div className="flex items-center gap-2.5 relative z-10 pr-5"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${sup.isCompleted ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}><Ic.Truck size={14}/></div><div className="flex-1 min-w-0"><h3 className="font-black text-[12px] text-slate-800 truncate">{sup.name}</h3></div></div>
              <div className="mt-1 w-full bg-white/80 p-2 rounded-lg border border-slate-200 relative z-10"><div className="flex justify-between text-[9px] font-black text-slate-600 mb-1"><span>진행 {Math.min(100, sup.progress)}%</span>{sup.isCompleted ? <span className="text-green-600">발주 마감</span> : <span className="text-rose-500">잔여: {Utils.fmt(sup.totalRemaining)} Box</span>}</div><div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${sup.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, sup.progress)}%`}}></div></div></div>
            </div>
          ))}
        </div>
      </div>

      {viewSupId && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem] pr-16">
              <div><h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.File size={28} className="text-blue-500"/> {viewSupName} 구매요청 묶음</h3><p className="text-[11px] text-gray-500 font-bold mt-1 pl-10">요청 기준: {targetM} {targetWk==='all' ? '월 전체' : targetWk+'주차'} <span className="ml-3 bg-blue-50 text-blue-600 px-2 py-1 rounded">※ 위쪽 표에서 발주수량을 직접 입력할 수 있습니다.</span></p></div>
              <div className="flex gap-2 items-center hidden md:flex"><button onClick={()=>{ const confirmedItems = viewSupPrs.filter(p=>p.status!=='requested').flatMap(p=>p.items); if(confirmedItems.length === 0) return toast('확정 내역 없음'); Utils.dlPrExcel(viewSupName, confirmedItems, targetM); }} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-black border border-green-200 transition-colors hover:bg-green-100">엑셀 다운로드</button><button onClick={()=>{ const confirmedItems = viewSupPrs.filter(p=>p.status!=='requested').flatMap(p=>p.items); if(confirmedItems.length === 0) return toast('확정 내역 없음'); Utils.prtPr(viewSupName, confirmedItems); }} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-black hover:bg-gray-900 transition-colors">바로 인쇄</button></div>
              <button onClick={()=>setViewSupId(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button>
            </div>
            
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col gap-6 min-h-0 overflow-y-auto scrollbar-hide">
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col flex-none min-h-[300px]">
                   <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 flex-none"><h4 className="font-black text-slate-800 flex items-center gap-2"><Ic.Box size={18} className="text-blue-500"/> 미확정 품목 (발주 대기열)</h4>{Object.values(viewSup.items).some(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }) && (<button onClick={()=>handleCreatePr()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-colors flex items-center gap-2"><Ic.Plus size={14}/> 입력 수량만 구매 확정</button>)}</div>
                   <div className="w-full border rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
                       <div className="overflow-y-auto flex-1 scrollbar-hide">
                           {Object.values(viewSup.items).filter(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }).length === 0 ? ( <p className="text-center text-slate-400 font-bold py-6 bg-slate-50">미확정된 잔량이 없습니다.</p> ) : (
                               <table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm"><tr><th className="px-1 py-1.5 w-[5%] break-keep">#</th><th className="px-1 py-1.5 w-[25%] text-left break-keep">품명(규격)</th><th className="px-1 py-1.5 w-[8%] text-slate-500 border-l border-slate-200 break-keep leading-tight">기본수량<br/><span className="text-[8px] font-normal">(낱개)</span></th><th className="px-1 py-1.5 w-[7%] text-slate-500 break-keep">입수</th><th className="px-1 py-1.5 w-[8%] text-slate-500 border-r border-slate-200 break-keep leading-tight">기본<br/>박스</th><th className="px-1 py-1.5 w-[12%] bg-blue-50 border-l text-blue-800 break-keep leading-tight">발주수량<br/><span className="text-[8px] font-normal">(로스율 적용)</span></th><th className="px-1 py-1.5 w-[12%] bg-blue-50 border-r text-blue-800 break-keep leading-tight">단가<br/>(원)</th><th className="px-1 py-1.5 w-[13%] text-purple-700 break-keep">금액</th><th className="px-1 py-1.5 w-[10%] text-green-600 border-l border-slate-200 break-keep leading-tight">여유분<br/><span className="text-[8px] font-normal">(낱개)</span></th></tr></thead><tbody>
                                   {Object.values(viewSup.items).map((it, idx) => {
                                       const st = getStats(it.ms.id); if (st.neededBoxes <= st.confirmedBoxes) return null; 
                                       const remPieces = st.rawPieces, bq = it.ms.boxQuantity || 1, basicBox = Math.ceil(remPieces / bq), draft = drafts[it.ms.id] || { qty: Math.max(0, st.neededBoxes - st.confirmedBoxes), price: it.ms.unitPrice || 0 }, orderQty = Number(draft.qty) || 0, orderPrice = Number(draft.price) || 0, amt = orderQty * orderPrice, diffPieces = ((st.confirmedBoxes + orderQty) * bq) - st.rawPieces;
                                       return <tr key={`pend-${it.ms.id}`} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-1 py-1 text-slate-400 font-bold break-keep">{idx+1}</td><td className="px-1 py-1 font-black text-left text-slate-700 break-words">{it.ms.name} <span className="text-[9px] text-slate-400">({it.ms.unit})</span></td><td className="px-1 py-1 font-bold text-slate-500 border-l border-slate-100 break-keep">{Utils.fmt(st.rawPieces)}</td><td className="px-1 py-1 font-bold text-slate-500 break-keep">{Utils.fmt(bq)}</td><td className="px-1 py-1 text-slate-500 font-black border-r border-slate-100 break-keep">{Utils.fmt(basicBox)}</td><td className="px-1 py-1 bg-blue-50/30 border-l relative"><NumInp v={draft.qty} setV={v=>setDrafts(p=>({...p, [it.ms.id]: {...p[it.ms.id], qty: v}}))} cls="w-full min-w-[30px] p-1 border border-blue-200 focus:border-blue-500 rounded text-center bg-white font-black text-blue-700 shadow-inner text-[10px] transition-colors" /></td><td className="px-1 py-1 bg-blue-50/30 border-r"><NumInp v={draft.price} setV={v=>setDrafts(p=>({...p, [it.ms.id]: {...p[it.ms.id], price: v}}))} cls="w-full min-w-[40px] p-1 border border-blue-200 focus:border-blue-500 rounded text-center bg-white font-black text-blue-700 shadow-inner text-[10px] transition-colors" /></td><td className="px-1 py-1 font-black text-purple-700 break-keep">{Utils.fmt(amt)}</td><td className="px-1 py-1 font-black text-green-600 border-l border-slate-100 break-keep">{diffPieces > 0 ? `+${Utils.fmt(diffPieces)}` : Utils.fmt(diffPieces)}</td></tr>
                                   })}
                               </tbody></table>
                           )}
                       </div>
                   </div>
               </div>

               {viewSupPrs.filter(p=>p.status!=='requested').length > 0 && (
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-none flex flex-col min-h-[300px]">
                       <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 flex-none"><Ic.ListO size={18} className="text-green-500"/> 기확정 전표 내역 ({viewSupPrs.filter(p=>p.status!=='requested').length}건)</h4>
                       <div className="overflow-y-auto flex-1 scrollbar-hide space-y-4">
                           {viewSupPrs.filter(p=>p.status!=='requested').map((pr, idx) => {
                               const isReceived = pr.status === 'received';
                               return <div key={pr.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"><div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="font-black text-sm text-slate-800 flex items-center gap-2"><Ic.Chk size={18} className="text-green-500"/>전표 #{idx+1} <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-1 rounded border">({pr.periodLabel})</span>{isReceived && <span className="text-[10px] text-white bg-purple-500 px-2 py-1 rounded-md ml-2 shadow-sm">입고완료됨</span>}</span><div className="flex gap-2"><button onClick={()=>handleCancelConfirmPr(pr)} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-[10px] font-black hover:bg-rose-50 shadow-sm flex items-center gap-1 transition-colors"><Ic.Alert size={12}/> 이 전표 취소(잔량 복구)</button></div></div><div className="w-full"><table className="w-full text-center text-[10px] bg-white rounded-lg overflow-hidden border border-slate-200 table-fixed"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-2 w-[55%] text-left px-3 break-keep">품명</th><th className="p-2 w-[15%] break-keep">확정수량(Box)</th><th className="p-2 w-[15%] break-keep">단가</th><th className="p-2 w-[15%] break-keep">합계</th></tr></thead><tbody>{pr.items.map(pi => (<tr key={pi.itemId} className="border-b border-slate-100 last:border-b-0"><td className="p-2 text-left px-3 font-bold text-slate-700 break-words">{pi.name}</td><td className="p-2 font-black text-slate-600 break-keep">{Utils.fmt(pi.reqBoxes)}</td><td className="p-2 font-bold text-slate-500 break-keep">{Utils.fmt(pi.unitPrice)}</td><td className="p-2 font-black text-slate-600 break-keep">{Utils.fmt(pi.amount)}</td></tr>))}</tbody></table></div></div>
                           })}
                       </div>
                   </div>
               )}
            </div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center gap-4 rounded-b-[2.5rem]"><div>{viewSup.prs && viewSup.prs.filter(p=>p.status==='ordered').length > 0 && (<button onClick={handleCancelAllSupPrs} className="bg-white border-2 border-orange-200 text-orange-600 px-6 py-4 rounded-xl font-black text-sm hover:bg-orange-50 shadow-sm flex items-center gap-2 transition-colors"><Ic.Alert size={18}/> 기확정 내역 모두 취소 (잔량 롤백)</button>)}</div><div className="flex gap-3"><button onClick={()=>setViewSupId(null)} className="px-10 py-4 bg-slate-200 text-slate-700 rounded-xl font-black shadow-md hover:bg-slate-300 transition-colors text-base">닫기</button>{Object.values(viewSup.items).some(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }) && (<button onClick={()=>handleCreatePr()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-black text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2"><Ic.Chk size={18}/> 입력 수량으로 구매 확정</button>)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
};
