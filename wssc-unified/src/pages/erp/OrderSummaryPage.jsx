import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function OrderSummaryPage() {
  const { st, globalMonth } = useApp();
  const [wkFilter, setWkFilter] = useState(0);

  const clients = st.clients || [];
  const items = useMemo(() => Utils.sortItems(st.items || [], st.categorySortOrder || []), [st.items, st.categorySortOrder]);
  const clientOrders = useMemo(() => (st.clientOrders || []).filter(o => o.month === globalMonth), [st.clientOrders, globalMonth]);
  const lossRates = st.lossRates || {};
  const itemLossRates = st.itemLossRates || {};
  const weekMappings = st.weekMappings || {};

  const aggregated = useMemo(() => {
    const map = {};
    clientOrders.forEach(order => {
      const wk1 = Utils.getWeek(order.deliveryDate1, weekMappings);
      const wk2 = Utils.getWeek(order.deliveryDate2, weekMappings);
      (order.items || []).forEach(oi => {
        if (!oi.itemId) return;
        const item = items.find(i => i.id === oi.itemId);
        if (!item) return;
        if (!map[oi.itemId]) {
          const lossGroup = Utils.getLossGroup(item, lossRates);
          const lossRate = itemLossRates[oi.itemId] ?? (lossGroup ? lossRates[lossGroup] : 0) ?? 0;
          map[oi.itemId] = { item, lossRate, qty1_total:0, qty2_total:0, wk:{1:0,2:0,3:0,4:0} };
        }
        const entry = map[oi.itemId];
        const q1 = Number(oi.qty1)||0, q2 = Number(oi.qty2)||0;
        if (!wkFilter || wk1 === wkFilter) entry.qty1_total += q1;
        if (!wkFilter || wk2 === wkFilter) entry.qty2_total += q2;
        if (wk1 >= 1 && wk1 <= 4) entry.wk[wk1] = (entry.wk[wk1]||0) + q1;
        if (wk2 >= 1 && wk2 <= 4) entry.wk[wk2] = (entry.wk[wk2]||0) + q2;
      });
    });
    return Object.values(map);
  }, [clientOrders, items, lossRates, itemLossRates, weekMappings, wkFilter]);

  const dlVertical = () => {
    let html = `<table><tr><th>No</th><th>품목명</th><th>단위</th><th>1차 수량</th><th>2차 수량</th><th>로스율(%)</th><th>AI추천(1차)</th><th>AI추천(2차)</th></tr>`;
    aggregated.forEach((r, i) => {
      const lr = r.lossRate || 0;
      const ai1 = Math.ceil(r.qty1_total * (1 + lr/100));
      const ai2 = Math.ceil(r.qty2_total * (1 + lr/100));
      html += `<tr><td>${i+1}</td><td>${r.item.name}</td><td>${r.item.unit}</td><td class="num">${r.qty1_total||0}</td><td class="num">${r.qty2_total||0}</td><td class="num">${lr}</td><td class="num">${ai1||''}</td><td class="num">${ai2||''}</td></tr>`;
    });
    html += '</table>';
    Utils.dlExcel(html, `AI발주집계_${globalMonth}${wkFilter ? `_${wkFilter}주차` : ''}`);
  };

  const dlHorizontal = () => {
    const headers = ['품목명','단위',...clients.map(c=>c.shortName+'_1차'),...clients.map(c=>c.shortName+'_2차'),'합계'];
    let html = `<table><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
    aggregated.forEach(r => {
      const row = [r.item.name, r.item.unit];
      clients.forEach(c => {
        const o = clientOrders.find(x => x.clientId === c.id);
        const oi = o?.items?.find(x => x.itemId === r.item.id);
        row.push(oi?.qty1 || '');
      });
      clients.forEach(c => {
        const o = clientOrders.find(x => x.clientId === c.id);
        const oi = o?.items?.find(x => x.itemId === r.item.id);
        row.push(oi?.qty2 || '');
      });
      row.push(r.qty1_total + r.qty2_total);
      html += `<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`;
    });
    html += '</table>';
    Utils.dlExcel(html, `보건소별집계표_${globalMonth}`);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-white">AI 집계 (참고용) — {globalMonth}</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {[0,1,2,3,4].map(w => (
              <button key={w} onClick={() => setWkFilter(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${wkFilter===w ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                {w === 0 ? '전체' : `${w}주차`}
              </button>
            ))}
          </div>
          <button onClick={dlVertical} className="btn-secondary text-xs flex items-center gap-1">{Ic.Down} 세로형</button>
          <button onClick={dlHorizontal} className="btn-secondary text-xs flex items-center gap-1">{Ic.Down} 가로형</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>No</th><th>카테고리</th><th>품목명</th><th>단위</th>
              <th className="text-right">1차 합계</th><th className="text-right">2차 합계</th>
              <th className="text-right">로스율</th>
              <th className="text-right bg-indigo-900/30">AI 추천 1차</th>
              <th className="text-right bg-indigo-900/30">AI 추천 2차</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500">이번달 발주 내역이 없습니다.</td></tr>
            ) : aggregated.map((r, i) => {
              const lr = r.lossRate || 0;
              const ai1 = r.qty1_total > 0 ? Math.ceil(r.qty1_total * (1+lr/100)) : 0;
              const ai2 = r.qty2_total > 0 ? Math.ceil(r.qty2_total * (1+lr/100)) : 0;
              return (
                <tr key={r.item.id}>
                  <td className="text-center text-slate-400">{i+1}</td>
                  <td><span className="badge bg-slate-700 text-slate-300 text-xs">{r.item.category}</span></td>
                  <td className="font-black text-white">{r.item.name}</td>
                  <td className="text-slate-400">{r.item.unit}</td>
                  <td className="text-right font-bold text-sky-300 tabular-nums">{r.qty1_total ? Utils.fmt(r.qty1_total) : ''}</td>
                  <td className="text-right font-bold text-violet-300 tabular-nums">{r.qty2_total ? Utils.fmt(r.qty2_total) : ''}</td>
                  <td className="text-right text-amber-300 text-xs">{lr > 0 ? `${lr}%` : '-'}</td>
                  <td className="text-right font-black text-indigo-300 tabular-nums bg-indigo-900/10">{ai1 ? Utils.fmt(ai1) : ''}</td>
                  <td className="text-right font-black text-indigo-300 tabular-nums bg-indigo-900/10">{ai2 ? Utils.fmt(ai2) : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
