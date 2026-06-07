// พิมพ์เอกสารกว้าง 80mm ผ่านไดรเวอร์เครื่องพิมพ์ (ใช้ได้กับเครื่องพิมพ์ความร้อน 80mm)
// แสดงพรีวิวจริงบนหน้าจอด้วย CSS ชุดเดียวกัน

export const SLIP_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'TH Sarabun New','Tahoma','Segoe UI',sans-serif; color:#000; font-size:13px; line-height:1.45; margin:0; padding:4mm 3mm; }
  .c { text-align:center; } .r { text-align:right; } .b { font-weight:bold; }
  .xl { font-size:20px; font-weight:bold; } .lg { font-size:15px; font-weight:bold; } .sm { font-size:11px; color:#333; }
  .row { display:flex; justify-content:space-between; gap:8px; }
  .hr { border-top:1px dashed #000; margin:5px 0; }
  .it { margin:2px 0; }
  .opt { font-size:11px; color:#333; padding-left:12px; }
  .tot { font-size:18px; font-weight:bold; }
`;

// คืน CSS ที่ผูก scope ไว้ (กันชนกับสไตล์อื่นบนหน้า) สำหรับพรีวิวบนจอ
export function scopedSlipCss(scope = '.slip-body') {
  return SLIP_CSS.replace(/(^|\})\s*([^{}]+)\{/g, (m, brace, sel) => {
    const scoped = sel.split(',').map(s => {
      s = s.trim();
      if (!s) return s;
      if (s === 'body') return scope;
      return `${scope} ${s}`;
    }).join(', ');
    return `${brace} ${scoped} {`;
  });
}

export function print80mm(bodyHtml, css = SLIP_CSS) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}html,body{margin:0}body{width:80mm}${css}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  setTimeout(() => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 2000);
  }, 350);
}
