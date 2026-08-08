const SHEETS_URL_KEY = 'stock_sheets_webapp_url_v1';

function getSheetsUrl(){ return localStorage.getItem(SHEETS_URL_KEY) || ''; }
function setSheetsUrl(url){ localStorage.setItem(SHEETS_URL_KEY, String(url||'').trim()); }

async function sheetsGet(action='load'){
  const url=getSheetsUrl();
  if(!url) throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script Web App URL');
  const r=await fetch(url+'?action='+encodeURIComponent(action),{method:'GET',redirect:'follow'});
  const data=await r.json();
  if(!data.ok) throw new Error(data.error||'Google Sheets error');
  return data;
}

async function sheetsPost(payload){
  const url=getSheetsUrl();
  if(!url) throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script Web App URL');
  const r=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  const data=await r.json();
  if(!data.ok) throw new Error(data.error||'Google Sheets error');
  return data;
}

async function loadFromSheets(){
  const data=await sheetsGet('load');
  products=(data.products||[]).map(p=>({...p,cost:+p.cost||0,price:+p.price||0,qty:+p.qty||0,min:+p.min||0}));
  tx=(data.transactions||[]).map(t=>({...t,time:+t.time||Date.parse(t.time)||Date.now(),qty:+t.qty||0,unitPrice:+t.unitPrice||0,cost:+t.cost||0,amount:+t.amount||0}));
  localStorage.setItem(KEY_P,JSON.stringify(products));
  localStorage.setItem(KEY_T,JSON.stringify(tx));
  renderAll();
}

async function syncProductToSheets(product, oldQty=null){
  await sheetsPost({action:'saveProduct',product});
  if(oldQty!==null && +oldQty!==+product.qty){
    await sheetsPost({action:'adjust',productId:product.id,qty:+product.qty,note:'ปรับยอดจากหน้าสินค้า'});
  }
  await loadFromSheets();
}

async function syncDeleteProduct(id){ await sheetsPost({action:'deleteProduct',id}); await loadFromSheets(); }
async function syncSale(productId,qty,unitPrice){ await sheetsPost({action:'sale',productId,qty,unitPrice}); await loadFromSheets(); }
async function syncReceive(productId,qty,note){ await sheetsPost({action:'receive',productId,qty,note}); await loadFromSheets(); }
async function migrateLocalToSheets(){
  await sheetsPost({action:'replaceAll',products,transactions:tx});
  await loadFromSheets();
}
