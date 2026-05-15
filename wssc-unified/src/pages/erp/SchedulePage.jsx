import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function SchedulePage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ clientId:'', deliveryDate1:'', deliveryDate2:'', deliveryBlock:'A', routeSequence:1 });

  const clients = st.clients || [];
  const clientOrders = st.clientOrders || [];

  const monthOrders = useMemo(() =>
    clientOrders.filter(o => o.month === globalMonth),
    [clientOrders, globalMonth]
  );

  const clientName = useCallback((id) => clients.find(c => c.id === id)?.shortName || id, [clients]);

  const openAdd = () => {
    setForm({ clientId:'', deliveryDate1:'', deliveryDate2:'', deliveryBlock:'A', routeSequence:monthOrders.length+1, month: globalMonth });
    setModal('add');
  };

  const openEdit = (o) => { setForm({...o}); setModal('edit'); };

  const save = () => {
    if (!form.clientId) return showToast('보건소를 선택하세요.', 'error');
    const list = [...clientOrders];
    if (modal === 'add') {
      const existing = list.find(o => o.clientId === form.clientId && o.month === globalMonth);
      if (existing) return showToast('이미 이번달 일정이 등록된 보건소입니다.', 'warn');
      list.push({ ...form, id:`CO${Date.now()}`, items:[], done1:false, done2:false, sign1:null, sign2:null });
      showToast('일정이 등록되었습니다.', 'success');
    } else {
      const idx = list.findIndex(o => o.id === form.id);
      if (idx > -1) list[idx] = form;
      showToast('일정이 수정되었습니다.', 'success');
    }
    updateSt('clientOrders', list);
    setModal(null);
  };

  const del = (o) => {
    updateSt('clientOrders', clientOrders.filter(x => x.id !== o.id));
    showToast('삭제되었습니다.', 'success');
  };

  const unregistered = useMemo(() =>
    clients.filter(c => !monthOrders.find(o => o.clientId === c.id)),
    [clients, monthOrders]
  );

  const blockColors = { A:'bg-sky-900/50 text-sky-300', B:'bg-amber-900/50 text-amber-300', C:'bg-emerald-900/50 text-emerald-300' };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black text-white">작업/배송 일정 — {globalMonth}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{monthOrders.length}개 보건소 등록 · 미등록 {unregistered.length}개</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 일정 추가</button>
      </div>

      {unregistered.length > 0 && (
        <div className="card border-amber-700/50 bg-amber-900/10">
          <p className="text-xs font-bold text-amber-400 mb-2">미등록 보건소 ({unregistered.length}개)</p>
          <div className="flex flex-wrap gap-2">
            {unregistered.map(c => (
              <button key={c.id} onClick={() => { setForm({ clientId:c.id, month:globalMonth, deliveryDate1:'', deliveryDate2:'', deliveryBlock:'A', routeSequence:monthOrders.length+1 }); setModal('add'); }}
                className="text-xs font-bold bg-amber-900/50 text-amber-300 px-3 py-1 rounded-lg hover:bg-amber-800/50 transition-colors">
                + {c.shortName || c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>순번</th><th>보건소</th><th>블럭</th><th>1차 배송일</th><th>2차 배송일</th><th>1차완료</th><th>2차완료</th><th className="w-24">관리</th></tr>
            </thead>
            <tbody>
              {monthOrders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">이번달 배송 일정이 없습니다.</td></tr>
              ) : [...monthOrders].sort((a,b) => (a.routeSequence||0)-(b.routeSequence||0)).map(o => (
                <tr key={o.id}>
                  <td className="text-center text-slate-400 font-mono">{o.routeSequence || '-'}</td>
                  <td className="font-black text-white">{clientName(o.clientId)}</td>
                  <td><span className={`badge ${blockColors[o.deliveryBlock] || 'bg-slate-700 text-slate-300'}`}>{o.deliveryBlock || '-'}</span></td>
                  <td className="text-slate-300">{o.deliveryDate1 || '-'}</td>
                  <td className="text-slate-300">{o.deliveryDate2 || '-'}</td>
                  <td className="text-center">{o.done1 ? <span className="text-emerald-400 font-black">✓</span> : <span className="text-slate-600">-</span>}</td>
                  <td className="text-center">{o.done2 ? <span className="text-emerald-400 font-black">✓</span> : <span className="text-slate-600">-</span>}</td>
                  <td><div className="flex gap-1">
                    <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-lg">{Ic.Edit}</button>
                    <button onClick={() => del(o)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg">{Ic.Trash}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-white mb-5">{modal === 'add' ? '일정 추가' : '일정 수정'} — {globalMonth}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">보건소*</label>
                <select value={form.clientId} onChange={e => setForm(p => ({...p, clientId:e.target.value}))} className="input-base" disabled={modal==='edit'}>
                  <option value="">선택</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['deliveryDate1','1차 배송일'],['deliveryDate2','2차 배송일']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{l}</label>
                    <input type="date" value={form[k]||''} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} className="input-base" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">배송 블럭</label>
                  <select value={form.deliveryBlock||'A'} onChange={e => setForm(p=>({...p,deliveryBlock:e.target.value}))} className="input-base">
                    {['A','B','C'].map(b => <option key={b} value={b}>{b} 블럭</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">배송 순번</label>
                  <input type="number" min={1} value={form.routeSequence||1} onChange={e => setForm(p=>({...p,routeSequence:Number(e.target.value)}))} className="input-base" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary">취소</button>
              <button onClick={save} className="btn-primary">{modal === 'add' ? '등록' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
