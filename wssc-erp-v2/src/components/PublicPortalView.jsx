import React, { useMemo } from 'react';
import { Ic, Utils } from '../App.jsx';

export const PublicPortalView = ({ clients=[], clientOrders=[], globalMonth }) => {
    
    // 이달의 보건소별 배송 진척도를 계산합니다.
    const stats = useMemo(() => {
        return clients.map(c => {
            const ord = clientOrders.find(o => o.clientId === c.id && o.month === globalMonth);
            let total = 0, done = 0;
            if (ord) {
                if (ord.deliveryDate1) { total++; if(ord.done1) done++; }
                if (ord.deliveryDate2) { total++; if(ord.done2) done++; }
            }
            return { ...c, total, done, percent: total > 0 ? Math.round((done/total)*100) : 0, ord };
        }).sort((a,b) => b.percent - a.percent);
    }, [clients, clientOrders, globalMonth]);

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in bg-slate-50">
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none">
                <div>
                    <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-3"><Ic.Dash size={28}/> 보건소 실시간 공유 포털 <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full animate-pulse">LIVE</span></h2>
                    <p className="text-xs text-slate-500 font-bold mt-2">이 화면의 URL을 보건소 담당자에게 전달하면, 아이디 없이 진행 현황을 실시간 모니터링할 수 있습니다.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('공유 링크가 복사되었습니다!'); }} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2"><Ic.Copy size={18}/> 공유 링크 복사</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-10 px-2">
                {stats.length === 0 ? <div className="col-span-full py-20 text-center text-slate-400 font-bold">등록된 보건소가 없습니다.</div> :
                 stats.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-slate-800">{c.shortName}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${c.percent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.percent === 100 ? '배송 완료' : '진행중'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                            <div className={`h-3 rounded-full transition-all duration-1000 ${c.percent === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${c.percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-600 mb-6">
                            <span>진척률: {c.percent}%</span>
                            <span>{c.done}건 완료 / 총 {c.total}건</span>
                        </div>
                        
                        <div className="mt-auto space-y-2">
                            {c.ord?.deliveryDate1 && (
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-xs font-black text-slate-500">1차 배송 ({c.ord.deliveryDate1})</span>
                                    {c.ord.done1 ? <span className="text-emerald-500 font-black text-xs flex items-center gap-1"><Ic.Chk size={14}/> 상차/배송완료</span> : <span className="text-slate-400 font-bold text-xs">준비중</span>}
                                </div>
                            )}
                            {c.ord?.deliveryDate2 && (
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-xs font-black text-slate-500">2차 배송 ({c.ord.deliveryDate2})</span>
                                    {c.ord.done2 ? <span className="text-emerald-500 font-black text-xs flex items-center gap-1"><Ic.Chk size={14}/> 상차/배송완료</span> : <span className="text-slate-400 font-bold text-xs">준비중</span>}
                                </div>
                            )}
                            {!c.ord?.deliveryDate1 && !c.ord?.deliveryDate2 && <div className="text-center text-xs text-slate-400 font-bold py-2">이번 달 배송 일정이 없습니다.</div>}
                        </div>
                    </div>
                 ))
                }
            </div>
        </div>
    );
};
