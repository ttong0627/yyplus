import React, { useState, useEffect } from 'react';
import { Receipt, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for initial view
  const mockInvoices = [
    { id: 'INV-2026-001', client: 'A건설 주식회사', amount: '₩12,500,000', date: '2026.05.01', dueDate: '2026.05.31', status: '입금대기' },
    { id: 'INV-2026-002', client: 'B물류 시스템', amount: '₩3,200,000', date: '2026.05.10', dueDate: '2026.05.25', status: '완료' },
    { id: 'INV-2026-003', client: 'C제조 컴퍼니', amount: '₩8,950,000', date: '2026.04.15', dueDate: '2026.04.30', status: '연체' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setInvoices(mockInvoices);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">청구/정산 관리</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">전자 세금계산서 발행 및 미수금 현황</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold tracking-wide shadow-md transition-all flex items-center gap-2">
          <Receipt size={18} />
          계산서 발행
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <p className="text-sm font-bold text-gray-500">이번 달 총 청구액</p>
          <p className="text-2xl font-black text-gray-900">₩45,500,000</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <p className="text-sm font-bold text-gray-500">입금 완료</p>
          <p className="text-2xl font-black text-emerald-600">₩32,000,000</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-between h-32">
          <p className="text-sm font-bold text-rose-600">미수금 / 연체</p>
          <p className="text-2xl font-black text-rose-700">₩13,500,000</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl shadow-md text-white flex flex-col justify-between h-32">
          <p className="text-sm font-medium text-white/80">세금계산서 미발행</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black">5건</p>
            <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">청구 번호</th>
                <th className="p-4">고객사</th>
                <th className="p-4">청구 금액</th>
                <th className="p-4">발행일 / 납기일</th>
                <th className="p-4 text-center">계산서</th>
                <th className="p-4 pr-6 text-right">입금 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">데이터를 불러오는 중입니다...</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-900 text-sm">{inv.id}</td>
                  <td className="p-4 font-bold text-gray-800 text-sm">{inv.client}</td>
                  <td className="p-4 font-black text-gray-900">{inv.amount}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800 font-medium">{inv.date}</span>
                      <span className="text-xs text-gray-500">~ {inv.dueDate}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block">
                      <Download size={18} />
                    </button>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                      inv.status === '완료' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === '연체' ? 'bg-rose-100 text-rose-700' :
                      'bg-gray-100 text-gray-700'
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

// Simple Arrow Component missing from lucide import
const ArrowRight = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
