import React, { useState, useMemo, useRef } from 'react';
import { Ic } from '../App.jsx';

const fmt = n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2}));

export const SettlementView = ({ clients=[], clientOrders=[], items=[], priceMappings=[], globalMonth }) => {
    const [selectedClient, setSelectedClient] = useState(null);

    // 정산 데이터 계산 로직
    const settlementData = useMemo(() => {
        const data = [];
        let grandTotal = 0;
        let totalDeliveredItems = 0;

        clients.forEach(c => {
            const ord = clientOrders.find(o => o.clientId === c.id && o.month === globalMonth);
            if (!ord) return; // 이번 달 발주가 없으면 패스

            // 배송이 전혀 완료되지 않았다면 청구 금액 없음
            if (!ord.done1 && !ord.done2) return;

            const clientBillItems = [];
            let clientTotal = 0;
            let clientItemCount = 0;

            (ord.items || []).forEach(it => {
                const itemMeta = items.find(x => x.id === it.itemId);
                if (!itemMeta) return;

                // 배송 완료된 수량만 합산
                let qty = 0;
                if (ord.done1) qty += Number(it.qty1 || 0);
                if (ord.done2) qty += Number(it.qty2 || 0);

                if (qty === 0) return;

                // 단가 결정 (계약 단가 우선 적용)
                const mapping = priceMappings.find(m => m.clientId === c.id);
                const unitPrice = (mapping && mapping.prices && mapping.prices[it.itemId] !== undefined)
                    ? mapping.prices[it.itemId]
                    : (itemMeta.unitPrice || 0);

                const amount = qty * unitPrice;
                clientTotal += amount;
                clientItemCount += qty;

                clientBillItems.push({
                    name: itemMeta.name,
                    unit: itemMeta.unit,
                    qty,
                    unitPrice,
                    amount
                });
            });

            if (clientBillItems.length > 0) {
                grandTotal += clientTotal;
                totalDeliveredItems += clientItemCount;
                data.push({
                    client: c,
                    items: clientBillItems,
                    totalAmount: clientTotal,
                    totalQty: clientItemCount
                });
            }
        });

        // 금액이 큰 순서대로 정렬
        return { 
            list: data.sort((a,b) => b.totalAmount - a.totalAmount), 
            grandTotal, 
            totalDeliveredItems 
        };
    }, [clients, clientOrders, items, priceMappings, globalMonth]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 relative animate-fade-in bg-[#f0f2f5] -m-6 p-6 lg:-m-8 lg:p-8">
            
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; margin: 0; padding: 0; background: white; box-shadow: none; border: none; }
                    .no-print { display: none !important; }
                    #main-app { overflow: visible !important; }
                }
            `}} />

            {selectedClient ? (
                // 청구서 상세 뷰 (프린트 영역)
                <div className="bg-white flex-1 overflow-y-auto rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
                    <div className="w-full max-w-4xl flex justify-between items-center mb-6 no-print">
                        <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black px-4 py-2 bg-slate-100 rounded-xl transition-colors"><Ic.Dash size={18}/> 목록으로</button>
                        <button onClick={handlePrint} className="flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 font-black px-6 py-3 rounded-xl shadow-md transition-colors"><Ic.Users size={18}/> 명세서 출력 (Print)</button>
                    </div>

                    <div className="print-area w-full max-w-4xl bg-white p-12 border-2 border-slate-800 rounded-lg relative">
                        {/* 워터마크 효과 */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <span className="text-[150px] font-black text-slate-900 tracking-tighter transform -rotate-45">WELLSHARE</span>
                        </div>
                        
                        <div className="flex justify-between items-start border-b-4 border-slate-800 pb-8 mb-8 relative z-10">
                            <div>
                                <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">거래 명세서 <span className="text-xl text-slate-500 font-bold ml-2">(청구서)</span></h1>
                                <p className="text-slate-500 font-bold">청구 월: <span className="text-indigo-600">{globalMonth}</span></p>
                                <p className="text-slate-500 font-bold mt-1">발행 일자: {new Date().toLocaleDateString('ko-KR')}</p>
                            </div>
                            <div className="text-right border-l-2 border-slate-200 pl-8">
                                <h2 className="text-2xl font-black text-[#8b2f97] mb-1">웰쉐어(Wellshare)</h2>
                                <p className="text-sm font-bold text-slate-600">사업자번호: 123-45-67890</p>
                                <p className="text-sm font-bold text-slate-600">대표자: 김웰쉐</p>
                                <p className="text-sm font-bold text-slate-600">주소: 경기도 수원시 영통구 웰쉐어로 123</p>
                                <p className="text-sm font-bold text-slate-600">고객센터: 1588-0000</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-bold text-slate-500 w-20">청구 대상</div>
                                <div className="text-2xl font-black text-slate-800 border-b-2 border-slate-800 pb-1 flex-1">{selectedClient.client.name} <span className="text-sm text-slate-500 font-bold ml-2">귀하</span></div>
                            </div>
                            <div className="flex items-center gap-4 mt-4">
                                <div className="text-sm font-bold text-slate-500 w-20">청구 금액</div>
                                <div className="text-3xl font-black text-blue-600 tabular-nums">₩ {fmt(selectedClient.totalAmount)} <span className="text-base text-slate-600 font-bold ml-1">(VAT 포함)</span></div>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse border-y-2 border-slate-800 relative z-10">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 text-sm">
                                    <th className="py-3 px-4 border-b border-slate-300 font-black text-center w-12">No</th>
                                    <th className="py-3 px-4 border-b border-slate-300 font-black">품목명</th>
                                    <th className="py-3 px-4 border-b border-slate-300 font-black text-center w-20">단위</th>
                                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-24">수량</th>
                                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-32">단가 (원)</th>
                                    <th className="py-3 px-4 border-b border-slate-300 font-black text-right w-36">공급가액 (원)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedClient.items.map((it, i) => (
                                    <tr key={i} className="border-b border-slate-200 text-sm">
                                        <td className="py-3 px-4 text-center font-bold text-slate-500">{i+1}</td>
                                        <td className="py-3 px-4 font-black text-slate-800">{it.name}</td>
                                        <td className="py-3 px-4 text-center text-slate-600">{it.unit}</td>
                                        <td className="py-3 px-4 text-right font-black text-blue-600">{fmt(it.qty)}</td>
                                        <td className="py-3 px-4 text-right text-slate-600 tabular-nums">{fmt(it.unitPrice)}</td>
                                        <td className="py-3 px-4 text-right font-black text-slate-800 tabular-nums">{fmt(it.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-blue-50/50">
                                    <td colSpan="3" className="py-4 px-4 text-right font-black text-slate-700 border-t border-slate-300">합 계</td>
                                    <td className="py-4 px-4 text-right font-black text-blue-600 border-t border-slate-300">{fmt(selectedClient.totalQty)}</td>
                                    <td colSpan="2" className="py-4 px-4 text-right font-black text-blue-600 text-xl border-t border-slate-300 tabular-nums">₩ {fmt(selectedClient.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-12 text-center text-slate-500 font-bold text-sm relative z-10">
                            <p>위 금액을 청구하오니 기일 내 입금하여 주시기 바랍니다.</p>
                            <div className="mt-6 inline-flex flex-col items-center border-t-2 border-slate-800 pt-2 w-64">
                                <span className="font-black text-lg text-slate-800">웰쉐어(Wellshare)</span>
                                <span className="text-xs text-slate-400 mt-1">(직인 생략)</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // 정산 대시보드 리스트
                <>
                    <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6 flex-none">
                        <div>
                            <h2 className="text-2xl font-black text-indigo-600 flex items-center gap-3"><Ic.Cart size={28}/> 월별 배송 완료 건 정산/청구</h2>
                            <p className="text-xs font-bold text-slate-500 mt-1">배송이 완료된 발주 데이터를 기반으로 거래처(보건소)별 최종 청구 금액을 산출합니다.</p>
                        </div>
                        <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-sm border border-indigo-100 flex items-center gap-2">
                            <span>대상 월:</span>
                            <span className="text-lg">{globalMonth}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-none">
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 shadow-md text-white flex justify-between items-center relative overflow-hidden">
                            <Ic.Users size={120} className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white"/>
                            <div>
                                <p className="text-indigo-100 font-bold mb-1">이번 달 총 청구 금액 (VAT 포함)</p>
                                <p className="text-4xl font-black tabular-nums tracking-tight">₩ {fmt(settlementData.grandTotal)}</p>
                            </div>
                            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur">
                                <Ic.Cart size={32}/>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 font-bold mb-1">총 납품된 수량 합계</p>
                                <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{fmt(settlementData.totalDeliveredItems)} <span className="text-lg text-slate-400">박스/건</span></p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <Ic.Box size={32} className="text-slate-400"/>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            {settlementData.list.length === 0 ? (
                                <div className="py-32 text-center flex flex-col items-center text-slate-400">
                                    <Ic.Dash size={64} className="mb-4 opacity-50"/>
                                    <h3 className="text-xl font-black">배송 완료된 건이 없습니다.</h3>
                                    <p className="font-bold text-sm mt-2">1차 또는 2차 배송이 모바일 기사 앱을 통해 완료 처리되어야 정산 목록에 나타납니다.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-4 text-[11px] font-black text-slate-500 border-b">거래처(보건소)명</th>
                                            <th className="p-4 text-[11px] font-black text-slate-500 border-b text-right">총 배송 수량</th>
                                            <th className="p-4 text-[11px] font-black text-indigo-600 border-b text-right w-48">총 청구 금액 (원)</th>
                                            <th className="p-4 text-[11px] font-black text-slate-500 border-b text-center w-40">명세서/청구서</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {settlementData.list.map((data, idx) => (
                                            <tr key={data.client.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-black text-slate-800 text-sm">{data.client.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold mt-1">납품 품목: {data.items.length}종</div>
                                                </td>
                                                <td className="p-4 text-right font-black text-slate-600 tabular-nums">
                                                    {fmt(data.totalQty)} <span className="text-xs text-slate-400 font-bold">건</span>
                                                </td>
                                                <td className="p-4 text-right font-black text-blue-600 text-lg tabular-nums">
                                                    ₩ {fmt(data.totalAmount)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => setSelectedClient(data)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-indigo-600 transition-colors group-hover:scale-105 active:scale-95">
                                                        명세서 열람
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
