import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const COLOR_OPTIONS = [
  { key: 'blue',    label: '파랑',  dot: 'bg-blue-500',    ring: 'ring-blue-500',    hex: '#3b82f6' },
  { key: 'emerald', label: '초록',  dot: 'bg-emerald-500', ring: 'ring-emerald-500', hex: '#10b981' },
  { key: 'amber',   label: '노랑',  dot: 'bg-amber-500',   ring: 'ring-amber-500',   hex: '#f59e0b' },
  { key: 'rose',    label: '빨강',  dot: 'bg-rose-500',    ring: 'ring-rose-500',    hex: '#f43f5e' },
  { key: 'violet',  label: '보라',  dot: 'bg-violet-500',  ring: 'ring-violet-500',  hex: '#8b5cf6' },
  { key: 'cyan',    label: '하늘',  dot: 'bg-cyan-500',    ring: 'ring-cyan-500',    hex: '#06b6d4' },
];

const BLOCK_COLORS = {
  blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500',
};

const EMPTY_FORM = { name: '', color: 'blue', driverId: '', note: '' };

// 거래처 ID를 해시하여 결정론적 좌표 생성 (원본 방식 그대로)
const generateMockCoords = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = 10 + (Math.abs(hash) % 80);
  const y = 10 + (Math.abs(hash >> 8) % 80);
  return { x, y };
};

export default function DeliveryBlocksPage() {
  const { st, updateSt, showToast, showConfirm } = useApp();

  const [selBlockId, setSelBlockId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [clientSearch, setClientSearch] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);

  const drivers = useMemo(() =>
    (st.users || []).filter(u => u.role === 'driver' || u.role === 'logistics'),
    [st.users]
  );

  const selBlock = useMemo(() =>
    (st.deliveryBlocks || []).find(b => b.id === selBlockId),
    [st.deliveryBlocks, selBlockId]
  );

  const blockClients = useMemo(() => {
    if (!selBlock) return [];
    return (selBlock.clientIds || []).map(cId =>
      (st.clients || []).find(c => c.id === cId)
    ).filter(Boolean);
  }, [selBlock, st.clients]);

  // SVG 지도용 좌표 + 블럭 색상
  const mapNodes = useMemo(() => {
    if (!selBlock) return [];
    const colorHex = COLOR_OPTIONS.find(c => c.key === selBlock.color)?.hex || '#6366f1';
    return blockClients.map((c, i) => ({
      ...c,
      idx: i,
      coords: generateMockCoords(c.id),
      color: colorHex,
    }));
  }, [selBlock, blockClients]);

  const unassignedClients = useMemo(() => {
    if (!selBlock) return [];
    const assignedIds = new Set(selBlock.clientIds || []);
    return (st.clients || [])
      .filter(c => !assignedIds.has(c.id))
      .filter(c => !clientSearch ||
        (c.name || '').includes(clientSearch) ||
        (c.shortName || '').includes(clientSearch)
      );
  }, [selBlock, st.clients, clientSearch]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (b) => {
    setForm({ name: b.name, color: b.color || 'blue', driverId: b.driverId || '', note: b.note || '' });
    setEditId(b.id);
    setShowForm(true);
  };

  const saveBlock = () => {
    if (!form.name.trim()) return showToast('블럭명을 입력해주세요.', 'warn');
    if (editId) {
      updateSt('deliveryBlocks', (st.deliveryBlocks || []).map(b =>
        b.id === editId ? { ...b, ...form, name: form.name.trim() } : b
      ));
      showToast('수정되었습니다.', 'success');
    } else {
      const newBlock = { id: Utils.genId(), ...form, name: form.name.trim(), clientIds: [] };
      updateSt('deliveryBlocks', [...(st.deliveryBlocks || []), newBlock]);
      showToast('배송블럭이 추가되었습니다.', 'success');
      setSelBlockId(newBlock.id);
    }
    setShowForm(false);
  };

  const deleteBlock = (id) => {
    showConfirm('이 배송블럭을 삭제하시겠습니까?', () => {
      updateSt('deliveryBlocks', (st.deliveryBlocks || []).filter(b => b.id !== id));
      if (selBlockId === id) setSelBlockId(null);
      showToast('삭제되었습니다.', 'success');
    });
  };

  const updateBlockClients = (blockId, clientIds) => {
    updateSt('deliveryBlocks', (st.deliveryBlocks || []).map(b =>
      b.id === blockId ? { ...b, clientIds } : b
    ));
  };

  const addClient = (clientId) => {
    if (!selBlock) return;
    updateBlockClients(selBlock.id, [...(selBlock.clientIds || []), clientId]);
  };

  const removeClient = (clientId) => {
    if (!selBlock) return;
    updateBlockClients(selBlock.id, (selBlock.clientIds || []).filter(id => id !== clientId));
  };

  const moveUp = (idx) => {
    if (!selBlock || idx === 0) return;
    const arr = [...(selBlock.clientIds || [])];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    updateBlockClients(selBlock.id, arr);
  };

  const moveDown = (idx) => {
    if (!selBlock) return;
    const arr = [...(selBlock.clientIds || [])];
    if (idx >= arr.length - 1) return;
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    updateBlockClients(selBlock.id, arr);
  };

  const handleDragStart = (idx) => setDragging(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragging === null || dragging === idx || !selBlock) return;
    const arr = [...(selBlock.clientIds || [])];
    const [moved] = arr.splice(dragging, 1);
    arr.splice(idx, 0, moved);
    updateBlockClients(selBlock.id, arr);
    setDragging(null);
    setDragOver(null);
  };

  // AI 최적경로 — Nearest Neighbor TSP (원본 방식 그대로)
  const runAI = () => {
    if (!selBlock || blockClients.length <= 1) {
      return showToast('거래처가 2개 이상이어야 AI 정렬이 가능합니다.', 'warn');
    }
    showToast('AI가 거리 기반 최적 경로를 계산합니다...', 'info');
    setAiRunning(true);

    setTimeout(() => {
      const nodes = blockClients.map(c => ({ id: c.id, coords: generateMockCoords(c.id) }));
      const unvisited = [...nodes];
      const start = unvisited.shift();
      const sorted = [start];
      let current = start;

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
          const dx = unvisited[i].coords.x - current.coords.x;
          const dy = unvisited[i].coords.y - current.coords.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) { minDist = dist; nearestIdx = i; }
        }
        current = unvisited[nearestIdx];
        sorted.push(current);
        unvisited.splice(nearestIdx, 1);
      }

      updateBlockClients(selBlock.id, sorted.map(n => n.id));
      setAiRunning(false);
      showToast('AI 경로 최적화가 완료되었습니다.', 'success');
    }, 800);
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-white">배송 블럭 / 순번 관리</h1>
        <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5">
          {Ic.Plus} 블럭 추가
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* ─ 블럭 목록 ─ */}
        <div className="xl:col-span-1 space-y-2">
          <div className="text-xs font-black text-slate-400 mb-2">배송 블럭 목록</div>
          {(st.deliveryBlocks || []).length === 0 && (
            <div className="card text-center py-8 text-slate-500 text-sm">
              블럭을 추가해주세요.
            </div>
          )}
          {(st.deliveryBlocks || []).map(b => {
            const driver = (st.users || []).find(u => u.id === b.driverId);
            const isSel = selBlockId === b.id;
            return (
              <div key={b.id}
                onClick={() => setSelBlockId(b.id)}
                className={`card cursor-pointer transition-all border ${isSel ? 'border-indigo-500 bg-indigo-900/10' : 'border-slate-700 hover:border-slate-500'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${BLOCK_COLORS[b.color] || 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-sm">{b.name}</div>
                    <div className="text-xs text-slate-400">
                      {driver?.name || '미배정'} · {b.clientIds?.length || 0}개소
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(b)} className="text-slate-400 hover:text-white p-1">{Ic.Edit}</button>
                    <button onClick={() => deleteBlock(b.id)} className="text-rose-400 hover:text-rose-300 p-1">{Ic.Trash}</button>
                  </div>
                </div>
                {b.note && <div className="text-xs text-slate-500 mt-1 pl-6">{b.note}</div>}
              </div>
            );
          })}
        </div>

        {/* ─ 우측: SVG 지도 + 순번 관리 ─ */}
        {selBlock ? (
          <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SVG 지도 */}
            <div className="card flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-black text-slate-400">경로 시각화 지도</div>
                <button onClick={runAI} disabled={aiRunning || blockClients.length < 2}
                  className="text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 transition-colors">
                  {Ic.Map}
                  {aiRunning ? 'AI 계산중...' : 'AI 최적거리 정렬'}
                </button>
              </div>

              {/* SVG 캔버스 */}
              <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden min-h-64">
                {/* 격자 배경 */}
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }} />

                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                    </marker>
                  </defs>
                  {/* 경로 화살표 */}
                  {mapNodes.map((node, i) => {
                    if (i === mapNodes.length - 1) return null;
                    const next = mapNodes[i + 1];
                    return (
                      <line key={`line-${i}`}
                        x1={`${node.coords.x}%`} y1={`${node.coords.y}%`}
                        x2={`${next.coords.x}%`} y2={`${next.coords.y}%`}
                        stroke="#475569" strokeWidth="2" strokeDasharray="5 4"
                        markerEnd="url(#arrowhead)" />
                    );
                  })}
                </svg>

                {/* 거래처 핀 */}
                {mapNodes.map((node, i) => (
                  <div key={node.id}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${node.coords.x}%`, top: `${node.coords.y}%` }}>
                    <div
                      className="w-8 h-8 rounded-full text-white shadow-lg border-2 border-white/30 flex items-center justify-center font-black text-xs cursor-pointer hover:scale-125 transition-transform"
                      style={{ backgroundColor: node.color }}>
                      {i + 1}
                    </div>
                    <div className="mt-1 whitespace-nowrap bg-slate-800/90 text-slate-200 text-[9px] px-1.5 py-0.5 rounded shadow-md font-bold border border-slate-700">
                      {node.shortName || node.name}
                    </div>
                  </div>
                ))}

                {mapNodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm font-bold">
                    거래처를 추가하면 지도에 표시됩니다
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-500 text-center">
                ※ 위치는 시각화 목적의 모의 좌표입니다
              </div>
            </div>

            {/* 순번 관리 패널 */}
            <div className="space-y-4">
              {/* 배송 순번 */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${BLOCK_COLORS[selBlock.color] || 'bg-slate-500'}`} />
                    {selBlock.name} 배송 순번
                  </div>
                  <span className="text-xs text-slate-500">{blockClients.length}개소</span>
                </div>

                <p className="text-[10px] text-slate-500 mb-3">
                  항목을 <strong className="text-indigo-400">드래그</strong>해서 순번 변경 가능
                </p>

                {blockClients.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    아래에서 거래처를 추가해주세요.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {blockClients.map((client, idx) => (
                      <div key={client.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-grab
                          ${dragOver === idx ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 bg-slate-700/30 hover:bg-slate-700/50'}
                          ${dragging === idx ? 'opacity-50 scale-95' : ''}`}>
                        <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-black text-slate-200 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm font-bold text-slate-200 truncate">
                          {client.shortName || client.name}
                        </span>
                        <div className="flex gap-0.5">
                          <button onClick={() => moveUp(idx)} className="text-slate-500 hover:text-white p-1">{Ic.ChevU}</button>
                          <button onClick={() => moveDown(idx)} className="text-slate-500 hover:text-white p-1">{Ic.ChevD}</button>
                          <button onClick={() => removeClient(client.id)} className="text-rose-400 hover:text-rose-300 p-1">{Ic.X}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 미배정 거래처 추가 */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black text-slate-400">거래처 추가</div>
                  <input
                    type="text"
                    placeholder="검색..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="input-base text-sm w-28"
                  />
                </div>
                {unassignedClients.length === 0 ? (
                  <div className="text-center py-3 text-slate-500 text-xs">
                    {clientSearch ? '검색 결과 없음' : '모든 거래처 배정 완료'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {unassignedClients.map(c => (
                      <button key={c.id} onClick={() => addClient(c.id)}
                        className="text-left px-2 py-1.5 bg-slate-700/30 hover:bg-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
                        {Ic.Plus}
                        <span className="truncate">{c.shortName || c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-3 card flex items-center justify-center py-16 text-slate-500">
            좌측에서 배송 블럭을 선택해주세요.
          </div>
        )}
      </div>

      {/* 블럭 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">
              {editId ? '블럭 수정' : '배송 블럭 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">블럭명</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예) 강남 A구역"
                  className="input-base w-full" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">색상</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} onClick={() => setForm(f => ({ ...f, color: c.key }))}
                      className={`w-8 h-8 rounded-full ${c.dot} transition-all ${form.color === c.key ? `ring-2 ring-offset-2 ring-offset-slate-800 ${c.ring}` : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">기본 기사</label>
                <select value={form.driverId}
                  onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                  className="input-base w-full">
                  <option value="">-- 미배정 --</option>
                  {drivers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">메모</label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="선택 입력"
                  className="input-base w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveBlock} className="btn-primary flex-1">저장</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
