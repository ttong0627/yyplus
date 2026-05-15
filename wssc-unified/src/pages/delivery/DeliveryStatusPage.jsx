import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const STATUS_CFG = {
  pending:     { label: '대기',   cls: 'bg-slate-700 text-slate-300',   dot: 'bg-slate-400' },
  in_progress: { label: '배송중', cls: 'bg-amber-900/50 text-amber-300', dot: 'bg-amber-400 animate-pulse' },
  done:        { label: '완료',   cls: 'bg-emerald-900/50 text-emerald-300', dot: 'bg-emerald-400' },
};

const REC_STATUS = {
  pending:   { label: '대기',   cls: 'text-slate-400' },
  delivered: { label: '완료',   cls: 'text-emerald-400' },
  partial:   { label: '일부',   cls: 'text-amber-400' },
  failed:    { label: '실패',   cls: 'text-rose-400' },
};

const BLOCK_COLORS = {
  blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500',
};

export default function DeliveryStatusPage() {
  const { st, updateSt, showToast } = useApp();
  const [selDate, setSelDate] = useState(Utils.today());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ko-KR'));

  // 실시간 시계 — 1초마다 갱신
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('ko-KR')), 1000);
    return () => clearInterval(t);
  }, []);
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [addForm, setAddForm] = useState({ blockId: '', driverId: '' });

  const todayTrips = useMemo(() =>
    (st.deliveryTrips || []).filter(t => t.date === selDate),
    [st.deliveryTrips, selDate]
  );

  const getBlock = (blockId) => (st.deliveryBlocks || []).find(b => b.id === blockId);
  const getDriver = (driverId) => (st.users || []).find(u => u.id === driverId);
  const getClient = (clientId) => (st.clients || []).find(c => c.id === clientId);

  const getTripRecords = (tripId) =>
    (st.deliveryRecords || []).filter(r => r.tripId === tripId);

  const getTripProgress = (tripId, block) => {
    const records = getTripRecords(tripId);
    const total = block?.clientIds?.length || 0;
    const done = records.filter(r => r.status === 'delivered' || r.status === 'partial').length;
    return { done, total };
  };

  const drivers = useMemo(() =>
    (st.users || []).filter(u => u.role === 'driver' || u.role === 'logistics'),
    [st.users]
  );

  const summary = useMemo(() => {
    let totalClients = 0, delivered = 0, pending = 0, failed = 0;
    todayTrips.forEach(trip => {
      const block = getBlock(trip.blockId);
      const total = block?.clientIds?.length || 0;
      const records = getTripRecords(trip.id);
      totalClients += total;
      records.forEach(r => {
        if (r.status === 'delivered' || r.status === 'partial') delivered++;
        else if (r.status === 'failed') failed++;
      });
      const recorded = records.length;
      pending += Math.max(0, total - recorded);
    });
    return { totalClients, delivered, pending, failed };
  }, [todayTrips, st.deliveryRecords, st.deliveryBlocks]);

  const handleAddTrip = () => {
    if (!addForm.blockId) return showToast('배송블럭을 선택해주세요.', 'warn');
    const block = getBlock(addForm.blockId);
    const newTrip = {
      id: Utils.genId(),
      date: selDate,
      blockId: addForm.blockId,
      driverId: addForm.driverId || block?.driverId || '',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      note: '',
    };
    updateSt('deliveryTrips', [...(st.deliveryTrips || []), newTrip]);
    showToast('배송 일정이 추가되었습니다.', 'success');
    setShowAddTrip(false);
    setAddForm({ blockId: '', driverId: '' });
  };

  const handleDeleteTrip = (tripId) => {
    updateSt('deliveryTrips', (st.deliveryTrips || []).filter(t => t.id !== tripId));
    updateSt('deliveryRecords', (st.deliveryRecords || []).filter(r => r.tripId !== tripId));
    showToast('삭제되었습니다.', 'success');
    if (expandedTrip === tripId) setExpandedTrip(null);
  };

  const handleUpdateTripStatus = (tripId, status) => {
    updateSt('deliveryTrips', (st.deliveryTrips || []).map(t =>
      t.id === tripId ? {
        ...t, status,
        startedAt: status === 'in_progress' && !t.startedAt ? new Date().toLocaleTimeString('ko-KR') : t.startedAt,
        completedAt: status === 'done' ? new Date().toLocaleTimeString('ko-KR') : t.completedAt,
      } : t
    ));
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-white">실시간 배송 현황</h1>
          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse font-black">LIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 font-bold">현재 시각</p>
            <p className="text-lg font-black text-indigo-400 tabular-nums">{currentTime}</p>
          </div>
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
            className="input-base text-sm" />
          <button onClick={() => setShowAddTrip(true)}
            className="btn-primary text-sm flex items-center gap-1.5">
            {Ic.Plus} 배송 일정 추가
          </button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '총 거래처', val: summary.totalClients, cls: 'text-white' },
          { label: '배송 완료', val: summary.delivered, cls: 'text-emerald-400' },
          { label: '대기 중', val: summary.pending, cls: 'text-slate-400' },
          { label: '실패', val: summary.failed, cls: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="card py-4 text-center">
            <div className={`text-3xl font-black ${s.cls}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 배송 트립 목록 */}
      {todayTrips.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          {selDate} 배송 일정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {todayTrips.map(trip => {
            const block = getBlock(trip.blockId);
            const driver = getDriver(trip.driverId);
            const { done, total } = getTripProgress(trip.id, block);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const sc = STATUS_CFG[trip.status] || STATUS_CFG.pending;
            const records = getTripRecords(trip.id);
            const isExpanded = expandedTrip === trip.id;

            return (
              <div key={trip.id} className="card">
                <div className="flex items-center gap-3">
                  {/* 블럭 색상 */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${BLOCK_COLORS[block?.color] || 'bg-slate-500'}`} />

                  {/* 블럭명 + 기사 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-sm">{block?.name || '(블럭 없음)'}</div>
                    <div className="text-xs text-slate-400">
                      기사: {driver?.name || '미배정'}
                      {trip.startedAt && <span className="ml-2">출발 {trip.startedAt}</span>}
                      {trip.completedAt && <span className="ml-2">완료 {trip.completedAt}</span>}
                    </div>
                  </div>

                  {/* 진행률 */}
                  <div className="text-center w-20">
                    <div className="text-sm font-black text-white">{done}/{total}</div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* 상태 배지 */}
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 ${sc.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>

                  {/* 상태 변경 버튼 */}
                  <div className="flex gap-1">
                    {trip.status === 'pending' && (
                      <button onClick={() => handleUpdateTripStatus(trip.id, 'in_progress')}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-lg font-bold">
                        출발
                      </button>
                    )}
                    {trip.status === 'in_progress' && (
                      <button onClick={() => handleUpdateTripStatus(trip.id, 'done')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg font-bold">
                        완료
                      </button>
                    )}
                    <button onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                      className="text-slate-400 hover:text-white p-1">
                      {isExpanded ? Ic.ChevU : Ic.ChevD}
                    </button>
                    <button onClick={() => handleDeleteTrip(trip.id)}
                      className="text-rose-400 hover:text-rose-300 p-1">
                      {Ic.Trash}
                    </button>
                  </div>
                </div>

                {/* 상세 거래처 목록 */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <div className="text-xs font-black text-slate-400 mb-2">거래처별 배송 현황</div>
                    <div className="space-y-1.5">
                      {(block?.clientIds || []).map((cId, idx) => {
                        const client = getClient(cId);
                        const rec = records.find(r => r.clientId === cId);
                        const rs = REC_STATUS[rec?.status || 'pending'];
                        return (
                          <div key={cId}
                            className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-500 w-5 text-right">{idx + 1}</span>
                            <span className="flex-1 text-sm text-slate-200 font-bold">
                              {client?.shortName || client?.name || '?'}
                            </span>
                            {rec?.deliveredAt && (
                              <span className="text-xs text-slate-500">{rec.deliveredAt}</span>
                            )}
                            <span className={`text-xs font-black ${rs.cls}`}>{rs.label}</span>
                            {rec?.signatureData && (
                              <span className="text-xs text-indigo-400">{Ic.Sign}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 배송 일정 추가 모달 */}
      {showAddTrip && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">배송 일정 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">날짜</label>
                <input type="date" value={selDate} readOnly className="input-base w-full bg-slate-700/50" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">배송 블럭</label>
                <select value={addForm.blockId}
                  onChange={e => setAddForm(f => ({ ...f, blockId: e.target.value }))}
                  className="input-base w-full">
                  <option value="">-- 선택 --</option>
                  {(st.deliveryBlocks || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">담당 기사</label>
                <select value={addForm.driverId}
                  onChange={e => setAddForm(f => ({ ...f, driverId: e.target.value }))}
                  className="input-base w-full">
                  <option value="">-- 블럭 기본 기사 사용 --</option>
                  {drivers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddTrip} className="btn-primary flex-1">추가</button>
              <button onClick={() => setShowAddTrip(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
