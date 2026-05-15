import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function ItemMappingPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedClient, setSelectedClient] = useState('');
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState([]);

  const clients = st.clients || [];
  const items = useMemo(() => Utils.sortItems(st.items || [], st.categorySortOrder || []), [st.items, st.categorySortOrder]);

  const mapping = useMemo(() =>
    (st.mappings || []).find(m => m.clientId === selectedClient && m.month === globalMonth),
    [st.mappings, selectedClient, globalMonth]
  );

  const startEdit = () => {
    const rows = items.map(item => {
      const existing = mapping?.mappedItems?.find(m => m.itemId === item.id);
      return {
        uid: existing?.uid || Utils.genId(),
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        clientItemName: existing?.clientItemName || item.name,
        orderUnit: existing?.orderUnit || 1,
        enabled: !!existing,
      };
    });
    setEditRows(rows);
    setEditing(true);
  };

  const save = () => {
    const list = st.mappings || [];
    const mappedItems = editRows.filter(r => r.enabled).map(r => ({
      uid: r.uid, itemId: r.itemId, clientItemName: r.clientItemName, orderUnit: Number(r.orderUnit) || 1
    }));
    const existing = list.find(m => m.clientId === selectedClient && m.month === globalMonth);
    if (existing) {
      updateSt('mappings', list.map(m => (m.clientId === selectedClient && m.month === globalMonth) ? {...m, mappedItems} : m));
    } else {
      updateSt('mappings', [...list, { id:`MAP${Date.now()}`, clientId:selectedClient, month:globalMonth, mappedItems }]);
    }
    setEditing(false);
    showToast('품목 매칭이 저장되었습니다.', 'success');
  };

  const copyFromPrev = () => {
    const [y, m] = globalMonth.split('-').map(Number);
    const prevMonth = `${m === 1 ? y-1 : y}-${String(m === 1 ? 12 : m-1).padStart(2,'0')}`;
    const prev = (st.mappings || []).find(m => m.clientId === selectedClient && m.month === prevMonth);
    if (!prev) return showToast('이전달 매칭 데이터가 없습니다.', 'warn');
    const rows = items.map(item => {
      const prevMapped = prev.mappedItems?.find(p => p.itemId === item.id);
      const current = editRows.find(r => r.itemId === item.id);
      return current ? {
        ...current,
        clientItemName: prevMapped?.clientItemName || item.name,
        orderUnit: prevMapped?.orderUnit || 1,
        enabled: !!prevMapped,
      } : current;
    }).filter(Boolean);
    setEditRows(rows);
    showToast('이전달 매칭을 불러왔습니다.', 'success');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-black text-white">품목 매칭 — {globalMonth}</h1>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setEditing(false); }} className="input-base w-64">
            <option value="">보건소 선택</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedClient && !editing && (
            <button onClick={startEdit} className="btn-primary flex items-center gap-1.5">{Ic.Edit} 매칭 편집</button>
          )}
          {editing && (
            <>
              <button onClick={copyFromPrev} className="btn-secondary flex items-center gap-1.5">{Ic.Copy} 이전달 불러오기</button>
              <button onClick={save} className="btn-success flex items-center gap-1.5">{Ic.Save} 저장</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">취소</button>
            </>
          )}
        </div>

        {!selectedClient ? (
          <p className="text-slate-500 text-sm text-center py-8">보건소를 선택하면 품목 매칭을 설정할 수 있습니다.</p>
        ) : !editing ? (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>카테고리</th><th>마스터 품목명</th><th>보건소 품목명</th><th className="text-right">발주단위</th></tr></thead>
              <tbody>
                {(!mapping?.mappedItems?.length) ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-500">매칭된 품목이 없습니다. 편집을 눌러 설정하세요.</td></tr>
                ) : mapping.mappedItems.map(m => {
                  const item = items.find(i => i.id === m.itemId);
                  return (
                    <tr key={m.uid}>
                      <td><span className="badge bg-slate-700 text-slate-300">{item?.category}</span></td>
                      <td className="text-slate-400">{item?.name}</td>
                      <td className="font-black text-white">{m.clientItemName}</td>
                      <td className="text-right text-indigo-300 font-bold">{m.orderUnit}{item?.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <p className="text-xs text-slate-400 mb-2">체크박스로 사용 품목 선택 후 보건소 품목명과 발주단위를 수정하세요.</p>
            <table className="table-base">
              <thead><tr><th className="w-12">사용</th><th>카테고리</th><th>마스터 품목명</th><th>보건소 품목명</th><th>발주단위</th></tr></thead>
              <tbody>
                {editRows.map((r, i) => (
                  <tr key={r.uid}>
                    <td className="text-center">
                      <input type="checkbox" checked={r.enabled} onChange={e => setEditRows(p => p.map((x,j) => j===i ? {...x,enabled:e.target.checked} : x))} className="w-4 h-4 accent-indigo-500" />
                    </td>
                    <td><span className="badge bg-slate-700 text-slate-300 text-xs">{r.category}</span></td>
                    <td className="text-slate-400 text-sm">{r.itemName}</td>
                    <td>
                      <input value={r.clientItemName} disabled={!r.enabled}
                        onChange={e => setEditRows(p => p.map((x,j) => j===i ? {...x,clientItemName:e.target.value} : x))}
                        className="input-base text-sm disabled:opacity-40" />
                    </td>
                    <td>
                      <input type="number" min={0.1} step={0.1} value={r.orderUnit} disabled={!r.enabled}
                        onChange={e => setEditRows(p => p.map((x,j) => j===i ? {...x,orderUnit:e.target.value} : x))}
                        className="input-base w-24 text-sm disabled:opacity-40" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
