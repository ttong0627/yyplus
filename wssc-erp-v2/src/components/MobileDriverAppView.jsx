import React, { useState, useEffect, useRef } from 'react';
import { Ic, Utils } from '../App.jsx';

// 서명 모달 컴포넌트
const SignatureModal = ({ isOpen, onClose, onSave, clientName }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if(!isOpen) return;
        setTimeout(() => {
            const canvas = canvasRef.current;
            if(canvas) {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#1e293b';
            }
        }, 100);
    }, [isOpen]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = (e) => { 
        if(e) e.preventDefault(); 
        setIsDrawing(false); 
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[500px] border border-slate-200">
                <div className="bg-[#29B4E3] text-white p-5 flex justify-between items-center shadow-md z-10">
                    <div>
                        <h3 className="font-black text-lg flex items-center gap-2"><Ic.Users size={20}/> 수령 확인증 (전자서명)</h3>
                        <p className="text-xs text-blue-100 mt-1">{clientName} 담당자님 서명을 부탁드립니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"><Ic.Dash size={16}/></button>
                </div>
                <div className="flex-1 bg-slate-50 p-4 relative">
                    <p className="absolute inset-0 flex items-center justify-center text-slate-200 font-black text-4xl opacity-50 pointer-events-none select-none">여기에 서명하세요</p>
                    <canvas 
                        ref={canvasRef}
                        className="w-full h-full bg-white/60 rounded-2xl shadow-inner border-2 border-dashed border-[#29B4E3]/30 cursor-crosshair touch-none relative z-10"
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                        style={{touchAction: 'none'}}
                    />
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
                    <button onClick={clear} className="px-6 py-4 rounded-2xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-none">다시 쓰기</button>
                    <button onClick={async (e)=>{
                        const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '서명 클라우드 전송 중...';
                        const dataUrl = canvasRef.current.toDataURL('image/png');
                        const storageUrl = await Utils.uploadImageToStorage(dataUrl, 'signatures');
                        onSave(storageUrl);
                    }} className="flex-1 bg-gradient-to-r from-[#29B4E3] to-[#1da1cc] text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                        <Ic.Chk size={18}/> 서명 완료 및 배송 처리
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MobileDriverAppView = ({ clients=[], clientOrders=[], setClientOrders, globalMonth, isLog, toast }) => {
    const [signModalOpen, setSignModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null); 
    const [mockPhotos, setMockPhotos] = useState({});
    const [mockGps, setMockGps] = useState({});

    const drvOrders = clientOrders.filter(o => o.month === globalMonth && (o.deliveryDate1 || o.deliveryDate2));
    
    const handleToggleDone = (o, type) => {
        if(!isLog) return toast('로그인이 필요합니다.');
        const isDone = type === '1차' ? o.done1 : o.done2;
        
        if (isDone) {
            setClientOrders(clientOrders.map(x => x.id === o.id ? { ...x, [type === '1차' ? 'done1' : 'done2']: false, [type === '1차' ? 'sign1' : 'sign2']: null } : x));
            toast(`${type} 배송 완료가 취소되었습니다.`);
        } else {
            const client = clients.find(c => c.id === o.clientId);
            setCurrentOrder({ id: o.id, type, clientName: client?.shortName || '고객' });
            setSignModalOpen(true);
        }
    };

    const handleSignSave = (signDataUrl) => {
        setClientOrders(clientOrders.map(x => x.id === currentOrder.id ? {
            ...x, 
            [currentOrder.type === '1차' ? 'done1' : 'done2']: true,
            [currentOrder.type === '1차' ? 'sign1' : 'sign2']: signDataUrl
        } : x));
        toast(`${currentOrder.type} 배송 처리가 완벽히 완료되었습니다!`);
        setSignModalOpen(false);
        setCurrentOrder(null);
    };

    const handleMockAction = (orderId, type, actionType) => {
        if(!isLog) return toast('로그인이 필요합니다.');
        const key = `${orderId}-${type}`;
        if(actionType === 'gps') {
            setMockGps(prev => ({...prev, [key]: true}));
            toast('📍 현재 위치가 GPS로 인증되었습니다.');
        } else {
            setMockPhotos(prev => ({...prev, [key]: true}));
            toast('📸 배송 완료 사진이 첨부되었습니다.');
        }
    };

    return (
        <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0 bg-[#f0f2f5] -m-6 p-6 lg:-m-8 lg:p-8">
            <SignatureModal 
                isOpen={signModalOpen} 
                onClose={() => setSignModalOpen(false)} 
                onSave={handleSignSave} 
                clientName={currentOrder?.clientName} 
            />

            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-blue-600 flex items-center gap-3"><Ic.Route size={28}/> 모바일 기사 배송 앱 <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-full animate-pulse ml-2">LIVE</span></h2>
                <span className="text-sm font-black bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200">{globalMonth} 배송건</span>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-10">
                {drvOrders.length===0 ? <div className="py-20 text-center flex flex-col items-center"><Ic.Box size={60} className="text-slate-300 mb-4"/><div className="font-black text-xl text-slate-400">이번 달 배송 일정이 없습니다.</div></div> : 
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {drvOrders.map(o => {
                        const client = clients.find(c=>c.id===o.clientId); if(!client) return null;
                        return (
                            <div key={o.id} className={`bg-white rounded-[2rem] p-6 shadow-md border-2 ${o.done1 && (!o.deliveryDate2 || o.done2) ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'} flex flex-col gap-5 hover:border-blue-300 transition-colors group`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black text-slate-800 break-keep leading-tight">{client.shortName}</h3>
                                            <a href={`kakaonavi://navigate?name=${encodeURIComponent(client.name)}`} className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-md shadow-sm hover:scale-105 transition-transform flex items-center gap-1"><Ic.Route size={12}/> 내비</a>
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold mt-1.5 flex items-center gap-1"><Ic.Bldg size={12}/> {client.inspectLocation || client.name}</p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl group-hover:scale-110 transition-transform flex-none"><Ic.Truck size={32}/></div>
                                </div>
                                <div className="space-y-3 mt-auto">
                                    {o.deliveryDate1 && (
                                        <div className={`flex flex-col bg-slate-50 p-4 rounded-2xl border ${o.done1 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div><span className={`text-[10px] px-2.5 py-1 rounded-md font-black border ${o.done1 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>1차 배송</span><p className="font-black text-lg mt-1 text-slate-700">{o.deliveryDate1}</p></div>
                                                <button onClick={()=>handleToggleDone(o, '1차')} className={`px-5 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${o.done1 ? 'bg-emerald-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-300 ring-offset-2' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>{o.done1 ? <><Ic.Chk size={18} className="inline mr-1 -mt-0.5"/>배송완료</> : '서명 및 완료'}</button>
                                            </div>
                                            {!o.done1 && (
                                                <div className="flex gap-2 mt-1 mb-2">
                                                    <button onClick={()=>handleMockAction(o.id, '1차', 'gps')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-colors ${mockGps[`${o.id}-1차`] ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}><Ic.Map size={14} className="inline mr-1 -mt-0.5"/>GPS 인증</button>
                                                    <div className="flex-1 relative overflow-hidden">
                                                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={async (e)=>{
                                                            if(!isLog) return toast('로그인이 필요합니다.');
                                                            const file = e.target.files[0];
                                                            if(file) {
                                                                toast('이미지 최적화 중...');
                                                                const compressedUrl = await Utils.compressImage(file, 800, 0.6);
                                                                toast('클라우드에 사진 업로드 중...');
                                                                const storageUrl = await Utils.uploadImageToStorage(compressedUrl, 'delivery_photos');
                                                                setMockPhotos(prev => ({...prev, [`${o.id}-1차`]: storageUrl}));
                                                                toast('📸 사진이 클라우드에 영구 보관되었습니다.');
                                                            }
                                                        }} />
                                                        <button className={`w-full h-full py-2 rounded-lg text-xs font-black transition-colors ${mockPhotos[`${o.id}-1차`] ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}><Ic.Img size={14} className="inline mr-1 -mt-0.5"/>사진 첨부</button>
                                                    </div>
                                                </div>
                                            )}
                                            {o.sign1 && (
                                                <div className="mt-2 pt-3 border-t border-slate-200 flex items-center justify-between animate-fade-in flex-wrap gap-2">
                                                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                                                        <span className="text-xs font-bold text-slate-400">수령인 서명 완료</span>
                                                        <div className="flex gap-1">
                                                            {mockGps[`${o.id}-1차`] && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-black">GPS인증됨</span>}
                                                            {mockPhotos[`${o.id}-1차`] && (mockPhotos[`${o.id}-1차`] === true ? <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded font-black">사진첨부됨</span> : <img src={mockPhotos[`${o.id}-1차`]} alt="현장" className="h-6 w-6 object-cover rounded border border-slate-200 ml-1" title="사진첨부됨"/>)}
                                                        </div>
                                                    </div>
                                                    <img src={o.sign1} alt="서명" className="h-10 w-20 object-contain bg-white rounded-lg border border-slate-200 px-2 shadow-sm"/>
                                                    <div className="w-full flex gap-2 mt-1">
                                                        <a href={`sms:${client.deliveryContact || ''}?body=${encodeURIComponent(`[웰쉐어 배송완료] ${client.name}님, 영양플러스 패키지 배송이 완료되었습니다. 아래 링크에서 배송 현장 및 전자수령증을 확인하세요.\nhttps://wssc-nutrition--v2-vd0yra41.web.app/public?id=${o.id}`)}`} className="flex-1 bg-green-50 border border-green-200 text-green-700 py-2 rounded-lg text-[10px] font-black text-center shadow-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-1"><Ic.Chk size={12}/>내 폰(무료) 알림</a>
                                                        <button onClick={() => toast('회사 서버를 통한 카카오 알림톡 전송이 요청되었습니다.')} className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-700 py-2 rounded-lg text-[10px] font-black text-center shadow-sm hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1"><Ic.Dash size={12}/>회사(유료) 알림</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {o.deliveryDate2 && (
                                        <div className={`flex flex-col bg-slate-50 p-4 rounded-2xl border ${o.done2 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div><span className={`text-[10px] px-2.5 py-1 rounded-md font-black border ${o.done2 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-[#E94287]/10 text-[#E94287] border-[#E94287]/20'}`}>2차 배송</span><p className="font-black text-lg mt-1 text-slate-700">{o.deliveryDate2}</p></div>
                                                <button onClick={()=>handleToggleDone(o, '2차')} className={`px-5 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${o.done2 ? 'bg-emerald-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-300 ring-offset-2' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>{o.done2 ? <><Ic.Chk size={18} className="inline mr-1 -mt-0.5"/>배송완료</> : '서명 및 완료'}</button>
                                            </div>
                                            {!o.done2 && (
                                                <div className="flex gap-2 mt-1 mb-2">
                                                    <button onClick={()=>handleMockAction(o.id, '2차', 'gps')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-colors ${mockGps[`${o.id}-2차`] ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}><Ic.Map size={14} className="inline mr-1 -mt-0.5"/>GPS 인증</button>
                                                    <div className="flex-1 relative overflow-hidden">
                                                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={async (e)=>{
                                                            if(!isLog) return toast('로그인이 필요합니다.');
                                                            const file = e.target.files[0];
                                                            if(file) {
                                                                toast('이미지 최적화 중...');
                                                                const compressedUrl = await Utils.compressImage(file, 800, 0.6);
                                                                toast('클라우드에 사진 업로드 중...');
                                                                const storageUrl = await Utils.uploadImageToStorage(compressedUrl, 'delivery_photos');
                                                                setMockPhotos(prev => ({...prev, [`${o.id}-2차`]: storageUrl}));
                                                                toast('📸 사진이 클라우드에 영구 보관되었습니다.');
                                                            }
                                                        }} />
                                                        <button className={`w-full h-full py-2 rounded-lg text-xs font-black transition-colors ${mockPhotos[`${o.id}-2차`] ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}><Ic.Img size={14} className="inline mr-1 -mt-0.5"/>사진 첨부</button>
                                                    </div>
                                                </div>
                                            )}
                                            {o.sign2 && (
                                                <div className="mt-2 pt-3 border-t border-slate-200 flex items-center justify-between animate-fade-in flex-wrap gap-2">
                                                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                                                        <span className="text-xs font-bold text-slate-400">수령인 서명 완료</span>
                                                        <div className="flex gap-1">
                                                            {mockGps[`${o.id}-2차`] && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-black">GPS인증됨</span>}
                                                            {mockPhotos[`${o.id}-2차`] && (mockPhotos[`${o.id}-2차`] === true ? <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded font-black">사진첨부됨</span> : <img src={mockPhotos[`${o.id}-2차`]} alt="현장" className="h-6 w-6 object-cover rounded border border-slate-200 ml-1" title="사진첨부됨"/>)}
                                                        </div>
                                                    </div>
                                                    <img src={o.sign2} alt="서명" className="h-10 w-20 object-contain bg-white rounded-lg border border-slate-200 px-2 shadow-sm"/>
                                                    <div className="w-full flex gap-2 mt-1">
                                                        <a href={`sms:${client.deliveryContact || ''}?body=${encodeURIComponent(`[웰쉐어 배송완료] ${client.name}님, 영양플러스 패키지 배송이 완료되었습니다. 아래 링크에서 배송 현장 및 전자수령증을 확인하세요.\nhttps://wssc-nutrition--v2-vd0yra41.web.app/public?id=${o.id}`)}`} className="flex-1 bg-green-50 border border-green-200 text-green-700 py-2 rounded-lg text-[10px] font-black text-center shadow-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-1"><Ic.Chk size={12}/>내 폰(무료) 알림</a>
                                                        <button onClick={() => toast('회사 서버를 통한 카카오 알림톡 전송이 요청되었습니다.')} className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-700 py-2 rounded-lg text-[10px] font-black text-center shadow-sm hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1"><Ic.Dash size={12}/>회사(유료) 알림</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>}
            </div>
        </div>
    );
};

