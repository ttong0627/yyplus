import React, { Component, useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const windowErrors = [];
window.firebasePermissionDenied = false;
window.addEventListener('error', e => windowErrors.push(`[JS] ${e.message}`));
window.addEventListener('unhandledrejection', e => windowErrors.push(`[Net] ${e.reason?.message || String(e.reason)}`));

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err) { return { hasError: true, err }; }
  componentDidCatch(err, info) { console.error(err, info); }
  render() { 
    if (this.state.hasError) {
      return (
        <div className="p-10 font-black text-red-500 flex flex-col items-center justify-center h-screen bg-rose-50 w-full overflow-auto notranslate" translate="no">
          <div className="text-xl mb-4 text-slate-800">시스템 렌더링 치명적 오류 발생</div>
          <p className="text-sm text-slate-600 mb-6">개발자에게 아래 에러 메시지를 전달해 주세요.</p>
          <div className="bg-white border-2 border-red-200 p-6 rounded-2xl shadow-xl max-w-3xl w-full text-left">
            <h3 className="text-sm text-red-600 mb-2 border-b pb-2">Error Message</h3>
            <pre className="text-[10px] text-slate-800 whitespace-pre-wrap font-mono mb-4">{String(this.state.err?.message || this.state.err)}</pre>
          </div>
          <button onClick={()=>window.location.reload()} className="mt-8 px-10 py-4 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-900 transition-colors">새로고침</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

const Ico = ({ size=24, className='', d, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
    {d ? <path d={d}/> : children}
  </svg>
);

const Ic = {
  Dash: p=><Ico {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Ico>,
  Box: p=><Ico {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Ico>,
  Users: p=><Ico {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  Bldg: p=><Ico {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></Ico>,
  Cart: p=><Ico {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Ico>,
  Down: p=><Ico {...p}><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></Ico>,
  Truck: p=><Ico {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Ico>,
  Card: p=><Ico {...p}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>,
  Cal: p=><Ico {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ico>,
  Dl: p=><Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ico>,
  Ul: p=><Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Ico>,
  Plus: p=><Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  Edit: p=><Ico {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ico>,
  Trash: p=><Ico {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Ico>,
  X: p=><Ico {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>,
  Chk: p=><Ico {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ico>,
  Alert: p=><Ico {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ico>,
  User: p=><Ico {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  Left: p=><Ico {...p}><polyline points="15 18 9 12 15 6"/></Ico>,
  Right: p=><Ico {...p}><polyline points="9 18 15 12 9 6"/></Ico>,
  Clip: p=><Ico {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Ico>,
  ListP: p=><Ico {...p}><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></Ico>,
  ArrR: p=><Ico {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Ico>,
  Search: p=><Ico {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>,
  Copy: p=><Ico {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ico>,
  ArrU: p=><Ico {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></Ico>,
  ArrD: p=><Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></Ico>,
  Bell: p=><Ico {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ico>,
  File: p=><Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Ico>,
  Settings: p=><Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>,
  Route: p=><Ico {...p}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></Ico>,
  Cloud: p=><Ico {...p}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></Ico>,
  Ref: p=><Ico {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Ico>,
  Serv: p=><Ico {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></Ico>,
  ListO: p=><Ico {...p}><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></Ico>,
  Rot: p=><Ico {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></Ico>,
  PlusSq: p=><Ico {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></Ico>,
  FileD: p=><Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></Ico>,
  Lay: p=><Ico {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Ico>,
  Home: p=><Ico {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>,
  Print: p=><Ico {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></Ico>,
  Star: p=><Ico {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ico>,
  Phone: p=><Ico {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></Ico>,
  ChkSq: p=><Ico {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Ico>,
  Lock: p=><Ico {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Ico>,
  Print2: p=><Ico {...p}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></Ico>
};

const localFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null, auth = null, db = null, firebaseInitError = null;
try {
  const fc = typeof __firebase_config === 'undefined' ? localFirebaseConfig : JSON.parse(__firebase_config);
  if (fc?.apiKey && fc.apiKey !== "여기에_apiKey를_입력하세요") { app = !getApps().length ? initializeApp(fc) : getApp(); auth = getAuth(app); db = getFirestore(app); }
} catch(e) { firebaseInitError = e.message; windowErrors.push(`[FB Error] ${e.message}`); }

const rawAppId = typeof __app_id !== 'undefined' ? String(__app_id) : 'default-app-id';
const appId = rawAppId.includes('/') ? rawAppId.split('/')[0] : rawAppId;

const INITIAL_APP_STATE = {
  users: [{ id: 'admin', password: 'admin', name: '대표이사', contact: '010-0000-0000', note: '총괄', role: 'admin' }],
  items: [{ id: 'I001', category: '농산물', name: '친환경 감자 10kg 박스', unit: '박스', boxQuantity: 10, unitPrice: 2500, supplierId: 'S001', note: '' }],
  suppliers: [{ id: 'S001', name: '햇살농산물', manager: '김햇살', contact: '010-1111-2222', account: '농협', orderType: 'auto', favoriteAt: null }],
  clients: [{ id: 'C001', name: '수원시 팔달구 보건소 본관', shortName: '팔달보건소', manager: '박보건', contact: '031-228-1234', inspectTime: '08:30', inspectLocation: '1층', note: '' }],
  inventory: [], clientOrders: [], mappings: [], payments: [], receipts: [],
  lossRates: { '미곡': 2, '잡곡': 1, '멸치': 3, '야채': 8, '과일': 10, '달걀': 5 },
  categorySortOrder: [], aiOrderOverrides: {}, itemLossRates: {}, purchaseRequests: [], weekMappings: {}, 
  systemLogs: [{ id: 'L01', date: new Date().toLocaleString('ko-KR'), message: '시스템 렌더링 무결성 최적화 및 엑셀 다운로드 계산식 정상화 완료' }],
  localSettings: { savedId: '', rememberId: false, keepLoggedIn: false, lastUserId: null, globalReflectSchedule: false }
};

const Utils = {
  cleanData: d => JSON.parse(JSON.stringify(d)),
  trunc: (t, l=10) => t ? (String(t).length > l ? String(t).substring(0,l)+'...' : String(t)) : '',
  fmt: n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2})),
  enter: e => {
    if (e.key !== 'Enter') return; e.preventDefault(); const f = e.target.closest('table') || e.target.closest('form'); if (!f) return;
    const inp = Array.from(f.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled])')), idx = inp.indexOf(e.target);
    if (idx > -1 && idx < inp.length - 1) inp[idx + 1].focus();
  },
  parseHTML: html => {
    try { const doc = new DOMParser().parseFromString(html, 'text/html'); const table = doc.querySelector('table'); if (!table) return null; return Array.from(table.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('td, th')).map(c => ({ text: (c.textContent || '').replace(/\s+/g, ' ').trim(), isPrimary: true }))); } catch (e) { return null; }
  },
  parseClip: e => {
    const html = e.clipboardData?.getData('text/html'), txt = e.clipboardData?.getData('Text'); if (!txt && !html) return [];
    if (html && html.includes('<table')) { const p = Utils.parseHTML(html); if (p && p.length) return p; }
    if (txt) return txt.replace(/\r?\n$/, '').split(/\r?\n/).map(r => r.split('\t').map(t => ({ text: t.trim(), isPrimary: true }))); return [];
  },
  dlExcelCustom: (htmlBody, fn) => {
    const tpl = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:'Malgun Gothic',sans-serif;font-size:9pt;width:100%;white-space:nowrap;}th,td{border:1px solid #000;padding:6px;vertical-align:middle;}th{background-color:#d9e1f2;font-weight:bold;text-align:center;}.num{mso-number-format:"General";text-align:right;}.txt{mso-number-format:"\\@";text-align:center;}.l{text-align:left;}.r{color:red;}.p{color:purple;font-weight:bold;}.bg-g{background:#f0f0f0;}.bg-b{background:#ddebf7;}.bg-gr{background:#e2efda;}.bg-r{background:#fce4d6;}.bg-p{background:#f3e8fd;}.bg-y{background:#fff2cc;}.hdr{font-size:16pt;background:#8b2f97;color:white;padding:10px;}.sub{font-size:8pt;color:#555;}</style></head><body>${htmlBody}</body></html>`;
    const b = new Blob(['\uFEFF' + tpl], { type: 'application/vnd.ms-excel;charset=utf-8' }), l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `${fn}_${Date.now()}.xls`; l.click();
  },
  dlStyled: (fields, data, fn) => {
    let html = `<h3>${fn}</h3><table><thead><tr>`; fields.forEach(f => html+=`<th>${f.label}</th>`); html+='</tr></thead><tbody>';
    data.forEach(r => { html+='<tr>'; fields.forEach(f => { let v=r[f.key]||'', cls = f.type==='number' ? 'num' : 'txt'; if(f.type==='number') v=Number(v)||0; html+=`<td class="${cls}">${v}</td>`; }); html+='</tr>'; }); html+='</tbody></table>'; Utils.dlExcelCustom(html, fn);
  },
  printContent: (title, htmlContent) => {
    const w = window.open('','_blank'); w.document.write(`<html><head><title>${title}</title><style>@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); body{font-family: 'Pretendard', sans-serif; padding: 20px; font-size: 11px;} h2{text-align: center; color: #333; margin-bottom: 20px;} table{width:100%; border-collapse:collapse; font-size:10px;} th,td{border:1px solid #444; padding:6px; text-align:center;} th{background:#f0f2f5; font-weight:bold;} @media print { @page { size: A4 landscape; margin: 10mm; } }</style></head><body><h2>${title}</h2>${htmlContent}<script>setTimeout(()=>window.print(),500);</script></body></html>`); w.document.close();
  },
  sortItems: (arr=[], order=[]) => [...arr].sort((a,b) => {
    const cA=a.category||'미분류', cB=b.category||'미분류'; const iA=order.indexOf(cA), iB=order.indexOf(cB);
    if(iA!==-1 && iB!==-1){ if(iA!==iB) return iA-iB; } else if(iA!==-1) return -1; else if(iB!==-1) return 1;
    if(cA!==cB) return cA.localeCompare(cB); return (a.id||'').localeCompare(b.id||'');
  }),
  getLossGroup: (it, rts={}) => {
    const n=it.name||'', c=it.category||'', ks=Object.keys(rts); for(let k of ks) if(c.includes(k) || n.includes(k)) return k;
    if((n.includes('쌀')||n.includes('백미')) && ks.includes('미곡')) return '미곡'; if(n.includes('콩') && ks.includes('잡곡')) return '잡곡';
    if((n.includes('채소')||n.includes('양파')||n.includes('감자')||n.includes('파')) && ks.includes('야채')) return '야채'; if((n.includes('특란')||n.includes('계란')||n.includes('달걀')) && ks.includes('달걀')) return '달걀';
    return null;
  },
  getWeek: (dateStr, mappings = {}) => {
    if (!dateStr) return 0; const ym = dateStr.substring(0, 7); const monthMap = mappings?.[ym];
    if (monthMap) { for (let w = 1; w <= 4; w++) { const r = monthMap[`w${w}`]; if (r && r.s && r.e) { if (dateStr >= r.s && dateStr <= r.e) return w; } } }
    const dMatch = dateStr.match(/\d{4}-\d{2}-(\d{2})/); if(!dMatch) return 0; const day = parseInt(dMatch[1], 10); const w = Math.ceil(day / 7); return w > 4 ? 4 : w; 
  },
  formatSubUnit: (val, unit) => {
      if(val===undefined || val===null || val==='') return '';
      const num = Number(val); if(isNaN(num) || num===0) return '';
      if(num < 1) { const u = (unit||'').toLowerCase(); if(u==='kg') return `${Utils.fmt(num*1000)}g`; if(u==='l'||u==='리터') return `${Utils.fmt(num*1000)}ml`; }
      return `${Utils.fmt(num)}${unit||''}`;
  },
  dlPrExcel: (sName, itms, period) => {
      let h = `<table><thead><tr><th colspan="7" class="hdr">${sName} 발주내역 (${period})</th></tr><tr><th class="bg-g">구분</th><th class="bg-g">품명</th><th class="bg-g">단위</th><th class="bg-g">입수</th><th class="bg-gr">발주수량(Box)</th><th class="bg-g">단가</th><th class="bg-r">금액</th></tr></thead><tbody>`;
      itms.forEach(it => {
        const q = Number(it.reqBoxes) || 0, p = Number(it.unitPrice) || 0, a = q * p;
        h += `<tr><td>${it.category}</td><td class="l fw-b">${it.name}</td><td>${it.unit}</td><td class="num n-gen">${it.boxQuantity||1}</td><td class="num t-b fw-b n-gen">${q}</td><td class="num p n-gen">${p}</td><td class="num fw-b n-gen" style="color:#d97706;">${a}</td></tr>`;
      });
      h += `</tbody></table>`;
      Utils.dlExcelCustom(h, `발주서_${sName}_${period}`);
  },
  prtPr: (sName, itms) => {
      let h = `<table><thead><tr><th>#</th><th>품명</th><th>단위</th><th>수량(Box)</th><th>단가</th><th>금액</th></tr></thead><tbody>`;
      itms.forEach((it, x) => {
        const q = Number(it.reqBoxes) || 0, p = Number(it.unitPrice) || 0;
        h += `<tr><td>${x+1}</td><td style="text-align:left;">${it.name}</td><td>${it.unit}</td><td style="color:blue; font-weight:bold;">${Utils.fmt(q)}</td><td style="color:purple;">${Utils.fmt(p)}</td><td style="color:#d97706; font-weight:bold;">${Utils.fmt(q*p)}</td></tr>`;
      });
      h += `</tbody></table>`;
      Utils.printContent(`[구매요청서] ${sName}`, h);
  }
};

const GConfirm = ({ is, msg, onC, onX }) => is ? (
  <div className="absolute inset-0 z-[99999] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in notranslate" translate="no">
    <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl flex flex-col text-center overflow-hidden animate-scale-up border border-slate-200">
       <div className="p-8"><div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 flex-shrink-0"><Ic.Alert size={32} className="text-rose-600"/></div><h4 className="text-xl font-black text-slate-800 mb-3">확인 요청</h4><p className="text-sm font-bold text-slate-600 whitespace-pre-wrap">{msg}</p></div>
       <div className="flex-none flex gap-3 p-6 pt-0"><button onClick={onX} className="flex-1 py-3.5 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-colors">취소</button><button onClick={onC} className="flex-1 py-3.5 bg-rose-600 text-white font-black rounded-xl shadow-md hover:bg-rose-700 transition-colors">진행</button></div>
    </div>
  </div>
) : null;

const TInp = ({ v, setV, cls='', ph='', disabled=false, onPaste }) => {
  const [foc, setFoc] = useState(false), [localV, setLocalV] = useState(v !== undefined && v !== null ? String(v) : '');
  useEffect(() => { if (!foc) setLocalV(v !== undefined && v !== null ? String(v) : ''); }, [v, foc]);
  return <input type="text" disabled={disabled} value={localV} onFocus={e=>{setFoc(true); e.target.select();}} onBlur={()=>{setFoc(false); if(localV !== String(v || '')) setV(localV);}} onKeyDown={e=>{if(e.key==='Enter'){e.target.blur(); Utils.enter(e);}}} onChange={e=>setLocalV(e.target.value)} onPaste={onPaste} className={`border-transparent outline-none transition-all focus:bg-white bg-transparent font-black disabled:opacity-50 disabled:cursor-not-allowed ${cls}`} placeholder={ph} />;
};

const NumInp = ({ v, setV, cls='', ph='', disabled=false, onPaste }) => {
  const [foc, setFoc] = useState(false), [localV, setLocalV] = useState(v !== undefined && v !== null ? String(v) : '');
  useEffect(() => { if (!foc) setLocalV(v !== undefined && v !== null ? String(v) : ''); }, [v, foc]);
  return <input type="text" disabled={disabled} inputMode="decimal" placeholder={ph} value={foc ? localV : Utils.fmt(localV)} onFocus={e=>{setFoc(true); e.target.select();}} onBlur={()=>{setFoc(false); if(localV !== String(v || '')) setV(localV);}} onKeyDown={e=>{if(e.key==='Enter'){e.target.blur(); Utils.enter(e);}}} onChange={e=>{setLocalV(e.target.value.replace(/[^0-9.-]/g,''));}} onPaste={onPaste} className={`border-transparent outline-none transition-all focus:bg-white bg-transparent font-black disabled:opacity-50 disabled:cursor-not-allowed ${cls}`} />;
};

const ItemSearchInput = ({ masterItems=[], initialValue='', onSelect, isLoggedIn }) => {
  const [q, setQ] = useState(initialValue), [is, setIs] = useState(false);
  const fs = useMemo(()=>!q||!is?[]:masterItems.filter(i=>(i.name||'').toLowerCase().includes(q.toLowerCase())||(i.id||'').toLowerCase().includes(q.toLowerCase())||(i.category||'').toLowerCase().includes(q.toLowerCase())).slice(0,10), [q,masterItems,is]);
  useEffect(()=>{setQ(initialValue);},[initialValue]);
  if(!isLoggedIn) return <span className="text-[11px] font-black truncate">{Utils.trunc(initialValue, 15)}</span>;
  return (
    <div className="relative w-full">
      <input type="text" value={q} onChange={e=>{setQ(e.target.value);setIs(true);}} onFocus={e=>{e.target.select();setIs(true);}} onBlur={()=>setTimeout(()=>setIs(false),200)} placeholder="품목 검색" className="w-full bg-white border border-gray-300 rounded p-1.5 text-[11px] font-black outline-none focus:border-blue-500" />
      {is && fs.length>0 && <div className="absolute top-full left-0 w-[240px] bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto mt-1 text-left">{fs.map(i=><div key={i.id} onMouseDown={(e)=>{e.preventDefault(); onSelect(i); setIs(false);}} className="p-2 border-b hover:bg-blue-50 cursor-pointer flex justify-between items-center text-left"><div className="flex flex-col"><span className="text-[9px] text-blue-500 font-black">{i.id}</span><span className="text-[11px] font-black text-gray-800">{Utils.trunc(i.name,15)}</span></div><span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{i.category}</span></div>)}</div>}
    </div>
  );
};

const DashboardView = ({ items=[], clients=[], clientOrders=[], payments=[], logs=[], globalMonth, setAc }) => {
  const [cd, setCd] = useState(new Date(`${globalMonth}-01T00:00:00`)); const [act, setAct] = useState(null);
  useEffect(() => { setCd(new Date(`${globalMonth}-01T00:00:00`)); }, [globalMonth]);
  const yr = cd.getFullYear(), mo = cd.getMonth(), ds = Array(new Date(yr, mo, 1).getDay()).fill(null).concat([...Array(new Date(yr, mo+1, 0).getDate()).keys()].map(i=>i+1));
  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end flex-none"><h2 className="text-2xl font-bold">대시보드</h2><div className="flex items-center gap-2 text-[11px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"><Ic.Cloud size={14}/> GCP 연동</div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">{[{id:'items',l:'품목',v:items.length,ic:Ic.Box,c:'text-purple-600',b:'border-purple-600'},{id:'cl',l:'보건소',v:clients.length,ic:Ic.Bldg,c:'text-pink-500',b:'border-pink-500'},{id:'ord',l:'일정',v:clientOrders.length,ic:Ic.Truck,c:'text-blue-500',b:'border-blue-500'}].map((x,i)=>{ const Icon = x.ic; return <div key={`dash-${i}`} onClick={()=>setAc(x.id)} className={`bg-white p-5 rounded-3xl shadow-sm border-l-4 ${x.b} flex items-center gap-4 cursor-pointer hover:shadow-md ${act===x.id?'bg-gray-50':''}`}><Icon size={28} className={x.c}/><div><p className="text-xs text-gray-400 font-bold">{x.l}</p><p className="text-2xl font-black">{Utils.fmt(x.v)}</p></div></div>; })}</div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="xl:col-span-3 flex flex-col min-h-0">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col flex-1 min-h-0">
            <div className="flex justify-between mb-4 flex-none"><h3 className="font-black text-lg flex items-center gap-2"><Ic.Cal size={20} className="text-blue-500"/> 월간 요약 ({globalMonth} 기준)</h3></div>
            <div className="grid grid-cols-7 gap-1 bg-gray-50 p-1 rounded-2xl flex-1 overflow-y-auto scrollbar-hide">
              {['일','월','화','수','목','금','토'].map((d,i)=><div key={`hdr-${d}`} className={`text-center text-[10px] font-black py-2 ${i===0?'text-red-500':i===6?'text-blue-500':'text-gray-400'} sticky top-0 bg-gray-50 z-10`}>{d}</div>)}
              {ds.map((d,i)=>{
                if(!d) return <div key={`pad-${i}`} className="min-h-[80px] bg-gray-100/30 rounded-lg"></div>;
                const dS=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evts=clientOrders.filter(o=>o.deliveryDate1===dS||o.deliveryDate2===dS);
                return <div key={`day-${dS}`} className={`min-h-[80px] p-1.5 border-t rounded-lg flex flex-col gap-1 ${evts.length?'bg-white shadow-sm':i%7===0?'bg-red-50/10':i%7===6?'bg-blue-50/10':''}`}><span className={`text-[10px] font-black ${i%7===0?'text-red-500':i%7===6?'text-blue-500':'text-gray-400'}`}>{d}</span><div className="flex flex-wrap gap-1 content-start">{evts.map((o,x)=><div key={`evt-${o.id}-${x}`} className={`inline-block px-1.5 py-0.5 rounded-md shadow-sm text-[9px] font-black text-white hover:scale-105 transition-transform max-w-full truncate break-keep ${o.deliveryDate1===dS?'bg-blue-500':'bg-green-500'}`}>{Utils.trunc(clients.find(c=>c.id===o.clientId)?.shortName, 10)}</div>)}</div></div>
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col flex-1 min-h-0"><h3 className="font-black text-lg flex items-center gap-2 mb-4 text-gray-800 flex-none"><Ic.ListO size={20} className="text-purple-500"/> 시스템 활동 로그</h3><div className="space-y-3 overflow-y-auto pr-2 scrollbar-hide flex-1">{logs && logs.length > 0 ? logs.map((lg, i) => <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[10px] text-purple-600 font-bold mb-1">{lg.date}</p><p className="text-xs font-black text-gray-800 leading-tight">{lg.message}</p></div>) : <p className="text-xs text-gray-400 text-center py-4">기록이 없습니다.</p>}</div></div>
        </div>
      </div>
    </div>
  );
};

const DataManagerView = ({ title, data=[], setData, fields=[], filename, isLog, toast, setConfirm }) => {
  const [isMo, setIsMo] = useState(false), [edit, setEdit] = useState(null), [sel, setSel] = useState([]), [nr, setNr] = useState({}), [sq, setSq] = useState('');
  const fdData = useMemo(()=>data.filter(r=>fields.some(f=>String(r[f.key]||'').toLowerCase().includes(sq.toLowerCase()))), [data, fields, sq]);
  const save = e => { e.preventDefault(); const fd = new FormData(e.target), nd = {}; fields.forEach(f => { let val = fd.get(f.key); if (f.type === 'number' && val) val = val.replace(/,/g, ''); nd[f.key] = val; }); const id=nd.id?.trim(); if(!id) return; if(!edit && data.some(i=>i.id===id)) return toast('중복'); edit ? setData(data.map(i=>i.id===edit.id?{...i,...nd}:i)) : setData([{...nd,id},...data]); setIsMo(false); toast('저장됨'); };
  const inlineNew = () => { let id = nr.id?.trim(); if (!id) id = `CODE_${Math.random().toString(36).substr(2, 6).toUpperCase()}`; if (data.some(i=>i.id===id)) return toast('중복/오류'); setData([{...nr, id}, ...data]); setNr({}); toast('빠른 등록 추가됨'); };

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 justify-between items-center flex-none">
        <h2 className="text-xl font-black">{title} <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-full">{fdData.length}건</span></h2>
        <div className="flex gap-2 flex-wrap">
          <input type="text" value={sq} onChange={e=>setSq(e.target.value)} placeholder="검색..." className="border p-2 rounded-xl text-xs outline-none bg-gray-50" />
          {isLog && sel.length>0 && <button onClick={()=>setConfirm({is:true, msg:'삭제할까요?', onC:()=>{setData(data.filter(i=>!sel.includes(i.id)));setSel([]);setConfirm({is:false});toast('삭제됨');}, onX:()=>setConfirm({is:false})})} className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-xs font-black">삭제</button>}
          <button onClick={()=>Utils.dlStyled(fields, fdData, filename)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-black">엑셀</button>
          {isLog && <button onClick={()=>{setEdit(null);setIsMo(true);}} className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-black">신규</button>}
        </div>
      </div>
      <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 scrollbar-hide w-full">
          <table className="w-full text-[11px] whitespace-nowrap text-center table-fixed">
            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm border-b"><tr>{isLog&&<th className="p-3 w-10"><input type="checkbox" onChange={e=>setSel(e.target.checked?fdData.map(i=>i.id):[])}/></th>}<th className="p-3 w-10 font-black break-keep">#</th>{fields.filter(f=>!f.hideInList).map(f=><th key={`head-${f.key}`} className="p-3 font-black break-keep">{f.label}</th>)}{isLog&&<th className="p-3 w-16 font-black break-keep">관리</th>}</tr></thead>
            <tbody>
              {isLog && (
                  <tr className="bg-blue-50/20">
                      <td className="p-2 border-r font-bold text-blue-700 break-keep" colSpan={2}>New</td>
                      {fields.filter(f=>!f.hideInList).map((f,i)=>(
                          <td key={`new-${f.key}`} className="p-1 border-r">
                              {f.type === 'number' ? <NumInp v={nr[f.key]} setV={v=>setNr({...nr,[f.key]:v})} cls="w-full bg-white p-1.5 rounded text-[10px] shadow-inner" ph={f.label}/> : f.type === 'select' ? <select value={nr[f.key]||''} onChange={e=>setNr({...nr,[f.key]:e.target.value})} className="w-full bg-white p-1.5 rounded border border-gray-200 outline-none text-[10px] font-black focus:border-blue-500 shadow-inner"><option value="">선택</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <TInp v={nr[f.key]} setV={v=>setNr({...nr,[f.key]:v})} cls="w-full bg-white p-1.5 rounded text-[10px] shadow-inner" ph={f.label}/>}
                          </td>
                      ))}
                      <td className="p-1"><button onClick={inlineNew} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded w-full font-black text-[10px] transition-colors shadow-sm">저장</button></td>
                  </tr>
              )}
              {fdData.map((r,x)=><tr key={`row-${r.id}`} className="border-b hover:bg-gray-50">{isLog&&<td className="p-2"><input type="checkbox" checked={sel.includes(r.id)} onChange={()=>setSel(p=>p.includes(r.id)?p.filter(i=>i!==r.id):[...p,r.id])}/></td>}<td className="p-2 text-gray-400 break-keep">{x+1}</td>
                {fields.filter(f=>!f.hideInList).map(f=><td key={`td-${r.id}-${f.key}`} className="p-2 break-keep leading-tight">
                    {isLog && f.inlineEditable ? (
                        f.type === 'number' ? <NumInp v={r[f.key]} setV={v=>{setData(data.map(i=>i.id===r.id?{...i,[f.key]:v}:i));toast('저장됨');}} cls="w-full text-center px-1 py-1 hover:bg-white rounded transition-colors" /> : f.type === 'select' ? <select value={r[f.key]||''} onChange={e=>{setData(data.map(i=>i.id===r.id?{...i,[f.key]:e.target.value}:i));toast('저장됨');}} className="w-full text-center px-1 py-1 bg-transparent hover:bg-white border border-transparent focus:border-blue-300 rounded outline-none text-[11px] font-black cursor-pointer transition-colors"><option value="">선택</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <TInp v={r[f.key]} setV={v=>{setData(data.map(i=>i.id===r.id?{...i,[f.key]:v}:i));toast('저장됨');}} cls="w-full text-center px-1 py-1 hover:bg-white rounded transition-colors" />
                    ) : <span className="block w-full break-words">{f.type === 'select' ? (f.options?.find(o=>o.value===r[f.key]) ? `[${r[f.key]}] ${f.options.find(o=>o.value===r[f.key]).label}` : r[f.key]) : (f.type==='number'?Utils.fmt(r[f.key]):r[f.key])}</span>}
                </td>)}
                {isLog&&<td className="p-2"><button onClick={()=>{setEdit(r);setIsMo(true);}} className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors"><Ic.Edit size={12} className="mx-auto"/></button></td>}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      {isMo && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh]">
            <div className="flex-none p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]"><h3 className="text-xl font-black text-slate-800">{title} {edit?'수정':'등록'}</h3><button onClick={()=>setIsMo(false)} className="p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={18}/></button></div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 scrollbar-hide">
              <form id="dmForm" onSubmit={save} className="space-y-4">
                {fields.map(f=><div key={`fm-${f.key}`}><label className="text-xs font-black text-slate-600 block mb-1.5">{f.label}</label>{f.type === 'select' ? <select name={f.key} defaultValue={edit?.[f.key]||''} className="border w-full p-3 rounded-xl text-sm outline-none focus:border-blue-500 bg-white shadow-sm font-black"><option value="">선택</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input name={f.key} type="text" defaultValue={f.type==='number' ? Utils.fmt(edit?.[f.key]) : edit?.[f.key]} className="border w-full p-3 rounded-xl text-sm outline-none focus:border-blue-500 bg-white shadow-sm font-black" placeholder={f.key==='id'?'코드 (필수)':''}/>}</div>)}
              </form>
            </div>
            <div className="flex-none p-6 border-t border-slate-100 bg-white flex gap-3 rounded-b-[2.5rem]"><button type="button" onClick={()=>setIsMo(false)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-50 transition-colors">취소</button><button type="submit" form="dmForm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black shadow-md transition-colors">저장하기</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientItemMappingView = ({ clients=[], items=[], clientItemMappings=[], setClientItemMappings, toast, isLog, setConfirm, globalMonth }) => {
  const [sc, setSc] = useState(''), [rows, setRows] = useState([]);
  useEffect(() => {
    if(!sc) return setRows([]); const clientMaps = (clientItemMappings || []).filter(x => x.clientId === sc); let targetMap = clientMaps.find(x => x.month === globalMonth);
    if (!targetMap && clientMaps.length > 0) { const sorted = [...clientMaps].sort((a, b) => (b.month || '').localeCompare(a.month || '')); targetMap = sorted[0]; }
    if(targetMap && targetMap.mappedItems?.length > 0) { setRows(JSON.parse(JSON.stringify(targetMap.mappedItems)).map(item => ({...item, uid: item.uid || `U_${Date.now()}_${Math.random()}`}))); } 
    else { setRows(Array(5).fill(0).map((_,i)=>({uid:`U_${Date.now()}_${i}`, itemId:'', clientItemName:'', orderUnit:1}))); }
  }, [sc, globalMonth, clientItemMappings]);
  
  const save = (r) => setClientItemMappings(p => { const withoutCurrentMonth = p.filter(ma => !(ma.clientId === sc && ma.month === globalMonth)); return [...withoutCurrentMonth, { clientId: sc, month: globalMonth, mappedItems: r }]; });
  const close = () => { save(rows); setSc(''); toast('해당 월 매칭 데이터로 저장됨'); };
  const addT = () => setRows([{uid:`U_${Date.now()}_${Math.random()}`, itemId:'', clientItemName:'', orderUnit:1}, ...rows]);
  const mv = (i, d) => { const nx=[...rows], t=d==='u'?i-1:i+1; if(t<0||t>=nx.length)return; [nx[i],nx[t]]=[nx[t],nx[i]]; setRows(nx); };
  const cp = (r, i) => { const nx=[...rows]; nx.splice(i+1,0,{...r,uid:`U_${Date.now()}_${Math.random()}`}); setRows(nx); };

  return (
    <div className="space-y-6 w-full animate-fade-in relative flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4 flex-none"><div><h2 className="text-3xl font-black text-slate-900">보건소 전용 품목 매칭</h2><p className="text-sm text-slate-600 font-bold mt-2">선택한 월에 맞춰 각 기관별로 웰쉐어 마스터 품목을 매칭합니다.</p></div><div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm"><span className="text-xs font-bold text-slate-500 pl-2">작업 기준월:</span><input type="month" value={globalMonth} disabled className="border-none text-sm font-black text-purple-700 bg-transparent outline-none cursor-not-allowed" /></div></div>
      {!sc && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 overflow-y-auto scrollbar-hide">
          {clients.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c => {
            const isM = (clientItemMappings||[]).find(x=>x.clientId===c.id)?.mappedItems?.length>0;
            return (
              <div key={c.id} onClick={()=>setSc(c.id)} className={`group relative p-5 rounded-2xl shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col gap-4 overflow-hidden ${isM ? 'bg-white border-purple-300 ring-1 ring-purple-100' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                 <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full transition-transform duration-500 group-hover:scale-150 opacity-20 ${isM ? 'bg-purple-200' : 'bg-slate-200'}`}></div>
                 <div className="flex items-center gap-3 relative z-10"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${isM ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}><Ic.Bldg size={20}/></div><div className="flex-1 min-w-0"><h3 className="font-black text-[13px] text-slate-800 truncate">{c.name}</h3></div></div>
                 <div className="relative z-10 mt-auto flex justify-end"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1 shadow-sm border ${isM ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{isM ? <><Ic.Chk size={12}/> 매칭 완료</> : <><Ic.Alert size={12}/> 매칭 필요</>}</span></div>
              </div>
            );
          })}
        </div>
      )}
      {sc && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-4 rounded-t-[2.5rem]"><h3 className="text-xl sm:text-2xl font-black text-purple-700 flex items-center gap-3"><Ic.ChkSq size={28}/> [{clients.find(c=>c.id===sc)?.name}] 전용 품목 세팅 <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">{globalMonth} 기준</span></h3><div className="flex items-center gap-3 pr-12">{isLog&&<button onClick={()=>setConfirm({is:true, msg:'마스터 품목 전체를 리스트로 불러옵니다.\n진행할까요?', onC:()=>{const ni=items.map(it=>({uid:`L_${Date.now()}_${it.id}`,itemId:it.id,clientItemName:it.name,orderUnit:1})); const nx=[...rows,...ni]; setRows(nx); save(nx); setConfirm({is:false}); toast('완료');}, onX:()=>setConfirm({is:false})})} className="px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black border border-purple-200 hidden sm:block transition-colors">전체품목 로드</button>}<button onClick={addT} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-colors"><Ic.Plus size={16}/> 1줄 추가</button></div><button onClick={close} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-y-auto flex-1 w-full scrollbar-hide">
                  <table className="w-full text-[12px] whitespace-nowrap text-center table-fixed">
                    <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 border-b"><tr><th className="p-3 w-12 font-black break-keep">순번</th><th className="p-3 w-[25%] bg-yellow-50 text-yellow-800 border-l border-r font-black break-keep">마스터품목 검색</th><th className="p-3 w-[30%] bg-blue-50 text-blue-800 border-r font-black break-keep">보건소 전용명칭 (납품서용)</th><th className="p-3 w-[10%] border-r font-black break-keep">단위</th><th className="p-3 w-[10%] text-purple-700 border-r font-black break-keep">발주단위</th>{isLog&&<th className="p-3 w-[15%] font-black break-keep">관리</th>}</tr></thead>
                    <tbody>
                      {rows.map((r,i)=>{
                        const m=items.find(x=>x.id===r.itemId);
                        return <tr key={`row-${r.uid}`} className="border-b hover:bg-gray-50"><td className="p-2 text-gray-400 font-bold break-keep">{i+1}</td><td className="p-2 bg-yellow-50/20 border-l border-r"><ItemSearchInput isLoggedIn={isLog} masterItems={items} initialValue={m?.name||''} onSelect={it=>{const nx=rows.map(x=>x.uid===r.uid?{...x,itemId:it.id,clientItemName:it.name}:x);setRows(nx);save(nx);}} /></td><td className="p-2 bg-blue-50/20 border-r"><TInp v={r.clientItemName} setV={v=>{const nx=rows.map(x=>x.uid===r.uid?{...x,clientItemName:v}:x);setRows(nx);save(nx);}} cls="w-full px-2 py-1.5 text-blue-800 font-black border border-transparent focus:border-blue-300 rounded text-[11px] bg-white shadow-sm" /></td><td className="p-2 text-gray-600 font-bold border-r break-keep leading-tight">{m?.unit||'-'}</td><td className="p-2 border-r"><NumInp v={r.orderUnit} setV={v=>{const nx=rows.map(x=>x.uid===r.uid?{...x,orderUnit:v}:x);setRows(nx);save(nx);}} cls="w-full min-w-[30px] px-1 py-1.5 text-purple-700 font-black text-center border border-transparent focus:border-purple-300 rounded text-[11px] bg-white shadow-sm" /></td>{isLog&&<td className="p-2"><div className="flex justify-center gap-1 flex-wrap"><button onClick={()=>mv(i,'u')} disabled={i===0} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors"><Ic.ArrU size={14}/></button><button onClick={()=>mv(i,'d')} disabled={i===rows.length-1} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors"><Ic.ArrD size={14}/></button><button onClick={()=>cp(r,i)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"><Ic.Copy size={14}/></button><button onClick={()=>{const nx=rows.filter(x=>x.uid!==r.uid);setRows(nx);save(nx);}} className="text-red-500 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Ic.Trash size={14}/></button></div></td>}</tr>
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center rounded-b-[2.5rem]"><span className="text-[11px] text-gray-500 font-bold hidden sm:inline-block">💡 동일한 품목이라도 UID(고유바코드)로 구분되므로 자유롭게 복사해서 사용할 수 있습니다.</span><button onClick={close} className="bg-[#8b2f97] hover:bg-purple-800 text-white px-12 py-4 rounded-xl font-black shadow-md w-full sm:w-auto transition-transform hover:-translate-y-0.5 text-base">매칭 완료 및 창 닫기</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScheduleManagement = ({ clients=[], clientOrders=[], setClientOrders, weekMappings={}, setWeekMappings, isLog, toast, setConfirm, globalMonth }) => {
  const [cd, setCd] = useState(new Date(`${globalMonth}-01T00:00:00`)); const [sm, setSm] = useState({ is:false, d:null }), [mc, setMc] = useState(''); const [showWm, setShowWm] = useState(false), [wmData, setWmData] = useState({});
  useEffect(() => { setCd(new Date(`${globalMonth}-01T00:00:00`)); }, [globalMonth]);
  const yr = cd.getFullYear(), mo = cd.getMonth(), dsStr = `${yr}-${String(mo+1).padStart(2,'0')}`, daysInMo = new Date(yr, mo+1, 0).getDate(), fDay = new Date(yr, mo, 1).getDay(); const arrDays = Array(fDay).fill(null).concat([...Array(daysInMo).keys()].map(i=>i+1));
  const availC = clients.filter(c => { const o = clientOrders.find(x=>x.clientId===c.id && x.month===dsStr); return !(o?.deliveryDate1 && o?.deliveryDate2); }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  
  const submit = e => { e.preventDefault(); if(!mc||!sm.d) return; setClientOrders(p => { let nx=[...p]; const i=nx.findIndex(x=>x.clientId===mc && x.month===dsStr); let o=i>=0?{...nx[i]}:{id:`CO${Date.now()}`, clientId:mc, month:dsStr, items:[]}; if(o.deliveryDate1 && !o.deliveryDate2) { if(sm.d<o.deliveryDate1){o.deliveryDate2=o.deliveryDate1; o.deliveryDate1=sm.d;}else{o.deliveryDate2=sm.d;} } else { o.deliveryDate1=sm.d; } i>=0?nx[i]=o:nx.push(o); return nx; }); toast('예약 완료'); setSm({is:false}); setMc(''); };
  const openWm = () => { const pMo = String(mo+1).padStart(2,'0'); const currentMap = weekMappings?.[dsStr] || { w1:{s:`${yr}-${pMo}-01`, e:`${yr}-${pMo}-07`}, w2:{s:`${yr}-${pMo}-08`, e:`${yr}-${pMo}-14`}, w3:{s:`${yr}-${pMo}-15`, e:`${yr}-${pMo}-21`}, w4:{s:`${yr}-${pMo}-22`, e:`${yr}-${pMo}-${String(daysInMo).padStart(2,'0')}`} }; setWmData(currentMap); setShowWm(true); };
  const saveWm = () => { if(!isLog) return toast('로그인 필요'); setWeekMappings({...weekMappings, [dsStr]: wmData}); setShowWm(false); toast('주차 매칭 설정이 저장되었습니다.'); };
  const handlePrint = () => { let h = `<table border="1"><thead><tr><th colspan="7" style="font-size:16pt; background:#d9e1f2; padding:10px;">${yr}년 ${mo+1}월 배송일정</th></tr><tr><th style="color:red; background:#f8cccc;">일</th><th style="background:#f0f0f0;">월</th><th style="background:#f0f0f0;">화</th><th style="background:#f0f0f0;">수</th><th style="background:#f0f0f0;">목</th><th style="background:#f0f0f0;">금</th><th style="color:blue; background:#cce5ff;">토</th></tr></thead><tbody><tr>`; arrDays.forEach((d, i) => { if (i > 0 && i % 7 === 0) h += `</tr><tr>`; if (!d) { h += `<td style="background:#f9f9f9; height:80px;"></td>`; } else { const dS = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evts = clientOrders.filter(o=>o.deliveryDate1===dS||o.deliveryDate2===dS); let evtsHtml = evts.map(o => `<div style="font-size:11px; margin-top:4px; color:${o.deliveryDate1===dS?'#2b6cb0':'#166534'}; font-weight:bold;">${o.deliveryDate1===dS?'[1차]':'[2차]'} ${clients.find(c=>c.id===o.clientId)?.shortName}</div>`).join(''); h += `<td style="vertical-align:top; height:80px; padding:6px; text-align:left;"><strong style="font-size:12px; color:${i%7===0?'red':i%7===6?'blue':'#333'};">${d}</strong>${evtsHtml}</td>`; } }); h += `</tr></tbody></table>`; Utils.printContent(`${yr}년 ${mo+1}월 배송일정`, h); };
  const handleExcel = () => { let h = `<table border="1"><thead><tr><th colspan="7" style="font-size:16pt; background:#d9e1f2; padding:10px; font-weight:bold; text-align:center;">${yr}년 ${mo+1}월 배송일정</th></tr><tr><th style="color:red; background:#f8cccc; width:14%;">일</th><th style="background:#f0f0f0; width:14%;">월</th><th style="background:#f0f0f0; width:14%;">화</th><th style="background:#f0f0f0; width:14%;">수</th><th style="background:#f0f0f0; width:14%;">목</th><th style="background:#f0f0f0; width:14%;">금</th><th style="color:blue; background:#cce5ff; width:14%;">토</th></tr></thead><tbody><tr>`; arrDays.forEach((d, i) => { if (i > 0 && i % 7 === 0) h += `</tr><tr>`; if (!d) { h += `<td style="background:#f9f9f9; height:100px;"></td>`; } else { const dS = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evts = clientOrders.filter(o=>o.deliveryDate1===dS||o.deliveryDate2===dS); let evtsHtml = evts.map(o => `<div style="font-size:11px; margin-top:4px; color:${o.deliveryDate1===dS?'#2b6cb0':'#166534'}; font-weight:bold;">${o.deliveryDate1===dS?'[1차]':'[2차]'} ${clients.find(c=>c.id===o.clientId)?.shortName}</div>`).join(''); h += `<td style="vertical-align:top; height:100px; padding:6px; text-align:left;"><strong style="font-size:12px; color:${i%7===0?'red':i%7===6?'blue':'#333'};">${d}</strong>${evtsHtml}</td>`; } }); const rem = arrDays.length % 7; if(rem > 0) { for(let k=0; k<7-rem; k++) h += `<td style="background:#f9f9f9; height:100px;"></td>`; } h += `</tr></tbody></table>`; Utils.dlExcelCustom(h, `스마트배송일정_달력형식_${dsStr}`); };

  return (
    <div className="space-y-6 animate-fade-in w-full flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end flex-none"><h2 className="text-2xl font-bold">스마트 배송일정 관리</h2><div className="flex gap-2"><button onClick={openWm} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors flex items-center gap-1"><Ic.Cal size={16}/> 주차 매칭 설정</button><button onClick={handleExcel} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-black hover:bg-green-100 transition-colors flex items-center gap-1"><Ic.File size={16}/> 엑셀 다운로드 (달력형식)</button><button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-black hover:bg-gray-900 transition-colors flex items-center gap-1"><Ic.Print size={16}/> 인쇄 미리보기</button></div></div>
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 flex-1 flex flex-col min-h-0 overflow-hidden"><div className="flex justify-between items-center mb-6 flex-none"><div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl"><button onClick={()=>setCd(new Date(yr, mo-1, 1))} className="p-2 rounded-xl hover:bg-white"><Ic.Left size={20}/></button><span className="font-black text-lg px-6 flex items-center text-blue-600">{yr}년 {mo+1}월</span><button onClick={()=>setCd(new Date(yr, mo+1, 1))} className="p-2 rounded-xl hover:bg-white"><Ic.Right size={20}/></button></div></div><div className="grid grid-cols-7 gap-1.5 bg-gray-50 p-2 rounded-[2rem] flex-1 overflow-y-auto scrollbar-hide">{['일','월','화','수','목','금','토'].map((d,i)=><div key={`hdr-${d}`} className={`py-3 text-center text-[12px] font-black ${i===0?'text-red-500':i===6?'text-blue-500':'text-gray-500'} sticky top-0 bg-gray-50 z-10`}>{d}</div>)}{arrDays.map((d, i) => { if(!d) return <div key={`pad-${i}`} className="min-h-[100px] bg-gray-100/30 rounded-2xl"></div>; const dS = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evts = clientOrders.filter(o=>o.deliveryDate1===dS||o.deliveryDate2===dS); return <div key={`day-${dS}`} onClick={()=>isLog&&setSm({is:true,d:dS})} className={`min-h-[100px] p-2 border-t flex flex-col rounded-2xl overflow-hidden group transition-all ${isLog?'cursor-pointer hover:shadow-md hover:-translate-y-1 hover:bg-white border-blue-100':''} ${evts.length?'bg-white shadow-sm':i%7===0?'bg-red-50/20':i%7===6?'bg-blue-50/20':'bg-gray-50/50'}`}><span className={`text-[12px] font-black mb-1.5 px-1 ${i%7===0?'text-red-500':i%7===6?'text-blue-500':'text-gray-500'}`}>{d}</span><div className="w-full space-y-1 content-start">{evts.map((o,sIdx) => <div key={`evt-${o.id}-${sIdx}`} onClick={e=>{e.stopPropagation();if(isLog)setConfirm({is:true,msg:`[${clients.find(c=>c.id===o.clientId)?.name}] 배송일정을 삭제할까요?`,onC:()=>{setClientOrders(p=>p.map(x=>x.id===o.id?{...x,[`deliveryDate${o.deliveryDate1===dS?1:2}`]:null}:x));setConfirm({is:false});toast('삭제됨');},onX:()=>setConfirm({is:false})});}} className={`p-1.5 rounded-lg shadow-sm text-[10px] font-black text-white hover:scale-95 transition-transform truncate break-keep ${o.deliveryDate1===dS?'bg-blue-500':'bg-green-500'}`}>{Utils.trunc(clients.find(c=>c.id===o.clientId)?.shortName, 8)}</div>)}</div></div>; })}</div></div>
      
      {sm.is && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 max-h-[90vh]">
            <div className="flex-none p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]"><h3 className="text-xl font-black text-blue-600 flex items-center gap-2"><Ic.Truck size={24}/> 배송일 예약</h3><button onClick={()=>setSm({is:false})} className="p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={18}/></button></div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 scrollbar-hide"><div className="text-center font-black text-2xl mb-6 text-gray-800">{sm.d}</div><form id="scForm" onSubmit={submit} className="space-y-4"><div><label className="text-xs font-black text-gray-500 block mb-2">대상 보건소 선택</label><select value={mc} onChange={e=>setMc(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-xl text-sm font-black bg-white outline-none focus:border-blue-500" required><option value="">보건소를 선택하세요</option>{availC.map(c=><option key={`c-${c.id}`} value={c.id}>{c.name}</option>)}</select></div></form></div>
            <div className="flex-none p-6 border-t border-slate-100 bg-white rounded-b-[2.5rem]"><button type="submit" form="scForm" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-black shadow-md transition-colors">예약 확정</button></div>
          </div>
        </div>
      )}

      {showWm && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 max-h-[90vh]">
            <div className="flex-none p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]"><h3 className="text-xl font-black text-blue-600 flex items-center gap-2"><Ic.Cal size={24}/> {yr}년 {mo+1}월 주차 매칭</h3><button onClick={()=>setShowWm(false)} className="p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={18}/></button></div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 min-h-0 scrollbar-hide"><p className="text-xs font-bold text-slate-500 mb-4">시작일과 종료일을 지정하면 AI 발주집계 시 해당 일정이 지정된 주차로 우선 묶입니다.</p>{[1,2,3,4].map(w => <div key={`wm-${w}`} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200"><span className="font-black text-sm text-slate-700 w-12">{w}주차</span><input type="date" value={wmData[`w${w}`]?.s || ''} onChange={e => setWmData({...wmData, [`w${w}`]: {...wmData[`w${w}`], s: e.target.value}})} className="border p-2 rounded-lg text-xs font-black flex-1 outline-none focus:border-blue-500 text-slate-600" /><span className="text-slate-400 font-black">~</span><input type="date" value={wmData[`w${w}`]?.e || ''} onChange={e => setWmData({...wmData, [`w${w}`]: {...wmData[`w${w}`], e: e.target.value}})} className="border p-2 rounded-lg text-xs font-black flex-1 outline-none focus:border-blue-500 text-slate-600" /></div>)}</div>
            <div className="flex-none p-6 border-t border-slate-100 bg-white flex gap-3 rounded-b-[2.5rem]"><button onClick={()=>setShowWm(false)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-50 transition-colors">취소</button><button onClick={saveWm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black shadow-md transition-colors">매칭 저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderDocView = ({ clients=[], clientOrders=[], setClientOrders, items=[], sortedItems=[], clientItemMappings=[], lossRates={}, itemLossRates={}, toast, isLog, globalMonth }) => {
  const [view, setView] = useState(null);
  
  const openOrder = (cId) => {
    const c=clients.find(x=>x.id===cId), ex=clientOrders.find(o=>o.clientId===cId && o.month===globalMonth); 
    if(!ex||(!ex.deliveryDate1&&!ex.deliveryDate2)) return toast('먼저 [스마트 배송일정]에서 배송일을 예약해 주세요.'); 
    const clientMaps = clientItemMappings.filter(ma => ma.clientId === cId);
    let currentMap = clientMaps.find(ma => ma.month === globalMonth) || [...clientMaps].sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0];
    const mapItems = currentMap?.mappedItems || []; 
    const md=mapItems.map(mi => { 
      const g=sortedItems.find(i=>i.id===mi.itemId); let ld = (ex?.items||[]).find(i=>i.uid===mi.uid); 
      const cLoss = itemLossRates[mi.itemId], lg = Utils.getLossGroup(g || {}, lossRates), ls = cLoss !== undefined ? cLoss : (lg ? (lossRates[lg] || 0) : 0);
      return {uid:mi.uid, itemId:mi.itemId, clientItemName:mi.clientItemName||g?.name||'', category:g?.category||'', unit:g?.unit||'', orderUnit:mi.orderUnit||1, boxQuantity:g?.boxQuantity||1, lossRate:ls, qty1:ld?ld.qty1:'', qty2:ld?ld.qty2:'', note:ld?ld.note:'', reqBatchId1:ld?.reqBatchId1, reqBatchId2:ld?.reqBatchId2 }; 
    });
    setView({id:ex.id, month:globalMonth, client:c, items:md, info:ex}); 
  };

  const close = () => { setClientOrders(p=>p.map(o=>o.id===view.id?{...o,items:view.items.map(x=>({uid:x.uid,itemId:x.itemId,qty1:x.qty1,qty2:x.qty2,orderUnit:x.orderUnit,note:x.note,reqBatchId1:x.reqBatchId1,reqBatchId2:x.reqBatchId2}))}:o)); setView(null); toast('자동 저장 완료'); };

  const hPaste = (e, u, f) => { 
    if(!isLog)return; e.preventDefault(); const rs=Utils.parseClip(e); if(!rs.length)return; 
    const fds=['qty1','qty2','note'], sCi=fds.indexOf(f); if(sCi===-1)return; 
    const nx=[...view.items], sRi=nx.findIndex(i=>i.uid===u); if(sRi===-1)return; 
    for(let r=0; r<rs.length; r++) {
      const tr = sRi + r; if(tr>=nx.length) break;
      for(let c=0; c<rs[r].length; c++) {
        const tc = sCi + c; if(tc>=fds.length) break;
        const fd = fds[tc], cel = rs[r][c];
        if(fd==='qty1' && nx[tr].reqBatchId1) continue;
        if(fd==='qty2' && nx[tr].reqBatchId2) continue;
        let v = cel ? cel.text : '';
        if(fd==='qty1'||fd==='qty2') { v = v.replace(/,/g,''); if(v==='') v='0'; }
        nx[tr] = { ...nx[tr], [fd]: v };
      }
    }
    setView({...view,items:nx}); toast('엑셀 데이터 붙여넣기 성공'); 
  };

  const exportOrderEntryExcel = () => {
      const activeClients = clients.filter(c => clientOrders.some(o => o.clientId === c.id && o.month === globalMonth));
      if(activeClients.length === 0) return toast('해당 월에 발주 내역이 있는 보건소가 없습니다.');

      const cols1 = [], cols2 = [];
      activeClients.forEach(c => {
          const ord = clientOrders.find(o => o.clientId === c.id && o.month === globalMonth);
          if (ord) { if (ord.deliveryDate1) cols1.push({ client: c, date: ord.deliveryDate1 }); if (ord.deliveryDate2) cols2.push({ client: c, date: ord.deliveryDate2 }); }
      });
      cols1.sort((a,b) => a.date.localeCompare(b.date)); cols2.sort((a,b) => a.date.localeCompare(b.date));

      let h = `<table><thead><tr><th colspan="${4 + cols1.length + (cols1.length>0?1:0) + cols2.length + (cols2.length>0?1:0) + 1}" class="hdr">${globalMonth}월 보건소별 발주입력 상세 현황</th></tr><tr><th rowspan="2" class="bg-g">No.</th><th rowspan="2" class="bg-g">분류</th><th rowspan="2" class="bg-g l">마스터 품명</th><th rowspan="2" class="bg-g">단위</th>`;
      if (cols1.length > 0) h += `<th colspan="${cols1.length}" class="bg-b">1차 발주</th><th rowspan="2" class="bg-b">1차 소계</th>`;
      if (cols2.length > 0) h += `<th colspan="${cols2.length}" class="bg-gr">2차 발주</th><th rowspan="2" class="bg-gr">2차 소계</th>`;
      h += `<th rowspan="2" class="bg-r r">전체 합계</th></tr><tr>`;
      cols1.forEach(col => { h += `<th class="bg-b">${col.client.shortName}<br/><span class="sub">(${col.date})</span></th>`; });
      cols2.forEach(col => { h += `<th class="bg-gr">${col.client.shortName}<br/><span class="sub">(${col.date})</span></th>`; });
      h += `</tr></thead><tbody>`;

      let idx = 1;
      sortedItems.forEach(ms => {
          let t1 = 0, t2 = 0; const cData1 = {}, cData2 = {}; let hasOrder = false;
          const sumQ = (col, qF) => {
              const ord = clientOrders.find(o => o.clientId === col.client.id && o.month === globalMonth);
              let t=0; 
              (ord?.items?.filter(i => i.itemId === ms.id)||[]).forEach(oi => {
                  let u = oi.orderUnit; 
                  if (u == null) { 
                      const cm = clientItemMappings.filter(ma => ma.clientId === col.client.id); 
                      let m = cm.find(ma => ma.month === globalMonth) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; 
                      u = m?.mappedItems?.find(mi => mi.uid === oi.uid)?.orderUnit || 1; 
                  }
                  t += (Number(oi[qF]) || 0) * (Number(u) || 1);
              }); 
              return t;
          };
          cols1.forEach(col => { const q = sumQ(col, 'qty1'); cData1[col.client.id] = q; t1 += q; if (q > 0) hasOrder = true; });
          cols2.forEach(col => { const q = sumQ(col, 'qty2'); cData2[col.client.id] = q; t2 += q; if (q > 0) hasOrder = true; });
          if (hasOrder) {
              h += `<tr><td>${idx++}</td><td>${ms.category}</td><td class="l fw-b">${ms.name}</td><td>${ms.unit}</td>`;
              cols1.forEach(col => { h += `<td class="num n-gen">${cData1[col.client.id] || ''}</td>`; });
              if (cols1.length > 0) h += `<td class="bg-b num t-b fw-b n-gen">${t1 || ''}</td>`;
              cols2.forEach(col => { h += `<td class="num n-gen">${cData2[col.client.id] || ''}</td>`; });
              if (cols2.length > 0) h += `<td class="bg-gr num fw-b n-gen" style="color:#166534;">${t2 || ''}</td>`;
              h += `<td class="bg-y r num fw-b n-gen">${t1+t2 || ''}</td></tr>`;
          }
      });
      h += `</tbody></table>`; Utils.dlExcelCustom(h, `발주입력_상세현황_${globalMonth}`);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in relative h-full flex flex-col min-h-0">
      <div className="flex justify-between items-end mb-4 flex-wrap gap-4 flex-none">
        <div><h2 className="text-2xl font-bold">보건소 발주서 접수 (엑셀 복붙)</h2><p className="text-[11px] text-gray-500 mt-1">엑셀 표를 복사(Ctrl+C)하여 수량 칸에 붙여넣기(Ctrl+V) 하세요.</p></div>
        <div className="flex gap-2 flex-wrap items-center"><button onClick={exportOrderEntryExcel} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-green-100 transition-colors"><Ic.File size={14}/> 발주입력 상세 엑셀 (가로형)</button></div>
      </div>
      
      {!view && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 flex-1 overflow-y-auto scrollbar-hide">
          {clients.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c => {
            const o = clientOrders.find(x=>x.clientId===c.id&&x.month===globalMonth);
            const q1 = o?.items?.filter(i=>Number(i.qty1)>0).length||0, q2 = o?.items?.filter(i=>Number(i.qty2)>0).length||0, isReg = q1>0 || q2>0;
            return (
              <div key={`client-ord-${c.id}`} onClick={()=>openOrder(c.id)} className={`group relative p-5 rounded-2xl shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col gap-4 overflow-hidden ${isReg ? 'bg-white border-blue-300 ring-1 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                 <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full transition-transform duration-500 group-hover:scale-150 opacity-20 ${isReg ? 'bg-blue-200' : 'bg-slate-200'}`}></div>
                 <div className="flex items-center gap-3 relative z-10"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${isReg ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}><Ic.Clip size={20}/></div><div className="flex-1 min-w-0"><h3 className="font-black text-[13px] text-slate-800 truncate break-keep">{c.name}</h3></div></div>
                 <div className="relative z-10 mt-auto flex gap-2 text-[10px] font-black"><div className={`flex-1 py-2 rounded-lg text-center border transition-colors ${q1>0?'bg-blue-50 text-blue-700 border-blue-200':'bg-slate-50 text-slate-400 border-slate-100'}`}>1차: {q1}건</div><div className={`flex-1 py-2 rounded-lg text-center border transition-colors ${q2>0?'bg-green-50 text-green-700 border-green-200':'bg-slate-50 text-slate-400 border-slate-100'}`}>2차: {q2}건</div></div>
              </div>
            );
          })}
        </div>
      )}

      {view && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-2xl border border-slate-200 h-[90vh] max-h-[850px] animate-scale-up">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-4 rounded-t-[2.5rem]">
              <div><h3 className="text-xl sm:text-2xl font-black text-[#8b2f97] flex items-center gap-3"><Ic.Clip size={28}/> [{view.month}] {view.client.name} 발주 내역</h3><p className="text-[11px] text-gray-500 font-bold mt-2 pl-10">1차 배송: {view.info.deliveryDate1||'미정'} &nbsp; | &nbsp; 2차 배송: {view.info.deliveryDate2||'미정'}</p></div>
              <button onClick={close} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button>
            </div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-y-auto w-full flex-1 scrollbar-hide">
                  <table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-100 sticky top-0 z-10 border-b shadow-sm"><tr><th className="px-1 py-2 w-[4%] font-black break-keep">#</th><th className="px-1 py-2 w-[10%] font-black border-l break-keep">분류</th><th className="px-1 py-2 w-[22%] bg-purple-50 text-purple-900 font-black border-l break-keep">보건소 등록명칭</th><th className="px-1 py-2 w-[8%] font-black border-l break-keep leading-tight">단위<br/><span className="text-[8px] text-gray-500 font-medium">(발주/입수)</span></th><th className="px-1 py-2 w-[9%] bg-blue-50 text-blue-900 font-black border-l break-keep">1차발주량</th><th className="px-1 py-2 w-[9%] bg-green-50 text-green-900 font-black border-l break-keep">2차발주량</th><th className="px-1 py-2 w-[8%] bg-amber-50 text-amber-900 font-black border-l break-keep leading-tight">기본수량<br/><span className="text-[8px] font-medium">(낱개)</span></th><th className="px-1 py-2 w-[8%] bg-slate-200 text-slate-800 font-black border-l break-keep">기본박스</th><th className="px-1 py-2 w-[8%] bg-purple-100 text-purple-900 font-black border-l break-keep leading-tight">AI발주<br/><span className="text-[8px] font-medium">(Box)</span></th><th className="px-1 py-2 w-[14%] font-black border-l break-keep">비고</th></tr></thead><tbody>{view.items.map((it, i)=>{const q1=Number(it.qty1)||0, q2=Number(it.qty2)||0, rawPieces=(q1*Number(it.orderUnit))+(q2*Number(it.orderUnit)), baseBoxes=Math.ceil(rawPieces/Number(it.boxQuantity)), aiBoxes=Math.ceil(baseBoxes*(1+(Number(it.lossRate)/100))); return <tr key={`ord-item-${it.uid}`} className="border-b hover:bg-gray-50"><td className="px-1 py-1 text-gray-400 font-bold break-keep">{it+1}</td><td className="px-1 py-1 text-gray-600 font-bold border-l break-keep">{it.category}</td><td className="px-1.5 py-1 text-purple-800 font-black text-left border-l break-words">{it.clientItemName}</td><td className="px-1 py-1 text-gray-500 border-l break-keep leading-tight">{it.unit}<br/><span className="text-[8px]">({it.orderUnit}/{it.boxQuantity})</span></td><td className="px-1 py-1 bg-blue-50/30 border-l">{it.reqBatchId1 ? <div className="text-[9px] text-gray-400 break-keep">송부완료</div> : <NumInp v={it.qty1} setV={v=>{const nx=view.items.map(x=>x.uid===it.uid?{...x,qty1:v}:x);setView({...view,items:nx});setClientOrders(p=>p.map(o=>o.id===view.id?{...o,items:nx}:o));}} onPaste={e=>hPaste(e, it.uid, 'qty1')} cls="w-full min-w-[36px] px-1 py-1.5 text-blue-700 text-center bg-white border border-transparent focus:border-blue-300 rounded shadow-sm text-[11px] transition-colors" />}</td><td className="px-1 py-1 bg-green-50/30 border-l">{it.reqBatchId2 ? <div className="text-[9px] text-gray-400 break-keep">송부완료</div> : <NumInp v={it.qty2} setV={v=>{const nx=view.items.map(x=>x.uid===it.uid?{...x,qty2:v}:x);setView({...view,items:nx});setClientOrders(p=>p.map(o=>o.id===view.id?{...o,items:nx}:o));}} onPaste={e=>hPaste(e, it.uid, 'qty2')} cls="w-full min-w-[36px] px-1 py-1.5 text-green-700 text-center bg-white border border-transparent focus:border-green-300 rounded shadow-sm text-[11px] transition-colors" />}</td><td className="px-1 py-1 bg-amber-50/30 border-l font-black text-amber-700 break-keep">{Utils.fmt(rawPieces)}</td><td className="px-1 py-1 bg-slate-100/50 border-l font-black text-slate-700 break-keep">{Utils.fmt(baseBoxes)}</td><td className="px-1 py-1 bg-purple-50/50 border-l font-black text-purple-700 break-keep">{Utils.fmt(aiBoxes)}</td><td className="px-1 py-1 border-l"><TInp v={it.note} setV={v=>{const nx=view.items.map(x=>x.uid===it.uid?{...x,note:v}:x);setView({...view,items:nx});setClientOrders(p=>p.map(o=>o.id===view.id?{...o,items:nx}:o));}} onPaste={e=>hPaste(e, it.uid, 'note')} cls="w-full px-1 py-1 bg-white border border-transparent focus:border-gray-300 rounded shadow-sm text-left text-[10px] break-words transition-colors"/></td></tr>})}</tbody></table>
                </div>
              </div>
            </div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center rounded-b-[2.5rem]"><span className="text-[10px] text-rose-500 font-bold hidden md:inline-block bg-rose-50 px-4 py-2 rounded-xl">엑셀의 표 데이터를 복사하여 1차 또는 2차 입력칸에 붙여넣기 하세요. (콤마 자동 인식)</span><button onClick={close} className="bg-[#8b2f97] hover:bg-purple-800 text-white px-12 py-4 rounded-xl font-black shadow-md w-full md:w-auto transition-transform hover:-translate-y-0.5 text-base">작성 완료 (자동저장)</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderSummaryCalculationView = ({ clients=[], items=[], suppliers=[], clientOrders=[], lossRates={}, setLossRates, itemLossRates={}, setItemLossRates, aiOrderOverrides=[], weekMappings={}, toast, isLog, sortOrder=[], clientItemMappings=[], globalMonth }) => {
  const [wk, setWk] = useState('all'), [exportMode, setExportMode] = useState('basic'), [matchingRule, setMatchingRule] = useState(null), [editingRule, setEditingRule] = useState(null);

  const weeklyClientStatus = useMemo(() => {
    const weeks = { 1: [], 2: [], 3: [], 4: [] };
    clientOrders.filter(o => o.month === globalMonth).forEach(o => {
        const client = clients.find(c => c.id === o.clientId), clientName = client ? client.shortName : '알수없음';
        if (o.deliveryDate1) { const w1 = Utils.getWeek(o.deliveryDate1, weekMappings); if (w1 >= 1 && w1 <= 4) { const items1 = o.items.filter(it => Number(it.qty1) > 0); if (items1.length > 0) weeks[w1].push({ name: clientName, type: '1차', isDone: items1.length === items1.filter(it => it.reqBatchId1).length }); } }
        if (o.deliveryDate2) { const w2 = Utils.getWeek(o.deliveryDate2, weekMappings); if (w2 >= 1 && w2 <= 4) { const items2 = o.items.filter(it => Number(it.qty2) > 0); if (items2.length > 0) weeks[w2].push({ name: clientName, type: '2차', isDone: items2.length === items2.filter(it => it.reqBatchId2).length }); } }
    });
    return weeks;
  }, [clientOrders, globalMonth, clients, weekMappings]);

  const aggregatedList = useMemo(() => {
    const rawTotals = {}, itemRefs = {}; 
    clientOrders.filter(o => o.month === globalMonth).forEach(or => { 
      const proc = (dt, qF, bF) => { 
        if (!dt) return; if (wk !== 'all' && String(Utils.getWeek(dt, weekMappings)) !== String(wk)) return;
        (or.items || []).forEach(it => { 
          if(it[bF]) return; const ms = items.find(i => i.id === it.itemId); 
          if (ms) { 
            let oUnit = it.orderUnit;
            if (oUnit == null) { const cm = clientItemMappings.filter(ma => ma.clientId === or.clientId); let m = cm.find(ma => ma.month === globalMonth) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; oUnit = m?.mappedItems?.find(mi => mi.uid === it.uid)?.orderUnit || 1; }
            const totPieces = (parseFloat(it[qF]) || 0) * (parseFloat(oUnit) || 1); 
            if (totPieces > 0) { rawTotals[it.itemId] = (rawTotals[it.itemId] || 0) + totPieces; if(!itemRefs[it.itemId]) itemRefs[it.itemId] = []; itemRefs[it.itemId].push({ orderId: or.id, uid: it.uid, bF, clientName: clients.find(c=>c.id===or.clientId)?.name, deliveryDate: dt, type: qF==='qty1'?'1차':'2차', qty: totPieces, rawInput: parseFloat(it[qF])||0 }); } 
          } 
        }); 
      }; proc(or.deliveryDate1, 'qty1', 'reqBatchId1'); proc(or.deliveryDate2, 'qty2', 'reqBatchId2'); 
    }); 
    const result = [];
    Object.keys(rawTotals).forEach(itemId => {
       const ms = items.find(i => i.id === itemId); if (!ms) return;
       const rem = rawTotals[itemId]; 
       if (rem > 0) {
          const bx = ms.boxQuantity || 1, cLoss = itemLossRates[itemId], lg = Utils.getLossGroup(ms, lossRates), ls = cLoss !== undefined ? cLoss : (lg ? (lossRates[lg] || 0) : 0);
          const baseBoxes = Math.ceil(rem / bx), calcAiBoxes = Math.ceil(baseBoxes * (1 + (ls / 100))), finalBoxes = calcAiBoxes;
          result.push({ ...ms, supplierName: suppliers.find(s=>s.id===ms.supplierId)?.name || '미지정', remainingPieces: rem, baseBoxes, lossRate: ls, finalBoxes, unitPrice: ms.unitPrice || 0, refs: itemRefs[itemId] });
       }
    });
    return Utils.sortItems(result, sortOrder);
  }, [clientOrders, globalMonth, wk, items, lossRates, itemLossRates, sortOrder, suppliers, clients, weekMappings, clientItemMappings]);

  const exportExcelVertical = () => {
     const isAi = exportMode === 'ai';
     let h = `<table><thead><tr><th colspan="${isAi?9:8}" class="hdr">${globalMonth} 보건소 전체 발주 종합 (세로형) - ${isAi ? 'AI수량(Box)' : '기본수량(낱개)'}</th></tr><tr><th class="bg-g">배송일</th><th class="bg-g">기관명</th><th class="bg-g">차수</th><th class="bg-g l">품목명</th><th class="bg-g">단위</th><th class="bg-g">입수</th><th class="bg-g">수량(낱개)</th>`;
     if(isAi) h += `<th class="bg-p p">AI발주(Box)</th>`; h += `<th class="bg-g">비고</th></tr></thead><tbody>`;
     const allDetails = [];
     aggregatedList.forEach(it => { it.refs.forEach(ref => { let exportQty = isAi ? Math.ceil(Math.ceil(ref.qty / (it.boxQuantity || 1)) * (1 + (it.lossRate||0)/100)) : ref.qty; allDetails.push({ ...ref, itemName: it.name, unit: it.unit, boxQuantity: it.boxQuantity || 1, lossRate: it.lossRate, qty: exportQty, raw: ref.rawInput }); }); });
     allDetails.sort((a,b)=>(a.deliveryDate||'').localeCompare(b.deliveryDate||'') || (a.clientName||'').localeCompare(b.clientName||''));
     allDetails.forEach(d => {
        h += `<tr><td>${d.deliveryDate}</td><td class="l">${d.clientName}</td><td>${d.type}</td><td class="l fw-b">${d.itemName}</td><td>${d.unit}</td><td class="num n-gen">${d.boxQuantity}</td><td class="num t-b n-gen">${d.raw}</td>`;
        if (isAi) h += `<td class="bg-p num n-box">${d.qty}</td>`;
        h += `<td></td></tr>`;
     });
     h += `</tbody></table>`; Utils.dlExcelCustom(h, `보건소전체발주종합_세로형_${isAi?'AI':'기본'}_${globalMonth}`);
  };

  const exportExcelHorizontal = () => {
     const isAi = exportMode === 'ai', activeClients = clients.filter(c => clientOrders.some(o => o.clientId === c.id && o.month === globalMonth));
     let h = `<table><thead><tr><th colspan="${5 + activeClients.length*2 + (isAi?6:3)}" class="hdr">${globalMonth}월 보건소 통합 발주 집계표 (가로형) - ${isAi ? 'AI추천발주 적용' : '기본수량'}</th></tr><tr><th rowspan="2" class="bg-g">No.</th><th rowspan="2" class="bg-g">분류</th><th rowspan="2" class="bg-g l">품목명</th><th rowspan="2" class="bg-g">단위</th><th rowspan="2" class="bg-g">입수</th>`;
     activeClients.forEach(c => h += `<th colspan="2" class="bg-b">${c.shortName}</th>`); h += `<th colspan="${isAi?6:3}" class="bg-r r">전체 합계</th></tr><tr>`;
     activeClients.forEach(c => { const ord = clientOrders.find(o => o.clientId === c.id && o.month === globalMonth), d1 = ord?.deliveryDate1?.substring(5)||'미정', d2 = ord?.deliveryDate2?.substring(5)||'미정'; h += `<th class="bg-gr">1차<br/><span class="sub">(${d1})</span></th><th class="bg-gr">2차<br/><span class="sub">(${d2})</span></th>`; });
     if (isAi) h += `<th class="bg-r">1차(낱개)</th><th class="bg-p p">1차(Box)</th><th class="bg-r">2차(낱개)</th><th class="bg-p p">2차(Box)</th><th class="bg-r r">총합계(낱개)</th><th class="bg-p p">총발주(Box)</th></tr></thead><tbody>`;
     else h += `<th class="bg-r">1차(낱개)</th><th class="bg-r">2차(낱개)</th><th class="bg-r r">총합계(낱개)</th></tr></thead><tbody>`;
     let idx = 1;
     aggregatedList.forEach(it => {
        h += `<tr><td>${idx++}</td><td>${it.category}</td><td class="l fw-b">${it.name}</td><td>${it.unit}</td><td class="num n-gen">${it.boxQuantity||1}</td>`;
        let t1_raw=0, t2_raw=0, t1_tot=0, t2_tot=0;
        activeClients.forEach(c => { 
           let q1_raw=0, q2_raw=0, q1_tot=0, q2_tot=0; 
           it.refs.filter(r=>r.clientName===c.name).forEach(r => { if(r.type==='1차'){q1_raw+=r.rawInput; q1_tot+=r.qty;} else {q2_raw+=r.rawInput; q2_tot+=r.qty;} }); 
           t1_raw+=q1_raw; t2_raw+=q2_raw; t1_tot+=q1_tot; t2_tot+=q2_tot; 
           h += `<td class="num n-gen">${q1_raw||''}</td><td class="num n-gen">${q2_raw||''}</td>`; 
        });
        if (isAi) {
            const cb1 = Math.ceil(t1_tot / (it.boxQuantity || 1)), aiB1 = t1_tot>0 ? Math.ceil(cb1 * (1 + (it.lossRate||0)/100)) : 0;
            const cb2 = Math.ceil(t2_tot / (it.boxQuantity || 1)), aiB2 = t2_tot>0 ? Math.ceil(cb2 * (1 + (it.lossRate||0)/100)) : 0;
            const totAiB = aiB1 + aiB2;
            h += `<td class="bg-y num n-gen">${t1_raw||''}</td><td class="bg-p num n-box">${aiB1||''}</td><td class="bg-y num n-gen">${t2_raw||''}</td><td class="bg-p num n-box">${aiB2||''}</td><td class="bg-y r num n-gen fw-b">${t1_raw+t2_raw||''}</td><td class="bg-p num n-box fw-b">${totAiB}</td></tr>`;
        } else {
            h += `<td class="bg-y num n-gen">${t1_raw||''}</td><td class="bg-y num n-gen">${t2_raw||''}</td><td class="bg-y r num n-gen fw-b">${t1_raw+t2_raw||''}</td></tr>`;
        }
     }); h += `</tbody></table>`; Utils.dlExcelCustom(h, `보건소통합발주집계표_가로형_${isAi?'AI':'기본'}_${globalMonth}`);
  };

  const exportExcelWeeklyBySupplier = () => {
      const isAi = exportMode === 'ai';
      let h = `<table><thead><tr><th colspan="${isAi?16:11}" class="hdr">${globalMonth}월 차수별 거래처 발주내역 (가로형) - ${isAi?'AI추천발주':'기본수량'}</th></tr><tr><th class="bg-g">No.</th><th class="bg-g">거래처</th><th class="bg-g">분류</th><th class="bg-g l">품목명</th><th class="bg-g">단위</th><th class="bg-g">입수</th>`;
      if(isAi) h += `<th class="bg-gr">1주차(낱개)</th><th class="bg-p p">1주차(Box)</th><th class="bg-gr">2주차(낱개)</th><th class="bg-p p">2주차(Box)</th><th class="bg-gr">3주차(낱개)</th><th class="bg-p p">3주차(Box)</th><th class="bg-gr">4주차(낱개)</th><th class="bg-p p">4주차(Box)</th><th class="bg-r r">총합계(낱개)</th><th class="bg-p p">총발주(Box)</th></tr></thead><tbody>`;
      else h += `<th class="bg-gr">1주차(낱개)</th><th class="bg-gr">2주차(낱개)</th><th class="bg-gr">3주차(낱개)</th><th class="bg-gr">4주차(낱개)</th><th class="bg-r r">총합계(낱개)</th></tr></thead><tbody>`;
      const weeklyData = [];
      aggregatedList.forEach(it => {
          let w1Raw=0, w2Raw=0, w3Raw=0, w4Raw=0, w1Tot=0, w2Tot=0, w3Tot=0, w4Tot=0;
          it.refs.forEach(r => { const w = Utils.getWeek(r.deliveryDate, weekMappings); if (w === 1) {w1Raw+=r.rawInput; w1Tot+=r.qty;} if (w === 2) {w2Raw+=r.rawInput; w2Tot+=r.qty;} if (w === 3) {w3Raw+=r.rawInput; w3Tot+=r.qty;} if (w >= 4) {w4Raw+=r.rawInput; w4Tot+=r.qty;} });
          const totalRaw = w1Raw + w2Raw + w3Raw + w4Raw;
          if (totalRaw > 0) weeklyData.push({ supplierName: it.supplierName, category: it.category, name: it.name, unit: it.unit, bq: it.boxQuantity||1, ls: it.lossRate||0, w1Raw, w2Raw, w3Raw, w4Raw, totalRaw, w1Tot, w2Tot, w3Tot, w4Tot });
      });
      weeklyData.sort((a, b) => a.supplierName.localeCompare(b.supplierName) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      const calcBox = (raw, bq, ls) => raw > 0 ? Math.ceil(Math.ceil(raw / bq) * (1 + (ls / 100))) : 0; let idx = 1;
      weeklyData.forEach(d => {
          h += `<tr><td>${idx++}</td><td class="fw-b">${d.supplierName}</td><td>${d.category}</td><td class="l fw-b">${d.name}</td><td>${d.unit}</td><td class="num n-gen">${d.bq}</td>`;
          if(isAi) {
              const b1=calcBox(d.w1Tot,d.bq,d.ls), b2=calcBox(d.w2Tot,d.bq,d.ls), b3=calcBox(d.w3Tot,d.bq,d.ls), b4=calcBox(d.w4Tot,d.bq,d.ls);
              h += `<td class="num n-gen">${d.w1Raw||''}</td><td class="bg-p num n-box fw-b">${b1||''}</td><td class="num n-gen">${d.w2Raw||''}</td><td class="bg-p num n-box fw-b">${b2||''}</td><td class="num n-gen">${d.w3Raw||''}</td><td class="bg-p num n-box fw-b">${b3||''}</td><td class="num n-gen">${d.w4Raw||''}</td><td class="bg-p num n-box fw-b">${b4||''}</td><td class="bg-y r num n-gen fw-b">${d.totalRaw||''}</td><td class="bg-p num n-box fw-b">${b1+b2+b3+b4}</td></tr>`;
          } else h += `<td class="num t-b n-gen">${d.w1Raw||''}</td><td class="num t-b n-gen">${d.w2Raw||''}</td><td class="num t-b n-gen">${d.w3Raw||''}</td><td class="num t-b n-gen">${d.w4Raw||''}</td><td class="bg-y r num n-gen fw-b">${d.totalRaw||''}</td></tr>`;
      }); h += `</tbody></table>`; Utils.dlExcelCustom(h, `차수별_거래처_발주내역_${isAi?'AI':'기본'}_${globalMonth}`);
  };

  const exportExcelSummary = () => {
     let h = ''; const isAi = exportMode === 'ai';
     const renderTable = (title, typeFilter, bgColor) => {
        const filtered = aggregatedList.map(it => { 
            const refs = typeFilter === 'all' ? it.refs : it.refs.filter(r => r.type === typeFilter); if(refs.length === 0) return null; 
            const rawSum = refs.reduce((sum, r) => sum + r.rawInput, 0), totSum = refs.reduce((sum, r) => sum + r.qty, 0); 
            const baseBoxes = Math.ceil(totSum / (it.boxQuantity||1)), aiBoxes = Math.ceil(baseBoxes * (1 + (it.lossRate/100))); 
            return { ...it, rawSum, baseBoxes, aiBoxes }; 
        }).filter(Boolean);
        if(filtered.length===0) return '';
        let tHtml = `<br/><table><thead><tr><th colspan="${isAi?8:6}" class="hdr" style="background:${bgColor}; color:#333;">${title} - ${isAi?'AI추천발주':'기본수량'}</th></tr><tr><th class="bg-g">No.</th><th class="bg-g">분류</th><th class="bg-g l">품목명</th><th class="bg-g">수량(낱개)</th>`;
        if (isAi) tHtml += `<th class="bg-g">기본박스</th><th class="bg-p">AI발주(Box)</th>`;
        tHtml += `<th class="bg-g">거래처</th><th class="bg-g">비고</th></tr></thead><tbody>`; let idx=1;
        filtered.forEach(it => { tHtml += `<tr><td>${idx++}</td><td>${it.category}</td><td class="l fw-b">${it.name}</td><td class="num t-b n-gen">${it.rawSum||''}</td>`; if (isAi) tHtml += `<td class="num n-box fw-b">${it.baseBoxes}</td><td class="bg-p num n-box">${it.aiBoxes}</td>`; tHtml += `<td class="l">${it.supplierName}</td><td></td></tr>`; }); return tHtml + `</tbody></table>`;
     };
     h += renderTable(`1차 집계 (${globalMonth})`, '1차', '#ddebf7'); h += renderTable(`2차 집계 (${globalMonth})`, '2차', '#e2efda'); h += renderTable(`총합계 (${globalMonth})`, 'all', '#fce4d6'); Utils.dlExcelCustom(h, `구매집계보고서_${isAi?'AI':'기본'}_${globalMonth}`);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in relative flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 pb-4 border-b gap-4 flex-none">
        <div><h2 className="text-2xl font-bold">AI 발주 자동 집계</h2><p className="text-[11px] text-gray-500 mt-1">발주서의 미요청 잔량을 합산하여 엑셀 추출 용도로 사용합니다.</p></div>
        <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
           <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
               <button onClick={()=>setExportMode('basic')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${exportMode==='basic' ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-slate-500 hover:bg-slate-200'}`}>🔵 기본수량 (낱개)</button>
               <button onClick={()=>setExportMode('ai')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${exportMode==='ai' ? 'bg-white text-purple-600 shadow-sm border border-purple-200' : 'text-slate-500 hover:bg-slate-200'}`}>🟣 AI추천 (Box)</button>
           </div>
           <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={exportExcelVertical} className="px-4 py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-pink-100 transition-colors"><Ic.File size={14}/> 보건소 발주 (세로형)</button>
              <button onClick={exportExcelHorizontal} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-purple-100 transition-colors"><Ic.File size={14}/> 통합 집계표 (가로형)</button>
              <button onClick={exportExcelWeeklyBySupplier} className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-orange-100 transition-colors"><Ic.File size={14}/> 차수별 거래처 발주</button>
              <button onClick={exportExcelSummary} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-blue-100 transition-colors"><Ic.File size={14}/> 구매 집계표 (차수별)</button>
           </div>
        </div>
      </div>
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-[10px] text-center table-fixed">
           <thead className="bg-gray-100 sticky top-0 z-10 border-b shadow-sm"><tr><th className="p-3 w-10">#</th><th className="p-3 text-left">품명(규격)</th><th className="p-3 w-16">분류</th><th className="p-3 w-32 text-blue-600 bg-blue-50 border-l border-r">거래처</th><th className="p-3 w-20 bg-white">기본수량(낱개)</th><th className="p-3 w-20 bg-gray-50 border-l border-r">기본박스</th><th className="p-3 w-20 text-purple-600 bg-purple-50/50 cursor-pointer hover:underline" onClick={()=>toast('아래 박스 수량을 수정하면 로스율에 관계없이 강제 고정됩니다.')}>로스율(%)</th><th className="p-3 w-20 bg-purple-100 text-purple-900 border-l border-r">AI추천(Box)</th></tr></thead>
           <tbody>{aggregatedList.map((it, idx) => <tr key={`agg-item-${it.id}`} className="border-b hover:bg-gray-50"><td className="p-2 text-gray-400 font-black">{idx+1}</td><td className="p-1.5 py-1 font-black text-left text-gray-800 truncate">{it.name} <span className="text-[9px] text-gray-400">({it.unit})</span></td><td className="p-2 font-bold text-gray-500">{it.category}</td><td className="p-2 text-blue-600 font-bold bg-blue-50/30 border-l border-r truncate">{it.supplierName}</td><td className="p-2 font-black text-gray-800 bg-white text-[13px]">{Utils.fmt(it.remainingPieces)}</td><td className="p-2 font-black text-gray-800 bg-gray-50 text-[13px] border-l border-r">{Utils.fmt(it.baseBoxes)}</td><td className="p-2 font-black text-purple-500 bg-purple-50/10" onClick={()=>{if(isLog)setMatchingRule({name:it.name, id:it.id, rate:it.lossRate});}}>{it.lossRate}% <Ic.Edit size={10} className="inline opacity-50"/></td><td className="p-3 bg-purple-50/30 border-l border-r font-black text-purple-800 text-[13px]">{Utils.fmt(it.finalBoxes)}</td></tr>)}</tbody>
        </table>
      </div>
      {matchingRule && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 max-h-[90vh]">
            <div className="flex-none p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2rem]"><h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Ic.Settings size={20} className="text-purple-600"/> 강제 로스율 할당</h2><button onClick={()=>setMatchingRule(null)} className="p-2 bg-slate-100 rounded-full hover:text-rose-500 transition-colors"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-6 bg-slate-50 flex flex-col justify-center gap-4 min-h-0"><p className="text-xs font-bold text-gray-500">[{matchingRule.name}] 품목에 대해서만 적용할 고유 로스율(%)을 입력하세요.</p><input type="number" defaultValue={matchingRule.rate} id="spLossInp" className="w-full border-2 border-slate-300 p-4 rounded-xl text-lg text-center font-black outline-none focus:border-purple-600" /></div>
            <div className="flex-none p-6 border-t border-slate-100 bg-white rounded-b-[2rem]"><button onClick={()=>{const v=document.getElementById('spLossInp').value; if(v){setItemLossRates({...itemLossRates,[matchingRule.id]:Number(v)}); toast('개별 로스율 적용됨'); setMatchingRule(null);}}} className="w-full bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl font-black shadow-md transition-colors">변경 사항 저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseOrderManagement = ({ clients=[], items=[], suppliers=[], clientOrders=[], setClientOrders, purchaseRequests=[], setPurchaseRequests, lossRates={}, itemLossRates={}, aiOrderOverrides=[], payments=[], setPayments, weekMappings={}, toast, isLog, setSuppliers, clientItemMappings=[], globalMonth }) => {
  const [viewSupId, setViewSupId] = useState(null), [activeTab, setActiveTab] = useState('incomplete'), [orderMode, setOrderMode] = useState('all'), [selectedWk, setSelectedWk] = useState('1'), [drafts, setDrafts] = useState({});
  const targetWk = orderMode === 'all' ? 'all' : selectedWk;
  const targetM = globalMonth;

  const weeklyClientStatus = useMemo(() => {
    const weeks = { 1: [], 2: [], 3: [], 4: [] };
    clientOrders.filter(o => o.month === targetM).forEach(o => {
        const client = clients.find(c => c.id === o.clientId), clientName = client ? client.shortName : '알수없음';
        if (o.deliveryDate1) { const w1 = Utils.getWeek(o.deliveryDate1, weekMappings); if (w1 >= 1 && w1 <= 4) { const items1 = o.items.filter(it => Number(it.qty1) > 0); if (items1.length > 0) weeks[w1].push({ name: clientName, type: '1차', isDone: items1.length === items1.filter(it => it.reqBatchId1).length }); } }
        if (o.deliveryDate2) { const w2 = Utils.getWeek(o.deliveryDate2, weekMappings); if (w2 >= 1 && w2 <= 4) { const items2 = o.items.filter(it => Number(it.qty2) > 0); if (items2.length > 0) weeks[w2].push({ name: clientName, type: '2차', isDone: items2.length === items2.filter(it => it.reqBatchId2).length }); } }
    }); return weeks;
  }, [clientOrders, targetM, clients, weekMappings]);

  const getStats = useCallback((itemId) => {
    let rawPieces = 0;
    clientOrders.filter(o => o.month === targetM).forEach(o => { o.items.forEach(oi => { if (oi.itemId === itemId) {
            let oUnit = oi.orderUnit; if (oUnit == null) { const cm = clientItemMappings.filter(ma => ma.clientId === o.clientId); let m = cm.find(ma => ma.month === targetM) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; oUnit = m?.mappedItems?.find(mi => mi.uid === oi.uid)?.orderUnit || 1; }
            const w1 = Utils.getWeek(o.deliveryDate1, weekMappings), w2 = Utils.getWeek(o.deliveryDate2, weekMappings);
            if (targetWk === 'all' || w1 === parseInt(targetWk)) rawPieces += Number(oi.qty1||0) * Number(oUnit);
            if (targetWk === 'all' || w2 === parseInt(targetWk)) rawPieces += Number(oi.qty2||0) * Number(oUnit);
         }
      })
    });
    const ms = items.find(i=>i.id===itemId), bq = ms?.boxQuantity || 1, baseBoxes = Math.ceil(rawPieces / bq), cLoss = itemLossRates[itemId], lg = Utils.getLossGroup(ms, lossRates), appliedLoss = cLoss !== undefined ? cLoss : (lg ? (lossRates[lg] || 0) : 0);
    const calcAiBoxes = Math.ceil(baseBoxes * (1 + (appliedLoss / 100))); let finalNeededBoxes = calcAiBoxes;
    if (aiOrderOverrides[itemId] !== undefined) finalNeededBoxes = aiOrderOverrides[itemId];
    let confirmedBoxes = 0; purchaseRequests.filter(pr => pr.status !== 'requested' && pr.periodKey?.startsWith(targetM)).forEach(pr => { const prWk = pr.periodKey.split('-W')[1]; if (targetWk === 'all' || prWk === String(targetWk) || prWk === 'all') { pr.items.forEach(pi => { if (pi.itemId === itemId) confirmedBoxes += Number(pi.reqBoxes||0); }) } });
    return { neededBoxes: finalNeededBoxes, confirmedBoxes, remainingBoxes: Math.max(0, finalNeededBoxes - confirmedBoxes), rawPieces, baseBoxes, appliedLoss };
  }, [clientOrders, purchaseRequests, targetM, targetWk, items, lossRates, itemLossRates, aiOrderOverrides, weekMappings, clientItemMappings]);

  const reqs = useMemo(()=>purchaseRequests.filter(p=>{ if (!p.periodKey) return true; if (targetWk === 'all') return p.periodKey.startsWith(targetM); return p.periodKey === `${targetM}-W${targetWk}` || p.periodKey === `${targetM}-Wall`; }), [purchaseRequests, targetM, targetWk]);

  const supplierData = useMemo(() => {
     const supMap = {};
     clientOrders.filter(o => o.month === targetM).forEach(or => {
        const p1 = or.deliveryDate1, p2 = or.deliveryDate2, w1 = Utils.getWeek(p1, weekMappings), w2 = Utils.getWeek(p2, weekMappings);
        (or.items || []).forEach(it => {
            const masterItem = items.find(i => i.id === it.itemId); if (!masterItem) return;
            let oUnit = it.orderUnit; if (oUnit == null) { const cm = clientItemMappings.filter(ma => ma.clientId === or.clientId); let m = cm.find(ma => ma.month === targetM) || [...cm].sort((a,b)=>(b.month||'').localeCompare(a.month||''))[0]; oUnit = m?.mappedItems?.find(mi => mi.uid === it.uid)?.orderUnit || 1; }
            const sId = masterItem.supplierId || 'U'; if (!supMap[sId]) supMap[sId] = { id: sId, needed: 0, confirmed: 0, items: {}, prs: [] }; if (!supMap[sId].items[masterItem.id]) supMap[sId].items[masterItem.id] = { ms: masterItem, rawPieces: 0 };
            const addQty = (qtyStr, dt, w) => { if (!dt) return; if (targetWk !== 'all' && String(w) !== String(targetWk)) return; const tot = (parseFloat(qtyStr) || 0) * parseFloat(oUnit); if (tot > 0) supMap[sId].items[masterItem.id].rawPieces += tot; }; addQty(it.qty1, p1, w1); addQty(it.qty2, p2, w2);
        });
     });
     Object.keys(supMap).forEach(sId => { Object.keys(supMap[sId].items).forEach(itemId => { const rawPieces = supMap[sId].items[itemId].rawPieces; if (rawPieces > 0) { const st = getStats(itemId); supMap[sId].items[itemId].neededBoxes = st.neededBoxes; supMap[sId].items[itemId].confirmedBoxes = st.confirmedBoxes; supMap[sId].needed += st.neededBoxes; } else { delete supMap[sId].items[itemId]; } }); });
     reqs.forEach(pr => { const sId = pr.supplierId || 'U'; if (!supMap[sId]) supMap[sId] = { id: sId, needed: 0, confirmed: 0, items: {}, prs: [] }; supMap[sId].prs.push(pr); pr.items.forEach(pi => { const reqB = Number(pi.reqBoxes || 0); if (pr.status !== 'requested') supMap[sId].confirmed += reqB; if (!supMap[sId].items[pi.itemId]) { const masterItem = items.find(i => i.id === pi.itemId); if(masterItem) supMap[sId].items[pi.itemId] = { ms: masterItem, neededBoxes: 0, confirmedBoxes: pr.status !== 'requested' ? reqB : 0, rawPieces: 0 }; } else if (pr.status !== 'requested') { supMap[sId].items[pi.itemId].confirmedBoxes += reqB; } }); });
     return Object.values(supMap).map(s => { const sd = suppliers.find(x => x.id === s.id); s.name = sd?.name || '미지정 거래처'; s.favoriteAt = sd?.favoriteAt || 0; const maxVal = Math.max(s.needed, s.confirmed); s.progress = maxVal > 0 ? Math.floor((s.confirmed / maxVal) * 100) : (s.prs.length > 0 ? 100 : 0); s.totalRemaining = Math.max(0, s.needed - s.confirmed); s.isCompleted = s.progress >= 100 && s.prs.every(r=>r.status!=='requested'); return s; }).filter(s => s.needed > 0 || s.prs.length > 0).sort((a,b) => { if(a.favoriteAt !== b.favoriteAt) return b.favoriteAt - a.favoriteAt; return (a.name||'').localeCompare(b.name||''); });
  }, [clientOrders, targetM, targetWk, items, reqs, suppliers, getStats, weekMappings, clientItemMappings]);

  const viewSup = useMemo(() => supplierData.find(g => g.id === viewSupId), [supplierData, viewSupId]), viewSupPrs = viewSup?.prs || [], viewSupName = viewSup?.name || '알수없음';
  const tabCounts = useMemo(() => { let comp = 0, incomp = 0; supplierData.forEach(s => s.isCompleted ? comp++ : incomp++); return { all: supplierData.length, completed: comp, incomplete: incomp }; }, [supplierData]);
  const filteredSuppliers = useMemo(() => { return supplierData.filter(s => { if (activeTab === 'completed') return s.isCompleted; if (activeTab === 'incomplete') return !s.isCompleted; return true; }); }, [supplierData, activeTab]);

  useEffect(() => { if (viewSup) { const initD = {}; Object.values(viewSup.items).forEach(it => { const st = getStats(it.ms.id); const rem = Math.max(0, st.neededBoxes - st.confirmedBoxes); if(rem > 0) initD[it.ms.id] = { qty: rem, price: it.ms.unitPrice || 0 }; }); setDrafts(initD); } }, [viewSupId, viewSup?.id, getStats]);
  const toggleFav = (e, sId) => { e.stopPropagation(); if(!isLog) return toast('로그인 필요'); setSuppliers(prev => prev.map(s => s.id === sId ? {...s, favoriteAt: s.favoriteAt ? null : Date.now()} : s)); };

  const handleCreatePr = () => {
      if(!isLog) return toast('로그인 필요'); const itemsToOrder = [];
      Object.values(viewSup.items).forEach(it => { const draft = drafts[it.ms.id]; if (!draft) return; const orderQty = Number(draft.qty) || 0, orderPrice = Number(draft.price) || 0; if (orderQty > 0) { itemsToOrder.push({ itemId: it.ms.id, name: it.ms.name, unit: it.ms.unit, category: it.ms.category, boxQuantity: it.ms.boxQuantity, reqBoxes: orderQty, unitPrice: orderPrice, amount: orderQty * orderPrice }); } });
      if (itemsToOrder.length === 0) return toast('발주할 수량이 없습니다.');
      if (!window.confirm(`이 거래처의 ${itemsToOrder.length}건 품목을 구매 확정(전표 발행)하시겠습니까?\n확정 시 바로 물류입고 팀으로 전송됩니다.`)) return;
      setPurchaseRequests(p => [{ id: `PR_${Date.now()}_${viewSup.id}`, supplierId: viewSup.id, supplierName: viewSup.name, requestDate: new Date().toISOString().split('T')[0], periodKey: `${targetM}-${targetWk === 'all' ? 'Wall' : 'W'+targetWk}`, periodLabel: `${targetM} ${targetWk==='all' ? '월 전체' : targetWk+'주차'}`, items: itemsToOrder, status: 'ordered' }, ...p]); toast('발주 전표가 성공적으로 확정 발행되었습니다.');
  };

  const handleCancelConfirmPr = (pr) => { if(!isLog) return toast('로그인 필요'); const msg = pr.status === 'received' ? `[${pr.supplierName}] 입고 처리된 전표입니다!\n정말 취소하시겠습니까?\n(취소 시 미확정 잔량으로 100% 복구되며, 관련된 대금정산 내역도 삭제됩니다.)` : `[${pr.supplierName}] 확정된 전표를 취소하시겠습니까?\n(취소 시 미확정 잔량으로 복구됩니다.)`; if(!window.confirm(msg)) return; setPurchaseRequests(p => p.filter(x => x.id !== pr.id)); if(payments && setPayments) setPayments(p => p.filter(pay => pay.prId !== pr.id)); toast('전표가 완전히 취소되어 잔량이 복구되었습니다.'); };
  const handleCancelAllSupPrs = () => { if(!isLog) return toast('로그인 필요'); const ids = viewSupPrs.filter(p => p.status !== 'requested').map(p => p.id); if (ids.length === 0) return toast('취소할 기확정 전표가 없습니다.'); if(!window.confirm(`이 거래처의 기확정 전표 ${ids.length}건을 모두 취소하시겠습니까?\n물류입고 및 대금정산 목록에서 모두 삭제되고 미확정 잔량으로 100% 롤백됩니다.`)) return; setPurchaseRequests(p => p.filter(x => !ids.includes(x.id))); if(payments && setPayments) setPayments(p => p.filter(pay => !ids.includes(pay.prId))); toast('모든 확정 전표가 일괄 삭제되어 잔량으로 복구되었습니다.'); };

  const downloadAllExcel = () => {
      const fields = [{key: 'supplierName', label: '거래처명'}, {key: 'itemName', label: '품명(규격)'}, {key: 'category', label: '분류'}, {key: 'neededBoxes', label: '필요수량(Box)', type: 'number'}, {key: 'confirmedBoxes', label: '확정수량(Box)', type: 'number'}, {key: 'remainingBoxes', label: '미확정잔량(Box)', type: 'number'}, {key: 'progress', label: '진행률(%)', type: 'number'}, {key: 'unitPrice', label: '단가', type: 'number'}, {key: 'totalAmount', label: '미확정합계금액', type: 'number'}];
      const data = []; filteredSuppliers.forEach(sup => { Object.values(sup.items).forEach(it => { const prog = it.neededBoxes > 0 ? Math.floor((it.confirmedBoxes / it.neededBoxes) * 100) : 100, rem = Math.max(0, it.neededBoxes - it.confirmedBoxes); data.push({ supplierName: sup.name, itemName: `${it.ms.name} (${it.ms.unit})`, category: it.ms.category, neededBoxes: it.neededBoxes, confirmedBoxes: it.confirmedBoxes, remainingBoxes: rem, progress: prog, unitPrice: it.ms.unitPrice || 0, totalAmount: rem * (it.ms.unitPrice || 0) }); }); });
      Utils.dlStyled(fields, data, `전체거래처_발주현황_${targetM}_${targetWk}주차`);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end mb-4 border-b pb-4 border-slate-200 flex-none"><div><h2 className="text-2xl font-bold">구매요청서 송부함</h2><p className="text-[11px] text-gray-500 mt-1">집계된 리스트를 거래처별 발주서 양식으로 변환하여 송부(확정)합니다.</p></div></div>
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap md:flex-nowrap gap-3 mb-2 flex-none">{[1, 2, 3, 4].map(w => (<div key={`po-w-${w}`} className="flex-1 min-w-[120px] md:border-r border-slate-100 last:border-r-0 pr-3 last:pr-0 flex flex-col gap-1.5"><h4 className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 mb-0.5"><span>{w}주차 <span className="font-normal text-[10px]">적용 현황</span></span><span className="bg-white text-slate-600 border px-1.5 py-0.5 rounded-md leading-none">{weeklyClientStatus[w].length}</span></h4><div className="flex flex-wrap gap-1">{weeklyClientStatus[w].length === 0 ? <span className="text-[10px] text-slate-300">없음</span> : weeklyClientStatus[w].map((st, i) => (<span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border flex items-center gap-0.5 ${st.isDone ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'} ${st.type === '1차' ? 'text-blue-600' : 'text-green-600'}`}>{st.name} {st.isDone && <Ic.Chk size={10} className={st.type === '1차' ? 'text-blue-500' : 'text-green-500'}/>}</span>))}</div></div>))}</div>
      <div className="flex flex-wrap gap-2 px-2 mt-4 border-b-2 border-slate-300 relative items-end justify-between flex-none">
        <div className="flex gap-1 flex-wrap">
            <button onClick={()=>setActiveTab('incomplete')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='incomplete' ? 'bg-white border-slate-300 text-blue-600 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>대기 및 미완료 ({tabCounts.incomplete})</button>
            <button onClick={()=>setActiveTab('completed')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='completed' ? 'bg-white border-slate-300 text-green-600 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>발주 확정 완료 ({tabCounts.completed})</button>
            <button onClick={()=>setActiveTab('all')} className={`px-5 py-3 text-[11px] font-black rounded-t-2xl transition-all border-2 border-b-0 -mb-[2px] ${activeTab==='all' ? 'bg-white border-slate-300 text-slate-800 relative z-10' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}>전체 보기 ({tabCounts.all})</button>
        </div>
        <div className="flex gap-2 pb-2 items-center flex-wrap">
            <div className="flex items-center bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm"><button onClick={()=>setOrderMode('all')} className={`px-4 py-1.5 text-[11px] font-black transition-all ${orderMode==='all' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}><Ic.ListO size={14} className="inline mr-1 -mt-0.5"/> 전체 발주</button><button onClick={()=>setOrderMode('nextWeek')} className={`px-4 py-1.5 text-[11px] font-black transition-all border-l border-blue-200 ${orderMode==='nextWeek' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}><Ic.Cal size={14} className="inline mr-1 -mt-0.5"/> 선택 주차 발주</button>{orderMode === 'nextWeek' && <select value={selectedWk} onChange={e=>setSelectedWk(e.target.value)} className="p-1.5 text-[11px] font-black outline-none bg-blue-50 text-blue-700 border-l border-blue-200 cursor-pointer"><option value="1">1주차</option><option value="2">2주차</option><option value="3">3주차</option><option value="4">4주차</option></select>}</div>
            <button onClick={downloadAllExcel} className="ml-1 px-4 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[11px] font-black shadow-sm hover:bg-green-100 flex items-center gap-1 transition-colors"><Ic.File size={14}/> 목록 엑셀 추출</button>
        </div>
      </div>
      <div className="bg-white border-2 border-t-0 border-slate-300 rounded-b-3xl rounded-tr-3xl p-4 sm:p-5 shadow-sm flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredSuppliers.length === 0 ? <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">표시할 거래처가 없습니다.</div> : null}
          {filteredSuppliers.map(sup => (
            <div key={`sup-card-${sup.id}`} onClick={()=>setViewSupId(sup.id)} className={`relative p-3.5 rounded-[1.2rem] shadow-sm border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md group flex flex-col gap-2 overflow-hidden ${sup.isCompleted ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-white border-slate-200 hover:border-blue-400'}`}>
              <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-50 ${sup.isCompleted ? 'bg-green-100' : 'bg-blue-50'}`}></div>
              <button onClick={(e)=>toggleFav(e, sup.id)} className="absolute top-2 right-2 z-20 p-1.5 rounded-full hover:bg-white/50 transition-colors"><Ic.Star size={14} className={sup.favoriteAt ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} /></button>
              <div className="flex items-center gap-2.5 relative z-10 pr-5"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${sup.isCompleted ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}><Ic.Truck size={14}/></div><div className="flex-1 min-w-0"><h3 className="font-black text-[12px] text-slate-800 truncate">{sup.name}</h3></div></div>
              <div className="mt-1 w-full bg-white/80 p-2 rounded-lg border border-slate-200 relative z-10"><div className="flex justify-between text-[9px] font-black text-slate-600 mb-1"><span>진행 {Math.min(100, sup.progress)}%</span>{sup.isCompleted ? <span className="text-green-600">발주 마감</span> : <span className="text-rose-500">잔여: {Utils.fmt(sup.totalRemaining)} Box</span>}</div><div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${sup.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, sup.progress)}%`}}></div></div></div>
            </div>
          ))}
        </div>
      </div>

      {viewSupId && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem] pr-16">
              <div><h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.File size={28} className="text-blue-500"/> {viewSupName} 구매요청 묶음</h3><p className="text-[11px] text-gray-500 font-bold mt-1 pl-10">요청 기준: {targetM} {targetWk==='all' ? '월 전체' : targetWk+'주차'} <span className="ml-3 bg-blue-50 text-blue-600 px-2 py-1 rounded">※ 위쪽 표에서 발주수량을 직접 입력할 수 있습니다.</span></p></div>
              <div className="flex gap-2 items-center hidden md:flex"><button onClick={()=>{ const confirmedItems = viewSupPrs.filter(p=>p.status!=='requested').flatMap(p=>p.items); if(confirmedItems.length === 0) return toast('확정 내역 없음'); Utils.dlPrExcel(viewSupName, confirmedItems, targetM); }} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-black border border-green-200 transition-colors hover:bg-green-100">엑셀 다운로드</button><button onClick={()=>{ const confirmedItems = viewSupPrs.filter(p=>p.status!=='requested').flatMap(p=>p.items); if(confirmedItems.length === 0) return toast('확정 내역 없음'); Utils.prtPr(viewSupName, confirmedItems); }} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-black hover:bg-gray-900 transition-colors">바로 인쇄</button></div>
              <button onClick={()=>setViewSupId(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button>
            </div>
            
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col gap-6 min-h-0 overflow-y-auto scrollbar-hide">
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col flex-none min-h-[300px]">
                   <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 flex-none"><h4 className="font-black text-slate-800 flex items-center gap-2"><Ic.Box size={18} className="text-blue-500"/> 미확정 품목 (발주 대기열)</h4>{Object.values(viewSup.items).some(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }) && (<button onClick={()=>handleCreatePr()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-colors flex items-center gap-2"><Ic.Plus size={14}/> 입력 수량만 구매 확정</button>)}</div>
                   <div className="w-full border rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
                       <div className="overflow-y-auto flex-1 scrollbar-hide">
                           {Object.values(viewSup.items).filter(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }).length === 0 ? ( <p className="text-center text-slate-400 font-bold py-6 bg-slate-50">미확정된 잔량이 없습니다.</p> ) : (
                               <table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm"><tr><th className="px-1 py-1.5 w-[5%] break-keep">#</th><th className="px-1 py-1.5 w-[25%] text-left break-keep">품명(규격)</th><th className="px-1 py-1.5 w-[8%] text-slate-500 border-l border-slate-200 break-keep leading-tight">기본수량<br/><span className="text-[8px] font-normal">(낱개)</span></th><th className="px-1 py-1.5 w-[7%] text-slate-500 break-keep">입수</th><th className="px-1 py-1.5 w-[8%] text-slate-500 border-r border-slate-200 break-keep leading-tight">기본<br/>박스</th><th className="px-1 py-1.5 w-[12%] bg-blue-50 border-l text-blue-800 break-keep leading-tight">발주수량<br/><span className="text-[8px] font-normal">(로스율 적용)</span></th><th className="px-1 py-1.5 w-[12%] bg-blue-50 border-r text-blue-800 break-keep leading-tight">단가<br/>(원)</th><th className="px-1 py-1.5 w-[13%] text-purple-700 break-keep">금액</th><th className="px-1 py-1.5 w-[10%] text-green-600 border-l border-slate-200 break-keep leading-tight">여유분<br/><span className="text-[8px] font-normal">(낱개)</span></th></tr></thead><tbody>
                                   {Object.values(viewSup.items).map((it, idx) => {
                                       const st = getStats(it.ms.id); if (st.neededBoxes <= st.confirmedBoxes) return null; 
                                       const remPieces = st.rawPieces, bq = it.ms.boxQuantity || 1, basicBox = Math.ceil(remPieces / bq), draft = drafts[it.ms.id] || { qty: Math.max(0, st.neededBoxes - st.confirmedBoxes), price: it.ms.unitPrice || 0 }, orderQty = Number(draft.qty) || 0, orderPrice = Number(draft.price) || 0, amt = orderQty * orderPrice, diffPieces = ((st.confirmedBoxes + orderQty) * bq) - st.rawPieces;
                                       return <tr key={`pend-${it.ms.id}`} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-1 py-1 text-slate-400 font-bold break-keep">{idx+1}</td><td className="px-1 py-1 font-black text-left text-slate-700 break-words">{it.ms.name} <span className="text-[9px] text-slate-400">({it.ms.unit})</span></td><td className="px-1 py-1 font-bold text-slate-500 border-l border-slate-100 break-keep">{Utils.fmt(st.rawPieces)}</td><td className="px-1 py-1 font-bold text-slate-500 break-keep">{Utils.fmt(bq)}</td><td className="px-1 py-1 text-slate-500 font-black border-r border-slate-100 break-keep">{Utils.fmt(basicBox)}</td><td className="px-1 py-1 bg-blue-50/30 border-l relative"><NumInp v={draft.qty} setV={v=>setDrafts(p=>({...p, [it.ms.id]: {...p[it.ms.id], qty: v}}))} cls="w-full min-w-[30px] p-1 border border-blue-200 focus:border-blue-500 rounded text-center bg-white font-black text-blue-700 shadow-inner text-[10px] transition-colors" /></td><td className="px-1 py-1 bg-blue-50/30 border-r"><NumInp v={draft.price} setV={v=>setDrafts(p=>({...p, [it.ms.id]: {...p[it.ms.id], price: v}}))} cls="w-full min-w-[40px] p-1 border border-blue-200 focus:border-blue-500 rounded text-center bg-white font-black text-blue-700 shadow-inner text-[10px] transition-colors" /></td><td className="px-1 py-1 font-black text-purple-700 break-keep">{Utils.fmt(amt)}</td><td className="px-1 py-1 font-black text-green-600 border-l border-slate-100 break-keep">{diffPieces > 0 ? `+${Utils.fmt(diffPieces)}` : Utils.fmt(diffPieces)}</td></tr>
                                   })}
                               </tbody></table>
                           )}
                       </div>
                   </div>
               </div>

               {viewSupPrs.filter(p=>p.status!=='requested').length > 0 && (
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-none flex flex-col min-h-[300px]">
                       <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 flex-none"><Ic.ListO size={18} className="text-green-500"/> 기확정 전표 내역 ({viewSupPrs.filter(p=>p.status!=='requested').length}건)</h4>
                       <div className="overflow-y-auto flex-1 scrollbar-hide space-y-4">
                           {viewSupPrs.filter(p=>p.status!=='requested').map((pr, idx) => {
                               const isReceived = pr.status === 'received';
                               return <div key={pr.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"><div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="font-black text-sm text-slate-800 flex items-center gap-2"><Ic.Chk size={18} className="text-green-500"/>전표 #{idx+1} <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-1 rounded border">({pr.periodLabel})</span>{isReceived && <span className="text-[10px] text-white bg-purple-500 px-2 py-1 rounded-md ml-2 shadow-sm">입고완료됨</span>}</span><div className="flex gap-2"><button onClick={()=>handleCancelConfirmPr(pr)} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-[10px] font-black hover:bg-rose-50 shadow-sm flex items-center gap-1 transition-colors"><Ic.Alert size={12}/> 이 전표 취소(잔량 복구)</button></div></div><div className="w-full"><table className="w-full text-center text-[10px] bg-white rounded-lg overflow-hidden border border-slate-200 table-fixed"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-2 w-[55%] text-left px-3 break-keep">품명</th><th className="p-2 w-[15%] break-keep">확정수량(Box)</th><th className="p-2 w-[15%] break-keep">단가</th><th className="p-2 w-[15%] break-keep">합계</th></tr></thead><tbody>{pr.items.map(pi => (<tr key={pi.itemId} className="border-b border-slate-100 last:border-b-0"><td className="p-2 text-left px-3 font-bold text-slate-700 break-words">{pi.name}</td><td className="p-2 font-black text-slate-600 break-keep">{Utils.fmt(pi.reqBoxes)}</td><td className="p-2 font-bold text-slate-500 break-keep">{Utils.fmt(pi.unitPrice)}</td><td className="p-2 font-black text-slate-600 break-keep">{Utils.fmt(pi.amount)}</td></tr>))}</tbody></table></div></div>
                           })}
                       </div>
                   </div>
               )}
            </div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center gap-4 rounded-b-[2.5rem]"><div>{viewSup.prs && viewSup.prs.filter(p=>p.status==='ordered').length > 0 && (<button onClick={handleCancelAllSupPrs} className="bg-white border-2 border-orange-200 text-orange-600 px-6 py-4 rounded-xl font-black text-sm hover:bg-orange-50 shadow-sm flex items-center gap-2 transition-colors"><Ic.Alert size={18}/> 기확정 내역 모두 취소 (잔량 롤백)</button>)}</div><div className="flex gap-3"><button onClick={()=>setViewSupId(null)} className="px-10 py-4 bg-slate-200 text-slate-700 rounded-xl font-black shadow-md hover:bg-slate-300 transition-colors text-base">닫기</button>{Object.values(viewSup.items).some(it => { const st = getStats(it.ms.id); return st.neededBoxes > st.confirmedBoxes; }) && (<button onClick={()=>handleCreatePr()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-black text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2"><Ic.Chk size={18}/> 입력 수량으로 구매 확정</button>)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReceiptManagement = ({ purchaseRequests=[], setPurchaseRequests, payments=[], setPayments, suppliers=[], toast, isLog, setConfirm }) => {
  const [viewPr, setViewPr] = useState(null);
  const grpPRs = useMemo(() => { const grp={}; purchaseRequests.filter(pr=>pr.status==='ordered').forEach(pr=>{if(!grp[pr.requestDate])grp[pr.requestDate]=[];grp[pr.requestDate].push(pr);}); return Object.keys(grp).sort((a,b)=>b.localeCompare(a)).map(date=>({date,list:grp[date]})); }, [purchaseRequests]);
  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0"><div className="flex justify-between items-end mb-2 flex-none"><div><h2 className="text-2xl font-bold">물류창고 입고 전표</h2><p className="text-[11px] text-gray-500 mt-1">확정된 구매요청서를 바탕으로 실제 물건이 입고되었는지 검수합니다.</p></div></div>
      <div className="flex-1 bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto scrollbar-hide">{grpPRs.length===0?<div className="py-20 text-center font-bold text-gray-400">대기중인 입고 전표가 없습니다.</div>:grpPRs.map(g=><div key={g.date} className="mb-8"><h3 className="font-black text-slate-800 text-sm mb-4 border-b border-slate-200 pb-2">{g.date} 전표</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {g.list.map(p=>(
           <div key={p.id} onClick={()=>setViewPr(p)} className="relative p-6 rounded-[2rem] shadow-md border-2 bg-white border-slate-200 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-blue-400 hover:shadow-xl group flex flex-col gap-4 overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 opacity-50"></div>
             <div className="flex items-center gap-4 relative z-10"><div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Ic.Box size={24}/></div><div className="flex-1 min-w-0"><h4 className="font-black text-lg text-slate-800 truncate">{p.supplierName || suppliers.find(x=>x.id===p.supplierId)?.name}</h4></div></div>
             <div className="relative z-10 mt-auto border-t border-slate-100 pt-4"><span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center gap-1"><Ic.Alert size={12}/> 검수 대기</span></div>
           </div>
        ))}
      </div></div>)}</div>
      
      {viewPr && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-6xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]"><h3 className="text-xl font-black text-blue-700 flex items-center gap-3"><Ic.Box size={28}/> 실입고 검수: {viewPr.supplierName || suppliers.find(s=>s.id===viewPr.supplierId)?.name}</h3><button onClick={()=>setViewPr(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0"><div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden"><div className="overflow-y-auto flex-1 w-full scrollbar-hide"><table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10"><tr><th className="p-3 border-r w-[8%] break-keep">#</th><th className="p-3 text-left border-r w-[40%] break-keep">품명</th><th className="p-3 bg-blue-50 text-blue-800 border-r w-[17%] break-keep">도착확인수량(Box)</th><th className="p-3 border-r w-[15%] break-keep">단가</th><th className="p-3 text-amber-600 w-[20%] break-keep">청구금액</th></tr></thead><tbody>{viewPr.items.map((it, idx) => (<tr key={`rx-it-${it.itemId}`} className="border-b hover:bg-gray-50"><td className="p-3 text-gray-400 font-bold border-r break-keep">{idx+1}</td><td className="p-3 font-black text-left border-r break-words min-w-[150px]">{it.name} <span className="text-[10px] text-gray-400">({it.unit})</span></td><td className="p-3 font-black text-blue-700 bg-blue-50/20 text-sm border-r break-keep">{Utils.fmt(it.reqBoxes)}</td><td className="p-3 font-bold text-gray-600 border-r break-keep">{Utils.fmt(it.unitPrice)}</td><td className="p-3 font-black text-amber-600 break-keep">{Utils.fmt(it.reqBoxes * it.unitPrice)}</td></tr>))}</tbody></table></div></div></div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-end items-center rounded-b-[2.5rem]"><button onClick={()=>{if(!isLog)return toast('로그인 필요'); setConfirm({is:true, msg:'실제 물건이 일치합니까?\n확정 시 대금 결제 부서로 넘어갑니다.', onC:()=>{const tot=viewPr.items.reduce((a,b)=>a+(b.reqBoxes*b.unitPrice),0); setPayments([{id:`PAY_${Date.now()}`, prId:viewPr.id, supplierId:viewPr.supplierId, supplierName: viewPr.supplierName || suppliers.find(s=>s.id===viewPr.supplierId)?.name || '알수없음', date:new Date().toISOString().split('T')[0], amount:tot, status:'unpaid'}, ...payments]); setPurchaseRequests(purchaseRequests.map(p=>p.id===viewPr.id?{...p,status:'received'}:p)); setConfirm({is:false}); setViewPr(null); toast('입고 확정 완료!');}, onX:()=>setConfirm({is:false})});}} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-black shadow-md text-base transition-transform hover:-translate-y-0.5">이상 없음 (입고 확정 및 결제 요청)</button></div>
          </div>
        </div>
      )}
    </div>
  )
};

const PaymentView = ({ payments=[], setPayments, suppliers=[], purchaseRequests=[], toast, isLog, globalMonth }) => {
  const [vP, setVP] = useState(null), [sel, setSel] = useState([]); 
  const fd = useMemo(() => payments.filter(p => (p.date||'').startsWith(globalMonth)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')), [payments, globalMonth]);
  useEffect(() => { setSel([]); }, [globalMonth]);

  const handlePrint = () => { let h = `<table border="1"><thead><tr><th colspan="4" style="font-size:16pt; background:#d9e1f2; padding:10px;">${globalMonth}월 대금 정산 내역</th></tr><tr><th>입고일</th><th>거래처</th><th>청구금액</th><th>상태</th></tr></thead><tbody>`; fd.forEach(p => { h += `<tr><td>${p.date}</td><td style="text-align:left;">${p.supplierName}</td><td style="text-align:right; font-weight:bold;">${Utils.fmt(p.amount)}</td><td style="color:${p.status==='paid'?'green':'red'}; font-weight:bold;">${p.status==='paid'?'결제완료':'미결제'}</td></tr>`; }); h += `</tbody></table>`; Utils.printContent(`${globalMonth}월 대금정산내역`, h); };
  const handleExcel = () => { const data = fd.map(p => ({ date: p.date, supplierName: p.supplierName, amount: p.amount, status: p.status==='paid'?'결제완료':'미결제' })); const fields = [{key:'date', label:'입고일'}, {key:'supplierName', label:'거래처'}, {key:'amount', label:'청구금액', type:'number'}, {key:'status', label:'상태'}]; Utils.dlStyled(fields, data, `대금정산내역_${globalMonth}`); };
  const handleDeleteSelected = () => { if(!isLog) return toast('로그인 필요'); if(!window.confirm(`선택한 대금정산 내역 ${sel.length}건을 삭제하시겠습니까?`)) return; setPayments(payments.filter(p => !sel.includes(p.id))); setSel([]); toast('선택한 결제 내역이 삭제되었습니다.'); };

  return (
    <div className="space-y-6 w-full animate-fade-in flex flex-col h-full min-h-0"><div className="flex justify-between items-end mb-2 flex-none"><div><h2 className="text-2xl font-bold">대금 정산</h2><p className="text-[11px] text-gray-500 mt-1">입고 완료된 건에 대해 결제 상태를 관리합니다.</p></div>
       <div className="flex gap-2 items-center">
          {isLog && sel.length > 0 && <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-black hover:bg-red-100 transition-colors flex items-center gap-1"><Ic.Trash size={16}/> 선택 삭제 ({sel.length})</button>}
          <button onClick={handleExcel} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-black hover:bg-green-100 transition-colors flex items-center gap-1"><Ic.File size={16}/> 엑셀 다운로드</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-black hover:bg-gray-900 transition-colors flex items-center gap-1"><Ic.Print size={16}/> 인쇄 미리보기</button>
       </div>
    </div>
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden"><div className="w-full border rounded-2xl flex-1 overflow-y-auto scrollbar-hide"><table className="w-full text-[10px] text-center table-fixed"><thead className="bg-gray-100 sticky top-0 shadow-sm border-b z-10"><tr>{isLog&&<th className="p-3 w-10 break-keep"><input type="checkbox" onChange={e=>setSel(e.target.checked?fd.map(i=>i.id):[])} checked={fd.length>0&&sel.length===fd.length}/></th>}<th className="p-3 w-[15%] break-keep">입고일</th><th className="p-3 text-left w-[40%] break-keep">거래처</th><th className="p-3 text-right w-[15%] break-keep">청구금액</th><th className="p-3 w-[10%] break-keep">상태</th>{isLog&&<th className="p-3 w-[10%] break-keep">처리</th>}</tr></thead><tbody>{fd.length===0?<tr><td colSpan={isLog?"6":"5"} className="p-20 font-bold text-gray-400">결제 내역 없음</td></tr>:fd.map(p=><tr key={p.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>setVP(p)}>{isLog&&<td className="p-3" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sel.includes(p.id)} onChange={e=>{e.stopPropagation();setSel(prev=>e.target.checked?[...prev,p.id]:prev.filter(id=>id!==p.id));}}/></td>}<td className="p-3 font-bold text-gray-500 break-keep">{p.date}</td><td className="p-3 font-black text-left break-words">{p.supplierName || suppliers.find(x=>x.id===p.supplierId)?.name}</td><td className="p-3 font-black text-right break-keep">{Utils.fmt(p.amount)}</td><td className="p-3 break-keep"><span className={`px-2 py-1 rounded text-[10px] font-black ${p.status==='paid'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{p.status==='paid'?'결제완료':'미결제'}</span></td>{isLog&&<td className="p-3 break-keep"><button onClick={(e)=>{e.stopPropagation(); setPayments(payments.map(x=>x.id===p.id?{...x,status:x.status==='paid'?'unpaid':'paid'}:x)); toast('변경됨');}} className="border px-3 py-1 rounded text-[10px] font-black bg-white hover:bg-gray-50 transition-colors">{p.status==='paid'?'취소':'결제하기'}</button></td>}</tr>)}</tbody></table></div></div>
      
      {vP && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in notranslate" translate="no">
          <div className="bg-white flex flex-col w-full max-w-4xl mx-auto rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-slate-200 animate-scale-up h-[90vh]">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem] pr-16"><h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Ic.Card size={28} className="text-purple-600"/> {vP.supplierName || suppliers.find(s=>s.id===vP.supplierId)?.name} 거래 상세 (청구금액: <span className="text-rose-500 ml-2">{Utils.fmt(vP.amount)}원</span>)</h3><button onClick={()=>setVP(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:text-rose-600 transition-colors"><Ic.X size={20}/></button></div>
            <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col min-h-0"><div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden"><div className="overflow-y-auto flex-1 w-full scrollbar-hide"><table className="w-full text-[10px] text-center table-fixed"><thead className="bg-slate-100 sticky top-0 shadow-sm border-b z-10"><tr><th className="p-3 border-r w-[45%] break-keep">품명</th><th className="p-3 bg-blue-50 text-blue-800 border-r w-[20%] break-keep">입고수량</th><th className="p-3 border-r w-[15%] break-keep">단가</th><th className="p-3 text-amber-600 w-[20%] break-keep">청구금액</th></tr></thead><tbody>{(purchaseRequests.find(r=>r.id===vP.prId)?.items||[]).map((it, idx) => (<tr key={`pay-det-${it.itemId}-${idx}`} className="border-b hover:bg-gray-50"><td className="p-3 font-black text-left border-r break-words">{it.name}</td><td className="p-3 font-black text-blue-700 bg-blue-50/20 text-lg border-r break-keep">{Utils.fmt(it.reqBoxes)}</td><td className="p-3 font-bold text-gray-600 border-r break-keep">{Utils.fmt(it.unitPrice)}</td><td className="p-3 font-black text-amber-600 break-keep">{Utils.fmt(it.reqBoxes * it.unitPrice)}</td></tr>))}</tbody></table></div></div></div>
            <div className="flex-none px-8 py-5 border-t border-slate-100 bg-white flex justify-end rounded-b-[2.5rem]"><button onClick={()=>{setPayments(payments.map(x=>x.id===vP.id?{...x,status:vP.status==='paid'?'unpaid':'paid'}:x)); setVP({...vP, status:vP.status==='paid'?'unpaid':'paid'}); toast('상태 변경됨');}} className={`px-12 py-4 rounded-xl font-black shadow-md text-base text-white transition-transform hover:-translate-y-0.5 ${vP.status==='paid'?'bg-gray-800 hover:bg-gray-900':'bg-purple-600 hover:bg-purple-700'}`}>{vP.status==='paid'?'결제 상태 취소로 변경':'대금 결제 승인 완료'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
};

const DeliveryRoutingView = () => <div className="py-20 text-center text-gray-400 font-black"><Ic.Route size={48} className="mx-auto mb-4 opacity-50"/>AI 배송 라우팅 연동 준비중</div>;
const InventoryView = () => <div className="py-20 text-center text-gray-400 font-black"><Ic.Cart size={48} className="mx-auto mb-4 opacity-50"/>WMS 재고 연동 시스템 준비중</div>;

function MainApp() {
  const [ac, setAc] = useState('dashboard'), [cUser, setCUser] = useState(null), [st, setSt] = useState(INITIAL_APP_STATE);
  const [tt, setTt] = useState(null), [cfm, setConfirm] = useState({is:false,msg:'',onC:null,onX:null}), [lm, setLm] = useState(false);
  const [globalMonth, setGlobalMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fbUser, setFbUser] = useState(null), [authInit, setAuthInit] = useState(false), [dbLd, setDbLd] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', pwd: '', saveId: false, keepLog: false }), [sysErrors, setSysErrors] = useState([]), [loadTimeout, setLoadTimeout] = useState(false), [dbPermissionError, setDbPermissionError] = useState(false);

  useEffect(() => { const interval = setInterval(() => { if (windowErrors.length > sysErrors.length) setSysErrors([...windowErrors]); }, 1000); return () => clearInterval(interval); }, [sysErrors]);
  useEffect(() => { const timer = setTimeout(() => { if (!dbLd) setLoadTimeout(true); }, 3000); return () => clearTimeout(timer); }, [dbLd]);
  useEffect(() => { const sId = localStorage.getItem('ws_saved_id'), kLog = localStorage.getItem('ws_keep_log') === 'true'; if (sId) { setLoginForm(prev => ({ ...prev, id: sId, saveId: true, keepLog: kLog })); } }, []);

  useEffect(() => {
    if (!auth) { setDbLd(true); return; }
    let isMounted = true;
    const initAuth = async () => {
      try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }
      catch (err) { windowErrors.push(`[Auth Error] ${err.message}`); } finally { if (isMounted) setAuthInit(true); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => { if (isMounted) setFbUser(user); });
    return () => { isMounted = false; unsub(); };
  }, []);

  useEffect(() => {
    if (!authInit) return;
    if (!fbUser || !db) { setDbLd(true); return; }
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'erp_sync', 'main_state');
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) { setSt(prev => { const n = { ...INITIAL_APP_STATE, ...snap.data() }; return JSON.stringify(prev) === JSON.stringify(n) ? prev : n; }); }
      else { if (!window.firebasePermissionDenied) setDoc(docRef, Utils.cleanData(INITIAL_APP_STATE)).catch(e => { if (e.message?.toLowerCase().includes('permission')) { window.firebasePermissionDenied = true; setDbPermissionError(true); } }); }
      setDbLd(true);
    }, e => { if (e.message?.toLowerCase().includes('permission')) { window.firebasePermissionDenied = true; setDbPermissionError(true); } setDbLd(true); });
    return () => unsub();
  }, [authInit, fbUser]);

  useEffect(() => { if (dbPermissionError) toast('⚠️ 클라우드 DB 접근 권한이 막혀있어 임시 로컬 모드로 작동합니다.'); }, [dbPermissionError]);

  const updateSt = (k, v) => { setSt(p => { const n={...p, [k]:typeof v==='function'?v(p[k]):v}; if(authInit && fbUser && db && !window.firebasePermissionDenied) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'erp_sync', 'main_state'), Utils.cleanData(n)).catch(e=>{}); return n; }); };
  const toast = m => { setTt({m}); setTimeout(()=>setTt(null), 3000); };
  const exp = () => { const b=new Blob([JSON.stringify(st,null,2)], {type:"application/json"}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download=`backup_${Date.now()}.json`; l.click(); toast('백업 완료'); };
  const imp = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{try{const i=JSON.parse(ev.target.result); setConfirm({is:true, msg:'덮어씌웁니까?', onC:()=>{setSt(i); if(authInit&&fbUser&&db && !window.firebasePermissionDenied) setDoc(doc(db,'artifacts',appId,'public','data','erp_sync','main_state'),Utils.cleanData(i)); setConfirm({is:false}); toast('복원됨');}, onX:()=>setConfirm({is:false})});}catch(err){toast('파일 오류');}}; r.readAsText(f); e.target.value=null; };

  const handleLoginSubmit = (e) => {
    e.preventDefault(); const u = (st.users||[]).find(x => x.id === loginForm.id && x.password === loginForm.pwd);
    if (u) {
       setCUser(u); setAc('dashboard'); setLm(false);
       if (loginForm.saveId) localStorage.setItem('ws_saved_id', loginForm.id); else localStorage.removeItem('ws_saved_id');
       if (loginForm.keepLog) localStorage.setItem('ws_keep_log', 'true'); else localStorage.removeItem('ws_keep_log');
       toast('환영합니다!');
    } else toast('정보 불일치');
  };

  const handleLogout = () => { if(window.confirm('시스템에서 안전하게 로그아웃 하시겠습니까?')) { setCUser(null); localStorage.removeItem('ws_saved_id'); localStorage.removeItem('ws_keep_log'); setAc('dashboard'); toast('안전하게 로그아웃 되었습니다.'); } };

  const cx = { isLog: !!cUser, toast, setConfirm, setAc, globalMonth };
  const categorySortOrder = st.categorySortOrder || [];
  const si = useMemo(() => Utils.sortItems(st.items || [], categorySortOrder), [st.items, categorySortOrder]);
  
  const menuItems = [
    {id:'dashboard', l:'대시보드', i:Ic.Dash, roles:['admin', 'office', 'logistics']},
    {id:'users', l:'사용자', i:Ic.User, roles:['admin']},
    {id:'items', l:'품목', i:Ic.Box, roles:['admin', 'office']},
    {id:'suppliers', l:'거래처', i:Ic.Users, roles:['admin', 'office']},
    {id:'clients', l:'보건소', i:Ic.Bldg, roles:['admin', 'office']},
    {id:'schedule', l:'일정/달력', i:Ic.Cal, roles:['admin', 'office', 'logistics']},
    {id:'clientMapping', l:'품목매칭', i:Ic.ChkSq, roles:['admin', 'office']},
    {id:'clientOrder', l:'발주입력', i:Ic.Clip, roles:['admin', 'office']},
    {id:'orderSummary', l:'AI발주집계', i:Ic.ListP, roles:['admin', 'office']},
    {id:'purchaseOrder', l:'구매요청서', i:Ic.File, roles:['admin', 'office']},
    {id:'receipt', l:'물류입고', i:Ic.Down, roles:['admin', 'logistics']},
    {id:'payment', l:'대금정산', i:Ic.Card, roles:['admin', 'office']},
    {id:'packagePrint', l:'영플패키지출력', i:Ic.Print2, roles:['admin', 'office', 'logistics'], isExt: true, url: 'https://wssc-workorder.web.app/'}
  ];

  const rdr = () => {
    switch (ac) {
      case 'dashboard': return <DashboardView items={si} clients={st.clients} clientOrders={st.clientOrders} payments={st.payments} logs={st.systemLogs} onExport={exp} onImport={imp} sortOrder={categorySortOrder} setOrder={v=>updateSt('categorySortOrder',v)} {...cx} />;
      case 'users': return <DataManagerView title="사용자" data={st.users} setData={v=>updateSt('users',v)} filename="사용자" fields={[{key:'id',label:'ID',inlineEditable:true},{key:'password',label:'PW',hideInList:true},{key:'name',label:'이름',inlineEditable:true},{key:'role',label:'권한',type:'select',inlineEditable:true,options:[{value:'admin',label:'최고관리자'},{value:'office',label:'사무/발주팀'},{value:'logistics',label:'물류/현장팀'}]},{key:'contact',label:'연락처',inlineEditable:true},{key:'note',label:'비고',inlineEditable:true}]} {...cx} />;
      case 'items': return <DataManagerView title="마스터품목" data={si} setData={v=>updateSt('items',v)} filename="품목" fields={[{key:'category',label:'분류',inlineEditable:true},{key:'id',label:'코드',hideInList:true},{key:'name',label:'품명',inlineEditable:true},{key:'unit',label:'단위',inlineEditable:true},{key:'boxQuantity',label:'입수',type:'number',inlineEditable:true},{key:'unitPrice',label:'단가',type:'number',inlineEditable:true},{key:'supplierId',label:'거래처',type:'select',inlineEditable:true,options:(st.suppliers||[]).map(s=>({label:s.name,value:s.id}))}]} {...cx} />;
      case 'suppliers': return <DataManagerView title="거래처" data={st.suppliers} setData={v=>updateSt('suppliers',v)} filename="거래처" fields={[{key:'id',label:'코드',hideInList:true},{key:'name',label:'거래처명',inlineEditable:true},{key:'manager',label:'담당자',inlineEditable:true},{key:'contact',label:'연락처',inlineEditable:true},{key:'note',label:'비고',inlineEditable:true}]} {...cx} />;
      case 'clients': return <DataManagerView title="보건소" data={st.clients} setData={v=>updateSt('clients',v)} filename="보건소" fields={[{key:'id',label:'코드',hideInList:true},{key:'name',label:'기관명',inlineEditable:false},{key:'shortName',label:'호칭',inlineEditable:true},{key:'manager',label:'담당자',inlineEditable:true},{key:'contact',label:'연락처',inlineEditable:true},{key:'inspectLocation',label:'장소',inlineEditable:true}]} {...cx} />;
      case 'clientMapping': return <ClientItemMappingView clients={st.clients} items={si} clientItemMappings={st.mappings} setClientItemMappings={v=>updateSt('mappings',v)} {...cx} />;
      case 'schedule': return <ScheduleManagement clients={st.clients} clientOrders={st.clientOrders} setClientOrders={v=>updateSt('clientOrders',v)} weekMappings={st.weekMappings} setWeekMappings={v=>updateSt('weekMappings',v)} {...cx} />;
      case 'clientOrder': return <OrderDocView clients={st.clients} clientOrders={st.clientOrders} setClientOrders={v=>updateSt('clientOrders',v)} items={si} sortedItems={si} clientItemMappings={st.mappings} lossRates={st.lossRates} itemLossRates={st.itemLossRates} {...cx} />;
      case 'orderSummary': return <OrderSummaryCalculationView clients={st.clients} items={si} suppliers={st.suppliers} clientOrders={st.clientOrders} lossRates={st.lossRates} setLossRates={v=>updateSt('lossRates',v)} itemLossRates={st.itemLossRates} setItemLossRates={v=>updateSt('itemLossRates',v)} sortOrder={categorySortOrder} weekMappings={st.weekMappings} clientItemMappings={st.mappings} {...cx} />;
      case 'purchaseOrder': return <PurchaseOrderManagement items={si} clients={st.clients} suppliers={st.suppliers} setSuppliers={v=>updateSt('suppliers',v)} clientOrders={st.clientOrders} setClientOrders={v=>updateSt('clientOrders',v)} purchaseRequests={st.purchaseRequests} setPurchaseRequests={v=>updateSt('purchaseRequests',v)} lossRates={st.lossRates} itemLossRates={st.itemLossRates} payments={st.payments} setPayments={v=>updateSt('payments',v)} weekMappings={st.weekMappings} clientItemMappings={st.mappings} {...cx} />;
      case 'receipt': return <ReceiptManagement purchaseRequests={st.purchaseRequests} setPurchaseRequests={v=>updateSt('purchaseRequests',v)} payments={st.payments} setPayments={v=>updateSt('payments',v)} suppliers={st.suppliers} items={si} {...cx} />;
      case 'routing': return <DeliveryRoutingView />;
      case 'inventory': return <InventoryView />;
      case 'payment': return <PaymentView payments={st.payments} setPayments={v=>updateSt('payments',v)} suppliers={st.suppliers} purchaseRequests={st.purchaseRequests} {...cx} />;
      default: return <DashboardView items={si} clients={st.clients} clientOrders={st.clientOrders} payments={st.payments} logs={st.systemLogs} onExport={exp} onImport={imp} sortOrder={categorySortOrder} setOrder={v=>updateSt('categorySortOrder',v)} {...cx} />;
    }
  };

  if (!dbLd) return <div className="flex h-screen items-center justify-center font-black bg-slate-50 notranslate" translate="no"><Ic.Ref className="animate-spin mr-3 text-blue-600"/>시스템 로딩중...</div>;

  return (
    <div className="flex h-screen bg-gray-300 font-sans overflow-hidden notranslate" translate="no">
      <div className="flex w-full h-full bg-[#f0f2f5] relative">
        <aside className="w-60 bg-[#231815] text-gray-300 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.1)] flex-none">
          <div className="p-6 border-b border-white/10 text-center"><img src="/logo.png" alt="웰쉐어 로고" className="w-24 mx-auto mb-3 hover:scale-105 transition-transform drop-shadow-lg" /><h1 className="text-[13px] text-white font-black tracking-wide">웰쉐어 영양플러스 발주</h1></div>
          <div className="p-4 border-b border-white/10 bg-black/20"><p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2 uppercase text-center">데이터 백업/복원</p>{cUser ? (<div className="flex gap-1.5"><button onClick={exp} className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded text-[10px] font-black hover:bg-white/10 text-gray-300 transition-colors">Export</button><button onClick={()=>document.getElementById('sys-import-sb').click()} className="flex-1 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded text-[10px] font-black text-purple-300 hover:bg-purple-600/40 transition-colors">Import</button><input type="file" id="sys-import-sb" className="hidden" accept=".json" onChange={imp} /></div>) : <p className="text-[10px] text-gray-600 text-center">로그인 필요</p>}</div>
          <nav className="flex-1 py-4 overflow-y-auto">
             <ul className="px-3 space-y-1">
                {menuItems.filter(m => m.roles.includes(cUser?.role || 'admin')).map(m => { 
                   const Icon = m.i; 
                   return (
                     <li key={m.id}>
                        <button onClick={()=>{ if(m.isExt) { window.open(m.url, '_blank'); } else { setAc(m.id); } }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${ac===m.id && !m.isExt ?'bg-gradient-to-r from-[#8b2f97] to-[#e83d8a] text-white shadow-lg':'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                           <Icon size={18}/>{m.l}
                        </button>
                     </li>
                   ); 
                })}
             </ul>
          </nav>
        </aside>
        
        <main className="flex-1 flex flex-col bg-[#f0f2f5] min-w-0 relative">
          <header className="h-16 bg-white border-b flex items-center px-6 shadow-sm z-10 flex-none gap-4">
            <div className="font-black text-sm flex items-center gap-3 shrink-0"><img src="/logo.png" alt="로고" className="w-6 h-6 sm:hidden object-contain drop-shadow-sm" /><span className="hidden sm:inline">웰쉐어 사회적협동조합</span> <span className="hidden lg:inline font-bold text-gray-400 text-xs">"가치를 살리는 협동"</span></div>
            {cUser && (<div className="flex items-center bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 shadow-inner ml-auto shrink-0 transition-colors hover:bg-indigo-100"><Ic.Cal size={16} className="text-indigo-600 mr-2" /><span className="text-xs font-black text-indigo-800 mr-2 hidden sm:inline">작업월지정:</span><input type="month" value={globalMonth} onChange={e => setGlobalMonth(e.target.value)} className="bg-transparent text-sm font-black text-[#E94287] outline-none cursor-pointer" /></div>)}
            <div className="flex items-center gap-4 shrink-0">{cUser ? (<><span className="text-[10px] font-black px-2 py-1 rounded border text-slate-500 hidden md:inline-block">{cUser.role === 'admin' ? '최고관리자' : (cUser.role === 'office' ? '사무/발주팀' : '물류/현장팀')}</span><span className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full text-blue-700 whitespace-nowrap">{cUser.name}님</span><button onClick={handleLogout} className="text-xs border px-3 py-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors font-bold whitespace-nowrap">로그아웃</button></>) : (<button onClick={()=>setLm(true)} className="bg-black text-white text-xs px-4 py-2 rounded-xl font-black ml-auto">로그인</button>)}</div>
          </header>
          <div className="flex-1 overflow-auto p-6 lg:p-8 relative z-0">{cUser ? rdr() : (<div className="flex h-full items-center justify-center flex-col text-slate-400 opacity-60"><Ic.Lock size={80} className="mb-4 text-slate-300" /><h2 className="text-2xl font-black text-slate-500">데이터 접근이 차단되었습니다</h2><p className="text-sm font-bold mt-2 text-slate-400">좌측 하단의 [로그인] 버튼을 눌러 권한을 인증해 주세요.</p></div>)}</div>

          {lm && (
            <div className="absolute inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-[140px] pb-[100px] px-4 sm:px-8 animate-fade-in notranslate" translate="no" style={{ display: 'block' }}>
              <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm flex flex-col shadow-2xl relative border border-slate-200 mx-auto"><div className="flex-none flex justify-end mb-2"><button onClick={()=>setLm(false)} className="p-2 bg-gray-100 rounded-full hover:text-red-500"><Ic.X size={18}/></button></div><div className="overflow-y-auto flex flex-col justify-center px-1 py-4" style={{ height: '400px' }}><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Ic.Lock size={32}/></div><h2 className="text-2xl font-black mb-8 text-center text-gray-800">보안 로그인</h2><form id="loginForm" onSubmit={handleLoginSubmit} className="space-y-4"><input name="id" value={loginForm.id} onChange={e=>setLoginForm({...loginForm, id: e.target.value})} placeholder="아이디" className="w-full border-2 border-gray-200 p-4 rounded-xl text-sm font-black bg-gray-50 outline-none focus:border-blue-500" required autoFocus/><input name="pwd" value={loginForm.pwd} onChange={e=>setLoginForm({...loginForm, pwd: e.target.value})} type="password" placeholder="비밀번호" className="w-full border-2 border-gray-200 p-4 rounded-xl text-sm font-black bg-gray-50 outline-none focus:border-blue-500" required/><div className="flex items-center justify-between mt-2 px-1"><label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"><input type="checkbox" checked={loginForm.saveId} onChange={e=>setLoginForm({...loginForm, saveId: e.target.checked})} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> ID 저장</label><label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"><input type="checkbox" checked={loginForm.keepLog} onChange={e=>setLoginForm({...loginForm, keepLog: e.target.checked})} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> 로그인 유지</label></div></form></div><div className="flex-none mt-6 rounded-b-[2.5rem]"><button type="submit" form="loginForm" className="w-full bg-[#8b2f97] hover:bg-[#72267c] text-white p-4 rounded-xl font-black text-sm shadow-md transition-colors">시스템 접속</button></div></div>
            </div>
          )}
        </main>
        
        {tt && <div className="fixed bottom-10 right-10 px-6 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 z-[9999] animate-bounce"><Ic.Chk size={18} className="text-green-400"/>{tt.m}</div>}
        <GConfirm is={cfm.is} msg={cfm.msg} onC={cfm.onC} onX={cfm.onX} />
      </div>
    </div>
  );
}

export default function App() {
  const [sLd, setSLd] = useState(false);
  useEffect(() => { 
    document.title = "웰쉐어 영양플러스 발주";
    let l = document.querySelector("link[rel~='icon']"); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = '/logo.png';
    if (!document.querySelector('meta[name="google"]')) { const m = document.createElement('meta'); m.name = 'google'; m.content = 'notranslate'; document.head.appendChild(m); }
    if (!document.getElementById('np-styles')) {
      const s = document.createElement('style'); s.id = 'np-styles';
      s.innerHTML = `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');html,body,#root{margin:0;padding:0;width:100%;height:100%;background-color:#f8fafc;font-family:'Pretendard',sans-serif;}.scrollbar-hide::-webkit-scrollbar{display:none;}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}.animate-fade-in{animation:fadeIn .4s ease-out forwards;}.animate-scale-up{animation:scaleUp .3s cubic-bezier(.16,1,.3,1) forwards;}@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}@keyframes scaleUp{from{opacity:0;transform:scale(.95);}to{opacity:1;transform:none;}}`;
      document.head.appendChild(s);
    }
    if(!document.getElementById('tw')) { const t = document.createElement('script'); t.id='tw'; t.src='https://cdn.tailwindcss.com'; t.onload=()=>setSLd(true); t.onerror=()=>setSLd(true); document.head.appendChild(t); } else setSLd(true); 
  }, []);
  return sLd ? <ErrorBoundary><MainApp /></ErrorBoundary> : <div className="flex h-screen items-center justify-center font-black bg-slate-50 notranslate" translate="no"><Ic.Serv size={40} className="animate-pulse text-purple-600"/><p className="font-black text-slate-500 ml-3">시스템 로딩중...</p></div>;
}