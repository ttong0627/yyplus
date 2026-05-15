import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function SystemPage() {
  const { st, updateSt, showToast, showConfirm, dbReady, fbUser, migrateTmsData, migrateLegacyData } = useApp();
  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const [legacyMigrating, setLegacyMigrating] = useState(false);
  const [legacyResult, setLegacyResult] = useState(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wssc_unified_backup_${Date.now()}.json`;
    a.click();
    showToast('백업 파일이 다운로드되었습니다.', 'success');
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        showConfirm('백업 데이터를 복원하시겠습니까?\n현재 데이터가 모두 덮어씌워집니다.', () => {
          setImporting(true);
          Object.keys(data).forEach(key => { if (data[key] !== undefined) updateSt(key, data[key]); });
          showToast('데이터 복원이 완료되었습니다.', 'success');
          setImporting(false);
        });
      } catch { showToast('파일 형식이 올바르지 않습니다.', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMigrate = () => {
    showConfirm(
      'wellshare-tms DB에서 기존 데이터 전체를 가져옵니다.\n(보건소, 품목, 거래처, 발주, 정산, 매핑 등)\n\n현재 데이터가 덮어씌워집니다. 계속하시겠습니까?',
      async () => {
        setMigrating(true);
        setMigrateResult(null);
        try {
          const result = await migrateTmsData();
          setMigrateResult(result);
          showToast(`가져오기 완료! 보건소 ${result.clients}개, 품목 ${result.items}개, 발주 ${result.clientOrders}개`, 'success');
        } catch (e) {
          showToast('가져오기 실패: ' + e.message, 'error');
        } finally {
          setMigrating(false);
        }
      }
    );
  };

  const handleLegacyMigrate = () => {
    showConfirm(
      '기존 ERP(wssc-erp-v2) + 워크오더(wssc-work-order) DB에서\n전체 데이터를 가져옵니다.\n\n보건소, 품목, 거래처, 발주, 단가, 매핑, 패키지 등 모든 데이터.\n현재 데이터가 덮어씌워집니다. 계속하시겠습니까?',
      async () => {
        setLegacyMigrating(true);
        setLegacyResult(null);
        try {
          const result = await migrateLegacyData();
          setLegacyResult(result);
          showToast(`가져오기 완료! 보건소 ${result.clients}개, 품목 ${result.items}개, 발주 ${result.clientOrders}개`, 'success');
        } catch (e) {
          showToast('가져오기 실패: ' + e.message, 'error');
        } finally {
          setLegacyMigrating(false);
        }
      }
    );
  };

  const resetCollection = (key) => {
    const defaultVal = Array.isArray(st[key]) ? [] : {};
    showConfirm(`[${key}] 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`, () => {
      updateSt(key, defaultVal);
      showToast(`${key} 초기화 완료`, 'success');
    });
  };

  const collections = [
    { key:'users', label:'사용자', icon:'User' },
    { key:'clients', label:'보건소', icon:'Bldg' },
    { key:'items', label:'품목', icon:'Box' },
    { key:'suppliers', label:'거래처', icon:'Users' },
    { key:'clientOrders', label:'발주', icon:'Clip' },
    { key:'mappings', label:'품목매핑', icon:'ChkSq' },
    { key:'packageOrders', label:'패키지', icon:'Box' },
    { key:'contracts', label:'계약', icon:'FileD' },
    { key:'priceMappings', label:'단가', icon:'Card' },
    { key:'purchaseRequests', label:'구매요청', icon:'File' },
    { key:'payments', label:'정산', icon:'Card' },
    { key:'rosters', label:'명단', icon:'Users' },
    { key:'workSchedules', label:'작업일정', icon:'Cal' },
    { key:'systemLogs', label:'시스템로그', icon:'Serv' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-black text-white">DB 연동 / 시스템 점검</h1>

      {/* 연결 상태 */}
      <div className="card">
        <h2 className="section-title">연결 상태</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl border ${dbReady ? 'bg-emerald-900/20 border-emerald-700' : 'bg-amber-900/20 border-amber-700'}`}>
            <p className="text-xs font-bold text-slate-400 mb-1">Firebase DB</p>
            <p className={`font-black text-sm ${dbReady ? 'text-emerald-400' : 'text-amber-400'}`}>{dbReady ? '✓ 연결됨' : '⏳ 연결 중'}</p>
          </div>
          <div className={`p-3 rounded-xl border ${fbUser ? 'bg-emerald-900/20 border-emerald-700' : 'bg-slate-800 border-slate-700'}`}>
            <p className="text-xs font-bold text-slate-400 mb-1">Firebase Auth</p>
            <p className={`font-black text-sm ${fbUser ? 'text-emerald-400' : 'text-slate-400'}`}>{fbUser ? '✓ 인증됨' : '미인증'}</p>
          </div>
          <div className="p-3 rounded-xl border bg-indigo-900/20 border-indigo-700">
            <p className="text-xs font-bold text-slate-400 mb-1">Firebase 프로젝트</p>
            <p className="font-black text-sm text-indigo-400">wellshare-tms</p>
          </div>
        </div>
      </div>

      {/* ★ 기존 ERP/워크오더 데이터 가져오기 (최우선) */}
      <div className="card border-indigo-700/50 bg-indigo-900/10">
        <h2 className="section-title text-indigo-400">기존 프로그램 DB 전체 가져오기 ★권장</h2>
        <p className="text-xs text-slate-400 mb-4">
          wssc-erp-v2(기존 ERP)와 wssc-work-order(워크오더) DB의 전체 데이터를 통합 시스템으로 가져옵니다.<br/>
          보건소·품목·거래처·발주·단가매핑·패키지·정산·구매요청 등 모든 데이터가 이전됩니다.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleLegacyMigrate}
            disabled={legacyMigrating || !dbReady}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
            style={{ background: legacyMigrating ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }}>
            {legacyMigrating ? '⏳ 가져오는 중...' : '⚡ 기존 ERP/워크오더 전체 가져오기'}
          </button>
          {legacyResult && (
            <div className="text-xs font-bold rounded-lg px-4 py-2"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
              ✅ 완료 — 보건소 {legacyResult.clients}개 · 품목 {legacyResult.items}개 ·
              거래처 {legacyResult.suppliers}개 · 발주 {legacyResult.clientOrders}개 ·
              단가매핑 {legacyResult.priceMappings}개 · 패키지 {legacyResult.packageOrders}개 ·
              사용자 {legacyResult.users}명
            </div>
          )}
        </div>
      </div>

      {/* TMS 데이터 가져오기 */}
      <div className="card border-amber-700/50 bg-amber-900/10">
        <h2 className="section-title text-amber-400">TMS(wellshare-tms) DB 데이터 가져오기</h2>
        <p className="text-xs text-slate-400 mb-4">
          wellshare-tms Firebase의 기존 데이터(보건소·품목·거래처·발주·정산·매핑 등 전체)를<br/>
          통합 시스템 DB로 가져옵니다. TMS 별도 프로젝트 데이터가 필요할 때 실행하세요.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleMigrate}
            disabled={migrating || !dbReady}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
            style={{ background: migrating ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
            {migrating ? '⏳ 가져오는 중...' : '⚡ TMS DB 가져오기'}
          </button>
          {migrateResult && (
            <div className="text-xs font-bold rounded-lg px-4 py-2"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
              ✅ 완료 — 보건소 {migrateResult.clients}개 · 품목 {migrateResult.items}개 ·
              거래처 {migrateResult.suppliers}개 · 발주 {migrateResult.clientOrders}개 ·
              사용자 {migrateResult.users}명
            </div>
          )}
        </div>
      </div>

      {/* 데이터 현황 */}
      <div className="card">
        <h2 className="section-title">현재 데이터 현황</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {collections.map(col => {
            const data = st[col.key];
            const count = Array.isArray(data) ? data.length : (data && typeof data === 'object' ? Object.keys(data).length : 0);
            const isEmpty = count === 0;
            return (
              <div key={col.key}
                className="rounded-lg p-2 text-center"
                style={{ background: isEmpty ? 'rgba(239,68,68,0.08)' : 'rgba(71,85,105,0.3)', border: isEmpty ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent' }}>
                <p className="text-xs font-bold" style={{ color: isEmpty ? '#f87171' : '#94a3b8' }}>{col.label}</p>
                <p className="text-lg font-black" style={{ color: isEmpty ? '#f87171' : '#fff' }}>{count}</p>
              </div>
            );
          })}
        </div>
        {collections.some(col => { const d = st[col.key]; return Array.isArray(d) ? d.length === 0 : !d || Object.keys(d).length === 0; }) && (
          <p className="text-xs text-amber-400 mt-3 font-bold">⚠️ 빨간색 항목은 데이터가 없습니다. 위 "기존 DB 전체 가져오기" 버튼을 실행하세요.</p>
        )}
      </div>

      {/* 백업/복원 */}
      <div className="card">
        <h2 className="section-title">데이터 백업 / 복원</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportData} className="btn-primary flex items-center gap-1.5">{Ic.Down} 전체 백업 다운로드</button>
          <label className="btn-secondary flex items-center gap-1.5 cursor-pointer">
            {Ic.Upload} 백업 파일 복원
            <input type="file" accept=".json" className="hidden" onChange={importData} disabled={importing} />
          </label>
        </div>
      </div>

      {/* 초기화 */}
      <div className="card border-rose-900/50">
        <h2 className="section-title text-rose-400">위험 구역 — 데이터 초기화</h2>
        <p className="text-xs text-slate-400 mb-4">특정 컬렉션만 초기화합니다. 되돌릴 수 없으니 먼저 백업하세요.</p>
        <div className="flex flex-wrap gap-2">
          {collections.map(col => (
            <button key={col.key} onClick={() => resetCollection(col.key)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-900/30 text-rose-400 border border-rose-800 hover:bg-rose-900/60 transition-colors">
              {col.label} 초기화
            </button>
          ))}
        </div>
      </div>

      {/* 시스템 로그 */}
      <div className="card">
        <h2 className="section-title">최근 시스템 로그</h2>
        {(st.systemLogs || []).length === 0 ? (
          <p className="text-slate-500 text-sm">로그가 없습니다.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {(st.systemLogs || []).map(log => (
              <div key={log.id} className="flex gap-3 text-xs py-1 border-b border-slate-700/50">
                <span className="text-slate-500 flex-shrink-0">{log.date}</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
