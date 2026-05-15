import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Ic } from '../components/common/Icons';
import { Utils } from '../utils';

const STAT_CFG = {
  indigo:  { grad: 'rgba(79,70,229,0.15), rgba(109,40,217,0.08)',  bdr: 'rgba(99,102,241,0.25)',  txt: '#a5b4fc', ic: 'rgba(99,102,241,0.22)',  glow: 'rgba(99,102,241,0.20)' },
  emerald: { grad: 'rgba(5,150,105,0.15), rgba(8,145,178,0.08)',   bdr: 'rgba(16,185,129,0.22)',  txt: '#6ee7b7', ic: 'rgba(16,185,129,0.22)',  glow: 'rgba(16,185,129,0.18)' },
  amber:   { grad: 'rgba(217,119,6,0.15), rgba(180,83,9,0.08)',    bdr: 'rgba(245,158,11,0.22)',  txt: '#fcd34d', ic: 'rgba(245,158,11,0.22)',  glow: 'rgba(245,158,11,0.18)' },
  rose:    { grad: 'rgba(220,38,38,0.15), rgba(190,18,60,0.08)',   bdr: 'rgba(244,63,94,0.22)',   txt: '#fda4af', ic: 'rgba(244,63,94,0.22)',   glow: 'rgba(244,63,94,0.18)' },
  sky:     { grad: 'rgba(2,132,199,0.15), rgba(7,89,133,0.08)',    bdr: 'rgba(14,165,233,0.22)',  txt: '#7dd3fc', ic: 'rgba(14,165,233,0.22)',  glow: 'rgba(14,165,233,0.18)' },
  violet:  { grad: 'rgba(124,58,237,0.15), rgba(109,40,217,0.08)', bdr: 'rgba(139,92,246,0.22)', txt: '#c4b5fd', ic: 'rgba(139,92,246,0.22)', glow: 'rgba(139,92,246,0.18)' },
};

function StatCard({ label, value, sub, icon, color }) {
  const c = STAT_CFG[color] || STAT_CFG.indigo;
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${c.grad})`,
        border: `1px solid ${c.bdr}`,
        boxShadow: `0 4px 28px rgba(0,0,0,0.40), 0 0 30px ${c.glow}`,
        borderTop: `1px solid ${c.bdr}`,
      }}
    >
      {/* 배경 글로우 */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, filter: 'blur(16px)' }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-black text-slate-500 mb-2 tracking-widest uppercase">{label}</p>
          <p className="text-4xl font-black" style={{ color: c.txt }}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1 font-bold">{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.ic, color: c.txt }}
        >
          <span className="w-5 h-5">{Ic[icon]}</span>
        </div>
      </div>
    </div>
  );
}

const QUICK_CFG = {
  indigo:  { hover: 'rgba(79,70,229,0.15)',  bdr: 'rgba(99,102,241,0.35)',  txt: '#a5b4fc' },
  emerald: { hover: 'rgba(5,150,105,0.15)',  bdr: 'rgba(16,185,129,0.35)', txt: '#6ee7b7' },
  amber:   { hover: 'rgba(217,119,6,0.15)',  bdr: 'rgba(245,158,11,0.35)', txt: '#fcd34d' },
  sky:     { hover: 'rgba(2,132,199,0.15)',  bdr: 'rgba(14,165,233,0.35)', txt: '#7dd3fc' },
  violet:  { hover: 'rgba(124,58,237,0.15)', bdr: 'rgba(139,92,246,0.35)', txt: '#c4b5fd' },
  rose:    { hover: 'rgba(220,38,38,0.15)',  bdr: 'rgba(244,63,94,0.35)',  txt: '#fda4af' },
};

function QuickLink({ label, path, icon, color }) {
  const navigate = useNavigate();
  const c = QUICK_CFG[color] || QUICK_CFG.indigo;
  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 text-slate-500 hover:text-white group"
      style={{ border: '1px solid rgba(30,40,80,0.6)', background: 'rgba(10,15,30,0.5)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = c.hover;
        e.currentTarget.style.borderColor = c.bdr;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(10,15,30,0.5)';
        e.currentTarget.style.borderColor = 'rgba(30,40,80,0.6)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <span className="w-6 h-6 transition-colors" style={{ color: 'inherit' }}>{Ic[icon]}</span>
      <span className="text-xs font-black text-center leading-tight">{label}</span>
    </button>
  );
}

export default function DashboardPage() {
  const { st, globalMonth, cUser } = useApp();

  const stats = useMemo(() => {
    const monthOrders = (st.clientOrders || []).filter(o => o.month === globalMonth);
    const done1 = monthOrders.filter(o => o.done1).length;
    const done2 = monthOrders.filter(o => o.done2).length;
    const total = monthOrders.length;
    return {
      clients: (st.clients || []).length,
      items: (st.items || []).length,
      orders: total,
      done1, done2,
      suppliers: (st.suppliers || []).length,
      packages: (st.packageOrders || []).filter(p => p.month === globalMonth).length,
    };
  }, [st, globalMonth]);

  const recentLogs = (st.systemLogs || []).slice(0, 5);
  const isAdmin = cUser?.role === 'admin';
  const isOffice = ['admin','office'].includes(cUser?.role);
  const isLogistics = ['admin','logistics'].includes(cUser?.role);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-black text-white">대시보드</h1>
        <p className="text-sm text-slate-500 mt-1">
          안녕하세요,{' '}
          <span className="font-black" style={{ color: '#a5b4fc' }}>{cUser?.name}</span>님 · 작업월{' '}
          <span className="font-bold" style={{ color: '#a5b4fc' }}>{globalMonth}</span>
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {isOffice && <StatCard label="보건소" value={stats.clients} sub="등록된 보건소" icon="Bldg" color="indigo" />}
        {isOffice && <StatCard label="품목" value={stats.items} sub="마스터 품목" icon="Box" color="emerald" />}
        {isOffice && <StatCard label="이번달 발주" value={stats.orders} sub={globalMonth} icon="Clip" color="amber" />}
        {isOffice && <StatCard label="1차 완료" value={stats.done1} sub={`/ ${stats.orders}건`} icon="Truck" color="sky" />}
        {isOffice && <StatCard label="2차 완료" value={stats.done2} sub={`/ ${stats.orders}건`} icon="Check" color="violet" />}
        {isAdmin && <StatCard label="거래처" value={stats.suppliers} sub="등록된 거래처" icon="Users" color="rose" />}
      </div>

      {/* 빠른 이동 */}
      <div className="card">
        <h2 className="section-title">빠른 이동</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {isOffice    && <QuickLink label="발주 등록"   path="/erp/orders"        icon="Clip"   color="indigo" />}
          {isOffice    && <QuickLink label="AI 집계"     path="/erp/order-summary" icon="ListP"  color="emerald" />}
          {isOffice    && <QuickLink label="소분지시서"  path="/erp/work-order"    icon="ListP"  color="amber" />}
          {isLogistics && <QuickLink label="패키지 구성" path="/package/register"  icon="Box"    color="violet" />}
          {isLogistics && <QuickLink label="패킹지시서"  path="/package/picking"   icon="ListP"  color="sky" />}
          {isLogistics && <QuickLink label="패키지 출력" path="/package/print"     icon="Print2" color="emerald" />}
          {isLogistics && <QuickLink label="배송블럭"    path="/delivery/blocks"   icon="Map"    color="amber" />}
          {isLogistics && <QuickLink label="상차지시서"  path="/delivery/loading"  icon="Truck"  color="indigo" />}
          {isLogistics && <QuickLink label="배송상태"    path="/delivery/status"   icon="ListO"  color="sky" />}
          {isOffice    && <QuickLink label="정산/청구"   path="/erp/settlement"    icon="Card"   color="rose" />}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 배송 현황 */}
        {isOffice && (
          <div className="card">
            <h2 className="section-title">이번달 배송 현황 ({globalMonth})</h2>
            {stats.orders === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">이번달 발주 내역이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {[
                  { label: '1차 배송', done: stats.done1, color: '#38bdf8', glow: 'rgba(56,189,248,0.25)' },
                  { label: '2차 배송', done: stats.done2, color: '#a78bfa', glow: 'rgba(167,139,250,0.25)' },
                ].map(({ label, done, color, glow }) => {
                  const pct = stats.orders ? Math.round((done / stats.orders) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-400">{label}</span>
                        <span style={{ color }}>{done} / {stats.orders} ({pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(20,30,60,0.8)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${glow}` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 시스템 로그 */}
        {isAdmin && (
          <div className="card">
            <h2 className="section-title">최근 시스템 활동</h2>
            {recentLogs.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">활동 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentLogs.map(log => (
                  <li key={log.id} className="flex gap-3 text-xs">
                    <span className="text-slate-600 flex-shrink-0 font-mono">{log.date}</span>
                    <span className="text-slate-400">{log.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
