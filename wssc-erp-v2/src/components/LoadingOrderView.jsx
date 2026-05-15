import React, { useMemo } from 'react';
import { Ic } from '../App.jsx';

export const LoadingOrderView = ({ clients=[], clientOrders=[], globalMonth }) => {
    
    // 이달에 해당하는 배송 내역 중, 기사들이 상차해야 할 정보를 모아줍니다.
    const loadingList = useMemo(() => {
        const list = [];
        (clientOrders||[]).filter(o => o?.month === globalMonth).forEach(o => {
            const client = clients.find(c => c.id === o.clientId);
            if (!client) return;
            if (o.deliveryDate1) list.push({ ...o, targetDate: o.deliveryDate1, round: 1, clientName: client.shortName, contact: client.contact });
            if (o.deliveryDate2) list.push({ ...o, targetDate: o.deliveryDate2, round: 2, clientName: client.shortName, contact: client.contact });
        });
        return list.sort((a,b) => String(a.targetDate).localeCompare(String(b.targetDate)));
    }, [clients, clientOrders, globalMonth]);

    const printPage = () => window.print();

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in bg-slate-50">
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none print:hidden">
                <h2 className="text-2xl font-black text-[#29B4E3] flex items-center gap-3"><Ic.Truck size={28}/> 상차 지시서 (물류팀용)</h2>
                <div className="flex gap-2">
                    <button onClick={printPage} className="bg-gradient-to-r from-[#29B4E3] to-[#1da1cc] text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"><Ic.Print size={18}/> 지시서 인쇄</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 px-2 print:block">
                {loadingList.length === 0 ? <div className="col-span-full py-20 text-center text-slate-400 font-bold">이번 달 배송/상차 일정이 없습니다.</div> :
                 loadingList.map((item, idx) => (
                    <div key={`${item.id}_${item.round}`} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-200 flex flex-col print:mb-8 print:break-inside-avoid">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <span className="bg-[#29B4E3]/10 text-[#209bc5] px-3 py-1 rounded-lg text-[11px] font-black mb-2 inline-block shadow-sm border border-[#29B4E3]/20">{item.round}차 배송일: {item.targetDate}</span>
                                <h3 className="text-xl font-black text-slate-800">{item.clientName}</h3>
                            </div>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://wssc-erp.web.app/routing/${item.id}`} alt="QR" className="w-16 h-16 rounded-xl border-2 border-[#29B4E3]/20 p-1 shadow-sm" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-xs text-slate-500 font-bold"><span className="text-slate-400 mr-2">담당자 연락처:</span> {item.contact}</p>
                            <div className="bg-cyan-50/30 p-4 rounded-xl border border-cyan-100 mt-4 shadow-inner">
                                <h4 className="text-[11px] font-black text-[#29B4E3] mb-2 flex items-center gap-1"><Ic.Box size={14}/> 상차 품목 요약</h4>
                                <ul className="text-sm font-bold text-slate-700 space-y-1.5">
                                    {item.items && item.items.slice(0, 3).map((it, i) => (
                                        <li key={i} className="flex justify-between items-center border-b border-cyan-100/50 pb-1"><span>{it.itemId}</span> <span className="text-[#8b2f97] font-black">{item.round===1 ? it.qty1 : it.qty2} 박스</span></li>
                                    ))}
                                    {item.items && item.items.length > 3 && <li className="text-slate-400 text-xs mt-2 text-center bg-white rounded p-1 shadow-sm border border-slate-100">...외 {item.items.length - 3}건</li>}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t flex justify-between items-center text-xs text-slate-400 font-bold">
                            <span>스마트폰 카메라로 우측 상단 QR을 찍으면 배송 완료 처리 앱으로 이동합니다.</span>
                        </div>
                    </div>
                 ))
                }
            </div>
        </div>
    );
};
