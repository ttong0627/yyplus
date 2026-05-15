import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';
import Modal from '../../components/common/Modal';

const EMPTY = { id:'', category:'', name:'', unit:'', boxQuantity:'', unitPrice:'', supplierId:'', isSubPackage:false, note:'' };
const PASTE_HINT = '카테고리\t품목명\t단위\t입수량\t단가\t비고';

export default function ItemsPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
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

  const categories = useMemo(() => [...new Set((st.items||[]).map(i=>i.category).filter(Boolean))], [st.items]);
  const suppliers = st.suppliers || [];

  const items = useMemo(() => Utils.sortItems(
    (st.items||[]).filter(i => {
      const q = search.toLowerCase();
      return (!catFilter || i.category===catFilter) && (!q || i.name?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q));
    }), st.categorySortOrder||[]
  ), [st.items, st.categorySortOrder, search, catFilter]);

  const openAdd  = () => { setForm({...EMPTY, id:`I${Date.now()}`}); setModal('add'); };
  const openEdit = (i) => { setForm({...i}); setModal('edit'); };

  const save = () => {
    if (!form.name || !form.category) return showToast('카테고리와 품목명은 필수입니다.', 'error');
    const list = st.items||[];
    if (modal==='add') { updateSt('items',[...list,form]); showToast('품목이 등록되었습니다.','success'); }
    else               { updateSt('items',list.map(i=>i.id===form.id?form:i)); showToast('품목이 수정되었습니다.','success'); }
    setModal(null);
  };

  const del = (item) => showConfirm(`[${item.name}]을 삭제하시겠습니까?`, () => {
    updateSt('items',(st.items||[]).filter(i=>i.id!==item.id));
    showToast('삭제되었습니다.','success');
  });

  const dlExcel = () => {
    const rows = items.map(item => `<tr>
      <td>${item.id||''}</td><td>${item.category||''}</td><td>${item.name||''}</td>
      <td>${item.unit||''}</td><td class="num">${item.boxQuantity||''}</td>
      <td class="num">${item.unitPrice||''}</td>
      <td>${suppliers.find(s=>s.id===item.supplierId)?.name||''}</td><td>${item.note||''}</td>
    </tr>`).join('');
    Utils.dlExcel(`<table><thead><tr><th>ID</th><th>카테고리</th><th>품목명</th><th>단위</th><th>입수량</th><th>단가(원)</th><th>거래처</th><th>비고</th></tr></thead><tbody>${rows}</tbody></table>`, '품목목록');
  };

  const pasteRows = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return showToast('클립보드가 비어있습니다.','error');
      const rows = text.replace(/\r?\n$/,'').split(/\r?\n/).map(r=>r.split('\t').map(t=>t.trim())).filter(c=>c.some(v=>v));
      const now = Date.now();
      const added = rows.map((cols,i) => ({
        id:`I${now}_${i}`, category:cols[0]||'', name:cols[1]||'', unit:cols[2]||'',
        boxQuantity:cols[3]?cols[3].replace(/,/g,''):'', unitPrice:cols[4]?cols[4].replace(/,/g,''):'',
        note:cols[5]||'', supplierId:'', isSubPackage:false,
      })).filter(r=>r.name);
      if (!added.length) return showToast('품목명 열이 있는 행이 없습니다.','error');
      updateSt('items',[...(st.items||[]),...added]);
      showToast(`${added.length}개 품목이 추가됐습니다.`,'success');
    } catch { showToast('클립보드 읽기 실패','error'); }
  };

  const F = ({ label, k, type='text', required }) => (
    <div>
      <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">{label}{required&&' *'}</label>
      <input type={type} value={form[k]??''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="input-base" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">품목 관리</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 품목 추가</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{Ic.Search}</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="input-base pl-9 w-52" placeholder="품목 검색..." />
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="input-base w-36">
            <option value="">전체 카테고리</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-sm text-slate-500 font-bold">총 {items.length}개</span>
          <div className="flex gap-2 ml-auto">
            <div className="relative" ref={pasteRef}>
              <button onClick={() => setPasteHint(p=>!p)} className="btn-secondary text-xs flex items-center gap-1.5">{Ic.Clip} 붙여넣기</button>
              {pasteHint && (
                <div className="absolute right-0 top-full mt-2 z-10 rounded-2xl p-4 w-80 shadow-2xl"
                  style={{ background:'rgba(10,15,35,0.97)', border:'1px solid rgba(30,40,80,0.8)', borderTop:'1px solid rgba(99,102,241,0.25)' }}>
                  <p className="text-xs text-slate-300 font-black mb-1.5">열 순서 (탭 구분):</p>
                  <p className="text-xs font-mono mb-3 p-2 rounded-lg" style={{ color:'#a5b4fc', background:'rgba(99,102,241,0.10)' }}>{PASTE_HINT}</p>
                  <button onClick={() => { pasteRows(); setPasteHint(false); }} className="btn-primary text-xs w-full">클립보드에서 붙여넣기</button>
                </div>
              )}
            </div>
            <button onClick={dlExcel} disabled={items.length===0} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40">{Ic.Down} 엑셀</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>ID</th><th>카테고리</th><th>품목명</th><th>단위</th><th className="text-right">입수량</th><th className="text-right">단가</th><th>거래처</th><th className="w-20">관리</th></tr></thead>
            <tbody>
              {items.length===0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600">등록된 품목이 없습니다.</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className="text-slate-500 text-xs font-mono">{item.id}</td>
                  <td><span className="badge" style={{ background:'rgba(99,102,241,0.15)', color:'#a5b4fc' }}>{item.category}</span></td>
                  <td className="font-black text-white">{item.name}</td>
                  <td className="text-slate-300">{item.unit}</td>
                  <td className="text-right text-slate-300 tabular-nums">{Utils.fmt(item.boxQuantity)}</td>
                  <td className="text-right tabular-nums font-bold" style={{ color:'#6ee7b7' }}>{Utils.fmt(item.unitPrice)}</td>
                  <td className="text-slate-500 text-sm">{suppliers.find(s=>s.id===item.supplierId)?.name||item.supplierId}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30 transition-all">{Ic.Edit}</button>
                      <button onClick={() => del(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 transition-all">{Ic.Trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal==='add' ? '품목 추가' : '품목 수정'} maxW="max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <F label="ID" k="id" /><F label="카테고리" k="category" required />
          <div className="col-span-2"><F label="품목명" k="name" required /></div>
          <F label="단위" k="unit" /><F label="입수량(박스당)" k="boxQuantity" type="number" />
          <F label="단가(원)" k="unitPrice" type="number" />
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">거래처</label>
            <select value={form.supplierId||''} onChange={e=>setForm(p=>({...p,supplierId:e.target.value}))} className="input-base">
              <option value="">선택</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><F label="비고" k="note" /></div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={() => setModal(null)} className="btn-secondary">취소</button>
          <button onClick={save} className="btn-primary">{modal==='add' ? '등록' : '저장'}</button>
        </div>
      </Modal>
    </div>
  );
}
