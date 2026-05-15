import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function SettlementPage() {
  const { st, globalMonth } = useApp();
  const [selectedClient, setSelectedClient] = useState('');

  const clients = st.clients || [];
  const items = st.items || [];
  const priceMappings = st.priceMappings || [];
  const mappings = st.mappings || [];
  const clientOrders = useMemo(() => (st.clientOrders || []).filter(o => o.month === globalMonth), [st.clientOrders, globalMonth]);

  const VAT_RATE = 0.1;

  const settlementData = useMemo(() => {
    return clientOrders.map(order => {
      const client = clients.find(c => c.id === order.clientId);
      const pm = priceMappings.find(p => p.clientId === order.clientId && p.month === globalMonth);
      const mapping = mappings.find(m => m.clientId === order.clientId && m.month === globalMonth);
      let totalAmount = 0, totalQty = 0;
      const settItems = (order.items || []).map(oi => {
        const masterItem = items.find(i => i.id === oi.itemId);
        const mapped = mapping?.mappedItems?.find(m => m.uid === oi.uid);
        const unitPrice = pm?.prices?.[oi.itemId] || masterItem?.unitPrice || 0;
        const qty = (Number(oi.qty1)||0) + (Number(oi.qty2)||0);
        const amount = qty * unitPrice;
        totalAmount += amount;
        totalQty += qty;
        return { name: mapped?.clientItemName || masterItem?.name || '', unit: masterItem?.unit || '', qty, unitPrice, amount };
      }).filter(i => i.qty > 0);
      const vat = Math.floor(totalAmount * VAT_RATE);
      const totalWithVat = totalAmount + vat;
      return { clientId: order.clientId, clientName: client?.name || order.clientId, shortName: client?.shortName || order.clientId, items: settItems, totalAmount, totalQty, vat, totalWithVat };
    }).filter(s => s.items.length > 0);
  }, [clientOrders, clients, items, priceMappings, mappings, globalMonth]);

  const selected = selectedClient ? settlementData.find(s => s.clientId === selectedClient) : null;

  const handlePrint = () => window.print();

  const dlAll = () => {
    let html = '';
    settlementData.forEach(s => {
      html += `<h2>${s.clientName}</h2><table><tr><th>No</th><th>품목명</th><th>단위</th><th>수량</th><th>단가</th><th>공급가액</th></tr>`;
      s.items.forEach((it,i) => { html += `<tr><td>${i+1}</td><td>${it.name}</td><td>${it.unit}</td><td>${Utils.fmt(it.qty)}</td><td>${Utils.fmt(it.unitPrice)}</td><td>${Utils.fmt(it.amount)}</td></tr>`; });
      html += `<tr><td colspan="5" style="text-align:right;font-weight:bold;">공급가 합계</td><td>${Utils.fmt(s.totalAmount)}</td></tr>`;
      html += `<tr><td colspan="5" style="text-align:right;font-weight:bold;">부가세(10%)</td><td>${Utils.fmt(s.vat)}</td></tr>`;
      html += `<tr><td colspan="5" style="text-align:right;font-weight:bold;">총 청구금액</td><td><b>${Utils.fmt(s.totalWithVat)}</b></td></tr></table><br/>`;
    });
    Utils.dlExcel(html, `정산청구서_전체_${globalMonth}`);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; margin: 0; padding: 0; background: white; box-shadow: none; border: none; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="space-y-4 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-2 no-print">
          <h1 className="text-xl font-black text-white">자동 정산/청구서 — {globalMonth}</h1>
          <div className="flex gap-2">
            <button onClick={dlAll} className="btn-secondary flex items-center gap-1.5">{Ic.Down} 전체 엑셀</button>
            {selected && <button onClick={handlePrint} className="btn-primary flex items-center gap-1.5">{Ic.Print2} 명세서 출력</button>}
          </div>
        </div>

        <div className="no-print">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input-base w-64 mb-4">
            <option value="">보건소 선택 (선택 시 청구서 출력 가능)</option>
            {settlementData.map(s => <option key={s.clientId} value={s.clientId}>{s.clientName}</option>)}
          </select>
        </div>

        {!selected ? (
          /* 전체 요약 목록 */
          <div className="card no-print">
            {settlementData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">이번달 발주 내역이 없습니다.</p>
            ) : (
              <table className="table-base">
                <thead>
                  <tr><th>보건소</th><th className="text-right">품목수</th><th className="text-right">공급가액</th><th className="text-right">부가세</th><th className="text-right">청구금액</th></tr>
                </thead>
                <tbody>
                  {settlementData.map(s => (
                    <tr key={s.clientId} className="cursor-pointer" onClick={() => setSelectedClient(s.clientId)}>
                      <td className="font-black text-indigo-400 hover:text-indigo-300">{s.clientName}</td>
                      <td className="text-right text-slate-300">{s.items.length}개</td>
                      <td className="text-right tabular-nums text-slate-300">{Utils.fmt(s.totalAmount)}</td>
                      <td className="text-right tabular-nums text-slate-400">{Utils.fmt(s.vat)}</td>
                      <td className="text-right tabular-nums font-black text-emerald-400">{Utils.fmtMoney(s.totalWithVat)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-500">
                    <td className="font-black text-white">합계</td>
                    <td></td>
                    <td className="text-right font-black text-white tabular-nums">{Utils.fmt(settlementData.reduce((s,d)=>s+d.totalAmount,0))}</td>
                    <td className="text-right font-black text-slate-300 tabular-nums">{Utils.fmt(settlementData.reduce((s,d)=>s+d.vat,0))}</td>
                    <td className="text-right font-black text-emerald-400 tabular-nums">{Utils.fmtMoney(settlementData.reduce((s,d)=>s+d.totalWithVat,0))}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* 청구서 상세 */
          <div className="print-area">
            <div className="no-print mb-4">
              <button onClick={() => setSelectedClient('')} className="btn-secondary text-sm">{Ic.ChevL} 목록으로</button>
            </div>
            <div className="bg-white text-black rounded-xl p-8 shadow-xl border border-slate-200 print:shadow-none print:border-none print:rounded-none">
              {/* 헤더 */}
              <div className="border-b-4 border-slate-800 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-black text-slate-800">거래명세서</h1>
                    <p className="text-slate-500 mt-1">{globalMonth} 영양플러스 공급내역</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-500">공급자</p>
                    <p className="font-black text-slate-800">웰쉐어 사회적협동조합</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-8">
                  <div>
                    <p className="text-xs font-bold text-slate-400">수신</p>
                    <p className="font-black text-slate-800 text-lg">{selected.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">발행일</p>
                    <p className="font-bold text-slate-600">{Utils.today()}</p>
                  </div>
                </div>
              </div>

              {/* 테이블 */}
              <table className="w-full text-left border-collapse border-y-2 border-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm">
                    <th className="py-3 px-4 border-b border-slate-300 font-black text-center w-12">No</th>
                    <th className="py-3 px-4 border-b border-slate-300 font-black">품목명</th>
                    <th className="py-3 px-4 border-b border-slate-300 font-black text-center w-20">단위</th>
                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-24">수량</th>
                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-32">단가 (원)</th>
                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-36">공급가액 (원)</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-200 text-sm">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">{i+1}</td>
                      <td className="py-3 px-4 font-black text-slate-800">{it.name}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{it.unit}</td>
                      <td className="py-3 px-4 text-right font-black text-blue-600">{Utils.fmt(it.qty)}</td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums">{Utils.fmt(it.unitPrice)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-800 tabular-nums">{Utils.fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan="3" className="py-3 px-4 text-right font-black text-slate-700 border-t border-slate-300">합 계</td>
                    <td className="py-3 px-4 text-right font-black text-blue-600 border-t border-slate-300">{Utils.fmt(selected.totalQty)}</td>
                    <td colSpan="2" className="py-3 px-4 text-right font-black text-blue-600 text-lg border-t border-slate-300 tabular-nums">₩ {Utils.fmt(selected.totalAmount)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td colSpan="5" className="py-2 px-4 text-right font-bold text-slate-500">부가세 (10%)</td>
                    <td className="py-2 px-4 text-right font-bold text-slate-500 tabular-nums">₩ {Utils.fmt(selected.vat)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan="5" className="py-4 px-4 text-right font-black text-slate-800 text-base border-t-2 border-slate-400">총 청구금액</td>
                    <td className="py-4 px-4 text-right font-black text-2xl text-blue-700 border-t-2 border-slate-400 tabular-nums">₩ {Utils.fmt(selected.totalWithVat)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* 서명란 */}
              <div className="mt-8 flex justify-end gap-8">
                {['담당자','확인','결재'].map(label => (
                  <div key={label} className="text-center">
                    <div className="w-20 h-16 border-2 border-slate-300 rounded mb-1" />
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
