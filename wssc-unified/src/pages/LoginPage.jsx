import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Utils } from '../utils';

export default function LoginPage() {
  const { st, updateSt, login, showToast, dbReady } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    id: localStorage.getItem('wssc_u_savedId') || '',
    pwd: '',
    saveId: localStorage.getItem('wssc_u_saveId') === 'true',
    keepLog: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dbReady) { showToast('DB 연결 대기 중입니다.', 'warn'); return; }
    setLoading(true);
    try {
      const users = st.users || [];
      const hashedPwd = await Utils.hashPw(form.pwd);

      // 해시 비교 먼저, 실패 시 평문 비교(기존 계정 자동 마이그레이션)
      let user = users.find(u => u.id === form.id && u.hashed && u.password === hashedPwd);
      let needsMigrate = false;
      if (!user) {
        user = users.find(u => u.id === form.id && !u.hashed && u.password === form.pwd);
        if (user) needsMigrate = true;
      }

      if (user) {
        if (needsMigrate) {
          const updated = users.map(u => u.id === user.id ? { ...u, password: hashedPwd, hashed: true } : u);
          updateSt('users', updated);
          user = { ...user, password: hashedPwd, hashed: true };
        }
        if (form.saveId) {
          localStorage.setItem('wssc_u_savedId', form.id);
          localStorage.setItem('wssc_u_saveId', 'true');
        } else {
          localStorage.removeItem('wssc_u_savedId');
          localStorage.setItem('wssc_u_saveId', 'false');
        }
        login(user, form.keepLog);
        navigate(user.role === 'driver' ? '/delivery/driver' : '/dashboard');
      } else {
        showToast('아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(99,102,241,0.18) 0%, #06091a 55%)',
      }}
    >
      {/* 플로팅 오브 */}
      <div className="absolute pointer-events-none" style={{
        top: '15%', left: '10%', width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse 4s ease-in-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '20%', right: '8%', width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse 5s ease-in-out infinite', animationDelay: '1.5s',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '60%', left: '25%', width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)',
        filter: 'blur(30px)', animation: 'pulse 6s ease-in-out infinite', animationDelay: '3s',
      }} />

      <div className="w-full max-w-sm relative z-10">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div
            className="w-18 h-18 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl"
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 8px 40px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
          >
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">웰쉐어 통합 시스템</h1>
          <p className="text-sm mt-1.5 font-bold" style={{ color: '#6272a4' }}>
            영양플러스 ERP · 패키지 · 배송
          </p>
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-7 space-y-4"
          style={{
            background: 'rgba(10,15,35,0.88)',
            border: '1px solid rgba(51,65,85,0.45)',
            borderTop: '1px solid rgba(99,102,241,0.32)',
            boxShadow: '0 0 60px rgba(99,102,241,0.12), 0 30px 60px rgba(0,0,0,0.65)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wider uppercase">아이디</label>
            <input
              type="text"
              value={form.id}
              onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
              className="input-base"
              placeholder="아이디 입력"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 tracking-wider uppercase">비밀번호</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.pwd}
                onChange={e => setForm(p => ({ ...p, pwd: e.target.value }))}
                className="input-base pr-12"
                placeholder="비밀번호 입력"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors"
              >
                {showPwd ? '숨김' : '표시'}
              </button>
            </div>
          </div>

          <div className="flex gap-5">
            {[
              { k: 'saveId', label: '아이디 저장' },
              { k: 'keepLog', label: '로그인 유지' },
            ].map(({ k, label }) => (
              <label key={k} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input type="checkbox" checked={form[k]}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-indigo-500" />
                {label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-base font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* DB 상태 */}
        <p className="text-center text-xs mt-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold"
            style={{
              background: dbReady ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              color: dbReady ? '#6ee7b7' : '#fcd34d',
              border: `1px solid ${dbReady ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${!dbReady ? 'animate-pulse' : ''}`}
              style={{ background: dbReady ? '#10b981' : '#f59e0b' }}
            />
            {dbReady ? 'DB 연결됨' : 'DB 연결 중...'}
          </span>
        </p>
        {!dbReady && (
          <p className="text-center text-xs text-slate-600 mt-2">
            처음 접속 시 데이터가 로드될 때까지 잠시 기다려주세요.
          </p>
        )}
      </div>
    </div>
  );
}
