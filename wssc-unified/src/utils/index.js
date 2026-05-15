import { storage } from '../firebaseConfig.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const Utils = {
  cleanData: (d) => JSON.parse(JSON.stringify(d)),

  fmt: (n) => {
    if (n === undefined || n === null || n === '') return '';
    if (isNaN(Number(n))) return n;
    return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  },

  fmtMoney: (n) => {
    if (!n) return '0원';
    return Number(n).toLocaleString('ko-KR') + '원';
  },

  trunc: (t, l = 10) =>
    t ? (String(t).length > l ? String(t).substring(0, l) + '...' : String(t)) : '',

  genId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,

  today: () => new Date().toISOString().slice(0, 10),

  currentMonth: () => new Date().toISOString().slice(0, 7),

  /* SHA-256 해시 (Web Crypto API — HTTPS 환경에서만 동작) */
  hashPw: async (password) => {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // 로컬 http 개발 환경 fallback (crypto.subtle 미지원 시)
      return password;
    }
  },

  sortItems: (arr = [], order = []) =>
    [...arr].sort((a, b) => {
      const cA = a.category || '미분류', cB = b.category || '미분류';
      const iA = order.indexOf(cA), iB = order.indexOf(cB);
      if (iA !== -1 && iB !== -1 && iA !== iB) return iA - iB;
      if (iA !== -1) return -1;
      if (iB !== -1) return 1;
      if (cA !== cB) return cA.localeCompare(cB, 'ko');
      return (a.name || '').localeCompare(b.name || '', 'ko');
    }),

  formatWorkUnit: (orderUnit, unitStr) => {
    const num = Number(orderUnit);
    if (isNaN(num) || num <= 0) return '';
    const u = String(unitStr || '').trim().toLowerCase();
    if (['kg', 'g', 'ml', 'l', '개'].includes(u)) {
      if (num < 1) {
        if (u === 'kg') return `${num * 1000}g`;
        if (u === 'l') return `${num * 1000}ml`;
      }
      return `${num}${String(unitStr || '').trim()}`;
    }
    return `${String(unitStr || '').trim()}*${num}`;
  },

  getDisplayOrderUnit: (val, unit) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) return null;
    const u = String(unit || '').trim();
    const uL = u.toLowerCase();
    if (!['개', 'kg', 'g', 'ml', 'l'].includes(uL) && /^\d/.test(uL)) return `${u} X ${num}`;
    if (num < 1) {
      if (uL === 'kg') return `${num * 1000}g`;
      if (uL === 'l') return `${num * 1000}ml`;
    }
    return `${num}${u}`;
  },

  parseClip: (e) => {
    const txt = e.clipboardData?.getData('Text');
    if (!txt) return [];
    return txt.replace(/\r?\n$/, '').split(/\r?\n/).map(r =>
      r.split('\t').map(t => t.trim())
    );
  },

  calculateWorkDate: (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    let date = new Date(y, m - 1, d - 1);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  },

  getWeek: (dateStr, mappings = {}) => {
    if (!dateStr) return 0;
    const ym = dateStr.substring(0, 7);
    const monthMap = mappings?.[ym];
    if (monthMap) {
      for (let w = 1; w <= 4; w++) {
        const r = monthMap[`w${w}`];
        if (r?.s && r?.e && dateStr >= r.s && dateStr <= r.e) return w;
      }
    }
    const day = parseInt(dateStr.split('-')[2], 10);
    return Math.min(Math.ceil(day / 7), 4);
  },

  getLossGroup: (item, rates = {}) => {
    const n = item.name || '', c = item.category || '';
    for (const k of Object.keys(rates)) {
      if (c.includes(k) || n.includes(k)) return k;
    }
    if ((n.includes('쌀') || n.includes('백미')) && rates['미곡']) return '미곡';
    if (n.includes('콩') && rates['잡곡']) return '잡곡';
    return null;
  },

  compressImage: (file, maxWidth = 800, quality = 0.6) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }),

  uploadImageToStorage: async (base64DataUrl, folder = 'delivery_photos') => {
    try {
      if (!storage) return base64DataUrl;
      const fileName = `${folder}/img_${Date.now()}_${Math.random().toString(36).substr(2, 7)}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadString(storageRef, base64DataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    } catch (e) {
      console.error('Storage 업로드 오류:', e);
      return base64DataUrl;
    }
  },

  dlExcelCustom: (htmlBody, fileName) => {
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
table{border-collapse:collapse;font-family:'Malgun Gothic',sans-serif;font-size:10pt;width:100%;white-space:nowrap;}
th,td{border:1px solid #000;padding:6px;vertical-align:middle;}
th{background-color:#d9e1f2;font-weight:bold;text-align:center;border-bottom:2px solid #000;}
.num{mso-number-format:"General";text-align:right;}.txt{mso-number-format:"\\@";text-align:center;}
.l{text-align:left;}.r{color:#dc2626;}.p{color:#7c3aed;font-weight:bold;}
.hdr{font-size:18pt;background:#4f46e5;color:white;padding:12px;font-weight:900;}
</style></head><body>${htmlBody}</body></html>`;
    const blob = new Blob(['﻿' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${Date.now()}.xls`;
    link.click();
  },

  dlExcel: (html, fn) => {
    const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"/><style>
body{font-family:NanumSquare,sans-serif;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;}
th{background:#e8eaf6;font-weight:bold;text-align:center;}
.num{text-align:right;}
</style></head><body>${html}</body></html>`;
    const blob = new Blob(['﻿' + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fn}_${Date.now()}.xls`;
    a.click();
  },

  printContent: (title, htmlContent) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${title}</title>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Square:wght@400;700;800;900&display=swap" rel="stylesheet"/>
<style>*{font-family:'Nanum Square',sans-serif;box-sizing:border-box;}body{margin:20px;color:#000;}
table{border-collapse:collapse;width:100%;margin-bottom:20px;}
th,td{border:1px solid #333;padding:6px 10px;font-size:12px;}
th{background:#e8eaf6;font-weight:900;text-align:center;}
h2{font-size:18px;font-weight:900;margin-bottom:10px;}
@media print{.no-print{display:none;}}
</style></head><body>
<h2>${title}</h2>${htmlContent}
<script>setTimeout(()=>window.print(),500);<\/script>
</body></html>`);
    w.document.close();
  },
};

export default Utils;
