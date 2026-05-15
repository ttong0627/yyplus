import React, { useState, useEffect } from 'react';
import { Receipt, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetMonth, setTargetMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // DB 연동: 실제 invoices 컬렉션 구독
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'invoices'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // targetMonth로 필터링 (date 기준)
      const filtered = data.filter(d => d.date && d.date.startsWith(targetMonth));
      setInvoices(filtered.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, [targetMonth]);

  // DB 연동: clientOrders 기반으로 실제 청구서 생성 (하드코딩 제거)
  const generateMonthlyInvoices = async () => {
    if (!window.confirm(`${targetMonth}월 청구서를 일괄 발행하시겠습니까?`)) return;
    try {
      const snapOrders = await getDocs(collection(db, 'clientOrders'));
      const snapItems = await getDocs(collection(db, 'items'));
      const snapClients = await getDocs(collection(db, 'clients'));
      
      const itemsMap = {};
      snapItems.docs.forEach(d => { const data = d.data(); itemsMap[data.name.trim()] = Number(data.unitPrice) || 0; });
      const clientsMap = {};
      snapClients.docs.forEach(d => { clientsMap[d.id] = d.data().name; });

      const clientTotals = {};
      snapOrders.docs.forEach(d => {
        const o = d.data();
        if (o.date && o.date.startsWith(targetMonth)) {
          if (!clientTotals[o.clientId]) clientTotals[o.clientId] = 0;
          const price = itemsMap[o.itemName.trim()] || 0;
          clientTotals[o.clientId] += (Number(o.reqBoxes) * price);
        }
      });

      let count = 0;
      for (const [clientId, totalAmount] of Object.entries(clientTotals)) {
        if (totalAmount > 0) {
          await addDoc(collection(db, 'invoices'), {
            invoiceNo: `INV-${targetMonth.replace('-','')}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`,
            clientId,
            clientName: clientsMap[clientId] || '알 수 없는 보건소',
            amount: totalAmount,
            date: targetMonth + '-01',
            dueDate: targetMonth + '-25',
            status: '입금대기',
            createdAt: serverTimestamp()
          });
          count++;
        }
      }
      alert(`총 ${count}건의 청구서가 발행되었습니다.`);
    } catch(e) {
      alert('청구서 발행 실패: ' + e.message);
    }
  };

  const totalAmount = invoices.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  const paidAmount = invoices.filter(i => i.status === '완료').reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  const unpaidAmount = invoices.filter(i => i.status !== '완료').reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);

  return (
    <div className="w-full h-full animate-fade-in flex flex-col p-4 sm:p-6 bg-[#f8f9fc]">
      {/* 1-Depth Flattening - 배너 제거, 곧바로 유틸리티 툴바 */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 p-4 mb-4 flex justify-between items-center">
        <input 
          type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
        />
        <button onClick={generateMonthlyInvoices} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-md shadow-indigo-200 transition-all flex items-center gap-2 text-sm">
          <Receipt size={18} /> 실데이터 기반 계산서 일괄발행
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
          <p className="text-sm font-bold text-slate-500">선택 월 총 청구액</p>
          <p className="text-2xl font-black text-slate-800">₩{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
          <p className="text-sm font-bold text-slate-500">입금 완료</p>
          <p className="text-2xl font-black text-emerald-600">₩{paidAmount.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-between h-28">
          <p className="text-sm font-bold text-rose-600">미수금 / 입금대기</p>
          <p className="text-2xl font-black text-rose-700">₩{unpaidAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-black">
                <th className="p-4 pl-6 border-b border-slate-200">청구 번호</th>
                <th className="p-4 border-b border-slate-200">고객사(보건소)</th>
                <th className="p-4 border-b border-slate-200">청구 금액</th>
                <th className="p-4 border-b border-slate-200">발행기준월</th>
                <th className="p-4 text-center border-b border-slate-200">계산서</th>
                <th className="p-4 pr-6 text-right border-b border-slate-200">입금 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold">데이터를 불러오는 중입니다...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold">해당 월에 발행된 청구 내역이 없습니다. (실제 발주 데이터가 필요합니다)</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-500 text-sm">{inv.invoiceNo}</td>
                  <td className="p-4 font-black text-slate-800">{inv.clientName}</td>
                  <td className="p-4 font-black text-indigo-600">₩{Number(inv.amount).toLocaleString()}</td>
                  <td className="p-4 text-sm font-bold text-slate-600">{inv.date.substring(0,7)}</td>
                  <td className="p-4 text-center">
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block">
                      <Download size={18} />
                    </button>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${
                      inv.status === '완료' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === '연체' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {inv.status === '완료' && <CheckCircle2 size={14} />}
                      {inv.status === '연체' && <AlertCircle size={14} />}
                      {inv.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
