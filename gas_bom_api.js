// ================================================================
// ⛔ เลิกใช้แล้ว (DEPRECATED) — อย่า Deploy ไฟล์นี้
// โค้ด BOM ทั้งหมดถูกรวมเข้า gas_complete_script.js แล้ว
// (ถ้าวางเพิ่มจะเกิด error ฟังก์ชันชื่อซ้ำ เช่น setupBOM/deductStock/_bomJson)
// ================================================================
// SANAE BOM API — วางไฟล์นี้เป็น Tab ใหม่ใน GAS project
// ================================================================
// วิธีใช้:
// 1. เปิด GAS project ที่มี URL = AKfycbxwR7...
// 2. กด "+" เพิ่มไฟล์ใหม่ → ตั้งชื่อ "BOM"
// 3. วางโค้ดทั้งหมดในไฟล์นี้ลงไป
// 4. เปิดไฟล์ doGet/doPost เดิม แล้วเพิ่มแค่ 5 บรรทัดนี้:
//
//    ใน doGet เพิ่ม (ก่อน return error):
//      if (action === 'getStock')       return _bomJson(getStockLevels());
//      if (action === 'getIngredients') return _bomJson(getIngredientsList());
//
//    ใน doPost เพิ่ม (ก่อน return error):
//      if (data.action === 'deductStock') return _bomJson(deductStock(data));
//      if (data.action === 'stockIn')     return _bomJson(recordStockIn(data));
//      if (data.action === 'saveBOM')     return _bomJson(saveBOM(data));
//
// 5. รัน setupBOM() 1 ครั้ง (สร้าง 5 ชีท)
// 6. Deploy → Manage Deployments → New version → Deploy
// ================================================================

// ──────────────────────────────────────────────────────────────
// HELPER — ส่ง JSON response
// ──────────────────────────────────────────────────────────────
function _bomJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────────────────
// SETUP — รัน 1 ครั้งเพื่อสร้าง 5 ชีท
// ──────────────────────────────────────────────────────────────
function setupBOM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupIngredients(ss);
  _setupBOM(ss);
  _setupStockIn(ss);
  _setupStockOut(ss);
  _setupStockSummary(ss);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('✅ ตั้งค่าระบบ BOM เสร็จแล้ว! ทั้ง 5 ชีทพร้อมใช้งาน');
}

// ──────────────────────────────────────────────────────────────
// API 1 — GET: ?action=getStock
// ──────────────────────────────────────────────────────────────
function getStockLevels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ingSheet = ss.getSheetByName('วัตถุดิบ');
  const inSheet  = ss.getSheetByName('รับวัตถุดิบ');
  const outSheet = ss.getSheetByName('ตัดสต็อก');

  if (!ingSheet || !inSheet || !outSheet) {
    return { success: false, error: 'ไม่พบชีท — กรุณารัน setupBOM() ก่อน' };
  }

  const ingData = ingSheet.getDataRange().getValues().slice(1);
  const inData  = inSheet.getDataRange().getValues().slice(1);
  const outData = outSheet.getDataRange().getValues().slice(1);

  const stock = ingData
    .filter(row => row[0])
    .map(row => {
      const id = String(row[0]);
      const totalIn  = inData
        .filter(r => String(r[1]) === id)
        .reduce((s, r) => s + (Number(r[3]) || 0), 0);
      const totalOut = outData
        .filter(r => String(r[6]) === id)
        .reduce((s, r) => s + (Number(r[8]) || 0), 0);
      const current = totalIn - totalOut;
      const minQty  = Number(row[4]) || 0;
      return {
        id,
        name:    row[1] || '',
        nameEn:  row[2] || '',
        unit:    row[3] || '',
        current: Math.round(current * 100) / 100,
        minimum: minQty,
        price:   Number(row[5]) || 0,
        status:  current <= 0 ? 'OUT' : current <= minQty ? 'LOW' : 'OK'
      };
    });

  return {
    success: true,
    stock,
    lowItems: stock.filter(s => s.status !== 'OK')
  };
}

// ──────────────────────────────────────────────────────────────
// API 2 — GET: ?action=getIngredients
// ──────────────────────────────────────────────────────────────
function getIngredientsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) return { success: false, error: 'ไม่พบชีท วัตถุดิบ — กรุณารัน setupBOM() ก่อน' };

  const ingredients = sh.getDataRange().getValues()
    .slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:          String(r[0]),
      name:        r[1] || '',
      nameEn:      r[2] || '',
      unit:        r[3] || '',
      minStock:    Number(r[4]) || 0,
      costPerUnit: Number(r[5]) || 0,
      category:    r[6] || '',
      note:        r[7] || ''
    }));

  return { success: true, ingredients };
}

// ──────────────────────────────────────────────────────────────
// API 3 — POST: action=deductStock
// Body: { action, orderNumber, tableNo, items:[{menuId,menuName,qty}] }
// ──────────────────────────────────────────────────────────────
function deductStock(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bomSheet = ss.getSheetByName('BOM');
  const outSheet = ss.getSheetByName('ตัดสต็อก');
  const ingSheet = ss.getSheetByName('วัตถุดิบ');

  if (!bomSheet || !outSheet || !ingSheet) {
    return { success: false, error: 'ไม่พบชีท BOM หรือ ตัดสต็อก — กรุณารัน setupBOM() ก่อน' };
  }

  const bomData = bomSheet.getDataRange().getValues().slice(1);
  const ingData = ingSheet.getDataRange().getValues().slice(1);
  const now     = new Date();
  const rows    = [];

  for (const ordered of (data.items || [])) {
    const bomLines = bomData.filter(row => String(row[0]) === String(ordered.menuId));
    for (const line of bomLines) {
      const ingId    = String(line[3]);
      const ingName  = line[4];
      const amtPer   = Number(line[5]) || 0;
      const unit     = line[6];
      const totalAmt = amtPer * (Number(ordered.qty) || 1);
      const ingRow   = ingData.find(r => String(r[0]) === ingId);
      const cost     = ingRow ? (Number(ingRow[5]) || 0) * totalAmt : 0;
      rows.push([
        now,
        data.orderNumber || ordered.orderNumber || '',
        data.tableNo     || ordered.tableNo     || '',
        ordered.menuId,
        ordered.menuName || '',
        Number(ordered.qty) || 1,
        ingId, ingName,
        totalAmt, unit,
        cost
      ]);
    }
  }

  if (rows.length > 0) {
    const lastRow = outSheet.getLastRow() + 1;
    outSheet.getRange(lastRow, 1, rows.length, 11).setValues(rows);
    outSheet.getRange(lastRow, 1,  rows.length, 1).setNumberFormat('dd/mm/yyyy HH:mm');
    outSheet.getRange(lastRow, 11, rows.length, 1).setNumberFormat('฿#,##0.00');
  }

  return { success: true, deducted: rows.length, orderNumber: data.orderNumber };
}

// ──────────────────────────────────────────────────────────────
// API 4 — POST: action=stockIn
// Body: { action, items:[{ingId,qty,pricePerUnit,note,staff}] }
// ──────────────────────────────────────────────────────────────
function recordStockIn(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inSheet  = ss.getSheetByName('รับวัตถุดิบ');
  const ingSheet = ss.getSheetByName('วัตถุดิบ');

  if (!inSheet || !ingSheet) {
    return { success: false, error: 'ไม่พบชีท — กรุณารัน setupBOM() ก่อน' };
  }

  const ingData = ingSheet.getDataRange().getValues().slice(1);
  const now     = new Date();
  const rows    = [];

  for (const item of (data.items || [])) {
    const ingRow = ingData.find(r => String(r[0]) === String(item.ingId));
    if (!ingRow) continue;
    const price = Number(item.pricePerUnit) || Number(ingRow[5]) || 0;
    const qty   = Number(item.qty) || 0;
    rows.push([
      now,
      item.ingId,
      ingRow[1],
      qty,
      ingRow[3],
      price,
      qty * price,
      item.staff || 'admin',
      item.note  || ''
    ]);
  }

  if (rows.length > 0) {
    const lastRow = inSheet.getLastRow() + 1;
    inSheet.getRange(lastRow, 1, rows.length, 9).setValues(rows);
    inSheet.getRange(lastRow, 1, rows.length, 1).setNumberFormat('dd/mm/yyyy HH:mm');
    inSheet.getRange(lastRow, 4, rows.length, 1).setNumberFormat('#,##0');
    inSheet.getRange(lastRow, 6, rows.length, 2).setNumberFormat('฿#,##0.00');
  }

  return { success: true, recorded: rows.length };
}

// ──────────────────────────────────────────────────────────────
// API 5 — POST: action=saveBOM  (sync จาก ManageBOM page)
// Body: { action, rows:[{menuId,menuName,menuNameEn,ingId,ingName,qty,unit,costPerUnit}] }
// ──────────────────────────────────────────────────────────────
function saveBOM(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('BOM');
  if (!sh) return { success: false, error: 'ไม่พบชีท BOM — กรุณารัน setupBOM() ก่อน' };

  // ล้างข้อมูลเก่า (ยกเว้น header)
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }

  const rows = (data.rows || []);
  if (rows.length === 0) return { success: true, saved: 0 };

  const values = rows.map(r => [
    r.menuId      || '',
    r.menuName    || '',
    r.menuNameEn  || '',
    r.ingId       || '',
    r.ingName     || '',
    Number(r.qty)          || 0,
    r.unit        || '',
    Number(r.costPerUnit)  || 0,
    r.note        || ''
  ]);

  sh.getRange(2, 1, values.length, 9).setValues(values);
  sh.getRange(2, 6, values.length, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, 8, values.length, 1).setNumberFormat('฿#,##0.00');

  return { success: true, saved: values.length };
}

// ──────────────────────────────────────────────────────────────
// SHEET SETUP HELPERS (รัน 1 ครั้งโดย setupBOM)
// ──────────────────────────────────────────────────────────────
function _setupIngredients(ss) {
  let sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) sh = ss.insertSheet('วัตถุดิบ');
  sh.clearContents(); sh.clearFormats();

  const headers = ['รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ชื่อ (EN)','หน่วย','สต็อกขั้นต่ำ','ราคา/หน่วย (฿)','หมวดหมู่','หมายเหตุ'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _bomStyleHeader(sh.getRange(1, 1, 1, headers.length), '#1a3a5c');

  const data = [
    ['ING-001','หมูสามชั้น','Pork Belly','กรัม',500,0.08,'เนื้อสัตว์',''],
    ['ING-002','ไก่','Chicken','กรัม',500,0.06,'เนื้อสัตว์',''],
    ['ING-003','กุ้งสด','Shrimp','กรัม',300,0.20,'อาหารทะเล',''],
    ['ING-004','ปลาหมึก','Squid','กรัม',300,0.15,'อาหารทะเล',''],
    ['ING-005','ข้าวสวย','Steamed Rice','กรัม',2000,0.01,'แป้ง/ข้าว',''],
    ['ING-006','น้ำมันพืช','Vegetable Oil','มล',500,0.03,'เครื่องปรุง',''],
    ['ING-007','น้ำปลา','Fish Sauce','มล',200,0.05,'เครื่องปรุง',''],
    ['ING-008','ซีอิ๊วขาว','Soy Sauce','มล',200,0.04,'เครื่องปรุง',''],
    ['ING-009','กระเทียม','Garlic','กรัม',100,0.10,'ผัก',''],
    ['ING-010','หอมแดง','Shallot','กรัม',100,0.08,'ผัก',''],
    ['ING-011','พริกขี้หนู','Bird Chili','กรัม',50,0.30,'ผัก',''],
    ['ING-012','มะนาว','Lime','ลูก',20,2.00,'ผัก',''],
    ['ING-013','ผักชี','Cilantro','กรัม',50,0.15,'ผัก',''],
    ['ING-014','ไข่ไก่','Egg','ฟอง',20,4.00,'โปรตีน',''],
    ['ING-015','เส้นก๋วยเตี๋ยว','Noodles','กรัม',500,0.05,'แป้ง/ข้าว',''],
  ];
  sh.getRange(2, 1, data.length, headers.length).setValues(data);
  sh.getRange(2, 5, data.length, 1).setNumberFormat('#,##0');
  sh.getRange(2, 6, data.length, 1).setNumberFormat('฿#,##0.00');
  sh.setFrozenRows(1);
}

function _setupBOM(ss) {
  let sh = ss.getSheetByName('BOM');
  if (!sh) sh = ss.insertSheet('BOM');
  sh.clearContents(); sh.clearFormats();

  const headers = ['รหัสเมนู','ชื่อเมนู (TH)','ชื่อเมนู (EN)','รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ปริมาณ/จาน','หน่วย','ราคา/หน่วย (฿)','หมายเหตุ'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _bomStyleHeader(sh.getRange(1, 1, 1, headers.length), '#2d4a22');
  sh.setFrozenRows(1);
}

function _setupStockIn(ss) {
  let sh = ss.getSheetByName('รับวัตถุดิบ');
  if (!sh) sh = ss.insertSheet('รับวัตถุดิบ');
  sh.clearContents(); sh.clearFormats();

  const headers = ['วันที่','รหัส','ชื่อวัตถุดิบ','จำนวน','หน่วย','ราคา/หน่วย (฿)','รวมราคา (฿)','ผู้บันทึก','หมายเหตุ'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _bomStyleHeader(sh.getRange(1, 1, 1, headers.length), '#7b3f00');

  // ข้อมูลตัวอย่าง
  const today = new Date();
  const sample = [
    [today,'ING-001','หมูสามชั้น',2000,'กรัม',0.08,160,'admin','เปิดร้านวันแรก'],
    [today,'ING-003','กุ้งสด',1000,'กรัม',0.20,200,'admin',''],
    [today,'ING-005','ข้าวสวย',5000,'กรัม',0.01,50,'admin',''],
    [today,'ING-006','น้ำมันพืช',2000,'มล',0.03,60,'admin',''],
    [today,'ING-009','กระเทียม',500,'กรัม',0.10,50,'admin',''],
    [today,'ING-014','ไข่ไก่',30,'ฟอง',4.00,120,'admin',''],
  ];
  sh.getRange(2, 1, sample.length, headers.length).setValues(sample);
  sh.getRange(2, 1, sample.length, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(2, 4, sample.length, 1).setNumberFormat('#,##0');
  sh.getRange(2, 6, sample.length, 2).setNumberFormat('฿#,##0.00');
  sh.setFrozenRows(1);
}

function _setupStockOut(ss) {
  let sh = ss.getSheetByName('ตัดสต็อก');
  if (!sh) sh = ss.insertSheet('ตัดสต็อก');
  sh.clearContents(); sh.clearFormats();

  const headers = ['วันที่-เวลา','เลขออเดอร์','โต๊ะ','รหัสเมนู','ชื่อเมนู','จำนวนจาน','รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ปริมาณตัด','หน่วย','ต้นทุน (฿)'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _bomStyleHeader(sh.getRange(1, 1, 1, headers.length), '#4a0000');
  sh.setFrozenRows(1);
}

function _setupStockSummary(ss) {
  let sh = ss.getSheetByName('สรุปสต็อก');
  if (!sh) sh = ss.insertSheet('สรุปสต็อก');
  sh.clearContents(); sh.clearFormats();

  sh.getRange(1, 1, 1, 8).merge();
  sh.getRange(1, 1).setValue('📊 รายงานสต็อกวัตถุดิบ (คำนวณจาก รับเข้า − ตัดสต็อก)');
  sh.getRange(1, 1).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center')
    .setBackground('#1a1a2e').setFontColor('#ffffff');

  const headers = ['รหัส','ชื่อวัตถุดิบ','หน่วย','รับเข้าทั้งหมด','ใช้ไปทั้งหมด','คงเหลือ','ขั้นต่ำ','สถานะ'];
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  _bomStyleHeader(sh.getRange(2, 1, 1, headers.length), '#16213e');
  sh.setFrozenRows(2);

  for (let r = 3; r <= 17; r++) {
    const i = r - 1;
    sh.getRange(r, 1).setFormula(`=IFERROR(วัตถุดิบ!A${i},"")`);
    sh.getRange(r, 2).setFormula(`=IFERROR(วัตถุดิบ!B${i},"")`);
    sh.getRange(r, 3).setFormula(`=IFERROR(วัตถุดิบ!D${i},"")`);
    sh.getRange(r, 4).setFormula(`=IFERROR(SUMIF(รับวัตถุดิบ!B:B,A${r},รับวัตถุดิบ!D:D),0)`);
    sh.getRange(r, 5).setFormula(`=IFERROR(SUMIF(ตัดสต็อก!G:G,A${r},ตัดสต็อก!I:I),0)`);
    sh.getRange(r, 6).setFormula(`=D${r}-E${r}`);
    sh.getRange(r, 7).setFormula(`=IFERROR(วัตถุดิบ!E${i},0)`);
    sh.getRange(r, 8).setFormula(
      `=IF(A${r}="","",IF(F${r}<=0,"🔴 หมดแล้ว!",IF(F${r}<=G${r},"🟡 ใกล้หมด","🟢 ปกติ")))`
    );
  }
}

function _bomStyleHeader(range, bgColor) {
  range.setBackground(bgColor).setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true,true,true,true,true,true,'#ffffff', SpreadsheetApp.BorderStyle.SOLID);
}
