import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function PurchasePage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const suppliers = st.suppliers || [];
  const items = st.items || [];
  const clientOrders = useMemo(() => (st.clientOrders || []).filter(o => o.month === globalMonth), [st.clientOrders, globalMonth]);

  const aggregatedBySupplier = useMemo(() => {
    const supMap = {};
    clientOrders.forEach(order => {
      (order.items || []).forEach(oi => {
        const item = items.find(i => i.id === oi.itemId);
        if (!item?.supplierId) return;
        const sid = item.supplierId;
        if (!supMap[sid]) supMap[sid] = {};
        if (!supMap[sid][oi.itemId]) supMap[sid][oi.itemId] = { item, totalQty1:0, totalQty2:0 };
        supMap[sid][oi.itemId].totalQty1 += Number(oi.qty1) || 0;
        supMap[sid][oi.itemId].totalQty2 += Number(oi.qty2) || 0;
      });
    });
    return supMap;
  }, [clientOrders, items]);

  const purchaseRequests = useMemo(() =>
    (st.purchaseRequests || []).filter(p => p.month === globalMonth),
    [st.purchaseRequests, globalMonth]
  );

  const savePurchase = (supplierId) => {
    const rows = Object.values(aggregatedBySupplier[supplierId] || {});
    if (!rows.length) return;
    const prItems = rows.map(r => ({
      itemId: r.item.id, itemName: r.item.name, unit: r.item.unit,
      qty1: r.totalQty1, qty2: r.totalQty2, quantity: r.totalQty1 + r.totalQty2,
      unitPrice: r.item.unitPrice,
    }));
    const list = [...(st.purchaseRequests || [])];
    const existing = list.find(p => p.supplierId === supplierId && p.month === globalMonth);
    if (existing) {
      updateSt('purchaseRequests', list.map(p => (p.supplierId===supplierId && p.month===globalMonth) ? {...p, items:prItems, updatedAt:new Date().toISOString()} : p));
    } else {
      list.push({ id:`PR${Date.now()}`, supplierId, month:globalMonth, items:prItems, createdAt:new Date().toISOString() });
      updateSt('purchaseRequests', list);
    }
    showToast('구매요청서가 저장되었습니다.', 'success');
  };

  const printPR = (sid) => {
    const supplier = suppliers.find(s => s.id === sid);
    const pr = purchaseRequests.find(p => p.supplierId === sid);
    if (!pr) return showToast('먼저 저장하세요.', 'warn');
    const total = (pr.items || []).reduce((s,i) => s + (i.quantity * (i.unitPrice||0)), 0);
    let html = `<table><thead><tr><th>No</th><th>품목명</th><th>단위</th><th>1차수량</th><th>2차수량</th><th>총수량</th><th>단가</th><th>금액</th></tr></thead><tbody>`;
    (pr.items || []).forEach((item,i) => {
      const amt = item.quantity * (item.unitPrice || 0);
      html += `<tr><td>${i+1}</td><td style="text-align:left;font-weight:bold;">${item.itemName}</td><td>${item.unit}</td><td style="color:blue;">${Utils.fmt(item.qty1)}</td><td style="color:purple;">${Utils.fmt(item.qty2)}</td><td style="color:navy;font-weight:bold;">${Utils.fmt(item.quantity)}</td><td>${Utils.fmt(item.unitPrice)}</td><td style="color:#d97706;font-weight:bold;">${Utils.fmt(amt)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="7" style="text-align:right;font-weight:bold;">합계</td><td style="font-weight:bold;color:#d97706;">${Utils.fmt(total)}</td></tr></tfoot></table>`;
    Utils.printContent(`[구매요청서] ${supplier?.name} — ${globalMonth}`, html);
  };

  const dlExcel = (sid) => {
    const supplier = suppliers.find(s => s.id === sid);
    const pr = purchaseRequests.find(p => p.supplierId === sid);
    if (!pr) return showToast('먼저 저장하세요.', 'warn');
    let html = `<table><tr><th>No</th><th>품목명</th><th>단위</th><th>1차수량</th><th>2차수량</th><th>총수량</th><th>단가</th><th>금액</th></tr>`;
    (pr.items || []).forEach((item,i) => {
      html += `<tr><td>${i+1}</td><td>${item.itemName}</td><td>${item.unit}</td><td>${item.qty1}</td><td>${item.qty2}</td><td>${item.quantity}</td><td>${item.unitPrice||0}</td><td>${item.quantity*(item.unitPrice||0)}</td></tr>`;
    });
    html += '</table>';
    Utils.dlExcel(html, `구매요청서_${supplier?.name}_${globalMonth}`);
  };

  const supplierIds = Object.keys(aggregatedBySupplier);

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-black text-white">구매요청서 — {globalMonth}</h1>

      {supplierIds.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          이번달 발주 내역이 없습니다. 발주 등록 후 다시 확인해주세요.
        </div>
      ) : supplierIds.map(sid => {
        const supplier = suppliers.find(s => s.id === sid);
        const rows = Object.values(aggregatedBySupplier[sid] || {});
        const pr = purchaseRequests.find(p => p.supplierId === sid);
        const total = rows.reduce((s,r) => s + ((r.totalQty1+r.totalQty2) * (r.item.unitPrice||0)), 0);

        return (
          <div key={sid} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-black text-white text-base">{supplier?.name || sid}</h3>
                <p className="text-xs text-slate-400 mt-0.5">총 예상금액: <span className="text-amber-400 font-black">{Utils.fmtMoney(total)}</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => savePurchase(sid)} className="btn-primary text-xs">{Ic.Save} 저장</button>
                {pr && <button onClick={() => printPR(sid)} className="btn-secondary text-xs">{Ic.Print2} 인쇄</button>}
                {pr && <button onClick={() => dlExcel(sid)} className="btn-secondary text-xs">{Ic.Down} 엑셀</button>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base text-xs">
                <thead><tr><th>품목명</th><th>단위</th><th className="text-right">1차</th><th className="text-right">2차</th><th className="text-right">합계</th><th className="text-right">단가</th><th className="text-right">금액</th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const total = r.totalQty1 + r.totalQty2;
                    const amt = total * (r.item.unitPrice || 0);
                    return (
                      <tr key={r.item.id}>
                        <td className="font-bold text-white">{r.item.name}</td>
                        <td className="text-slate-400">{r.item.unit}</td>
                        <td className="text-right text-sky-300 font-bold">{Utils.fmt(r.totalQty1) || '-'}</td>
                        <td className="text-right text-violet-300 font-bold">{Utils.fmt(r.totalQty2) || '-'}</td>
                        <td className="text-right font-black text-white">{Utils.fmt(total)}</td>
                        <td className="text-right text-slate-400">{Utils.fmt(r.item.unitPrice)}</td>
                        <td className="text-right text-amber-300 font-black">{Utils.fmt(amt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
