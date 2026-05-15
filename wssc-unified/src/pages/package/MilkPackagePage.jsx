import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const MILK_TYPES = [
  '1단계(0~6개월)', '2단계(6~12개월)', '3단계(12~24개월)',
  '특수분유(의사처방)', '기타',
];

const PRINT_STYLE = `
@media print {
  #main-app { display: none !important; }
  body, html, #root { background: white !important; color: black !important; margin: 0; padding: 0; }
  @page { margin: 15mm; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 6px; }
  th { background: #e8eaf6; font-weight: bold; text-align: center; }
}`;

export default function MilkPackagePage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [tab, setTab] = useState('input');
  const [selectedClient, setSelectedClient] = useState('');
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);

  const clients = st.clients || [];
  const milkOrders = st.milkOrders || [];

  const clientMilkOrder = useMemo(() =>
    milkOrders.find(o => o.clientId === selectedClient && o.month === globalMonth),
    [milkOrders, selectedClient, globalMonth]
  );

  const monthOrders = useMemo(() =>
    milkOrders.filter(o => o.month === globalMonth),
    [milkOrders, globalMonth]
  );

  const startEdit = () => {
    const existing = clientMilkOrder?.items || [];
    const rows = MILK_TYPES.map(mt => {
      const ex = existing.find(e => e.milkType === mt);
      return {
        uid: ex?.uid || Utils.genId(),
        milkType: mt,
        brand: ex?.brand || '',
        personCount: ex?.personCount ?? '',
        cansPerPerson: ex?.cansPerPerson ?? '',
        note: ex?.note || '',
      };
    });
    setEditItems(rows);
    setEditing(true);
  };

  const save = () => {
    const validItems = editItems
      .filter(r => Number(r.personCount) > 0)
      .map(r => ({
        uid: r.uid,
        milkType: r.milkType,
        brand: r.brand,
        personCount: Number(r.personCount) || 0,
        cansPerPerson: Number(r.cansPerPerson) || 0,
        totalCans: (Number(r.personCount) || 0) * (Number(r.cansPerPerson) || 0),
        note: r.note,
      }));
    const list = [...milkOrders];
    const existing = list.find(o => o.clientId === selectedClient && o.month === globalMonth);
    if (existing) {
      updateSt('milkOrders', list.map(o =>
        o.clientId === selectedClient && o.month === globalMonth ? { ...o, items: validItems } : o
      ));
    } else {
      list.push({ id: `MO${Date.now()}`, clientId: selectedClient, month: globalMonth, items: validItems });
      updateSt('milkOrders', list);
    }
    setEditing(false);
    showToast('분유 현황이 저장되었습니다.', 'success');
  };

  const delClientOrder = (clientId) => {
    updateSt('milkOrders', milkOrders.filter(o => !(o.clientId === clientId && o.month === globalMonth)));
    if (selectedClient === clientId) { setSelectedClient(''); setEditing(false); }
    showToast('삭제되었습니다.', 'success');
  };

  const summary = useMemo(() => {
    const agg = {};
    monthOrders.forEach(order => {
      (order.items || []).forEach(it => {
        if (!agg[it.milkType]) agg[it.milkType] = { milkType: it.milkType, totalPersons: 0, totalCans: 0, details: [] };
        agg[it.milkType].totalPersons += Number(it.personCount) || 0;
        agg[it.milkType].totalCans += Number(it.totalCans) || 0;
        const client = clients.find(c => c.id === order.clientId);
        if (client && Number(it.personCount) > 0) {
          agg[it.milkType].details.push({
            clientName: client.shortName || client.name,
            personCount: it.personCount,
            cansPerPerson: it.cansPerPerson,
            totalCans: it.totalCans,
            brand: it.brand,
          });
        }
      });
    });
    return MILK_TYPES.map(mt => agg[mt]).filter(Boolean);
  }, [monthOrders, clients]);

  const dlExcel = () => {
    if (!selectedClient || !clientMilkOrder?.items?.length) return;
    const client = clients.find(c => c.id === selectedClient);
    const rows = clientMilkOrder.items.map((it, i) => `<tr>
      <td class="txt">${i + 1}</td>
      <td class="l">${it.milkType}</td>
      <td class="l">${it.brand || ''}</td>
      <td class="num">${it.personCount}</td>
      <td class="num">${it.cansPerPerson}</td>
      <td class="num">${it.totalCans}</td>
      <td class="l">${it.note || ''}</td>
    </tr>`).join('');
    Utils.dlExcelCustom(`<table>
      <thead>
        <tr><td colspan="7" class="hdr">${globalMonth} ${client?.name || ''} 분유 현황</td></tr>
        <tr><th>No</th><th>분유 종류</th><th>브랜드</th><th>인원수</th><th>인당 캔수</th><th>총 캔수</th><th>비고</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`, `분유현황_${client?.name}_${globalMonth}`);
  };

  const dlSummaryExcel = () => {
    if (!summary.length) return;
    const rows = summary.map((s, i) => `<tr>
      <td class="txt">${i + 1}</td>
      <td class="l">${s.milkType}</td>
      <td class="num">${s.totalPersons}</td>
      <td class="num">${s.totalCans}</td>
      <td class="l">${s.details.map(d => `${d.clientName}(${d.personCount}명)`).join(', ')}</td>
    </tr>`).join('');
    Utils.dlExcelCustom(`<table>
      <thead>
        <tr><td colspan="5" class="hdr">${globalMonth} 분유 발주 집계</td></tr>
        <tr><th>No</th><th>분유 종류</th><th>총 인원</th><th>총 캔수</th><th>보건소별 현황</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`, `분유발주집계_${globalMonth}`);
  };

  const doPrint = () => {
    let rows = '';
    summary.forEach((s, i) => {
      rows += `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${s.milkType}</td>
        <td style="text-align:right">${s.totalPersons}</td>
        <td style="text-align:right">${s.totalCans}</td>
        <td>${s.details.map(d => `${d.clientName}:${d.personCount}명/${d.totalCans}캔`).join(', ')}</td>
      </tr>`;
    });
    Utils.printContent(`${globalMonth} 분유 발주 집계`,
      `<table><thead>
        <tr><th colspan="5" style="background:#4f46e5;color:white;font-size:16px;padding:12px">${globalMonth} 분유 발주 집계</th></tr>
        <tr><th>No</th><th>분유 종류</th><th>총 인원</th><th>총 캔수</th><th>보건소별 현황</th></tr>
      </thead><tbody>${rows}</tbody></table>`);
  };

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div id="main-app" className="space-y-4 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-black text-white">분유 패키지 — {globalMonth}</h1>
          <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
            {[['input', '보건소별 입력'], ['summary', '발주 집계']].map(([key, label]) => (
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
                  <button onClick={startEdit} className="btn-primary flex items-center gap-1.5">{Ic.Edit} 입력</button>
                  {clientMilkOrder?.items?.length > 0 && (
                    <button onClick={dlExcel} className="btn-secondary flex items-center gap-1.5">{Ic.Down} 엑셀</button>
                  )}
                  {clientMilkOrder && (
                    <button onClick={() => delClientOrder(selectedClient)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg">{Ic.Trash}</button>
                  )}
                </>
              )}
              {editing && (
                <>
                  <button onClick={save} className="btn-success flex items-center gap-1.5">{Ic.Save} 저장</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary">취소</button>
                </>
              )}
            </div>

            {!selectedClient ? (
              <div className="py-8 text-center">
                <p className="text-slate-500 text-sm mb-4">보건소를 선택하세요.</p>
                {monthOrders.length > 0 && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-400 mb-2 font-bold">이번달 입력 완료 보건소 ({monthOrders.length}개)</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {monthOrders.map(o => {
                        const c = clients.find(x => x.id === o.clientId);
                        return (
                          <button key={o.id} onClick={() => setSelectedClient(o.clientId)}
                            className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 px-3 py-1 rounded-lg hover:bg-indigo-800/50">
                            {c?.shortName || c?.name || '?'} ({(o.items || []).reduce((s, it) => s + (it.totalCans || 0), 0)}캔)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : !editing ? (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>No</th><th>분유 종류</th><th>브랜드</th><th className="text-right">인원수</th><th className="text-right">인당 캔수</th><th className="text-right">총 캔수</th><th>비고</th></tr>
                  </thead>
                  <tbody>
                    {!clientMilkOrder?.items?.length ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-500">입력된 분유 현황이 없습니다. 입력 버튼을 눌러 등록하세요.</td></tr>
                    ) : clientMilkOrder.items.map((it, i) => (
                      <tr key={it.uid}>
                        <td className="text-center text-slate-400">{i + 1}</td>
                        <td className="font-bold text-white">{it.milkType}</td>
                        <td className="text-slate-300">{it.brand || '-'}</td>
                        <td className="text-right font-black text-sky-300">{Utils.fmt(it.personCount)}</td>
                        <td className="text-right text-slate-300">{Utils.fmt(it.cansPerPerson)}</td>
                        <td className="text-right font-black text-emerald-300">{Utils.fmt(it.totalCans)}</td>
                        <td className="text-slate-400 text-sm">{it.note}</td>
                      </tr>
                    ))}
                    {clientMilkOrder?.items?.length > 0 && (
                      <tr className="border-t-2 border-slate-600">
                        <td colSpan={5} className="text-right font-black text-slate-300">합계</td>
                        <td className="text-right font-black text-emerald-400">
                          {Utils.fmt(clientMilkOrder.items.reduce((s, it) => s + (it.totalCans || 0), 0))} 캔
                        </td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>분유 종류</th>
                      <th>브랜드</th>
                      <th className="text-right min-w-[80px]">인원수</th>
                      <th className="text-right min-w-[80px]">인당 캔수</th>
                      <th className="text-right">총 캔수</th>
                      <th>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((row, i) => {
                      const totalCans = (Number(row.personCount) || 0) * (Number(row.cansPerPerson) || 0);
                      return (
                        <tr key={row.uid}>
                          <td className="font-bold text-white">{row.milkType}</td>
                          <td>
                            <input value={row.brand}
                              onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, brand: e.target.value } : x))}
                              className="input-base text-sm w-24" placeholder="남양/매일" />
                          </td>
                          <td>
                            <input type="number" min={0} value={row.personCount}
                              onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, personCount: e.target.value } : x))}
                              className="input-base text-right w-20 ml-auto text-sky-300 font-black" />
                          </td>
                          <td>
                            <input type="number" min={0} step="0.5" value={row.cansPerPerson}
                              onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, cansPerPerson: e.target.value } : x))}
                              className="input-base text-right w-20 ml-auto font-black" />
                          </td>
                          <td className="text-right font-black text-emerald-300">
                            {totalCans > 0 ? Utils.fmt(totalCans) : <span className="text-slate-600">-</span>}
                          </td>
                          <td>
                            <input value={row.note}
                              onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                              className="input-base text-sm w-28" placeholder="비고" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── 발주 집계 탭 ── */
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">{monthOrders.length}개 보건소 등록</p>
                <div className="flex gap-2">
                  <button onClick={doPrint} disabled={!summary.length}
                    className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
                    {Ic.Print2} 인쇄
                  </button>
                  <button onClick={dlSummaryExcel} disabled={!summary.length}
                    className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
                    {Ic.Down} 집계 엑셀
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>분유 종류</th>
                      <th className="text-right">총 인원</th>
                      <th className="text-right">총 캔수</th>
                      <th>보건소별 현황</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-500">이번달 분유 현황이 없습니다.</td></tr>
                    ) : (
                      <>
                        {summary.map(s => (
                          <tr key={s.milkType}>
                            <td className="font-black text-white">{s.milkType}</td>
                            <td className="text-right font-black text-sky-300">{Utils.fmt(s.totalPersons)} 명</td>
                            <td className="text-right font-black text-emerald-300">{Utils.fmt(s.totalCans)} 캔</td>
                            <td className="text-xs text-slate-400">
                              {s.details.map(d => (
                                <span key={d.clientName} className="inline-block mr-2">
                                  {d.clientName}<span className="text-slate-600 ml-0.5">({d.personCount}명/{d.totalCans}캔{d.brand ? `·${d.brand}` : ''})</span>
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-500">
                          <td className="font-black text-white">합계</td>
                          <td className="text-right font-black text-sky-400">
                            {Utils.fmt(summary.reduce((s, x) => s + x.totalPersons, 0))} 명
                          </td>
                          <td className="text-right font-black text-emerald-400">
                            {Utils.fmt(summary.reduce((s, x) => s + x.totalCans, 0))} 캔
                          </td>
                          <td />
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 보건소별 상세 */}
            {monthOrders.length > 0 && (
              <div className="card">
                <h2 className="section-title mb-3">보건소별 상세 현황</h2>
                <div className="overflow-x-auto">
                  <table className="table-base text-xs">
                    <thead>
                      <tr><th>보건소</th><th>분유 종류</th><th>브랜드</th><th className="text-right">인원수</th><th className="text-right">인당 캔수</th><th className="text-right">총 캔수</th><th>비고</th></tr>
                    </thead>
                    <tbody>
                      {monthOrders.map(order => {
                        const client = clients.find(c => c.id === order.clientId);
                        const items = order.items || [];
                        if (!items.length) return null;
                        return items.map((it, i) => (
                          <tr key={`${order.id}-${i}`}>
                            {i === 0 && (
                              <td rowSpan={items.length} className="font-black text-white align-middle">
                                {client?.shortName || client?.name || '?'}
                              </td>
                            )}
                            <td className="font-bold text-slate-200">{it.milkType}</td>
                            <td className="text-slate-400">{it.brand || '-'}</td>
                            <td className="text-right text-sky-300 font-bold">{Utils.fmt(it.personCount)}</td>
                            <td className="text-right text-slate-300">{Utils.fmt(it.cansPerPerson)}</td>
                            <td className="text-right text-emerald-300 font-black">{Utils.fmt(it.totalCans)}</td>
                            <td className="text-slate-400">{it.note || ''}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
