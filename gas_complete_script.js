// ==========================================
// สเน่ห์POS - BACKEND SCRIPT (TABLE-BASED)
// ==========================================
// ⭐ ไฟล์ Backend เดียวของระบบ — ใช้ไฟล์นี้ไฟล์เดียวในการ Deploy บน Google Apps Script ⭐
// (รวมทุกอย่างแล้ว: ออเดอร์/เมนู/หมวดหมู่/ผู้ใช้ + BOM/สต็อก + กะ + รายงาน + ชำระเงิน)
// รองรับ: isAdmin, หมายเหตุอาหาร, popupConfig รายเมนู, ราคาหลายแบบ (prices), แยกจ่าย (splitDetail)
// ==========================================

var SHEET_ID = '1QSsVi6No7HJKqBcPiXcX_Xs1iMC9SRk6bydJ88dGNP4';

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

function initializeSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  getOrCreateSheet(ss, 'Orders', ['Timestamp', 'OrderNumber', 'CustomerName', 'Address', 'ItemDetail', 'DiningOption', 'Price', 'TotalAmount', 'Status', 'OrderStartTime', 'CompletionTime', 'RecordedBy']);
  getOrCreateSheet(ss, 'Categories', ['slug', 'name', 'nameEn', 'icon', 'isActive', 'hasPopup1', 'popup1Category', 'popup1Items', 'popup1Min', 'popup1Max', 'popup1ItemsMax', 'popup1Free', 'hasPopup2', 'popup2Category', 'popup2Items', 'popup2Min', 'popup2Max', 'popup2ItemsMax', 'popup2Free', 'hasPopup3', 'popup3Category', 'popup3Items', 'popup3Min', 'popup3Max', 'popup3ItemsMax', 'popup3Free', 'hasPopup4', 'popup4Category', 'popup4Items', 'popup4Min', 'popup4Max', 'popup4ItemsMax', 'popup4Free', 'hasPopup5', 'popup5Category', 'popup5Items', 'popup5Min', 'popup5Max', 'popup5ItemsMax', 'popup5Free', 'hasPopup6', 'popup6Category', 'popup6Items', 'popup6Min', 'popup6Max', 'popup6ItemsMax', 'popup6Free', 'hasDining']);
  getOrCreateSheet(ss, 'Menu', ['id', 'category', 'name', 'nameEn', 'description', 'descriptionEn', 'price', 'image', 'isActive', 'bundledItems', 'popupConfig', 'prices']);
  getOrCreateSheet(ss, 'Promotions', ['id', 'name', 'nameEn', 'price', 'origPrice']);
  getOrCreateSheet(ss, 'TableOrders', ['TableNumber', 'SessionId', 'ItemName', 'ItemNameEn', 'ItemPrice', 'Quantity', 'Options', 'Timestamp', 'Status', 'RecordedBy']);
  getOrCreateSheet(ss, 'Users', ['id', 'username', 'pin', 'canCheckout', 'isAdmin']);
  getOrCreateSheet(ss, 'Discounts', ['id', 'name', 'type', 'value', 'categories']);
  getOrCreateSheet(ss, 'Settings', ['key', 'value']);
  getOrCreateSheet(ss, 'Printers', ['id', 'name', 'ip', 'type']);
  getOrCreateSheet(ss, 'LiquorStorage', ['timestamp', 'type', 'customerName', 'phone', 'productName', 'qty', 'note', 'staff']);
  getOrCreateSheet(ss, 'Shifts', ['id', 'openTime', 'closeTime', 'openStaff', 'closeStaff', 'openCash', 'closeCash', 'totalSales', 'totalCash', 'totalCard', 'totalTransfer', 'totalOrders', 'status', 'note']);
  getOrCreateSheet(ss, 'PaymentSummary', ['timestamp', 'orderNumber', 'tableNo', 'paymentMethod', 'grandTotal', 'staff', 'shiftId', 'splitDetail']);
}

// ──────────────────────────────────────────────
// doGet
// ──────────────────────────────────────────────
function doGet(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';

  initializeSheets();

  if (action === 'getAllData') {
    var data = {
      orders:      getSheetDataAsObjects(ss, 'Orders'),
      categories:  getSheetDataAsObjects(ss, 'Categories'),
      menu:        getSheetDataAsObjects(ss, 'Menu'),
      promotions:  getSheetDataAsObjects(ss, 'Promotions'),
      tableOrders: getSheetDataAsObjects(ss, 'TableOrders'),
      users:       getSheetDataAsObjects(ss, 'Users'),
      printers:    getSheetDataAsObjects(ss, 'Printers'),
      discounts:   getSheetDataAsObjects(ss, 'Discounts'),
      settings:    (function() {
        var sh = ss.getSheetByName('Settings');
        if (!sh) return null;
        var d = sh.getDataRange().getValues();
        for (var i = 1; i < d.length; i++) {
          if (d[i][0] === 'pos_settings') {
            try { return JSON.parse(d[i][1]); } catch(e) { return null; }
          }
        }
        return null;
      })()
    };
    return _bomJson(data);
  }

  if (action === 'getTableOrders') {
    var tableNumber = e.parameter.tableNumber || '';
    var allRows = getSheetDataAsObjects(ss, 'TableOrders');
    var filtered = allRows.filter(function(r) {
      return String(r.TableNumber) === String(tableNumber) && r.Status !== 'paid';
    });
    return _bomJson({ success: true, orders: filtered });
  }

  if (action === 'resetAllSheetData') {
    ['Categories', 'Menu', 'Promotions'].forEach(function(name) {
      var sh = ss.getSheetByName(name);
      if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    });
    return _bomJson({ success: true, message: 'All data cleared' });
  }

  // ── BOM actions ──
  if (action === 'getLiquorRecords') return _bomJson({ success: true, records: getSheetDataAsObjects(ss, 'LiquorStorage') });
  if (action === 'getStock')         return _bomJson(getStockLevels());
  if (action === 'getIngredients')   return _bomJson(getIngredientsList());
  if (action === 'getShifts')        return _bomJson({ success: true, shifts: getSheetDataAsObjects(ss, 'Shifts') });

  if (action === 'getReportData') {
    var from = (e && e.parameter && e.parameter.from) ? e.parameter.from : '';
    var to   = (e && e.parameter && e.parameter.to)   ? e.parameter.to   : '';
    var fromDate = from ? new Date(from) : null;
    var toDate   = to   ? new Date(to + 'T23:59:59')  : null;

    var filterByDate = function(rows, tsField) {
      if (!fromDate && !toDate) return rows;
      return rows.filter(function(r) {
        if (!r[tsField]) return true;
        var d = new Date(r[tsField]);
        if (fromDate && d < fromDate) return false;
        if (toDate   && d > toDate)   return false;
        return true;
      });
    };

    var allOrders   = getSheetDataAsObjects(ss, 'Orders');
    var allPayments = getSheetDataAsObjects(ss, 'PaymentSummary');
    var allShifts   = getSheetDataAsObjects(ss, 'Shifts');

    return _bomJson({
      success:  true,
      orders:   filterByDate(allOrders,   'Timestamp'),
      payments: filterByDate(allPayments, 'timestamp'),
      shifts:   allShifts
    });
  }

  return _bomJson({ error: 'Unknown GET action' });
}

// ──────────────────────────────────────────────
// getSheetDataAsObjects
// ──────────────────────────────────────────────
function getSheetDataAsObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        var val = data[i][j];
        if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
          try { val = JSON.parse(val.trim()); } catch(e) {}
        }
        obj[headers[j]] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

// ──────────────────────────────────────────────
// doPost
// ──────────────────────────────────────────────
function doPost(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  initializeSheets();

  var postData = {};
  try {
    postData = JSON.parse(e.postData.contents);
  } catch(err) {
    try { postData = JSON.parse(e.postData.getDataAsString()); } catch(err2) {
      return _bomJson({ success: false, error: 'Invalid Content' });
    }
  }

  var action = postData.action || 'insertOrder';

  // ── TABLE ORDER ACTIONS ──
  if (action === 'addTableOrder') {
    var sheet = ss.getSheetByName('TableOrders');
    var tableNumber = postData.tableNumber || '';
    var sessionId   = postData.sessionId   || String(Date.now());
    var items       = postData.items       || [];
    var timestamp   = postData.timestamp   || new Date().toISOString();
    var recordedBy  = postData.recordedBy  || '';
    items.forEach(function(item) {
      var parts = [];
      if (item.food && item.food.priceName) parts.push(item.food.priceName);
      if (item.spice && item.spice.name) parts.push('ความเผ็ด: ' + item.spice.name);
      if (item.allPopups && item.allPopups.length > 0) item.allPopups.forEach(function(p) { parts.push(p.name); });
      if (item.promo && item.promo.id !== 'none' && item.promo.name) parts.push(item.promo.name);
      if (item.note && String(item.note).trim()) parts.push('📝 ' + String(item.note).trim());
      sheet.appendRow([tableNumber, sessionId, item.food.name || '', item.food.nameEn || '', Number(item.food.price) || 0, Number(item.quantity) || 1, parts.join(', '), timestamp, 'pending', recordedBy]);
    });
    return _bomJson({ success: true, sessionId: sessionId });
  }

  if (action === 'clearTableOrders') {
    var sheet = ss.getSheetByName('TableOrders');
    var tableNumber = String(postData.tableNumber || '');
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === tableNumber && data[i][8] !== 'paid') sheet.deleteRow(i + 1);
    }
    return _bomJson({ success: true });
  }

  if (action === 'deleteTableOrderItem') {
    var sheet = ss.getSheetByName('TableOrders');
    var tableNumber = String(postData.tableNumber || '');
    var sessionId   = String(postData.sessionId   || '');
    var itemName    = String(postData.itemName     || '');
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === tableNumber && String(data[i][1]) === sessionId && String(data[i][2]) === itemName) {
        sheet.deleteRow(i + 1);
        return _bomJson({ success: true });
      }
    }
    return _bomJson({ success: false });
  }

  if (action === 'moveTable') {
    var sheet = ss.getSheetByName('TableOrders');
    var fromTable = String(postData.fromTable || '');
    var toTable   = String(postData.toTable   || '');
    var data = sheet.getDataRange().getValues();
    var updated = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === fromTable && data[i][8] !== 'paid') {
        sheet.getRange(i + 1, 1).setValue(toTable);
        updated = true;
      }
    }
    return _bomJson({ success: updated });
  }

  // ── ORDER ACTIONS ──
  if (action === 'insertOrder') {
    var sheet = ss.getSheetByName('Orders');
    if (postData.rows && Array.isArray(postData.rows)) {
      postData.rows.forEach(function(row) { sheet.appendRow(row); });
    }
    return _bomJson({ success: true });
  }

  if (action === 'updateStatus') {
    var orderId        = postData.orderId;
    var status         = postData.status;
    var completionTime = postData.completionTime || '';
    var sheet = ss.getSheetByName('Orders');
    var data = sheet.getDataRange().getValues();
    var updated = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === orderId || data[i][0] == orderId || data[i][1] == orderId) {
        sheet.getRange(i + 1, 9).setValue(status);
        if (status.toLowerCase() === 'completed' && completionTime) sheet.getRange(i + 1, 11).setValue(completionTime);
        updated = true;
      }
    }
    return _bomJson({ success: updated });
  }

  // ── ADMIN ACTIONS ──
  if (action === 'uploadImage') {
    try {
      var folderId = '11aWwDOmZO_mijABBSJjpm-0pHuhLvyYp';
      var folder   = DriveApp.getFolderById(folderId);
      var blob     = Utilities.newBlob(Utilities.base64Decode(postData.base64), postData.mimeType, postData.filename);
      var file     = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return _bomJson({ success: true, url: 'https://drive.google.com/uc?export=view&id=' + file.getId() });
    } catch(e) {
      return _bomJson({ success: false, error: e.toString() });
    }
  }

  if (action === 'upsertMenu') {
    var sheet = ss.getSheetByName('Menu');
    var item = postData.item;
    if (!item || !item.id) return _bomJson({ success: false });
    // Ensure the header includes the popupConfig/prices columns (migration for old sheets)
    var menuHeaders = ['id', 'category', 'name', 'nameEn', 'description', 'descriptionEn', 'price', 'image', 'isActive', 'bundledItems', 'popupConfig', 'prices'];
    sheet.getRange(1, 1, 1, menuHeaders.length).setValues([menuHeaders]);
    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == item.id) { foundIndex = i + 1; break; }
    }
    var rowData = [item.id, item.category || 'food', item.name || '', item.nameEn || '', item.description || '', item.descriptionEn || '', item.price || 0, item.image || '', item.isActive !== false, item.bundledItems ? JSON.stringify(item.bundledItems) : '[]', item.popupConfig ? JSON.stringify(item.popupConfig) : '{}', item.prices ? JSON.stringify(item.prices) : '[]'];
    if (foundIndex !== -1) sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return _bomJson({ success: true });
  }

  if (action === 'deleteMenu') {
    var sheet = ss.getSheetByName('Menu');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == postData.id) { sheet.deleteRow(i + 1); return _bomJson({ success: true }); }
    }
    return _bomJson({ success: false, error: 'Not found' });
  }

  if (action === 'saveMenu') {
    var sheet = ss.getSheetByName('Menu');
    sheet.clearContents();
    sheet.appendRow(['id', 'category', 'name', 'nameEn', 'description', 'descriptionEn', 'price', 'image', 'isActive', 'bundledItems', 'popupConfig', 'prices']);
    (postData.items || []).forEach(function(item) {
      sheet.appendRow([item.id || Date.now(), item.category || 'food', item.name || '', item.nameEn || '', item.description || '', item.descriptionEn || '', item.price || 0, item.image || '', item.isActive !== false, item.bundledItems ? JSON.stringify(item.bundledItems) : '[]', item.popupConfig ? JSON.stringify(item.popupConfig) : '{}', item.prices ? JSON.stringify(item.prices) : '[]']);
    });
    return _bomJson({ success: true });
  }

  if (action === 'upsertPromotion') {
    var sheet = ss.getSheetByName('Promotions');
    var promo = postData.item;
    if (!promo || !promo.id) return _bomJson({ success: false });
    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == promo.id) { foundIndex = i + 1; break; }
    }
    var rowData = [promo.id, promo.name || '', promo.nameEn || '', promo.price || 0, promo.origPrice || ''];
    if (foundIndex !== -1) sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return _bomJson({ success: true });
  }

  if (action === 'deletePromotion') {
    var sheet = ss.getSheetByName('Promotions');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == postData.id) { sheet.deleteRow(i + 1); return _bomJson({ success: true }); }
    }
    return _bomJson({ success: false });
  }

  if (action === 'savePromotions') {
    var sheet = ss.getSheetByName('Promotions');
    sheet.clearContents();
    sheet.appendRow(['id', 'name', 'nameEn', 'price', 'origPrice']);
    (postData.promotions || []).forEach(function(promo) {
      sheet.appendRow([promo.id || Date.now(), promo.name || '', promo.nameEn || '', promo.price || 0, promo.origPrice || '']);
    });
    return _bomJson({ success: true });
  }

  if (action === 'upsertCategory') {
    var sheet = ss.getSheetByName('Categories');
    var c = postData.item;
    if (!c || !c.slug) return _bomJson({ success: false });
    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == c.slug) { foundIndex = i + 1; break; }
    }
    var rowData = [
      c.slug, c.name||'', c.nameEn||'', c.icon||'📌', c.isActive!==false,
      c.hasPopup1!==false, c.popup1Category||'', c.popup1Items?JSON.stringify(c.popup1Items):'[]', c.popup1Min||0, c.popup1Max||0, c.popup1ItemsMax?JSON.stringify(c.popup1ItemsMax):'{}', c.popup1Free===true,
      c.hasPopup2===true,  c.popup2Category||'', c.popup2Items?JSON.stringify(c.popup2Items):'[]', c.popup2Min||0, c.popup2Max||0, c.popup2ItemsMax?JSON.stringify(c.popup2ItemsMax):'{}', c.popup2Free===true,
      c.hasPopup3===true,  c.popup3Category||'', c.popup3Items?JSON.stringify(c.popup3Items):'[]', c.popup3Min||0, c.popup3Max||0, c.popup3ItemsMax?JSON.stringify(c.popup3ItemsMax):'{}', c.popup3Free===true,
      c.hasPopup4===true,  c.popup4Category||'', c.popup4Items?JSON.stringify(c.popup4Items):'[]', c.popup4Min||0, c.popup4Max||0, c.popup4ItemsMax?JSON.stringify(c.popup4ItemsMax):'{}', c.popup4Free===true,
      c.hasPopup5===true,  c.popup5Category||'', c.popup5Items?JSON.stringify(c.popup5Items):'[]', c.popup5Min||0, c.popup5Max||0, c.popup5ItemsMax?JSON.stringify(c.popup5ItemsMax):'{}', c.popup5Free===true,
      c.hasPopup6===true,  c.popup6Category||'', c.popup6Items?JSON.stringify(c.popup6Items):'[]', c.popup6Min||0, c.popup6Max||0, c.popup6ItemsMax?JSON.stringify(c.popup6ItemsMax):'{}', c.popup6Free===true,
      c.hasDining!==false
    ];
    if (foundIndex !== -1) sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return _bomJson({ success: true });
  }

  if (action === 'deleteCategory') {
    var sheet = ss.getSheetByName('Categories');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == postData.slug) { sheet.deleteRow(i + 1); return _bomJson({ success: true }); }
    }
    return _bomJson({ success: false });
  }

  if (action === 'saveCategories') {
    var sheet = ss.getSheetByName('Categories');
    sheet.clearContents();
    sheet.appendRow(['slug','name','nameEn','icon','isActive','hasPopup1','popup1Category','popup1Items','popup1Min','popup1Max','popup1ItemsMax','popup1Free','hasPopup2','popup2Category','popup2Items','popup2Min','popup2Max','popup2ItemsMax','popup2Free','hasPopup3','popup3Category','popup3Items','popup3Min','popup3Max','popup3ItemsMax','popup3Free','hasPopup4','popup4Category','popup4Items','popup4Min','popup4Max','popup4ItemsMax','popup4Free','hasPopup5','popup5Category','popup5Items','popup5Min','popup5Max','popup5ItemsMax','popup5Free','hasPopup6','popup6Category','popup6Items','popup6Min','popup6Max','popup6ItemsMax','popup6Free','hasDining']);
    (postData.categories || []).forEach(function(c) {
      sheet.appendRow([
        c.slug||Date.now().toString(), c.name||'', c.nameEn||'', c.icon||'📌', c.isActive!==false,
        c.hasPopup1!==false, c.popup1Category||'', c.popup1Items?JSON.stringify(c.popup1Items):'[]', c.popup1Min||0, c.popup1Max||0, c.popup1ItemsMax?JSON.stringify(c.popup1ItemsMax):'{}', c.popup1Free===true,
        c.hasPopup2===true,  c.popup2Category||'', c.popup2Items?JSON.stringify(c.popup2Items):'[]', c.popup2Min||0, c.popup2Max||0, c.popup2ItemsMax?JSON.stringify(c.popup2ItemsMax):'{}', c.popup2Free===true,
        c.hasPopup3===true,  c.popup3Category||'', c.popup3Items?JSON.stringify(c.popup3Items):'[]', c.popup3Min||0, c.popup3Max||0, c.popup3ItemsMax?JSON.stringify(c.popup3ItemsMax):'{}', c.popup3Free===true,
        c.hasPopup4===true,  c.popup4Category||'', c.popup4Items?JSON.stringify(c.popup4Items):'[]', c.popup4Min||0, c.popup4Max||0, c.popup4ItemsMax?JSON.stringify(c.popup4ItemsMax):'{}', c.popup4Free===true,
        c.hasPopup5===true,  c.popup5Category||'', c.popup5Items?JSON.stringify(c.popup5Items):'[]', c.popup5Min||0, c.popup5Max||0, c.popup5ItemsMax?JSON.stringify(c.popup5ItemsMax):'{}', c.popup5Free===true,
        c.hasPopup6===true,  c.popup6Category||'', c.popup6Items?JSON.stringify(c.popup6Items):'[]', c.popup6Min||0, c.popup6Max||0, c.popup6ItemsMax?JSON.stringify(c.popup6ItemsMax):'{}', c.popup6Free===true,
        c.hasDining!==false
      ]);
    });
    return _bomJson({ success: true });
  }

  if (action === 'saveLiquorRecord') {
    var sh = getOrCreateSheet(ss, 'LiquorStorage', ['timestamp', 'type', 'customerName', 'productName', 'qty', 'note', 'staff']);
    sh.appendRow([new Date().toISOString(), postData.type || 'ฝาก', postData.customerName || '', postData.phone || '', postData.productName || '', Number(postData.qty) || 0, postData.note || '', postData.staff || '']);
    return _bomJson({ success: true });
  }

  if (action === 'savePrinters') {
    var sheet = getOrCreateSheet(ss, 'Printers', ['id', 'name', 'ip', 'type']);
    sheet.clearContents();
    sheet.appendRow(['id', 'name', 'ip', 'type']);
    (postData.printers || []).forEach(function(p) {
      sheet.appendRow([p.id || '', p.name || '', p.ip || '', p.type || '']);
    });
    return _bomJson({ success: true, saved: (postData.printers || []).length });
  }

  if (action === 'saveSettings') {
    var sheet = getOrCreateSheet(ss, 'Settings', ['key', 'value']);
    var data = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'pos_settings') {
        sheet.getRange(i + 1, 2).setValue(JSON.stringify(postData.settings || {}));
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow(['pos_settings', JSON.stringify(postData.settings || {})]);
    return _bomJson({ success: true });
  }

  if (action === 'saveDiscounts') {
    var sheet = getOrCreateSheet(ss, 'Discounts', ['id', 'name', 'type', 'value', 'categories']);
    sheet.clearContents();
    sheet.appendRow(['id', 'name', 'type', 'value', 'categories']);
    (postData.discounts || []).forEach(function(d) {
      sheet.appendRow([d.id || '', d.name || '', d.type || '', d.value || 0, JSON.stringify(d.categories || [])]);
    });
    return _bomJson({ success: true, saved: (postData.discounts || []).length });
  }

  if (action === 'saveUsers') {
    var sheet = ss.getSheetByName('Users');
    sheet.clearContents();
    sheet.appendRow(['id', 'username', 'pin', 'canCheckout', 'isAdmin']);
    (postData.users || []).forEach(function(u) {
      sheet.appendRow([u.id||Date.now().toString(), u.username||'', u.pin||'', u.canCheckout!==false, (u.isAdmin===true || u.isAdmin==='TRUE')]);
    });
    return _bomJson({ success: true });
  }

  if (action === 'resetAllSheetData') {
    ['Categories', 'Menu', 'Promotions'].forEach(function(name) {
      var sh = ss.getSheetByName(name);
      if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    });
    return _bomJson({ success: true, message: 'All data cleared' });
  }

  // ── Ingredient actions ──
  if (action === 'upsertIngredient') {
    var sh = ss.getSheetByName('วัตถุดิบ');
    if (!sh) return _bomJson({ success: false, error: 'ไม่พบชีท วัตถุดิบ — กรุณารัน setupBOM() ก่อน' });
    var ing = postData.ingredient || {};
    var data = sh.getDataRange().getValues();
    var foundIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(ing.id)) { foundIdx = i + 1; break; }
    }
    var row = [ing.id||'', ing.name||'', ing.nameEn||'', ing.unit||'', Number(ing.minStock)||0, Number(ing.costPerUnit)||0, ing.category||'', ing.note||''];
    if (foundIdx !== -1) sh.getRange(foundIdx, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return _bomJson({ success: true });
  }

  if (action === 'deleteIngredient') {
    var sh = ss.getSheetByName('วัตถุดิบ');
    if (!sh) return _bomJson({ success: false, error: 'ไม่พบชีท วัตถุดิบ — กรุณารัน setupBOM() ก่อน' });
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(postData.id)) { sh.deleteRow(i + 1); return _bomJson({ success: true }); }
    }
    return _bomJson({ success: false, error: 'ไม่พบวัตถุดิบ' });
  }

  // ── BOM actions ──
  if (action === 'deductStock') return _bomJson(deductStock(postData));
  if (action === 'stockIn')     return _bomJson(recordStockIn(postData));
  if (action === 'saveBOM')     return _bomJson(saveBOM(postData));

  // ── SHIFT actions ──
  if (action === 'openShift') {
    var sh = getOrCreateSheet(ss, 'Shifts', ['id','openTime','closeTime','openStaff','closeStaff','openCash','closeCash','totalSales','totalCash','totalCard','totalTransfer','totalOrders','status','note']);
    var shiftId = 'SHIFT-' + Date.now();
    sh.appendRow([shiftId, new Date().toISOString(), '', postData.staff||'', '', Number(postData.openCash)||0, 0, 0, 0, 0, 0, 0, 'open', '']);
    return _bomJson({ success: true, shiftId: shiftId });
  }

  if (action === 'closeShift') {
    var sh = ss.getSheetByName('Shifts');
    if (!sh) return _bomJson({ success: false, error: 'ไม่พบชีท Shifts' });
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(postData.shiftId)) {
        sh.getRange(i+1, 3).setValue(new Date().toISOString());
        sh.getRange(i+1, 5).setValue(postData.staff || '');
        sh.getRange(i+1, 7).setValue(Number(postData.closeCash) || 0);
        sh.getRange(i+1, 8).setValue(Number(postData.totalSales) || 0);
        sh.getRange(i+1, 9).setValue(Number(postData.totalCash) || 0);
        sh.getRange(i+1, 10).setValue(Number(postData.totalCard) || 0);
        sh.getRange(i+1, 11).setValue(Number(postData.totalTransfer) || 0);
        sh.getRange(i+1, 12).setValue(Number(postData.totalOrders) || 0);
        sh.getRange(i+1, 13).setValue('closed');
        sh.getRange(i+1, 14).setValue(postData.note || '');
        return _bomJson({ success: true });
      }
    }
    return _bomJson({ success: false, error: 'ไม่พบกะ' });
  }

  if (action === 'savePaymentRecord') {
    var sh = getOrCreateSheet(ss, 'PaymentSummary', ['timestamp','orderNumber','tableNo','paymentMethod','grandTotal','staff','shiftId','splitDetail']);
    // migration: make sure the splitDetail header exists on older sheets
    sh.getRange(1, 1, 1, 8).setValues([['timestamp','orderNumber','tableNo','paymentMethod','grandTotal','staff','shiftId','splitDetail']]);
    sh.appendRow([new Date().toISOString(), postData.orderNumber||'', postData.tableNo||'', postData.paymentMethod||'', Number(postData.grandTotal)||0, postData.staff||'', postData.shiftId||'', postData.splitDetail||'']);
    return _bomJson({ success: true });
  }

  if (action === 'cancelOrder') {
    var sheet = ss.getSheetByName('Orders');
    if (!sheet) return _bomJson({ success: false });
    var data = sheet.getDataRange().getValues();
    var updated = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(postData.orderNumber)) {
        sheet.getRange(i+1, 9).setValue('cancelled');
        updated = true;
      }
    }
    return _bomJson({ success: updated });
  }

  return _bomJson({ success: false, error: 'Unknown action' });
}

// ==========================================
// BOM SYSTEM — ฟังก์ชันด้านล่างนี้ทั้งหมด
// เกี่ยวกับระบบ BOM / สต็อกวัตถุดิบ
// ==========================================

// Helper: ส่ง JSON response
function _bomJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// รัน 1 ครั้งเพื่อสร้าง 5 ชีท BOM
function setupBOM() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  _setupIngredients(ss);
  _setupBOM(ss);
  _setupStockIn(ss);
  _setupStockOut(ss);
  _setupStockSummary(ss);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('✅ ตั้งค่าระบบ BOM เสร็จแล้ว! ทั้ง 5 ชีทพร้อมใช้งาน');
}

// GET ?action=getStock
function getStockLevels() {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var ingSheet = ss.getSheetByName('วัตถุดิบ');
  var inSheet  = ss.getSheetByName('รับวัตถุดิบ');
  var outSheet = ss.getSheetByName('ตัดสต็อก');
  if (!ingSheet || !inSheet || !outSheet) {
    return { success: false, error: 'ไม่พบชีท — กรุณารัน setupBOM() ก่อน' };
  }
  var ingData = ingSheet.getDataRange().getValues().slice(1);
  var inData  = inSheet.getDataRange().getValues().slice(1);
  var outData = outSheet.getDataRange().getValues().slice(1);
  var stock = ingData.filter(function(r) { return r[0]; }).map(function(row) {
    var id = String(row[0]);
    var totalIn  = inData.filter(function(r)  { return String(r[1]) === id; }).reduce(function(s, r) { return s + (Number(r[3]) || 0); }, 0);
    var totalOut = outData.filter(function(r) { return String(r[6]) === id; }).reduce(function(s, r) { return s + (Number(r[8]) || 0); }, 0);
    var current = totalIn - totalOut;
    var minQty  = Number(row[4]) || 0;
    return {
      id: id, name: row[1]||'', nameEn: row[2]||'', unit: row[3]||'',
      current: Math.round(current * 100) / 100,
      minimum: minQty, price: Number(row[5]) || 0,
      status: current <= 0 ? 'OUT' : current <= minQty ? 'LOW' : 'OK'
    };
  });
  return { success: true, stock: stock, lowItems: stock.filter(function(s) { return s.status !== 'OK'; }) };
}

// GET ?action=getIngredients
function getIngredientsList() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) return { success: false, error: 'ไม่พบชีท วัตถุดิบ — กรุณารัน setupBOM() ก่อน' };
  var ingredients = sh.getDataRange().getValues().slice(1).filter(function(r) { return r[0]; }).map(function(r) {
    return { id: String(r[0]), name: r[1]||'', nameEn: r[2]||'', unit: r[3]||'', minStock: Number(r[4])||0, costPerUnit: Number(r[5])||0, category: r[6]||'' };
  });
  return { success: true, ingredients: ingredients };
}

// POST action=deductStock
function deductStock(data) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var bomSheet = ss.getSheetByName('BOM');
  var outSheet = ss.getSheetByName('ตัดสต็อก');
  var ingSheet = ss.getSheetByName('วัตถุดิบ');
  if (!bomSheet || !outSheet || !ingSheet) return { success: false, error: 'ไม่พบชีท — กรุณารัน setupBOM() ก่อน' };
  var bomData = bomSheet.getDataRange().getValues().slice(1);
  var ingData = ingSheet.getDataRange().getValues().slice(1);
  var now = new Date();
  var rows = [];
  (data.items || []).forEach(function(ordered) {
    bomData.filter(function(row) { return String(row[0]) === String(ordered.menuId); }).forEach(function(line) {
      var ingId    = String(line[3]);
      var totalAmt = (Number(line[5]) || 0) * (Number(ordered.qty) || 1);
      var ingRow   = ingData.filter(function(r) { return String(r[0]) === ingId; })[0];
      var cost     = ingRow ? (Number(ingRow[5]) || 0) * totalAmt : 0;
      rows.push([now, data.orderNumber||'', data.tableNo||'', ordered.menuId, ordered.menuName||'', Number(ordered.qty)||1, ingId, line[4], totalAmt, line[6], cost]);
    });
  });
  if (rows.length > 0) {
    var lastRow = outSheet.getLastRow() + 1;
    outSheet.getRange(lastRow, 1, rows.length, 11).setValues(rows);
    outSheet.getRange(lastRow, 1, rows.length, 1).setNumberFormat('dd/mm/yyyy HH:mm');
  }
  return { success: true, deducted: rows.length };
}

// POST action=stockIn
function recordStockIn(data) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var inSheet = ss.getSheetByName('รับวัตถุดิบ');
  var ingSheet= ss.getSheetByName('วัตถุดิบ');
  if (!inSheet || !ingSheet) return { success: false, error: 'ไม่พบชีท — กรุณารัน setupBOM() ก่อน' };
  var ingData = ingSheet.getDataRange().getValues().slice(1);
  var now = new Date();
  var rows = [];
  (data.items || []).forEach(function(item) {
    var ingRow = ingData.filter(function(r) { return String(r[0]) === String(item.ingId); })[0];
    if (!ingRow) return;
    var price = Number(item.pricePerUnit) || Number(ingRow[5]) || 0;
    var qty   = Number(item.qty) || 0;
    rows.push([now, item.ingId, ingRow[1], qty, ingRow[3], price, qty * price, item.staff||'admin', item.note||'']);
  });
  if (rows.length > 0) {
    var lastRow = inSheet.getLastRow() + 1;
    inSheet.getRange(lastRow, 1, rows.length, 9).setValues(rows);
    inSheet.getRange(lastRow, 1, rows.length, 1).setNumberFormat('dd/mm/yyyy HH:mm');
  }
  return { success: true, recorded: rows.length };
}

// POST action=saveBOM
function saveBOM(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('BOM');
  if (!sh) return { success: false, error: 'ไม่พบชีท BOM — กรุณารัน setupBOM() ก่อน' };
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  var rows = (data.rows || []);
  if (rows.length === 0) return { success: true, saved: 0 };
  var values = rows.map(function(r) {
    return [r.menuId||'', r.menuName||'', r.menuNameEn||'', r.ingId||'', r.ingName||'', Number(r.qty)||0, r.unit||'', Number(r.costPerUnit)||0, r.note||''];
  });
  sh.getRange(2, 1, values.length, 9).setValues(values);
  return { success: true, saved: values.length };
}

// ── Sheet setup helpers (ใช้โดย setupBOM) ──
function _setupIngredients(ss) {
  var sh = ss.getSheetByName('วัตถุดิบ') || ss.insertSheet('วัตถุดิบ');
  sh.clearContents(); sh.clearFormats();
  var h = ['รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ชื่อ (EN)','หน่วย','สต็อกขั้นต่ำ','ราคา/หน่วย (฿)','หมวดหมู่','หมายเหตุ'];
  sh.getRange(1,1,1,h.length).setValues([h]);
  _bomStyleHeader(sh.getRange(1,1,1,h.length), '#1a3a5c');
  var d = [
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
  sh.getRange(2,1,d.length,h.length).setValues(d);
  sh.setFrozenRows(1);
}

function _setupBOM(ss) {
  var sh = ss.getSheetByName('BOM') || ss.insertSheet('BOM');
  sh.clearContents(); sh.clearFormats();
  var h = ['รหัสเมนู','ชื่อเมนู (TH)','ชื่อเมนู (EN)','รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ปริมาณ/จาน','หน่วย','ราคา/หน่วย (฿)','หมายเหตุ'];
  sh.getRange(1,1,1,h.length).setValues([h]);
  _bomStyleHeader(sh.getRange(1,1,1,h.length), '#2d4a22');
  sh.setFrozenRows(1);
}

function _setupStockIn(ss) {
  var sh = ss.getSheetByName('รับวัตถุดิบ') || ss.insertSheet('รับวัตถุดิบ');
  sh.clearContents(); sh.clearFormats();
  var h = ['วันที่','รหัส','ชื่อวัตถุดิบ','จำนวน','หน่วย','ราคา/หน่วย (฿)','รวมราคา (฿)','ผู้บันทึก','หมายเหตุ'];
  sh.getRange(1,1,1,h.length).setValues([h]);
  _bomStyleHeader(sh.getRange(1,1,1,h.length), '#7b3f00');
  var today = new Date();
  var sample = [
    [today,'ING-001','หมูสามชั้น',2000,'กรัม',0.08,160,'admin','ข้อมูลตัวอย่าง'],
    [today,'ING-003','กุ้งสด',1000,'กรัม',0.20,200,'admin','ข้อมูลตัวอย่าง'],
    [today,'ING-005','ข้าวสวย',5000,'กรัม',0.01,50,'admin','ข้อมูลตัวอย่าง'],
    [today,'ING-006','น้ำมันพืช',2000,'มล',0.03,60,'admin','ข้อมูลตัวอย่าง'],
    [today,'ING-009','กระเทียม',500,'กรัม',0.10,50,'admin','ข้อมูลตัวอย่าง'],
    [today,'ING-014','ไข่ไก่',30,'ฟอง',4.00,120,'admin','ข้อมูลตัวอย่าง'],
  ];
  sh.getRange(2,1,sample.length,h.length).setValues(sample);
  sh.setFrozenRows(1);
}

function _setupStockOut(ss) {
  var sh = ss.getSheetByName('ตัดสต็อก') || ss.insertSheet('ตัดสต็อก');
  sh.clearContents(); sh.clearFormats();
  var h = ['วันที่-เวลา','เลขออเดอร์','โต๊ะ','รหัสเมนู','ชื่อเมนู','จำนวนจาน','รหัสวัตถุดิบ','ชื่อวัตถุดิบ','ปริมาณตัด','หน่วย','ต้นทุน (฿)'];
  sh.getRange(1,1,1,h.length).setValues([h]);
  _bomStyleHeader(sh.getRange(1,1,1,h.length), '#4a0000');
  sh.setFrozenRows(1);
}

function _setupStockSummary(ss) {
  var sh = ss.getSheetByName('สรุปสต็อก') || ss.insertSheet('สรุปสต็อก');
  sh.clearContents(); sh.clearFormats();
  sh.getRange(1,1,1,8).merge();
  sh.getRange(1,1).setValue('📊 รายงานสต็อกวัตถุดิบ (คำนวณจาก รับเข้า − ตัดสต็อก)')
    .setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center')
    .setBackground('#1a1a2e').setFontColor('#ffffff');
  var h = ['รหัส','ชื่อวัตถุดิบ','หน่วย','รับเข้าทั้งหมด','ใช้ไปทั้งหมด','คงเหลือ','ขั้นต่ำ','สถานะ'];
  sh.getRange(2,1,1,h.length).setValues([h]);
  _bomStyleHeader(sh.getRange(2,1,1,h.length), '#16213e');
  sh.setFrozenRows(2);
  for (var r = 3; r <= 17; r++) {
    var i = r - 1;
    sh.getRange(r,1).setFormula('=IFERROR(วัตถุดิบ!A'+i+',"")');
    sh.getRange(r,2).setFormula('=IFERROR(วัตถุดิบ!B'+i+',"")');
    sh.getRange(r,3).setFormula('=IFERROR(วัตถุดิบ!D'+i+',"")');
    sh.getRange(r,4).setFormula('=IFERROR(SUMIF(รับวัตถุดิบ!B:B,A'+r+',รับวัตถุดิบ!D:D),0)');
    sh.getRange(r,5).setFormula('=IFERROR(SUMIF(ตัดสต็อก!G:G,A'+r+',ตัดสต็อก!I:I),0)');
    sh.getRange(r,6).setFormula('=D'+r+'-E'+r);
    sh.getRange(r,7).setFormula('=IFERROR(วัตถุดิบ!E'+i+',0)');
    sh.getRange(r,8).setFormula('=IF(A'+r+'="","",IF(F'+r+'<=0,"🔴 หมดแล้ว!",IF(F'+r+'<=G'+r+',"🟡 ใกล้หมด","🟢 ปกติ")))');
  }
}

function _bomStyleHeader(range, bgColor) {
  range.setBackground(bgColor).setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true,true,true,true,true,true,'#ffffff', SpreadsheetApp.BorderStyle.SOLID);
}
