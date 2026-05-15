import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function RosterPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedClient, setSelectedClient] = useState('');
  const [round, setRound] = useState(1);

  const clients = st.clients || [];
  const rosters = st.rosters || [];

  const roster = useMemo(() =>
    rosters.find(r => r.clientId === selectedClient && r.month === globalMonth && r.round === round),
    [rosters, selectedClient, globalMonth, round]
  );

  const members = roster?.members || [];

  const handlePaste = (e) => {
    e.preventDefault();
    const rows = Utils.parseClip(e);
    if (!rows.length) return;
    const newMembers = rows.filter(r => r.length >= 2 && r[0]).map(r => ({
      name: r[0] || '', contact: r[1] || '', address: r[2] || '', packageType: r[3] || '', note: r[4] || ''
    }));
    const list = [...rosters];
    const existing = list.find(r => r.clientId === selectedClient && r.month === globalMonth && r.round === round);
    if (existing) {
      updateSt('rosters', list.map(r => (r.clientId === selectedClient && r.month === globalMonth && r.round === round)
        ? {...r, members: [...(r.members||[]), ...newMembers]} : r));
    } else {
      list.push({ id:`R${Date.now()}`, clientId:selectedClient, month:globalMonth, round, members:newMembers });
      updateSt('rosters', list);
    }
    showToast(`${newMembers.length}명 추가되었습니다.`, 'success');
  };

  const clearAll = () => {
    updateSt('rosters', rosters.filter(r => !(r.clientId === selectedClient && r.month === globalMonth && r.round === round)));
    showToast('명단이 초기화되었습니다.', 'success');
  };

  const dlExcel = () => {
    if (!members.length) return;
    const client = clients.find(c => c.id === selectedClient);
    let html = `<table><tr><th>No</th><th>성명</th><th>연락처</th><th>주소</th><th>패키지유형</th><th>비고</th></tr>`;
    members.forEach((m,i) => { html += `<tr><td>${i+1}</td><td>${m.name}</td><td>${m.contact}</td><td>${m.address}</td><td>${m.packageType}</td><td>${m.note}</td></tr>`; });
    html += '</table>';
    Utils.dlExcel(html, `명단_${client?.shortName || selectedClient}_${globalMonth}_${round}차`);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-black text-white">명단 관리 — {globalMonth}</h1>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input-base w-64">
            <option value="">보건소 선택</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1">
            {[1,2].map(r => <button key={r} onClick={() => setRound(r)}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${round===r ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{r}차</button>)}
          </div>
          {selectedClient && members.length > 0 && (
            <>
              <button onClick={dlExcel} className="btn-secondary flex items-center gap-1.5">{Ic.Down} 엑셀 다운로드</button>
              <button onClick={clearAll} className="btn-danger flex items-center gap-1.5 text-xs">{Ic.Trash} 전체 초기화</button>
            </>
          )}
        </div>

        {selectedClient && (
          <div className="mb-4 p-4 bg-slate-900/50 border border-dashed border-slate-600 rounded-xl">
            <p className="text-xs font-bold text-slate-400 mb-2">엑셀에서 명단을 복사한 뒤 아래 영역에 붙여넣기 하세요.</p>
            <p className="text-xs text-slate-500 mb-2">컬럼 순서: 성명 | 연락처 | 주소 | 패키지유형 | 비고</p>
            <textarea onPaste={handlePaste} className="input-base h-20 text-xs" placeholder="여기에 붙여넣기 (Ctrl+V)..." readOnly />
          </div>
        )}

        {!selectedClient ? (
          <p className="text-slate-500 text-sm text-center py-8">보건소를 선택하세요.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-400">총 <span className="text-white">{members.length}</span>명</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>No</th><th>성명</th><th>연락처</th><th>주소</th><th>패키지유형</th><th>비고</th></tr></thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">명단이 없습니다. 엑셀에서 복사 후 붙여넣기 해주세요.</td></tr>
                  ) : members.map((m,i) => (
                    <tr key={i}>
                      <td className="text-slate-400 text-center">{i+1}</td>
                      <td className="font-bold text-white">{m.name}</td>
                      <td className="text-slate-400">{m.contact}</td>
                      <td className="text-slate-400 text-sm">{m.address}</td>
                      <td><span className="badge bg-indigo-900/50 text-indigo-300 text-xs">{m.packageType}</span></td>
                      <td className="text-slate-400 text-sm">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
