import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Utils } from '../Utils';

// =========================================================================
// 보건소 품목 매칭 메인 페이지
// 오리지널 wssc-erp-v2 로직 100% 이식
// =========================================================================
export default function OrderMatching() {
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [mappings, setMappings] = useState({}); // { clientId: { month: '', mappedItems: [] } }
  const [selectedClient, setSelectedClient] = useState(null);
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  // 실시간 DB 연동
  useEffect(() => {
    const unsubC = onSnapshot(collection(db, 'clients'), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });
    const unsubI = onSnapshot(collection(db, 'items'), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubM = onSnapshot(collection(db, 'mappings'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setMappings(map);
      setLoading(false);
    });
    return () => { unsubC(); unsubI(); unsubM(); };
  }, []);

  const saveMappingForClient = async (clientId, month, mappedItems) => {
    try {
      const docId = `${clientId}_${month}`;
      await setDoc(doc(db, 'mappings', docId), { clientId, month, mappedItems, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('매칭 저장 오류:', e);
    }
  };

  const getMappedItemsForClient = (clientId) => {
    // 해당 월 우선, 없으면 가장 최근 월 데이터
    const docId = `${clientId}_${targetMonth}`;
    if (mappings[docId]?.mappedItems?.length > 0) return mappings[docId].mappedItems;
    // fallback: 가장 최근 매칭 데이터
    const clientMaps = Object.values(mappings).filter(m => m.clientId === clientId).sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    return clientMaps[0]?.mappedItems || [];
  };

  const isMapped = (clientId) => getMappedItemsForClient(clientId).length > 0;

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">데이터 불러오는 중...</div>;

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      {/* 헤더 */}
      <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center flex-wrap gap-3 flex-none">
        <div>
          <h2 className="text-2xl font-black text-slate-800">보건소 전용 품목 매칭</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">선택한 월에 맞춰 각 기관별로 마스터 품목을 매칭합니다.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500">작업 기준월:</span>
          <input
            type="month"
            value={targetMonth}
            onChange={e => setTargetMonth(e.target.value)}
            className="border-none text-sm font-black text-purple-700 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* 보건소 카드 그리드 */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {clients.map(c => {
          const mapped = isMapped(c.id);
          const count = getMappedItemsForClient(c.id).length;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedClient(c)}
              className={`group relative p-5 rounded-2xl shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col gap-3 overflow-hidden ${
                mapped
                  ? 'bg-white border-purple-300 ring-1 ring-purple-100'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full transition-transform duration-500 group-hover:scale-150 opacity-20 ${mapped ? 'bg-purple-200' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-inner transition-colors ${mapped ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[13px] text-slate-800 truncate">{c.name}</h3>
                  {c.shortName && <p className="text-xs text-slate-400 font-bold truncate">{c.shortName}</p>}
                </div>
              </div>
              <div className="relative z-10 flex justify-end">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                  mapped
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
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
          initialRows={getMappedItemsForClient(selectedClient.id)}
          onSave={(rows) => saveMappingForClient(selectedClient.id, targetMonth, rows)}
          onClose={() => setSelectedClient(null)}
          allItems={items}
        />
      )}
    </div>
  );
}

// =========================================================================
// 매칭 편집 모달
// =========================================================================
function MappingModal({ client, month, masterItems, initialRows, onSave, onClose, allItems }) {
  const [rows, setRows] = useState(() => {
    if (initialRows?.length > 0) {
      return initialRows.map(r => ({ ...r, uid: r.uid || `U_${Date.now()}_${Math.random()}` }));
    }
    return Array(5).fill(0).map((_, i) => ({ uid: `U_${Date.now()}_${i}`, itemId: '', clientItemName: '', orderUnit: 1 }));
  });

  const saveAndClose = () => {
    onSave(rows.filter(r => r.itemId || r.clientItemName));
    onClose();
  };

  const addRow = () => setRows(prev => [{ uid: `U_${Date.now()}_${Math.random()}`, itemId: '', clientItemName: '', orderUnit: 1 }, ...prev]);
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
    nx.splice(i + 1, 0, { ...r, uid: `U_${Date.now()}_${Math.random()}` });
    setRows(nx);
  };
  const loadAllItems = () => {
    const ni = allItems.map(it => ({ uid: `L_${Date.now()}_${it.id}`, itemId: it.id, clientItemName: it.name, orderUnit: 1 }));
    setRows(prev => [...prev, ...ni]);
  };
  const handleExcel = () => {
    if (rows.length === 0) return alert('다운로드할 데이터가 없습니다.');
    let html = `<table><thead><tr><th>순번</th><th>마스터품목명</th><th>보건소전용명칭</th><th>단위</th><th>발주단위</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const m = masterItems.find(x => x.id === r.itemId);
      html += `<tr><td class="c">${i + 1}</td><td class="l">${m?.name || ''}</td><td class="l">${r.clientItemName || ''}</td><td class="c">${m?.unit || ''}</td><td class="c">${r.orderUnit || 1}</td></tr>`;
    });
    html += '</tbody></table>';
    Utils.dlExcelCustom(html, `품목매칭_${client.shortName || client.name}_${month}`);
  };
  const updateRow = (uid, field, value) => {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: value } : r));
  };

  return (
    <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white flex flex-col w-full max-w-5xl mx-auto rounded-[2rem] shadow-2xl border border-slate-200 max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="flex-none px-7 py-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3 rounded-t-[2rem] bg-white">
          <h3 className="text-xl font-black text-purple-700 flex items-center gap-2">
            🏥 [{client.name}] 전용 품목 세팅
            <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-black">{month} 기준</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={loadAllItems} className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black border border-purple-200 transition-colors">
              전체품목 로드
            </button>
            <button onClick={addRow} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition-colors">
              + 1줄 추가
            </button>
            <button onClick={handleExcel} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black border border-emerald-200 transition-colors">
              📥 엑셀 다운로드
            </button>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full hover:text-rose-600 hover:bg-rose-50 transition-colors">✕</button>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-[12px] whitespace-nowrap text-center table-fixed">
              <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 border-b">
                <tr>
                  <th className="p-3 w-12 font-black text-slate-600">순번</th>
                  <th className="p-3 w-[28%] bg-yellow-50 text-yellow-800 border-l border-r font-black">마스터품목 검색</th>
                  <th className="p-3 w-[30%] bg-blue-50 text-blue-800 border-r font-black">보건소 전용명칭 (납품서용)</th>
                  <th className="p-3 w-[8%] border-r font-black text-slate-600">단위</th>
                  <th className="p-3 w-[10%] text-purple-700 border-r font-black">발주단위</th>
                  <th className="p-3 font-black text-slate-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const master = masterItems.find(x => x.id === r.itemId);
                  return (
                    <tr key={r.uid} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-slate-400 font-bold">{i + 1}</td>
                      <td className="p-2 bg-yellow-50/30 border-l border-r">
                        <ItemSearchInput
                          masterItems={masterItems}
                          initialValue={master?.name || ''}
                          onSelect={it => updateRow(r.uid, 'itemId', it.id)}
                        />
                      </td>
                      <td className="p-2 bg-blue-50/30 border-r">
                        <input
                          type="text"
                          value={r.clientItemName || ''}
                          onChange={e => updateRow(r.uid, 'clientItemName', e.target.value)}
                          placeholder="납품서에 표시될 이름"
                          className="w-full px-2 py-1.5 text-blue-800 font-black border border-transparent focus:border-blue-300 rounded text-[11px] bg-white shadow-sm outline-none"
                        />
                      </td>
                      <td className="p-2 text-slate-600 font-bold border-r">{master?.unit || '-'}</td>
                      <td className="p-2 border-r">
                        <input
                          type="number"
                          min="0"
                          value={r.orderUnit ?? 1}
                          onChange={e => updateRow(r.uid, 'orderUnit', Number(e.target.value))}
                          className="w-full px-1 py-1.5 text-purple-700 font-black text-center border border-transparent focus:border-purple-300 rounded bg-purple-50/30 shadow-sm outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => moveRow(i, 'u')} title="위로" className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-xs font-black transition-colors">↑</button>
                          <button onClick={() => moveRow(i, 'd')} title="아래로" className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-xs font-black transition-colors">↓</button>
                          <button onClick={() => copyRow(r, i)} title="복사" className="w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded text-xs font-black text-blue-700 transition-colors">⎘</button>
                          <button onClick={() => delRow(r.uid)} title="삭제" className="w-6 h-6 bg-rose-100 hover:bg-rose-200 rounded text-xs font-black text-rose-600 transition-colors">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-slate-400 text-sm font-bold">+ 1줄 추가 버튼으로 품목을 추가하세요</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex-none px-7 py-4 border-t border-slate-100 flex justify-between items-center bg-white rounded-b-[2rem]">
          <span className="text-sm font-bold text-slate-500">총 <span className="text-purple-700 font-black">{rows.length}</span>개 품목 설정 중</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-sm transition-colors">취소 (저장안함)</button>
            <button onClick={saveAndClose} className="px-8 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white font-black rounded-xl text-sm shadow-md hover:opacity-90 transition-opacity">
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
        className="w-full px-2 py-1.5 text-slate-800 font-black border border-transparent focus:border-yellow-400 rounded text-[11px] bg-white shadow-sm outline-none"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[99999] bg-white border border-yellow-300 rounded-xl shadow-xl max-h-48 overflow-auto mt-1">
          {filtered.map(it => (
            <div
              key={it.id}
              onMouseDown={() => { onSelect(it); setQuery(it.name); setOpen(false); }}
              className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-left text-[11px] font-bold flex justify-between border-b border-slate-50"
            >
              <span className="text-slate-800">{it.name}</span>
              <span className="text-slate-400 text-[10px]">{it.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
