import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Ic } from '../common/Icons';

const MENUS = [
  {
    id: 'dashboard', label: '대시보드', icon: 'Dash', path: '/dashboard',
    roles: ['admin','office','logistics','driver'],
  },
  {
    id: 'erp', label: 'ERP', icon: 'Serv', roles: ['admin','office','logistics'],
    children: [
      { id:'clients',      label:'보건소 관리',    icon:'Bldg',  path:'/erp/clients',       roles:['admin','office'] },
      { id:'users',        label:'사용자 관리',    icon:'User',  path:'/erp/users',         roles:['admin'] },
      { id:'items',        label:'품목 관리',      icon:'Box',   path:'/erp/items',         roles:['admin','office'] },
      { id:'suppliers',    label:'거래처 관리',    icon:'Users', path:'/erp/suppliers',     roles:['admin','office'] },
      { id:'contracts',    label:'보건소 계약',    icon:'FileD', path:'/erp/contracts',     roles:['admin','office'] },
      { id:'priceMap',     label:'단가 매칭',      icon:'File',  path:'/erp/price-mapping', roles:['admin','office'] },
      { id:'schedule',     label:'작업/배송 일정', icon:'Cal',   path:'/erp/schedule',      roles:['admin','office','logistics'] },
      { id:'roster',       label:'명단 관리',      icon:'Users', path:'/erp/roster',        roles:['admin','office'] },
      { id:'itemMap',      label:'품목 매칭',      icon:'ChkSq', path:'/erp/item-mapping',  roles:['admin','office'] },
      { id:'orders',       label:'발주 청구 관리',  icon:'Clip',  path:'/erp/orders',        roles:['admin','office'] },
      { id:'orderSum',     label:'AI 집계(참고)',  icon:'ListP', path:'/erp/order-summary', roles:['admin','office'] },
      { id:'purchase',     label:'구매요청',       icon:'File',  path:'/erp/purchase',      roles:['admin','office'] },
      { id:'receipt',      label:'입고 확인',      icon:'Down',  path:'/erp/receipt',       roles:['admin','logistics'] },
      { id:'workOrder',    label:'소분 지시서',    icon:'ListP', path:'/erp/work-order',    roles:['admin','office'] },
      { id:'settlement',   label:'자동 정산/청구', icon:'Card',  path:'/erp/settlement',    roles:['admin','office'] },
      { id:'payment',      label:'대금 정산',      icon:'Card',  path:'/erp/payment',       roles:['admin','office'] },
      { id:'system',       label:'시스템 점검',    icon:'Serv',  path:'/erp/system',        roles:['admin'] },
    ],
  },
  {
    id: 'package', label: '패키지 관리', icon: 'Box', roles: ['admin','office','logistics'],
    children: [
      { id:'pkgCal',  label:'작업 일정',    icon:'Cal',    path:'/package/calendar', roles:['admin','office','logistics'] },
      { id:'pkgReg',  label:'패키지 구성',  icon:'Edit',   path:'/package/register', roles:['admin','office'] },
      { id:'pkgMat',  label:'소분작업내역', icon:'ListO',  path:'/package/matrix',   roles:['admin','office','logistics'] },
      { id:'pkgPick', label:'패킹 지시서',  icon:'ListP',  path:'/package/picking',  roles:['admin','office','logistics'] },
      { id:'pkgPrt',  label:'패키지 출력',  icon:'Print2', path:'/package/print',    roles:['admin','office','logistics'] },
    ],
  },
  {
    id: 'delivery', label: '배송 관리', icon: 'Truck', roles: ['admin','office','logistics','driver'],
    children: [
      { id:'delBlk',  label:'배송블럭/순번',   icon:'Map',   path:'/delivery/blocks',  roles:['admin','logistics'] },
      { id:'delLoad', label:'상차 지시서',     icon:'Truck', path:'/delivery/loading', roles:['admin','office','logistics'] },
      { id:'delStat', label:'실시간 배송상태', icon:'ListO', path:'/delivery/status',  roles:['admin','office','logistics'] },
      { id:'delPort', label:'수령 확인증',     icon:'File',  path:'/delivery/portal',  roles:['admin','office'] },
      { id:'driver',  label:'기사 배송앱',     icon:'Truck', path:'/delivery/driver',  roles:['admin','logistics','driver'] },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { cUser, globalMonth, setGlobalMonth } = useApp();
  const location = useLocation();
  const [openSections, setOpenSections] = useState({ erp: true, package: false, delivery: false });

  const hasRole = (roles) => roles?.includes(cUser?.role);
  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }));
  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) => children?.some(c => location.pathname === c.path);

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen flex-shrink-0`}
      style={{
        background: 'linear-gradient(180deg, #0a0f22 0%, #080c1c 100%)',
        borderRight: '1px solid rgba(30,40,80,0.8)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* 로고 */}
      <div
        className={`flex items-center gap-3 px-4 py-4 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-sm"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.50), inset 0 1px 0 rgba(255,255,255,0.20)',
          }}
        >
          W
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-black text-white text-sm tracking-wide">웰쉐어</div>
            <div className="text-[10px] font-bold" style={{ color: '#7c85f0' }}>통합 시스템</div>
          </div>
        )}
      </div>

      {/* 월 선택 */}
      {!collapsed && (
        <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(30,40,80,0.7)' }}>
          <input
            type="month"
            value={globalMonth}
            onChange={e => setGlobalMonth(e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-1.5 font-bold focus:outline-none transition-all duration-200"
            style={{
              background: 'rgba(99,102,241,0.10)',
              border: '1px solid rgba(99,102,241,0.20)',
              color: '#a5b4fc',
            }}
          />
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {MENUS.map(menu => {
          if (!hasRole(menu.roles)) return null;

          /* 단일 링크 메뉴 (대시보드) */
          if (menu.path) {
            const active = isActive(menu.path);
            return (
              <NavLink key={menu.id} to={menu.path} title={collapsed ? menu.label : ''}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                style={active ? {
                  background: 'rgba(79,70,229,0.18)',
                  color: '#c7d2fe',
                  borderLeft: '3px solid #6366f1',
                  paddingLeft: collapsed ? undefined : '9px',
                  boxShadow: 'inset 0 0 20px rgba(99,102,241,0.08)',
                } : { color: '#64748b' }}
              >
                <span className="flex-shrink-0" style={active ? { color: '#818cf8' } : {}}>{Ic[menu.icon]}</span>
                {!collapsed && <span>{menu.label}</span>}
              </NavLink>
            );
          }

          /* 섹션 메뉴 */
          const visible = menu.children?.filter(c => hasRole(c.roles));
          if (!visible?.length) return null;
          const secActive = isSectionActive(menu.children);
          const open = openSections[menu.id] || secActive;

          return (
            <div key={menu.id}>
              {/* 섹션 헤더 */}
              <button
                onClick={() => !collapsed && toggleSection(menu.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                style={{ color: secActive ? '#818cf8' : '#475569' }}
                title={collapsed ? menu.label : ''}
              >
                <span className="flex-shrink-0">{Ic[menu.icon]}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{menu.label}</span>
                    <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>{Ic.ChevR}</span>
                  </>
                )}
              </button>

              {/* 섹션 자식 */}
              {!collapsed && open && (
                <div className="ml-3 mt-0.5 space-y-0.5 pl-2" style={{ borderLeft: '1px solid rgba(99,102,241,0.15)' }}>
                  {visible.map(child => {
                    const active = isActive(child.path);
                    return (
                      <NavLink key={child.id} to={child.path}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                        style={active ? {
                          background: 'rgba(79,70,229,0.18)',
                          color: '#c7d2fe',
                          borderLeft: '2px solid #6366f1',
                          paddingLeft: '6px',
                        } : { color: '#475569' }}
                      >
                        <span className="flex-shrink-0 w-3.5 h-3.5" style={active ? { color: '#818cf8' } : {}}>{Ic[child.icon]}</span>
                        <span>{child.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 하단 접기 버튼 */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid rgba(30,40,80,0.7)' }}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-xl transition-all duration-150 text-slate-600 hover:text-slate-300"
          style={{ background: 'rgba(30,40,80,0.4)' }}
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          <span className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>{Ic.ChevL}</span>
        </button>
      </div>
    </aside>
  );
}
