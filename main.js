const { app, BrowserWindow } = require('electron');
const http = require('http');
const { SerialPort } = require('serialport');

let server;
let printWindow;
const PORT = 3210;

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network','true');
}
function json(res, code, data){ cors(res); res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); }
function body(req){ return new Promise((resolve,reject)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch(e){reject(e)}});req.on('error',reject)}) }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function receipt(o, settings, kitchen=false){
  const is58 = settings.width==='58';
  const paper = is58 ? '58mm' : '80mm';
  const content = is58 ? '54mm' : '76mm';
  const shop=esc(settings.shop||'بوفية توب كبدة');
  const items=(o.i||[]).map(x=>{
    const qty=Number(x[1])||0, price=Number(x[2])||0, total=qty*price;
    return `<div class="item"><div class="itemTop"><b>${esc(x[0])}</b><b>${total.toFixed(2)} ر.س</b></div><div class="itemMeta">${qty} × ${price.toFixed(2)} ر.س</div></div>`;
  }).join('');
  const car=o.t==='من السيارة';
  const customer = `<div class="card">
    <div class="cardTitle">بيانات العميل</div>
    ${o.n?`<div><span>الاسم</span><b>${esc(o.n)}</b></div>`:''}
    ${o.ph?`<div><span>الجوال</span><b dir="ltr">${esc(o.ph)}</b></div>`:''}
    <div><span>الاستلام</span><b>${esc(o.t||'من الفرع')}</b></div>
    <div><span>الوقت</span><b>${esc(o.w||'الآن')}</b></div>
    ${car?`<div><span>السيارة</span><b>${esc(o.c||'')} · ${esc(o.l||'')}</b></div><div><span>اللوحة</span><b dir="ltr">${esc(o.p||'')}</b></div>`:''}
  </div>`;
  const discount=Number(o.d)||0;
  const vat=Number(settings.vat)||0;
  const vatAmount=vat ? (Number(o.tot)||0)*vat/(100+vat) : 0;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    @page{size:${paper} auto;margin:0}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#111}
    body{width:${content};margin:0 auto;font-family:Tahoma,Arial,"Segoe UI",sans-serif;font-size:11px;line-height:1.45;overflow-wrap:anywhere}
    .wrap{padding:3mm 0 4mm}
    .head{text-align:center;border-bottom:1px solid #111;padding-bottom:7px;margin-bottom:7px}
    .brand{font-size:${is58?'15px':'17px'};font-weight:800;letter-spacing:.1px}
    .type{display:inline-block;margin-top:4px;padding:2px 8px;border:1px solid #111;border-radius:999px;font-weight:700}
    .meta{margin-top:5px;font-size:9px}
    .orderNo{font-size:13px;font-weight:800;margin-top:3px}
    .card{border:1px solid #bbb;border-radius:7px;padding:6px 7px;margin:7px 0}
    .cardTitle{font-size:10px;font-weight:800;margin-bottom:4px;border-bottom:1px solid #ddd;padding-bottom:3px}
    .card>div:not(.cardTitle){display:flex;justify-content:space-between;gap:7px;padding:1px 0}
    .card span{color:#555}.card b{font-weight:700;text-align:left}
    .sectionTitle{font-weight:800;font-size:10px;margin:7px 0 3px}
    .item{padding:5px 0;border-bottom:1px dashed #aaa}
    .itemTop{display:flex;justify-content:space-between;gap:5px;font-size:11px}
    .itemTop b:first-child{flex:1}
    .itemMeta{font-size:9px;color:#555;margin-top:1px}
    .sum{margin-top:6px;border-top:1px solid #111;padding-top:5px}
    .row{display:flex;justify-content:space-between;gap:7px;padding:2px 0}
    .total{font-size:15px;font-weight:900;border-top:1px solid #111;margin-top:4px;padding-top:5px}
    .note{border:1px solid #bbb;border-radius:6px;padding:5px 6px;margin-top:7px}
    .note b{display:block;font-size:10px;margin-bottom:2px}
    .foot{text-align:center;border-top:1px dashed #777;margin-top:8px;padding-top:6px;font-size:9px}
    .muted{font-size:9px;color:#555}
    .kitchen .head{border-bottom:2px solid #111}
    .kitchen .itemTop{font-size:13px}
    .kitchen .itemMeta{font-size:10px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{break-inside:avoid}}
  </style></head><body><div class="wrap ${kitchen?'kitchen':''}">
    <div class="head">
      <div class="brand">${kitchen?'🍳 طلب المطبخ':shop}</div>
      <div class="orderNo">طلب #${esc(o.r)}</div>
      <div class="meta">${esc(new Date(o.ts||Date.now()).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}))}</div>
      ${kitchen?`<div class="type">${esc(o.t||'')} · ${esc(o.w||'')}</div>`:''}
    </div>
    ${kitchen && car?`<div class="card"><div class="cardTitle">استلام من السيارة</div><div><span>السيارة</span><b>${esc(o.c||'')} · ${esc(o.l||'')}</b></div><div><span>اللوحة</span><b dir="ltr">${esc(o.p||'')}</b></div>${o.n?`<div><span>العميل</span><b>${esc(o.n)}</b></div>`:''}</div>`:''}
    ${kitchen?'':customer}
    <div class="sectionTitle">${kitchen?'الأصناف المطلوبة':'تفاصيل الطلب'}</div>
    ${items}
    ${o.no?`<div class="note"><b>ملاحظات</b>${esc(o.no)}</div>`:''}
    ${kitchen?'':`<div class="sum">
      <div class="row"><span>الإجمالي قبل الخصم</span><b>${(Number(o.tot||0)+discount).toFixed(2)} ر.س</b></div>
      ${discount?`<div class="row"><span>الخصم ${esc(o.cd||'')}</span><b>-${discount.toFixed(2)} ر.س</b></div>`:''}
      ${vat?`<div class="row"><span>ضريبة ${vat}% (مضمنة)</span><b>${vatAmount.toFixed(2)} ر.س</b></div>`:''}
      <div class="row total"><span>الإجمالي</span><b>${Number(o.tot||0).toFixed(2)} ر.س</b></div>
      ${o.pay&&o.pay!=='غير مدفوع'?`<div class="row"><span>طريقة الدفع</span><b>${esc(o.pay)}</b></div>`:''}
    </div>`}
    ${!kitchen&&settings.vatno?`<div class="muted" style="text-align:center;margin-top:5px">الرقم الضريبي: ${esc(settings.vatno)}</div>`:''}
    <div class="foot">${esc(settings.foot||'شكراً لزيارتكم')}</div>
  </div></body></html>`;
}
async function printers(){
  const win = printWindow || new BrowserWindow({show:false});
  let ps=[];
  try{ ps=await win.webContents.getPrintersAsync(); }catch(e){}
  let ports=[];
  try{ports=await SerialPort.list()}catch(e){}
  return {ok:true,printers:ps.map(p=>({name:p.name,displayName:p.displayName||p.name,isDefault:!!p.isDefault,status:p.status})),ports};
}
function findPrinter(settings, kitchen, discovered){
  const role=kitchen?'kitchen':'cashier';
  const cfg=(settings.printers||[]).find(p=>p && (p.role==='both'||p.role===role) && p.n && p.n!=='طابعة جديدة');
  if(cfg){const exact=discovered.find(x=>x.name===cfg.n||x.displayName===cfg.n);if(exact)return exact.name;}
  const def=discovered.find(x=>x.isDefault); return def?def.name:null;
}
async function silentPrint(html, deviceName){
  if(!printWindow) printWindow=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
  await printWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  return await new Promise((resolve,reject)=>{
    printWindow.webContents.print({silent:true,printBackground:false,deviceName:deviceName||undefined,copies:1},(success,failureReason)=>success?resolve(true):reject(new Error(failureReason||'تعذرت الطباعة')));
  });
}
async function doPrint(payload){
  const o=payload.order||{}; const settings=payload.settings||{};
  const discovered=(await printers()).printers||[];
  const targets=[];
  const add=(k)=>{const d=findPrinter(settings,k,discovered);targets.push({k,d})};
  add(false); add(true);
  const uniq=[]; for(const t of targets){const key=(t.d||'__default__')+'|'+t.k;if(!uniq.some(x=>x.d===t.d&&x.k===t.k))uniq.push(t)}
  let printed=0; const errors=[];
  for(const t of uniq){try{await silentPrint(receipt(o,settings,t.k==='k'),t.d);printed++}catch(e){errors.push((t.k==='k'?'المطبخ':'الكاشير')+': '+e.message)}}
  return {ok:printed>0,printed,errors,printers:discovered};
}
function startServer(){
 server=http.createServer(async(req,res)=>{
   cors(res);
   if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
   try{
     if(req.method==='GET'&&req.url==='/health')return json(res,200,{ok:true,service:'Top Kabda Print Bridge',port:PORT});
     if(req.method==='GET'&&req.url==='/printers')return json(res,200,await printers());
     if(req.method==='POST'&&req.url==='/print')return json(res,200,await doPrint(await body(req)));
     return json(res,404,{ok:false,error:'Not found'});
   }catch(e){return json(res,500,{ok:false,error:e.message})}
 });
 server.listen(PORT,'127.0.0.1');
}
app.whenReady().then(()=>{
  try{ app.setLoginItemSettings({openAtLogin:true}); }catch(e){}
  printWindow=new BrowserWindow({show:false});
  startServer();
});
app.on('window-all-closed',e=>e.preventDefault());
app.on('before-quit',()=>{try{server?.close()}catch(e){}});
