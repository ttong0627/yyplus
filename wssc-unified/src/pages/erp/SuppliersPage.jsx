import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';
import Modal from '../../components/common/Modal';

const EMPTY = { id:'', name:'', manager:'', contact:'', accountInfo:'', note:'' };
const PASTE_HINT = '거래처명\t담당자\t연락처\t계좌정보\t비고';

export default function SuppliersPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pasteHint, setPasteHint] = useState(false);
  const pasteRef = useRef(null);

  useEffect(() => {
    if (!pasteHint) return;
    const handler = (e) => { if (pasteRef.current && !pasteRef.current.contains(e.target)) setPasteHint(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pasteHint]);

  const suppliers = st.suppliers || [];

  const openAdd  = () => { setForm({...EMPTY, id:`S${Date.now()}`}); setModal('add'); };
  const openEdit = (s) => { setForm({...s}); setModal('edit'); };

  const save = () => {
    if (!form.name) return showToast('거래처명은 필수입니다.','error');
    if (modal==='add') { updateSt('suppliers',[...suppliers,form]); showToast('거래처가 등록되었습니다.','success'); }
    else               { updateSt('suppliers',suppliers.map(s=>s.id===form.id?form:s)); showToast('거래처가 수정되었습니다.','success'); }
    setModal(null);
  };

  const del = (s) => showConfirm(`[${s.name}] 거래처를 삭제하시겠습니까?`, () => {
    updateSt('suppliers', suppliers.filter(x=>x.id!==s.id));
    showToast('삭제되었습니다.','success');
  });

  const dlExcel = () => {
    const rows = suppliers.map(s => `<tr>
      <td>${s.id||''}</td><td>${s.name||''}</td><td>${s.manager||''}</td>
      <td>${s.contact||''}</td><td>${s.accountInfo||''}</td><td>${s.note||''}</td>
    </tr>`).join('');
    Utils.dlExcel(`<table><thead><tr><th>ID</th><th>거래처명</th><th>담당자</th><th>연락처</th><th>계좌정보</th><th>비고</th></tr></thead><tbody>${rows}</tbody></table>`, '거래처목록');
  };

  const pasteRows = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return showToast('클립보드가 비어있습니다.','error');
      const rows = text.replace(/\r?\n$/,'').split(/\r?\n/).map(r=>r.split('\t').map(t=>t.trim())).filter(c=>c.some(v=>v));
      const now = Date.now();
      const added = rows.map((cols,i) => ({
        id:`S${now}_${i}`, name:cols[0]||'', manager:cols[1]||'',
        contact:cols[2]||'', accountInfo:cols[3]||'', note:cols[4]||'',
      })).filter(r=>r.name);
      if (!added.length) return showToast('거래처명 열이 있는 행이 없습니다.','error');
      updateSt('suppliers',[...suppliers,...added]);
      showToast(`${added.length}개 거래처가 추가됐습니다.`,'success');
    } catch { showToast('클립보드 읽기 실패','error'); }
  };

  const F = ({ label, k }) => (
    <div>
      <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">{label}</label>
      <input value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="input-base" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">거래처 관리</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 거래처 추가</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500 font-bold">총 {suppliers.length}개</span>
          <div className="flex gap-2">
            <div className="relative" ref={pasteRef}>
              <button onClick={() => setPasteHint(p=>!p)} className="btn-secondary text-xs flex items-center gap-1.5">{Ic.Clip} 붙여넣기</button>
              {pasteHint && (
                <div className="absolute right-0 top-full mt-2 z-10 rounded-2xl p-4 w-72 shadow-2xl"
                  style={{ background:'rgba(10,15,35,0.97)', border:'1px solid rgba(30,40,80,0.8)', borderTop:'1px solid rgba(99,102,241,0.25)' }}>
                  <p className="text-xs text-slate-300 font-black mb-1.5">열 순서 (탭 구분):</p>
                  <p className="text-xs font-mono mb-3 p-2 rounded-lg" style={{ color:'#a5b4fc', background:'rgba(99,102,241,0.10)' }}>{PASTE_HINT}</p>
                  <button onClick={() => { pasteRows(); setPasteHint(false); }} className="btn-primary text-xs w-full">클립보드에서 붙여넣기</button>
                </div>
              )}
            </div>
            <button onClick={dlExcel} disabled={suppliers.length===0} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40">{Ic.Down} 엑셀</button>
          </div>
        </div>

        <table className="table-base">
          <thead><tr><th>ID</th><th>거래처명</th><th>담당자</th><th>연락처</th><th>계좌정보</th><th>비고</th><th className="w-20">관리</th></tr></thead>
          <tbody>
            {suppliers.length===0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">등록된 거래처가 없습니다.</td></tr>
            ) : suppliers.map(s => (
              <tr key={s.id}>
                <td className="text-slate-500 font-mono text-xs">{s.id}</td>
                <td className="font-black text-white">{s.name}</td>
                <td className="text-slate-300">{s.manager}</td>
                <td className="text-slate-400 text-sm">{s.contact}</td>
                <td className="text-slate-400 text-sm">{s.accountInfo}</td>
                <td className="text-slate-400 text-sm">{s.note}</td>
                <td><div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30 transition-all">{Ic.Edit}</button>
                  <button onClick={() => del(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 transition-all">{Ic.Trash}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal==='add' ? '거래처 추가' : '거래처 수정'} maxW="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><F label="ID" k="id" /><F label="거래처명 *" k="name" /></div>
          <div className="grid grid-cols-2 gap-3"><F label="담당자" k="manager" /><F label="연락처" k="contact" /></div>
          <F label="계좌정보" k="accountInfo" />
          <F label="비고" k="note" />
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={() => setModal(null)} className="btn-secondary">취소</button>
          <button onClick={save} className="btn-primary">{modal==='add' ? '등록' : '저장'}</button>
        </div>
      </Modal>
    </div>
  );
}
