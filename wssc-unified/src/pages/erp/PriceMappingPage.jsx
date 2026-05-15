import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function PriceMappingPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedClient, setSelectedClient] = useState('');
  const [editing, setEditing] = useState(false);
  const [prices, setPrices] = useState({});

  const clients = st.clients || [];
  const items = useMemo(() => Utils.sortItems(st.items || [], st.categorySortOrder || []), [st.items, st.categorySortOrder]);

  const pm = useMemo(() =>
    (st.priceMappings || []).find(p => p.clientId === selectedClient && p.month === globalMonth),
    [st.priceMappings, selectedClient, globalMonth]
  );

  const startEdit = () => {
    const p = {};
    items.forEach(item => { p[item.id] = pm?.prices?.[item.id] || item.unitPrice || ''; });
    setPrices(p);
    setEditing(true);
  };

  const save = () => {
    const list = st.priceMappings || [];
    const cleanPrices = {};
    Object.entries(prices).forEach(([k,v]) => { if (v !== '' && v !== undefined) cleanPrices[k] = Number(v); });
    const existing = list.find(p => p.clientId === selectedClient && p.month === globalMonth);
    if (existing) {
      updateSt('priceMappings', list.map(p => (p.clientId===selectedClient && p.month===globalMonth) ? {...p, prices:cleanPrices} : p));
    } else {
      updateSt('priceMappings', [...list, { id:`PM${Date.now()}`, clientId:selectedClient, month:globalMonth, prices:cleanPrices }]);
    }
    setEditing(false);
    showToast('단가가 저장되었습니다.', 'success');
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-black text-white">단가 매칭 — {globalMonth}</h1>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setEditing(false); }} className="input-base w-64">
            <option value="">보건소 선택</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedClient && !editing && <button onClick={startEdit} className="btn-primary flex items-center gap-1.5">{Ic.Edit} 단가 수정</button>}
          {editing && <><button onClick={save} className="btn-success flex items-center gap-1.5">{Ic.Save} 저장</button><button onClick={() => setEditing(false)} className="btn-secondary">취소</button></>}
        </div>

        {!selectedClient ? (
          <p className="text-slate-500 text-sm text-center py-8">보건소를 선택하면 품목별 단가를 설정할 수 있습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>카테고리</th><th>품목명</th><th>단위</th><th className="text-right">마스터 단가</th><th className="text-right">보건소 단가</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><span className="badge bg-slate-700 text-slate-300">{item.category}</span></td>
                    <td className="font-bold text-white">{item.name}</td>
                    <td className="text-slate-400">{item.unit}</td>
                    <td className="text-right text-slate-400 tabular-nums">{Utils.fmt(item.unitPrice)}</td>
                    <td className="text-right">
                      {editing ? (
                        <input type="number" value={prices[item.id] ?? ''} onChange={e => setPrices(p => ({...p, [item.id]: e.target.value}))}
                          className="input-base text-right w-32 ml-auto" />
                      ) : (
                        <span className={`font-black tabular-nums ${pm?.prices?.[item.id] ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {pm?.prices?.[item.id] ? Utils.fmt(pm.prices[item.id]) : '-'}
                        </span>
                      )}
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
