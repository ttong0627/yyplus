/**
 * TMS-Unified Global Utils
 * 기존 시스템의 핵심 기능(스마트 그리드, 엑셀 파싱, 강력 서식 출력 등)을 
 * 최신 비동기 로직과 함께 무결점 이관한 모듈.
 */

export const Utils = {
  cleanData: (d) => JSON.parse(JSON.stringify(d)),
  
  trunc: (t, l = 10) => t ? (String(t).length > l ? String(t).substring(0, l) + '...' : String(t)) : '',
  
  fmt: (n) => (n === undefined || n === null || n === '') ? '' : (isNaN(Number(n)) ? n : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 })),
  
  // 스마트 그리드: 엔터 키 입력 시 다음 input 으로 자동 이동
  enter: (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const form = e.target.closest('table') || e.target.closest('form');
    if (!form) return;
    const inputs = Array.from(form.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled])'));
    const idx = inputs.indexOf(e.target);
    if (idx > -1 && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
      // 포커스된 인풋이 전체 텍스트 선택되도록 UX 개선
      setTimeout(() => inputs[idx + 1].select && inputs[idx + 1].select(), 10);
    }
  },

  // HTML 클립보드 파싱 (엑셀 데이터)
  parseHTML: (html) => {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (!table) return null;
      return Array.from(table.querySelectorAll('tr')).map(tr => 
        Array.from(tr.querySelectorAll('td, th')).map(c => ({ 
          text: (c.textContent || '').replace(/\s+/g, ' ').trim(), 
          isPrimary: true 
        }))
      );
    } catch (e) {
      return null;
    }
  },

  // 엑셀 클립보드 파싱 (멀티플 셀 복사 지원) - 비동기로 처리 가능하도록 최적화 구조 유지
  parseClip: (e) => {
    const html = e.clipboardData?.getData('text/html');
    const txt = e.clipboardData?.getData('Text');
    if (!txt && !html) return [];
    
    if (html && html.includes('<table')) {
      const parsed = Utils.parseHTML(html);
      if (parsed && parsed.length) return parsed;
    }
    
    if (txt) {
      return txt.replace(/\r?\n$/, '').split(/\r?\n/).map(row => 
        row.split('\t').map(text => ({ text: text.trim(), isPrimary: true }))
      );
    }
    return [];
  },

  // 엑셀 커스텀 서식 다운로드 엔진 (컬러, 포맷 유지)
  dlExcelCustom: (htmlBody, fileName) => {
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; font-family: 'Malgun Gothic', sans-serif; font-size: 10pt; width: 100%; white-space: nowrap; }
            th, td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
            th { background-color: #d9e1f2; font-weight: bold; text-align: center; border-bottom: 2px solid #000; }
            .num { mso-number-format: "General"; text-align: right; }
            .txt { mso-number-format: "\\@"; text-align: center; }
            .l { text-align: left; }
            .r { color: #dc2626; }
            .p { color: #7c3aed; font-weight: bold; }
            .bg-g { background: #f3f4f6; }
            .bg-b { background: #eff6ff; }
            .bg-gr { background: #f0fdf4; }
            .bg-r { background: #fef2f2; }
            .bg-y { background: #fefce8; }
            .hdr { font-size: 18pt; background: #4f46e5; color: white; padding: 12px; font-weight: 900; }
          </style>
        </head>
        <body>${htmlBody}</body>
      </html>
    `;
    const blob = new Blob(['\uFEFF' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${Date.now()}.xls`;
    link.click();
  },

  // 강력 서식 기반의 인쇄물 팝업 엔진
  printContent: (title, htmlContent) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
            body { 
              font-family: 'Pretendard', sans-serif; 
              padding: 20px; 
              font-size: 12px; /* 기본 폰트 크기 증대 */
              color: #111;
            }
            h2 { 
              text-align: center; 
              color: #111; 
              margin-bottom: 24px; 
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 11px; /* 가독성 강화 */
            }
            th, td { 
              border: 1px solid #333; 
              padding: 8px 6px; 
              text-align: center; 
            }
            th { 
              background: #f8fafc; 
              font-weight: 800; 
              color: #0f172a;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .highlight { font-weight: bold; color: #000; }
            @media print { 
              @page { size: A4 landscape; margin: 15mm; } 
              body { padding: 0; }
              /* 배경색 인쇄 강제 */
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          ${htmlContent}
          <script>
            setTimeout(() => {
              window.print();
              // window.close(); // 프린트창 닫히면 탭도 닫기 옵션 (형님 피드백에 따라 해제 가능)
            }, 800);
          </script>
        </body>
      </html>
    `);
    w.document.close();
  }
};
