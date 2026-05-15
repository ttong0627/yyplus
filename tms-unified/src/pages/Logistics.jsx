import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, Search, Filter } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function Logistics() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for initial view (Fallback if DB is empty)
  const mockDeliveries = [
    { id: 'DEL-20260515-01', driver: '김기사', vehicle: '11가 1234', status: '배송중', destination: '서울 강남구 테헤란로 123', time: '14:30 예상' },
    { id: 'DEL-20260515-02', driver: '이운전', vehicle: '22나 5678', status: '대기중', destination: '경기 성남시 판교역로 456', time: '-' },
    { id: 'DEL-20260515-03', driver: '박물류', vehicle: '33다 9012', status: '배송완료', destination: '인천 연수구 송도과학로 789', time: '10:15 완료' },
  ];

  useEffect(() => {
    // Real DB Connection later
    const timer = setTimeout(() => {
      setDeliveries(mockDeliveries);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">물류/배송 관리</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">실시간 차량 할당 및 배송 현황 추적</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold tracking-wide shadow-md transition-colors flex items-center gap-2">
          <Truck size={18} />
          신규 배차 등록
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '전체 배차', value: '24', icon: <Truck size={24} className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: '배송 중', value: '8', icon: <Clock size={24} className="text-amber-500" />, bg: 'bg-amber-50' },
          { label: '배송 완료', value: '16', icon: <MapPin size={24} className="text-emerald-500" />, bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stat.bg}`}>{stat.icon}</div>
            <div>
              <p className="text-sm font-bold text-gray-500">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="배송 번호, 기사명 검색..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium bg-white" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto">
            <Filter size={16} /> 필터
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">배송 번호</th>
                <th className="p-4">기사 정보</th>
                <th className="p-4">도착지</th>
                <th className="p-4">시간</th>
                <th className="p-4 pr-6 text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">데이터를 불러오는 중입니다...</td></tr>
              ) : deliveries.map((del) => (
                <tr key={del.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-4 pl-6 font-bold text-gray-900 text-sm">{del.id}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-sm">{del.driver}</span>
                      <span className="text-xs text-gray-500 font-medium">{del.vehicle}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium">{del.destination}</td>
                  <td className="p-4 text-sm text-gray-600 font-medium">{del.time}</td>
                  <td className="p-4 pr-6 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      del.status === '배송중' ? 'bg-blue-100 text-blue-700' :
                      del.status === '배송완료' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {del.status}
                    </span>
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
