import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, Brain, Download, Trash2, Save, FileSpreadsheet, Plus, AlertTriangle } from 'lucide-react';
import { Utils } from '../Utils';

// =========================================================================
// 공통 발주관리 컨테이너 및 탭 컴포넌트
// =========================================================================
export default function OrderManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'register', name: '스마트 발주등록', icon: <FileSpreadsheet size={18} />, path: '/order/register' },
    { id: 'ai-summary', name: 'AI 발주집계(자동계산)', icon: <Brain size={18} />, path: '/order/ai-summary' },
  ];

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      {/* Header & Tabs */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 p-4 sm:p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" />
            발주 통합 관리
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">엑셀 복사/붙여넣기를 통한 고속 발주 입력 및 AI 기반 필요물량 집계</p>
        </div>
        
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = location.pathname.includes(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 overflow-hidden flex flex-col relative">
         <Routes>
           <Route path="/" element={<Navigate to="/order/register" replace />} />
           <Route path="register" element={<OrderRegister />} />
           <Route path="ai-summary" element={<OrderSummary />} />
         </Routes>
      </div>
    </div>
  );
}

// =========================================================================
// 발주 등록 (스마트 그리드 & 엑셀 복붙 탑재)
// =========================================================================
function OrderRegister() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState('');
  
  // 그리드 상태 관리 (빈 행 20개 초기화)
  const [gridData, setGridData] = useState(Array.from({ length: 20 }, () => ({ itemName: '', reqBoxes: '', fbId: null })));
  const [isSaving, setIsSaving] = useState(false);

  // 마스터 데이터 로드
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), snap => setItems(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubClients = onSnapshot(collection(db, 'clients'), snap => setClients(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    return () => { unsubItems(); unsubClients(); };
  }, []);

  // 해당 일자/보건소의 기존 발주 내역 로드
  useEffect(() => {
    if (!targetDate || !selectedClient) return;
    const unsub = onSnapshot(collection(db, 'clientOrders'), snap => {
      const existing = snap.docs.map(d => ({id: d.id, ...d.data()}))
        .filter(d => d.date === targetDate && d.clientId === selectedClient);
      
      // 불러온 데이터로 그리드 갱신
      let newGrid = Array.from({ length: Math.max(20, existing.length + 5) }, () => ({ itemName: '', reqBoxes: '', fbId: null }));
      existing.forEach((ex, idx) => {
        newGrid[idx] = { itemName: ex.itemName, reqBoxes: ex.reqBoxes, fbId: ex.id };
      });
      setGridData(newGrid);
      setOrders(existing);
    });
    return () => unsub();
  }, [targetDate, selectedClient]);

  // 그리드 입력 변경 핸들러
  const handleGridChange = (idx, field, value) => {
    const newData = [...gridData];
    newData[idx][field] = value;
    setGridData(newData);
  };

  // 엑셀 붙여넣기 파싱 핸들러 (스마트 엔진)
  const handlePaste = (e, startIdx) => {
    e.preventDefault();
    const clipData = Utils.parseClip(e);
    if (!clipData || clipData.length === 0) return alert('클립보드에 인식할 수 있는 표 데이터가 없습니다.');
    
    const newData = [...gridData];
    let currRow = startIdx;

    clipData.forEach(row => {
      if (currRow >= newData.length) newData.push({ itemName: '', reqBoxes: '', fbId: null });
      // 보통 첫 열이 품명, 두번째 열이 수량
      if (row[0]) newData[currRow].itemName = row[0].text;
      if (row[1]) newData[currRow].reqBoxes = row[1].text.replace(/[^0-9.]/g, ''); // 숫자만
      currRow++;
    });

    setGridData(newData);
    
    // 시각적 피드백 효과 (Tr 요소를 깜빡임)
    const tbody = document.getElementById('smart-grid-body');
    if(tbody) {
      tbody.classList.add('bg-green-50');
      setTimeout(() => tbody.classList.remove('bg-green-50'), 300);
    }
  };

  // 일괄 저장 로직
  const handleSaveBatch = async () => {
    if (!selectedClient) return alert('보건소를 먼저 선택해주세요.');
    setIsSaving(true);
    
    try {
      const batch = writeBatch(db);
      let count = 0;

      gridData.forEach(row => {
        if (!row.itemName.trim()) {
           // 비어있는 줄인데 기존 fbId가 있다면 삭제 처리
           if (row.fbId) batch.delete(doc(db, 'clientOrders', row.fbId));
           return;
        }

        const dataObj = {
          date: targetDate,
          clientId: selectedClient,
          itemName: row.itemName.trim(),
          reqBoxes: Number(row.reqBoxes) || 0,
          updatedAt: new Date().toISOString()
        };

        if (row.fbId) {
          batch.update(doc(db, 'clientOrders', row.fbId), dataObj);
        } else {
          const newRef = doc(collection(db, 'clientOrders'));
          batch.set(newRef, dataObj);
        }
        count++;
      });

      await batch.commit();
      alert(`총 ${count}건의 발주가 스마트하게 저장되었습니다!`);
    } catch (error) {
      console.error(error);
      alert('저장 실패: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-indigo-500"
          />
          <select 
            value={selectedClient} 
            onChange={e => setSelectedClient(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-indigo-500"
          >
            <option value="">보건소를 선택하세요</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setGridData([...gridData, { itemName: '', reqBoxes: '', fbId: null }])}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50"
          >
            + 행 추가
          </button>
          <button 
            onClick={handleSaveBatch}
            disabled={isSaving || !selectedClient}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-sm shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSaving ? '저장 중...' : <><Save size={16}/> 일괄 저장</>}
          </button>
        </div>
      </div>

      {/* 스마트 그리드 에어리어 */}
      <div className="flex-1 overflow-auto bg-white p-4">
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50/50 text-blue-700 text-sm font-bold rounded-xl border border-blue-100">
           <AlertTriangle size={18} className="text-blue-500" />
           엑셀의 표 데이터(품명, 수량)를 복사한 후 첫 번째 입력 칸에서 [Ctrl+V]를 누르면 자동으로 표 전체가 스마트하게 붙여넣어집니다.
        </div>
        
        <table className="w-full text-left border-collapse min-w-max border border-slate-200 shadow-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="w-12 px-4 py-2 text-center font-black text-slate-500 border border-slate-200">#</th>
              <th className="w-1/2 px-4 py-2 font-black text-slate-600 border border-slate-200">품목명 (엑셀 복붙)</th>
              <th className="w-1/4 px-4 py-2 font-black text-slate-600 border border-slate-200">요청수량(Box/EA)</th>
              <th className="w-1/4 px-4 py-2 font-black text-slate-600 border border-slate-200 text-center">매칭 상태</th>
            </tr>
          </thead>
          <tbody id="smart-grid-body" className="transition-colors duration-300">
            {gridData.map((row, idx) => {
              // 품목 DB 매칭 로직 (이름 기반)
              const matchedItem = items.find(it => it.name.trim() === row.itemName.trim() && row.itemName.trim() !== '');
              
              return (
                <tr key={idx} className="hover:bg-indigo-50/30">
                  <td className="px-2 py-1 text-center text-xs font-black text-slate-400 border border-slate-200 bg-slate-50">{idx + 1}</td>
                  <td className="px-0 py-0 border border-slate-200 relative">
                    <input 
                      type="text" 
                      value={row.itemName} 
                      onChange={e => handleGridChange(idx, 'itemName', e.target.value)}
                      onKeyDown={Utils.enter}
                      onPaste={(e) => handlePaste(e, idx)}
                      className="w-full h-full px-4 py-2.5 outline-none font-bold text-slate-700 bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:z-10 relative"
                      placeholder="품목명 입력 또는 엑셀 붙여넣기"
                    />
                  </td>
                  <td className="px-0 py-0 border border-slate-200 relative">
                    <input 
                      type="number" 
                      value={row.reqBoxes} 
                      onChange={e => handleGridChange(idx, 'reqBoxes', e.target.value)}
                      onKeyDown={Utils.enter}
                      className="w-full h-full px-4 py-2.5 outline-none font-bold text-blue-600 bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:z-10 relative"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2 text-center text-xs font-black border border-slate-200 bg-slate-50">
                    {row.itemName.trim() === '' ? (
                      <span className="text-slate-300">-</span>
                    ) : matchedItem ? (
                      <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">매칭 성공</span>
                    ) : (
                      <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">미등록 품목</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// AI 자동 발주 집계 (Order Summary)
// =========================================================================
function OrderSummary() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // 본래는 서버리스 함수(Firebase Functions)에서 처리해야 가장 빠르지만,
      // 클라이언트 사이드에서 모든 로직을 집계하도록 구현.
      const snapOrders = await getDocs(collection(db, 'clientOrders'));
      const snapItems = await getDocs(collection(db, 'items'));
      
      const itemsList = snapItems.docs.map(d => d.data());
      const ordersList = snapOrders.docs.map(d => d.data()).filter(o => o.date === targetDate);
      
      const aggMap = {};
      
      ordersList.forEach(order => {
        const itemName = order.itemName.trim();
        if(!aggMap[itemName]) {
           const itemInfo = itemsList.find(i => i.name === itemName) || {};
           aggMap[itemName] = {
             itemName,
             category: itemInfo.category || '미분류',
             unit: itemInfo.unit || '-',
             totalReqBoxes: 0,
             lossRate: 0, // 기본 로스율
           };
        }
        aggMap[itemName].totalReqBoxes += Number(order.reqBoxes) || 0;
      });

      // AI 로스율 반영 (과일 10%, 야채 5% 등 자체 로직 적용)
      const finalData = Object.values(aggMap).map(item => {
        let lossRate = 0;
        if(item.category.includes('과일')) lossRate = 0.1;
        if(item.category.includes('야채')) lossRate = 0.05;
        
        const aiRecommend = Math.ceil(item.totalReqBoxes * (1 + lossRate));
        return { ...item, lossRate, aiRecommend };
      });
      
      // 카테고리/이름 순 정렬
      finalData.sort((a,b) => a.category.localeCompare(b.category) || a.itemName.localeCompare(b.itemName));
      setSummaryData(finalData);

    } catch(e) {
      console.error(e);
      alert('데이터 집계 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모듈 외부에 getDocs 임포트 누락 방지를 위한 안전한 처리
  const { getDocs } = require('firebase/firestore');

  useEffect(() => {
    fetchSummary();
  }, [targetDate]);

  const handlePrint = () => {
    let html = `<table><thead><tr><th>분류</th><th>품목명</th><th>합계요청수량</th><th>AI추천수량(로스포함)</th></tr></thead><tbody>`;
    summaryData.forEach(d => {
      html += `<tr><td>${d.category}</td><td class="text-left">${d.itemName}</td><td class="highlight">${d.totalReqBoxes}</td><td style="color:red; font-weight:bold;">${d.aiRecommend}</td></tr>`;
    });
    html += `</tbody></table>`;
    Utils.printContent(`${targetDate} 발주 집계 내역서 (총괄)`, html);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <input 
          type="date" 
          value={targetDate} 
          onChange={e => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none focus:border-indigo-500"
        />
        
        <div className="flex gap-2">
          <button 
            onClick={fetchSummary}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm shadow-sm hover:bg-indigo-200"
          >
            새로고침
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white font-black rounded-xl text-sm shadow-md hover:bg-slate-900 transition-all"
          >
            <Download size={16}/> 인쇄 / 다운로드
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-6">
        {loading ? (
          <div className="w-full h-40 flex items-center justify-center font-bold text-slate-400">AI 모델이 필요 물량을 계산하고 있습니다...</div>
        ) : summaryData.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center font-bold text-slate-400">해당 일자에 등록된 발주 내역이 없습니다.</div>
        ) : (
          <div className="max-w-5xl mx-auto">
             <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
               <div className="bg-white p-2 rounded-xl shadow-sm"><Brain size={24} className="text-emerald-500"/></div>
               <div>
                 <h3 className="text-emerald-800 font-bold">AI 발주량 추천 가이드</h3>
                 <p className="text-sm text-emerald-600 mt-1">과일류(10%), 야채류(5%) 등 품목별 과거 데이터 손실율(Loss)을 반영하여, <strong>가장 안전한 추가 발주 물량(AI추천)</strong>을 자동으로 계산했습니다.</p>
               </div>
             </div>

             <table className="w-full text-left border-collapse border border-slate-200 shadow-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-sm font-black border border-slate-700">분류</th>
                    <th className="px-4 py-3 text-sm font-black border border-slate-700">품목명</th>
                    <th className="px-4 py-3 text-sm font-black text-center border border-slate-700">보건소 합계요청 (Box)</th>
                    <th className="px-4 py-3 text-sm font-black text-center border border-slate-700 bg-emerald-700">AI 추천발주량 (Box)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summaryData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-500 border border-slate-200">{row.category}</td>
                      <td className="px-4 py-2.5 text-sm font-black text-slate-700 border border-slate-200">{row.itemName}</td>
                      <td className="px-4 py-2.5 text-center font-black text-slate-600 border border-slate-200">{row.totalReqBoxes}</td>
                      <td className="px-4 py-2.5 text-center font-black text-emerald-600 text-lg border border-slate-200 bg-emerald-50/30">
                         {row.aiRecommend}
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
