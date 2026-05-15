import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function OrderPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [tab, setTab] = useState('input'); // 'input' | 'summary'
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
    (st.mappings || []).find(m => m.clientId === selectedClient && m.month === globalMonth)
    || (st.mappings || []).filter(m => m.clientId === selectedClient).sort((a,b) => b.month?.localeCompare(a.month||''))[0],
    [st.mappings, selectedClient, globalMonth]
  );

  const monthOrders = useMemo(() =>
    (st.clientOrders || []).filter(o => o.month === globalMonth),
    [st.clientOrders, globalMonth]
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
      updateSt('clientOrders', list.map(o =>
        (o.clientId === selectedClient && o.month === globalMonth) ? {...o, items: newItems} : o
      ));
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

  const dlExcel = () => {
    if (!selectedClient || !mapping?.mappedItems?.length) return;
    const client = clients.find(c => c.id === selectedClient);
    const orderItems = clientOrder?.items || [];
    const mappedItems = mapping.mappedItems;
    const rows = mappedItems.map((m, i) => {
      const masterItem = items.find(x => x.id === m.itemId);
      const oi = orderItems.find(x => x.uid === m.uid);
      const q1 = Number(oi?.qty1) || 0;
      const q2 = Number(oi?.qty2) || 0;
      return `<tr>
        <td class="txt">${i+1}</td>
        <td class="l">${masterItem?.category || ''}</td>
        <td class="l">${m.clientItemName || masterItem?.name || ''}</td>
        <td class="txt">${masterItem?.unit || ''}</td>
        <td class="num">${q1 || ''}</td>
        <td class="num">${q2 || ''}</td>
        <td class="num">${q1+q2 > 0 ? q1+q2 : ''}</td>
        <td class="l">${oi?.note || ''}</td>
      </tr>`;
    }).join('');
    Utils.dlExcelCustom(`
      <table>
        <thead>
          <tr><td colspan="8" class="hdr">${globalMonth} ${client?.name || ''} 발주서</td></tr>
          <tr><th>No</th><th>카테고리</th><th>품목명</th><th>단위</th><th>1차 수량</th><th>2차 수량</th><th>합계</th><th>비고</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`, `발주서_${client?.name}_${globalMonth}`);
  };

  const doPrint = () => {
    if (!selectedClient) return;
    const client = clients.find(c => c.id === selectedClient);
    const orderItems = clientOrder?.items || [];
    const mappedItems = mapping?.mappedItems || [];
    const rows = mappedItems.map((m, i) => {
      const masterItem = items.find(x => x.id === m.itemId);
      const oi = orderItems.find(x => x.uid === m.uid);
      const q1 = Number(oi?.qty1) || 0;
      const q2 = Number(oi?.qty2) || 0;
      return `<tr>
        <td style="text-align:center">${i+1}</td>
        <td>${masterItem?.category || ''}</td>
        <td>${m.clientItemName || masterItem?.name || ''}</td>
        <td style="text-align:center">${masterItem?.unit || ''}</td>
        <td style="text-align:right">${q1 || ''}</td>
        <td style="text-align:right">${q2 || ''}</td>
        <td style="text-align:right">${q1+q2 > 0 ? q1+q2 : ''}</td>
        <td>${oi?.note || ''}</td>
      </tr>`;
    }).join('');
    Utils.printContent(`${globalMonth} ${client?.name || ''} 발주서`,
      `<table>
        <thead>
          <tr><th colspan="8" style="background:#4f46e5;color:white;font-size:16px;padding:12px">${globalMonth} ${client?.name || ''} 발주서</th></tr>
          <tr><th>No</th><th>카테고리</th><th>품목명</th><th>단위</th><th>1차 수량</th><th>2차 수량</th><th>합계</th><th>비고</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`);
  };

  const dlSummaryExcel = () => {
    if (!monthOrders.length) return;
    const sortedOrders = [...monthOrders].sort((a,b) => (a.routeSequence||0)-(b.routeSequence||0));
    let rows = '';
    sortedOrders.forEach((order, i) => {
      const client = clients.find(c => c.id === order.clientId);
      const itemCount = order.items?.length || 0;
      const totalQty = (order.items || []).reduce((s, it) => s + (Number(it.qty1)||0) + (Number(it.qty2)||0), 0);
      rows += `<tr>
        <td class="txt">${order.routeSequence || i+1}</td>
        <td class="l">${client?.shortName || client?.name || ''}</td>
        <td class="txt">${order.deliveryBlock || ''}</td>
        <td class="txt">${order.deliveryDate1 || ''}</td>
        <td class="txt">${order.deliveryDate2 || ''}</td>
        <td class="num">${itemCount}</td>
        <td class="num">${totalQty || ''}</td>
        <td class="txt">${order.done1 ? 'O' : ''}</td>
        <td class="txt">${order.done2 ? 'O' : ''}</td>
      </tr>`;
    });
    Utils.dlExcelCustom(`
      <table>
        <thead>
          <tr><td colspan="9" class="hdr">${globalMonth} 전체 발주 현황</td></tr>
          <tr><th>순번</th><th>보건소</th><th>블럭</th><th>1차 배송일</th><th>2차 배송일</th><th>품목수</th><th>총수량</th><th>1차완료</th><th>2차완료</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`, `발주현황_${globalMonth}`);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-white">발주 청구 관리 — {globalMonth}</h1>
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {[['input','보건소별 입력'],['summary','이번달 전체 현황']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setEditing(false); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'input' ? (
        <div className="card">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setEditing(false); }} className="input-base w-64">
              <option value="">보건소 선택</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedClient && !editing && (
              <>
                <button onClick={startEdit} className="btn-primary flex items-center gap-1.5">{Ic.Edit} 발주 입력</button>
                {clientOrder?.items?.length > 0 && (
                  <>
                    <button onClick={dlExcel} className="btn-secondary flex items-center gap-1.5">{Ic.Down} 엑셀</button>
                    <button onClick={doPrint} className="btn-secondary flex items-center gap-1.5">{Ic.Print2} 인쇄</button>
                  </>
                )}
              </>
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
              <p className="text-slate-500 text-sm">발주/청구/결재 → 품목 매칭 메뉴에서 이 보건소의 품목을 설정해주세요.</p>
            </div>
          ) : !editing ? (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>No</th><th>카테고리</th><th>품목명</th><th>단위</th><th className="text-right">1차 수량</th><th className="text-right">2차 수량</th><th className="text-right">합계</th><th>비고</th></tr></thead>
                <tbody>
                  {(!clientOrder?.items?.length) ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-500">발주 내역이 없습니다. 발주 입력을 눌러 등록하세요.</td></tr>
                  ) : clientOrder.items.map((item, i) => {
                    const m = mapping?.mappedItems?.find(x => x.uid === item.uid);
                    const masterItem = items.find(x => x.id === item.itemId);
                    const q1 = Number(item.qty1) || 0;
                    const q2 = Number(item.qty2) || 0;
                    return (
                      <tr key={item.uid}>
                        <td className="text-slate-400 text-center">{i+1}</td>
                        <td><span className="badge bg-slate-700 text-slate-300 text-xs">{masterItem?.category || ''}</span></td>
                        <td className="font-bold text-white">{m?.clientItemName || masterItem?.name}</td>
                        <td className="text-slate-400 text-sm">{masterItem?.unit || ''}</td>
                        <td className="text-right font-black text-sky-300">{Utils.fmt(item.qty1) || '-'}</td>
                        <td className="text-right font-black text-violet-300">{Utils.fmt(item.qty2) || '-'}</td>
                        <td className="text-right font-black text-emerald-300">{q1+q2 > 0 ? Utils.fmt(q1+q2) : '-'}</td>
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
      ) : (
        /* ── 전체 현황 탭 ── */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">{monthOrders.length}개 보건소 등록 · 미등록 {clients.length - monthOrders.length}개</p>
            <button onClick={dlSummaryExcel} disabled={!monthOrders.length}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
              {Ic.Down} 전체 엑셀
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>순번</th><th>보건소</th><th>블럭</th><th>1차 배송일</th><th>2차 배송일</th>
                  <th className="text-right">품목수</th><th className="text-right">1차 총량</th><th className="text-right">2차 총량</th>
                  <th>1차완료</th><th>2차완료</th><th className="w-20">입력</th>
                </tr>
              </thead>
              <tbody>
                {monthOrders.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-slate-500">이번달 발주 내역이 없습니다.</td></tr>
                ) : [...monthOrders].sort((a,b) => (a.routeSequence||0)-(b.routeSequence||0)).map(order => {
                  const client = clients.find(c => c.id === order.clientId);
                  const itemCount = order.items?.length || 0;
                  const qty1 = (order.items || []).reduce((s, it) => s + (Number(it.qty1)||0), 0);
                  const qty2 = (order.items || []).reduce((s, it) => s + (Number(it.qty2)||0), 0);
                  const blockColors = { A:'text-sky-300', B:'text-amber-300', C:'text-emerald-300' };
                  return (
                    <tr key={order.id}>
                      <td className="text-center text-slate-400 font-mono">{order.routeSequence || '-'}</td>
                      <td className="font-black text-white">{client?.shortName || client?.name || order.clientId}</td>
                      <td><span className={`font-black ${blockColors[order.deliveryBlock] || 'text-slate-300'}`}>{order.deliveryBlock || '-'}</span></td>
                      <td className="text-slate-300">{order.deliveryDate1 || '-'}</td>
                      <td className="text-slate-300">{order.deliveryDate2 || '-'}</td>
                      <td className="text-right text-slate-300">{itemCount}</td>
                      <td className="text-right font-black text-sky-300">{qty1 > 0 ? Utils.fmt(qty1) : '-'}</td>
                      <td className="text-right font-black text-violet-300">{qty2 > 0 ? Utils.fmt(qty2) : '-'}</td>
                      <td className="text-center">{order.done1 ? <span className="text-emerald-400 font-black">✓</span> : <span className="text-slate-600">-</span>}</td>
                      <td className="text-center">{order.done2 ? <span className="text-emerald-400 font-black">✓</span> : <span className="text-slate-600">-</span>}</td>
                      <td>
                        <button onClick={() => { setSelectedClient(order.clientId); setTab('input'); setEditing(false); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-lg">
                          {Ic.Edit}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
