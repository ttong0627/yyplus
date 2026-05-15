import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Ic } from '../common/Icons';

const PAGE_TITLES = {
  '/dashboard': '대시보드',
  '/erp/clients': '보건소 관리',
  '/erp/users': '사용자 관리',
  '/erp/items': '품목 관리',
  '/erp/suppliers': '거래처 관리',
  '/erp/contracts': '보건소 계약',
  '/erp/price-mapping': '단가 매칭',
  '/erp/schedule': '작업/배송 일정',
  '/erp/roster': '명단 관리',
  '/erp/item-mapping': '품목 매칭',
  '/erp/orders': '발주 청구 관리',
  '/erp/order-summary': 'AI 발주 집계',
  '/erp/purchase': '구매 요청',
  '/erp/receipt': '입고 확인',
  '/erp/work-order': '소분 지시서',
  '/erp/settlement': '자동 정산/청구',
  '/erp/payment': '대금 정산',
  '/erp/system': '시스템 점검',
  '/package/calendar': '패키지 작업 일정',
  '/package/register': '패키지 구성',
  '/package/matrix': '소분작업 내역',
  '/package/picking': '패킹 지시서',
  '/package/print': '패키지 출력',
  '/delivery/blocks': '배송블럭/순번',
  '/delivery/loading': '상차 지시서',
  '/delivery/status': '실시간 배송 상태',
  '/delivery/portal': '수령 확인증 포털',
  '/delivery/driver': '기사 배송앱',
};

const ROLE_LABEL = { admin:'관리자', office:'사무직', logistics:'물류팀', driver:'기사' };
const ROLE_COLORS = {
  admin:     { bg: 'rgba(244,63,94,0.18)',     text: '#fb7185', border: 'rgba(244,63,94,0.30)' },
  office:    { bg: 'rgba(99,102,241,0.18)',    text: '#a5b4fc', border: 'rgba(99,102,241,0.30)' },
  logistics: { bg: 'rgba(245,158,11,0.18)',   text: '#fcd34d', border: 'rgba(245,158,11,0.30)' },
  driver:    { bg: 'rgba(16,185,129,0.18)',   text: '#6ee7b7', border: 'rgba(16,185,129,0.30)' },
};

export default function Header({ onToggleSidebar }) {
  const { cUser, logout, globalMonth } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || '웰쉐어 통합 시스템';
  const rc = ROLE_COLORS[cUser?.role] || ROLE_COLORS.office;

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0"
      style={{
        background: 'rgba(8, 12, 28, 0.95)',
        borderBottom: '1px solid rgba(30,40,80,0.8)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 좌측 — 햄버거 + 페이지명 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 text-slate-500 hover:text-slate-200"
          style={{ background: 'rgba(30,40,80,0.5)' }}
        >
          {Ic.Menu}
        </button>
        <div>
          <span className="text-sm font-black text-white">{pageTitle}</span>
          <span className="hidden sm:inline text-xs text-slate-500 ml-2 font-bold">— {globalMonth}</span>
        </div>
      </div>

      {/* 우측 — 사용자 */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150"
          style={{ background: menuOpen ? 'rgba(30,40,80,0.8)' : 'rgba(30,40,80,0.4)' }}
        >
          {/* 아바타 */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
            }}
          >
            {cUser?.name?.[0] || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-black text-white leading-tight">{cUser?.name}</div>
            <div className="text-[10px] font-bold leading-tight" style={{ color: rc.text }}>{ROLE_LABEL[cUser?.role] || cUser?.role}</div>
          </div>
          <span className="text-slate-500">{Ic.ChevD}</span>
        </button>

        {/* 드롭다운 */}
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
            style={{
              background: 'rgba(10,15,35,0.97)',
              border: '1px solid rgba(30,40,80,0.8)',
              borderTop: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(30,40,80,0.7)' }}>
              <p className="font-black text-white text-sm">{cUser?.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
                >
                  {ROLE_LABEL[cUser?.role] || cUser?.role}
                </span>
                <span className="text-xs text-slate-500 font-mono">{cUser?.id}</span>
              </div>
            </div>
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-all duration-150"
              style={{ color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {Ic.LogOut}
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
