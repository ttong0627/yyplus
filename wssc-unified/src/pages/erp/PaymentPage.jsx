import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const EMPTY = { id:'', supplierId:'', amount:'', date:'', method:'계좌이체', note:'' };

export default function PaymentPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const suppliers = st.suppliers || [];
  const payments = (st.payments || []).filter(p => p.date?.startsWith(globalMonth));

  const openAdd = () => { setForm({ ...EMPTY, id:`PAY${Date.now()}`, date: Utils.today() }); setModal('add'); };
  const openEdit = (p) => { setForm({...p}); setModal('edit'); };

  const save = () => {
    if (!form.supplierId || !form.amount) return showToast('거래처와 금액은 필수입니다.', 'error');
    const list = st.payments || [];
    if (modal === 'add') updateSt('payments', [...list, form]);
    else updateSt('payments', list.map(p => p.id === form.id ? form : p));
    setModal(null);
    showToast('정산이 저장되었습니다.', 'success');
  };

  const del = (p) => {
    updateSt('payments', (st.payments || []).filter(x => x.id !== p.id));
    showToast('삭제되었습니다.', 'success');
  };

  const total = payments.reduce((s, p) => s + (Number(p.amount)||0), 0);

  const dlExcel = () => {
    const rows = payments.map(p => `<tr>
      <td>${suppliers.find(s=>s.id===p.supplierId)?.name||p.supplierId}</td>
      <td>${p.date||''}</td>
      <td class="num">${Number(p.amount)||0}</td>
      <td>${p.method||''}</td>
      <td>${p.note||''}</td>
    </tr>`).join('');
    Utils.dlExcel(`<table>
      <thead><tr><th>거래처</th><th>날짜</th><th>금액(원)</th><th>결제방식</th><th>비고</th></tr></thead>
      <tbody>${rows}
      <tr><td colspan="2"><b>합계</b></td><td class="num"><b>${total}</b></td><td></td><td></td></tr>
      </tbody>
    </table>`, `대금정산_${globalMonth}`);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">대금 정산 — {globalMonth}</h1>
          <p className="text-sm text-slate-400 mt-0.5">이번달 총 지급액: <span className="text-emerald-400 font-black">{Utils.fmtMoney(total)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={dlExcel} disabled={payments.length === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
            {Ic.Down} 엑셀 다운로드
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 정산 추가</button>
        </div>
      </div>

      <div className="card">
        <table className="table-base">
          <thead><tr><th>거래처</th><th>날짜</th><th className="text-right">금액</th><th>결제방식</th><th>비고</th><th className="w-24">관리</th></tr></thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500">이번달 정산 내역이 없습니다.</td></tr>
            ) : payments.map(p => (
              <tr key={p.id}>
                <td className="font-bold text-white">{suppliers.find(s => s.id === p.supplierId)?.name || p.supplierId}</td>
                <td className="text-slate-300">{p.date}</td>
                <td className="text-right font-black text-emerald-400 tabular-nums">{Utils.fmtMoney(p.amount)}</td>
                <td className="text-slate-400">{p.method}</td>
                <td className="text-slate-400 text-sm">{p.note}</td>
                <td><div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-lg">{Ic.Edit}</button>
                  <button onClick={() => del(p)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg">{Ic.Trash}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-white mb-5">{modal==='add' ? '정산 추가' : '정산 수정'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">거래처*</label>
                <select value={form.supplierId} onChange={e => setForm(p=>({...p,supplierId:e.target.value}))} className="input-base">
                  <option value="">선택</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">금액(원)*</label>
                  <input type="number" value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">날짜</label>
                  <input type="date" value={form.date||''} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="input-base" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">결제방식</label>
                <select value={form.method||'계좌이체'} onChange={e=>setForm(p=>({...p,method:e.target.value}))} className="input-base">
                  {['계좌이체','현금','카드','기타'].map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">비고</label>
                <input value={form.note||''} onChange={e=>setForm(p=>({...p,note:e.target.value}))} className="input-base" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary">취소</button>
              <button onClick={save} className="btn-primary">{modal==='add' ? '등록' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
