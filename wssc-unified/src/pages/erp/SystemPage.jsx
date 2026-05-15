import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function SystemPage() {
  const { st, updateSt, showToast, showConfirm, dbReady, fbUser } = useApp();
  const [importing, setImporting] = useState(false);

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
          Object.keys(data).forEach(key => { if (data[key] !== undefined) updateSt(key, data[key]); });
          showToast('데이터 복원이 완료되었습니다.', 'success');
        });
      } catch { showToast('파일 형식이 올바르지 않습니다.', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            <p className="text-xs font-bold text-slate-400 mb-1">프로젝트</p>
            <p className="font-black text-sm text-indigo-400">wssc-nutrition</p>
          </div>
        </div>
      </div>

      {/* 데이터 현황 */}
      <div className="card">
        <h2 className="section-title">데이터 현황</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {collections.map(col => {
            const data = st[col.key];
            const count = Array.isArray(data) ? data.length : (data && typeof data === 'object' ? Object.keys(data).length : 0);
            return (
              <div key={col.key} className="bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400 font-bold">{col.label}</p>
                <p className="text-lg font-black text-white">{count}</p>
              </div>
            );
          })}
        </div>
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
