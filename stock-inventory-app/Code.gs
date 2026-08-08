const PRODUCTS_SHEET = 'Products';
const TX_SHEET = 'Transactions';

function setupSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let p = ss.getSheetByName(PRODUCTS_SHEET);
  if (!p) p = ss.insertSheet(PRODUCTS_SHEET);
  let t = ss.getSheetByName(TX_SHEET);
  if (!t) t = ss.insertSheet(TX_SHEET);

  if (p.getLastRow() === 0) {
    p.getRange(1,1,1,7).setValues([['id','barcode','name','cost','price','qty','min']]);
    p.setFrozenRows(1);
  }
  if (t.getLastRow() === 0) {
    t.getRange(1,1,1,10).setValues([['id','time','type','productId','name','qty','unitPrice','cost','amount','note']]);
    t.setFrozenRows(1);
  }
  return {ok:true, spreadsheetId:ss.getId(), spreadsheetName:ss.getName()};
}

function doGet(e) {
  try {
    setupSystem();
    const action = (e && e.parameter && e.parameter.action) || 'load';
    if (action === 'ping') return json_({ok:true, message:'Google Sheets API พร้อมใช้งาน'});
    if (action === 'load') return json_(loadAll_());
    return json_({ok:false, error:'Unknown action'});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function doPost(e) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    setupSystem();
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = body.action;
    let result;

    if (action === 'saveProduct') result = saveProduct_(body.product);
    else if (action === 'deleteProduct') result = deleteProduct_(body.id);
    else if (action === 'sale') result = sale_(body);
    else if (action === 'receive') result = receive_(body);
    else if (action === 'adjust') result = adjust_(body);
    else if (action === 'replaceAll') result = replaceAll_(body.products || [], body.transactions || []);
    else result = {ok:false, error:'Unknown action'};

    SpreadsheetApp.flush();
    return json_(result);
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  } finally {
    lock.releaseLock();
  }
}

function loadAll_() {
  return {ok:true, products:readObjects_(PRODUCTS_SHEET), transactions:readObjects_(TX_SHEET)};
}

function saveProduct_(product) {
  if (!product || !String(product.barcode || '').trim() || !String(product.name || '').trim()) {
    return {ok:false, error:'กรุณากรอกบาร์โค้ดและชื่อสินค้า'};
  }
  const sh = SpreadsheetApp.getActive().getSheetByName(PRODUCTS_SHEET);
  const rows = readObjects_(PRODUCTS_SHEET);
  const dup = rows.find(x => String(x.barcode) === String(product.barcode) && String(x.id) !== String(product.id));
  if (dup) return {ok:false, error:'บาร์โค้ดนี้มีอยู่แล้ว'};

  const row = [String(product.id), String(product.barcode), String(product.name), num_(product.cost), num_(product.price), num_(product.qty), num_(product.min)];
  const idx = rows.findIndex(x => String(x.id) === String(product.id));
  if (idx >= 0) sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return {ok:true};
}

function deleteProduct_(id) {
  const sh = SpreadsheetApp.getActive().getSheetByName(PRODUCTS_SHEET);
  const rows = readObjects_(PRODUCTS_SHEET);
  const idx = rows.findIndex(x => String(x.id) === String(id));
  if (idx < 0) return {ok:false, error:'ไม่พบสินค้า'};
  sh.deleteRow(idx + 2);
  return {ok:true};
}

function sale_(body) {
  const p = findProduct_(body.productId);
  const qty = Math.max(1, num_(body.qty));
  const price = Math.max(0, num_(body.unitPrice));
  if (!p) return {ok:false, error:'ไม่พบสินค้า'};
  if (num_(p.qty) < qty) return {ok:false, error:'สต๊อกไม่พอ เหลือ ' + p.qty + ' ชิ้น'};
  updateQty_(p.id, num_(p.qty) - qty);
  appendTx_({id:uid_(), time:Date.now(), type:'sale', productId:p.id, name:p.name, qty:-qty, unitPrice:price, cost:num_(p.cost), amount:qty*price, note:body.note || ''});
  return {ok:true};
}

function receive_(body) {
  const p = findProduct_(body.productId);
  const qty = Math.max(1, num_(body.qty));
  if (!p) return {ok:false, error:'ไม่พบสินค้า'};
  updateQty_(p.id, num_(p.qty) + qty);
  appendTx_({id:uid_(), time:Date.now(), type:'receive', productId:p.id, name:p.name, qty:qty, unitPrice:0, cost:num_(p.cost), amount:0, note:body.note || ''});
  return {ok:true};
}

function adjust_(body) {
  const p = findProduct_(body.productId);
  if (!p) return {ok:false, error:'ไม่พบสินค้า'};
  const newQty = Math.max(0, num_(body.qty));
  const diff = newQty - num_(p.qty);
  updateQty_(p.id, newQty);
  if (diff !== 0) appendTx_({id:uid_(), time:Date.now(), type:'adjust', productId:p.id, name:p.name, qty:diff, unitPrice:0, cost:num_(p.cost), amount:0, note:body.note || 'ปรับยอด'});
  return {ok:true};
}

function replaceAll_(products, transactions) {
  const ss = SpreadsheetApp.getActive();
  const ps = ss.getSheetByName(PRODUCTS_SHEET);
  const ts = ss.getSheetByName(TX_SHEET);
  ps.clearContents(); ts.clearContents();
  ps.getRange(1,1,1,7).setValues([['id','barcode','name','cost','price','qty','min']]);
  ts.getRange(1,1,1,10).setValues([['id','time','type','productId','name','qty','unitPrice','cost','amount','note']]);
  if (products.length) ps.getRange(2,1,products.length,7).setValues(products.map(p=>[p.id,p.barcode,p.name,num_(p.cost),num_(p.price),num_(p.qty),num_(p.min)]));
  if (transactions.length) ts.getRange(2,1,transactions.length,10).setValues(transactions.map(t=>[t.id,t.time,t.type,t.productId,t.name,num_(t.qty),num_(t.unitPrice),num_(t.cost),num_(t.amount),t.note||'']));
  return {ok:true};
}

function findProduct_(id) {
  return readObjects_(PRODUCTS_SHEET).find(x => String(x.id) === String(id));
}

function updateQty_(id, qty) {
  const sh = SpreadsheetApp.getActive().getSheetByName(PRODUCTS_SHEET);
  const rows = readObjects_(PRODUCTS_SHEET);
  const idx = rows.findIndex(x => String(x.id) === String(id));
  if (idx < 0) throw new Error('ไม่พบสินค้า');
  sh.getRange(idx + 2, 6).setValue(qty);
}

function appendTx_(t) {
  SpreadsheetApp.getActive().getSheetByName(TX_SHEET).appendRow([t.id,t.time,t.type,t.productId,t.name,t.qty,t.unitPrice,t.cost,t.amount,t.note]);
}

function readObjects_(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '')).map(r => {
    const o = {};
    headers.forEach((h,i) => o[h] = r[i]);
    return o;
  });
}

function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function uid_() { return Utilities.getUuid(); }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
