import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

const Ico = ({ size=24, className='', d, children }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} shrink-0="true">{d ? <path d={d}/> : children}</svg>;
const Ic = {
  Dash: p=><Ico {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Ico>,
  Box: p=><Ico {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Ico>,
  List: p=><Ico {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Ico>,
  Users: p=><Ico {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  Bldg: p=><Ico {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></Ico>,
  Search: p=><Ico {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>,
  Left: p=><Ico {...p}><polyline points="15 18 9 12 15 6"/></Ico>,
  Right: p=><Ico {...p}><polyline points="9 18 15 12 9 6"/></Ico>,
  Cal: p=><Ico {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ico>,
  Plus: p=><Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  Edit: p=><Ico {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ico>,
  Trash: p=><Ico {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Ico>,
  X: p=><Ico {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>,
  Chk: p=><Ico {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ico>,
  Alert: p=><Ico {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ico>,
  ListP: p=><Ico {...p}><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></Ico>,
  ListO: p=><Ico {...p}><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></Ico>,
  Copy: p=><Ico {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ico>,
  FileD: p=><Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></Ico>,
  Print: p=><Ico {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></Ico>,
  Star: p=><Ico {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ico>,
  Lock: p=><Ico {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Ico>,
  Ref: p=><Ico {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Ico>,
  User: p=><Ico {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  Settings: p=><Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>,
  MoreVert: p=><Ico {...p}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></Ico>,
  ArrD: p=><Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></Ico>,
  Serv: p=><Ico {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></Ico>,
  Heart: p=><Ico {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Ico>
};

const IS_CANVAS = typeof __firebase_config !== 'undefined';
let app = null, auth = null, db = null;
try {
  const fc = IS_CANVAS ? JSON.parse(__firebase_config) : { apiKey: "AIzaSyDfgyTteXS9p-ksXVAgX0J34K1ExPAWUPk", authDomain: "wssc-nutrition.firebaseapp.com", projectId: "wssc-nutrition", storageBucket: "wssc-nutrition.firebasestorage.app", messagingSenderId: "845373489879", appId: "1:845373489879:web:acf85d5395f0739d0b2692" };
  if (fc && fc.apiKey && fc.apiKey !== "여기에_apiKey를_입력하세요") { app = !getApps().length ? initializeApp(fc) : getApp(); auth = getAuth(app); db = getFirestore(app); }
} catch(e) { console.error(e); }

const appId = typeof __app_id !== 'undefined' ? String(__app_id).replace(/\//g, '_') : 'wssc-production';
const getSyncDocRef = (dbObj, key) => IS_CANVAS ? doc(dbObj, 'artifacts', appId, 'public', 'data', 'wssc_state', key) : doc(dbObj, 'wssc_system_state', key);

const INITIAL_APP_STATE = { clients: [], items: [], mappings: [], categorySortOrder: ['유제품', '가공품', '농산물', '미곡'], packageOrders: [], clientOrders: [], workSchedules: [], suppliers: [], users: [] };

const Utils = {
  cleanData: (data) => JSON.parse(JSON.stringify(data)),
  fmt: n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR')),
  formatWorkUnit: (orderUnit, unitStr) => {
      const num = Number(orderUnit); if (isNaN(num) || num <= 0) return '';
      const u = String(unitStr || '').trim().toLowerCase();
      if (['kg', 'g', 'ml', 'l', '개'].includes(u)) { if (num < 1) { if (u === 'kg') return `${num * 1000}g`; if (u === 'l') return `${num * 1000}ml`; } return `${num}${String(unitStr||'').trim()}`; }
      return `${String(unitStr||'').trim()}*${num}`;
  },
  getDisplayOrderUnit: (val, unit) => {
      const num = Number(val); if (isNaN(num) || num <= 0) return null; 
      const u = String(unit || '').trim().toLowerCase();
      if (!['개', 'kg', 'g', 'ml', 'l'].includes(u) && /^\d/.test(u)) return `${String(unit||'').trim()} X ${num}`;
      if (num < 1) { if (u === 'kg') return `${num * 1000}g`; if (u === 'l') return `${num * 1000}ml`; } return `${num}${String(unit||'').trim()}`;
  },
  sortItems: (arr=[], order=[]) => [...(arr||[])].sort((a,b) => {
    const iA=(order||[]).indexOf(a?.category||'미분류'), iB=(order||[]).indexOf(b?.category||'미분류');
    if(iA!==-1 && iB!==-1){ if(iA!==iB) return iA-iB; } else if(iA!==-1) return -1; else if(iB!==-1) return 1;
    if((a?.category||'')!==(b?.category||'')) return String(a?.category||'').localeCompare(String(b?.category||'')); return String(a?.id||'').localeCompare(String(b?.id||''));
  }),
  calculateWorkDate: (str) => {
      if (!str) return null; const [y, m, d] = String(str).split('-').map(Number); let date = new Date(y, m - 1, d - 1); 
      while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  dlExcel: (html, fn) => {
    const b = new Blob(['\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>'+html+'</body></html>'], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `${fn}_${Date.now()}.xls`; l.click();
  },
  genId: () => Math.random().toString(36).substr(2, 9)
};

const PKG_NUMS = [1, 2, 3, 4, 5, 6]; 
const PKG_TYPES = ['일반', '조제', '혼합', '완모', '직접입력'];

/* 🌟 프리징 방지 및 인쇄 폰트 초거대 확대(+50% -> 1.5배), 높이 증가(+20%) CSS 스코프 */
const GLOBAL_PRINT_STYLE = `
@media print { 
    /* 불필요한 메인 화면 렌더링 강제 종료 (CPU 폭주 및 검은 배경 방지) */
    #main-app { display: none !important; }
    .print\\:hidden { display: none !important; } 
    .print\\:block { display: block !important; } 
    .print\\:static { position: static !important; } 
    
    /* 스크롤 해제 */
    .print\\:overflow-visible { overflow: visible !important; } 
    .print\\:h-auto { height: auto !important; } 
    .print\\:min-h-0 { min-height: 0 !important; } 
    
    /* 인쇄 시 검은색 테마를 완벽하게 하얀색으로 덮어씀 */
    body, html, #root, .fixed, .inset-0 { 
        background-color: white !important; 
        background: none !important;
        margin: 0; padding: 0; 
        overflow: visible !important; 
        height: auto !important; 
        -webkit-print-color-adjust: exact; 
        color-adjust: exact; 
        color: black !important;
        font-family: 'NanumSquare', sans-serif !important; 
    }
    @page { margin: 15mm; size: auto; } 
    
    /* 테이블 폭 고정 해제 및 글씨 줄바꿈 적용 */
    table { page-break-inside: auto; width: 100% !important; } 
    .print\\:table-auto { table-layout: auto !important; }
    thead { display: table-header-group; } 
    tfoot { display: table-footer-group; } 
    tr { page-break-inside: avoid; page-break-after: auto; } 
    th, td { white-space: normal !important; word-break: keep-all !important; overflow-wrap: break-word !important; }
    
    /* 🌟 현장 요청: 인쇄 전용 폰트 1.5배(150%) 초거대 확대 및 셀 높이(Padding) 추가 20% 확보 */
    .print\\:text-\\[24px\\] { font-size: 24px !important; line-height: 1.2 !important; }
    .print\\:text-\\[48px\\] { font-size: 48px !important; line-height: 1.2 !important; } /* 순번용 확대 */
    .print\\:text-\\[80px\\] { font-size: 80px !important; line-height: 1.2 !important; } /* 괄호 단위용 확대 (60->80) */
    .print\\:text-\\[100px\\] { font-size: 100px !important; line-height: 1.15 !important; } /* 특이사항 별표용 확대 */
    .print\\:text-\\[150px\\] { font-size: 150px !important; line-height: 1.1 !important; } /* 🌟 신규: 품명 1.5배 초거대 확대 */
    .print\\:text-\\[126px\\] { font-size: 126px !important; line-height: 1.05 !important; } /* 수량 확대 유지 */
    
    .print\\:py-4 { padding-top: 20px !important; padding-bottom: 20px !important; }
    .print\\:py-12 { padding-top: 40px !important; padding-bottom: 40px !important; } /* 🌟 신규: 셀 상하 높이 대폭 확보 */
    .print\\:w-auto { width: auto !important; }
    .print\\:min-w-0 { min-width: 0 !important; }
}`;

function OrderSummaryUnitMatrixView({ targetMonth, targetWorkDate, clients, items, clientOrders, mappings, categorySortOrder, getMappedWorkDate, setIsSubPrinting, setMatrixPrintData, setPortraitPrintData }) {
    const { d1List, d2List } = useMemo(() => {
        const d1 = [], d2 = [];
        (clients||[]).forEach(c => {
            if(!c || !c.id) return;
            const ord = (clientOrders||[]).find(o => o?.clientId === c?.id && o?.month === targetMonth); if (!ord) return;
            if (ord?.deliveryDate1 && (ord?.items||[]).some(i => Number(i?.qty1) > 0)) { const wDate = getMappedWorkDate(ord.deliveryDate1); if (wDate) d1.push({ date: wDate, cId: c.id, cName: c?.shortName || c?.name || '미지정' }); }
            if (ord?.deliveryDate2 && (ord?.items||[]).some(i => Number(i?.qty2) > 0)) { const wDate = getMappedWorkDate(ord.deliveryDate2); if (wDate) d2.push({ date: wDate, cId: c.id, cName: c?.shortName || c?.name || '미지정' }); }
        });
        d1.sort((a,b) => String(a?.date||'').localeCompare(String(b?.date||'')) || String(a?.cName||'').localeCompare(String(b?.cName||'')));
        d2.sort((a,b) => String(a?.date||'').localeCompare(String(b?.date||'')) || String(a?.cName||'').localeCompare(String(b?.cName||'')));
        return { d1List: d1, d2List: d2 };
    }, [clients, clientOrders, targetMonth, getMappedWorkDate]);

    const TARGET_CATEGORIES = ['쌀', '잡곡', '건어물', '야채', '과일', '버섯', '우유', '김'];

    const matrixRows = useMemo(() => {
        const rowMap = new Map();
        (clientOrders||[]).filter(o => o?.month === targetMonth).forEach(o => {
            const tMap = (mappings||[]).filter(ma => ma?.clientId === o?.clientId).sort((a,b)=>String(b?.month||'').localeCompare(String(a?.month||'')))[0];
            (o?.items||[]).forEach(it => {
                if (Number(it?.qty1) > 0 || Number(it?.qty2) > 0) {
                    const master = (items||[]).find(x => x?.id === it?.itemId);
                    if (master && TARGET_CATEGORIES.includes(master?.category)) {
                        let mItem = tMap?.mappedItems?.find(mi => (it?.mappingUid && mi?.uid === it?.mappingUid) || mi?.itemId === it?.itemId);
                        const unitVal = Number(it?.orderUnit || mItem?.orderUnit || 1);
                        const key = `${it?.itemId}_${unitVal}`;
                        if (!rowMap.has(key)) rowMap.set(key, { key, itemId: it?.itemId, orderUnit: unitVal, master });
                    }
                }
            });
        });
        return Array.from(rowMap.values()).sort((a,b) => {
            const iA = (categorySortOrder||[]).indexOf(a?.master?.category), iB = (categorySortOrder||[]).indexOf(b?.master?.category);
            if (iA !== iB) return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
            if (String(a?.master?.name||'') !== String(b?.master?.name||'')) return String(a?.master?.name||'').localeCompare(String(b?.master?.name||''));
            return (b?.orderUnit||0) - (a?.orderUnit||0); 
        });
    }, [clientOrders, targetMonth, mappings, items, categorySortOrder]);

    const getQty = useCallback((cId, row, isR1) => {
        const ord = (clientOrders||[]).find(o => o?.clientId === cId && o?.month === targetMonth); if(!ord) return 0;
        const tMap = (mappings||[]).filter(ma => ma?.clientId === cId).sort((a,b)=>String(b?.month||'').localeCompare(String(a?.month||'')))[0];
        let tot = 0;
        (ord?.items||[]).forEach(oi => {
            if (oi?.itemId === row?.itemId) {
                let mItem = tMap?.mappedItems?.find(mi => (oi?.mappingUid && mi?.uid === oi?.mappingUid) || mi?.itemId === oi?.itemId);
                if (Number(oi?.orderUnit || mItem?.orderUnit || 1) === row?.orderUnit) tot += Number(isR1 ? oi?.qty1 : oi?.qty2) || 0;
            }
        });
        return tot;
    }, [clientOrders, targetMonth, mappings]);

    const getDisplayName = useCallback((mName, oUnit, mUnit) => {
        const num = Number(oUnit), u = String(mUnit || '').trim(), uL = u.toLowerCase();
        if (!mName) return ''; 
        let fUnit = ['kg', 'g', 'ml', 'l'].includes(uL) ? (num < 1 ? (uL === 'kg' ? `${num * 1000}g` : uL === 'l' ? `${num * 1000}ml` : `${num}${u}`) : `${num}${u}`) : (num === 1 ? u : `${u}*${num}`);
        return `${mName} ${fUnit}`.trim();
    }, []);

    const displayMonth = String(targetMonth||'').split('-')[1] || '';

    // 🌟 모달창 렌더링을 위해 최상위 컴포넌트로 데이터 전송 (Modal Elevation)
    const openMatrixPrint = (t, c) => { 
        setMatrixPrintData({ 
            title: t, 
            categories: c, 
            matrixRows, 
            d1List, 
            d2List, 
            displayMonth, 
            getQty, 
            getDisplayName 
        }); 
        setIsSubPrinting(true); 
    };
    const openPortraitPrint = () => {
        if (!targetWorkDate) return alert("매칭일(작업일자)을 선택해 주세요.");
        const fRows = matrixRows.filter(r => ['야채', '과일', '버섯'].includes(r?.master?.category));
        const tD1 = d1List.filter(d => d?.date === targetWorkDate).map(d => d?.cId), tD2 = d2List.filter(d => d?.date === targetWorkDate).map(d => d?.cId);
        const data = fRows.map((r, i) => {
            let tot = 0; tD1.forEach(c => tot += getQty(c, r, true)); tD2.forEach(c => tot += getQty(c, r, false));
            return { idx: i + 1, name: getDisplayName(r?.master?.name, r?.orderUnit, r?.master?.unit), totalQty: tot };
        }).filter(it => it.totalQty > 0);
        setPortraitPrintData({ date: targetWorkDate, data }); 
        setIsSubPrinting(true);
    };

    return (
        <div className="flex flex-col flex-1 w-full relative min-h-[600px]">
            {/* 🌟 기존의 우아한 다크 테마 완벽 복구 */}
            <div className={`bg-[#1e293b] rounded-[2rem] shadow-xl border border-slate-700/50 flex flex-col h-full overflow-hidden relative`}>
                <div className="p-5 border-b border-slate-700/50 flex flex-wrap justify-between items-center bg-[#1e293b] shrink-0 relative z-10 gap-4">
                    <div className="flex items-center gap-3 shrink-0"><div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><Ic.ListO size={20}/></div><h2 className="text-xl font-black text-white">소분작업내역</h2></div>
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* 🌟 고대비 야광 그라데이션 버튼 (다크 테마 환경에서 시인성 극대화) */}
                        <button onClick={()=>openMatrixPrint('전체 소분작업내역', null)} className="bg-indigo-600 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 px-5 py-2.5 rounded-xl font-black text-[13px] flex items-center gap-1.5 transition-all"><Ic.Search size={16}/> 전체 인쇄 미리보기</button>
                        <div className="w-px h-6 bg-slate-700 mx-0.5 hidden md:block"></div>
                        <button onClick={()=>openMatrixPrint('쌀, 잡곡 소분작업내역', ['쌀', '잡곡', '건어물', '김'])} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:-translate-y-0.5 px-5 py-2.5 rounded-xl font-black text-[13px] flex items-center gap-1.5 transition-all border border-orange-400"><Ic.FileD size={16}/> 쌀, 잡곡 출력</button>
                        <button onClick={()=>openMatrixPrint('야채, 과일 소분작업내역', ['야채', '과일', '버섯', '우유'])} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:-translate-y-0.5 px-5 py-2.5 rounded-xl font-black text-[13px] flex items-center gap-1.5 transition-all border border-emerald-400"><Ic.FileD size={16}/> 야채, 과일 출력</button>
                        <div className="w-px h-6 bg-slate-700 mx-0.5 hidden md:block"></div>
                        <button onClick={openPortraitPrint} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-black text-[14px] shadow-lg shadow-rose-500/40 hover:shadow-rose-500/60 hover:-translate-y-0.5 border border-rose-400 transition-all flex items-center gap-2"><Ic.Print size={18}/> 신선식품 출력 ({targetWorkDate})</button>
                        <div className="w-px h-6 bg-slate-700 mx-0.5 hidden md:block"></div>
                        <button onClick={()=>Utils.dlExcel(`<style>table{border-collapse:collapse;font-size:10pt}th,td{border:.5pt solid windowtext;padding:5px;text-align:center}.hp{background-color:#8B208B;color:white;font-size:16pt}.hb{background-color:#d4e6f1}.hg{background-color:#e9f7ef}.hr{background-color:#fce4d6;color:red}.n{mso-number-format:"\\#\\,\\#\\#0"}.tl{text-align:left}</style>`+document.getElementById('summary-unit-matrix-table').outerHTML, `소분작업내역_${targetMonth}`)} className="bg-[#0f172a] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/30 shadow-sm px-4 py-2.5 rounded-xl font-black text-[13px] flex items-center gap-1.5 transition-all"><Ic.FileD size={16}/> 엑셀</button>
                    </div>
                </div>
                
                <div className="flex-1 w-full bg-[#0f172a] p-4 sm:p-6 flex flex-col relative z-0">
                    <div className="flex-1 w-full overflow-auto bg-[#1e293b] border border-slate-700 shadow-sm rounded-xl">
                        <table id="summary-unit-matrix-table" className="min-w-max w-full text-[12.5px] text-center border-collapse whitespace-nowrap">
                            <thead className="sticky top-0 z-[50] shadow-sm">
                                <tr>
                                    <th colSpan={3+d1List.length+d2List.length+(d1List.length?1:0)+(d2List.length?1:0)} className="bg-indigo-900 text-white p-3 text-lg font-black border border-slate-700 hp">{displayMonth}월 보건소별 소분작업 내역</th>
                                </tr>
                                <tr>
                                    <th rowSpan="2" className="bg-[#334155] border border-slate-700 px-3 py-2 font-black text-slate-200 w-12 min-w-[3rem]">No.</th>
                                    <th rowSpan="2" className="bg-[#334155] border border-slate-700 px-4 py-2 font-black text-slate-200 min-w-[200px]">마스터 품명</th>
                                    {d1List.length>0 && <th colSpan={d1List.length} className="bg-blue-900/40 border border-slate-700 py-2 text-blue-300 font-black hb">1차 발주 작업</th>}
                                    {d1List.length>0 && <th rowSpan="2" className="bg-blue-800 border border-slate-700 px-3 min-w-[80px] text-white font-black header-blue">1차 소계</th>}
                                    {d2List.length>0 && <th colSpan={d2List.length} className="bg-[#e9f7ef] border border-slate-700 py-2 text-emerald-300 font-black hg">2차 발주 작업</th>}
                                    {d2List.length>0 && <th rowSpan="2" className="bg-emerald-800 border border-slate-700 px-3 min-w-[80px] text-white font-black header-green">2차 소계</th>}
                                    <th rowSpan="2" className="bg-rose-900/50 border border-slate-700 px-4 min-w-[90px] text-rose-300 font-black hr">총계</th>
                                </tr>
                                <tr>
                                    {d1List.map(c => <th key={`h1-${c?.cId}`} className="bg-blue-900/20 border border-slate-700 px-2 py-1.5 min-w-[60px] text-[11px] font-black text-slate-300 leading-tight hb">{String(c?.cName||'').substring(0,3)}<br/><span className="text-[9px] text-slate-400 font-bold">({String(c?.date||'').substring(5)})</span></th>)}
                                    {d2List.map(c => <th key={`h2-${c?.cId}`} className="bg-emerald-900/20 border border-slate-700 px-2 py-1.5 min-w-[60px] text-[11px] font-black text-slate-300 leading-tight hg">{String(c?.cName||'').substring(0,3)}<br/><span className="text-[9px] text-slate-400 font-bold">({String(c?.date||'').substring(5)})</span></th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-[#1e293b]">
                                {matrixRows.length===0 ? <tr><td colSpan="99" className="py-32 text-slate-500 font-bold text-base text-center">해당 월에 발주된 지정 품목 내역이 없습니다.</td></tr> : 
                                 matrixRows.map((r, i) => {
                                    let t1=0, t2=0; const nm = getDisplayName(r?.master?.name, r?.orderUnit, r?.master?.unit);
                                    return (
                                        <tr key={r?.key} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                            <td className="border border-slate-700 font-bold text-slate-400 px-2 py-2">{i+1}</td>
                                            <td className="border border-slate-700 font-black text-slate-200 px-4 text-left tl">{nm}</td>
                                            {d1List.map(c=>{ const v=getQty(c?.cId,r,true); t1+=v; return <td key={`c1-${c?.cId}`} className="border border-slate-700 font-bold px-2 text-right n text-slate-300">{v>0?Utils.fmt(v):''}</td>; })}
                                            {d1List.length>0 && <td className="bg-blue-900/20 border border-slate-700 font-black text-blue-400 text-right px-3 n">{t1>0?Utils.fmt(t1):''}</td>}
                                            {d2List.map(c=>{ const v=getQty(c?.cId,r,false); t2+=v; return <td key={`c2-${c?.cId}`} className="border border-slate-700 font-bold px-2 text-right n text-slate-300">{v>0?Utils.fmt(v):''}</td>; })}
                                            {d2List.length>0 && <td className="bg-emerald-900/20 border border-slate-700 font-black text-emerald-400 text-right px-3 n">{t2>0?Utils.fmt(t2):''}</td>}
                                            <td className="bg-rose-900/20 border border-slate-700 font-black text-rose-400 px-4 text-right n hr">{t1+t2>0?Utils.fmt(t1+t2):''}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WorkOrderApp() {
  const [dbLd, setDbLd] = useState(false);
  const [st, setSt] = useState(INITIAL_APP_STATE);
  
  const [cUser, setCUser] = useState(() => { const saved = localStorage.getItem('wssc_wo_cUser'); return saved ? JSON.parse(saved) : null; });
  const [loginData, setLoginData] = useState({ id: localStorage.getItem('wssc_wo_savedId') || '', pwd: '', saveId: localStorage.getItem('wssc_wo_saveId') === 'true', keepLog: false });

  const isLog = !!cUser; 
  const [user, setUser] = useState(null); 
  const todayStr = new Date().toISOString().split('T')[0];
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());
  const [targetClient, setTargetClient] = useState('');
  const [targetWorkDate, setTargetWorkDate] = useState(Utils.calculateWorkDate(todayStr) || todayStr);
  const [packDate, setPackDate] = useState(todayStr);

  const [activeTab, setActiveTab] = useState('calendar'); 
  const [editingPkg, setEditingPkg] = useState(null);
  
  const [newPkgModal, setNewPkgModal] = useState({ is: false, num: 1, type: '일반', customType: '', count: 0, round: 1, pkgNote: '' });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const initBulkGrid = () => [1,2,3,4,5,6].reduce((a,v)=>({...a,[v]:v<=3?[{id:Utils.genId(),type:'일반',q1:'',q2:'',isCustom:false},{id:Utils.genId(),type:'조제',q1:'',q2:'',isCustom:false},{id:Utils.genId(),type:'혼합',q1:'',q2:'',isCustom:false},{id:Utils.genId(),type:'완모',q1:'',q2:'',isCustom:false}]:[{id:Utils.genId(),type:'일반',q1:'',q2:'',isCustom:false}]}),{});
  const [bulkGrid, setBulkGrid] = useState(initBulkGrid());

  /* 🌟 인쇄 전용 상태 관리 */
  const [packagePrintPreview, setPackagePrintPreview] = useState(null);
  const [pickingPrintPreview, setPickingPrintPreview] = useState(false); 
  const [matrixPrintData, setMatrixPrintData] = useState(null);
  const [portraitPrintData, setPortraitPrintData] = useState(null);
  const [isSubPrinting, setIsSubPrinting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!auth) { setDbLd(true); return; } 
    const initAuth = async () => { 
      try { 
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); 
        else await signInAnonymously(auth); 
      } catch (err) { console.error(err); if(isMounted) setDbLd(true); } 
    }; 
    initAuth();
    const unsubAuth = onAuthStateChanged(auth, (u) => { if(isMounted) { setUser(u); if(!u) setDbLd(true); } }); 
    return () => { isMounted = false; unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!user || !db) return; 
    let isCancelled = false;
    const collRef = IS_CANVAS ? collection(db, 'artifacts', appId, 'public', 'data', 'wssc_state') : collection(db, 'wssc_system_state');
    const unsub = onSnapshot(collRef, (snapshot) => {
        if (isCancelled) return;
        setSt(prev => {
            const nx = { ...prev };
            snapshot.forEach(d => { if (Object.keys(INITIAL_APP_STATE).includes(d.id)) nx[d.id] = d.data().data; });
            return nx;
        });
        setDbLd(true);
    }, (err) => { if (isCancelled) return; console.error('DB Fetch Error:', err); setDbLd(true); });
    return () => { isCancelled = true; unsub(); };
  }, [user?.uid]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const u = (st.users || []).find(x => x && x.id === loginData.id && x.password === loginData.pwd);
    if (u) {
       setCUser(u);
       if (loginData.saveId) { localStorage.setItem('wssc_wo_savedId', loginData.id); localStorage.setItem('wssc_wo_saveId', 'true'); } 
       else { localStorage.removeItem('wssc_wo_savedId'); localStorage.setItem('wssc_wo_saveId', 'false'); }
       if (loginData.keepLog) localStorage.setItem('wssc_wo_cUser', JSON.stringify(u));
    } else alert('아이디 또는 비밀번호가 일치하지 않거나, 메인 시스템에 등록되지 않은 계정입니다.');
  };
  const handleLogout = () => { setCUser(null); localStorage.removeItem('wssc_wo_cUser'); setIsUserMenuOpen(false); };
  const updateSt = (k, v) => { setSt(p => { const n = { ...p, [k]: typeof v === 'function' ? v(p[k]) : v }; if(user && db) setDoc(getSyncDocRef(db, k), { data: Utils.cleanData(n[k]) }).catch(console.error); return n; }); };

  const importJson = (e) => {
      const f = e.target.files[0]; if(!f) return; const r = new FileReader();
      r.onload = async (ev) => {
          try {
              const data = JSON.parse(ev.target.result);
              if(window.confirm('🚨 스마트 파티션 병합 진행하시겠습니까?')) {
                  const keys = ['items', 'clients', 'clientOrders', 'mappings', 'suppliers', 'categorySortOrder', 'lossRates', 'itemLossRates', 'aiOrderOverrides', 'purchaseRequests', 'users'];
                  if(user && db) await Promise.all(keys.map(k => { if (data[k] !== undefined) return setDoc(getSyncDocRef(db, k), { data: Utils.cleanData(data[k]) }); return Promise.resolve(); }));
                  alert('✅ 병합 완료!');
              }
          } catch(err) { alert('파일 형식 오류'); }
      }; r.readAsText(f); e.target.value = null; setShowAdminModal(false);
  };
  
  const importFullJson = (e) => {
      const f = e.target.files[0]; if(!f) return; const r = new FileReader();
      r.onload = async (ev) => {
          try {
              const data = JSON.parse(ev.target.result);
              if(window.confirm('🚨 전체 복원 진행하시겠습니까?')) {
                  if(user && db) await Promise.all(Object.keys(INITIAL_APP_STATE).map(k => setDoc(getSyncDocRef(db, k), { data: Utils.cleanData(data[k] || INITIAL_APP_STATE[k]) })));
                  alert('✅ 복원 완료!');
              }
          } catch(err) { alert('파일 형식 오류'); }
      }; r.readAsText(f); e.target.value = null; setShowAdminModal(false);
  };

  const exp = () => { const b=new Blob([JSON.stringify(st,null,2)], {type:"application/json"}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download=`backup_${Date.now()}.json`; l.click(); setShowAdminModal(false); };
  const clearMockData = async () => { if(window.confirm('데이터베이스 초기화?')) { if(user && db) { try { await Promise.all(Object.keys(INITIAL_APP_STATE).map(k => setDoc(getSyncDocRef(db, k), { data: INITIAL_APP_STATE[k] }))); alert('초기화 완료'); } catch (e) { alert('오류: ' + e.message); } } } setShowAdminModal(false); };

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
      if(!deliveryDateStr) return null;
      const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
      if(override) return override.workDate;
      return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

  const availableWorkDates = useMemo(() => {
      const dates = { round1: new Set(), round2: new Set() };
      (st.clientOrders || []).filter(o => o?.month === targetMonth).forEach(o => {
          const wd1 = getMappedWorkDate(o?.deliveryDate1), wd2 = getMappedWorkDate(o?.deliveryDate2);
          if (wd1) dates.round1.add(wd1); if (wd2) dates.round2.add(wd2);
      });
      return { round1: Array.from(dates.round1).sort(), round2: Array.from(dates.round2).sort() };
  }, [st.clientOrders, targetMonth, getMappedWorkDate]);

  const [calDate, setCalDate] = useState(new Date());
  useEffect(() => { const [y, m] = String(targetMonth||'').split('-').map(Number); setCalDate(new Date(y, m - 1, 1)); }, [targetMonth]);
  const yr = calDate.getFullYear(), mo = calDate.getMonth();
  const daysInMonth = new Date(yr, mo+1, 0).getDate(), firstDay = new Date(yr, mo, 1).getDay();
  const calendarArray = Array(firstDay).fill(null).concat([...Array(daysInMonth).keys()].map(i=>i+1));
  const rem = calendarArray.length % 7; const fullCalendarArray = rem > 0 ? calendarArray.concat(Array(7 - rem).fill(null)) : calendarArray;
  const handlePrevMonth = () => { const prev = new Date(yr, mo - 1, 1); setTargetMonth(`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`); };
  const handleNextMonth = () => { const next = new Date(yr, mo + 1, 1); setTargetMonth(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`); };

  const scheduleData = useMemo(() => {
      const works = {};      
      (st.clientOrders || []).forEach(o => {
          if(o?.deliveryDate1) { const wd1 = getMappedWorkDate(o.deliveryDate1); if(wd1) { if(!works[wd1]) works[wd1]=[]; works[wd1].push({ deliveryDate: o.deliveryDate1, clientId: o.clientId, round: 1 }); } }
          if(o?.deliveryDate2) { const wd2 = getMappedWorkDate(o.deliveryDate2); if(wd2) { if(!works[wd2]) works[wd2]=[]; works[wd2].push({ deliveryDate: o.deliveryDate2, clientId: o.clientId, round: 2 }); } }
      });
      return { works };
  }, [st.clientOrders, getMappedWorkDate]);

  const ordersToWorkToday = useMemo(() => {
      const result = [];
      (st.clientOrders || []).forEach(o => {
          if(!o) return;
          const wd1 = getMappedWorkDate(o?.deliveryDate1), wd2 = getMappedWorkDate(o?.deliveryDate2);
          if(wd1 === targetWorkDate) result.push({ ...o, targetRound: 1, deliveryDate: o.deliveryDate1 });
          if(wd2 === targetWorkDate) result.push({ ...o, targetRound: 2, deliveryDate: o.deliveryDate2 });
      });
      return result;
  }, [st.clientOrders, targetWorkDate, getMappedWorkDate]);

  const packClientsForDate = useMemo(() => {
      const activeIds = new Set();
      (st.clientOrders || []).forEach(o => {
          if(!o) return;
          const wd1 = getMappedWorkDate(o?.deliveryDate1), wd2 = getMappedWorkDate(o?.deliveryDate2);
          if(wd1 === packDate || wd2 === packDate) activeIds.add(o.clientId);
      });
      return (st.clients || []).filter(c => c && activeIds.has(c.id)).sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||'')));
  }, [st.clientOrders, st.clients, packDate, getMappedWorkDate]);

  const currentPackages = useMemo(() => {
      const pkgs = (st.packageOrders || []).filter(p => p?.month === targetMonth && (!targetClient || p?.clientId === targetClient));
      if (targetClient) {
          const hasC23 = pkgs.some(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
          const hasC46 = pkgs.some(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
          if (!hasC46) pkgs.unshift({ id: `VIRTUAL_C46`, clientId: targetClient, month: targetMonth, round: 0, pkgGroup: '산모용 (4~6)', pkgNum: '4~6공통', pkgType: '공통', personCount: '-', items: [] });
          if (!hasC23) pkgs.unshift({ id: `VIRTUAL_C23`, clientId: targetClient, month: targetMonth, round: 0, pkgGroup: '아기용 (2~3)', pkgNum: '2~3공통', pkgType: '공통', personCount: '-', items: [] });
      }
      return pkgs;
  }, [st.packageOrders, targetMonth, targetClient]);

  const getPkgItemCount = useCallback((pkg) => {
      if (!pkg || !pkg.items) return 0;
      let count = (pkg.items||[]).filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
      if (pkg.pkgType !== '공통' && !String(pkg.pkgNum).startsWith('4-1')) {
          const common23 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통'), common46 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
          if ((pkg.pkgNum == 2 || pkg.pkgNum == 3) && common23 && common23.items) count += (common23.items||[]).filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
          if (pkg.pkgNum >= 4 && pkg.pkgNum <= 6 && common46 && common46.items) count += (common46.items||[]).filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
      } return count;
  }, [currentPackages]);

  const getMappedItem = useCallback((clientId, itemId, mappingUid = null) => {
      const masterItem = (st.items || []).find(i => i?.id === itemId) || {};
      const clientMap = (st.mappings || []).find(m => m?.clientId === clientId && m?.month === targetMonth) || (st.mappings || []).find(m => m?.clientId === clientId);
      let mapped = null;
      if (clientMap) {
          if (mappingUid) mapped = (clientMap.mappedItems || []).find(m => m?.uid === mappingUid);
          if (!mapped) mapped = (clientMap.mappedItems || []).find(m => m?.itemId === itemId);
      }
      return { itemId: itemId, mappingUid: mapped?.uid || mappingUid, category: masterItem?.category || '미분류', name: mapped?.clientItemName || masterItem?.name || '알수없는 품목', unit: masterItem?.unit || '', orderUnit: mapped?.orderUnit || 1 };
  }, [st.items, st.mappings, targetMonth]);

  const handleAddPackage = (e) => {
      if(e) e.preventDefault(); if(!targetClient) return alert('보건소를 선택해주세요.'); if(newPkgModal.count <= 0) return alert('수량을 입력해주세요.');
      const finalType = newPkgModal.type === '직접입력' ? newPkgModal.customType : newPkgModal.type;
      if(!String(finalType).trim()) return alert('상세 타입을 입력해주세요.');
      const derivedGroup = newPkgModal.num <= 3 ? '아기용 (1~3)' : '산모용 (4~6)';
      const newPkg = { id: `PKG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, clientId: targetClient, month: targetMonth, round: newPkgModal.round, pkgGroup: derivedGroup, pkgNum: newPkgModal.num, pkgType: finalType, personCount: Number(newPkgModal.count), items: [], pkgNote: newPkgModal.pkgNote };
      updateSt('packageOrders', [...(st.packageOrders || []), newPkg]); setNewPkgModal({ ...newPkgModal, is: false, count: 0, customType: '', pkgNote: '' });
  };

  const deletePackage = (id) => { if(window.confirm('패키지를 삭제하시겠습니까?')) { updateSt('packageOrders', (st.packageOrders || []).filter(p => p?.id !== id)); if(editingPkg?.id === id) setEditingPkg(null); } };

  const handleCopyPackage = (sourcePkg) => {
      if(!editingPkg) return;
      const copiedItems = (sourcePkg?.items||[]).map(it => ({ ...it, uid: `U_${Date.now()}_${Math.random()}` }));
      const updatedPkg = { ...editingPkg, items: copiedItems };
      updateSt('packageOrders', (st.packageOrders || []).map(p => p?.id === updatedPkg.id ? updatedPkg : p));
      setEditingPkg(updatedPkg); setShowCopyModal(false);
  };

  const savePackageItems = (nxItems) => {
      if (String(editingPkg?.id||'').startsWith('VIRTUAL_')) {
          const realId = `PKG_${Date.now()}_${Utils.genId()}`; const newPkg = { ...editingPkg, id: realId, items: nxItems };
          updateSt('packageOrders', [...(st.packageOrders || []), newPkg]); setEditingPkg(newPkg);
      } else {
          updateSt('packageOrders', (st.packageOrders||[]).map(p => p?.id === editingPkg?.id ? {...editingPkg, items: nxItems} : p)); setEditingPkg({...editingPkg, items: nxItems});
      }
  };

  const updatePackageMeta = (field, val) => {
      if (!editingPkg || editingPkg.pkgType === '공통') return;
      const updatedPkg = { ...editingPkg, [field]: field === 'personCount' ? (Number(val) || 0) : val };
      updateSt('packageOrders', (st.packageOrders||[]).map(p => p?.id === editingPkg?.id ? updatedPkg : p)); setEditingPkg(updatedPkg);
  };

  const handleItemInput = (mappingItem, field, val) => {
      if(!editingPkg) return; let nx = [...(editingPkg.items || [])];
      const existingIdx = mappingItem?.isManual ? nx.findIndex(i => i?.isManual && i?.uid === mappingItem?.uid) : nx.findIndex(i => !i?.isManual && (i?.mappingUid === mappingItem?.uid || (!i?.mappingUid && i?.itemId === mappingItem?.itemId)));
      if (existingIdx >= 0) {
          if (field === 'qtyPerPerson' && (val === '' || Number(val) <= 0) && !nx[existingIdx]?.note) { if (mappingItem?.isManual) nx[existingIdx] = { ...nx[existingIdx], [field]: val }; else nx.splice(existingIdx, 1); } 
          else { nx[existingIdx] = { ...nx[existingIdx], [field]: val, mappingUid: mappingItem?.isManual ? null : mappingItem?.uid }; }
      } else {
          if (val !== '' && (field === 'qtyPerPerson' ? Number(val) > 0 : true)) nx.push({ uid: mappingItem?.isManual ? mappingItem?.uid : `U_${Date.now()}_${Math.random()}`, mappingUid: mappingItem?.isManual ? null : mappingItem?.uid, itemId: mappingItem?.itemId, qtyPerPerson: field === 'qtyPerPerson' ? val : '', note: field === 'note' ? val : '', isManual: mappingItem?.isManual, manualUnit: field === 'manualUnit' ? val : (mappingItem?.manualUnit || ''), manualOrderUnit: field === 'manualOrderUnit' ? val : (mappingItem?.manualOrderUnit || '') });
      }
      savePackageItems(nx);
  };

  const addManualItemFromMaster = (itemId) => {
      if(!editingPkg || !itemId) return; let nx = [...(editingPkg.items || [])];
      nx.push({ uid: `U_MANUAL_${Date.now()}_${Math.random()}`, mappingUid: null, itemId: itemId, qtyPerPerson: '', note: '', isManual: true, manualUnit: '', manualOrderUnit: '' });
      savePackageItems(nx);
  };

  const handleNameChange = (mappingUid, newName) => {
      const nxMappings = [...(st.mappings || [])], cIdx = nxMappings.findIndex(m => m?.clientId === targetClient);
      if (cIdx >= 0) {
          const iIdx = (nxMappings[cIdx]?.mappedItems||[]).findIndex(i => i?.uid === mappingUid);
          if (iIdx >= 0) { nxMappings[cIdx].mappedItems[iIdx].clientItemName = newName; updateSt('mappings', nxMappings); }
      }
  };

  const openBulkModal = () => {
      try {
          if(!targetClient) return alert('보건소를 먼저 선택해 주세요.');
          const newGrid = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
          const defaults = { 1: ['일반', '조제', '혼합', '완모'], 2: ['일반', '조제', '혼합', '완모'], 3: ['일반', '조제', '혼합', '완모'], 4: ['일반'], 5: ['일반'], 6: ['일반'] };
          const existing = {};
          
          (st.packageOrders || []).filter(p => p?.clientId === targetClient && p?.month === targetMonth && p?.pkgType !== '공통').forEach(p => {
              const num = Number(p?.pkgNum);
              if(isNaN(num) || !PKG_NUMS.includes(num)) return;
              const type = String(p?.pkgType || '일반').trim();
              const key = `${num}_${type}`;
              if (!existing[key]) existing[key] = { q1: '', q2: '', p1: null, p2: null };
              if (p?.round === 1) { existing[key].q1 = p?.personCount; existing[key].p1 = p; }
              if (p?.round === 2) { existing[key].q2 = p?.personCount; existing[key].p2 = p; }
          });

          PKG_NUMS.forEach(num => {
              const typesToAdd = new Set(defaults[num]);
              Object.keys(existing).forEach(k => { 
                  const parts = k.split('_');
                  if(parts.length === 2 && Number(parts[0]) === num) typesToAdd.add(parts[1]); 
              });
              Array.from(typesToAdd).forEach(type => {
                  const ex = existing[`${num}_${type}`] || {};
                  newGrid[num].push({ id: Utils.genId(), type: type, q1: ex.q1 || '', q2: ex.q2 || '', p1: ex.p1 || null, p2: ex.p2 || null, isCustom: !defaults[num].includes(type) });
              });
          });
          setBulkGrid(newGrid); setShowBulkModal(true);
      } catch(e) {
          console.error(e);
          alert("모달창을 여는 중 문제가 발생했습니다.");
      }
  };

  const handleBulkUpdate = (num, id, field, val) => { setBulkGrid(prev => ({ ...prev, [num]: (prev[num]||[]).map(item => item?.id === id ? { ...item, [field]: val } : item) })); };
  const handleBulkAddRow = (num) => { setBulkGrid(prev => ({ ...prev, [num]: [...(prev[num]||[]), { id: Utils.genId(), type: '', q1: '', q2: '', p1: null, p2: null, isCustom: true }] })); };
  const handleBulkRemoveRow = (num, id) => { setBulkGrid(prev => ({ ...prev, [num]: (prev[num]||[]).filter(item => item?.id !== id) })); };
  const handleBulkReset = () => { if(window.confirm('입력한 모든 수량을 초기화하시겠습니까?')) { const nx = { ...bulkGrid }; PKG_NUMS.forEach(n => nx[n] = (nx[n]||[]).map(i => ({...i, q1:'', q2:''}))); setBulkGrid(nx); } };

  const handleBulkSave = () => {
      let updatedPackages = [...(st.packageOrders || [])], packagesToDelete = new Set(), packagesToAddOrUpdate = [];
      PKG_NUMS.forEach(num => {
          const groupName = num <= 3 ? '아기용 (1~3)' : '산모용 (4~6)';
          (bulkGrid[num]||[]).forEach(sub => {
              const q1 = Number(sub?.q1) || 0, q2 = Number(sub?.q2) || 0, typeName = String(sub?.type||'').trim() || '일반';
              if (q1 > 0) { if (sub?.p1) packagesToAddOrUpdate.push({ ...sub.p1, personCount: q1, pkgType: typeName }); else packagesToAddOrUpdate.push({ id: `PKG_${Date.now()}_${Utils.genId()}`, clientId: targetClient, month: targetMonth, round: 1, pkgGroup: groupName, pkgNum: num, pkgType: typeName, personCount: q1, items: [], pkgNote: '' }); } else if (sub?.p1) packagesToDelete.add(sub.p1.id);
              if (q2 > 0) { if (sub?.p2) packagesToAddOrUpdate.push({ ...sub.p2, personCount: q2, pkgType: typeName }); else packagesToAddOrUpdate.push({ id: `PKG_${Date.now()}_${Utils.genId()}`, clientId: targetClient, month: targetMonth, round: 2, pkgGroup: groupName, pkgNum: num, pkgType: typeName, personCount: q2, items: [], pkgNote: '' }); } else if (sub?.p2) packagesToDelete.add(sub.p2.id);
          });
      });
      updatedPackages = updatedPackages.filter(p => !packagesToDelete.has(p?.id));
      packagesToAddOrUpdate.forEach(newP => { const idx = updatedPackages.findIndex(p => p?.id === newP?.id); if (idx >= 0) updatedPackages[idx] = newP; else updatedPackages.push(newP); });
      updateSt('packageOrders', updatedPackages); setShowBulkModal(false); alert(`일괄 작업이 완료되었습니다.`);
  };

  const validPkgsToWork = useMemo(() => {
      const result = [];
      ordersToWorkToday.forEach(orderInfo => {
          const allPkgsForClient = (st.packageOrders || []).filter(p => p?.clientId === orderInfo?.clientId && p?.month === targetMonth && (p?.round === orderInfo?.targetRound || p?.pkgType === '공통'));
          const normalPkgs = allPkgsForClient.filter(p => p?.pkgType !== '공통');
          const common23 = allPkgsForClient.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
          const common46 = allPkgsForClient.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');

          normalPkgs.forEach(pkg => {
              let mergedItems = [...(pkg?.items||[])];
              if (!String(`${pkg?.pkgNum}-${pkg?.pkgType}`).startsWith('4-1')) {
                  if ((pkg?.pkgNum === 2 || pkg?.pkgNum === 3) && common23) { (common23.items||[]).forEach(cit => mergedItems.push({...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true})); }
                  else if (pkg?.pkgNum >= 4 && pkg?.pkgNum <= 6 && common46) { (common46.items||[]).forEach(cit => mergedItems.push({...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true})); }
              }
              result.push({...pkg, items: mergedItems});
          });
      });
      return result;
  }, [ordersToWorkToday, st.packageOrders, targetMonth]);

  const pickingList = useMemo(() => {
      const agg = {};
      validPkgsToWork.forEach(pkg => {
          (pkg?.items||[]).forEach(it => {
              const qty = Number(it?.qtyPerPerson) * Number(pkg?.personCount);
              if(qty > 0) {
                  const aggKey = it?.isManual ? `${it?.itemId}_MANUAL` : (it?.mappingUid || it?.itemId);
                  if(!agg[aggKey]) {
                      const masterInfo = (st.items || []).find(i => i?.id === it?.itemId) || {};
                      const mappedInfo = getMappedItem(pkg?.clientId, it?.itemId, it?.mappingUid);
                      const supplierName = (st.suppliers||[]).find(s => s?.id === masterInfo?.supplierId)?.name || '';
                      
                      agg[aggKey] = { 
                          itemId: it?.itemId, mappingUid: it?.mappingUid, category: mappedInfo?.category || '미분류', name: masterInfo?.name || mappedInfo?.name || '알수없음', 
                          unit: it?.isManual && it?.manualUnit ? it?.manualUnit : (mappedInfo?.unit || ''), orderUnit: it?.isManual ? (it?.manualOrderUnit || 1) : (mappedInfo?.orderUnit || 1),
                          boxQuantity: masterInfo?.boxQuantity || 1, supplierName: supplierName, totalQty: 0, itemNotes: new Set()
                      };
                  }
                  agg[aggKey].totalQty += qty;
                  if (it?.note) agg[aggKey].itemNotes.add(it.note);
              }
          });
      });
      return Utils.sortItems(Object.values(agg).map(a => ({ ...a, itemNotesStr: Array.from(a?.itemNotes||[]).join(', ') })), st.categorySortOrder || []);
  }, [validPkgsToWork, st.items, st.suppliers, st.categorySortOrder, getMappedItem]);

  const activeClientsToday = useMemo(() => {
      return Array.from(new Set(ordersToWorkToday.map(o => (st.clients||[]).find(c=>c?.id===o?.clientId)?.shortName || '알수없음'))).join(', ');
  }, [ordersToWorkToday, st.clients]);

  const todayPkgNotes = useMemo(() => {
      const notes = [];
      validPkgsToWork.forEach(pkg => {
          if(pkg?.pkgNote) {
              const cName = (st.clients||[]).find(c=>c?.id===pkg?.clientId)?.shortName || '';
              notes.push(`[${cName}] ${pkg?.pkgGroup} ${pkg?.pkgType === '일반' ? pkg?.pkgNum + '패키지' : pkg?.pkgNum + '-' + pkg?.pkgType} : ${pkg?.pkgNote}`);
          }
      });
      return notes;
  }, [validPkgsToWork, st.clients]);

  const dlPickingExcel = () => {
      if(pickingList.length === 0) return alert('출력할 피킹 데이터가 없습니다.');
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; font-family: 'Malgun Gothic', sans-serif; } th, td { border: 1px solid #000; padding: 10px; font-size: 11pt; vertical-align: middle; white-space: nowrap; text-align: center; } .header { background-color: #f1f5f9; font-weight: bold; } .title { font-size: 24pt; font-weight: bold; text-align: center; padding: 20px; background-color: #272154; color: #ffffff; } .sub-title { font-size: 12pt; font-weight: bold; text-align: left; padding: 10px; background-color: #f8fafc; } .warning { color: #e11d48; font-weight: bold; text-align: left; } .qty { font-weight: bold; color: #1d4ed8; } .box-qty { font-weight: bold; color: #047857; background-color: #ecfdf5; }</style></head><body>`;
      html += `<table><tr><td colspan="7" class="title">영플패킹지시서</td></tr><tr><td colspan="2" class="sub-title">작업일자: ${targetWorkDate}</td><td colspan="5" class="sub-title">대상 보건소: ${activeClientsToday || '없음'}</td></tr>`;
      if (todayPkgNotes.length > 0) { html += `<tr><td colspan="7" class="warning">🚨 금일 패키지 특이사항 (필독)<br/>${todayPkgNotes.join('<br/>')}</td></tr>`; }
      html += `<tr class="header"><th>순번</th><th>품목명</th><th>작업단위</th><th>수량</th><th>박스수량</th><th>거래처</th><th>특이사항(품목)</th></tr>`;
      pickingList.forEach((it, idx) => {
          const boxQtyCalc = (it?.totalQty / (it?.boxQuantity || 1)).toFixed(1).replace('.0', '');
          let workUnitDisplay = Utils.formatWorkUnit(it?.orderUnit, it?.unit); 
          html += `<tr><td>${idx+1}</td><td style="text-align:left; font-weight:bold;">${it?.name||''}</td><td style="font-weight:bold; color:#475569;">${workUnitDisplay}</td><td class="qty">${Utils.fmt(it?.totalQty)}</td><td class="box-qty">${boxQtyCalc} 박스</td><td>${it?.supplierName||''}</td><td style="text-align:left;">${it?.itemNotesStr||''}</td></tr>`;
      });
      html += `</table></body></html>`;
      Utils.dlExcel(html, `영플패킹지시서_${targetWorkDate}`);
  };

  const packagePrintData = useMemo(() => {
      if (!packagePrintPreview) return [];
      const { date, clientIds } = packagePrintPreview; 
      
      // 🌟 [제안 4 반영] 월말/월초 작업일-배송일 엇갈림 해결: 원본 발주월(targetMonth) 고정 검색
      const targetOrders = (st.clientOrders||[]).filter(o => (clientIds||[]).includes(o?.clientId) && o?.month === targetMonth && (getMappedWorkDate(o?.deliveryDate1) === date || getMappedWorkDate(o?.deliveryDate2) === date));
      let allPrintPkgs = [];

      targetOrders.forEach(order => {
          const cId = order?.clientId, clientName = (st.clients||[]).find(c => c?.id === cId)?.name || '알수없는 보건소';
          const targetRounds = [];
          if (getMappedWorkDate(order?.deliveryDate1) === date) targetRounds.push(1);
          if (getMappedWorkDate(order?.deliveryDate2) === date) targetRounds.push(2);

          targetRounds.forEach(round => {
              const allPkgsForClient = (st.packageOrders||[]).filter(p => p?.clientId === cId && p?.month === targetMonth && (p?.round === round || p?.pkgType === '공통'));
              const normalPkgs = allPkgsForClient.filter(p => p?.pkgType !== '공통');
              const common23 = allPkgsForClient.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통'), common46 = allPkgsForClient.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');

              normalPkgs.forEach(pkg => {
                  let mergedItems = [...(pkg?.items||[])];
                  const displayName = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
                  if (!String(displayName||'').startsWith('4-1')) {
                      if ((pkg?.pkgNum === 2 || pkg?.pkgNum === 3) && common23) { (common23.items||[]).forEach(cit => mergedItems.push({...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true})); }
                      else if (pkg?.pkgNum >= 4 && pkg?.pkgNum <= 6 && common46) { (common46.items||[]).forEach(cit => mergedItems.push({...cit, uid: `${pkg?.id}_${cit?.uid}`, isCommon: true})); }
                  }
                  const mappedPkgItems = mergedItems.map(it => {
                      const mapped = getMappedItem(pkg?.clientId, it?.itemId, it?.mappingUid);
                      return { ...mapped, qtyPerPerson: it?.qtyPerPerson, note: it?.note, isCommon: it?.isCommon, printUnit: it?.isManual && it?.manualUnit ? it?.manualUnit : mapped?.unit, orderUnit: it?.isManual ? (it?.manualOrderUnit || 1) : (mapped?.orderUnit || 1) };
                  });
                  allPrintPkgs.push({ ...pkg, clientName, workDate: date, round, mappedItems: Utils.sortItems(mappedPkgItems, st.categorySortOrder || []) });
              });
          });
      });
      return allPrintPkgs.sort((a, b) => String(a?.clientName||'').localeCompare(String(b?.clientName||'')) || Number(a?.pkgNum||0) - Number(b?.pkgNum||0));
  }, [packagePrintPreview, st.clientOrders, st.packageOrders, st.clients, st.categorySortOrder, getMappedItem, getMappedWorkDate, targetMonth]); // targetMonth 추가

  const dlPackageExcel = () => {
      if(packagePrintData.length === 0) return alert('출력할 패키지 데이터가 없습니다.');
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; font-family: 'Malgun Gothic', sans-serif; margin-bottom: 50px; } th, td { border: 2px solid #000; padding: 10px; font-size: 11pt; vertical-align: middle; white-space: nowrap; text-align: center; } .title { font-size: 20pt; font-weight: bold; text-align: center; padding: 15px; background-color: #272154; color: #ffffff; } .header-row { background-color: #f1f5f9; font-weight: bold; } .pkg-name { font-size: 16pt; font-weight: bold; text-align: left; } .qty-box { font-size: 18pt; font-weight: bold; color: #E94287; } .item-name { font-size: 14pt; font-weight: bold; text-align: left; } .item-qty { font-size: 16pt; font-weight: bold; color: #1d4ed8; } .warning { color: #e11d48; font-weight: bold; text-align: left; background-color: #ffe4e6; padding: 5px; border-radius: 5px; }</style></head><body>`;
      packagePrintData.forEach(pkg => {
          const displayName = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
          html += `<table><tr><td colspan="6" class="title">영양플러스 패키지 작업 지시서</td></tr><tr><td colspan="2" style="text-align:left; font-weight:bold;">작업일자: ${pkg?.workDate||''}</td><td colspan="4" style="text-align:right; font-weight:bold;">보건소: ${pkg?.clientName||''}</td></tr><tr><td colspan="4" class="pkg-name">${displayName} ${pkg?.pkgNote ? `<span class="warning">[특이사항: ${pkg?.pkgNote}]</span>` : ''}</td><td colspan="2" class="qty-box">제작수량: ${pkg?.personCount||0}개</td></tr><tr class="header-row"><th>순번</th><th colspan="3">품명 및 작업단위</th><th colspan="2">수량</th></tr>`;
          
          (pkg?.mappedItems||[]).forEach((it, idx) => { 
              let workUnitDisplay = Utils.formatWorkUnit(it?.orderUnit, it?.printUnit); 
              // 🌟 제안 4 반영: 영플패키지 엑셀 출력 시 '분유' 카테고리는 품목명이 아닌 '분유'라는 분류명으로 출력
              let itemDisplayName = it?.category === '분유' ? '분유' : (it?.name||'');
              html += `<tr><td>${idx+1}</td><td colspan="3" class="item-name">${itemDisplayName} (${workUnitDisplay})</td><td colspan="2" class="item-qty">${it?.qtyPerPerson||''}</td></tr>`; 
          });
          
          if((pkg?.mappedItems||[]).some(it => it?.note && String(it?.note).trim() !== '')) {
              html += `<tr><td colspan="6" style="text-align:left; font-weight:bold; color:#e11d48; background-color:#fff1f2;">🚨 품목 특이사항<br/>`;
              (pkg?.mappedItems||[]).filter(it => it?.note && String(it?.note).trim() !== '').forEach(it => { html += `• ${it?.name||''} : ${it?.note}<br/>`; });
              html += `</td></tr>`;
          }
          html += `</table><br style="mso-data-placement:same-cell;"/>`;
      });
      html += `</body></html>`; Utils.dlExcel(html, `영플패키지출력_${packagePrintPreview?.date}`);
  };

  const isPrintMode = packagePrintPreview || pickingPrintPreview || matrixPrintData || portraitPrintData;
  const isAnyModalOpen = showBulkModal || newPkgModal.is || showCopyModal || showScheduleModal || showAdminModal || isPrintMode;

  if (!cUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center font-sans p-4 relative overflow-hidden text-slate-100">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-600/20 to-purple-600/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 to-emerald-600/10 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none"></div>
        <div className="bg-slate-800/80 backdrop-blur-xl p-10 rounded-[2.5rem] w-full max-w-md relative shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-700 z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30"><Ic.Lock size={36} className="text-white"/></div>
          <h2 className="text-3xl font-black mb-2 text-center text-white tracking-tight">작업지시서 터미널</h2>
          <p className="text-sm font-bold text-slate-400 mb-8 text-center">메인 발주시스템 계정으로 로그인하세요.</p>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
             <input name="id" value={loginData.id} onChange={e=>setLoginData({...loginData, id: e.target.value})} placeholder="아이디 (ID)" className="w-full border border-slate-600 p-4 rounded-xl text-sm font-bold bg-slate-900/50 outline-none focus:border-indigo-500 text-white placeholder-slate-500 shadow-inner" required autoFocus/>
             <input name="pwd" type="password" value={loginData.pwd} onChange={e=>setLoginData({...loginData, pwd: e.target.value})} placeholder="비밀번호 (Password)" className="w-full border border-slate-600 p-4 rounded-xl text-sm font-bold bg-slate-900/50 outline-none focus:border-indigo-500 text-white placeholder-slate-500 shadow-inner" required/>
             <div className="flex justify-between px-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={loginData.saveId} onChange={e=>setLoginData({...loginData, saveId: e.target.checked})} className="rounded bg-slate-800 border-slate-600 text-indigo-500 w-4 h-4"/><span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">아이디 저장</span></label>
                <label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={loginData.keepLog} onChange={e=>setLoginData({...loginData, keepLog: e.target.checked})} className="rounded bg-slate-800 border-slate-600 text-indigo-500 w-4 h-4"/><span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">로그인 유지</span></label>
             </div>
             <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl font-black mt-6 shadow-lg hover:shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition-all hover:-translate-y-0.5">안전하게 접속</button>
          </form>
        </div>
      </div>
    );
  }

  if (!dbLd) return <div className="flex h-screen items-center justify-center font-black bg-[#0f172a] text-slate-300"><Ic.Ref className="animate-spin text-indigo-500 mr-3" size={32}/> <span className="text-lg tracking-widest">데이터베이스 연동 중...</span></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200 relative whitespace-nowrap flex flex-col print:bg-white print:block print:h-auto print:min-h-0 print:overflow-visible">
      
      {/* 🌟 메인 컨텐츠 영역: 인쇄 모드 시 완전히 숨겨(hidden) 백화 현상을 원천 차단 */}
      <div id="main-app" className={`flex-1 flex flex-col w-full max-w-[1600px] mx-auto print:block print:h-auto print:min-h-0 print:overflow-visible ${isPrintMode ? 'hidden print:hidden' : 'block'}`}>
        <div className="p-4 md:p-6 pb-0 flex-none relative z-50">
          <header className="bg-[#1e293b] rounded-[2rem] p-6 shadow-lg border border-slate-700/50 mb-6 flex flex-col xl:flex-row justify-between items-center gap-6 relative overflow-visible">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
            <div className="flex items-center gap-5 w-full xl:w-auto relative z-10 shrink-0">
              <img src="/logo.png" alt="웰쉐어 로고" className="w-16 h-auto drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div style={{display: 'none'}} className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.2rem] items-center justify-center shadow-lg shadow-indigo-500/30"><Ic.Heart size={32} className="text-white"/></div>
              <div><h1 className="text-3xl font-black tracking-tight text-white">영플 패키지출력</h1><p className="text-[13px] font-bold text-slate-400 mt-1.5 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> 웰쉐어사회적협동조합 전용 통합 관리망</p></div>
            </div>
            
            <div className="flex items-center gap-4 relative z-50 shrink-0">
              <div className="flex items-center gap-3 bg-[#0f172a] p-2 rounded-full border border-slate-700 shadow-inner relative z-[60]">
                 <div className="flex items-center gap-2 pl-3 pr-1">
                    <Ic.Cal size={14} className="text-slate-500"/>
                    <input type="month" value={targetMonth} onChange={e=>setTargetMonth(e.target.value)} className="bg-transparent text-white font-black outline-none cursor-pointer text-sm [&::-webkit-calendar-picker-indicator]:invert hover:text-indigo-400 transition-colors" />
                 </div>
                 <div className="w-px h-5 bg-slate-600"></div>
                 <div className="flex items-center gap-2 pl-1 pr-2 text-slate-300 font-bold text-sm">
                     <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[11px] font-black shadow-[0_2px_5px_rgba(0,0,0,0.5)] border border-indigo-400/50 text-white">{String(cUser?.name || 'U').charAt(0)}</div>
                     {cUser?.name || '관리자'}님
                 </div>
                 <div className="relative px-1 z-[999]">
                     <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none relative z-[1000]">
                         <Ic.MoreVert size={20}/>
                     </button>
                     {isUserMenuOpen && (
                         <>
                             <div className="fixed inset-0 z-[99998]" onClick={() => setIsUserMenuOpen(false)}></div>
                             <div className="absolute right-0 top-full mt-2 w-52 bg-[#1e293b] border border-slate-700 shadow-2xl rounded-2xl z-[99999] animate-scale-up origin-top-right overflow-hidden">
                                 <div className="p-3 border-b border-slate-700 bg-[#0f172a]/50">
                                    <div className="text-[10px] text-slate-500 font-black mb-2 px-1">시스템 관리</div>
                                    {isLog && <button onClick={() => { setIsUserMenuOpen(false); setShowAdminModal(true); }} className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-slate-300 hover:bg-white/5 hover:text-indigo-400 rounded-xl transition-colors flex items-center gap-2"><Ic.Settings size={14}/> 관리자 설정</button>}
                                 </div>
                                 <div className="p-3">
                                    <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-[12px] font-black text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-colors flex items-center gap-2"><Ic.Left size={14}/> 안전하게 로그아웃</button>
                                 </div>
                             </div>
                         </>
                     )}
                 </div>
              </div>
            </div>
          </header>

          <div className="w-full flex items-start bg-[#1e293b] p-3.5 rounded-2xl border border-slate-700/50 shadow-sm relative z-10 mb-6">
              <div className="flex items-center pt-1 shrink-0">
                  <span className="text-[12px] text-slate-400 font-black pl-2 pr-3 flex items-center gap-1.5"><Ic.Ref size={14}/> 매칭일</span>
                  <div className="w-px h-5 bg-slate-700 mx-2"></div>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 pl-1">
                  {availableWorkDates.round1.length === 0 && availableWorkDates.round2.length === 0 && <span className="text-[11px] font-bold text-slate-500 px-3 py-1.5">등록된 일정 없음</span>}
                  {availableWorkDates.round1.map(d => (
                      <button key={`hr1-${d}`} onClick={()=>{setTargetWorkDate(d); setPackDate(d);}} className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 shadow-sm ${targetWorkDate===d && packDate===d ? 'bg-indigo-600 text-white border-indigo-500 scale-105' : 'bg-[#0f172a] text-indigo-400 border-slate-700 hover:bg-[#1e293b] hover:border-indigo-500/50'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${targetWorkDate===d && packDate===d ? 'bg-white' : 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.8)]'}`}></span> {d.slice(5)}
                      </button>
                  ))}
                  {availableWorkDates.round2.map(d => (
                      <button key={`hr2-${d}`} onClick={()=>{setTargetWorkDate(d); setPackDate(d);}} className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 shadow-sm ${targetWorkDate===d && packDate===d ? 'bg-emerald-600 text-white border-emerald-500 scale-105' : 'bg-[#0f172a] text-emerald-400 border-slate-700 hover:bg-[#1e293b] hover:border-emerald-500/50'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${targetWorkDate===d && packDate===d ? 'bg-white' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]'}`}></span> {d.slice(5)}
                      </button>
                  ))}
              </div>
          </div>

          <div className="w-full flex flex-wrap lg:flex-nowrap gap-3 mb-6 relative z-10 whitespace-nowrap">
             {[
               { id: 'calendar', name: '작업일정', icon: Ic.Cal },
               { id: 'pkg_reg', name: '패키지 구성 및 등록', icon: Ic.Edit },
               { id: 'summary_unit_matrix', name: '소분작업내역', icon: Ic.ListO },
               { id: 'picking', name: '영플패킹지시서', icon: Ic.List },
               { id: 'packing', name: '영플패키지출력', icon: Ic.Box }
             ].map(tab => {
                const TabIcon = tab.icon;
                return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[150px] py-4 rounded-2xl font-black text-[14px] transition-all duration-300 flex items-center justify-center gap-2.5 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border-t border-indigo-400 scale-[1.02] z-10' : 'bg-[#1e293b] text-slate-400 border border-slate-700 hover:bg-[#283548] hover:text-white shadow-sm'}`}>
                    <TabIcon size={20} className={activeTab === tab.id ? 'text-white' : 'text-slate-500'}/> {tab.name}
                </button>
             )})}
          </div>
        </div>

        <div className="flex-1 w-full px-4 md:px-6 pb-6 print:p-0 print:m-0 print:block print:overflow-visible print:h-auto">
            {activeTab === 'summary_unit_matrix' && (
                <div className="h-full flex flex-col w-full whitespace-nowrap relative z-0 print:block print:overflow-visible print:h-auto">
                    <OrderSummaryUnitMatrixView targetMonth={targetMonth} targetWorkDate={targetWorkDate} clients={st.clients||[]} items={st.items||[]} clientOrders={st.clientOrders||[]} mappings={st.mappings||[]} categorySortOrder={st.categorySortOrder||[]} getMappedWorkDate={getMappedWorkDate} setIsSubPrinting={setIsSubPrinting} setMatrixPrintData={setMatrixPrintData} setPortraitPrintData={setPortraitPrintData} />
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className={`w-full animate-fade-in whitespace-nowrap relative z-0`}>
                    <div className="bg-[#1e293b] p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-bl-full pointer-events-none blur-2xl"></div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b-2 border-slate-700 pb-8 gap-4 relative z-10 shrink-0">
                            <div className="flex items-center gap-6">
                                <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4"><div className="p-3 bg-[#0f172a] border border-slate-700 rounded-2xl"><Ic.Cal className="text-indigo-400" size={32}/></div> 포장 작업 일정표</h2>
                                
                                <div className="flex items-center gap-4 bg-[#0f172a] p-2 rounded-[1.2rem] border border-slate-700 shadow-inner">
                                    <button onClick={handlePrevMonth} className="p-3 bg-[#1e293b] rounded-xl hover:shadow-md text-slate-400 hover:text-white transition-all"><Ic.Left size={18}/></button>
                                    <span className="text-2xl font-black text-white px-6 tracking-wider">{yr}년 {mo+1}월</span>
                                    <button onClick={handleNextMonth} className="p-3 bg-[#1e293b] rounded-xl hover:shadow-md text-slate-400 hover:text-white transition-all"><Ic.Right size={18}/></button>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 shrink-0">
                                <button onClick={()=>setShowScheduleModal(true)} className="w-full md:w-auto bg-[#0f172a] border border-slate-700 text-slate-300 hover:bg-[#1e293b] hover:border-indigo-50 hover:text-white px-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm group shrink-0"><Ic.Edit size={20} className="text-slate-500 group-hover:text-indigo-400 transition-colors"/> 예외 작업일 수동 설정</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-3 lg:gap-4 relative z-10 shrink-0">
                            {['일','월','화','수','목','금','토'].map((d,i) => (
                                <div key={d} className={`text-center py-4 font-black text-sm rounded-xl border ${i===0?'text-rose-400 bg-rose-500/10 border-rose-500/20':i===6?'text-blue-400 bg-blue-500/10 border-blue-500/20':'text-slate-400 bg-[#0f172a] border-slate-700'}`}>{d}</div>
                            ))}
                            {fullCalendarArray.map((d, i) => {
                                if(!d) return <div key={`pad-${i}`} className="h-32 lg:h-40 bg-transparent"></div>;
                                const dStr = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                const isPast = dStr < todayStr;
                                const isTarget = dStr === targetWorkDate;
                                const isToday = dStr === todayStr;
                                const worksHere = scheduleData.works[dStr] || [];

                                return (
                                    <div key={dStr} className={`h-32 lg:h-40 p-3 rounded-[1.5rem] border transition-all duration-300 flex flex-col relative overflow-hidden ${isTarget ? 'bg-indigo-900/20 border-indigo-500 shadow-lg ring-4 ring-indigo-500/20 z-10' : isToday ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-indigo-500/50 hover:bg-[#1e293b] hover:shadow-md'}`}>
                                        {isToday && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm">TODAY</div>}
                                        <span className={`text-[15px] font-black mb-2 cursor-pointer inline-block w-8 h-8 leading-8 text-center rounded-full shrink-0 ${isTarget?'bg-indigo-600 text-white shadow-md':isToday?'bg-[#1e293b] text-blue-400 shadow-sm border border-blue-500/30':i%7===0?'text-rose-400':i%7===6?'text-blue-400':'text-slate-300'}`} onClick={()=>{setTargetWorkDate(dStr); setPackDate(dStr); setActiveTab('picking');}}>{d}</span>
                                        
                                        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 content-start scrollbar-hide pt-1">
                                            {worksHere.map((wrk, x) => {
                                                const isR1 = wrk.round === 1;
                                                const activeClass = isR1 
                                                    ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white' 
                                                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white';
                                                const pastClass = 'bg-slate-800/50 text-slate-500 border border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-700 hover:text-slate-300';
                                                
                                                return (
                                                    <div key={`wrk-${x}`} onClick={(e) => { e.stopPropagation(); setTargetWorkDate(dStr); setPackDate(dStr); setActiveTab('picking'); }} 
                                                         className={`text-[10px] font-black px-1 py-1.5 rounded-lg shadow-sm truncate cursor-pointer transform transition-all text-center tracking-tight relative overflow-hidden border ${isPast ? pastClass : activeClass}`}>
                                                        {isR1 ? '🔵' : '🟢'} {(st.clients || []).find(c=>c?.id===wrk?.clientId)?.shortName || '미지정'}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pkg_reg' && (
                <div className={`w-full flex flex-col lg:flex-row gap-4 h-[75vh] animate-fade-in whitespace-nowrap relative z-0`}>
                    <div className="w-full lg:w-[240px] shrink-0 flex flex-col gap-4 bg-[#1e293b] p-5 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
                        <div className="flex flex-col gap-3 border-b-2 border-slate-700 pb-5 mb-2 shrink-0">
                            <label className="text-base font-black text-white flex items-center gap-2"><Ic.Bldg size={20} className="text-indigo-400"/> 1. 보건소 선택</label>
                            <div className="text-[10px] font-bold text-slate-400 shrink-0">작업 기준 월을 변경하려면 상단 헤더의 달력을 이용하세요.</div>
                            <div className="text-xl font-black bg-[#0f172a] text-indigo-400 border border-slate-700 px-4 py-6 rounded-xl text-center shadow-inner truncate shrink-0 tracking-tight">
                               {(targetMonth||'').replace('-', '년 ')}월
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4 scrollbar-hide">
                            {(st.clients||[]).map(c => {
                                if(!c) return null;
                                const ord = (st.clientOrders || []).find(o => o?.clientId === c?.id && o?.month === targetMonth);
                                const d1 = ord ? getMappedWorkDate(ord?.deliveryDate1) || '9999-99-99' : '9999-99-99';
                                return { ...c, _sortDate: d1 };
                            }).filter(Boolean).sort((a,b) => {
                                if (a?._sortDate !== b?._sortDate) return String(a?._sortDate||'').localeCompare(String(b?._sortDate||''));
                                return String(a?.name||'').localeCompare(String(b?.name||''));
                            }).map(c => {
                                const isReg = (st.packageOrders || []).some(p => p?.clientId === c?.id && p?.month === targetMonth && p?.pkgType !== '공통' && (p?.items||[]).length > 0);
                                return (
                                    <button key={`client-btn-${c?.id}`} onClick={() => {setTargetClient(c?.id); setEditingPkg(null);}} className={`w-full p-3 text-left rounded-xl text-[13px] font-black transition-all border whitespace-normal break-keep leading-tight flex items-center justify-between ${targetClient === c?.id ? 'bg-indigo-600 text-white shadow-md border-indigo-500 hover:-translate-y-0.5' : 'bg-[#0f172a] text-slate-300 hover:bg-[#283548] border-slate-700 hover:border-slate-600'}`}>
                                        <div className="flex flex-col gap-1">
                                            <span className="truncate pr-1">{c?.name || '미지정'}</span>
                                            {c?._sortDate !== '9999-99-99' && <span className={`text-[10px] font-bold ${targetClient === c?.id ? 'text-indigo-200' : 'text-slate-500'}`}>1차 배송: {String(c?._sortDate||'').substring(5)}</span>}
                                        </div>
                                        {isReg && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-1 rounded shadow-sm shrink-0 border border-emerald-500/30">완료</span>}
                                    </button>
                                );
                            })}
                            {(st.clients||[]).length === 0 && <div className="text-center text-slate-500 font-bold py-10 text-xs shrink-0">보건소 없음</div>}
                        </div>
                    </div>

                    <div className="w-full lg:w-[320px] shrink-0 flex flex-col bg-[#1e293b] p-5 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
                        <h3 className="font-black text-base text-white mb-4 flex items-center gap-2 shrink-0"><Ic.Box size={20} className="text-indigo-400"/> 2. 패키지 선택</h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide pb-20">
                            {targetClient ? (
                                <>
                                    {currentPackages.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3 shrink-0">
                                            <div className="p-3 bg-[#0f172a] rounded-full border border-slate-700"><Ic.Box size={24} className="text-slate-600"/></div>
                                            <span className="font-bold text-xs">등록된 패키지 없음</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {currentPackages.filter(p => p?.pkgType === '공통').length > 0 && (
                                                <div className="shrink-0">
                                                    <div className="text-[10px] font-black text-slate-500 mb-1.5 flex items-center gap-1 pl-1"><Ic.Star size={12} className="text-amber-500"/> 공통품목 설정하기</div>
                                                    <div className="flex flex-col gap-1.5">
                                                        {currentPackages.filter(p => p?.pkgType === '공통').map(pkg => {
                                                            const isBaby = String(pkg?.pkgGroup||'').includes('아기');
                                                            const badgeColor = isBaby ? 'bg-pink-500' : 'bg-teal-500';
                                                            return (
                                                                <div key={pkg?.id} onClick={() => setEditingPkg(pkg)} className={`p-2 rounded-lg cursor-pointer border transition-all duration-200 flex justify-between items-center shadow-sm border-l-[4px] whitespace-nowrap shrink-0 ${isBaby ? 'border-l-pink-500' : 'border-l-teal-500'} ${editingPkg?.id === pkg?.id ? 'ring-2 ring-indigo-500 scale-[1.02] bg-[#0f172a] border-slate-600' : 'bg-[#0f172a] border-slate-700 hover:bg-[#283548]'}`}>
                                                                    <div className="flex flex-col gap-1 shrink-0 min-w-0">
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black text-white shadow-sm shrink-0 ${badgeColor}`}>공통</span>
                                                                            <span className="font-black text-[11px] text-slate-200 shrink-0">{pkg?.pkgGroup||''}</span>
                                                                        </div>
                                                                        {pkg?.pkgNote && <div className="text-[10px] text-rose-400 font-black bg-rose-500/10 px-1.5 py-0.5 rounded truncate border border-rose-500/20">🚨 {pkg?.pkgNote}</div>}
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-slate-400 bg-[#1e293b] px-1.5 py-0.5 rounded shadow-sm shrink-0 border border-slate-600">{getPkgItemCount(pkg)}품목</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 items-start mt-2 shrink-0">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center bg-blue-900/20 py-1.5 px-2 rounded-md border border-blue-500/30 shadow-sm shrink-0">
                                                        <span className="text-[10px] font-black text-blue-400 tracking-widest shrink-0">🔵 1차 배송</span>
                                                        <button onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setNewPkgModal({is:true, round:1, num:1, type:'일반', customType:'', count:0, pkgNote:''});}} className="text-[9px] font-black bg-[#1e293b] text-blue-400 px-1.5 py-0.5 rounded shadow-sm hover:bg-blue-600 hover:text-white transition-colors border border-blue-500/50 shrink-0">+ 추가</button>
                                                    </div>
                                                    {currentPackages.filter(p => p?.round === 1 && p?.pkgType !== '공통').sort((a,b)=>Number(a?.pkgNum||0) - Number(b?.pkgNum||0)).map(pkg => {
                                                        const isBaby = String(pkg?.pkgGroup||'').includes('아기');
                                                        const displayName = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
                                                        return (
                                                            <div key={pkg?.id} onClick={() => setEditingPkg(pkg)} className={`p-2 rounded-lg cursor-pointer border transition-all duration-200 relative flex flex-col shadow-sm whitespace-nowrap shrink-0 ${editingPkg?.id === pkg?.id ? 'ring-2 ring-indigo-500 scale-[1.02] z-10 border-indigo-400 bg-[#0f172a]' : 'border-slate-700 bg-[#0f172a] hover:shadow-md hover:bg-[#283548]'} border-l-[4px] ${isBaby ? 'border-l-pink-500' : 'border-l-teal-500'}`}>
                                                                <div className="flex justify-between items-center mb-1 shrink-0">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <span className={`text-[8px] font-black px-1 rounded text-white shadow-sm shrink-0 ${isBaby ? 'bg-pink-500' : 'bg-teal-500'}`}>{isBaby ? '아기용' : '산모용'}</span>
                                                                    </div>
                                                                    <button onClick={(e)=>{e.stopPropagation(); deletePackage(pkg?.id);}} className="text-slate-500 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0"><Ic.Trash size={12}/></button>
                                                                </div>
                                                                <div className="font-black text-[12px] text-slate-200 truncate mb-1">{displayName}</div>
                                                                {pkg?.pkgNote && <div className="text-[10px] text-rose-400 font-black bg-rose-500/10 px-1.5 py-0.5 rounded mb-1 truncate border border-rose-500/20">🚨 {pkg?.pkgNote}</div>}
                                                                <div className="flex justify-between items-center text-[9px] font-bold shrink-0 mt-auto pt-1">
                                                                    <span className="text-slate-400 shrink-0">{getPkgItemCount(pkg)}품목</span>
                                                                    <span className="text-white font-black bg-indigo-600 px-1 py-0.5 rounded shadow-sm border border-indigo-500 shrink-0">{pkg?.personCount||0}박스</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {currentPackages.filter(p => p?.round === 1 && p?.pkgType !== '공통').length === 0 && <div className="text-[10px] font-bold text-center text-slate-500 py-4 bg-[#0f172a] rounded-lg border border-dashed border-slate-700 shrink-0">1차 없음</div>}
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center bg-emerald-900/20 py-1.5 px-2 rounded-md border border-emerald-500/30 shadow-sm shrink-0">
                                                        <span className="text-[10px] font-black text-emerald-400 tracking-widest shrink-0">🟢 2차 배송</span>
                                                        <button onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setNewPkgModal({is:true, round:2, num:1, type:'일반', customType:'', count:0, pkgNote:''});}} className="text-[9px] font-black bg-[#1e293b] text-emerald-400 px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-500/50 shrink-0">+ 추가</button>
                                                    </div>
                                                    {currentPackages.filter(p => p?.round === 2 && p?.pkgType !== '공통').sort((a,b)=>Number(a?.pkgNum||0) - Number(b?.pkgNum||0)).map(pkg => {
                                                        const isBaby = String(pkg?.pkgGroup||'').includes('아기');
                                                        const displayName = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
                                                        return (
                                                            <div key={pkg?.id} onClick={() => setEditingPkg(pkg)} className={`p-2 rounded-lg cursor-pointer border transition-all duration-200 relative flex flex-col shadow-sm whitespace-nowrap shrink-0 ${editingPkg?.id === pkg?.id ? 'ring-2 ring-indigo-500 scale-[1.02] z-10 border-indigo-400 bg-[#0f172a]' : 'border-slate-700 bg-[#0f172a] hover:shadow-md hover:bg-[#283548]'} border-l-[4px] ${isBaby ? 'border-l-pink-500' : 'border-l-teal-500'}`}>
                                                                <div className="flex justify-between items-center mb-1 shrink-0">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <span className={`text-[8px] font-black px-1 rounded text-white shadow-sm shrink-0 ${isBaby ? 'bg-pink-500' : 'bg-teal-500'}`}>{isBaby ? '아기용' : '산모용'}</span>
                                                                    </div>
                                                                    <button onClick={(e)=>{e.stopPropagation(); deletePackage(pkg?.id);}} className="text-slate-500 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0"><Ic.Trash size={12}/></button>
                                                                </div>
                                                                <div className="font-black text-[12px] text-slate-200 truncate mb-1">{displayName}</div>
                                                                {pkg?.pkgNote && <div className="text-[10px] text-rose-400 font-black bg-rose-500/10 px-1.5 py-0.5 rounded mb-1 truncate border border-rose-500/20">🚨 {pkg?.pkgNote}</div>}
                                                                <div className="flex justify-between items-center text-[9px] font-bold shrink-0 mt-auto pt-1">
                                                                    <span className="text-slate-400 shrink-0">{getPkgItemCount(pkg)}품목</span>
                                                                    <span className="text-white font-black bg-indigo-600 px-1 py-0.5 rounded shadow-sm border border-indigo-500 shrink-0">{pkg?.personCount||0}박스</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {currentPackages.filter(p => p?.round === 2 && p?.pkgType !== '공통').length === 0 && <div className="text-[10px] font-bold text-center text-slate-400 py-4 bg-[#0f172a] rounded-lg border border-dashed border-slate-700 shrink-0">2차 없음</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 text-slate-500 font-bold text-xs shrink-0">👈 왼쪽에서 보건소를 선택하세요.</div>
                            )}
                        </div>
                        
                        <div className="mt-auto w-full pt-4 border-t border-slate-700 shrink-0 z-10 relative bg-[#1e293b]">
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openBulkModal(); }} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-[13px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:-translate-y-0.5 border border-indigo-500 shrink-0 whitespace-nowrap cursor-pointer pointer-events-auto">
                                <Ic.ListP size={18}/> 🚀 1~6 스마트 일괄 생성
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col bg-[#1e293b] p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-700/50 relative min-w-0 whitespace-nowrap">
                        {editingPkg ? (
                            <>
                                <div className="flex justify-between items-start mb-6 border-b-2 border-slate-700 pb-5 shrink-0">
                                    <div className="flex-1 min-w-0 pr-4 flex flex-col gap-2 shrink-0">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-black bg-[#0f172a] text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 shrink-0">{targetMonth}</span>
                                            {editingPkg.pkgType !== '공통' && <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-md shadow-sm shrink-0 ${editingPkg.round===1 ? 'bg-blue-600':'bg-emerald-600'}`}>{editingPkg.round}차 배송</span>}
                                            <span className="text-[10px] font-black bg-[#0f172a] text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 shrink-0">{(st.clients || []).find(c=>c?.id===editingPkg?.clientId)?.shortName || '미지정'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <h2 className="text-2xl font-black text-white flex items-center gap-2 shrink-0">
                                                {editingPkg.pkgType === '공통' ? (
                                                    <><span className={(editingPkg.pkgGroup||'').includes('아기') ? "text-pink-400" : "text-teal-400"}>{editingPkg?.pkgGroup||''}</span> 마스터 구성</>
                                                ) : (
                                                    <>{editingPkg.pkgType === '일반' ? `${editingPkg?.pkgNum||''}패키지` : `${editingPkg?.pkgNum||''}-${editingPkg?.pkgType||''}`}</>
                                                )}
                                            </h2>
                                            {editingPkg.pkgType !== '공통' && (
                                                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-1.5 shadow-inner shrink-0">
                                                    <label className="text-[11px] font-black text-rose-400 shrink-0">특이사항</label>
                                                    <input type="text" value={editingPkg.pkgNote||''} onChange={(e)=>updatePackageMeta('pkgNote', e.target.value)} placeholder="예: 문앞 금지" className="w-36 bg-transparent text-rose-300 text-[12px] font-black outline-none placeholder-rose-500/50 shrink-0" />
                                                </div>
                                            )}
                                        </div>
                                        {editingPkg.pkgType === '공통' ? (
                                            <p className="text-xs font-bold text-slate-400 mt-1 shrink-0">여기에 등록된 품목은 <strong className={(editingPkg.pkgGroup||'').includes('아기') ? "text-pink-400 font-black" : "text-teal-400 font-black"}>{editingPkg?.pkgGroup||''}</strong> 그룹의 <strong className="text-blue-400">모든 패키지 출력 시 자동 포함</strong>됩니다.</p>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-1 shrink-0">
                                                <span className="text-xs font-bold text-slate-400 shrink-0">이 패키지의 포장 작업 수량(박스): </span>
                                                <input type="number" onWheel={e=>e.target.blur()} value={editingPkg.personCount||''} onChange={(e)=>updatePackageMeta('personCount', e.target.value)} className="w-16 bg-[#0f172a] border border-indigo-500 text-white font-black text-center text-sm rounded-lg outline-none shadow-sm shrink-0 focus:ring-2 focus:ring-indigo-500/50" />
                                                <span className="text-[10px] text-slate-500 font-bold ml-1 shrink-0">(자동 저장됨)</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowCopyModal(true)} className="bg-[#0f172a] text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm border border-slate-700 shrink-0 mt-1">
                                        <Ic.Copy size={16}/> 복사해오기
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide flex flex-col">
                                    {(() => {
                                        const targetMonthMap = (st.mappings || []).find(m => m?.clientId === targetClient && m?.month === targetMonth);
                                        const clientMappedItems = targetMonthMap?.mappedItems || [];

                                        const common23 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
                                        const common46 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
                                        
                                        let applicableCommonItems = [];
                                        if (editingPkg.pkgType !== '공통') {
                                            const displayName = editingPkg.pkgType === '일반' ? `${editingPkg?.pkgNum}패키지` : `${editingPkg?.pkgNum}-${editingPkg?.pkgType}`;
                                            if (!String(displayName||'').startsWith('4-1')) {
                                                if (editingPkg?.pkgNum === 2 || editingPkg?.pkgNum === 3) applicableCommonItems = common23?.items || [];
                                                if (editingPkg?.pkgNum >= 4 && editingPkg?.pkgNum <= 6) applicableCommonItems = common46?.items || [];
                                            }
                                        }
                                        
                                        const commonMappingUids = applicableCommonItems.map(ci => ci?.mappingUid).filter(Boolean);
                                        let displayedItems = [];
                                        
                                        if (editingPkg?.pkgType === '공통') {
                                            displayedItems = clientMappedItems;
                                        } else {
                                            displayedItems = clientMappedItems.filter(mi => !commonMappingUids.includes(mi?.uid));
                                        }

                                        const manualItems = (editingPkg?.items || []).filter(ei => ei?.isManual);
                                        const getQty = (mit) => (editingPkg?.items || []).find(i => i?.isManual ? (i?.uid === mit?.uid) : (i?.mappingUid === mit?.uid || (!i?.mappingUid && i?.itemId === mit?.itemId)))?.qtyPerPerson || '';
                                        const getNote = (mit) => (editingPkg?.items || []).find(i => i?.isManual ? (i?.uid === mit?.uid) : (i?.mappingUid === mit?.uid || (!i?.mappingUid && i?.itemId === mit?.itemId)))?.note || '';

                                        const selectedDisplayedItems = displayedItems.filter(mit => !!getQty(mit) || !!getNote(mit));
                                        const unselectedDisplayedItems = displayedItems.filter(mit => !getQty(mit) && !getNote(mit));

                                        let globalItemIndex = 1;

                                        return (
                                            <div className="w-full flex flex-col gap-5">
                                                {applicableCommonItems.length > 0 && (
                                                    <div className="shrink-0">
                                                        <h4 className="font-black text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg mb-2 flex items-center gap-1.5 border border-amber-500/20 shrink-0"><Ic.Star size={14} className="text-amber-400"/> 자동 적용되는 공통 마스터 품목</h4>
                                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                                            {applicableCommonItems.map(cit => {
                                                                const mapped = getMappedItem(targetClient, cit?.itemId, cit?.mappingUid);
                                                                const displayOrderUnit = Utils.getDisplayOrderUnit(mapped?.orderUnit, mapped?.unit, mapped?.category);
                                                                const currentIdx = globalItemIndex++;
                                                                return (
                                                                    <div key={`c-${cit?.mappingUid || cit?.itemId}`} className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl opacity-70 whitespace-nowrap shrink-0">
                                                                        <div className="flex items-center min-w-0 shrink-0 gap-1.5">
                                                                           <span className="w-4 h-4 flex items-center justify-center bg-slate-700 text-slate-300 rounded-full text-[9px] font-black shrink-0">{currentIdx}</span>
                                                                           <div className="font-black text-slate-300 text-[11px] truncate max-w-[120px] shrink-0">{mapped?.name||'미지정'}</div>
                                                                           {displayOrderUnit && (
                                                                               <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded font-black shrink-0">발주: {displayOrderUnit}</span>
                                                                           )}
                                                                        </div>
                                                                        <div className="w-8 text-center font-black text-slate-400 bg-[#1e293b] border border-slate-600 py-0.5 rounded text-[11px] shrink-0">{cit?.qtyPerPerson||''}</div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex-1 flex flex-col shrink-0">
                                                    <div className="flex justify-between items-center bg-indigo-500/10 px-4 py-2.5 rounded-xl mb-3 border border-indigo-500/20 shrink-0">
                                                        <h4 className="font-black text-xs text-indigo-300 flex items-center gap-1.5 shrink-0"><Ic.List size={14}/> 개별 수량 입력 (마우스 휠 잠금, 자동 저장)</h4>
                                                        {editingPkg.pkgNum === 1 && <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-black shadow-sm shrink-0">1패키지는 공통품목 예외</span>}
                                                    </div>
                                                    
                                                    <div className="mb-3 flex items-center gap-2 bg-[#0f172a] p-2 rounded-xl border border-slate-700 shrink-0 shadow-inner">
                                                        <span className="text-[10px] font-black text-amber-500 px-2 shrink-0">➕ 돌발품목 강제추가</span>
                                                        <select onChange={e => {addManualItemFromMaster(e.target.value); e.target.value='';}} className="flex-1 text-[12px] font-black outline-none bg-[#1e293b] border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 cursor-pointer shadow-sm focus:border-indigo-500">
                                                            <option value="">-- DB 전체 마스터 품목에서 검색하여 추가 --</option>
                                                            {(st.items || []).map(master => <option key={`opt-master-${master?.id}`} value={master?.id}>[{master?.category||'미분류'}] {master?.name||'미지정'}</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 pb-10">
                                                        
                                                        {(manualItems.length > 0 || selectedDisplayedItems.length > 0) && (
                                                            <div className="text-[11px] font-black text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg mb-2 mt-1 shrink-0 border border-indigo-500/20 flex items-center gap-1.5">
                                                                <Ic.Chk size={14}/> 패키지 구성품 (수량이 입력되어 저장됨)
                                                            </div>
                                                        )}

                                                        {manualItems.map(mit => {
                                                            const isSelected = !!mit?.qtyPerPerson || !!mit?.note;
                                                            const currentIdx = globalItemIndex++;
                                                            return (
                                                                <div key={`manual-${mit?.uid}`} className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0 ${isSelected ? 'border-amber-500/50 bg-amber-500/10 shadow-sm' : 'border-slate-700 bg-[#0f172a] hover:border-slate-500'}`}>
                                                                    <span className="w-4 h-4 flex items-center justify-center bg-amber-500/20 text-amber-400 rounded-full text-[9px] font-black shrink-0 ml-0.5">{currentIdx}</span>
                                                                    <div className="flex-1 flex items-center min-w-0 pl-1.5 shrink-0 gap-1.5">
                                                                        <select value={mit?.itemId||''} onChange={e => handleItemInput({ ...mit, itemId: e.target.value }, 'qtyPerPerson', mit?.qtyPerPerson)} className={`w-[120px] text-[12px] font-black outline-none bg-transparent truncate shrink-0 cursor-pointer ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                                                                            <option value="">-- 마스터 품목 --</option>
                                                                            {(st.items || []).map(master => <option key={`opt-master-${master?.id}`} value={master?.id}>[{master?.category||'미분류'}] {master?.name||'미지정'}</option>)}
                                                                        </select>
                                                                        <input type="text" placeholder="단위입력" value={mit?.manualUnit||''} onChange={e => handleItemInput(mit, 'manualUnit', e.target.value)} className={`w-16 p-1 text-center text-[10px] font-bold rounded outline-none shadow-inner border shrink-0 ${isSelected ? 'bg-[#1e293b] text-amber-300 border-amber-500/30' : 'bg-[#1e293b] text-slate-400 border-slate-700'}`} />
                                                                        <div className="flex items-center bg-[#1e293b] border border-amber-500/30 rounded px-1 shrink-0 shadow-inner">
                                                                            <span className="text-[9px] font-black text-amber-500 px-1 shrink-0">발주단위:</span>
                                                                            <input type="number" onWheel={e=>e.target.blur()} placeholder="숫자" value={mit?.manualOrderUnit||''} onChange={e => handleItemInput(mit, 'manualOrderUnit', e.target.value)} className="w-10 p-1 text-center text-[10px] font-bold outline-none bg-transparent text-amber-300 shrink-0" />
                                                                        </div>
                                                                    </div>
                                                                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value={mit?.qtyPerPerson||''} onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className={`w-14 p-1.5 text-center text-[13px] font-black rounded-lg outline-none transition-colors shadow-inner border shrink-0 ${isSelected ? 'bg-[#1e293b] text-amber-400 border-amber-500/50 focus:border-amber-400 ring-2 ring-amber-500/20' : 'bg-[#1e293b] text-slate-300 border-slate-700 focus:border-amber-500/50'}`} />
                                                                    <input type="text" placeholder="특이사항" value={mit?.note||''} onChange={e => handleItemInput(mit, 'note', e.target.value)} className={`w-28 p-1.5 text-[11px] font-bold rounded-lg outline-none transition-colors border truncate shrink-0 ${isSelected ? 'bg-[#1e293b] text-amber-400 border-amber-500/50' : 'bg-[#1e293b] text-slate-400 border-slate-700 focus:border-amber-500/50'}`} />
                                                                    <button onClick={() => { handleItemInput(mit, 'qtyPerPerson', ''); handleItemInput(mit, 'note', ''); }} className={`p-1.5 rounded-lg transition-colors shrink-0 ${isSelected ? 'text-rose-400 hover:text-white hover:bg-rose-500' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}><Ic.Trash size={14}/></button>
                                                                </div>
                                                            )
                                                        })}

                                                        {selectedDisplayedItems.map(mit => {
                                                            const mappedInfo = getMappedItem(targetClient, mit?.itemId, mit?.uid);
                                                            const mName = mappedInfo?.name || '미지정';
                                                            const mUnit = mappedInfo?.unit || '-';
                                                            const orderUnitVal = mappedInfo?.orderUnit || 1;
                                                            const currentQty = getQty(mit);
                                                            const displayOrderUnit = Utils.getDisplayOrderUnit(orderUnitVal, mUnit, mappedInfo?.category);
                                                            const currentIdx = globalItemIndex++;
                                                            
                                                            return (
                                                                <div key={`ms-${mit?.uid}`} className="flex items-center gap-2 p-1.5 rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0 border-indigo-500/50 bg-indigo-500/10 shadow-sm">
                                                                    <span className="w-4 h-4 flex items-center justify-center bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black shrink-0 ml-0.5">{currentIdx}</span>
                                                                    <div className="flex-1 flex items-center min-w-0 pl-1.5 shrink-0">
                                                                        <input type="text" value={mName} onChange={e => handleNameChange(mit?.uid, e.target.value)} className="w-[120px] text-[12px] font-black outline-none bg-transparent truncate shrink-0 text-indigo-100" placeholder="보건소 명칭" />
                                                                        {displayOrderUnit && (
                                                                            <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 ml-1.5 shrink-0 whitespace-nowrap">
                                                                               발주: {displayOrderUnit}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value={currentQty} onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className="w-14 p-1.5 text-center text-[13px] font-black rounded-lg outline-none transition-colors shadow-inner border shrink-0 bg-[#1e293b] text-indigo-300 border-indigo-500/50 focus:border-indigo-400 ring-2 ring-indigo-500/20" />
                                                                    <input type="text" placeholder="특이사항" value={getNote(mit)} onChange={e => handleItemInput(mit, 'note', e.target.value)} className="w-24 p-1.5 text-[11px] font-bold rounded-lg outline-none transition-colors border truncate shrink-0 bg-[#1e293b] text-indigo-200 border-indigo-500/50 focus:border-indigo-400" />
                                                                    <button onClick={() => { handleItemInput(mit, 'qtyPerPerson', ''); handleItemInput(mit, 'note', ''); }} className="p-1.5 rounded-lg transition-colors shrink-0 text-rose-400 hover:text-white hover:bg-rose-500"><Ic.Trash size={14}/></button>
                                                                </div>
                                                            )
                                                        })}

                                                        {/* 🌟 [방안 3] 미지정 품목 분리선 */}
                                                        {unselectedDisplayedItems.length > 0 && (
                                                            <div className="text-[11px] font-black text-slate-400 bg-[#0f172a] px-3 py-2 rounded-lg mb-2 mt-4 shrink-0 border border-slate-700 flex items-center gap-1.5">
                                                                <Ic.List size={14}/> 추가 가능한 대기 품목
                                                            </div>
                                                        )}

                                                        {unselectedDisplayedItems.map(mit => {
                                                            const mappedInfo = getMappedItem(targetClient, mit?.itemId, mit?.uid);
                                                            const mName = mappedInfo?.name || '미지정';
                                                            const mUnit = mappedInfo?.unit || '-';
                                                            const orderUnitVal = mappedInfo?.orderUnit || 1;
                                                            const displayOrderUnit = Utils.getDisplayOrderUnit(orderUnitVal, mUnit, mappedInfo?.category);
                                                            const currentIdx = globalItemIndex++;
                                                            
                                                            return (
                                                                <div key={`mu-${mit?.uid}`} className="flex items-center gap-2 p-1.5 rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0 border-slate-700 bg-[#0f172a] hover:border-slate-500">
                                                                    <span className="w-4 h-4 flex items-center justify-center bg-slate-700 text-slate-300 rounded-full text-[9px] font-black shrink-0 ml-0.5">{currentIdx}</span>
                                                                    <div className="flex-1 flex items-center min-w-0 pl-1.5 shrink-0">
                                                                        <input type="text" value={mName} onChange={e => handleNameChange(mit?.uid, e.target.value)} className="w-[120px] text-[12px] font-black outline-none bg-transparent truncate shrink-0 text-slate-300" placeholder="보건소 명칭" />
                                                                        {displayOrderUnit && (
                                                                            <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-1.5 shrink-0 whitespace-nowrap">
                                                                               발주: {displayOrderUnit}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value="" onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className="w-14 p-1.5 text-center text-[13px] font-black rounded-lg outline-none transition-colors shadow-inner border shrink-0 bg-[#1e293b] text-slate-200 border-slate-600 focus:border-indigo-500" />
                                                                    <input type="text" placeholder="특이사항" value="" onChange={e => handleItemInput(mit, 'note', e.target.value)} className="w-24 p-1.5 text-[10px] font-bold rounded-lg outline-none transition-colors border truncate shrink-0 bg-[#1e293b] text-slate-300 border-slate-600 focus:border-indigo-500" />
                                                                    <button disabled className="p-1.5 rounded-lg transition-colors shrink-0 text-slate-200"><Ic.Trash size={14}/></button>
                                                                </div>
                                                            )
                                                        })}

                                                        {(clientMappedItems||[]).length === 0 && (manualItems||[]).length === 0 && <div className="text-center text-slate-500 font-bold py-10 bg-[#0f172a] rounded-2xl border border-slate-700 text-xs shrink-0 whitespace-nowrap">해당 차수({editingPkg?.round||1}차)에 발주 요청된 품목이 없습니다. 위 드롭다운으로 추가하세요.</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 shrink-0">
                                <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-full mb-4 shadow-sm"><Ic.List size={40} className="text-slate-600"/></div>
                                <p className="font-bold text-sm text-slate-400">2단계 패키지 창에서 편집할 패키지를 클릭하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 📋 3. 영플패킹지시서 (Picking List)                           */}
            {/* ============================================================== */}
            {activeTab === 'picking' && (
                <div className={`max-w-[1600px] mx-auto px-6 py-6 whitespace-nowrap w-full relative z-0 print:hidden ${isSubPrinting ? 'hidden' : ''}`}>
                    <div className={`bg-[#1e293b] p-10 rounded-[2.5rem] shadow-xl border border-slate-700/50 animate-fade-in relative overflow-hidden ${targetWorkDate < todayStr ? 'opacity-80' : ''}`}>
                        {targetWorkDate < todayStr && <div className="absolute top-0 left-0 w-full bg-rose-500 text-white text-center py-1.5 font-black text-xs tracking-widest shadow-sm shrink-0">완료된 과거 작업 일정입니다.</div>}
                        
                        <div className="flex justify-between items-end mb-6 shrink-0">
                            <div className="shrink-0"><h2 className="text-3xl font-black text-white shrink-0 flex items-center gap-3"><div className="p-2.5 bg-[#0f172a] border border-slate-700 rounded-2xl"><Ic.List size={28} className="text-indigo-400"/></div> 출고물품지시서</h2><p className="text-sm font-bold text-slate-400 mt-2 ml-14 shrink-0">해당 일자의 총 물류 패킹 수량을 확인하고 인쇄합니다.</p></div>
                            <div className="flex gap-3 items-center flex-wrap shrink-0">
                                <button onClick={()=>setPickingPrintPreview(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-md hover:bg-indigo-500 flex items-center gap-2 shrink-0 transition-all hover:-translate-y-0.5"><Ic.Print size={18}/> 인쇄 미리보기</button>
                                <button onClick={dlPickingExcel} className="px-6 py-3 bg-[#0f172a] border border-slate-600 text-slate-300 rounded-xl text-sm font-black shadow-sm hover:bg-slate-700 hover:text-white flex items-center gap-2 shrink-0 transition-all hover:-translate-y-0.5"><Ic.FileD size={18}/> 엑셀 다운로드</button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0f172a] p-5 rounded-2xl border border-slate-700 shadow-inner shrink-0 mb-4">
                            <div className="flex items-center shrink-0">
                                <span className="text-sm font-bold text-slate-400 shrink-0">작업일자:</span>
                                <strong className="text-indigo-400 text-2xl ml-3 font-black shrink-0 tracking-tight">{targetWorkDate}</strong>
                            </div>
                            <div className="h-8 w-px bg-slate-600 hidden sm:block shrink-0"></div>
                            <div className="flex items-center shrink-0 flex-1 min-w-0">
                                <span className="text-sm font-bold text-slate-400 shrink-0 mr-3">대상 보건소:</span>
                                <span className="text-lg font-black text-white truncate shrink-0">{activeClientsToday || '없음'}</span>
                            </div>
                        </div>

                        {todayPkgNotes.length > 0 && (
                            <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl mb-6 shrink-0 shadow-sm">
                                <h4 className="text-rose-400 font-black text-sm mb-3 flex items-center gap-2 shrink-0"><span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] shrink-0">필독</span> 금일 패키지 특이사항</h4>
                                <div className="flex flex-col gap-1.5 pl-2 shrink-0">
                                    {todayPkgNotes.map((note, i) => (
                                        <div key={i} className="text-[13px] font-bold text-rose-300 shrink-0">🚨 {note}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ordersToWorkToday.length === 0 && (
                            <div className="bg-[#0f172a] text-slate-400 p-8 rounded-2xl font-bold text-center mb-6 border border-slate-700 flex flex-col items-center gap-3 shrink-0">
                                <Ic.Search size={32}/>
                                <span className="text-lg shrink-0">해당 작업일({targetWorkDate})로 계산된 배송 일정이 없습니다.</span>
                                <span className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 mt-2 shrink-0">작업일정 탭에서 일정을 확인해 주세요.</span>
                            </div>
                        )}

                        {pickingList.length === 0 && ordersToWorkToday.length > 0 ? (
                            <div className="text-center py-24 text-slate-500 font-bold bg-[#0f172a] rounded-2xl border border-slate-700 shrink-0">해당 일자에 등록된 패키지 품목 데이터가 없습니다.</div>
                        ) : (
                            pickingList.length > 0 && (
                            <div className="border-2 border-indigo-500/30 rounded-2xl overflow-hidden shrink-0 mt-6 shadow-sm">
                                <table className="w-full text-center border-collapse text-[13px] mb-0 shrink-0 table-fixed">
                                    <thead>
                                        <tr className="bg-[#0f172a] border-b border-indigo-500/30 text-indigo-200 shrink-0">
                                            <th className="p-4 border-r border-slate-700 font-black w-[6%] shrink-0">순번</th>
                                            <th className="p-4 border-r border-slate-700 font-black text-left w-[30%] shrink-0">품목명</th>
                                            <th className="p-4 border-r border-slate-700 font-black w-[12%] shrink-0">작업단위</th>
                                            <th className="p-4 border-r border-slate-700 font-black w-[10%] shrink-0 text-white">수량</th>
                                            <th className="p-4 border-r border-slate-700 font-black w-[12%] shrink-0 text-emerald-400">박스수량</th>
                                            <th className="p-4 border-r border-slate-700 font-black w-[14%] shrink-0">거래처</th>
                                            <th className="p-4 font-black w-[16%] shrink-0 text-rose-400">특이사항(품목)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[#1e293b]">
                                        {pickingList.map((item, idx) => {
                                            const boxQtyCalc = (item?.totalQty / (item?.boxQuantity || 1)).toFixed(1).replace('.0', '');
                                            let workUnitDisplay = Utils.formatWorkUnit(item?.orderUnit, item?.unit); 

                                            return (
                                            <tr key={`pick-${item?.itemId||idx}`} className="border-b border-slate-700 hover:bg-[#283548] transition-colors shrink-0">
                                                <td className="p-4 border-r border-slate-700 font-bold text-slate-400 shrink-0">{idx + 1}</td>
                                                <td className="p-4 border-r border-slate-700 font-black text-left text-white text-[15px] shrink-0 whitespace-normal break-keep">{item?.name||'미지정'}</td>
                                                <td className="p-4 border-r border-slate-700 font-black text-[13px] text-slate-300 bg-[#0f172a]/50 shrink-0">{workUnitDisplay}</td>
                                                <td className="p-4 border-r border-slate-700 font-black text-[18px] text-indigo-400 bg-indigo-500/10 shrink-0">{Utils.fmt(item?.totalQty)}</td>
                                                <td className="p-4 border-r border-slate-700 font-black text-[14px] text-emerald-400 bg-emerald-500/10 shrink-0">{boxQtyCalc} 박스</td>
                                                <td className="p-4 border-r border-slate-700 font-bold text-slate-300 shrink-0 truncate max-w-[120px]">{item?.supplierName||''}</td>
                                                <td className="p-4 font-bold text-rose-400 text-left shrink-0 whitespace-normal break-words">{item?.itemNotesStr||''}</td>
                                            </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 📦 4. 영플패키지출력 화면 (단일 보건소 및 전체 인쇄)                 */}
            {/* ============================================================== */}
            {activeTab === 'packing' && (
                <div className={`max-w-[1600px] mx-auto px-6 py-6 whitespace-nowrap w-full relative z-0 print:hidden ${isSubPrinting ? 'hidden' : ''}`}>
                    <div className="bg-[#1e293b] p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-700/50 animate-fade-in relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none"></div>
                        
                        <div className="relative z-10 shrink-0">
                            <div className="flex justify-between items-end mb-8 border-b-2 border-slate-700 pb-6 shrink-0">
                                <div className="shrink-0">
                                    <h2 className="text-3xl font-black text-white flex items-center gap-3 shrink-0"><div className="p-2.5 bg-[#0f172a] border border-slate-700 rounded-2xl shrink-0"><Ic.Print size={28} className="text-indigo-400"/></div> 영플패키지출력 (A4 맞춤형)</h2>
                                    <p className="text-sm font-bold text-slate-400 mt-3 ml-14 shrink-0">선택된 날짜의 대상 보건소 및 패키지들을 1장씩 출력합니다.</p>
                                </div>
                                <div className="flex items-center gap-3 bg-[#0f172a] p-2.5 rounded-2xl border border-slate-700 shadow-inner shrink-0">
                                    <span className="text-[13px] font-black text-slate-300 pl-2 shrink-0">출력 대상일 직접 선택</span>
                                    <input type="date" value={packDate} onChange={e=>setPackDate(e.target.value)} className="bg-[#1e293b] border border-slate-600 px-4 py-2.5 rounded-xl font-black text-indigo-400 outline-none cursor-pointer focus:border-indigo-500 shrink-0" />
                                </div>
                            </div>

                            {packClientsForDate.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-bold shrink-0">
                                    <div className="bg-[#0f172a] p-6 rounded-full mb-4 border border-slate-700 shrink-0"><Ic.Search size={40} className="text-slate-600"/></div>
                                    <span className="text-lg shrink-0">선택한 날짜({packDate})에 작업이 등록된 보건소가 없습니다.</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 shrink-0">
                                    <div className="flex justify-between items-center bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl shrink-0">
                                        <div className="font-bold text-indigo-100 shrink-0">해당 날짜의 <strong className="font-black text-white">{packClientsForDate.length}개</strong> 보건소 패키지를 모두 인쇄하시겠습니까?</div>
                                        <button onClick={()=>{setPackagePrintPreview({date: packDate, clientIds: packClientsForDate.map(c=>c?.id)}); setIsSubPrinting(true);}} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-black shadow-md transition-all flex items-center gap-2 shrink-0 hover:-translate-y-0.5"><Ic.Print size={18}/> 전체 보건소 일괄 출력</button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
                                        {packClientsForDate.map(client => {
                                            if(!client) return null;
                                            
                                            // 🌟 [제안 4 반영] 화면상의 패키지 대기 수량 표시 로직 보완 (targetMonth 기준)
                                            const orders = (st.clientOrders||[]).filter(o => o?.clientId === client?.id && o?.month === targetMonth && (getMappedWorkDate(o?.deliveryDate1) === packDate || getMappedWorkDate(o?.deliveryDate2) === packDate));
                                            const pkgs = (st.packageOrders||[]).filter(p => p?.clientId === client?.id && p?.month === targetMonth && (orders.some(o=>getMappedWorkDate(o?.deliveryDate1)===packDate && p?.round===1) || orders.some(o=>getMappedWorkDate(o?.deliveryDate2)===packDate && p?.round===2) || p?.pkgType === '공통'));
                                            const pkgCount = pkgs.filter(p=>p?.pkgType!=='공통').length;
                                            
                                            return (
                                                <div key={`pack-client-${client?.id}`} className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl shadow-sm hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col shrink-0 group">
                                                    <div className="flex justify-between items-start mb-4 shrink-0">
                                                        <div className="font-black text-lg text-slate-200 group-hover:text-indigo-400 transition-colors shrink-0">{client?.name||'미지정'}</div>
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-500 mb-6 shrink-0">출력 대기 패키지: <span className="font-black text-rose-400">{pkgCount}개</span></div>
                                                    <button onClick={()=>{setPackagePrintPreview({date: packDate, clientIds: [client.id]}); setIsSubPrinting(true);}} className="mt-auto w-full py-3.5 bg-[#1e293b] text-slate-300 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2 shrink-0 border border-slate-600"><Ic.Box size={16}/> 이 보건소만 출력</button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
        
      {/* ============================================================== */}
      {/* 🌟 렌더링 스코프 유실 방지: 모든 모달창을 최하단에 안전하게 주입 */}
      {/* ============================================================== */}
      {matrixPrintData && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto animate-fade-in overflow-y-auto whitespace-normal">
              <div className="bg-[#1e293b] px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3"><img src="/logo.png" className="h-8 w-auto" onError={(e)=>e.target.style.display='none'}/>{matrixPrintData.title}</h2>
                  <div className="flex gap-3">
                      <button onClick={()=>Utils.dlExcel(`<style>table{border-collapse:collapse;font-size:10pt}th,td{border:.5pt solid windowtext;padding:5px;text-align:center}.hp{background-color:#8B208B;color:white;font-size:16pt}.hb{background-color:#d4e6f1}.hg{background-color:#e9f7ef}.hr{background-color:#fce4d6;color:red}.n{mso-number-format:"\\#\\,\\#\\#0"}.tl{text-align:left}</style>`+document.getElementById('print-matrix-table').outerHTML, matrixPrintData.title)} className="bg-[#1DBADF]/10 text-[#1DBADF] hover:bg-[#1DBADF] hover:text-white px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2"><Ic.FileD size={18}/> 엑셀 다운로드</button>
                      <button onClick={() => setTimeout(() => window.print(), 100)} className="bg-indigo-600 text-white hover:bg-indigo-500 px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-md"><Ic.Print size={18}/> 인쇄</button>
                      <button onClick={()=>{setMatrixPrintData(null); setIsSubPrinting(false);}} className="bg-slate-700 text-white hover:bg-rose-500 px-4 py-3 rounded-xl font-black text-sm transition-all">닫기</button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative">
                  <div className="mx-auto w-[297mm] max-w-full bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:p-0 text-left h-max text-black relative print-no-bg">
                      <table id="print-matrix-table" className="w-full text-center border-collapse border border-slate-600 text-[8px] print:text-[10px] leading-tight print:table-auto table-fixed">
                          <thead>
                              <tr><th colSpan={3+matrixPrintData.d1List.length+matrixPrintData.d2List.length+(matrixPrintData.d1List.length?1:0)+(matrixPrintData.d2List.length?1:0)} className="bg-[#96368B] text-white py-1.5 text-sm font-black border border-slate-600 hp">{matrixPrintData.title} ({matrixPrintData.displayMonth}월)</th></tr>
                              <tr>
                                  <th rowSpan="2" className="bg-[#e2e8f0] border border-slate-500 print:w-[15px] w-[2%]">No.</th><th rowSpan="2" className="bg-[#e2e8f0] border border-slate-500 print:w-auto min-w-[80px] w-[12%]">품명</th>
                                  {matrixPrintData.d1List.length>0 && <th colSpan={matrixPrintData.d1List.length} className="bg-[#d4e6f1] border border-slate-500 hb">1차 발주</th>}{matrixPrintData.d1List.length>0 && <th rowSpan="2" className="bg-[#aed6f1] border border-slate-500 px-1 w-[3%] hb">소계</th>}
                                  {matrixPrintData.d2List.length>0 && <th colSpan={matrixPrintData.d2List.length} className="bg-[#e9f7ef] border border-slate-500 hg">2차 발주</th>}{matrixPrintData.d2List.length>0 && <th rowSpan="2" className="bg-[#abebc6] border border-slate-500 px-1 w-[3%] hg">소계</th>}
                                  <th rowSpan="2" className="bg-[#fce4d6] border border-slate-500 px-1 w-[4%] hr">총계</th>
                              </tr>
                              <tr>
                                  {matrixPrintData.d1List.map(c=><th key={`ph1-${c?.cId}`} className="bg-[#eaf2f8] border border-slate-500 px-0.5 py-0.5 print:px-0.5 print:min-w-0 text-[7px] hb">{String(c?.cName||'').substring(0,3)}<br/>{String(c?.date||'').substring(5)}</th>)}
                                  {matrixPrintData.d2List.map(c=><th key={`ph2-${c?.cId}`} className="bg-[#e9f7ef] border border-slate-500 px-0.5 py-0.5 print:px-0.5 print:min-w-0 text-[7px] hg">{String(c?.cName||'').substring(0,3)}<br/>{String(c?.date||'').substring(5)}</th>)}
                              </tr>
                          </thead>
                          <tbody>
                              {(matrixPrintData.categories?matrixPrintData.matrixRows.filter(r=>matrixPrintData.categories.includes(r?.master?.category)):matrixPrintData.matrixRows).map((r,i) => {
                                  let t1=0,t2=0; return (
                                  <tr key={`pr-${r?.key}`} className="border-b border-slate-400"><td className="border border-slate-500 font-bold py-0.5 print:p-0.5">{i+1}</td><td className="border border-slate-500 font-black text-[#272154] text-left px-1 print:p-0.5 print:whitespace-normal print:break-words tl">{matrixPrintData.getDisplayName(r?.master?.name, r?.orderUnit, r?.master?.unit)}</td>
                                      {matrixPrintData.d1List.map(c=>{const v=matrixPrintData.getQty(c?.cId,r,true);t1+=v;return <td key={`pc1-${c?.cId}`} className="border border-slate-500 px-0.5 print:px-0.5 text-right n">{v>0?Utils.fmt(v):''}</td>})}
                                      {matrixPrintData.d1List.length>0 && <td className="bg-blue-50 border border-slate-500 font-black text-right px-1 print:px-0.5 hb n">{t1>0?Utils.fmt(t1):''}</td>}
                                      {matrixPrintData.d2List.map(c=>{const v=matrixPrintData.getQty(c?.cId,r,false);t2+=v;return <td key={`pc2-${c?.cId}`} className="border border-slate-500 px-0.5 print:px-0.5 text-right n">{v>0?Utils.fmt(v):''}</td>})}
                                      {matrixPrintData.d2List.length>0 && <td className="bg-emerald-50 border border-slate-500 font-black text-right px-1 print:px-0.5 hg n">{t2>0?Utils.fmt(t2):''}</td>}
                                      <td className="bg-rose-50 border border-slate-500 font-black text-rose-700 px-1 print:px-0.5 text-right hr n">{t1+t2>0?Utils.fmt(t1+t2):''}</td></tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {portraitPrintData && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto animate-fade-in overflow-y-auto whitespace-normal">
              <div className="bg-[#1e293b] px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 border-b border-slate-700 flex-none">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3"><img src="/logo.png" className="h-8 w-auto" onError={(e)=>e.target.style.display='none'}/>신선식품 패키지출력 <span className="text-sm bg-slate-700 px-3 py-1.5 rounded-lg">{portraitPrintData.date}</span></h2>
                  <div className="flex gap-3">
                      <button onClick={() => setTimeout(() => window.print(), 100)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2"><Ic.Print size={18}/> 세로 폼 인쇄</button>
                      <button onClick={()=>{setPortraitPrintData(null); setIsSubPrinting(false);}} className="bg-slate-700 text-white hover:bg-rose-500 px-4 py-3 rounded-xl font-black text-sm">닫기</button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative">
                  <div className="mx-auto bg-white w-[210mm] max-w-full min-h-[296.5mm] h-max shadow-2xl p-10 print:shadow-none print:m-0 print:p-0 text-left box-border flex flex-col relative text-black print-no-bg">
                      <div className="border-b-4 border-[#272154] pb-2.5 mb-6 flex justify-between items-end"><div className="flex items-center gap-4"><img src="/logo.png" className="w-16 h-auto" onError={(e)=>e.target.style.display='none'}/><div className="text-[18px] font-black text-[#272154] bg-[#272154]/10 px-3 py-1 rounded-lg">신선식품 (야채/과일/버섯)</div><h1 className="text-[22px] font-black text-[#272154]">일일 작업 지시서</h1></div><div className="text-right"><div className="text-[11px] font-black text-slate-500 mb-0.5">포장 작업일자</div><div className="text-[14px] font-black text-[#E94287]">{portraitPrintData.date}</div></div></div>
                      <table className="w-full text-left border-collapse border-2 border-[#272154] print:table-auto table-fixed">
                          <thead><tr className="bg-slate-100 border-b-2 border-[#272154]"><th className="py-2 px-2 font-black text-[14px] print:text-[48px] print:py-8 w-[10%] text-center border-r border-slate-400">순번</th><th className="py-2 px-4 font-black text-[15px] print:text-[60px] print:py-8 w-[70%] border-r border-slate-400">품명 및 작업단위</th><th className="py-2 px-4 font-black text-[16px] print:text-[60px] print:py-8 text-center w-[20%] text-[#1DBADF] bg-[#1DBADF]/10">수량</th></tr></thead>
                          <tbody>
                              {portraitPrintData.data.length===0 ? <tr><td colSpan="3" className="py-20 text-slate-400 font-bold text-center">내역이 없습니다.</td></tr> : portraitPrintData.data.map((it, i) => (
                                  <tr key={`pp-${it?.itemId||i}`} className="border-b border-slate-400"><td className="py-2 px-2 font-bold text-[14px] print:text-[48px] print:py-8 text-slate-500 text-center border-r border-slate-400">{i+1}</td><td className="py-2 px-4 font-black text-[26px] print:text-[105px] print:py-8 leading-[1.15] text-black border-r border-slate-400 print:whitespace-normal print:break-keep tracking-tight">{it.name}</td><td className="py-2 px-4 font-black text-[30px] print:text-[126px] print:py-8 leading-none text-[#1DBADF] text-center bg-[#1DBADF]/5">{Utils.fmt(it.totalQty)}</td></tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {packagePrintPreview && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto animate-fade-in overflow-y-auto whitespace-normal">
              <div className="bg-[#1e293b] px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
                  <div><h2 className="text-2xl font-black text-white flex items-center gap-3 whitespace-nowrap"><img src="/logo.png" alt="웰쉐어 로고" className="h-8 w-auto drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} /><div style={{display:'none'}}><Ic.Print className="text-white"/></div>영플패키지출력 <span className="text-sm font-bold text-indigo-300 ml-3 bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-500/30">{packagePrintPreview?.date||''}</span></h2></div>
                  <div className="flex gap-3"><button onClick={dlPackageExcel} className="bg-[#0f172a] border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"><Ic.FileD size={18}/> 엑셀 다운로드</button><button onClick={()=>setTimeout(()=>window.print(), 100)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-md whitespace-nowrap"><Ic.Print size={18}/> A4 공문서 인쇄</button><button onClick={()=>{setPackagePrintPreview(null); setIsSubPrinting(false);}} className="bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-300 px-4 py-3 rounded-xl font-black text-sm transition-all shadow-sm whitespace-nowrap">닫기</button></div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative text-center">
                  {packagePrintData.length === 0 ? (
                      <div className="bg-[#1e293b] max-w-4xl p-20 mx-auto text-center rounded-[2rem] shadow-2xl font-black text-2xl text-slate-400 print:hidden whitespace-nowrap shrink-0 border border-slate-700">출력할 패키지 데이터가 없습니다.</div>
                  ) : (
                      packagePrintData.map((pkg, pIdx) => (
                          <div key={`print-pkg-${pkg?.id||pIdx}`} className="bg-white w-[210mm] max-w-full mx-auto min-h-[296.5mm] h-max shadow-2xl p-[10mm] print:shadow-none print:m-0 print:p-0 shrink-0 text-left box-border flex flex-col relative overflow-hidden print:break-after-page mb-8 print:mb-0 text-black print-no-bg">
                              <div className="border-b-4 border-[#272154] pb-2.5 mb-2.5 flex justify-between items-end shrink-0">
                                  <div className="flex items-center gap-4 whitespace-nowrap shrink-0">
                                      <img src="/logo.png" alt="웰쉐어 로고" className="w-16 h-auto print:w-16 shrink-0" onError={(e)=>{ e.target.style.display='none'; }}/>
                                      <div className="text-[18px] font-black text-[#272154] bg-[#272154]/10 px-3 py-1 rounded-lg tracking-wider shrink-0">{pkg?.clientName||''}</div>
                                      <h1 className="text-[22px] font-black tracking-tighter text-[#272154] shrink-0">영양플러스 패키지 작업 지시서</h1>
                                  </div>
                                  <div className="text-right whitespace-nowrap shrink-0">
                                      <div className="text-[11px] font-black text-slate-500 mb-0.5 shrink-0">포장 작업일자</div>
                                      <div className="text-[14px] font-black text-[#E94287] shrink-0">{pkg?.workDate||''}</div>
                                  </div>
                              </div>
                              <div className="relative flex justify-center items-center bg-slate-50 py-3 px-4 rounded-xl mb-3 border-2 border-[#272154]/20 shrink-0 min-h-[80px]">
                                   <div className="text-[32px] font-black text-black tracking-tighter flex flex-col items-center justify-center shrink-0 w-full max-w-[65%] text-center">
                                       <span className="whitespace-nowrap">{pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`}</span>
                                       {pkg?.pkgNote && <span className="text-[12px] text-rose-600 bg-rose-100 px-3 py-1 mt-1.5 rounded-lg border border-rose-200 inline-block shrink-0 leading-tight">🚨 특이사항: {pkg?.pkgNote}</span>}
                                   </div>
                                   <div className="absolute right-4 bg-white border-2 border-[#272154] px-5 py-2 rounded-xl text-center shadow-sm whitespace-nowrap shrink-0">
                                       <div className="text-[10px] font-black text-slate-600 mb-0.5 shrink-0">제작 패키지 수량</div>
                                       <div className="text-[48px] tracking-tighter font-black text-[#E94287] leading-none shrink-0">{pkg?.personCount||0}<span className="text-[16px] text-black ml-1 tracking-normal shrink-0">개</span></div>
                                   </div>
                              </div>
                              <table className="w-full text-left border-collapse border-2 border-[#272154] print:table-auto table-fixed shrink-0">
                                  <thead>
                                      <tr className="bg-slate-100 border-b-2 border-[#272154]">
                                          <th className="py-2 px-2 font-black text-[14px] print:text-[48px] print:py-8 w-[10%] text-center border-r border-slate-300 shrink-0">순번</th>
                                          <th className="py-2 px-4 font-black text-[15px] print:text-[60px] print:py-8 w-[75%] border-r border-slate-300 shrink-0">품명 및 작업단위</th>
                                          <th className="py-2 px-4 font-black text-[16px] print:text-[60px] print:py-8 text-center w-[15%] text-[#1DBADF] bg-[#1DBADF]/10 shrink-0">수량</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {(pkg?.mappedItems||[]).map((it, idx) => {
                                          let workUnitDisplay = Utils.formatWorkUnit(it?.orderUnit, it?.printUnit); 
                                          const hasNote = it?.note && String(it?.note).trim() !== '';
                                          // 🌟 제안 4 반영: 영플패키지 인쇄 시 '분유' 카테고리는 품목명이 아닌 '분유'라는 분류명으로 출력
                                          let itemDisplayName = it?.category === '분유' ? '분유' : (it?.name||'');
                                          return (
                                              <tr key={`print-it-${it?.itemId||idx}`} className="border-b border-slate-300 shrink-0">
                                                  <td className="py-1.5 px-2 font-bold text-[14px] print:text-[48px] print:py-8 text-slate-500 text-center border-r border-slate-300 shrink-0">{idx+1}</td>
                                                  <td className="py-1.5 px-4 font-black text-[26px] print:text-[105px] print:py-8 leading-[1.15] text-black border-r border-slate-300 shrink-0 print:whitespace-normal print:break-keep tracking-tight">
                                                      {itemDisplayName}
                                                      <span className="text-[16px] print:text-[60px] font-bold text-[#475569] ml-2 align-baseline shrink-0 whitespace-nowrap">({workUnitDisplay})</span>
                                                      {hasNote && <span className="text-rose-500 ml-1.5 font-black text-[20px] print:text-[80px] align-top shrink-0">*</span>}
                                                  </td>
                                                  <td className="py-1.5 px-4 font-black text-[30px] print:text-[126px] print:py-8 leading-none text-[#1DBADF] text-center bg-[#1DBADF]/5 shrink-0">{Utils.fmt(it?.qtyPerPerson)}</td>
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                              {(pkg?.mappedItems||[]).some(it => it?.note && String(it?.note).trim() !== '') && (
                                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl shrink-0 whitespace-normal break-words">
                                      <h4 className="text-[12px] font-black text-rose-700 mb-1.5">🚨 품목 특이사항</h4>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                          {(pkg?.mappedItems||[]).filter(it => it?.note && String(it?.note).trim() !== '').map((it, nIdx) => (
                                              <div key={`n-${nIdx}`} className="text-[11px] font-bold text-rose-800">• <span className="text-[#272154]">{it?.name||''}</span> : {it?.note}</div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              <div className="mt-auto pt-2 flex justify-between items-end shrink-0 page-break-inside-avoid">
                                  <div className="text-[9px] font-bold text-slate-500 shrink-0">※ 수량 부족 시 즉시 보고 바랍니다.</div>
                                  <table className="border-collapse border-2 border-[#272154] w-40 text-center shrink-0">
                                      <tbody>
                                          <tr>
                                              <th className="border border-slate-400 bg-slate-100 py-1 text-[9px] text-[#272154] font-black w-8 shrink-0" rowSpan="2">확<br/>인</th>
                                              <th className="border border-slate-400 bg-slate-50 py-0.5 text-[9px] text-slate-700 font-bold shrink-0">담당자</th>
                                              <th className="border border-slate-400 bg-slate-50 py-0.5 text-[9px] text-slate-700 font-bold shrink-0">관리자</th>
                                          </tr>
                                          <tr><td className="border border-slate-400 h-7 shrink-0"></td><td className="border border-slate-400 h-7 shrink-0"></td></tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {pickingPrintPreview && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/95 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto animate-fade-in overflow-y-auto whitespace-normal">
              <div className="bg-[#1e293b] px-8 py-4 flex justify-between items-center shadow-lg print:hidden shrink-0 z-50 sticky top-0 border-b border-slate-700">
                  <div><h2 className="text-2xl font-black text-white flex items-center gap-3 whitespace-nowrap"><img src="/logo.png" alt="웰쉐어 로고" className="h-8 w-auto drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} /><div style={{display:'none'}}><Ic.Print className="text-white"/></div>영플패킹지시서 <span className="text-sm font-bold text-indigo-300 ml-3 bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-500/30">{targetWorkDate}</span></h2></div>
                  <div className="flex gap-3"><button onClick={dlPickingExcel} className="bg-[#0f172a] border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"><Ic.FileD size={18}/> 엑셀 다운로드</button><button onClick={()=>setTimeout(()=>window.print(), 100)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-md whitespace-nowrap"><Ic.Print size={18}/> 명세서 인쇄</button><button onClick={()=>{setPickingPrintPreview(false); setIsSubPrinting(false);}} className="bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-300 px-4 py-3 rounded-xl font-black text-sm transition-all shadow-sm whitespace-nowrap">닫기</button></div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 print:p-0 bg-transparent print:bg-white print:block print:overflow-visible print:h-auto w-full relative text-center">
                  <div className="bg-white max-w-[21cm] w-[210mm] mx-auto min-h-[296.5mm] h-max shadow-2xl p-[10mm] print:shadow-none print:m-0 print:border-none print:p-[10mm] flex flex-col shrink-0 text-left box-border text-black relative print-no-bg">
                      <div className="text-center mb-4 border-b-4 border-[#272154] pb-3 shrink-0">
                          <h1 className="text-[2rem] font-black tracking-widest text-[#272154] mb-3 shrink-0">영플패킹지시서</h1>
                          <div className="flex justify-between items-end shrink-0">
                              <div className="text-left shrink-0"><p className="text-xs font-black text-slate-500 mb-0.5 shrink-0">작업일자</p><p className="text-lg font-black text-[#E94287] shrink-0">{targetWorkDate}</p></div>
                              <div className="text-right flex flex-col items-end shrink-0"><p className="text-xs font-black text-slate-500 mb-0.5 shrink-0">대상 보건소</p><p className="text-sm font-black text-[#272154] shrink-0 max-w-[400px] truncate whitespace-pre-wrap leading-tight">{activeClientsToday || '지정되지 않음'}</p></div>
                          </div>
                      </div>
                      {todayPkgNotes.length > 0 && (
                          <div className="mb-3 border-2 border-rose-500 p-2 rounded-lg bg-rose-50 shrink-0 whitespace-normal break-words">
                              <h4 className="text-rose-700 font-black text-[11px] mb-1 flex items-center gap-1.5 shrink-0"><span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] shrink-0">필독</span> 금일 패키지 특이사항</h4>
                              <div className="space-y-0.5 pl-2 shrink-0">{todayPkgNotes.map((note, i) => (<div key={`p-note-${i}`} className="text-[10px] font-bold text-rose-800 shrink-0">• {note}</div>))}</div>
                          </div>
                      )}
                      <table className="w-full text-center border-collapse border-2 border-[#272154] shrink-0 print:table-auto table-fixed">
                          <thead>
                              <tr className="bg-slate-100 text-[#272154]">
                                  <th className="border border-slate-400 py-1.5 px-1 font-black text-[11px] w-[6%] shrink-0">순번</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[30%] shrink-0">품목명</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[12%] shrink-0">작업단위</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[10%] shrink-0">수량</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[12%] shrink-0">박스수량</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[14%] shrink-0">거래처</th>
                                  <th className="border border-slate-400 py-1.5 px-2 font-black text-[11px] w-[16%] shrink-0">특이사항(품목)</th>
                              </tr>
                          </thead>
                          <tbody>
                              {pickingList.length === 0 ? (
                                  <tr><td colSpan="7" className="py-20 text-slate-400 font-bold shrink-0">데이터가 없습니다.</td></tr>
                              ) : (
                                  pickingList.map((it, idx) => {
                                      const boxQtyCalc = (it?.totalQty / (it?.boxQuantity || 1)).toFixed(1).replace('.0', '');
                                      let workUnitDisplay = Utils.formatWorkUnit(it?.orderUnit, it?.unit); 
                                      return (
                                          <tr key={`print-pick-${it?.itemId||idx}`} className="hover:bg-slate-50 shrink-0 border-b border-slate-300">
                                              <td className="p-4 border-r border-slate-300 font-bold text-slate-600 shrink-0">{idx + 1}</td>
                                              <td className="p-4 border-r border-slate-300 font-black text-left text-[#272154] text-[15px] shrink-0 print:whitespace-normal print:break-all">{it?.name||'미지정'}</td>
                                              <td className="p-4 border-r border-slate-300 font-black text-[13px] text-slate-600 bg-slate-50/50 shrink-0">{workUnitDisplay}</td>
                                              <td className="p-4 border-r border-slate-300 font-black text-[18px] text-blue-700 bg-blue-50/30 shrink-0">{Utils.fmt(it?.totalQty)}</td>
                                              <td className="p-4 border-r border-slate-300 font-black text-[14px] text-emerald-700 bg-emerald-50/50 shrink-0">{boxQtyCalc} 박스</td>
                                              <td className="p-4 border-r border-slate-300 font-bold text-slate-700 shrink-0 print:whitespace-normal print:break-all">{it?.supplierName||''}</td>
                                              <td className="p-4 font-bold text-rose-600 text-left shrink-0 whitespace-normal break-words">{it?.itemNotesStr||''}</td>
                                          </tr>
                                      )
                                  })
                              )}
                          </tbody>
                      </table>
                      <div className="mt-auto print:mt-4 pt-4 flex justify-between items-end shrink-0 page-break-inside-avoid">
                          <div className="text-[10px] font-bold text-slate-500 shrink-0">※ 박스 수량은 마스터 입수량 기준의 참조용 수치입니다.</div>
                          <table className="border-collapse border-2 border-[#272154] w-48 text-center shrink-0">
                              <tbody>
                                  <tr>
                                      <th className="border border-slate-400 bg-slate-100 py-1 text-[10px] text-[#272154] font-black w-8 shrink-0" rowSpan="2">확<br/>인</th>
                                      <th className="border border-slate-400 bg-slate-50 py-0.5 text-[10px] text-slate-700 font-bold shrink-0">담당자</th>
                                      <th className="border border-slate-400 bg-slate-50 py-0.5 text-[10px] text-slate-700 font-bold shrink-0">관리자</th>
                                  </tr>
                                  <tr>
                                      <td className="border border-slate-400 h-8 shrink-0"></td>
                                      <td className="border border-slate-400 h-8 shrink-0"></td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 모달들 복구 완료 */}
      {showBulkModal && bulkGrid && (
          <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 animate-fade-in whitespace-nowrap print:hidden">
              <div className="bg-[#1e293b] rounded-[2.5rem] w-full max-w-[1200px] h-[90vh] shadow-2xl flex flex-col relative animate-scale-up border-t-8 border-indigo-500">
                  <button onClick={()=>setShowBulkModal(false)} className="absolute top-8 right-8 p-3 bg-slate-800 rounded-full hover:text-rose-400 transition-colors z-10 shrink-0 text-slate-400 border border-slate-700"><Ic.X size={24}/></button>
                  <div className="flex-none p-8 pb-6 border-b border-slate-700 shrink-0">
                      <h3 className="text-3xl font-black mb-3 text-white flex items-center gap-3 shrink-0"><div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0"><Ic.ListP className="text-indigo-400" size={28}/></div> 1~6패키지 수량 스마트 일괄 생성</h3>
                      <p className="text-sm font-bold text-slate-400 pl-16 shrink-0">좌측은 <strong className="text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30">1차 배송</strong>, 우측은 <strong className="text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/30">2차 배송</strong> 수량을 빠르게 입력합니다.<br/><span className="text-rose-400 font-black">※ 수량이 빈칸이거나 0인 항목은 자동으로 무시(필터링)됩니다.</span></p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-[#0f172a] scrollbar-hide">
                      <div className="flex flex-col xl:flex-row gap-6">
                          {/* 1차 */}
                          <div className="flex-1 bg-[#1e293b] rounded-3xl border border-blue-500/30 shadow-lg overflow-hidden flex flex-col">
                              <div className="bg-blue-600/20 border-b border-blue-500/30 text-blue-300 text-center py-4 font-black text-xl tracking-wider shrink-0">🔵 1차 배송 패키지 수량</div>
                              <div className="p-6 space-y-6">
                                  {PKG_NUMS.map(num => (
                                      <div key={`bulk-1-${num}`} className="border border-slate-700 rounded-2xl p-4 bg-[#0f172a] shadow-inner shrink-0">
                                          <h4 className="font-black text-lg text-white mb-3 pb-2 border-b border-slate-700 flex justify-between items-center shrink-0">
                                              <span className="shrink-0">{num} 패키지 <span className="text-[10px] text-slate-500 font-medium ml-1 shrink-0">{num <= 3 ? '(아기용)' : '(산모용)'}</span></span>
                                              <button onClick={(e) => { e.preventDefault(); handleBulkAddRow(num); }} className="text-[11px] bg-[#1e293b] border border-slate-600 text-indigo-400 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shrink-0"><Ic.Plus size={14}/> 커스텀 타입 추가</button>
                                          </h4>
                                          <div className="flex flex-wrap gap-3 shrink-0">
                                              {(bulkGrid[num]||[]).map(sub => (
                                                  <div key={`s1-${sub?.id}`} className="bg-[#1e293b] border border-slate-600 rounded-xl p-2 flex items-center gap-2 shadow-sm w-[calc(50%-0.5rem)] lg:w-auto flex-1 min-w-[160px] shrink-0 whitespace-nowrap focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                                                      <span className="font-black text-slate-400 text-sm pl-2 shrink-0">{num}-</span>
                                                      {sub?.isCustom ? (
                                                          <input type="text" value={sub?.type} onChange={e => handleBulkUpdate(num, sub?.id, 'type', e.target.value)} className="w-16 md:w-20 text-sm font-black border-b border-slate-600 outline-none text-center focus:border-blue-400 bg-transparent text-white p-0 m-0 shrink-0" placeholder="이름" />
                                                      ) : (
                                                          <span className="text-center font-black text-slate-200 text-sm pr-2 shrink-0">{sub?.type}</span>
                                                      )}
                                                      <input type="number" onWheel={e=>e.target.blur()} value={sub?.q1||''} onChange={e => handleBulkUpdate(num, sub?.id, 'q1', e.target.value)} placeholder="0" className="flex-1 w-16 text-lg font-black text-center outline-none bg-[#0f172a] border border-transparent focus:border-blue-500 text-blue-400 rounded-lg py-1.5 transition-colors shrink-0" />
                                                      {sub?.isCustom && <button onClick={(e) => { e.preventDefault(); handleBulkRemoveRow(num, sub?.id); }} className="text-rose-400 hover:text-white hover:bg-rose-500 p-1 rounded-md shrink-0 transition-colors"><Ic.X size={16}/></button>}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          {/* 2차 */}
                          <div className="flex-1 bg-[#1e293b] rounded-3xl border border-emerald-500/30 shadow-lg overflow-hidden flex flex-col">
                              <div className="bg-emerald-600/20 border-b border-emerald-500/30 text-emerald-300 text-center py-4 font-black text-xl tracking-wider shrink-0">🟢 2차 배송 패키지 수량</div>
                              <div className="p-6 space-y-6">
                                  {PKG_NUMS.map(num => (
                                      <div key={`bulk-2-${num}`} className="border border-slate-700 rounded-2xl p-4 bg-[#0f172a] shadow-inner shrink-0">
                                          <h4 className="font-black text-lg text-white mb-3 pb-2 border-b border-slate-700 flex justify-between items-center shrink-0">
                                              <span className="shrink-0">{num} 패키지 <span className="text-[10px] text-slate-500 font-medium ml-1 shrink-0">{num <= 3 ? '(아기용)' : '(산모용)'}</span></span>
                                              <button onClick={(e) => { e.preventDefault(); handleBulkAddRow(num); }} className="text-[11px] bg-[#1e293b] border border-slate-600 text-indigo-400 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shrink-0"><Ic.Plus size={14}/> 커스텀 타입 추가</button>
                                          </h4>
                                          <div className="flex flex-wrap gap-3 shrink-0">
                                              {(bulkGrid[num]||[]).map(sub => (
                                                  <div key={`s2-${sub?.id}`} className="bg-[#1e293b] border border-slate-600 rounded-xl p-2 flex items-center gap-2 shadow-sm w-[calc(50%-0.5rem)] lg:w-auto flex-1 min-w-[160px] shrink-0 whitespace-nowrap focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                                                      <span className="font-black text-slate-400 text-sm pl-2 shrink-0">{num}-</span>
                                                      {sub?.isCustom ? (
                                                          <input type="text" value={sub?.type} onChange={e => handleBulkUpdate(num, sub?.id, 'type', e.target.value)} className="w-16 md:w-20 text-sm font-black border-b border-slate-600 outline-none text-center focus:border-emerald-400 bg-transparent text-white p-0 m-0 shrink-0" placeholder="이름" />
                                                      ) : (
                                                          <span className="text-center font-black text-slate-200 text-sm pr-2 shrink-0">{sub?.type}</span>
                                                      )}
                                                      <input type="number" onWheel={e=>e.target.blur()} value={sub?.q2||''} onChange={e => handleBulkUpdate(num, sub?.id, 'q2', e.target.value)} placeholder="0" className="flex-1 w-16 text-lg font-black text-center outline-none bg-[#0f172a] border border-transparent focus:border-emerald-500 text-emerald-400 rounded-lg py-1.5 transition-colors shrink-0" />
                                                      {sub?.isCustom && <button onClick={(e) => { e.preventDefault(); handleBulkRemoveRow(num, sub?.id); }} className="text-rose-400 hover:text-white hover:bg-rose-500 p-1 rounded-md shrink-0 transition-colors"><Ic.X size={16}/></button>}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-none p-6 border-t border-slate-700 bg-[#1e293b] flex justify-between items-center rounded-b-[2.5rem] shrink-0">
                      <button onClick={handleBulkReset} className="bg-[#0f172a] border border-rose-500/30 text-rose-400 px-8 py-4 rounded-xl font-black text-sm hover:bg-rose-900/30 shadow-sm transition-all flex items-center gap-2 shrink-0">
                          <Ic.Trash size={18}/> 입력값 전체 초기화
                      </button>
                      <button onClick={handleBulkSave} className="bg-indigo-600 hover:bg-indigo-500 text-white px-16 py-4 rounded-xl font-black text-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-3 shrink-0">
                          <Ic.Chk size={24}/> 수량이 있는 패키지 전체 일괄 생성
                      </button>
                  </div>
              </div>
          </div>
      )}

      {newPkgModal.is && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in print:hidden">
            <div className="bg-[#1e293b] rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl relative animate-scale-up border-t-8 border-indigo-500 text-white">
                <button onClick={()=>setNewPkgModal({...newPkgModal, is: false})} className="absolute top-6 right-6 p-3 bg-slate-800 rounded-full hover:bg-rose-500 hover:text-white transition-colors shrink-0 text-slate-400"><Ic.X size={20}/></button>
                <h3 className="text-2xl font-black mb-8 text-white flex items-center gap-3 shrink-0"><div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0"><Ic.Plus className="text-indigo-400" size={24}/></div> {newPkgModal.round}차 패키지 생성</h3>
                <form onSubmit={handleAddPackage} className="space-y-5">
                    <div>
                        <label className="text-xs font-black text-slate-400 block mb-2 shrink-0">패키지 번호</label>
                        <select value={newPkgModal.num} onChange={e => setNewPkgModal({...newPkgModal, num: Number(e.target.value)})} className="w-full border border-slate-600 p-4 rounded-xl font-black outline-none focus:border-indigo-500 bg-[#0f172a] text-slate-200 transition-all cursor-pointer shrink-0 shadow-inner">
                            {PKG_NUMS.map(n => <option key={`pkg-num-${n}`} value={n}>{n} 패키지</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 block mb-2 shrink-0">상세 타입 (변경 사유 등)</label>
                        <div className="flex flex-col gap-3 shrink-0">
                            <select value={newPkgModal.type} onChange={e => setNewPkgModal({...newPkgModal, type: e.target.value})} className="w-full border border-slate-600 p-4 rounded-xl font-black outline-none focus:border-indigo-500 bg-[#0f172a] text-slate-200 transition-all cursor-pointer shrink-0 shadow-inner">
                                {PKG_TYPES.map(t => <option key={`pkg-type-${t}`} value={t}>{t}</option>)}
                            </select>
                            {newPkgModal.type === '직접입력' && <input type="text" value={newPkgModal.customType} onChange={e => setNewPkgModal({...newPkgModal, customType: e.target.value})} placeholder="직접 입력하세요" className="w-full border border-slate-600 p-4 rounded-xl font-black outline-none focus:border-indigo-500 bg-[#0f172a] text-white shadow-inner shrink-0" required autoFocus />}
                            <input type="text" value={newPkgModal.pkgNote} onChange={e => setNewPkgModal({...newPkgModal, pkgNote: e.target.value})} placeholder="특이사항 입력 (예: 문앞 금지)" className="w-full border border-rose-500/50 p-4 rounded-xl font-black outline-none focus:border-rose-500 bg-rose-500/10 text-rose-300 shadow-inner shrink-0 placeholder-rose-500/50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 block mb-2 shrink-0">패키지 수량</label>
                        <input type="number" onWheel={e=>e.target.blur()} min="1" value={newPkgModal.count || ''} onChange={e => setNewPkgModal({...newPkgModal, count: e.target.value})} className="w-full border border-slate-600 p-4 rounded-xl font-black outline-none focus:border-indigo-500 bg-[#0f172a] text-indigo-400 text-center text-2xl shadow-inner transition-all shrink-0" placeholder="0" required/>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-black shadow-lg mt-6 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-base shrink-0 border border-indigo-400">이 설정으로 생성하기</button>
                </form>
            </div>
        </div>
      )}

      {showCopyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in whitespace-nowrap print:hidden">
            <div className="bg-[#1e293b] rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl relative animate-scale-up border-t-8 border-indigo-500 max-h-[85vh] flex flex-col text-white">
                <button onClick={()=>setShowCopyModal(false)} className="absolute top-8 right-8 p-3 bg-slate-800 rounded-full hover:bg-rose-500 hover:text-white transition-colors shrink-0 text-slate-400"><Ic.X size={24}/></button>
                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-3 shrink-0"><div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0"><Ic.Copy className="text-indigo-400" size={24}/></div> 구성 복사하기</h3>
                <p className="text-sm font-bold text-slate-400 mb-8 border-b border-slate-700 pb-6 shrink-0">과거 내역이나 다른 보건소의 세팅을 클릭 한 번으로 가져옵니다.</p>
                <div className="flex-1 overflow-y-auto space-y-4 bg-[#0f172a] p-5 rounded-[1.5rem] border border-slate-700 shadow-inner scrollbar-hide">
                    {(st.packageOrders||[]).filter(p => p.id !== editingPkg?.id && p.items?.length > 0).sort((a,b)=>(b.month||'').localeCompare(a.month||'')).map(pkg => (
                        <div key={`copy-${pkg.id}`} onClick={() => handleCopyPackage(pkg)} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-600 hover:border-indigo-400 hover:bg-[#283548] hover:shadow-md cursor-pointer transition-all group shrink-0">
                            <div className="flex justify-between items-center mb-2 shrink-0">
                                <span className="text-xs font-black bg-[#0f172a] text-slate-300 px-2.5 py-1 rounded-md shrink-0 border border-slate-700">{pkg.month} ({pkg.round}차)</span>
                                <span className="text-xs font-black text-slate-400 bg-[#0f172a] border border-slate-700 px-2 py-1 rounded-md shrink-0">{(st.clients || []).find(c=>c.id===pkg.clientId)?.shortName || '미지정'}</span>
                            </div>
                            <h4 className="font-black text-lg text-slate-200 group-hover:text-indigo-400 transition-colors shrink-0">{pkg.pkgNum}패키지 <span className="text-indigo-400 shrink-0">({pkg.pkgType})</span></h4>
                            <p className="text-xs font-bold text-slate-500 mt-3 pt-3 border-t border-slate-700 flex items-center gap-1.5 shrink-0"><Ic.List size={14}/> 구성 품목: {pkg.items?.length||0}개</p>
                        </div>
                    ))}
                    {(st.packageOrders||[]).filter(p => p.id !== editingPkg?.id && p.items?.length > 0).length === 0 && (
                        <div className="text-center py-20 flex flex-col items-center text-slate-500 font-bold gap-3 shrink-0">
                            <div className="p-4 bg-[#0f172a] rounded-full border border-slate-700"><Ic.Search size={40} className="text-slate-600"/></div>
                            복사할 수 있는 기존 패키지 데이터가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 🌟 관리자 전용 데이터 백업/복원 숨김 버튼 (좌측 하단) */}
      {isLog && !isAnyModalOpen && (
        <div className="fixed bottom-5 left-5 z-[9999] group shrink-0 print:hidden">
           <div className="absolute bottom-full left-0 pb-2 hidden group-hover:block shrink-0">
             <div className="flex flex-col gap-1.5 bg-[#1e293b] p-3 rounded-2xl shadow-2xl w-52 border border-slate-700 shrink-0">
               <div className="text-[10px] text-slate-500 font-black mb-1 px-1 shrink-0">시스템 데이터 관리 (Admin)</div>
               <button onClick={exp} className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-slate-300 hover:bg-slate-700 rounded-xl transition-colors shrink-0">1. 전체자료 백업</button>
               <button onClick={()=>document.getElementById('admin-full-import').click()} className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-amber-400 hover:bg-slate-700 rounded-xl transition-colors shrink-0">2. 전체자료 복원</button>
               <button onClick={()=>document.getElementById('admin-smart-import').click()} className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-emerald-400 hover:bg-slate-700 rounded-xl transition-colors shrink-0">3. 발주시스템자료 복원</button>
               <button onClick={clearMockData} className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-rose-400 hover:bg-slate-700 rounded-xl transition-colors shrink-0">4. 데이터 베이스 삭제</button>
               <input type="file" id="admin-full-import" className="hidden shrink-0" accept=".json" onChange={importFullJson} />
               <input type="file" id="admin-smart-import" className="hidden shrink-0" accept=".json" onChange={importJson} />
             </div>
           </div>
           <button className="w-12 h-12 bg-[#1e293b] border border-slate-700 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all shadow-lg shrink-0 relative z-10"><Ic.Settings size={20}/></button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 관리자 대시보드 전용 모달 (Z-index 최고층 고정)                */}
      {/* ============================================================== */}
      {showAdminModal && (
          <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fade-in whitespace-nowrap print:hidden">
              <div className="bg-[#1e293b] rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative animate-scale-up border-t-8 border-indigo-500 flex flex-col">
                  <button onClick={() => setShowAdminModal(false)} className="absolute top-8 right-8 p-3 bg-slate-800 rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors shrink-0 text-slate-400"><Ic.X size={24}/></button>
                  <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-3 shrink-0"><div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0"><Ic.Settings className="text-indigo-400" size={24}/></div> 관리자 설정</h3>
                  <p className="text-sm font-bold text-slate-500 mb-8 border-b border-slate-700 pb-6 shrink-0">데이터베이스 백업 및 복원, 초기화를 관리합니다.</p>
                  
                  <div className="flex flex-col gap-3">
                      <button onClick={exp} className="w-full text-left px-5 py-4 bg-[#0f172a] border border-slate-700 text-sm font-black text-slate-300 hover:bg-indigo-900/30 hover:border-indigo-500 hover:text-indigo-400 rounded-xl transition-all shadow-sm flex items-center gap-3 shrink-0 hover:-translate-y-0.5">
                          <Ic.FileD size={20}/> 1. 전체 데이터 안전 백업
                      </button>
                      <button onClick={()=>document.getElementById('admin-full-import').click()} className="w-full text-left px-5 py-4 bg-[#0f172a] border border-slate-700 text-sm font-black text-slate-300 hover:bg-amber-900/30 hover:border-amber-500 hover:text-amber-400 rounded-xl transition-all shadow-sm flex items-center gap-3 shrink-0 hover:-translate-y-0.5">
                          <Ic.ArrD size={20}/> 2. 전체 데이터 완벽 복원
                      </button>
                      <button onClick={()=>document.getElementById('admin-smart-import').click()} className="w-full text-left px-5 py-4 bg-[#0f172a] border border-slate-700 text-sm font-black text-slate-300 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-400 rounded-xl transition-all shadow-sm flex items-center gap-3 shrink-0 hover:-translate-y-0.5">
                          <Ic.Ref size={20}/> 3. 발주시스템 스마트 병합
                      </button>
                      <button onClick={clearMockData} className="w-full text-left px-5 py-4 bg-rose-900/20 border border-rose-500/30 text-sm font-black text-rose-400 hover:bg-rose-900/40 hover:border-rose-500 rounded-xl transition-all shadow-sm flex items-center gap-3 shrink-0 mt-4 hover:-translate-y-0.5">
                          <Ic.Trash size={20}/> 4. 전체 데이터베이스 초기화
                      </button>
                  </div>

                  <input type="file" id="admin-full-import" className="hidden" accept=".json" onChange={(e)=>{importFullJson(e); setShowAdminModal(false);}} />
                  <input type="file" id="admin-smart-import" className="hidden" accept=".json" onChange={(e)=>{importJson(e); setShowAdminModal(false);}} />
              </div>
          </div>
      )}
      
      {/* 🖨️ 인쇄 스타일 세팅 및 웹폰트 글로벌 세팅 */}
      <style dangerouslySetInnerHTML={{__html: GLOBAL_PRINT_STYLE}} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err) { return { hasError: true, err }; }
  render() { 
    return this.state.hasError ? (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#0f172a] p-10 text-center whitespace-nowrap">
        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center shrink-0 border border-rose-500/50">
          <Ic.Alert size={40} className="text-rose-400 shrink-0"/>
        </div>
        <h2 className="text-2xl font-black text-white shrink-0">시스템 렌더링 오류</h2>
        <p className="text-slate-400 font-bold max-w-md shrink-0">코드 구조 또는 데이터 형식에 문제가 발생했습니다. 브라우저를 새로고침 해보세요.</p>
        <button onClick={()=>window.location.reload()} className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold mt-4 shadow-md shrink-0 whitespace-nowrap transition-colors">새로고침</button>
      </div>
    ) : this.props.children; 
  }
}

export default function App() {
  const [sLd, setSLd] = useState(false);
  useEffect(() => { 
    document.title = "영플 패키지출력";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = '/logo.png';
    if (!document.getElementById('np-global-styles')) {
      const style = document.createElement('style'); style.id = 'np-global-styles';
      style.innerHTML = "@import url('https://cdn.rawgit.com/moonspam/NanumSquare/master/nanumsquare.css'); html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f172a; font-family: 'NanumSquare', sans-serif; } .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .print\\:static { position: static !important; } .print\\:overflow-visible { overflow: visible !important; } .print\\:h-auto { height: auto !important; } .print\\:min-h-0 { min-height: 0 !important; }";
      document.head.appendChild(style);
    }
    if(!document.getElementById('tw')) { 
      const s = document.createElement('script'); s.id='tw'; s.src='https://cdn.tailwindcss.com'; s.onload=()=>setSLd(true); s.onerror=()=>setSLd(true); document.head.appendChild(s); 
    } else setSLd(true); 
  }, []);
  
  return sLd ? <ErrorBoundary><WorkOrderApp /></ErrorBoundary> : (
    <div className="flex h-screen items-center justify-center font-black bg-[#0f172a] text-slate-300 notranslate whitespace-nowrap" translate="no"><Ic.Serv size={40} className="animate-pulse text-indigo-500 shrink-0"/><p className="text-slate-300 ml-3 shrink-0">시스템 로딩 중...</p></div>
  );
}