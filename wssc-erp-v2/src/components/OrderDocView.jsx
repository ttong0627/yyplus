import React, { useState, useMemo } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';
import { NumInp } from './shared.jsx';

export const OrderDocView = ({ clients=[], clientOrders=[], setClientOrders, items=[], sortedItems=[], clientItemMappings=[], lossRates={}, itemLossRates={}, toast, isLog }) => {
  const [sC, setSC] = useState(clients[0]?.id || null);
  const [cM, setCM] = useState(new Date().toISOString().slice(0, 7));
  const [ie, setIe] = useState(null), [iv, setIv] = useState(null);
  const [vId, setVId] = useState(null);
  
  const cMObj = useMemo(() => clientItemMappings.find(m => m.clientId === sC) || { items: [] }, [clientItemMappings, sC]);
  const cCN = clients.find(c => c.id === sC)?.shortName || '';
  const odList = useMemo(() => clientOrders.filter(o => o.clientId === sC && o.targetMonth === cM).sort((a,b)=>(b.id||'').localeCompare(a.id||'')), [clientOrders, sC, cM]);

  const handleDel = id => {
    if (!isLog) return toast('로그인 필요');
    if(!window.confirm('정말 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) return;
    setClientOrders(clientOrders.filter(o => o.id !== id)); toast('삭제 완료'); setVId(null);
  };

  const processClip = e => {
    if (!isLog) return toast('로그인 필요');
    if (!sC) return toast('보건소를 먼저 선택하세요.');
    const d = Utils.parseClip(e); if (d.length === 0) return toast('클립보드에 유효한 표 데이터가 없습니다.');
    let cId = null, cName = null, itemsFound = [];
    const chkRow = row => {
        const text = row.map(c => c.text).join(' ');
        if (!cId && (text.includes('수요조사') || text.includes('배송요청'))) {
            for (let c of clients) { if (text.includes(c.shortName) || text.includes(c.name)) { cId = c.id; cName = c.shortName; break; } }
        }
        if (text.includes('품명') || text.includes('수량')) return;
        cMObj.items.forEach(cmi => {
            const mit = items.find(x => x.id === cmi.id); if(!mit) return;
            const nm = cmi.customName || mit.name;
            if (text.includes(nm) || text.includes(mit.name)) {
                let qty = null;
                for (let i = row.length - 1; i >= 0; i--) { const n = parseInt(row[i].text.replace(/[^\d]/g, ''), 10); if (!isNaN(n) && n > 0 && n < 1000) { qty = n; break; } }
                if (qty !== null) itemsFound.push({ itemId: cmi.id, qty });
            }
        });
    };
    d.forEach(chkRow);
    if (!cId) { cId = sC; cName = cCN; } else if (cId !== sC) { return toast(`클립보드 데이터의 보건소(${cName})와 선택된 보건소(${cCN})가 다릅니다.`); }
    if (itemsFound.length === 0) return toast('매칭된 품목 수량이 없습니다. 클립보드 데이터를 확인하거나 [품목 매칭]을 설정하세요.');
    
    let dt = '', wk = 0;
    const txt = d.map(r => r.map(c => c.text).join(' ')).join('\n');
    const m = txt.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if(m) dt = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    if(!dt) { const m2 = txt.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if(m2) dt = `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`; }
    if(dt) { const dm = dt.match(/\d{4}-\d{2}-(\d{2})/); if(dm) { const day = parseInt(dm[1], 10); wk = Math.ceil(day / 7); if(wk > 4) wk = 4; } }
    
    const req = { id: `O${Date.now()}`, clientId: cId, targetMonth: cM, targetWeek: wk, deliveryDate: dt, items: itemsFound, totalQty: itemsFound.reduce((a, b) => a + b.qty, 0) };
    setClientOrders([req, ...clientOrders]); toast(`${itemsFound.length}개 품목 자동 인식 및 발주 등록 완료!`);
  };

  const handleManualAdd = () => {
      if (!isLog) return toast('로그인 필요');
      const req = { id: `O${Date.now()}`, clientId: sC, targetMonth: cM, targetWeek: 1, deliveryDate: '', items: cMObj.items.map(it => ({ itemId: it.id, qty: it.defaultQty })), totalQty: cMObj.items.reduce((a, b) => a + b.defaultQty, 0) };
      setClientOrders([req, ...clientOrders]); setVId(req.id); toast('수동 발주서 생성됨');
  };

  const updateV = (id, f, v) => setClientOrders(clientOrders.map(o => o.id === id ? { ...o, [f]: v } : o));
  const updateVItem = (id, itId, v) => {
      setClientOrders(clientOrders.map(o => {
          if (o.id !== id) return o;
          let nItems = [...o.items], fd = nItems.find(x => x.itemId === itId);
          if (fd) { if (v === '' || v === 0) nItems = nItems.filter(x => x.itemId !== itId); else fd.qty = v; } 
          else if (v > 0) { nItems.push({ itemId: itId, qty: v }); }
          return { ...o, items: nItems, totalQty: nItems.reduce((a, b) => a + b.qty, 0) };
      }));
  };

  const vO = vId ? clientOrders.find(o => o.id === vId) : null;

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0"><div className="flex justify-between items-end mb-2 flex-none"><div><h2 className="text-2xl font-bold flex items-center gap-2"><Ic.Clip size={28} className="text-blue-600"/> 발주입력 (엑셀 붙여넣기)</h2><p className="text-[11px] text-gray-500 mt-1">엑셀(스프레드시트) 데이터를 복사하여 이 화면 아무 곳에서나 [Ctrl+V] 하시면 발주내역이 자동 생성됩니다.</p></div><div className="flex gap-2 items-center"><input type="month" value={cM} onChange={e => setCM(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm text-blue-700 shadow-sm outline-none focus:border-blue-500 cursor-pointer" /></div></div>
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0"><div className="w-full md:w-80 bg-white p-5 rounded-3xl border shadow-sm flex flex-col flex-none min-h-0"><h3 className="font-black text-sm text-slate-800 mb-4 border-b pb-3 flex items-center gap-2"><Ic.Bldg size={18} className="text-blue-500"/> 보건소 선택</h3><div className="overflow-y-auto flex-1 pr-2 scrollbar-hide space-y-2">{clients.map(c => (<button key={c.id} onClick={() => { setSC(c.id); setVId(null); }} className={`w-full text-left p-4 rounded-2xl text-xs font-black transition-all ${sC === c.id ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-sm'}`}><div className="flex justify-between items-center"><span>{c.name}</span><Ic.Right size={14} className={sC === c.id ? 'text-blue-300' : 'text-slate-300'}/></div><div className={`mt-1 text-[10px] ${sC === c.id ? 'text-blue-200' : 'text-slate-400'}`}>호칭: {c.shortName}</div></button>))}</div></div>
      
      <div className="flex-1 flex flex-col min-h-0 gap-6" onPaste={processClip}>
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center border-dashed border-2 border-blue-200 hover:border-blue-400 transition-colors bg-blue-50/20 group relative overflow-hidden flex-none">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <Ic.Clip size={48} className="text-blue-300 mb-4 group-hover:text-blue-500 transition-colors group-hover:scale-110 duration-300" />
           <p className="text-sm font-black text-slate-700 mb-2">보건소 발주 내역을 복사한 후 화면에 <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-base">Ctrl + V</span> 하세요.</p>
           <p className="text-[11px] text-slate-500 font-bold bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">자동으로 항목이 매칭되어 발주가 생성됩니다.</p>
        </div>
        
        <div className="flex-1 bg-white p-6 rounded-3xl border shadow-sm flex flex-col min-h-0 relative">
            <div className="flex justify-between items-center mb-6 flex-none"><h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><span className="text-blue-600">{cM} {cCN}</span> 발주 목록 <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold border">{odList.length}건</span></h3><button onClick={handleManualAdd} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black shadow-md hover:bg-slate-900 transition-transform hover:-translate-y-0.5 flex items-center gap-1"><Ic.Plus size={16}/> 수동 발주서 생성</button></div>
            <div className="flex-1 border rounded-2xl overflow-hidden flex flex-col min-h-0"><div className="overflow-y-auto flex-1 scrollbar-hide"><table className="w-full text-left text-[11px]"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10 text-slate-600"><tr><th className="p-3 border-r w-[25%] font-bold">납품일</th><th className="p-3 border-r w-[20%] text-center font-bold">주차 지정</th><th className="p-3 border-r w-[40%] font-bold">발주 내역 요약</th><th className="p-3 text-center w-[15%] font-bold">총수량</th></tr></thead><tbody className="divide-y divide-slate-100">{odList.length === 0 ? <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold bg-slate-50">해당 월에 접수된 발주가 없습니다.</td></tr> : odList.map(o => {
                const trCls = vId === o.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent cursor-pointer';
                return (<tr key={o.id} className={`${trCls} transition-colors group`} onClick={() => setVId(o.id)}><td className="p-3 border-r font-black text-blue-700">{o.deliveryDate || <span className="text-slate-400 text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded">일정 미지정</span>}</td><td className="p-3 border-r text-center font-bold text-slate-600">{o.targetWeek ? `${o.targetWeek}주차` : <span className="text-rose-400 text-[10px] bg-rose-50 px-2 py-0.5 rounded">미분류</span>}</td><td className="p-3 border-r text-slate-500 font-bold"><div className="truncate w-full max-w-[200px]" title={o.items.map(i => { const nm = items.find(x=>x.id===i.itemId)?.name||'알수없음'; return `${nm}(${i.qty})`; }).join(', ')}>{o.items.map(i => { const nm = items.find(x=>x.id===i.itemId)?.name||'알수없음'; return `${nm}(${i.qty})`; }).join(', ')}</div></td><td className="p-3 text-center font-black text-indigo-600 text-sm">{o.totalQty}</td></tr>);
            })}</tbody></table></div></div>
        </div>
      </div>
      </div>
      
      {vId && vO && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-5xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem] pr-16"><div><h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.Edit size={28} className="text-blue-600"/> 발주서 상세 내역</h3><p className="text-[11px] text-gray-500 font-bold mt-1 pl-10"><span className="text-blue-600">{cCN}</span> | 납품일: {vO.deliveryDate||'미지정'} ({vO.targetWeek?`${vO.targetWeek}주차`:'주차 미지정'})</p></div><button onClick={()=>setVId(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0"><div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4 flex gap-4"><div className="flex-1"><label className="block text-[10px] font-black text-slate-500 mb-1">납품일정 세팅</label><div className="flex items-center gap-2"><input type="date" value={vO.deliveryDate || ''} onChange={e=>updateV(vId, 'deliveryDate', e.target.value)} className="px-3 py-2 border rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /><select value={vO.targetWeek || ''} onChange={e=>updateV(vId, 'targetWeek', parseInt(e.target.value, 10))} className="px-3 py-2 border rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="">주차 미지정</option><option value="1">1주차</option><option value="2">2주차</option><option value="3">3주차</option><option value="4">4주차</option></select></div></div><div className="text-right flex flex-col justify-center"><p className="text-[10px] font-black text-slate-500 mb-1">발주 총 수량</p><div className="text-3xl font-black text-blue-600">{vO.totalQty}<span className="text-sm text-slate-400 ml-1">포</span></div></div></div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden"><div className="flex-1 overflow-y-auto scrollbar-hide"><table className="w-full text-center text-[10px] table-fixed"><thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b"><tr><th className="p-2 border-r w-[8%]">#</th><th className="p-2 border-r w-[15%]">분류</th><th className="p-2 text-left px-4 border-r w-[42%]">품명</th><th className="p-2 border-r w-[15%]">단위</th><th className="p-2 w-[20%] text-blue-700 bg-blue-50">수량 변경</th></tr></thead><tbody className="divide-y divide-slate-100">{sortedItems.filter(mit => cMObj.items.some(i => i.id === mit.id)).map((mit, idx) => {
                const cmi = cMObj.items.find(i => i.id === mit.id); const oItem = vO.items.find(i => i.itemId === mit.id); const qty = oItem ? oItem.qty : '';
                return (<tr key={mit.id} className="hover:bg-slate-50"><td className="p-2 border-r text-slate-400 font-bold">{idx + 1}</td><td className="p-2 border-r font-black text-slate-600">{mit.category}</td><td className="p-2 px-4 border-r font-black text-left text-slate-800 break-words">{cmi.customName || mit.name}</td><td className="p-2 border-r font-bold text-slate-500">{mit.unit}</td><td className="p-2 bg-blue-50/20"><NumInp v={qty} setV={v => updateVItem(vId, mit.id, v)} cls="w-full h-8 text-sm font-black text-blue-700 bg-white border border-blue-200 focus:border-blue-500 rounded text-center shadow-inner" /></td></tr>);
            })}</tbody></table></div></div></div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-between rounded-b-[2.5rem]"><button onClick={() => handleDel(vId)} className="px-6 py-4 border border-rose-200 text-rose-600 rounded-xl font-black text-sm hover:bg-rose-50 shadow-sm transition-colors flex items-center gap-2"><Ic.Trash size={16}/> 이 발주서 삭제</button><button onClick={()=>setVId(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-4 rounded-xl font-black text-sm shadow-md transition-transform hover:-translate-y-0.5">수정 완료 (닫기)</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
