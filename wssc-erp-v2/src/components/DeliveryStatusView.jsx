import React, { useState, useEffect, useMemo } from 'react';
import { Ic } from '../App.jsx';

const generateMockCoords = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
    const x = 10 + (Math.abs(hash) % 80);
    const y = 10 + (Math.abs(hash >> 8) % 80);
    return { x, y };
};

export const DeliveryStatusView = ({ clients=[], clientOrders=[], globalMonth }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Simulate live data
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ko-KR'));
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('ko-KR')), 1000);
        return () => clearInterval(t);
    }, []);

    const deliveries = useMemo(() => {
        const list = [];
        (clientOrders||[]).filter(o => o.month === globalMonth).forEach(o => {
            const c = clients.find(x => x.id === o.clientId);
            if (!c) return;
            // Use delivery block and random status for simulation
            const coords = generateMockCoords(c.id);
            const statusOptions = ['완료', '배송중', '대기'];
            const hash = o.id.charCodeAt(0) % 3; 
            list.push({ 
                id: o.id, 
                clientName: c.shortName, 
                coords, 
                block: o.deliveryBlock || 'A', 
                seq: o.routeSequence || 1,
                status: statusOptions[hash]
            });
        });
        return list.sort((a,b) => a.seq - b.seq);
    }, [clientOrders, globalMonth, clients]);

    const stats = useMemo(() => {
        const total = deliveries.length;
        const done = deliveries.filter(d => d.status === '완료').length;
        const active = deliveries.filter(d => d.status === '배송중').length;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        return { total, done, active, pct };
    }, [deliveries]);

    const renderBlockStatus = (blockName, color, driverName) => {
        const items = deliveries.filter(d => d.block === blockName);
        if(items.length === 0) return null;
        const done = items.filter(d => d.status === '완료').length;
        const pct = Math.round((done / items.length) * 100);

        return (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className={`font-black text-lg ${color} flex items-center gap-2`}><Ic.Truck size={20}/> 블럭 {blockName} <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{driverName} 기사</span></h3>
                    <span className="font-black text-slate-700">{pct}% 완료</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className={`h-full ${color.replace('text-','bg-')} transition-all duration-1000`} style={{width: `${pct}%`}}></div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                    {items.map(r => (
                        <div key={r.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-sm">
                            <span className="font-bold text-slate-700">{r.clientName}</span>
                            {r.status === '완료' ? <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded">배송완료</span> : 
                             r.status === '배송중' ? <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded animate-pulse">이동중</span> :
                             <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded">대기</span>}
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in bg-[#f0f2f5] -m-6 p-6 lg:-m-8 lg:p-8">
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.Truck size={28}/> 실시간 배송 관제 시스템 <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">LIVE</span></h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">현장 기사님들의 모바일 앱(수령확인)과 연동되어 실시간 배송 진행률을 모니터링합니다.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-slate-400">현재 시각</p>
                    <p className="text-xl font-black text-[#29B4E3] tabular-nums">{currentTime}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 flex-none">
                <div className="bg-white rounded-3xl p-6 shadow-sm border-t-4 border-slate-800">
                    <p className="text-sm font-bold text-slate-500 mb-1">총 배송 지시</p>
                    <p className="text-4xl font-black text-slate-800">{stats.total} <span className="text-lg text-slate-400">건</span></p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border-t-4 border-blue-500">
                    <p className="text-sm font-bold text-slate-500 mb-1">현재 배송중</p>
                    <p className="text-4xl font-black text-blue-600 animate-pulse">{stats.active} <span className="text-lg text-blue-400">건</span></p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border-t-4 border-[#8b2f97]">
                    <p className="text-sm font-bold text-slate-500 mb-1">배송 완료</p>
                    <p className="text-4xl font-black text-[#8b2f97]">{stats.done} <span className="text-lg text-purple-400">건</span></p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border-t-4 border-[#E94287] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 text-[80px] font-black text-pink-50 -mb-4 -mr-2">{stats.pct}%</div>
                    <p className="text-sm font-bold text-slate-500 mb-1 relative z-10">전체 달성률</p>
                    <p className="text-4xl font-black text-[#E94287] relative z-10">{stats.pct}%</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
                {/* Live Map Dashboard */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                    <h3 className="font-black text-slate-700 flex items-center gap-2 mb-4"><Ic.Map size={20}/> 종합 상황 지도</h3>
                    <div className="flex-1 bg-slate-800 rounded-2xl relative overflow-hidden shadow-inner border border-slate-700">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJNMCA0MEg0MFYwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50"></div>
                        {deliveries.map((r, i) => {
                            const bg = r.status === '완료' ? 'bg-slate-600' : r.status === '배송중' ? 'bg-[#29B4E3] animate-bounce' : 'bg-[#E94287]';
                            const opacity = r.status === '완료' ? 'opacity-30' : 'opacity-100';
                            return (
                                <div key={r.id} className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full ${bg} ${opacity} shadow-[0_0_15px_rgba(41,180,227,0.5)] border border-white/20 z-20 transition-all duration-1000`} style={{ left: `${r.coords.x}%`, top: `${r.coords.y}%` }}>
                                    {r.status === '배송중' && <div className="absolute -top-6 -left-4 bg-white text-[#29B4E3] text-[10px] font-black px-2 py-0.5 rounded shadow-lg whitespace-nowrap"><Ic.Truck size={10} className="inline mr-1"/>{r.clientName} 이동중</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Status by Blocks */}
                <div className="w-full xl:w-[450px] overflow-y-auto scrollbar-hide flex flex-col gap-4">
                    {renderBlockStatus('A', 'text-[#E94287]', '김물류')}
                    {renderBlockStatus('B', 'text-[#29B4E3]', '박배송')}
                    {renderBlockStatus('C', 'text-[#8b2f97]', '이웰쉐')}
                </div>
            </div>
        </div>
    );
};
