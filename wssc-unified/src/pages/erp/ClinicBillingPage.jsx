import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';
import Modal from '../../components/common/Modal';

const STATUS_OPTS = ['입금대기', '완료', '연체'];
const STATUS_STYLE = {
  '완료':    { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' },
  '연체':    { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  '입금대기': { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' },
};

export default function ClinicBillingPage() {
  const { st, updateSt, globalMonth, showToast, showConfirm } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filterStatus, setFilterStatus] = useState('전체');

  const clients = st.clients || [];
  const invoices = useMemo(() => (st.payments || []).filter(p => (p.date || '').startsWith(globalMonth)), [st.payments, globalMonth]);

  const clientOrders = useMemo(() => (st.clientOrders || []).filter(o => (o.month || o.date || '').startsWith(globalMonth)), [st.clientOrders, globalMonth]);
  const items = st.items || [];
  const priceMappings = st.priceMappings || [];
  const mappings = st.mappings || [];

  // 보건소별 발주 금액 자동 계산
  const calcAmount = (clientId) => {
    const order = clientOrders.find(o => o.clientId === clientId);
    if (!order) return 0;
    const pm = priceMappings.find(p => p.clientId === clientId && p.month === globalMonth);
    const mapping = mappings.find(m => m.clientId === clientId && m.month === globalMonth);
    return (order.items || []).reduce((sum, oi) => {
      const master = items.find(i => i.id === oi.itemId);
      const price = pm?.prices?.[oi.itemId] || master?.unitPrice || 0;
      const qty = (Number(oi.qty1) || 0) + (Number(oi.qty2) || 0);
      return sum + qty * price;
    }, 0);
  };

  const filtered = filterStatus === '전체' ? invoices : invoices.filter(i => i.status === filterStatus);

  const summary = useMemo(() => ({
    total:    invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    done:     invoices.filter(i => i.status === '완료').reduce((s, i) => s + (Number(i.amount) || 0), 0),
    pending:  invoices.filter(i => i.status === '입금대기').length,
    overdue:  invoices.filter(i => i.status === '연체').length,
  }), [invoices]);

  const openAdd = () => {
    const now = new Date();
    const dueDate = `${globalMonth}-25`;
    setForm({
      id: `INV-${globalMonth.replace('-','')}-${String((st.payments||[]).length + 1).padStart(3,'0')}`,
      clientId: '', clientName: '',
      amount: '', date: `${globalMonth}-01`,
      dueDate, status: '입금대기', note: '',
    });
    setModal('add');
  };

  const openEdit = (inv) => { setForm({ ...inv }); setModal('edit'); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const auto = calcAmount(clientId);
    setForm(p => ({ ...p, clientId, clientName: client?.name || '', amount: auto || p.amount }));
  };

  const save = () => {
    if (!form.clientId || !form.amount) return showToast('보건소와 청구금액을 입력하세요.', 'error');
    const list = st.payments || [];
    if (modal === 'add') {
      updateSt('payments', [...list, { ...form, amount: Number(form.amount), createdAt: new Date().toISOString() }]);
      showToast('청구서가 등록됐습니다.', 'success');
    } else {
      updateSt('payments', list.map(i => i.id === form.id ? { ...form, amount: Number(form.amount) } : i));
      showToast('청구서가 수정됐습니다.', 'success');
    }
    setModal(null);
  };

  const del = (inv) => showConfirm(`[${inv.clientName}] 청구서를 삭제하시겠습니까?`, () => {
    updateSt('payments', (st.payments || []).filter(i => i.id !== inv.id));
    showToast('삭제됐습니다.', 'success');
  });

  const changeStatus = (inv, status) => {
    updateSt('payments', (st.payments || []).map(i => i.id === inv.id ? { ...i, status } : i));
    showToast(`${status}로 변경됐습니다.`, 'success');
  };

  const generateMonthlyInvoices = () => {
    showConfirm(`${globalMonth}월 청구서를 발주 데이터 기반으로 일괄 생성하시겠습니까?`, () => {
      const orders = (st.clientOrders || []).filter(o => (o.month || (o.date||'').slice(0,7)) === globalMonth);
      if (orders.length === 0) return showToast('해당 월에 발주 내역이 없습니다.', 'warn');
      const list = st.payments || [];
      const clientTotals = {};
      orders.forEach(o => {
        const pm = (st.priceMappings || []).find(p => p.clientId === o.clientId && p.month === globalMonth);
        const total = (o.items || []).reduce((s, oi) => {
          const master = items.find(i => i.id === oi.itemId);
          const price = pm?.prices?.[oi.itemId] || master?.unitPrice || 0;
          const qty = (Number(oi.qty1) || 0) + (Number(oi.qty2) || 0);
          return s + qty * price;
        }, 0);
        clientTotals[o.clientId] = (clientTotals[o.clientId] || 0) + total;
      });
      const newEntries = Object.entries(clientTotals)
        .filter(([, amt]) => amt > 0)
        .filter(([cId]) => !list.find(x => x.clientId === cId && (x.date||'').startsWith(globalMonth)))
        .map(([cId, amt]) => {
          const client = clients.find(c => c.id === cId);
          return {
            id: `INV-${globalMonth.replace('-','')}-${Utils.genId().slice(-4)}`,
            clientId: cId, clientName: client?.name || cId,
            amount: amt, date: `${globalMonth}-01`,
            dueDate: `${globalMonth}-25`, status: '입금대기',
            createdAt: new Date().toISOString(),
          };
        });
      if (newEntries.length === 0) return showToast('이미 모든 보건소 청구서가 등록되어 있습니다.', 'info');
      updateSt('payments', [...list, ...newEntries]);
      showToast(`${newEntries.length}건 청구서가 일괄 생성되었습니다.`, 'success');
    });
  };

  const handleExcelDownload = () => {
    if (filtered.length === 0) return showToast('다운로드할 데이터가 없습니다.', 'warn');
    let html = `<table><thead><tr><th>청구번호</th><th>보건소</th><th>공급가액</th><th>부가세</th><th>청구합계</th><th>납기일</th><th>상태</th></tr></thead><tbody>`;
    filtered.forEach(inv => {
      const vat = Math.floor((inv.amount || 0) * 0.1);
      const total = (inv.amount || 0) + vat;
      html += `<tr><td class="l">${inv.id}</td><td class="l">${inv.clientName}</td><td class="num">${(inv.amount||0).toLocaleString()}</td><td class="num">${vat.toLocaleString()}</td><td class="num p">${total.toLocaleString()}</td><td>${inv.dueDate||''}</td><td>${inv.status||'입금대기'}</td></tr>`;
    });
    html += '</tbody></table>';
    Utils.dlExcelCustom(html, `보건소청구_${globalMonth}`);
  };

  const printAll = () => {
    const rows = filtered.map(i => {
      const vat = Math.floor((i.amount||0)*0.1);
      return `<tr><td>${i.id}</td><td>${i.clientName}</td><td>${(i.amount||0).toLocaleString()}원</td><td>${vat.toLocaleString()}원</td><td>${((i.amount||0)+vat).toLocaleString()}원</td><td>${i.dueDate||''}</td><td>${i.status||'입금대기'}</td></tr>`;
    }).join('');
    Utils.printContent(`보건소 청구 목록 — ${globalMonth}`,
      `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px">
        <thead style="background:#f0f0f0"><tr><th>청구번호</th><th>보건소</th><th>공급가액</th><th>부가세</th><th>합계</th><th>납기일</th><th>상태</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    );
  };

  const card = (label, val, color) => (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <p className="text-xs font-bold mb-1" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{val}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 상단 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {card('총 청구액', `${summary.total.toLocaleString()}원`, '#a5b4fc')}
        {card('수금 완료', `${summary.done.toLocaleString()}원`, '#34d399')}
        {card('입금 대기', `${summary.pending}건`, '#fbbf24')}
        {card('연체', `${summary.overdue}건`, '#f87171')}
      </div>

      {/* 툴바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {['전체', ...STATUS_OPTS].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filterStatus === s
                ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
                : { background: 'rgba(15,23,42,0.6)', color: '#475569', border: '1px solid rgba(51,65,85,0.3)' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={handleExcelDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
          {Ic.Down} 엑셀
        </button>
        <button onClick={printAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(15,23,42,0.6)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.3)' }}>
          {Ic.Print2} 인쇄
        </button>
        <button onClick={generateMonthlyInvoices} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
          ⚡ 일괄발행
        </button>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }}>
          {Ic.Plus} 청구 등록
        </button>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto rounded-2xl" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.5)' }}>
              {['청구번호','보건소','공급가액','부가세(10%)','청구합계','납기일','상태',''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-black" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 font-bold" style={{ color: '#475569' }}>
                청구 내역이 없습니다. 청구 등록 버튼으로 추가하세요.
              </td></tr>
            ) : filtered.map(inv => {
              const vat = Math.floor((inv.amount || 0) * 0.1);
              const total = (inv.amount || 0) + vat;
              const st2 = STATUS_STYLE[inv.status] || STATUS_STYLE['입금대기'];
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)' }}
                  className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-bold" style={{ color: '#94a3b8' }}>{inv.invoiceNo || inv.id}</td>
                  <td className="px-4 py-3 font-black" style={{ color: '#e2e8f0' }}>{inv.clientName}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#94a3b8' }}>{(inv.amount || 0).toLocaleString()}원</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#64748b' }}>{vat.toLocaleString()}원</td>
                  <td className="px-4 py-3 font-black" style={{ color: '#a5b4fc' }}>{total.toLocaleString()}원</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#94a3b8' }}>{inv.dueDate || '-'}</td>
                  <td className="px-4 py-3">
                    <select value={inv.status || '입금대기'} onChange={e => changeStatus(inv, e.target.value)}
                      className="text-xs font-black px-2 py-1 rounded-lg border-0 outline-none cursor-pointer"
                      style={{ ...st2, background: st2.bg }}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(inv)} className="px-2 py-1 rounded-md text-xs font-bold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{Ic.Edit}</button>
                      <button onClick={() => del(inv)} className="px-2 py-1 rounded-md text-xs font-bold"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{Ic.Trash}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {modal && (
        <Modal title={modal === 'add' ? '청구 등록' : '청구 수정'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>보건소</label>
              <select value={form.clientId} onChange={e => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0' }}>
                <option value="">선택하세요</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>청구번호</label>
                <input value={form.id || ''} readOnly
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                  style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.3)', color: '#64748b' }} />
              </div>
              <div>
                <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>납기일</label>
                <input type="date" value={form.dueDate || ''} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                  style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>공급가액 (원)</label>
              <input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="발주 기반 자동 계산됩니다"
                className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0' }} />
              {form.amount && (
                <p className="text-xs mt-1 font-bold" style={{ color: '#64748b' }}>
                  부가세: {Math.floor(Number(form.amount)*0.1).toLocaleString()}원 / 합계: {(Number(form.amount)+Math.floor(Number(form.amount)*0.1)).toLocaleString()}원
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>상태</label>
              <select value={form.status || '입금대기'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0' }}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: '#94a3b8' }}>비고</label>
              <input value={form.note || ''} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none"
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0' }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-black"
                style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }}>
                저장
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl text-sm font-black"
                style={{ background: 'rgba(51,65,85,0.3)', color: '#64748b' }}>
                취소
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
