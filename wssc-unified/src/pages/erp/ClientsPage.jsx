import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';
import Modal from '../../components/common/Modal';

const EMPTY = { id:'', name:'', shortName:'', orderManager:'', orderContact:'', deliveryManager:'', deliveryContact:'', contractManager:'', inspectLocation:'', note:'' };
const PASTE_HINT = '이름\t단축명\t발주담당자\t발주연락처\t배송담당자\t배송연락처\t검수위치\t비고';

export default function ClientsPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pasteHint, setPasteHint] = useState(false);
  const pasteRef = useRef(null);

  /* 바깥 클릭으로 붙여넣기 팝업 닫기 */
  useEffect(() => {
    if (!pasteHint) return;
    const handler = (e) => { if (pasteRef.current && !pasteRef.current.contains(e.target)) setPasteHint(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pasteHint]);

  const clients = useMemo(() => {
    const q = search.toLowerCase();
    return (st.clients || []).filter(c => !q || c.name?.toLowerCase().includes(q) || c.shortName?.toLowerCase().includes(q));
  }, [st.clients, search]);

  const openAdd  = () => { setForm({ ...EMPTY, id:`C${Date.now()}` }); setModal('add'); };
  const openEdit = (c) => { setForm({ ...c }); setModal('edit'); };

  const save = () => {
    if (!form.name) return showToast('보건소 명칭을 입력하세요.', 'error');
    const list = st.clients || [];
    if (modal === 'add') {
      if (list.find(c => c.id === form.id)) return showToast('이미 존재하는 ID입니다.', 'error');
      updateSt('clients', [...list, form]);
      showToast('보건소가 등록되었습니다.', 'success');
    } else {
      updateSt('clients', list.map(c => c.id === form.id ? form : c));
      showToast('보건소 정보가 수정되었습니다.', 'success');
    }
    setModal(null);
  };

  const del = (c) => showConfirm(`[${c.name}] 보건소를 삭제하시겠습니까?`, () => {
    updateSt('clients', (st.clients || []).filter(x => x.id !== c.id));
    showToast('삭제되었습니다.', 'success');
  });

  const dlExcel = () => {
    const rows = clients.map(c => `<tr>
      <td>${c.id||''}</td><td>${c.name||''}</td><td>${c.shortName||''}</td>
      <td>${c.orderManager||''}</td><td>${c.orderContact||''}</td>
      <td>${c.deliveryManager||''}</td><td>${c.deliveryContact||''}</td>
      <td>${c.contractManager||''}</td><td>${c.inspectLocation||''}</td><td>${c.note||''}</td>
    </tr>`).join('');
    Utils.dlExcel(`<table>
      <thead><tr><th>ID</th><th>보건소명</th><th>단축명</th><th>발주담당자</th><th>발주연락처</th><th>배송담당자</th><th>배송연락처</th><th>계약담당자</th><th>검수위치</th><th>비고</th></tr></thead>
      <tbody>${rows}</tbody></table>`, '보건소목록');
  };

  const pasteRows = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return showToast('클립보드가 비어있습니다.', 'error');
      const rows = text.replace(/\r?\n$/, '').split(/\r?\n/).map(r => r.split('\t').map(t => t.trim())).filter(c => c.some(v => v));
      const now = Date.now();
      const added = rows.map((cols, i) => ({
        id:`C${now}_${i}`, name:cols[0]||'', shortName:cols[1]||'',
        orderManager:cols[2]||'', orderContact:cols[3]||'',
        deliveryManager:cols[4]||'', deliveryContact:cols[5]||'',
        inspectLocation:cols[6]||'', note:cols[7]||'', contractManager:'',
      })).filter(r => r.name);
      if (!added.length) return showToast('이름 열이 있는 행이 없습니다.', 'error');
      updateSt('clients', [...(st.clients||[]), ...added]);
      showToast(`${added.length}개 보건소가 추가됐습니다.`, 'success');
    } catch { showToast('클립보드 읽기 실패', 'error'); }
  };

  const F = ({ label, k, placeholder, span }) => (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">{label}</label>
      <input value={form[k]||''} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} className="input-base" placeholder={placeholder} />
    </div>
  );

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">보건소 관리</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 보건소 추가</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{Ic.Search}</span>
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9" placeholder="보건소 검색..." />
          </div>
          <span className="text-sm text-slate-500 font-bold">총 {clients.length}개</span>
          <div className="flex gap-2 ml-auto">
            <div className="relative" ref={pasteRef}>
              <button onClick={() => setPasteHint(p=>!p)} className="btn-secondary text-xs flex items-center gap-1.5">
                {Ic.Clip} 붙여넣기
              </button>
              {pasteHint && (
                <div
                  className="absolute right-0 top-full mt-2 z-10 rounded-2xl p-4 w-80 shadow-2xl"
                  style={{ background:'rgba(10,15,35,0.97)', border:'1px solid rgba(30,40,80,0.8)', borderTop:'1px solid rgba(99,102,241,0.25)' }}
                >
                  <p className="text-xs text-slate-300 font-black mb-1.5">열 순서 (탭 구분):</p>
                  <p className="text-xs font-mono mb-3 p-2 rounded-lg" style={{ color:'#a5b4fc', background:'rgba(99,102,241,0.10)' }}>{PASTE_HINT}</p>
                  <button onClick={() => { pasteRows(); setPasteHint(false); }} className="btn-primary text-xs w-full">클립보드에서 붙여넣기</button>
                </div>
              )}
            </div>
            <button onClick={dlExcel} disabled={clients.length===0} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40">
              {Ic.Down} 엑셀
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>ID</th><th>보건소명</th><th>단축명</th><th>발주 담당자</th><th>배송 담당자</th><th>검수 위치</th><th className="w-20">관리</th></tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600">등록된 보건소가 없습니다.</td></tr>
              ) : clients.map(c => (
                <tr key={c.id}>
                  <td className="text-slate-500 text-xs font-mono">{c.id}</td>
                  <td className="font-black text-white">{c.name}</td>
                  <td style={{ color:'#a5b4fc' }} className="font-bold">{c.shortName}</td>
                  <td className="text-slate-300">{c.orderManager}{c.orderContact && <span className="text-slate-500 text-xs ml-1">({c.orderContact})</span>}</td>
                  <td className="text-slate-300">{c.deliveryManager}{c.deliveryContact && <span className="text-slate-500 text-xs ml-1">({c.deliveryContact})</span>}</td>
                  <td className="text-slate-500">{c.inspectLocation}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30">{Ic.Edit}</button>
                      <button onClick={() => del(c)} className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-rose-400 hover:bg-rose-900/30">{Ic.Trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal==='add' ? '보건소 추가' : '보건소 수정'} maxW="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <F label="ID" k="id" placeholder="C001" />
          <F label="보건소명 *" k="name" placeholder="수원시 팔달구 보건소" />
          <F label="단축명" k="shortName" placeholder="팔달보건소" />
          <F label="검수 위치" k="inspectLocation" placeholder="1층 창고" />
          <F label="발주 담당자" k="orderManager" placeholder="홍길동" />
          <F label="발주 연락처" k="orderContact" placeholder="031-000-0000" />
          <F label="배송 담당자" k="deliveryManager" placeholder="김배송" />
          <F label="배송 연락처" k="deliveryContact" placeholder="010-0000-0000" />
          <F label="계약 담당자" k="contractManager" placeholder="이계약" />
          <F label="비고" k="note" placeholder="" />
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={() => setModal(null)} className="btn-secondary">취소</button>
          <button onClick={save} className="btn-primary">{modal==='add' ? '등록' : '저장'}</button>
        </div>
      </Modal>
    </div>
  );
}
