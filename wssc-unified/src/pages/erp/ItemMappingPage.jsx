import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';

export default function ItemMappingPage() {
  const { st, updateSt, globalMonth, showToast } = useApp();
  const [selectedClient, setSelectedClient] = useState(null);
  const [targetMonth, setTargetMonth] = useState(globalMonth);

  const clients = [...(st.clients || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  const items = st.items || [];
  const mappings = st.mappings || [];

  const getMappedItems = (clientId) => {
    const m = mappings.find(x => x.clientId === clientId && x.month === targetMonth);
    if (m?.mappedItems?.length > 0) return m.mappedItems;
    // fallback: 가장 최근 매칭 데이터
    const all = mappings.filter(x => x.clientId === clientId).sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    return all[0]?.mappedItems || [];
  };

  const isMapped = (clientId) => {
    const m = mappings.find(x => x.clientId === clientId && x.month === targetMonth);
    return (m?.mappedItems?.length || 0) > 0;
  };

  const saveMappingForClient = (clientId, mappedItems) => {
    const list = mappings;
    const existing = list.find(x => x.clientId === clientId && x.month === targetMonth);
    if (existing) {
      updateSt('mappings', list.map(x => x.id === existing.id ? { ...x, mappedItems, updatedAt: new Date().toISOString() } : x));
    } else {
      updateSt('mappings', [...list, { id: Utils.genId(), clientId, month: targetMonth, mappedItems, updatedAt: new Date().toISOString() }]);
    }
    showToast('품목 매칭이 저장되었습니다.', 'success');
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative" style={{ minHeight: 0 }}>
      {/* 헤더 */}
      <div className="p-5 flex justify-between items-center flex-wrap gap-3 flex-none"
        style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
        <div>
          <h2 className="text-xl font-black text-white">보건소 전용 품목 매칭</h2>
          <p className="text-sm font-bold mt-1" style={{ color: '#64748b' }}>선택한 월에 맞춰 각 기관별로 마스터 품목을 매칭합니다.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-xs font-bold" style={{ color: '#64748b' }}>작업 기준월:</span>
          <input
            type="month"
            value={targetMonth}
            onChange={e => setTargetMonth(e.target.value)}
            className="border-none text-sm font-black bg-transparent outline-none"
            style={{ color: '#a5b4fc' }}
          />
        </div>
      </div>

      {/* 보건소 카드 그리드 */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {clients.length === 0 && (
          <div className="col-span-full text-center py-20 font-bold" style={{ color: '#475569' }}>보건소 데이터가 없습니다. 보건소 관리에서 먼저 등록해 주세요.</div>
        )}
        {clients.map(c => {
          const mapped = isMapped(c.id);
          const count = getMappedItems(c.id).length;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedClient(c)}
              className="group relative p-5 rounded-2xl cursor-pointer flex flex-col gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: mapped ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                border: mapped ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: mapped ? '0 4px 20px rgba(99,102,241,0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full transition-transform duration-500 group-hover:scale-150 opacity-10"
                style={{ background: mapped ? '#818cf8' : '#475569' }} />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-inner transition-colors"
                  style={{ background: mapped ? 'rgba(99,102,241,0.2)' : 'rgba(71,85,105,0.3)', color: mapped ? '#a5b4fc' : '#64748b' }}>
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[13px] truncate" style={{ color: '#e2e8f0' }}>{c.name}</h3>
                  {c.shortName && <p className="text-xs font-bold truncate" style={{ color: '#64748b' }}>{c.shortName}</p>}
                </div>
              </div>
              <div className="relative z-10 flex justify-end">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={mapped
                    ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                    : { background: 'rgba(71,85,105,0.2)', color: '#64748b', border: '1px solid rgba(71,85,105,0.3)' }}>
                  {mapped ? `✅ 매칭 완료 (${count}개)` : '⚠️ 매칭 필요'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 매칭 상세 편집 모달 */}
      {selectedClient && (
        <MappingModal
          client={selectedClient}
          month={targetMonth}
          masterItems={items}
          initialRows={getMappedItems(selectedClient.id)}
          onSave={(rows) => saveMappingForClient(selectedClient.id, rows)}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

// =========================================================================
// 매칭 편집 모달
// =========================================================================
function MappingModal({ client, month, masterItems, initialRows, onSave, onClose }) {
  const [rows, setRows] = useState(() => {
    if (initialRows?.length > 0) {
      return initialRows.map(r => ({ ...r, uid: r.uid || Utils.genId() }));
    }
    return Array(5).fill(0).map((_, i) => ({ uid: `U_${Date.now()}_${i}`, itemId: '', clientItemName: '', orderUnit: 1 }));
  });

  const saveAndClose = () => {
    onSave(rows.filter(r => r.itemId || r.clientItemName));
    onClose();
  };

  const addRow = () => setRows(prev => [{ uid: Utils.genId(), itemId: '', clientItemName: '', orderUnit: 1 }, ...prev]);
  const delRow = (uid) => setRows(prev => prev.filter(r => r.uid !== uid));
  const moveRow = (i, dir) => {
    const nx = [...rows];
    const t = dir === 'u' ? i - 1 : i + 1;
    if (t < 0 || t >= nx.length) return;
    [nx[i], nx[t]] = [nx[t], nx[i]];
    setRows(nx);
  };
  const copyRow = (r, i) => {
    const nx = [...rows];
    nx.splice(i + 1, 0, { ...r, uid: Utils.genId() });
    setRows(nx);
  };
  const loadAllItems = () => {
    const ni = masterItems.map(it => ({ uid: Utils.genId(), itemId: it.id, clientItemName: it.name, orderUnit: 1 }));
    setRows(prev => [...prev, ...ni]);
  };
  const handleExcel = () => {
    if (rows.length === 0) return alert('다운로드할 데이터가 없습니다.');
    let html = `<table><thead><tr><th>순번</th><th>마스터품목명</th><th>보건소전용명칭</th><th>단위</th><th>발주단위</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const m = masterItems.find(x => x.id === r.itemId);
      html += `<tr><td>${i + 1}</td><td class="l">${m?.name || ''}</td><td class="l">${r.clientItemName || ''}</td><td>${m?.unit || ''}</td><td>${r.orderUnit || 1}</td></tr>`;
    });
    html += '</tbody></table>';
    Utils.dlExcelCustom(html, `품목매칭_${client.shortName || client.name}_${month}`);
  };
  const updateRow = (uid, field, value) => {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: value } : r));
  };

  return (
    <div className="absolute inset-0 z-[9999] flex justify-center items-center p-4"
      style={{ background: 'rgba(5,8,20,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col w-full max-w-5xl mx-auto rounded-[2rem] shadow-2xl border max-h-[92vh]"
        style={{ background: '#0d1224', border: '1px solid rgba(99,102,241,0.25)' }}>
        {/* 모달 헤더 */}
        <div className="flex-none px-7 py-5 flex justify-between items-center flex-wrap gap-3 rounded-t-[2rem] relative"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: '#0a0f22' }}>
          <h3 className="text-xl font-black flex items-center gap-2" style={{ color: '#a5b4fc' }}>
            🏥 [{client.name}] 전용 품목 세팅
            <span className="text-sm px-3 py-1 rounded-full font-black" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{month} 기준</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={loadAllItems}
              className="px-4 py-2 rounded-xl text-xs font-black transition-colors"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              전체품목 로드
            </button>
            <button onClick={addRow}
              className="px-4 py-2 rounded-xl text-xs font-black transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }}>
              + 1줄 추가
            </button>
            <button onClick={handleExcel}
              className="px-4 py-2 rounded-xl text-xs font-black transition-colors"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>
              📥 엑셀 다운로드
            </button>
          </div>
          <button onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>✕</button>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto p-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
            <table className="w-full text-[12px] whitespace-nowrap text-center table-fixed">
              <thead className="sticky top-0 z-10" style={{ background: '#0a0f22' }}>
                <tr>
                  <th className="p-3 w-12 font-black" style={{ color: '#64748b', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>순번</th>
                  <th className="p-3 w-[28%] font-black" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(99,102,241,0.2)', borderLeft: '1px solid rgba(99,102,241,0.15)', borderRight: '1px solid rgba(99,102,241,0.15)' }}>마스터품목 검색</th>
                  <th className="p-3 w-[30%] font-black" style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.05)', borderBottom: '1px solid rgba(99,102,241,0.2)', borderRight: '1px solid rgba(99,102,241,0.15)' }}>보건소 전용명칭 (납품서용)</th>
                  <th className="p-3 w-[8%] font-black" style={{ color: '#94a3b8', borderBottom: '1px solid rgba(99,102,241,0.2)', borderRight: '1px solid rgba(99,102,241,0.15)' }}>단위</th>
                  <th className="p-3 w-[10%] font-black" style={{ color: '#a5b4fc', borderBottom: '1px solid rgba(99,102,241,0.2)', borderRight: '1px solid rgba(99,102,241,0.15)' }}>발주단위</th>
                  <th className="p-3 font-black" style={{ color: '#64748b', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const master = masterItems.find(x => x.id === r.itemId);
                  return (
                    <tr key={r.uid} style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                      className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2 font-bold" style={{ color: '#475569' }}>{i + 1}</td>
                      <td className="p-2" style={{ background: 'rgba(251,191,36,0.03)', borderLeft: '1px solid rgba(99,102,241,0.1)', borderRight: '1px solid rgba(99,102,241,0.1)' }}>
                        <ItemSearchInput
                          masterItems={masterItems}
                          initialValue={master?.name || ''}
                          onSelect={it => updateRow(r.uid, 'itemId', it.id)}
                        />
                      </td>
                      <td className="p-2" style={{ background: 'rgba(96,165,250,0.03)', borderRight: '1px solid rgba(99,102,241,0.1)' }}>
                        <input
                          type="text"
                          value={r.clientItemName || ''}
                          onChange={e => updateRow(r.uid, 'clientItemName', e.target.value)}
                          placeholder="납품서에 표시될 이름"
                          className="w-full px-2 py-1.5 font-black text-[11px] rounded outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid transparent', color: '#93c5fd' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(96,165,250,0.4)'}
                          onBlur={e => e.target.style.borderColor = 'transparent'}
                        />
                      </td>
                      <td className="p-2 font-bold" style={{ color: '#64748b', borderRight: '1px solid rgba(99,102,241,0.1)' }}>{master?.unit || '-'}</td>
                      <td className="p-2" style={{ borderRight: '1px solid rgba(99,102,241,0.1)' }}>
                        <input
                          type="number"
                          min="0"
                          value={r.orderUnit ?? 1}
                          onChange={e => updateRow(r.uid, 'orderUnit', Number(e.target.value))}
                          className="w-full px-1 py-1.5 font-black text-center rounded outline-none"
                          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid transparent', color: '#a5b4fc' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                          onBlur={e => e.target.style.borderColor = 'transparent'}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => moveRow(i, 'u')} title="위로"
                            className="w-6 h-6 rounded text-xs font-black transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>↑</button>
                          <button onClick={() => moveRow(i, 'd')} title="아래로"
                            className="w-6 h-6 rounded text-xs font-black transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>↓</button>
                          <button onClick={() => copyRow(r, i)} title="복사"
                            className="w-6 h-6 rounded text-xs font-black transition-colors"
                            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>⎘</button>
                          <button onClick={() => delRow(r.uid)} title="삭제"
                            className="w-6 h-6 rounded text-xs font-black transition-colors"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-sm font-bold" style={{ color: '#475569' }}>+ 1줄 추가 버튼으로 품목을 추가하세요</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex-none px-7 py-4 flex justify-between items-center rounded-b-[2rem]"
          style={{ borderTop: '1px solid rgba(99,102,241,0.15)', background: '#0a0f22' }}>
          <span className="text-sm font-bold" style={{ color: '#475569' }}>
            총 <span className="font-black" style={{ color: '#a5b4fc' }}>{rows.length}</span>개 품목 설정 중
          </span>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-black transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              취소 (저장안함)
            </button>
            <button onClick={saveAndClose}
              className="px-8 py-2.5 text-white font-black rounded-xl text-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
              ✅ 저장 후 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 품목 검색 인풋 (자동완성)
// =========================================================================
function ItemSearchInput({ masterItems, initialValue, onSelect }) {
  const [query, setQuery] = useState(initialValue || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(initialValue || ''); }, [initialValue]);

  const filtered = query.length > 0
    ? masterItems.filter(it => (it.name || '').includes(query) || (it.category || '').includes(query)).slice(0, 15)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="품목명 검색..."
        className="w-full px-2 py-1.5 font-black text-[11px] rounded outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid transparent', color: '#e2e8f0' }}
        onFocusCapture={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'}
        onBlurCapture={e => e.target.style.borderColor = 'transparent'}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[99999] rounded-xl shadow-xl max-h-48 overflow-auto mt-1"
          style={{ background: '#0d1224', border: '1px solid rgba(251,191,36,0.3)' }}>
          {filtered.map(it => (
            <div
              key={it.id}
              onMouseDown={() => { onSelect(it); setQuery(it.name); setOpen(false); }}
              className="px-3 py-2 cursor-pointer text-left text-[11px] font-bold flex justify-between transition-colors hover:bg-white/[0.04]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#e2e8f0' }}>{it.name}</span>
              <span className="text-[10px]" style={{ color: '#64748b' }}>{it.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
