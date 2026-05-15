import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function OrderPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedClient, setSelectedClient] = useState('');
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);

  const clients = st.clients || [];
  const items = useMemo(() => Utils.sortItems(st.items || [], st.categorySortOrder || []), [st.items, st.categorySortOrder]);

  const clientOrder = useMemo(() =>
    (st.clientOrders || []).find(o => o.clientId === selectedClient && o.month === globalMonth),
    [st.clientOrders, selectedClient, globalMonth]
  );

  const mapping = useMemo(() =>
    (st.mappings || []).find(m => m.clientId === selectedClient && m.month === globalMonth),
    [st.mappings, selectedClient, globalMonth]
  );

  const startEdit = () => {
    const mapped = mapping?.mappedItems || [];
    const existing = clientOrder?.items || [];
    const rows = mapped.map(m => {
      const item = items.find(i => i.id === m.itemId);
      const ex = existing.find(e => e.uid === m.uid);
      return {
        uid: m.uid, itemId: m.itemId,
        displayName: m.clientItemName || item?.name || '',
        category: item?.category || '', unit: item?.unit || '',
        orderUnit: m.orderUnit || 1,
        qty1: ex?.qty1 ?? '', qty2: ex?.qty2 ?? '', note: ex?.note || '',
      };
    });
    setEditItems(rows);
    setEditing(true);
  };

  const save = () => {
    const list = st.clientOrders || [];
    const newItems = editItems.map(r => ({
      uid: r.uid, itemId: r.itemId, orderUnit: r.orderUnit,
      qty1: Number(r.qty1) || 0, qty2: Number(r.qty2) || 0, note: r.note,
    }));
    const existing = list.find(o => o.clientId === selectedClient && o.month === globalMonth);
    if (existing) {
      updateSt('clientOrders', list.map(o => (o.clientId === selectedClient && o.month === globalMonth) ? {...o, items: newItems} : o));
    } else {
      list.push({
        id: `CO${Date.now()}`, clientId: selectedClient, month: globalMonth,
        deliveryDate1:'', deliveryDate2:'', deliveryBlock:'A', routeSequence:1,
        done1:false, done2:false, sign1:null, sign2:null, items: newItems,
      });
      updateSt('clientOrders', list);
    }
    setEditing(false);
    showToast('발주 내역이 저장되었습니다.', 'success');
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const rows = Utils.parseClip(e);
    if (!rows.length) return;
    let count = 0;
    setEditItems(prev => prev.map(item => {
      const row = rows[count];
      if (!row) return item;
      count++;
      return { ...item, qty1: Number(row[0]) || 0, qty2: Number(row[1]) || '', note: row[2] || item.note };
    }));
    showToast(`${count}개 품목 수량이 붙여넣기 되었습니다.`, 'success');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-black text-white">발주 등록 — {globalMonth}</h1>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setEditing(false); }} className="input-base w-64">
            <option value="">보건소 선택</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedClient && !editing && (
            <button onClick={startEdit} className="btn-primary flex items-center gap-1.5">{Ic.Edit} 발주 입력</button>
          )}
          {editing && (
            <>
              <button onClick={save} className="btn-success flex items-center gap-1.5">{Ic.Save} 저장</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">취소</button>
              <span className="text-xs text-slate-400">💡 엑셀에서 수량 열만 복사 후 아래 표에 붙여넣기 가능</span>
            </>
          )}
        </div>

        {!selectedClient ? (
          <p className="text-slate-500 text-sm text-center py-8">보건소를 선택하세요.</p>
        ) : !mapping?.mappedItems?.length ? (
          <div className="text-center py-8">
            <p className="text-slate-400 font-bold mb-2">먼저 품목 매칭을 설정해야 합니다.</p>
            <p className="text-slate-500 text-sm">ERP → 품목 매칭 메뉴에서 이 보건소의 품목을 설정해주세요.</p>
          </div>
        ) : !editing ? (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>No</th><th>품목명</th><th className="text-right">1차 수량</th><th className="text-right">2차 수량</th><th>비고</th></tr></thead>
              <tbody>
                {(!clientOrder?.items?.length) ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">발주 내역이 없습니다. 발주 입력을 눌러 등록하세요.</td></tr>
                ) : clientOrder.items.map((item, i) => {
                  const m = mapping?.mappedItems?.find(x => x.uid === item.uid);
                  const masterItem = items.find(x => x.id === item.itemId);
                  return (
                    <tr key={item.uid}>
                      <td className="text-slate-400 text-center">{i+1}</td>
                      <td className="font-bold text-white">{m?.clientItemName || masterItem?.name}</td>
                      <td className="text-right font-black text-sky-300">{Utils.fmt(item.qty1) || '-'}</td>
                      <td className="text-right font-black text-violet-300">{Utils.fmt(item.qty2) || '-'}</td>
                      <td className="text-slate-400 text-sm">{item.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto" onPaste={handlePaste}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>No</th><th>카테고리</th><th>품목명</th><th>단위</th>
                  <th className="text-right min-w-[90px]">1차 수량</th>
                  <th className="text-right min-w-[90px]">2차 수량</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((row, i) => (
                  <tr key={row.uid}>
                    <td className="text-slate-400 text-center">{i+1}</td>
                    <td><span className="badge bg-slate-700 text-slate-300 text-xs">{row.category}</span></td>
                    <td className="font-bold text-white">{row.displayName}</td>
                    <td className="text-slate-400 text-sm">{row.unit}</td>
                    <td>
                      <input type="number" min={0} value={row.qty1}
                        onChange={e => setEditItems(p => p.map((x,j) => j===i ? {...x,qty1:e.target.value} : x))}
                        className="input-base text-right w-24 ml-auto text-sky-300 font-black" />
                    </td>
                    <td>
                      <input type="number" min={0} value={row.qty2}
                        onChange={e => setEditItems(p => p.map((x,j) => j===i ? {...x,qty2:e.target.value} : x))}
                        className="input-base text-right w-24 ml-auto text-violet-300 font-black" />
                    </td>
                    <td>
                      <input value={row.note}
                        onChange={e => setEditItems(p => p.map((x,j) => j===i ? {...x,note:e.target.value} : x))}
                        className="input-base text-sm w-28" placeholder="비고" />
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
