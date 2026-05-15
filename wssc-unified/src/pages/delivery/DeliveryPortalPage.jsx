import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function DeliveryPortalPage() {
  const { st } = useApp();
  const [selDate, setSelDate] = useState(Utils.today());
  const [selTripId, setSelTripId] = useState('');
  const [selClientId, setSelClientId] = useState(null);
  const [copied, setCopied] = useState(false);

  const getBlock = (blockId) => (st.deliveryBlocks || []).find(b => b.id === blockId);
  const getDriver = (driverId) => (st.users || []).find(u => u.id === driverId);
  const getClient = (cId) => (st.clients || []).find(c => c.id === cId);

  const todayTrips = useMemo(() =>
    (st.deliveryTrips || []).filter(t => t.date === selDate),
    [st.deliveryTrips, selDate]
  );

  const selTrip = useMemo(() =>
    (st.deliveryTrips || []).find(t => t.id === selTripId),
    [st.deliveryTrips, selTripId]
  );

  const selBlock = useMemo(() =>
    selTrip ? getBlock(selTrip.blockId) : null,
    [selTrip, st.deliveryBlocks]
  );

  const tripRecords = useMemo(() =>
    selTripId ? (st.deliveryRecords || []).filter(r => r.tripId === selTripId) : [],
    [selTripId, st.deliveryRecords]
  );

  const clientRows = useMemo(() => {
    if (!selBlock) return [];
    return (selBlock.clientIds || []).map((cId, idx) => {
      const client = getClient(cId);
      const rec = tripRecords.find(r => r.clientId === cId);
      return { client, rec, idx, cId };
    }).filter(r => r.client);
  }, [selBlock, tripRecords, st.clients]);

  const summary = useMemo(() => {
    const total = clientRows.length;
    const delivered = clientRows.filter(r => r.rec?.status === 'delivered').length;
    const partial = clientRows.filter(r => r.rec?.status === 'partial').length;
    const failed = clientRows.filter(r => r.rec?.status === 'failed').length;
    const pending = total - delivered - partial - failed;
    const pct = total > 0 ? Math.round(((delivered + partial) / total) * 100) : 0;
    return { total, delivered, partial, failed, pending, pct };
  }, [clientRows]);

  const shareUrl = useMemo(() => {
    if (!selTripId) return '';
    return `${window.location.origin}/delivery/portal?trip=${selTripId}`;
  }, [selTripId]);

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const STATUS_INFO = {
    pending:   { label: '미완료', cls: 'bg-slate-700/50 text-slate-400',       bar: 'bg-slate-500' },
    delivered: { label: '완료',   cls: 'bg-emerald-900/30 text-emerald-300',   bar: 'bg-emerald-500' },
    partial:   { label: '일부',   cls: 'bg-amber-900/30 text-amber-300',       bar: 'bg-amber-500' },
    failed:    { label: '실패',   cls: 'bg-rose-900/30 text-rose-300',         bar: 'bg-rose-500' },
  };

  const dlExcel = () => {
    if (!selBlock || clientRows.length === 0) return;
    const rows = clientRows.map((r, i) => {
      const s = STATUS_INFO[r.rec?.status || 'pending'];
      return `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${r.client.shortName || r.client.name}</td>
        <td style="text-align:center;">${s.label}</td>
        <td>${r.rec?.deliveredAt || ''}</td>
        <td style="text-align:center;">${r.rec?.signatureData ? 'O' : ''}</td>
        <td>${r.rec?.note || ''}</td>
      </tr>`;
    }).join('');
    Utils.dlExcel(`<table>
      <thead><tr><th>순번</th><th>거래처</th><th>상태</th><th>완료시각</th><th>서명</th><th>비고</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`, `수령확인증_${selBlock.name}_${selDate}`);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-white">수령 확인증 포털</h1>
          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse font-black">LIVE</span>
        </div>
        <button onClick={dlExcel} disabled={!selTripId || clientRows.length === 0}
          className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
          {Ic.Down} 엑셀 다운로드
        </button>
      </div>

      {/* 필터 */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-400 block mb-1.5">날짜</label>
            <input type="date" value={selDate}
              onChange={e => { setSelDate(e.target.value); setSelTripId(''); setSelClientId(null); }}
              className="input-base w-full" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 block mb-1.5">배송 일정</label>
            <select value={selTripId}
              onChange={e => { setSelTripId(e.target.value); setSelClientId(null); }}
              className="input-base w-full">
              <option value="">-- 선택 --</option>
              {todayTrips.map(t => {
                const b = getBlock(t.blockId);
                const d = getDriver(t.driverId);
                return (
                  <option key={t.id} value={t.id}>
                    {b?.name || '(블럭 없음)'} — {d?.name || '미배정'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 공유 링크 */}
      {selTripId && (
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-slate-400 mb-1">수령확인증 공유 링크</div>
              <div className="text-sm text-indigo-400 font-mono truncate">{shareUrl}</div>
            </div>
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-bold transition-colors flex-shrink-0 ${copied ? 'bg-emerald-600 text-white' : 'btn-secondary'}`}>
              {copied ? Ic.Check : Ic.Copy}
              {copied ? '복사됨!' : '링크 복사'}
            </button>
          </div>
        </div>
      )}

      {!selTripId ? (
        <div className="card text-center py-12 text-slate-500">
          날짜와 배송 일정을 선택해주세요.
        </div>
      ) : (
        <>
          {/* 전체 진행률 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-white">{selBlock?.name} 배송 현황</span>
              <span className="text-2xl font-black text-indigo-400">{summary.pct}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
              <div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${summary.pct}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '전체', val: summary.total, cls: 'text-white' },
                { label: '완료', val: summary.delivered, cls: 'text-emerald-400' },
                { label: '일부', val: summary.partial, cls: 'text-amber-400' },
                { label: '미완료', val: summary.pending + summary.failed, cls: 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-black ${s.cls}`}>{s.val}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 거래처 카드 그리드 — 원본 방식 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientRows.map(({ client, rec, idx }) => {
              const status = rec?.status || 'pending';
              const si = STATUS_INFO[status];
              const isSel = selClientId === client.id;
              const pct = status === 'delivered' ? 100 : status === 'partial' ? 50 : status === 'failed' ? 0 : 0;

              return (
                <div key={client.id}
                  onClick={() => setSelClientId(isSel ? null : client.id)}
                  className={`bg-slate-800 rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-lg ${
                    isSel ? 'border-indigo-500 shadow-indigo-500/20' :
                    status === 'delivered' ? 'border-emerald-700/50' :
                    status === 'failed' ? 'border-rose-700/50' :
                    'border-slate-700 hover:border-slate-500'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-700 text-xs font-black text-slate-300 flex items-center justify-center">{idx + 1}</span>
                        <h3 className="text-lg font-black text-white">{client.shortName || client.name}</h3>
                      </div>
                      {rec?.deliveredAt && (
                        <p className="text-xs text-slate-500 mt-0.5 pl-8">{rec.deliveredAt} 완료</p>
                      )}
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${si.cls}`}>
                      {si.label}
                    </span>
                  </div>

                  {/* 진행률 바 */}
                  <div className="w-full bg-slate-700 h-2 rounded-full mb-3 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-700 ${si.bar}`}
                      style={{ width: `${pct}%` }} />
                  </div>

                  {/* 1차/2차 배송 상태 */}
                  <div className="space-y-1.5">
                    {(() => {
                      const order = (st.clientOrders || []).find(o => o.clientId === client.id);
                      if (!order) return null;
                      return (
                        <>
                          {order.deliveryDate1 && (
                            <div className="flex justify-between items-center bg-slate-700/30 px-3 py-2 rounded-lg">
                              <span className="text-xs font-bold text-slate-400">1차 배송 ({order.deliveryDate1})</span>
                              {order.deliveryDate1 === selDate
                                ? <span className={`text-xs font-black ${status === 'delivered' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {status === 'delivered' ? '✓ 완료' : status === 'failed' ? '✗ 실패' : '준비중'}
                                  </span>
                                : <span className="text-xs text-slate-600">해당없음</span>
                              }
                            </div>
                          )}
                          {order.deliveryDate2 && (
                            <div className="flex justify-between items-center bg-slate-700/30 px-3 py-2 rounded-lg">
                              <span className="text-xs font-bold text-slate-400">2차 배송 ({order.deliveryDate2})</span>
                              {order.deliveryDate2 === selDate
                                ? <span className={`text-xs font-black ${status === 'delivered' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {status === 'delivered' ? '✓ 완료' : status === 'failed' ? '✗ 실패' : '준비중'}
                                  </span>
                                : <span className="text-xs text-slate-600">해당없음</span>
                              }
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* 서명/사진 미리보기 */}
                  {isSel && rec && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      {rec.signatureData && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1 font-bold">수령인 서명</div>
                          <div className="bg-white rounded-lg p-1">
                            <img src={rec.signatureData} alt="서명" className="w-full h-16 object-contain" />
                          </div>
                        </div>
                      )}
                      {rec.photoData && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1 font-bold">배송 사진</div>
                          <img src={rec.photoData} alt="배송사진" className="w-full h-24 object-cover rounded-lg" />
                        </div>
                      )}
                      {rec.note && (
                        <div className="text-xs text-slate-400">{rec.note}</div>
                      )}
                      {rec.gps && (
                        <div className="text-xs text-amber-400 font-mono">
                          📍 {rec.gps.lat?.toFixed(5)}, {rec.gps.lng?.toFixed(5)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
