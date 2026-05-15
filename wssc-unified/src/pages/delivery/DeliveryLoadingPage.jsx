import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const GLOBAL_PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #delivery-loading-print, #delivery-loading-print * { visibility: visible !important; }
  #delivery-loading-print { position: fixed !important; inset: 0 !important; z-index: 9999 !important; background: white !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
`;

export default function DeliveryLoadingPage() {
  const { st } = useApp();
  const [selDate, setSelDate] = useState(Utils.today());
  const [selBlockId, setSelBlockId] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  const selBlock = useMemo(() =>
    (st.deliveryBlocks || []).find(b => b.id === selBlockId),
    [st.deliveryBlocks, selBlockId]
  );

  const getClient = (cId) => (st.clients || []).find(c => c.id === cId);
  const getItem = (iId) => (st.items || []).find(i => i.id === iId);

  const orderedClients = useMemo(() => {
    if (!selBlock) return [];
    return (selBlock.clientIds || []).map(cId => getClient(cId)).filter(Boolean);
  }, [selBlock, st.clients]);

  const loadingData = useMemo(() => {
    if (!selBlock || !selDate) return [];
    return orderedClients.map((client, idx) => {
      const clientOrder = (st.clientOrders || []).find(o => o.clientId === client.id);
      if (!clientOrder) return null;
      const isR1 = clientOrder.deliveryDate1 === selDate;
      const isR2 = clientOrder.deliveryDate2 === selDate;
      if (!isR1 && !isR2) return null;

      const pkgs = (st.packageOrders || []).filter(po =>
        po.clientId === client.id && po.round === (isR1 ? 1 : 2) && po.pkgType !== '공통'
      ).sort((a, b) => (a.pkgNum || 0) - (b.pkgNum || 0));

      const packages = pkgs.map(po => ({
        pkgNum: po.pkgNum,
        pkgType: po.pkgType,
        pkgNote: po.pkgNote || '',
        items: (po.items || []).map(item => {
          const masterItem = getItem(item.itemId);
          return {
            name: item.clientItemName || masterItem?.name || '?',
            qty: item.qty || '',
            unit: item.unit || masterItem?.unit || '',
            note: item.note || '',
          };
        }).filter(it => it.qty),
      })).filter(pkg => pkg.items.length > 0);

      return {
        client,
        idx,
        round: isR1 ? 1 : 2,
        packages,
        id: clientOrder.id,
      };
    }).filter(Boolean).filter(d => d.packages.length > 0);
  }, [selBlock, selDate, orderedClients, st.clientOrders, st.packageOrders, st.items]);

  // 상차는 역순 (마지막 배송 → 먼저 상차)
  const loadingOrder = useMemo(() => [...loadingData].reverse(), [loadingData]);

  // QR 코드 URL 생성 (api.qrserver.com 외부 API — 원본 방식)
  const getQrUrl = (clientId) => {
    const portalUrl = `${window.location.origin}/delivery/portal?client=${clientId}&date=${selDate}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(portalUrl)}`;
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  };

  const dlExcel = () => {
    if (!selBlock || loadingOrder.length === 0) return;
    let rows = '';
    loadingOrder.forEach((d, i) => {
      rows += `<tr><td colspan="4" style="background:#1a237e;color:white;font-weight:900;font-size:13pt;padding:8px;">
        ${i + 1}. ${d.client.shortName || d.client.name} (${d.round}차 배송)
      </td></tr>`;
      d.packages.forEach(pkg => {
        rows += `<tr style="background:#e8eaf6;"><td colspan="4" style="font-weight:900;">${pkg.pkgType} P${pkg.pkgNum}${pkg.pkgNote ? ' [' + pkg.pkgNote + ']' : ''}</td></tr>`;
        pkg.items.forEach(item => {
          rows += `<tr><td></td><td>${item.name}</td><td style="text-align:center;font-weight:900;">${item.qty}${item.unit}</td><td>${item.note}</td></tr>`;
        });
      });
    });
    Utils.dlExcel(`<table>
      <thead><tr><th>상차순</th><th>품목명</th><th>수량</th><th>비고</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`, `상차지시서_${selBlock.name}_${selDate}`);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <style>{GLOBAL_PRINT_STYLE}</style>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-white">상차 지시서</h1>
        <div className="flex gap-2">
          <button onClick={dlExcel} disabled={!selBlock || loadingOrder.length === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
            {Ic.Down} 엑셀
          </button>
          <button onClick={handlePrint} disabled={!selBlock || loadingOrder.length === 0}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40">
            {Ic.Print2} 인쇄
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-400 block mb-1.5">배송 날짜</label>
            <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
              className="input-base w-full" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 block mb-1.5">배송 블럭</label>
            <select value={selBlockId} onChange={e => setSelBlockId(e.target.value)}
              className="input-base w-full">
              <option value="">-- 블럭 선택 --</option>
              {(st.deliveryBlocks || []).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selBlock ? (
        <div className="card text-center py-12 text-slate-500">배송 블럭을 선택해주세요.</div>
      ) : loadingOrder.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          {selDate} 날짜에 {selBlock.name} 블럭의 배송 데이터가 없습니다.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-400">
              {selBlock.name} — {selDate} — 상차 순서 (총 {loadingOrder.length}개소)
              <span className="ml-2 text-slate-600 font-normal">※ 마지막 배송지 먼저 상차</span>
            </h2>
          </div>

          {/* 카드 그리드 레이아웃 — 원본 방식 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingOrder.map((d, loadIdx) => (
              <div key={d.client.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
                {/* 카드 헤더 */}
                <div className="flex items-start justify-between p-4 border-b border-slate-700">
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black mb-1.5 inline-block ${
                      d.round === 1 ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'
                    }`}>
                      {d.round}차 배송일 {selDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                        {loadIdx + 1}
                      </span>
                      <h3 className="text-lg font-black text-white leading-tight">
                        {d.client.shortName || d.client.name}
                      </h3>
                    </div>
                    {d.client.contact && (
                      <p className="text-xs text-slate-500 mt-1">연락처: {d.client.contact}</p>
                    )}
                  </div>
                  {/* QR 코드 — api.qrserver.com 외부 API */}
                  <img
                    src={getQrUrl(d.client.id)}
                    alt="QR"
                    className="w-16 h-16 rounded-xl border border-slate-600 p-0.5 bg-white flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* 패키지 + 품목 */}
                <div className="flex-1 p-4 space-y-3">
                  {d.packages.map(pkg => (
                    <div key={pkg.pkgNum} className="bg-slate-700/50 rounded-xl p-3">
                      <div className="text-xs font-black text-indigo-400 mb-2 flex items-center gap-1">
                        {Ic.Box}
                        P{pkg.pkgNum} — {pkg.pkgType}
                        {pkg.pkgNote && <span className="text-amber-400 ml-1">[{pkg.pkgNote}]</span>}
                      </div>
                      <div className="space-y-1.5">
                        {pkg.items.slice(0, 4).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-300 truncate">{item.name}</span>
                            <span className="font-black text-white ml-2 flex-shrink-0">{item.qty}{item.unit}</span>
                          </div>
                        ))}
                        {pkg.items.length > 4 && (
                          <div className="text-xs text-slate-500 text-center bg-slate-800/50 rounded px-2 py-1">
                            ...외 {pkg.items.length - 4}건
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 카드 푸터 */}
                <div className="px-4 py-2 border-t border-slate-700 text-[10px] text-slate-500">
                  스마트폰으로 QR을 스캔하면 수령확인 앱으로 이동합니다
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 인쇄 전용 영역 */}
      {showPrint && selBlock && (
        <div id="delivery-loading-print"
          className="fixed inset-0 bg-white z-[9999] overflow-auto p-8"
          style={{ fontFamily: 'NanumSquare, sans-serif', color: '#000' }}>
          <div className="flex justify-between items-start mb-6 no-print">
            <div>
              <div style={{ fontSize: '20pt', fontWeight: 900 }}>상차 지시서</div>
              <div style={{ fontSize: '11pt', marginTop: 4 }}>
                {selBlock.name} | {selDate} | 총 {loadingOrder.length}개소
              </div>
            </div>
            <button onClick={() => setShowPrint(false)}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm no-print">
              닫기
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {loadingOrder.map((d, loadIdx) => (
              <div key={d.client.id}
                style={{ border: '2px solid #1a237e', borderRadius: 16, padding: 16, pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '8pt', background: d.round === 1 ? '#dbeafe' : '#d1fae5', color: d.round === 1 ? '#1d4ed8' : '#065f46', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 4, fontWeight: 900 }}>
                      {d.round}차 배송
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, background: '#1a237e', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '11pt' }}>
                        {loadIdx + 1}
                      </div>
                      <div style={{ fontSize: '16pt', fontWeight: 900 }}>{d.client.shortName || d.client.name}</div>
                    </div>
                    {d.client.contact && <div style={{ fontSize: '8pt', color: '#64748b', marginTop: 4 }}>연락처: {d.client.contact}</div>}
                  </div>
                  <img src={getQrUrl(d.client.id)} alt="QR" style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid #e2e8f0', padding: 2 }} />
                </div>

                {d.packages.map(pkg => (
                  <div key={pkg.pkgNum} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                    <div style={{ fontSize: '9pt', fontWeight: 900, color: '#4f46e5', marginBottom: 6 }}>
                      P{pkg.pkgNum} — {pkg.pkgType}{pkg.pkgNote ? ` [${pkg.pkgNote}]` : ''}
                    </div>
                    {pkg.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', paddingBottom: 3 }}>
                        <span>{item.name}</span>
                        <strong>{item.qty}{item.unit}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
