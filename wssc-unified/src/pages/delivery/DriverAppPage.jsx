import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

// ─── 서명 캔버스 — 원본 방식으로 동적 크기 적용 ──────────────────────────
function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 원본 방식: offsetWidth/Height 기반 실제 크기 동적 할당
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    lastPos.current = pos;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = (e) => { if (e) e.preventDefault(); setDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasContent = Array.from(data).some((v, i) => i % 4 < 3 && v < 250);
    if (!hasContent) { alert('서명을 입력해주세요.'); return; }
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 text-center">아래 흰 영역에 서명해주세요</p>
      <div className="relative">
        <p className="absolute inset-0 flex items-center justify-center text-slate-200 font-black text-2xl opacity-60 pointer-events-none select-none z-0">
          여기에 서명하세요
        </p>
        <canvas
          ref={canvasRef}
          className="w-full h-44 rounded-xl border-2 border-dashed border-indigo-500/50 touch-none bg-white relative z-10 cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={clear}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2.5 rounded-xl font-bold">
          다시 쓰기
        </button>
        <button onClick={save}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2.5 rounded-xl font-bold">
          서명 저장
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2.5 rounded-xl font-bold">
          취소
        </button>
      </div>
    </div>
  );
}

// ─── 메인 기사앱 ─────────────────────────────────────────────────────────
export default function DriverAppPage() {
  const { st, updateSt, showToast } = useApp();

  const [driverUser, setDriverUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wssc_driver') || 'null'); } catch { return null; }
  });
  const [loginDriverId, setLoginDriverId] = useState('');

  const today = Utils.today();
  const [selTripId, setSelTripId] = useState('');

  const [deliverModal, setDeliverModal] = useState(null);
  const [deliverForm, setDeliverForm] = useState({ note: '', status: 'delivered' });
  const [signatureData, setSignatureData] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [gps, setGps] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const drivers = useMemo(() =>
    (st.users || []).filter(u => u.role === 'driver' || u.role === 'logistics'),
    [st.users]
  );

  const myTrips = useMemo(() => {
    if (!driverUser) return [];
    return (st.deliveryTrips || []).filter(t =>
      t.date === today && (t.driverId === driverUser.id || !t.driverId)
    );
  }, [driverUser, st.deliveryTrips, today]);

  const selTrip = useMemo(() =>
    (st.deliveryTrips || []).find(t => t.id === selTripId),
    [selTripId, st.deliveryTrips]
  );

  const selBlock = useMemo(() =>
    selTrip ? (st.deliveryBlocks || []).find(b => b.id === selTrip.blockId) : null,
    [selTrip, st.deliveryBlocks]
  );

  const tripRecords = useMemo(() =>
    selTripId ? (st.deliveryRecords || []).filter(r => r.tripId === selTripId) : [],
    [selTripId, st.deliveryRecords]
  );

  const clientList = useMemo(() => {
    if (!selBlock) return [];
    return (selBlock.clientIds || []).map((cId, idx) => {
      const client = (st.clients || []).find(c => c.id === cId);
      const rec = tripRecords.find(r => r.clientId === cId);
      return { client, rec, idx, cId };
    }).filter(r => r.client);
  }, [selBlock, tripRecords, st.clients]);

  const progress = useMemo(() => {
    const total = clientList.length;
    const done = clientList.filter(r => r.rec && r.rec.status !== 'pending').length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [clientList]);

  const handleLogin = () => {
    const u = drivers.find(d => d.id === loginDriverId);
    if (!u) return showToast('기사를 선택해주세요.', 'warn');
    setDriverUser(u);
    localStorage.setItem('wssc_driver', JSON.stringify(u));
  };

  const handleLogout = () => {
    setDriverUser(null);
    localStorage.removeItem('wssc_driver');
    setSelTripId('');
  };

  const startTrip = (tripId) => {
    updateSt('deliveryTrips', (st.deliveryTrips || []).map(t =>
      t.id === tripId ? { ...t, status: 'in_progress', startedAt: new Date().toLocaleTimeString('ko-KR') } : t
    ));
    setSelTripId(tripId);
    showToast('배송을 시작했습니다.', 'success');
  };

  const openDeliver = (cId, clientName, clientAddress) => {
    setDeliverModal({ clientId: cId, clientName, clientAddress, step: 'main' });
    setDeliverForm({ note: '', status: 'delivered' });
    setSignatureData(null);
    setPhotoData(null);
    setPhotoUrl(null);
    setGps(null);
  };

  const getGps = () => {
    if (!navigator.geolocation) { showToast('이 기기에서 GPS를 지원하지 않습니다.', 'warn'); return; }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingGps(false);
        showToast('위치 정보를 가져왔습니다.', 'success');
      },
      () => { setGettingGps(false); showToast('GPS 정보를 가져올 수 없습니다.', 'warn'); },
      { timeout: 10000 }
    );
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast('이미지 최적화 중...', 'info');
    const compressed = await Utils.compressImage(file, 800, 0.6);
    setPhotoData(compressed);
    showToast('클라우드에 사진 업로드 중...', 'info');
    setUploading(true);
    const url = await Utils.uploadImageToStorage(compressed, 'delivery_photos');
    setPhotoUrl(url);
    setUploading(false);
    showToast('사진이 클라우드에 보관되었습니다.', 'success');
  };

  // SMS 알림 링크 생성
  const getSmsLink = (clientId, clientName, contactPhone) => {
    const portalUrl = `${window.location.origin}/delivery/portal?client=${clientId}`;
    const msg = `[웰쉐어 배송완료] ${clientName}님, 영양플러스 패키지 배송이 완료되었습니다. 수령확인증: ${portalUrl}`;
    return `sms:${contactPhone || ''}?body=${encodeURIComponent(msg)}`;
  };

  const saveDelivery = async () => {
    if (!deliverModal || !selTripId) return;
    const now = new Date().toLocaleTimeString('ko-KR');

    // 서명 Cloud Storage 업로드 (서명은 크기가 작아 base64도 OK, 그러나 cloud 우선)
    let finalSignUrl = signatureData;
    if (signatureData && !signatureData.startsWith('http')) {
      setUploading(true);
      finalSignUrl = await Utils.uploadImageToStorage(signatureData, 'signatures');
      setUploading(false);
    }

    const existing = (st.deliveryRecords || []).find(
      r => r.tripId === selTripId && r.clientId === deliverModal.clientId
    );
    const rec = {
      id: existing?.id || Utils.genId(),
      tripId: selTripId,
      clientId: deliverModal.clientId,
      status: deliverForm.status,
      deliveredAt: now,
      note: deliverForm.note,
      signatureUrl: finalSignUrl || null,
      signatureData: finalSignUrl || null,
      photoData: photoUrl || photoData || null,
      gps: gps || null,
    };

    if (existing) {
      updateSt('deliveryRecords', (st.deliveryRecords || []).map(r => r.id === existing.id ? rec : r));
    } else {
      updateSt('deliveryRecords', [...(st.deliveryRecords || []), rec]);
    }

    // 모든 완료 시 트립 자동 완료
    const totalClients = selBlock?.clientIds?.length || 0;
    const newDoneCount = clientList.filter(r =>
      r.cId !== deliverModal.clientId && r.rec?.status !== 'pending'
    ).length + 1;

    if (newDoneCount >= totalClients) {
      updateSt('deliveryTrips', (st.deliveryTrips || []).map(t =>
        t.id === selTripId ? { ...t, status: 'done', completedAt: now } : t
      ));
      showToast('🎉 모든 배송이 완료되었습니다!', 'success');
    } else {
      showToast('배송 완료 처리되었습니다.', 'success');
    }
    setDeliverModal(null);
  };

  // ─── 로그인 화면 ────────────────────────────────────────────────────────
  if (!driverUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 flex justify-center text-slate-300">{Ic.Truck}</div>
            <h1 className="text-2xl font-black text-white">기사 배송 앱</h1>
            <p className="text-slate-400 text-sm mt-1">본인을 선택하고 로그인해주세요</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1.5">기사 선택</label>
              <select value={loginDriverId} onChange={e => setLoginDriverId(e.target.value)}
                className="input-base w-full text-base">
                <option value="">-- 선택 --</option>
                {drivers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <button onClick={handleLogin}
              className="w-full btn-primary py-3 text-base font-black">
              배송 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 트립 선택 화면 ─────────────────────────────────────────────────────
  if (!selTripId) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-white">오늘의 배송</h1>
              <p className="text-slate-400 text-sm">{driverUser.name} 기사님 · {today}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white p-2">{Ic.LogOut}</button>
          </div>

          {myTrips.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
              <div className="text-slate-400 mb-2">오늘 배정된 배송이 없습니다.</div>
              <div className="text-xs text-slate-500">관리자에게 문의해주세요.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {myTrips.map(trip => {
                const block = (st.deliveryBlocks || []).find(b => b.id === trip.blockId);
                const records = (st.deliveryRecords || []).filter(r => r.tripId === trip.id);
                const totalClients = block?.clientIds?.length || 0;
                const done = records.filter(r => r.status !== 'pending').length;
                return (
                  <div key={trip.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-black text-white text-lg">{block?.name || '(블럭 없음)'}</div>
                        <div className="text-slate-400 text-sm">{totalClients}개 거래처</div>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        trip.status === 'done' ? 'bg-emerald-900/50 text-emerald-300' :
                        trip.status === 'in_progress' ? 'bg-amber-900/50 text-amber-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {trip.status === 'done' ? '완료' : trip.status === 'in_progress' ? '진행중' : '대기'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mb-3">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${totalClients > 0 ? (done / totalClients) * 100 : 0}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 mb-3">{done}/{totalClients} 완료</div>
                    {trip.status === 'pending' ? (
                      <button onClick={() => startTrip(trip.id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-sm">
                        배송 시작
                      </button>
                    ) : (
                      <button onClick={() => setSelTripId(trip.id)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">
                        계속하기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 배송 목록 화면 ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelTripId('')} className="text-slate-400 hover:text-white p-1">{Ic.ChevL}</button>
            <div className="flex-1">
              <div className="font-black text-white">{selBlock?.name}</div>
              <div className="text-xs text-slate-400">{driverUser.name} · {today}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-white">{progress.done}/{progress.total}</div>
              <div className="text-xs text-slate-500">{progress.pct}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </div>

      {/* 거래처 목록 */}
      <div className="max-w-lg mx-auto p-4 space-y-2">
        {clientList.map(({ client, rec, idx }) => {
          const isDone = rec && rec.status !== 'pending';
          const isFailed = rec?.status === 'failed';
          return (
            <div key={client.id}
              className={`rounded-2xl border p-4 transition-all ${
                isDone
                  ? isFailed ? 'bg-rose-900/10 border-rose-700/50' : 'bg-emerald-900/10 border-emerald-700/50'
                  : 'bg-slate-800 border-slate-700'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  isDone
                    ? isFailed ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {isDone ? (isFailed ? '✗' : '✓') : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white">{client.shortName || client.name}</div>
                  {client.address && (
                    <div className="text-xs text-slate-400 truncate">{client.address}</div>
                  )}
                  {rec?.deliveredAt && (
                    <div className="text-xs text-slate-500">{rec.deliveredAt} 완료</div>
                  )}
                </div>

                {/* 카카오내비 딥링크 버튼 */}
                {client.address && (
                  <a
                    href={`kakaonavi://navigate?name=${encodeURIComponent(client.shortName || client.name)}&coordx=&coordy=&rpflag=1&appname=wssc_unified`}
                    className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-xs font-black px-2 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                    title="카카오내비">
                    {Ic.Map}
                    <span>내비</span>
                  </a>
                )}

                <button
                  onClick={() => openDeliver(client.id, client.shortName || client.name, client.address)}
                  className={`px-3 py-2 rounded-xl text-sm font-black transition-colors flex-shrink-0 ${
                    isDone
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}>
                  {isDone ? '수정' : '완료'}
                </button>
              </div>

              {rec?.note && (
                <div className="mt-2 text-xs text-slate-400 pl-12">{rec.note}</div>
              )}

              <div className="flex gap-2 mt-2 pl-12 flex-wrap">
                {rec?.signatureData && <span className="text-xs text-indigo-400 flex items-center gap-1">{Ic.Sign} 서명완료</span>}
                {rec?.photoData && <span className="text-xs text-emerald-400 flex items-center gap-1">{Ic.Camera} 사진첨부</span>}
                {rec?.gps && <span className="text-xs text-amber-400 flex items-center gap-1">{Ic.Map} GPS인증</span>}
              </div>

              {/* 배송완료 후 SMS 알림 버튼 */}
              {isDone && !isFailed && (
                <div className="mt-3 pl-12 flex gap-2">
                  <a
                    href={getSmsLink(client.id, client.shortName || client.name, client.deliveryContact || client.contact)}
                    className="flex-1 bg-green-900/30 border border-green-700/50 text-green-300 py-2 rounded-lg text-xs font-black text-center flex items-center justify-center gap-1">
                    {Ic.Bell} 내 폰으로 알림
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 배송 완료 모달 */}
      {deliverModal && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto border border-slate-700 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white">{deliverModal.clientName}</h3>
                <button onClick={() => setDeliverModal(null)} className="text-slate-400 hover:text-white p-1">{Ic.X}</button>
              </div>

              {deliverModal.step === 'main' && (
                <div className="space-y-4">
                  {/* 배송 상태 */}
                  <div>
                    <label className="text-xs font-black text-slate-400 block mb-2">배송 상태</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 'delivered', label: '완료', bg: 'bg-emerald-600' },
                        { val: 'partial',   label: '일부', bg: 'bg-amber-600' },
                        { val: 'failed',    label: '실패', bg: 'bg-rose-600' },
                      ].map(s => (
                        <button key={s.val}
                          onClick={() => setDeliverForm(f => ({ ...f, status: s.val }))}
                          className={`py-2 rounded-xl text-sm font-black transition-opacity ${s.bg} text-white ${deliverForm.status === s.val ? 'opacity-100 ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : 'opacity-40'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 비고 */}
                  <div>
                    <label className="text-xs font-black text-slate-400 block mb-1.5">비고</label>
                    <input type="text" value={deliverForm.note}
                      onChange={e => setDeliverForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="특이사항 입력..."
                      className="input-base w-full" />
                  </div>

                  {/* GPS */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-400">위치 정보</div>
                      {gps
                        ? <div className="text-xs text-emerald-400 font-mono mt-0.5">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>
                        : <div className="text-xs text-slate-500 mt-0.5">미취득</div>
                      }
                    </div>
                    <button onClick={getGps} disabled={gettingGps}
                      className={`text-sm px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 ${gps ? 'bg-emerald-700 text-emerald-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {Ic.Map} {gettingGps ? '취득중...' : gps ? '재취득' : 'GPS 취득'}
                    </button>
                  </div>

                  {/* 서명 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black text-slate-400">수령인 서명</div>
                      <button onClick={() => setDeliverModal(m => ({ ...m, step: 'sign' }))}
                        className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1">
                        {Ic.Sign} {signatureData ? '다시 서명' : '서명 받기'}
                      </button>
                    </div>
                    {signatureData && (
                      <div className="bg-white rounded-xl p-2">
                        <img src={signatureData} alt="서명" className="w-full h-auto max-h-20 object-contain" />
                      </div>
                    )}
                  </div>

                  {/* 사진 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black text-slate-400">배송 사진</div>
                      <button onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1 disabled:opacity-50">
                        {Ic.Camera} {uploading ? '업로드중...' : photoData ? '다시 촬영' : '사진 추가'}
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                      onChange={handlePhoto} className="hidden" />
                    {photoData && (
                      <img src={photoData} alt="배송사진" className="w-full rounded-xl object-cover max-h-32" />
                    )}
                  </div>

                  {/* 저장 버튼 */}
                  <button onClick={saveDelivery} disabled={uploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-sm disabled:opacity-50">
                    {uploading ? '저장 중...' : '배송 완료 저장'}
                  </button>
                </div>
              )}

              {deliverModal.step === 'sign' && (
                <SignatureCanvas
                  onSave={(data) => { setSignatureData(data); setDeliverModal(m => ({ ...m, step: 'main' })); }}
                  onCancel={() => setDeliverModal(m => ({ ...m, step: 'main' }))}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
