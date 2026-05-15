import React, { useState } from 'react';
import { Ic } from './icons.jsx';
import { Utils } from '../utils/helpers.js';
import { windowErrors } from '../engine/firebase.js';

export class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  componentDidCatch(e,info){windowErrors.push(`[React] ${e.message} ${info.componentStack}`);}
  render(){if(this.state.hasError)return<div className="flex h-screen items-center justify-center flex-col bg-red-50 p-8"><h2 className="text-2xl font-black text-red-600 mb-4 flex items-center gap-2"><Ic.Alert size={28}/> 렌더링 오류 발생</h2><p className="text-sm font-bold text-red-500 mb-6 bg-white p-4 rounded-xl border border-red-200">{this.state.error?.message}</p><button onClick={()=>window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black shadow-md hover:bg-red-700 transition-colors">시스템 새로고침</button></div>; return this.props.children;}
}

export const GConfirm = ({is, msg, onC, onX}) => {
  if(!is)return null;
  return (
    <div className="absolute inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in notranslate" translate="no">
      <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.2)] animate-scale-up border border-slate-200"><div className="flex justify-center mb-6"><div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner"><Ic.Alert size={32}/></div></div><p className="text-center text-lg font-black text-slate-800 mb-8 whitespace-pre-wrap leading-relaxed">{msg}</p><div className="flex gap-3"><button onClick={onX} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-colors text-sm">취소</button><button onClick={onC} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 shadow-md transition-transform hover:-translate-y-0.5 text-sm">확인 (실행)</button></div></div>
    </div>
  );
};

export const TInp = ({ v, setV, ph='', type='text', cls='' }) => (
    <input type={type} value={v||''} onChange={e=>setV(e.target.value)} onKeyDown={Utils.enter} placeholder={ph} className={`px-4 py-2 border rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-bold ${cls}`} />
);

export const NumInp = ({ v, setV, cls='' }) => {
    const handleFocus = e => e.target.select();
    const handleChange = e => { const val = e.target.value.replace(/[^\d]/g, ''); setV(val === '' ? '' : parseInt(val, 10)); };
    return <input type="text" inputMode="numeric" value={v===''?'':v} onChange={handleChange} onFocus={handleFocus} onKeyDown={Utils.enter} className={`px-2 py-1 border rounded text-right text-[11px] outline-none focus:border-blue-500 font-bold ${cls}`} />;
};

export const ItemSearchInput = ({ items, onSelect }) => {
    const [q, setQ] = useState(''), [s, setS] = useState(false);
    const fd = q ? items.filter(it => it.name.includes(q)) : items;
    return (
        <div className="relative">
            <div className="relative"><input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setS(true)} onBlur={()=>setTimeout(()=>setS(false), 200)} placeholder="품명 검색..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" /><Ic.Search size={16} className="absolute left-4 top-2.5 text-slate-400" /></div>
            {s && fd.length > 0 && (<div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-1"><ul className="text-xs">
                {fd.map(it => (<li key={it.id} onMouseDown={(e)=>{e.preventDefault();onSelect(it);setQ('');setS(false);}} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"><div className="font-black text-slate-800">{it.name}</div><div className="text-[10px] text-slate-400 mt-0.5">{it.category} | {it.unit}</div></li>))}
            </ul></div>)}
        </div>
    );
};
