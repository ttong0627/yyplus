export default function Toast({ msg, type = 'info' }) {
  const colors = {
    info:    'bg-indigo-600 border-indigo-500',
    success: 'bg-emerald-600 border-emerald-500',
    error:   'bg-rose-600 border-rose-500',
    warn:    'bg-amber-600 border-amber-500',
  };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl border text-white font-bold text-sm shadow-2xl animate-bounce-in ${colors[type] || colors.info}`}>
      {msg}
    </div>
  );
}
