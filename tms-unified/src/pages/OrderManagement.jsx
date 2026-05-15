import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Brain, Download, AlertTriangle, FileCheck2 } from 'lucide-react';
import { Utils } from '../Utils';

export function OrderRegister() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState('');
  const [gridData, setGridData] = useState(Array.from({ length: 15 }, () => ({ itemName: '', reqBoxes: '', fbId: null })));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), snap => setItems(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubClients = onSnapshot(collection(db, 'clients'), snap => setClients(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    return () => { unsubItems(); unsubClients(); };
  }, []);

  useEffect(() => {
    if (!targetDate || !selectedClient) return;
    const unsub = onSnapshot(collection(db, 'clientOrders'), snap => {
      const existing = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.date === targetDate && d.clientId === selectedClient);
      
      // 형님의 요청사항 완벽 반영: 하드코딩 빈칸 15개가 아니라, 실데이터(items)를 쫙 뿌려줍니다.
      let newGrid = [];
      if (items.length > 0) {
        // DB에 등록된 모든 실데이터 품목을 기본 폼으로 세팅
        newGrid = items.map(item => {
           const match = existing.find(ex => ex.itemName.trim() === item.name.trim());
           return {
              itemName: item.name,
              reqBoxes: match ? match.reqBoxes : '',
              fbId: match ? match.id : null
           };
        });
      } else {
        // 품목이 아예 없을 때만 최소한의 빈칸 제공
        newGrid = Array.from({ length: 15 }, () => ({ itemName: '', reqBoxes: '', fbId: null }));
      }
      
      // 기존 발주 내역 중에 현재 품목DB에 없는 항목(수기입력 등)이 있다면 아래에 추가
      existing.forEach(ex => {
        if (!newGrid.find(row => row.itemName.trim() === ex.itemName.trim())) {
          newGrid.push({ itemName: ex.itemName, reqBoxes: ex.reqBoxes, fbId: ex.id });
        }
      });
      
      setGridData(newGrid);
      setOrders(existing);
    });
    return () => unsub();
  }, [targetDate, selectedClient, items]);

  const handleGridChange = (idx, field, value) => {
    const newData = [...gridData]; newData[idx][field] = value; setGridData(newData);
  };

  const handlePaste = (e, startIdx) => {
    e.preventDefault();
    const clipData = Utils.parseClip(e);
    if (!clipData || clipData.length === 0) return alert('클립보드 데이터 인식 실패');
    const newData = [...gridData];
    let currRow = startIdx;
    clipData.forEach(row => {
      if (currRow >= newData.length) newData.push({ itemName: '', reqBoxes: '', fbId: null });
      if (row[0]) newData[currRow].itemName = row[0].text;
      if (row[1]) newData[currRow].reqBoxes = row[1].text.replace(/[^0-9.]/g, '');
      currRow++;
    });
    setGridData(newData);
  };

  const handleSaveBatch = async () => {
    if (!selectedClient) return alert('보건소를 먼저 선택해주세요.');
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      gridData.forEach(row => {
        if (!row.itemName.trim()) {
           if (row.fbId) batch.delete(doc(db, 'clientOrders', row.fbId));
           return;
        }
        const dataObj = { date: targetDate, clientId: selectedClient, itemName: row.itemName.trim(), reqBoxes: Number(row.reqBoxes) || 0, updatedAt: new Date().toISOString() };
        if (row.fbId) batch.update(doc(db, 'clientOrders', row.fbId), dataObj);
        else { const newRef = doc(collection(db, 'clientOrders')); batch.set(newRef, dataObj); }
        count++;
      });
      await batch.commit();
      alert(`총 \${count}건 저장 완료!`);
    } catch (e) { alert('저장 실패: ' + e.message); } 
    finally { setIsSaving(false); }
  };

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name || '보건소';

  return (
    <div className="w-full h-full bg-[#f8f9fc] p-6 lg:p-10 animate-fade-in flex flex-col font-['Pretendard','Inter',sans-serif]">
      {/* Removed Header to maximize workspace */}

      <div className="flex-1 bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-[#e2e8f0] flex flex-col relative overflow-hidden">
        {/* Title Bar like Legacy */}
        <div className="px-8 py-6 border-b border-[#edf2f7] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#faf5ff]/30">
          <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-[#44337a]">[{targetDate}] {selectedClientName} 발주 엑셀입력폼</h3>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-3 bg-white border border-[#e2e8f0] rounded-[14px] font-bold text-gray-700 shadow-sm focus:border-[#805ad5] outline-none w-full md:w-44 text-center" />
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="px-4 py-3 bg-white border border-[#e2e8f0] rounded-[14px] font-bold text-gray-700 shadow-sm focus:border-[#805ad5] outline-none w-full md:w-60">
                <option value="">보건소를 선택하세요</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 pb-32">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#faf5ff] text-[#44337a]">
                <th className="w-16 py-4 px-2 font-black text-[15px] border-b border-[#e2e8f0] rounded-tl-[16px]">#</th>
                <th className="w-1/2 py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0]">품목명 (보건소 등록명칭)</th>
                <th className="w-1/4 py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0]">발주량 (Box/EA)</th>
                <th className="w-1/4 py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0] rounded-tr-[16px]">비고 (매칭)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7]">
              {gridData.map((row, idx) => {
                const matchedItem = items.find(it => it.name.trim() === row.itemName.trim() && row.itemName.trim() !== '');
                return (
                  <tr key={idx} className="hover:bg-[#faf5ff]/50 transition-colors group">
                    <td className="py-4 text-[#a0aec0] font-black text-sm">{idx + 1}</td>
                    <td className="p-0 relative">
                      <input type="text" value={row.itemName} onChange={e => handleGridChange(idx, 'itemName', e.target.value)} onPaste={e => handlePaste(e, idx)}
                        className="w-full h-full min-h-[56px] px-6 py-2 outline-none font-bold text-[#2d3748] text-[16px] bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-[#b794f4] transition-all"
                        placeholder="품명 붙여넣기"
                      />
                    </td>
                    <td className="p-0 relative">
                      <input type="number" value={row.reqBoxes} onChange={e => handleGridChange(idx, 'reqBoxes', e.target.value)}
                        className="w-full h-full min-h-[56px] px-6 py-2 outline-none font-black text-[#3182ce] text-[18px] bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-[#b794f4] transition-all"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-4 px-6 text-sm font-bold">
                      {row.itemName.trim() === '' ? <span className="text-gray-300">-</span> : matchedItem ? <span className="text-[#38a169]">매칭완료</span> : <span className="text-[#e53e3e]">미등록</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Massive Floating Action Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#edf2f7] p-6 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)] rounded-b-[32px]">
          <div className="text-[#e53e3e] font-bold text-[15px] flex items-center gap-2">
              <AlertTriangle size={20}/> 첫 번째 입력 칸에 엑셀 데이터를 붙여넣기(Ctrl+V) 하세요.
          </div>
          <div className="flex gap-3">
              <button onClick={() => setGridData([...gridData, { itemName: '', reqBoxes: '', fbId: null }])} className="px-8 py-4 bg-[#edf2f7] text-[#4a5568] font-black rounded-[16px] text-lg hover:bg-[#e2e8f0] transition-colors">
                + 행 추가
              </button>
              <button onClick={handleSaveBatch} disabled={isSaving || !selectedClient} className="px-10 py-4 bg-[#805ad5] text-white font-black rounded-[16px] text-lg shadow-[0_8px_20px_rgba(128,90,213,0.3)] hover:bg-[#6b46c1] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2">
                {isSaving ? '저장 중...' : '작성 완료 (일괄저장)'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderSummary() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const snapOrders = await getDocs(collection(db, 'clientOrders'));
      const snapItems = await getDocs(collection(db, 'items'));
      const itemsList = snapItems.docs.map(d => d.data());
      const ordersList = snapOrders.docs.map(d => d.data()).filter(o => o.date === targetDate);
      
      const aggMap = {};
      ordersList.forEach(order => {
        const itemName = order.itemName.trim();
        if(!aggMap[itemName]) {
           const itemInfo = itemsList.find(i => i.name === itemName) || {};
           aggMap[itemName] = { itemName, category: itemInfo.category || '미분류', unit: itemInfo.unit || '-', totalReqBoxes: 0, lossRate: 0 };
        }
        aggMap[itemName].totalReqBoxes += Number(order.reqBoxes) || 0;
      });

      const finalData = Object.values(aggMap).map(item => {
        let lossRate = 0;
        if(item.category.includes('과일')) lossRate = 0.1;
        if(item.category.includes('야채')) lossRate = 0.05;
        const aiRecommend = Math.ceil(item.totalReqBoxes * (1 + lossRate));
        return { ...item, lossRate, aiRecommend };
      });
      finalData.sort((a,b) => a.category.localeCompare(b.category) || a.itemName.localeCompare(b.itemName));
      setSummaryData(finalData);
    } catch(e) { alert('데이터 집계 오류'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, [targetDate]);

  const handlePrint = () => {
    let html = `<table><thead><tr><th>분류</th><th>품목명</th><th>보건소합계(요청)</th><th>AI추천발주(로스적용)</th></tr></thead><tbody>`;
    summaryData.forEach(d => { html += `<tr><td>\${d.category}</td><td class="text-left">\${d.itemName}</td><td class="highlight">\${d.totalReqBoxes}</td><td style="color:#805ad5; font-weight:900;">\${d.aiRecommend}</td></tr>`; });
    html += `</tbody></table>`;
    Utils.printContent(`[\${targetDate}] AI 발주 집계 내역서`, html);
  };

  return (
    <div className="w-full h-full bg-[#f8f9fc] p-6 lg:p-10 animate-fade-in flex flex-col font-['Pretendard','Inter',sans-serif]">
      {/* Removed Header to maximize workspace */}

      <div className="flex-1 bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-[#e2e8f0] flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center px-8 py-6 border-b border-[#edf2f7] bg-[#faf5ff]/30">
          <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-[#44337a]">[\${targetDate}] 집계표</h3>
          </div>
          <div className="flex gap-4">
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-4 py-3 bg-white border border-[#e2e8f0] rounded-[14px] font-bold text-gray-700 shadow-sm focus:border-[#805ad5] outline-none" />
              <button onClick={fetchSummary} className="px-6 py-3 bg-white text-[#6b46c1] border border-[#d6bcfa] font-bold rounded-[14px] hover:bg-[#faf5ff] transition-colors">새로고침</button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-3 bg-[#805ad5] text-white font-black rounded-[14px] shadow-lg shadow-[#805ad5]/30 hover:bg-[#6b46c1] transition-all hover:-translate-y-0.5"><Download size={18}/> 집계표 인쇄</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {loading ? <div className="text-center font-bold text-gray-400 py-20 text-lg animate-pulse">AI가 로스율을 반영하여 발주량을 계산하고 있습니다...</div> : summaryData.length === 0 ? <div className="text-center font-bold text-gray-400 py-20 text-lg">해당 일자에 등록된 데이터가 없습니다.</div> : (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-[#faf5ff] text-[#44337a]">
                  <th className="py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0] rounded-tl-[16px]">분류</th>
                  <th className="py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0]">품목명</th>
                  <th className="py-4 px-6 font-black text-[15px] border-b border-[#e2e8f0]">순수 요청량(Box)</th>
                  <th className="py-4 px-6 font-black text-[16px] border-b border-[#e2e8f0] text-[#805ad5] rounded-tr-[16px]">AI 추천발주량(Box)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f7]">
                {summaryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#faf5ff]/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#a0aec0] text-[15px]">{row.category}</td>
                    <td className="py-5 px-6 font-black text-[#2d3748] text-[16px] text-left">{row.itemName}</td>
                    <td className="py-5 px-6 font-black text-gray-600 text-[18px]">{row.totalReqBoxes}</td>
                    <td className="py-5 px-6 font-black text-[#805ad5] text-[22px] bg-[#faf5ff]/50 rounded-lg m-1">{row.aiRecommend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
