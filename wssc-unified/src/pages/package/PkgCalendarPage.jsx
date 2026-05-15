import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

export default function PkgCalendarPage() {
  const { st, updateSt, showToast, globalMonth } = useApp();
  const navigate = useNavigate();

  const [calMonth, setCalMonth] = useState(() => globalMonth || Utils.currentMonth());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ deliveryDate: '', workDate: '' });

  const today = Utils.today();
  const [yr, mo] = calMonth.split('-').map(Number);
  const calDate = new Date(yr, mo - 1, 1);

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
    if (!deliveryDateStr) return null;
    const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
    if (override) return override.workDate;
    return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

  const scheduleData = useMemo(() => {
    const works = {};
    (st.clientOrders || []).forEach(o => {
      if (o?.deliveryDate1) {
        const wd = getMappedWorkDate(o.deliveryDate1);
        if (wd) {
          if (!works[wd]) works[wd] = [];
          works[wd].push({ deliveryDate: o.deliveryDate1, clientId: o.clientId, round: 1 });
        }
      }
      if (o?.deliveryDate2) {
        const wd = getMappedWorkDate(o.deliveryDate2);
        if (wd) {
          if (!works[wd]) works[wd] = [];
          works[wd].push({ deliveryDate: o.deliveryDate2, clientId: o.clientId, round: 2 });
        }
      }
    });
    return works;
  }, [st.clientOrders, getMappedWorkDate]);

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const firstDay = new Date(yr, mo - 1, 1).getDay();
  const calArr = Array(firstDay).fill(null).concat([...Array(daysInMonth).keys()].map(i => i + 1));
  const rem = calArr.length % 7;
  const fullArr = rem > 0 ? calArr.concat(Array(7 - rem).fill(null)) : calArr;

  const prevMonth = () => {
    const d = new Date(yr, mo - 2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(yr, mo, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const saveScheduleOverride = () => {
    if (!scheduleForm.deliveryDate || !scheduleForm.workDate) return showToast('날짜를 모두 입력해주세요.', 'warn');
    const list = [...(st.workSchedules || [])];
    const idx = list.findIndex(ws => ws.deliveryDate === scheduleForm.deliveryDate);
    if (idx >= 0) list[idx] = { ...list[idx], workDate: scheduleForm.workDate };
    else list.push({ id: Utils.genId(), deliveryDate: scheduleForm.deliveryDate, workDate: scheduleForm.workDate });
    updateSt('workSchedules', list);
    showToast('예외 작업일이 저장되었습니다.', 'success');
    setShowScheduleModal(false);
    setScheduleForm({ deliveryDate: '', workDate: '' });
  };

  const deleteScheduleOverride = (id) => {
    updateSt('workSchedules', (st.workSchedules || []).filter(ws => ws.id !== id));
    showToast('삭제되었습니다.', 'success');
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-white">포장 작업 일정표</h1>
        <button onClick={() => setShowScheduleModal(true)} className="btn-secondary text-sm flex items-center gap-1.5">
          {Ic.Edit} 예외 작업일 수동 설정
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300">
              {Ic.ChevL}
            </button>
            <span className="text-2xl font-black text-white">{yr}년 {mo}월</span>
            <button onClick={nextMonth} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300">
              {Ic.ChevR}
            </button>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>1차 배송</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>2차 배송</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['일','월','화','수','목','금','토'].map((d, i) => (
            <div key={d} className={`text-center py-2 font-black text-xs rounded-lg ${i===0?'text-rose-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {fullArr.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} className="h-28" />;
            const dStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = dStr === today;
            const worksHere = scheduleData[dStr] || [];

            return (
              <div key={dStr}
                className={`h-28 p-2 rounded-xl border flex flex-col cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-slate-700/30
                  ${isToday ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800/50 border-slate-700'}`}
                onClick={() => navigate(`/package/picking?date=${dStr}`)}>
                <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full mb-1
                  ${isToday ? 'bg-blue-600 text-white' : i%7===0?'text-rose-400':i%7===6?'text-blue-400':'text-slate-300'}`}>
                  {d}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {worksHere.slice(0, 4).map((wrk, x) => {
                    const clientName = (st.clients||[]).find(c=>c?.id===wrk?.clientId)?.shortName || '?';
                    return (
                      <div key={x} className={`text-[9px] font-black px-1 py-0.5 rounded truncate
                        ${wrk.round===1 ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                        {wrk.round===1?'🔵':'🟢'} {clientName}
                      </div>
                    );
                  })}
                  {worksHere.length > 4 && <div className="text-[9px] text-slate-500 font-bold pl-1">+{worksHere.length-4}개</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 예외 작업일 목록 */}
      {(st.workSchedules||[]).length > 0 && (
        <div className="card">
          <h2 className="section-title">예외 작업일 설정 목록</h2>
          <div className="space-y-2">
            {(st.workSchedules||[]).map(ws => (
              <div key={ws.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2">
                <div className="text-sm">
                  <span className="text-slate-400">배송일:</span> <span className="font-black text-white">{ws.deliveryDate}</span>
                  <span className="text-slate-500 mx-2">→</span>
                  <span className="text-slate-400">작업일:</span> <span className="font-black text-amber-400">{ws.workDate}</span>
                </div>
                <button onClick={() => deleteScheduleOverride(ws.id)} className="text-rose-400 hover:text-rose-300 p-1">{Ic.Trash}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 예외 작업일 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">예외 작업일 수동 설정</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">배송 예정일</label>
                <input type="date" value={scheduleForm.deliveryDate} onChange={e=>setScheduleForm({...scheduleForm, deliveryDate:e.target.value})} className="input-base w-full" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1.5">실제 작업일 (포장 기준)</label>
                <input type="date" value={scheduleForm.workDate} onChange={e=>setScheduleForm({...scheduleForm, workDate:e.target.value})} className="input-base w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveScheduleOverride} className="btn-primary flex-1">저장</button>
              <button onClick={()=>setShowScheduleModal(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
