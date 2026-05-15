import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../context/AppContext';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { dbReady } = useApp();

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold text-sm">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setCollapsed(p => !p)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
