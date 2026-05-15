export const Utils = {
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
