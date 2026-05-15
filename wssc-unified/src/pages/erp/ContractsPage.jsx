import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Ic } from '../../components/common/Icons';

const EMPTY = { id:'', clientId:'', supplierId:'', startDate:'', endDate:'', note:'' };

export default function ContractsPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const contracts = st.contracts || [];
  const clients = st.clients || [];
  const suppliers = st.suppliers || [];

  const openAdd = () => { setForm({ ...EMPTY, id:`CT${Date.now()}` }); setModal('add'); };
  const openEdit = (c) => { setForm({ ...c }); setModal('edit'); };

  const save = () => {
    if (!form.clientId || !form.supplierId) return showToast('보건소와 거래처를 선택하세요.', 'error');
    if (modal === 'add') {
      updateSt('contracts', [...contracts, form]);
      showToast('계약이 등록되었습니다.', 'success');
    } else {
      updateSt('contracts', contracts.map(c => c.id === form.id ? form : c));
      showToast('계약이 수정되었습니다.', 'success');
    }
    setModal(null);
  };

  const del = (c) => {
    showConfirm('이 계약을 삭제하시겠습니까?', () => {
      updateSt('contracts', contracts.filter(x => x.id !== c.id));
      showToast('삭제되었습니다.', 'success');
    });
  };

  const clientName = (id) => clients.find(c => c.id === id)?.shortName || id;
  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || id;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">보건소 계약 관리</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 계약 추가</button>
      </div>
      <div className="card">
        <table className="table-base">
          <thead><tr><th>보건소</th><th>거래처</th><th>계약 시작일</th><th>계약 종료일</th><th>비고</th><th className="w-24">관리</th></tr></thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">등록된 계약이 없습니다.</td></tr>
            ) : contracts.map(c => (
              <tr key={c.id}>
                <td className="font-bold text-white">{clientName(c.clientId)}</td>
                <td className="text-indigo-300">{supplierName(c.supplierId)}</td>
                <td className="text-slate-300">{c.startDate}</td>
                <td className="text-slate-300">{c.endDate}</td>
                <td className="text-slate-400 text-sm">{c.note}</td>
                <td><div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-lg">{Ic.Edit}</button>
                  <button onClick={() => del(c)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg">{Ic.Trash}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-white mb-5">{modal === 'add' ? '계약 추가' : '계약 수정'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">보건소*</label>
                <select value={form.clientId} onChange={e => setForm(p => ({...p, clientId:e.target.value}))} className="input-base">
                  <option value="">선택</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">거래처*</label>
                <select value={form.supplierId} onChange={e => setForm(p => ({...p, supplierId:e.target.value}))} className="input-base">
                  <option value="">선택</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['startDate','endDate'].map(k => (
                  <div key={k}>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{k === 'startDate' ? '시작일' : '종료일'}</label>
                    <input type="date" value={form[k]||''} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} className="input-base" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">비고</label>
                <input value={form.note||''} onChange={e => setForm(p=>({...p,note:e.target.value}))} className="input-base" />
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
