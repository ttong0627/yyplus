import React, { useState, useEffect, useMemo } from 'react';
import { Ic } from '../App.jsx';

const fmt = n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2}));// Mock Coordinates Generator for Public Health Centers (보건소)
const generateMockCoords = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
    const x = 10 + (Math.abs(hash) % 80); // 10 to 90
    const y = 10 + (Math.abs(hash >> 8) % 80); // 10 to 90
    return { x, y };
};

export const DeliveryBlockRoutingView = ({ clients=[], clientOrders=[], setClientOrders, globalMonth, toast }) => {
    // 1. 달력에서 설정된 모든 배송일자 추출
    const availableDates = useMemo(() => {
        const dates = new Set();
        (clientOrders||[]).filter(o => o.month === globalMonth).forEach(o => {
            if (o.deliveryDate1) dates.add(o.deliveryDate1);
            if (o.deliveryDate2) dates.add(o.deliveryDate2);
        });
        return Array.from(dates).sort((a,b)=>a.localeCompare(b));
    }, [clientOrders, globalMonth]);

    const [selDate, setSelDate] = useState(availableDates[0] || '');
    
    // 2. 선택된 날짜의 배송 목록
    const [routes, setRoutes] = useState([]);
    
    // Drag and Drop 상태
    const [draggedItemIdx, setDraggedItemIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    
    useEffect(() => {
        if (!selDate) return setRoutes([]);
        const list = [];
        (clientOrders||[]).filter(o => o.month === globalMonth).forEach(o => {
            const c = clients.find(x => x.id === o.clientId);
            if (!c) return;
            const coords = generateMockCoords(c.id);
            // 총수량 계산 (단순화: 1차 배송일이면 qty1, 2차면 qty2 합산)
            let qty = 0;
            if (o.deliveryDate1 === selDate) { (o.items||[]).forEach(it => qty += Number(it.qty1||0)); }
            else if (o.deliveryDate2 === selDate) { (o.items||[]).forEach(it => qty += Number(it.qty2||0)); }
            
            if (o.deliveryDate1 === selDate || o.deliveryDate2 === selDate) {
                // 기존 저장된 순번이 없으면 임시 순번 부여 (AI 초기값)
                const routeIndex = o.routeSequence ? o.routeSequence : list.length + 1;
                list.push({ orderId: o.id, clientId: c.id, clientName: c.shortName, coords, qty, block: o.deliveryBlock || 'A', seq: routeIndex });
            }
        });
        // Seq 기준으로 정렬
        list.sort((a,b) => a.seq - b.seq);
        // 순번 재정렬 (빈틈 메우기)
        list.forEach((r, i) => r.seq = i + 1);
        setRoutes(list);
    }, [selDate, clientOrders, globalMonth, clients]);

    // 3. 드래그앤드랍 직관적인 순서 변경
    const onDragStart = (e, index) => { setDraggedItemIdx(index); e.dataTransfer.effectAllowed = 'move'; };
    const onDragOver = (e, index) => { e.preventDefault(); if (dragOverIdx !== index) setDragOverIdx(index); };
    const onDrop = (e, index) => {
        e.preventDefault();
        if (draggedItemIdx === null) return;
        if (draggedItemIdx !== index) {
            const nx = [...routes];
            const dragged = nx[draggedItemIdx];
            nx.splice(draggedItemIdx, 1);
            nx.splice(index, 0, dragged);
            nx.forEach((r, i) => r.seq = i + 1);
            setRoutes(nx);
        }
        setDraggedItemIdx(null);
        setDragOverIdx(null);
    };
    const onDragEnd = () => { setDraggedItemIdx(null); setDragOverIdx(null); };

    const moveRoute = (index, dir) => {
        const nx = [...routes];
        const target = dir === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= nx.length) return;
        [nx[index], nx[target]] = [nx[target], nx[index]];
        nx.forEach((r, i) => r.seq = i + 1);
        setRoutes(nx);
    };

    const changeBlock = (index, blockId) => {
        const nx = [...routes];
        nx[index].block = blockId;
        setRoutes(nx);
    };

    // 4. 저장 (전역 상태에 반영)
    const saveRoutes = () => {
        const newOrders = [...clientOrders];
        routes.forEach(r => {
            const idx = newOrders.findIndex(o => o.id === r.orderId);
            if (idx > -1) {
                newOrders[idx] = { ...newOrders[idx], deliveryBlock: r.block, routeSequence: r.seq };
            }
        });
        setClientOrders(newOrders);
        toast('배송 블럭 및 라우팅 순번이 기사 앱으로 전송되었습니다!');
    };

    // AI 자동 정렬 (거리 기반 TSP 흉내 - Nearest Neighbor)
    const runAI = () => {
        if(routes.length <= 1) return;
        toast('AI가 거리 기반 최적 경로를 계산합니다...');
        setTimeout(() => {
            const unvisited = [...routes];
            const start = unvisited.shift(); // 첫 번째 노드를 시작점으로 고정 (물류센터 출발지점이라고 가정)
            const sorted = [start];
            let current = start;
            
            while(unvisited.length > 0) {
                let nearestIdx = 0;
                let minDist = Infinity;
                for(let i=0; i<unvisited.length; i++) {
                    const dx = unvisited[i].coords.x - current.coords.x;
                    const dy = unvisited[i].coords.y - current.coords.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < minDist) { minDist = dist; nearestIdx = i; }
                }
                current = unvisited[nearestIdx];
                sorted.push(current);
                unvisited.splice(nearestIdx, 1);
            }
            sorted.forEach((r, i) => r.seq = i + 1);
            setRoutes(sorted);
            toast('AI 경로 최적화가 완료되었습니다.');
        }, 800);
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in bg-[#f0f2f5] -m-6 p-6 lg:-m-8 lg:p-8">
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none">
                <div>
                    <h2 className="text-2xl font-black text-[#29B4E3] flex items-center gap-3"><Ic.ChkSq size={28}/> AI 배송 라우팅 및 블럭 설정</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">지도 상의 위치와 수량을 기반으로 기사별 배송 블럭(권역)을 나누고 순서를 지정합니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selDate} onChange={e=>setSelDate(e.target.value)} className="border-2 border-[#29B4E3]/20 bg-cyan-50/30 text-[#209bc5] font-black rounded-xl p-2 outline-none">
                        <option value="">배송일 선택</option>
                        {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={saveRoutes} className="bg-gradient-to-r from-[#29B4E3] to-[#1da1cc] text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"><Ic.Chk size={18}/> 기사 앱으로 전송</button>
                </div>
            </div>

            {!selDate ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-center"><Ic.Alert size={48} className="mx-auto text-slate-300 mb-4"/><p className="text-slate-500 font-bold">배송일을 먼저 선택해주세요.</p></div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                    {/* Left: AI Map */}
                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur rounded-xl p-3 shadow-md border border-slate-100 flex items-center gap-4">
                            <button onClick={runAI} className="bg-[#8b2f97] text-white px-4 py-2 rounded-lg text-xs font-black shadow-sm hover:scale-105 transition-transform flex items-center gap-1"><Ic.Box size={14}/> AI 최적거리 정렬</button>
                            <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#E94287]"></span> 블럭A</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#29B4E3]"></span> 블럭B</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#8b2f97]"></span> 블럭C</span>
                            </div>
                        </div>

                        {/* Interactive SVG Map Mockup */}
                        <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 relative mt-2 overflow-hidden">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJNMCA0MEg0MFYwIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50"></div>
                            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                                    </marker>
                                </defs>
                                {routes.map((r, i) => {
                                    if(i === routes.length - 1) return null;
                                    const next = routes[i+1];
                                    return (
                                        <line key={`line-${i}`} x1={`${r.coords.x}%`} y1={`${r.coords.y}%`} x2={`${next.coords.x}%`} y2={`${next.coords.y}%`} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowhead)" className="animate-pulse" />
                                    )
                                })}
                            </svg>
                            {routes.map((r, i) => {
                                const bg = r.block === 'A' ? 'bg-[#E94287]' : r.block === 'B' ? 'bg-[#29B4E3]' : 'bg-[#8b2f97]';
                                return (
                                    <div key={r.clientId} className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full ${bg} text-white shadow-lg border-2 border-white flex items-center justify-center font-black text-xs z-20 cursor-pointer hover:scale-125 transition-transform`} style={{ left: `${r.coords.x}%`, top: `${r.coords.y}%` }}>
                                        {i+1}
                                        <div className="absolute top-10 whitespace-nowrap bg-white text-slate-700 text-[10px] px-2 py-1 rounded shadow-md border border-slate-100 font-bold">{r.clientName}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Sequence & Block List */}
                    <div className="w-full lg:w-96 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                            <h3 className="font-black text-slate-700 flex items-center gap-2"><Ic.ListO size={20}/> 배송 순번 및 기사 블럭 할당</h3>
                            <p className="text-[10px] text-slate-500 mt-1">항목을 마우스로 <strong className="text-[#E94287]">드래그(Drag)</strong>해서 원하는 위치에 놓으면 순번이 변경되고, 왼쪽 지도의 경로가 즉시 업데이트됩니다.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {routes.length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm">해당 일자에 배송건이 없습니다.</div> :
                             routes.map((r, i) => (
                                <div 
                                    key={r.clientId} 
                                    draggable
                                    onDragStart={(e) => onDragStart(e, i)}
                                    onDragOver={(e) => onDragOver(e, i)}
                                    onDrop={(e) => onDrop(e, i)}
                                    onDragEnd={onDragEnd}
                                    className={`bg-white p-3 mb-2 rounded-2xl border ${dragOverIdx === i ? 'border-[#E94287] border-dashed bg-pink-50' : 'border-slate-100'} shadow-sm flex items-center gap-3 hover:border-cyan-200 transition-all group cursor-grab active:cursor-grabbing ${draggedItemIdx === i ? 'opacity-50 scale-95' : 'opacity-100'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm flex-none group-hover:bg-[#29B4E3] group-hover:text-white transition-colors">{i+1}</div>
                                    <div className="flex-1 min-w-0 pointer-events-none">
                                        <h4 className="text-sm font-black text-slate-800 truncate">{r.clientName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5"><Ic.Box size={10}/> {fmt(r.qty)} 박스 예정</p>
                                    </div>
                                    <select value={r.block} onChange={e=>changeBlock(i, e.target.value)} className={`text-xs font-black p-1.5 rounded-lg outline-none cursor-pointer flex-none border-2 border-transparent focus:border-slate-300 ${r.block==='A'?'bg-pink-50 text-[#E94287]':r.block==='B'?'bg-cyan-50 text-[#29B4E3]':'bg-purple-50 text-[#8b2f97]'}`}>
                                        <option value="A">블럭 A (기사1)</option>
                                        <option value="B">블럭 B (기사2)</option>
                                        <option value="C">블럭 C (기사3)</option>
                                    </select>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={()=>moveRoute(i, 'up')} disabled={i===0} className="p-1 bg-slate-50 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"><Ic.ArrU size={14}/></button>
                                        <button onClick={()=>moveRoute(i, 'down')} disabled={i===routes.length-1} className="p-1 bg-slate-50 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"><Ic.ArrD size={14}/></button>
                                    </div>
                                </div>
                             ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
