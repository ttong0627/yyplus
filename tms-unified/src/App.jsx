import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Search, Bell, Settings, LogOut, LayoutDashboard, Database, 
  Users, MapPin, Box, ShoppingCart, Truck, Calendar, FileText, ChevronDown, CheckCircle2, Factory, Wrench, Activity
} from 'lucide-react';
import { collection, onSnapshot, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from './firebase';

import Login from './pages/Login';
import LogisticsModule from './pages/Logistics';
import BillingModule from './pages/Billing';
import SystemAdmin from './pages/SystemAdmin';
import MasterData from './pages/MasterData';
import { OrderRegister, OrderSummary } from './pages/OrderManagement';
import WorkOrder from './pages/WorkOrder';

const menuData = [
  {
    title: "대시보드",
    items: [
      { name: "대시보드 홈", path: "/", icon: <LayoutDashboard size={20} /> },
    ]
  },
  {
    title: "기초데이터",
    items: [
      { name: "사용자 관리", path: "/basic/users", icon: <Users size={20} /> },
      { name: "품목 관리", path: "/basic/items", icon: <Box size={20} /> },
      { name: "거래처 관리", path: "/basic/partners", icon: <Database size={20} /> },
      { name: "보건소 관리", path: "/basic/clinic", icon: <MapPin size={20} /> },
    ]
  },
  {
    title: "발주 관리",
    items: [
      { name: "스마트 발주입력", path: "/order/register", icon: <ShoppingCart size={20} /> },
      { name: "AI 발주집계", path: "/order/ai-summary", icon: <Factory size={20} /> },
    ]
  },
  {
    title: "작업 및 배송",
    items: [
      { name: "작업 일정/달력", path: "/task/schedule", icon: <Calendar size={20} /> },
      { name: "소분작업지시서", path: "/task/subdivide", icon: <LayoutDashboard size={20} /> },
      { name: "실시간 배송관제", path: "/logistics/tracking", icon: <MapPin size={20} /> },
      { name: "상차지시서", path: "/logistics/loading", icon: <Box size={20} /> },
      { name: "모바일 수령증", path: "/logistics/receipt", icon: <CheckCircle2 size={20} /> },
    ]
  },
  {
    title: "시스템",
    items: [
      { name: "대금정산", path: "/billing", icon: <FileText size={20} /> },
      { name: "마이그레이션 도구", path: "/system/check", icon: <CheckCircle2 size={20} /> },
    ]
  }
];

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({ '대시보드': true, '기초데이터': true, '발주 관리': true, '작업 및 배송': true });
  const [isLoggedIn, setIsLoggedIn] = useState(true); 
  const location = useLocation();

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({...prev, [title]: !prev[title]}));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#f8f9fc] font-['Pretendard','Inter',sans-serif]">
      {/* Sidebar - Premium Dark Purple/Black Theme like Legacy */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#1a1325] text-gray-300 transition-transform duration-300 ease-in-out transform shadow-[5px_0_25px_rgba(0,0,0,0.15)] flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5">
          <div className="flex flex-col items-center justify-center w-full mb-4 mt-2">
            <div className="w-16 h-16 bg-gradient-to-br from-[#d53f8c] to-[#805ad5] rounded-[24px] rotate-12 flex items-center justify-center shadow-lg mb-3">
               <div className="w-8 h-8 bg-white rounded-full -rotate-12 opacity-90 flex items-center justify-center text-center"></div>
            </div>
            <span className="text-xl font-black text-white tracking-wider">웰쉐어 영양플러스</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-6 right-6 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b border-white/5">
          <div className="bg-[#2d243a] rounded-[14px] p-3 flex justify-between items-center text-sm">
             <span className="font-bold text-[#b794f4]">데이터 백업/복원</span>
             <div className="flex gap-2">
                <button className="px-2 py-1 bg-[#44337a] text-xs font-black text-white rounded hover:bg-[#553c9a] transition-colors">Export</button>
                <button className="px-2 py-1 bg-[#44337a] text-xs font-black text-white rounded hover:bg-[#553c9a] transition-colors">Import</button>
             </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1">
          {menuData.map((group, idx) => (
            <div key={idx} className="mb-2">
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-4 py-3 text-[15px] font-black text-[#805ad5] hover:text-[#d53f8c] transition-colors rounded-xl"
              >
                <span>{group.title}</span>
                <ChevronDown size={18} className={`transition-transform duration-300 ${expandedGroups[group.title] ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedGroups[group.title] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item, iIdx) => {
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={iIdx}
                      to={item.path}
                      className={`flex items-center gap-4 px-5 py-3.5 my-1 mx-2 rounded-[16px] text-[15px] font-bold transition-all duration-200 group ${
                        isActive 
                          ? 'bg-gradient-to-r from-[#b83280] to-[#805ad5] text-white shadow-[0_4px_15px_rgba(213,63,140,0.3)]' 
                          : 'text-[#a0aec0] hover:bg-[#2d243a] hover:text-white'
                      }`}
                    >
                      <span className={`${isActive ? 'text-white' : 'text-[#718096] group-hover:text-[#b794f4]'} transition-colors`}>
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-5 border-t border-white/5 bg-[#140e1d]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#805ad5] to-[#553c9a] flex items-center justify-center text-white font-black text-lg shadow-lg">A</div>
            <div className="flex-1">
              <p className="text-[15px] font-black text-white">최고관리자</p>
              <p className="text-xs font-bold text-[#718096]">admin@wellshare.kr</p>
            </div>
            <button onClick={handleLogout} className="text-[#718096] hover:text-[#d53f8c] transition-colors p-2 bg-[#2d243a] rounded-lg">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8f9fc]">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-[#edf2f7] h-24 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-[#805ad5] bg-gray-50 rounded-xl border border-gray-200">
              <Menu size={24} />
            </button>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d53f8c] to-[#805ad5] hidden sm:block tracking-tight">
              TMS UNIFIED PLATFORM
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0aec0]" size={20} />
              <input 
                type="text" 
                placeholder="통합 검색 (보건소, 품목, 발주번호)" 
                className="w-full pl-12 pr-4 py-3.5 bg-[#edf2f7] border border-transparent hover:border-[#e2e8f0] rounded-[16px] text-[15px] font-bold focus:ring-2 focus:ring-[#b794f4] focus:bg-white transition-all outline-none"
              />
            </div>
            <button className="relative p-3.5 text-[#a0aec0] hover:text-[#805ad5] hover:bg-[#faf5ff] rounded-[14px] transition-all">
              <Bell size={24} />
              <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-[#e53e3e] rounded-full ring-2 ring-white"></span>
            </button>
            <button className="p-3.5 text-[#a0aec0] hover:text-[#805ad5] hover:bg-[#faf5ff] rounded-[14px] transition-all border border-[#edf2f7]">
              <Settings size={24} />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-auto bg-[#f8f9fc] p-6 lg:p-10 relative">
          <div className="h-full max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              
              {/* 🌟 1-Click Flattened Routes for Order Management */}
              <Route path="/order/register" element={<OrderRegister />} />
              <Route path="/order/ai-summary" element={<OrderSummary />} />
              
              <Route path="/basic/*" element={<MasterData />} />
              <Route path="/task/*" element={<WorkOrder />} />
              <Route path="/logistics/*" element={<LogisticsModule />} />
              <Route path="/billing/*" element={<BillingModule />} />
              <Route path="/system/check" element={<SystemAdmin />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

// DB-connected Real Dashboard
function DashboardHome() {
  const [stats, setStats] = useState({ orders: 0, items: 0, clinics: 0, invoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // 🚀 DB 전체 긁어오기(통조회) 방지 -> 서버단에서 개수(Count)만 집계 & 필요한 날짜만 쿼리(Where)
        const [oSnap, iSnap, cSnap, invSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'clientOrders'), where('date', '==', today))),
          getCountFromServer(collection(db, 'items')),
          getCountFromServer(collection(db, 'clients')),
          getCountFromServer(collection(db, 'invoices'))
        ]);
        
        setStats({
          orders: oSnap.data().count,
          items: iSnap.data().count,
          clinics: cSnap.data().count,
          invoices: invSnap.data().count
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[#edf2f7] h-full p-8 lg:p-16 animate-fade-in flex flex-col relative overflow-hidden">
       {/* Ambient Light */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#d53f8c]/5 to-[#805ad5]/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#3182ce]/5 to-[#38a169]/5 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none"></div>
       
       <div className="flex items-center gap-6 mb-12 relative z-10 border-b border-slate-100 pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#d53f8c] to-[#805ad5] rounded-[24px] rotate-12 flex items-center justify-center shadow-[0_10px_30px_rgba(128,90,213,0.3)]">
             <Activity className="text-white w-10 h-10 -rotate-12" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[#2d3748] tracking-tight">시스템 실시간 현황</h1>
            <p className="text-lg font-bold text-[#718096] mt-2">
              최적화된 DB 쿼리 적용 완료 (서버단 Count 집계 및 Where 필터링 적용)
            </p>
          </div>
       </div>

       {loading ? (
         <div className="flex-1 flex justify-center items-center text-slate-400 font-bold text-xl">데이터베이스 동기화 중...</div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start">
               <span className="text-sm font-black text-slate-500">당일 발주 등록 건수</span>
               <ShoppingCart className="text-indigo-500" size={24}/>
             </div>
             <p className="text-5xl font-black text-slate-800 mt-4">{stats.orders}</p>
           </div>

           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start">
               <span className="text-sm font-black text-slate-500">관리 품목 수</span>
               <Box className="text-pink-500" size={24}/>
             </div>
             <p className="text-5xl font-black text-slate-800 mt-4">{stats.items}</p>
           </div>

           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start">
               <span className="text-sm font-black text-slate-500">관리 보건소(거래처)</span>
               <MapPin className="text-blue-500" size={24}/>
             </div>
             <p className="text-5xl font-black text-slate-800 mt-4">{stats.clinics}</p>
           </div>

           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start">
               <span className="text-sm font-black text-slate-500">누적 발급 계산서</span>
               <Receipt className="text-emerald-500" size={24}/>
             </div>
             <p className="text-5xl font-black text-slate-800 mt-4">{stats.invoices}</p>
           </div>
         </div>
       )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

