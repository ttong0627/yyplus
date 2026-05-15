export default function ConfirmModal({ msg, onOk, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <p className="text-slate-100 text-sm font-bold mb-6 leading-relaxed whitespace-pre-wrap">{msg}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">취소</button>
          <button onClick={onOk} className="btn-primary">확인</button>
        </div>
      </div>
    </div>
  );
}
