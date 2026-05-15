import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function ReceiptPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const suppliers = st.suppliers || [];
  const items = st.items || [];
  const purchases = (st.purchaseRequests || []).filter(p => p.month === globalMonth && (!selectedSupplier || p.supplierId === selectedSupplier));
  const receipts = st.receipts || [];

  const toggleReceipt = (purchaseId, itemId) => {
    const key = `${purchaseId}_${itemId}`;
    const list = [...receipts];
    const idx = list.findIndex(r => r.key === key);
    if (idx > -1) list.splice(idx, 1);
    else list.push({ key, purchaseId, itemId, receivedAt: new Date().toISOString(), month: globalMonth });
    updateSt('receipts', list);
    showToast('입고 상태가 변경되었습니다.', 'success');
  };

  const isReceived = (purchaseId, itemId) => receipts.some(r => r.key === `${purchaseId}_${itemId}`);

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-black text-white">입고 확인 — {globalMonth}</h1>

      <div className="card">
        <div className="flex gap-3 items-center mb-4">
          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="input-base w-48">
            <option value="">전체 거래처</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {purchases.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">구매 요청 내역이 없습니다.</p>
        ) : purchases.map(pr => {
          const supplier = suppliers.find(s => s.id === pr.supplierId);
          return (
            <div key={pr.id} className="mb-6">
              <h3 className="font-black text-white mb-2">{supplier?.name || pr.supplierId}</h3>
              <table className="table-base">
                <thead><tr><th>품목명</th><th>단위</th><th className="text-right">수량</th><th className="text-center">입고확인</th></tr></thead>
                <tbody>
                  {(pr.items || []).map(item => {
                    const masterItem = items.find(i => i.id === item.itemId);
                    const received = isReceived(pr.id, item.itemId);
                    return (
                      <tr key={item.itemId}>
                        <td className="font-bold text-white">{masterItem?.name || item.itemId}</td>
                        <td className="text-slate-400">{masterItem?.unit}</td>
                        <td className="text-right font-black text-indigo-300">{Utils.fmt(item.quantity)}</td>
                        <td className="text-center">
                          <button onClick={() => toggleReceipt(pr.id, item.itemId)}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-colors ${received ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-emerald-900/50 hover:text-emerald-400'}`}>
                            {received ? '✓ 입고완료' : '입고확인'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
