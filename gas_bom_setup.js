// ================================================================
// SANAE BOM SYSTEM — Google Apps Script
// รันฟังก์ชัน setupBOM() ครั้งเดียวเพื่อสร้างชีททั้งหมด
// ================================================================

// ──────────────────────────────────────────────
// SETUP: รันครั้งเดียวเพื่อสร้างชีท + format
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// ชีท 1: วัตถุดิบ (Ingredients Master)
// ──────────────────────────────────────────────
function _setupIngredients(ss) {
  let sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) sh = ss.insertSheet('วัตถุดิบ');
  sh.clearContents();
  sh.clearFormats();

  // Header row
  const headers = [
    'รหัสวัตถุดิบ', 'ชื่อวัตถุดิบ', 'ชื่อ (EN)',
    'หน่วย', 'สต็อกขั้นต่ำ', 'ราคา/หน่วย (฿)',
    'หมวดหมู่', 'หมายเหตุ'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#1a3a5c');

  // Column widths
  sh.setColumnWidth(1, 130); // รหัส
  sh.setColumnWidth(2, 180); // ชื่อไทย
  sh.setColumnWidth(3, 160); // ชื่อEN
  sh.setColumnWidth(4, 80);  // หน่วย
  sh.setColumnWidth(5, 110); // ขั้นต่ำ
  sh.setColumnWidth(6, 120); // ราคา
  sh.setColumnWidth(7, 130); // หมวดหมู่
  sh.setColumnWidth(8, 200); // หมายเหตุ

  // ข้อมูลตัวอย่าง
  const sampleData = [
    ['ING-001', 'หมูสามชั้น',    'Pork Belly',      'กรัม', 500,  0.08,  'เนื้อสัตว์',  ''],
    ['ING-002', 'ไก่',           'Chicken',         'กรัม', 500,  0.06,  'เนื้อสัตว์',  ''],
    ['ING-003', 'กุ้งสด',        'Shrimp',          'กรัม', 300,  0.20,  'อาหารทะเล',  ''],
    ['ING-004', 'ปลาหมึก',       'Squid',           'กรัม', 300,  0.15,  'อาหารทะเล',  ''],
    ['ING-005', 'ข้าวสวย',       'Steamed Rice',    'กรัม', 2000, 0.01,  'แป้ง/ข้าว',  ''],
    ['ING-006', 'น้ำมันพืช',     'Vegetable Oil',   'มล',   500,  0.03,  'เครื่องปรุง', ''],
    ['ING-007', 'น้ำปลา',        'Fish Sauce',      'มล',   200,  0.05,  'เครื่องปรุง', ''],
    ['ING-008', 'ซีอิ๊วขาว',     'Soy Sauce',       'มล',   200,  0.04,  'เครื่องปรุง', ''],
    ['ING-009', 'กระเทียม',      'Garlic',          'กรัม', 100,  0.10,  'ผัก',        ''],
    ['ING-010', 'หอมแดง',        'Shallot',         'กรัม', 100,  0.08,  'ผัก',        ''],
    ['ING-011', 'พริกขี้หนู',    'Bird Chili',      'กรัม', 50,   0.30,  'ผัก',        ''],
    ['ING-012', 'มะนาว',         'Lime',            'ลูก',  20,   2.00,  'ผัก',        ''],
    ['ING-013', 'ผักชี',         'Cilantro',        'กรัม', 50,   0.15,  'ผัก',        ''],
    ['ING-014', 'ไข่ไก่',        'Egg',             'ฟอง',  20,   4.00,  'โปรตีน',     ''],
    ['ING-015', 'เส้นก๋วยเตี๋ยว','Noodles',         'กรัม', 500,  0.05,  'แป้ง/ข้าว',  ''],
  ];
  sh.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);

  // Format ราคา/หน่วย
  sh.getRange(2, 6, sampleData.length, 1).setNumberFormat('฿#,##0.00');
  sh.getRange(2, 5, sampleData.length, 1).setNumberFormat('#,##0');

  // สลับสีแถว
  for (let i = 2; i <= sampleData.length + 1; i++) {
    const color = i % 2 === 0 ? '#f0f4f8' : '#ffffff';
    sh.getRange(i, 1, 1, headers.length).setBackground(color);
  }

  // Freeze header
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
}

// ──────────────────────────────────────────────
// ชีท 2: BOM (สูตรวัตถุดิบต่อเมนู)
// ──────────────────────────────────────────────
function _setupBOM(ss) {
  let sh = ss.getSheetByName('BOM');
  if (!sh) sh = ss.insertSheet('BOM');
  sh.clearContents();
  sh.clearFormats();

  const headers = [
    'รหัสเมนู', 'ชื่อเมนู (TH)', 'ชื่อเมนู (EN)',
    'รหัสวัตถุดิบ', 'ชื่อวัตถุดิบ',
    'ปริมาณ/จาน', 'หน่วย',
    'ต้นทุน/จาน (฿)', 'หมายเหตุ'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#2d4a1e');

  sh.setColumnWidth(1, 110);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 130);
  sh.setColumnWidth(5, 180);
  sh.setColumnWidth(6, 110);
  sh.setColumnWidth(7, 80);
  sh.setColumnWidth(8, 120);
  sh.setColumnWidth(9, 180);

  // ตัวอย่างสูตรอาหาร
  const sampleBOM = [
    // ข้าวเกรียบ
    ['MENU-001','ข้าวเกรียบ','Fried Crackers', 'ING-005','ข้าวสวย',    80,  'กรัม', '=IFERROR(VLOOKUP(D2,วัตถุดิบ!A:F,6,0)*F2,"")', ''],
    ['MENU-001','ข้าวเกรียบ','Fried Crackers', 'ING-006','น้ำมันพืช',  20,  'มล',   '=IFERROR(VLOOKUP(D3,วัตถุดิบ!A:F,6,0)*F3,"")', ''],
    ['MENU-001','ข้าวเกรียบ','Fried Crackers', 'ING-007','น้ำปลา',     5,   'มล',   '=IFERROR(VLOOKUP(D4,วัตถุดิบ!A:F,6,0)*F4,"")', ''],
    // กุ้งฝอยทรงเครื่อง
    ['MENU-002','กุ้งฝอยทรงเครื่อง','Crispy Shrimp', 'ING-003','กุ้งสด',    150, 'กรัม', '=IFERROR(VLOOKUP(D5,วัตถุดิบ!A:F,6,0)*F5,"")', ''],
    ['MENU-002','กุ้งฝอยทรงเครื่อง','Crispy Shrimp', 'ING-006','น้ำมันพืช',  30,  'มล',   '=IFERROR(VLOOKUP(D6,วัตถุดิบ!A:F,6,0)*F6,"")', ''],
    ['MENU-002','กุ้งฝอยทรงเครื่อง','Crispy Shrimp', 'ING-009','กระเทียม',   10,  'กรัม', '=IFERROR(VLOOKUP(D7,วัตถุดิบ!A:F,6,0)*F7,"")', ''],
    ['MENU-002','กุ้งฝอยทรงเครื่อง','Crispy Shrimp', 'ING-011','พริกขี้หนู', 5,   'กรัม', '=IFERROR(VLOOKUP(D8,วัตถุดิบ!A:F,6,0)*F8,"")', ''],
    // ลูกชิ้นปลาระเบิด
    ['MENU-003','ลูกชิ้นปลาระเบิด','Fish Ball', 'ING-006','น้ำมันพืช',  50,  'มล',   '=IFERROR(VLOOKUP(D9,วัตถุดิบ!A:F,6,0)*F9,"")',  ''],
    ['MENU-003','ลูกชิ้นปลาระเบิด','Fish Ball', 'ING-007','น้ำปลา',     10,  'มล',   '=IFERROR(VLOOKUP(D10,วัตถุดิบ!A:F,6,0)*F10,"")', ''],
    ['MENU-003','ลูกชิ้นปลาระเบิด','Fish Ball', 'ING-013','ผักชี',      5,   'กรัม', '=IFERROR(VLOOKUP(D11,วัตถุดิบ!A:F,6,0)*F11,"")', ''],
  ];
  sh.getRange(2, 1, sampleBOM.length, headers.length).setValues(sampleBOM);
  sh.getRange(2, 8, sampleBOM.length, 1).setNumberFormat('฿#,##0.00');
  sh.getRange(2, 6, sampleBOM.length, 1).setNumberFormat('#,##0');

  for (let i = 2; i <= sampleBOM.length + 1; i++) {
    const color = i % 2 === 0 ? '#f0f4f8' : '#ffffff';
    sh.getRange(i, 1, 1, headers.length).setBackground(color);
  }
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
}

// ──────────────────────────────────────────────
// ชีท 3: รับวัตถุดิบ (Stock In)
// ──────────────────────────────────────────────
function _setupStockIn(ss) {
  let sh = ss.getSheetByName('รับวัตถุดิบ');
  if (!sh) sh = ss.insertSheet('รับวัตถุดิบ');
  sh.clearContents();
  sh.clearFormats();

  const headers = [
    'วันที่', 'รหัสวัตถุดิบ', 'ชื่อวัตถุดิบ',
    'จำนวนที่รับ', 'หน่วย', 'ราคา/หน่วย (฿)',
    'รวมราคา (฿)', 'ผู้บันทึก', 'หมายเหตุ'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#7b3f00');

  sh.setColumnWidth(1, 120);
  sh.setColumnWidth(2, 130);
  sh.setColumnWidth(3, 180);
  sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 80);
  sh.setColumnWidth(6, 130);
  sh.setColumnWidth(7, 130);
  sh.setColumnWidth(8, 120);
  sh.setColumnWidth(9, 200);

  // ตัวอย่างข้อมูล
  const today = new Date();
  const sample = [
    [today, 'ING-001', '=IFERROR(VLOOKUP(B2,วัตถุดิบ!A:B,2,0),"")', 2000, 'กรัม', 0.08, '=D2*F2', 'admin', 'เปิดร้านวันแรก'],
    [today, 'ING-003', '=IFERROR(VLOOKUP(B3,วัตถุดิบ!A:B,2,0),"")', 1000, 'กรัม', 0.20, '=D3*F3', 'admin', ''],
    [today, 'ING-005', '=IFERROR(VLOOKUP(B4,วัตถุดิบ!A:B,2,0),"")', 5000, 'กรัม', 0.01, '=D4*F4', 'admin', ''],
    [today, 'ING-006', '=IFERROR(VLOOKUP(B5,วัตถุดิบ!A:B,2,0),"")', 2000, 'มล',   0.03, '=D5*F5', 'admin', ''],
  ];
  sh.getRange(2, 1, sample.length, headers.length).setValues(sample);
  sh.getRange(2, 1, sample.length, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(2, 4, sample.length, 1).setNumberFormat('#,##0');
  sh.getRange(2, 6, sample.length, 1).setNumberFormat('฿#,##0.00');
  sh.getRange(2, 7, sample.length, 1).setNumberFormat('฿#,##0.00');

  // คำแนะนำในแถว comment
  sh.getRange(1, 1).setNote('วันที่รับวัตถุดิบ (dd/mm/yyyy)');
  sh.getRange(1, 3).setNote('ดึงชื่ออัตโนมัติจากรหัสใน Col B — ไม่ต้องพิมพ์เอง');
  sh.getRange(1, 7).setNote('คำนวณอัตโนมัติ = จำนวน × ราคา/หน่วย');

  for (let i = 2; i <= sample.length + 1; i++) {
    const color = i % 2 === 0 ? '#fff8f0' : '#ffffff';
    sh.getRange(i, 1, 1, headers.length).setBackground(color);
  }
  sh.setFrozenRows(1);
}

// ──────────────────────────────────────────────
// ชีท 4: ตัดสต็อก (Stock Out — Auto from Orders)
// ──────────────────────────────────────────────
function _setupStockOut(ss) {
  let sh = ss.getSheetByName('ตัดสต็อก');
  if (!sh) sh = ss.insertSheet('ตัดสต็อก');
  sh.clearContents();
  sh.clearFormats();

  const headers = [
    'วันที่-เวลา', 'เลขออเดอร์', 'โต๊ะ',
    'รหัสเมนู', 'ชื่อเมนู', 'จำนวนจาน',
    'รหัสวัตถุดิบ', 'ชื่อวัตถุดิบ',
    'ปริมาณตัด', 'หน่วย',
    'ต้นทุน (฿)'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#4a0000');

  sh.setColumnWidth(1, 150);
  sh.setColumnWidth(2, 120);
  sh.setColumnWidth(3, 80);
  sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 180);
  sh.setColumnWidth(6, 100);
  sh.setColumnWidth(7, 130);
  sh.setColumnWidth(8, 180);
  sh.setColumnWidth(9, 110);
  sh.setColumnWidth(10, 80);
  sh.setColumnWidth(11, 110);

  sh.getRange(1, 1).setNote('บันทึกอัตโนมัติโดย GAS เมื่อมีการชำระเงิน');
  sh.getRange(2, 1).setValue('← ข้อมูลจะถูก Insert อัตโนมัติเมื่อสั่ง deductStock ผ่าน API');
  sh.getRange(2, 1).setFontColor('#888888').setFontStyle('italic');

  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
}

// ──────────────────────────────────────────────
// ชีท 5: สรุปสต็อก (Dashboard — สูตร Auto)
// ──────────────────────────────────────────────
function _setupStockSummary(ss) {
  let sh = ss.getSheetByName('สรุปสต็อก');
  if (!sh) sh = ss.insertSheet('สรุปสต็อก');
  sh.clearContents();
  sh.clearFormats();

  // Title
  sh.getRange(1, 1, 1, 8).merge();
  sh.getRange(1, 1).setValue('📊 รายงานสต็อกวัตถุดิบ (อัปเดตอัตโนมัติ)');
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center')
    .setBackground('#1a1a2e').setFontColor('#ffffff');
  sh.setRowHeight(1, 40);

  const headers = [
    'รหัส', 'ชื่อวัตถุดิบ', 'หน่วย',
    'รับเข้าทั้งหมด', 'ใช้ไปทั้งหมด', 'คงเหลือ',
    'ขั้นต่ำ', 'สถานะ'
  ];
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(2, 1, 1, headers.length), '#16213e');
  sh.setFrozenRows(2);

  sh.setColumnWidth(1, 110);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 80);
  sh.setColumnWidth(4, 140);
  sh.setColumnWidth(5, 140);
  sh.setColumnWidth(6, 110);
  sh.setColumnWidth(7, 100);
  sh.setColumnWidth(8, 130);

  // สร้างแถวสูตรสำหรับวัตถุดิบ 15 รายการแรก
  for (let r = 3; r <= 17; r++) {
    const ingRow = r - 1; // row ใน sheet วัตถุดิบ (row 2 = ING-001)
    sh.getRange(r, 1).setFormula(`=IFERROR(วัตถุดิบ!A${ingRow},"")`);
    sh.getRange(r, 2).setFormula(`=IFERROR(วัตถุดิบ!B${ingRow},"")`);
    sh.getRange(r, 3).setFormula(`=IFERROR(วัตถุดิบ!D${ingRow},"")`);
    // รับเข้าทั้งหมด = SUMIF จากชีทรับวัตถุดิบ
    sh.getRange(r, 4).setFormula(`=IFERROR(SUMIF(รับวัตถุดิบ!B:B,A${r},รับวัตถุดิบ!D:D),0)`);
    // ใช้ไปทั้งหมด = SUMIF จากชีทตัดสต็อก
    sh.getRange(r, 5).setFormula(`=IFERROR(SUMIF(ตัดสต็อก!G:G,A${r},ตัดสต็อก!I:I),0)`);
    // คงเหลือ
    sh.getRange(r, 6).setFormula(`=D${r}-E${r}`);
    // ขั้นต่ำ
    sh.getRange(r, 7).setFormula(`=IFERROR(วัตถุดิบ!E${ingRow},"")`);
    // สถานะ
    sh.getRange(r, 8).setFormula(
      `=IF(A${r}="","",IF(F${r}<=0,"🔴 หมดแล้ว!",IF(F${r}<=G${r},"🟡 ใกล้หมด","🟢 ปกติ")))`
    );
  }

  // Format ตัวเลข
  sh.getRange(3, 4, 15, 4).setNumberFormat('#,##0.00');

  // สีแถว + Conditional formatting
  for (let r = 3; r <= 17; r++) {
    sh.getRange(r, 1, 1, 7).setBackground(r % 2 === 0 ? '#f5f5f5' : '#ffffff');
  }

  // สรุปด้านล่าง
  sh.getRange(19, 1).setValue('อัปเดตล่าสุด:');
  sh.getRange(19, 1).setFontWeight('bold');
  sh.getRange(19, 2).setFormula('=NOW()');
  sh.getRange(19, 2).setNumberFormat('dd/mm/yyyy HH:mm');

  sh.getRange(20, 1).setValue('หมายเหตุ: สต็อกคำนวณจาก (รับเข้า) − (ตัดสต็อก) แบบ real-time');
  sh.getRange(20, 1, 1, 4).merge().setFontColor('#888888').setFontStyle('italic');
}

// ──────────────────────────────────────────────
// HELPER: Style header row
// ──────────────────────────────────────────────
function _styleHeader(range, bgColor) {
  range
    .setBackground(bgColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#ffffff', SpreadsheetApp.BorderStyle.SOLID);
  range.getSheet().setRowHeight(range.getRow(), 36);
}

// ================================================================
// API FUNCTIONS — เรียกผ่าน doPost ใน GAS backend
// ================================================================

/**
 * ตัดสต็อกอัตโนมัติ เมื่อมีออเดอร์ชำระเงิน
 * เรียกจาก App.jsx ผ่าน fetch POST action=deductStock
 *
 * Body: {
 *   action: 'deductStock',
 *   orderNumber: 'ORD-001',
 *   tableNo: '1',
 *   items: [ { menuId: 'MENU-001', menuName: 'ข้าวเกรียบ', qty: 2 } ]
 * }
 */
function deductStock(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bomSheet = ss.getSheetByName('BOM');
  const outSheet = ss.getSheetByName('ตัดสต็อก');
  const ingSheet = ss.getSheetByName('วัตถุดิบ');

  if (!bomSheet || !outSheet || !ingSheet) {
    return { success: false, error: 'ไม่พบชีท BOM หรือ ตัดสต็อก — กรุณารัน setupBOM() ก่อน' };
  }

  const bomData = bomSheet.getDataRange().getValues();
  const now = new Date();
  const rows = [];

  for (const ordered of data.items) {
    // หา BOM สำหรับเมนูนี้
    const bomLines = bomData.filter(row => String(row[0]) === String(ordered.menuId));

    for (const line of bomLines) {
      const ingId    = line[3];
      const ingName  = line[4];
      const amtPer   = Number(line[5]);
      const unit     = line[6];
      const totalAmt = amtPer * (ordered.qty || 1);

      // คำนวณต้นทุน
      const ingRows = ingSheet.getDataRange().getValues();
      const ingRow  = ingRows.find(r => String(r[0]) === String(ingId));
      const cost    = ingRow ? (Number(ingRow[5]) * totalAmt) : 0;

      rows.push([
        now, ordered.orderNumber || data.orderNumber,
        ordered.tableNo || data.tableNo,
        ordered.menuId, ordered.menuName,
        ordered.qty || 1,
        ingId, ingName,
        totalAmt, unit,
        cost
      ]);
    }
  }

  if (rows.length > 0) {
    const lastRow = outSheet.getLastRow() + 1;
    outSheet.getRange(lastRow, 1, rows.length, 11).setValues(rows);
    outSheet.getRange(lastRow, 1, rows.length, 1).setNumberFormat('dd/mm/yyyy HH:mm');
    outSheet.getRange(lastRow, 11, rows.length, 1).setNumberFormat('฿#,##0.00');
  }

  return { success: true, deducted: rows.length, orderNumber: data.orderNumber };
}

/**
 * ดูสต็อกปัจจุบัน + แจ้งเตือนของใกล้หมด
 * เรียกผ่าน doGet?action=getStock
 */
function getStockLevels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ingSheet = ss.getSheetByName('วัตถุดิบ');
  const inSheet  = ss.getSheetByName('รับวัตถุดิบ');
  const outSheet = ss.getSheetByName('ตัดสต็อก');

  const ingData  = ingSheet.getDataRange().getValues().slice(1);
  const inData   = inSheet.getDataRange().getValues().slice(1);
  const outData  = outSheet.getDataRange().getValues().slice(1);

  const result = ingData
    .filter(row => row[0])
    .map(row => {
      const id  = String(row[0]);
      const totalIn  = inData.filter(r => String(r[1]) === id).reduce((s, r) => s + Number(r[3] || 0), 0);
      const totalOut = outData.filter(r => String(r[6]) === id).reduce((s, r) => s + Number(r[8] || 0), 0);
      const current  = totalIn - totalOut;
      const minQty   = Number(row[4]);

      return {
        id,
        name:    row[1],
        nameEn:  row[2],
        unit:    row[3],
        current: Math.round(current * 100) / 100,
        minimum: minQty,
        price:   Number(row[5]),
        status:  current <= 0 ? 'OUT' : current <= minQty ? 'LOW' : 'OK'
      };
    });

  return { success: true, stock: result, lowItems: result.filter(r => r.status !== 'OK') };
}

/**
 * รับวัตถุดิบเข้า — บันทึกลง sheet รับวัตถุดิบ
 * Body: {
 *   action: 'stockIn',
 *   items: [ { ingId, qty, pricePerUnit, note, staff } ]
 * }
 */
function recordStockIn(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inSheet  = ss.getSheetByName('รับวัตถุดิบ');
  const ingSheet = ss.getSheetByName('วัตถุดิบ');

  const ingData = ingSheet.getDataRange().getValues().slice(1);
  const now = new Date();
  const rows = [];

  for (const item of data.items) {
    const ingRow = ingData.find(r => String(r[0]) === String(item.ingId));
    if (!ingRow) continue;
    const price = item.pricePerUnit || ingRow[5] || 0;
    rows.push([
      now, item.ingId, ingRow[1],
      Number(item.qty), ingRow[3],
      Number(price), Number(item.qty) * Number(price),
      item.staff || 'system', item.note || ''
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

// ──────────────────────────────────────────────
// doGet และ doPost — ต่อยอดจาก GAS หลัก
// คัดลอกส่วนนี้ไปแทรกใน doGet/doPost เดิม
// ──────────────────────────────────────────────
/*
  ใน doGet เพิ่ม:
  if (action === 'getStock')    return jsonResponse(getStockLevels());

  ใน doPost เพิ่ม:
  if (data.action === 'deductStock') return jsonResponse(deductStock(data));
  if (data.action === 'stockIn')     return jsonResponse(recordStockIn(data));
*/
