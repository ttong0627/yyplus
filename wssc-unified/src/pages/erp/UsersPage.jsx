import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';
import Modal from '../../components/common/Modal';

const ROLES = ['admin','office','logistics','driver'];
const ROLE_LABEL = { admin:'관리자', office:'사무직', logistics:'물류팀', driver:'기사' };
const ROLE_COLORS = {
  admin:     { bg:'rgba(244,63,94,0.15)',    text:'#fb7185', border:'rgba(244,63,94,0.30)' },
  office:    { bg:'rgba(99,102,241,0.15)',   text:'#a5b4fc', border:'rgba(99,102,241,0.30)' },
  logistics: { bg:'rgba(245,158,11,0.15)',  text:'#fcd34d', border:'rgba(245,158,11,0.30)' },
  driver:    { bg:'rgba(16,185,129,0.15)',  text:'#6ee7b7', border:'rgba(16,185,129,0.30)' },
};
const EMPTY = { id:'', password:'', name:'', role:'office', contact:'', jobType:'', vehicle:'', note:'' };

export default function UsersPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [origPwd, setOrigPwd] = useState('');   // 편집 시 기존 해시 보관
  const [origHashed, setOrigHashed] = useState(false);

  const users = st.users || [];

  const openAdd = () => {
    setForm({...EMPTY}); setOrigPwd(''); setOrigHashed(false); setShowPwd(false); setModal('add');
  };
  const openEdit = (u) => {
    setOrigPwd(u.password || ''); setOrigHashed(!!u.hashed);
    setForm({...u, password:''}); // 비밀번호 필드 비워두기 (변경 시에만 입력)
    setShowPwd(false); setModal('edit');
  };

  const save = async () => {
    if (!form.id || !form.name) return showToast('ID, 이름은 필수입니다.', 'error');
    if (modal==='add' && !form.password) return showToast('비밀번호는 필수입니다.', 'error');
    if (modal==='add' && users.find(u=>u.id===form.id)) return showToast('이미 존재하는 ID입니다.', 'error');

    let saved = {...form};
    if (modal==='add') {
      saved.password = await Utils.hashPw(form.password);
      saved.hashed = true;
    } else if (form.password) {
      // 새 비밀번호 입력됨 → 해시 후 저장
      saved.password = await Utils.hashPw(form.password);
      saved.hashed = true;
    } else {
      // 변경 없음 → 기존 비밀번호 유지
      saved.password = origPwd;
      saved.hashed = origHashed;
    }

    if (modal==='add') {
      updateSt('users', [...users, saved]);
      showToast('사용자가 등록되었습니다.', 'success');
    } else {
      updateSt('users', users.map(u=>u.id===form.id ? saved : u));
      showToast('사용자 정보가 수정되었습니다.', 'success');
    }
    setModal(null);
  };

  const del = (u) => showConfirm(`[${u.name}] 사용자를 삭제하시겠습니까?`, () => {
    updateSt('users', users.filter(x=>x.id!==u.id));
    showToast('삭제되었습니다.', 'success');
  });

  const dlExcel = () => {
    const rows = users.map(u => `<tr>
      <td>${u.id||''}</td><td>${u.name||''}</td>
      <td>${ROLE_LABEL[u.role]||u.role||''}</td>
      <td>${u.contact||''}</td><td>${u.jobType||''}</td><td>${u.vehicle||''}</td>
    </tr>`).join('');
    Utils.dlExcel(`<table><thead><tr><th>아이디</th><th>이름</th><th>권한</th><th>연락처</th><th>직책</th><th>차량</th></tr></thead><tbody>${rows}</tbody></table>`, '사용자목록');
  };

  const F = ({ label, k, type='text', opts }) => (
    <div>
      <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">{label}</label>
      {opts ? (
        <select value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="input-base">
          {opts.map(o=><option key={o} value={o}>{ROLE_LABEL[o]||o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="input-base" />
      )}
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">사용자 관리</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">{Ic.Plus} 사용자 추가</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500 font-bold">총 {users.length}명</span>
          <button onClick={dlExcel} disabled={users.length===0}
            className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40">
            {Ic.Down} 엑셀
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>아이디</th><th>이름</th><th>권한</th><th>연락처</th><th>직책</th><th>차량</th><th className="w-20">관리</th></tr>
            </thead>
            <tbody>
              {users.length===0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600">등록된 사용자가 없습니다.</td></tr>
              ) : users.map(u => {
                const rc = ROLE_COLORS[u.role] || ROLE_COLORS.office;
                return (
                  <tr key={u.id}>
                    <td className="font-mono text-slate-300">{u.id}</td>
                    <td className="font-black text-white">{u.name}</td>
                    <td>
                      <span className="badge" style={{ background:rc.bg, color:rc.text, border:`1px solid ${rc.border}` }}>
                        {ROLE_LABEL[u.role]||u.role}
                      </span>
                    </td>
                    <td className="text-slate-400 text-sm">{u.contact}</td>
                    <td className="text-slate-400 text-sm">{u.jobType}</td>
                    <td className="text-slate-400 text-sm">{u.vehicle}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30 transition-all">{Ic.Edit}</button>
                        <button onClick={() => del(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 transition-all">{Ic.Trash}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal==='add' ? '사용자 추가' : '사용자 수정'} maxW="max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <F label="아이디 *" k="id" />
          <F label="이름 *" k="name" />
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wide">
              비밀번호{modal==='edit' ? ' (변경 시에만 입력)' : ' *'}
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password||''}
                onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                className="input-base pr-12"
                placeholder={modal==='edit' ? '변경 시에만 입력' : ''}
              />
              <button type="button" onClick={() => setShowPwd(p=>!p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors">
                {showPwd ? '숨김' : '표시'}
              </button>
            </div>
          </div>
          <F label="권한" k="role" opts={ROLES} />
          <F label="연락처" k="contact" />
          <F label="직책" k="jobType" />
          <F label="차량번호" k="vehicle" />
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
