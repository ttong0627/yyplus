import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wrench, Truck, Receipt, Menu, X, Bell, User, LogOut, Database, ShoppingCart, Settings, ChevronDown, ChevronRight, Sun, CloudRain } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import Login from './pages/Login';
import LogisticsModule from './pages/Logistics';
import BillingModule from './pages/Billing';
import SystemAdmin from './pages/SystemAdmin';
import MasterData from './pages/MasterData';
import OrderManagement from './pages/OrderManagement';
import WorkOrder from './pages/WorkOrder';

const menuData = [
  {
    title: '기초자료관리',
    icon: <Database size={20} />,
    items: [
      { path: '/basic/clinic-price', name: '보건소단가설정' },
      { path: '/basic/clinic', name: '보건소 관리' },
      { path: '/basic/users', name: '사용자 관리' },
      { path: '/basic/items', name: '품목 관리' },
      { path: '/basic/partners', name: '거래처 관리' },
    ]
  },
  {
    title: '발주관리',
    icon: <ShoppingCart size={20} />,
    items: [
      { path: '/order/matching', name: '품목매칭' },
      { path: '/order/register', name: '발주등록' },
      { path: '/order/request', name: '구매요청' },
      { path: '/order/incoming', name: '입고확인' },
      { path: '/order/ai-summary', name: 'AI집계(참고)' },
    ]
  },
  {
    title: '작업관리',
    icon: <Wrench size={20} />,
    items: [
      { path: '/task/schedule', name: '작업일정' },
      { path: '/task/subdivide', name: '소분지시서' },
      { path: '/task/package', name: '패키지지시서' },
      { path: '/task/classify', name: '분류데이터' },
    ]
  },
  {
    title: '배송관리',
    icon: <Truck size={20} />,
    items: [
      { path: '/logistics/schedule', name: '배송일정' },
      { path: '/logistics/blocks', name: '배송블럭/순번' },
      { path: '/logistics/loading', name: '상차지시서' },
      { path: '/logistics/tracking', name: '실시간 배송상태' },
      { path: '/logistics/receipt', name: '수령확인증' },
    ]
  },
  {
    title: '정산/청구관리',
    icon: <Receipt size={20} />,
    items: [
      { path: '/billing/clinic', name: '보건소청구작업' },
      { path: '/billing/partner', name: '거래처결제내역' },
    ]
  },
  {
    title: '시스템관리',
    icon: <Settings size={20} />,
    items: [
      { path: '/system/check', name: 'DB연동/시스템점검' },
    ]
  }
];

const SidebarItem = ({ section, location, toggleSidebar }) => {
  // Check if any sub-item is active
  const isActiveGroup = section.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
  const [isOpen, setIsOpen] = useState(isActiveGroup);

  return (
    <div className="mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActiveGroup ? 'bg-blue-50/80 text-blue-700' : 'text-gray-700 hover:bg-gray-100/80'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`${isActiveGroup ? 'text-blue-600' : 'text-gray-400'}`}>
            {section.icon}
          </div>
          {section.title}
        </div>
        {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
          {section.items.map((item) => {
            const isItemActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isItemActive 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => window.innerWidth < 768 && toggleSidebar()}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload(); 
    } catch(e) { console.error(e); }
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-2xl border-r border-gray-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}> 
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100/50">
        <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">TMS UNIFIED</span>
        <button onClick={toggleSidebar} className="md:hidden p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100/50 transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 mb-4 rounded-xl text-sm font-bold transition-all duration-200 ${location.pathname === '/' ? 'bg-blue-50/80 text-blue-700 shadow-sm ring-1 ring-blue-100/50' : 'text-gray-700 hover:bg-gray-50/80 hover:text-gray-900'}`} onClick={() => window.innerWidth < 768 && toggleSidebar()}>
          <div className={`${location.pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}>
            <LayoutDashboard size={20} />
          </div>
          대시보드 홈
        </Link>
        
        {menuData.map((section, idx) => (
          <SidebarItem key={idx} section={section} location={location} toggleSidebar={toggleSidebar} />
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-100/50">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              AD
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-sm font-bold text-gray-900 truncate w-24">Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="로그아웃">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Topbar = ({ toggleSidebar }) => (
  <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-sm">
    <div className="flex items-center gap-3">
      <button onClick={toggleSidebar} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100/80 rounded-xl transition-colors">
        <Menu size={20} />
      </button>
      <h2 className="text-lg font-bold text-gray-800 tracking-tight hidden sm:block">Dashboard</h2>
    </div>
    
    <div className="flex items-center gap-2 sm:gap-4">
      <button className="relative p-2 text-gray-500 hover:bg-gray-100/80 rounded-xl transition-colors">
        <Bell size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
      </button>
      <button className="p-2 text-gray-500 hover:bg-gray-100/80 rounded-xl transition-colors sm:hidden">
        <User size={20} />
      </button>
    </div>
  </header>
);

const DashboardHome = () => {
  const [weather, setWeather] = useState({ temp: '22', status: '맑음', type: 'sunny', message: '배송 및 상차 작업에 특이사항이 없습니다.' });
  
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const key = import.meta.env.VITE_WEATHER_API_KEY;
        // 기상청_단기예보 조회서비스 API 호출 뼈대 (https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0)
        // 실제 운영 환경에서는 CORS 우회를 위해 프록시나 백엔드를 거칩니다.
        // const res = await fetch(`/api/weather/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=10&dataType=JSON&base_date=20260515&base_time=0500&nx=55&ny=127`);
        // const data = await res.json();
      } catch(e) {
        console.error('Weather API Error:', e);
      }
    };
    fetchWeather();
  }, []);

  return (
    <div className="space-y-6">
      {/* 날씨/물류 작업 경고 관제 위젯 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-blue-50">
            {weather.type === 'sunny' ? <Sun size={28} className="text-amber-500" /> : <CloudRain size={28} className="text-blue-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-blue-900 font-bold text-lg">물류 기상 관제탑</h3>
              <span className="text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded-md tracking-wide">정상 가동</span>
            </div>
            <p className="text-blue-700/80 text-sm font-medium">현재 기상: <strong className="text-blue-800">{weather.status} ({weather.temp}°C)</strong> — {weather.message}</p>
          </div>
        </div>
        <button className="text-sm font-bold text-blue-600 bg-white/80 px-4 py-2.5 rounded-xl shadow-sm border border-blue-100 hover:bg-white hover:shadow transition-all w-full sm:w-auto">
          기상청 단기예보 상세
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '오늘의 지시서', value: '12건', color: 'from-blue-500 to-blue-600' },
          { title: '배송 중', value: '5대', color: 'from-indigo-500 to-indigo-600' },
          { title: '미수금', value: '₩13,500,000', color: 'from-rose-500 to-rose-600' },
          { title: '완료된 작업', value: '89건', color: 'from-emerald-500 to-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg shadow-gray-200/50 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
            <h3 className="text-white/80 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-3xl font-black tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 min-h-[300px] flex items-center justify-center flex-col gap-4">
        <Database size={48} className="text-gray-200" />
        <p className="text-gray-400 font-medium text-lg">좌측 통합 메뉴에서 원하시는 작업을 선택해 주세요.</p>
      </div>
    </div>
  );
};

const PlaceholderModule = ({ title, desc }) => <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 min-h-[600px]"><h2 className="text-2xl font-bold mb-4">{title}</h2><p className="text-gray-500">{desc}</p></div>;

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Demo bypass logic
    const isMockLoggedIn = true; 
    setUser(isMockLoggedIn ? { email: 'admin@tms.com' } : null);
    setAuthLoading(false);
  }, []);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-50">로딩 중...</div>;
  if (!user) return <Login />;

  return (
    <Router>
      <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden selection:bg-blue-200">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        {isSidebarOpen && <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <Topbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<DashboardHome />} />
                {/* Basic Master Data Route Map */}
                <Route path="/basic/*" element={<MasterData />} />
                
                {/* Order Management Route Map */}
                <Route path="/order/*" element={<OrderManagement />} />
                
                {/* Work Order (Task) Route Map */}
                <Route path="/task/*" element={<WorkOrder />} />
                
                {/* Logistics Route Map */}
                <Route path="/logistics/*" element={<LogisticsModule />} />
                {/* Billing Route Map */}
                <Route path="/billing/*" element={<BillingModule />} />
                
                {/* System Admin Route */}
                <Route path="/system/check" element={<SystemAdmin />} />
                
                {/* Fallback mapping for newly created menu items */}
                {menuData.map(group => group.items.map(item => (
                   item.path.startsWith('/logistics') || item.path.startsWith('/billing') || item.path.startsWith('/basic') || item.path.startsWith('/order') || item.path.startsWith('/task') || item.path === '/system/check'
                     ? null 
                     : <Route key={item.path} path={item.path} element={<PlaceholderModule title={item.name} desc="기능 준비 중입니다." />} />
                )))}
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}
