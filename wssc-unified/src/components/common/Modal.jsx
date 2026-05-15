import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxW = 'max-w-lg' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(3,5,15,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* panel */}
      <div
        className={`relative w-full ${maxW} rounded-2xl overflow-hidden`}
        style={{
          background: 'linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(20,28,55,0.98) 100%)',
          border: '1px solid rgba(51,65,85,0.55)',
          borderTop: '1px solid rgba(99,102,241,0.35)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.70), 0 0 0 1px rgba(99,102,241,0.08), 0 0 80px rgba(99,102,241,0.06)',
        }}
      >
        {/* header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(30,41,70,0.8)' }}
          >
            <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all duration-150"
              style={{ background: 'rgba(30,40,70,0.6)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
