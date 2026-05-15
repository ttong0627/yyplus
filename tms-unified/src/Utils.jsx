// src/Utils.jsx - 웰쉐어 글로벌 유틸리티 및 중앙 집중 서식 관리기
import React from 'react';

// 🌟 인쇄용 초거대 폰트 및 서식 전역 CSS
// 이곳의 설정만 바꾸면 시스템 전체의 출력물 폰트와 간격이 한 번에 변경됩니다.
export const GLOBAL_PRINT_STYLE = `
@media print { 
    #main-app { display: none !important; }
    .print\\:hidden { display: none !important; } 
    .print\\:block { display: block !important; } 
    .print\\:static { position: static !important; } 
    
    .print\\:overflow-visible { overflow: visible !important; } 
    .print\\:h-auto { height: auto !important; } 
    .print\\:min-h-0 { min-height: 0 !important; } 
    
    body, html, #root, .fixed, .inset-0 { 
        background-color: white !important; 
        background: none !important;
        margin: 0; padding: 0; 
        overflow: visible !important; 
        height: auto !important; 
        -webkit-print-color-adjust: exact; 
        color-adjust: exact; 
        color: black !important;
        font-family: 'Pretendard', sans-serif !important; 
    }
    @page { margin: 15mm; size: auto; } 
    
    table { page-break-inside: auto; width: 100% !important; } 
    .print\\:table-auto { table-layout: auto !important; }
    thead { display: table-header-group; } 
    tfoot { display: table-footer-group; } 
    tr { page-break-inside: avoid; page-break-after: auto; } 
    th, td { white-space: normal !important; word-break: keep-all !important; overflow-wrap: break-word !important; }
    
    .print\\:text-\\[24px\\] { font-size: 24px !important; line-height: 1.2 !important; }
    .print\\:text-\\[48px\\] { font-size: 48px !important; line-height: 1.2 !important; } 
    .print\\:text-\\[80px\\] { font-size: 80px !important; line-height: 1.2 !important; } 
    .print\\:text-\\[100px\\] { font-size: 100px !important; line-height: 1.15 !important; } 
    .print\\:text-\\[150px\\] { font-size: 150px !important; line-height: 1.1 !important; } 
    .print\\:text-\\[126px\\] { font-size: 126px !important; line-height: 1.05 !important; } 
    
    .print\\:py-4 { padding-top: 20px !important; padding-bottom: 20px !important; }
    .print\\:py-12 { padding-top: 40px !important; padding-bottom: 40px !important; } 
    .print\\:w-auto { width: auto !important; }
    .print\\:min-w-0 { min-width: 0 !important; }
}
`;

export const Utils = {
  cleanData: d => JSON.parse(JSON.stringify(d)),
  trunc: (t, l=10) => t ? (String(t).length > l ? String(t).substring(0,l)+'...' : String(t)) : '',
  fmt: n => (n===undefined||n===null||n==='') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', {maximumFractionDigits:2})),
  
  parseHTML: html => {
    try { const doc = new DOMParser().parseFromString(html, 'text/html'); const table = doc.querySelector('table'); if (!table) return null; return Array.from(table.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('td, th')).map(c => ({ text: (c.textContent || '').replace(/\s+/g, ' ').trim(), isPrimary: true }))); } catch (e) { return null; }
  },
  
  parseClip: e => {
    const html = e.clipboardData?.getData('text/html'), txt = e.clipboardData?.getData('Text'); if (!txt && !html) return [];
    if (html && html.includes('<table')) { const p = Utils.parseHTML(html); if (p && p.length) return p; }
    if (txt) return txt.replace(/\r?\n$/, '').split(/\r?\n/).map(r => r.split('\t').map(t => ({ text: t.trim(), isPrimary: true }))); return [];
  },
  
  // 글로벌 엑셀 다운로드 포맷터
  dlExcelCustom: (htmlBody, fn) => {
    const tpl = \`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; font-family: 'Pretendard', sans-serif; font-size: 9pt; width: 100%; white-space: nowrap; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: middle; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; color: #334155; }
            .num { mso-number-format: "General"; text-align: right; }
            .txt { mso-number-format: "\\@"; text-align: center; }
            .l { text-align: left; }
            .r { color: #e11d48; }
            .p { color: #7c3aed; font-weight: bold; }
            .bg-g { background: #f8fafc; }
            .bg-b { background: #eff6ff; }
            .bg-gr { background: #ecfdf5; }
            .bg-r { background: #fff1f2; }
            .bg-p { background: #f5f3ff; }
            .bg-y { background: #fefce8; }
            .hdr { font-size: 16pt; background: #4c1d95; color: white; padding: 12px; font-weight: 900; }
            .sub { font-size: 8pt; color: #64748b; }
          </style>
        </head>
        <body>\${htmlBody}</body>
      </html>
    \`;
    const b = new Blob(['\uFEFF' + tpl], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = \`\${fn}_\${Date.now()}.xls\`; l.click();
  },
  
  // 글로벌 인쇄 창 포맷터
  printContent: (title, htmlContent) => {
    const w = window.open('','_blank'); 
    w.document.write(\`
      <html>
        <head>
          <title>\${title}</title>
          <style>
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); 
            \${GLOBAL_PRINT_STYLE}
            body { font-family: 'Pretendard', sans-serif; padding: 20px; font-size: 11px; } 
            h2 { text-align: center; color: #1e293b; margin-bottom: 20px; font-size: 24px; font-weight: 900; } 
            table { width: 100%; border-collapse: collapse; font-size: 12px; } 
            th, td { border: 1px solid #475569; padding: 8px; text-align: center; } 
            th { background: #f1f5f9; font-weight: 900; color: #0f172a; } 
            @media print { @page { size: A4 landscape; margin: 10mm; } }
          </style>
        </head>
        <body>
          <h2>\${title}</h2>
          \${htmlContent}
          <script>setTimeout(()=>window.print(), 500);</script>
        </body>
      </html>
    \`); 
    w.document.close();
  }
};
