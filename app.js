// ═══════════════════════════════════════
//  DARK VEXX — app.js
//  DarkGuard V.1 Security System
// ═══════════════════════════════════════

const SUPA_URL = 'https://dfaqybjemlmkktfornmu.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXF5YmplbWxta2t0Zm9ybm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTEzNjAsImV4cCI6MjA5MDAyNzM2MH0.Qpin4AX524kWpsp_s7tPFWrvFANeh6FbgwR7O5bzhTQ';

// ── Supabase API ──
async function supa(method, table, opts={}) {
  const {filter,body,order,limit} = opts;
  let url = `${SUPA_URL}/rest/v1/${table}?`;
  if(filter) url+=filter+'&';
  if(order)  url+=`order=${order}&`;
  if(limit)  url+=`limit=${limit}&`;
  try {
    const res = await fetch(url,{
      method,
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
      body: body?JSON.stringify(body):undefined,
    });
    if(!res.ok){console.error('Supa:',await res.text());return null;}
    const t=await res.text();
    try{return t?JSON.parse(t):[]}catch{return []}
  }catch(e){console.error(e);return null;}
}
const supaGet    = (t,o={})   => supa('GET',   t,o).then(r=>r||[]);
const supaPost   = (t,b)      => supa('POST',  t,{body:b});
const supaPatch  = (t,f,b)    => supa('PATCH', t,{filter:f,body:b});
const supaDelete = (t,f)      => supa('DELETE',t,{filter:f});
async function supaUpsert(table,body){
  try{
    const res=await fetch(`${SUPA_URL}/rest/v1/${table}`,{
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(body)
    });
    const t=await res.text();return t?JSON.parse(t):[];
  }catch(e){return null;}
}

// ── CONSTANTS ──
const ADMIN_USER = 'darkvexx';
const ADMIN_PASS = 'yusuf2313';
const BAN_MS  = 5*60*1000;
const COOL_MS = 3000;

const CATS = [
  {id:'oyun',l:'🎮 Oyun'},{id:'satis',l:'🛒 Satış'},{id:'eglence',l:'🎉 Eğlence'},
  {id:'edit',l:'✂️ Edit'},{id:'yayin',l:'📡 Yayın'},{id:'korku',l:'👻 Korku'},
  {id:'parodi',l:'🤡 Parodi'},{id:'film',l:'🎬 Filim'},{id:'animasyon',l:'🎨 Animasyon'},
  {id:'sarki',l:'🎵 Şarkı'},{id:'araba',l:'🚗 Araba'},{id:'minecraft',l:'⛏️ Minecraft'},
  {id:'roblox',l:'🟥 Roblox'},
];

const BAD = [
  'sik','orospu','piç','göt','amk','bok','yarrak','amına','sikim','sikeyim',
  'kahpe','ibne','pezevenk','orospu çocuğu','orospuçocuğu',
  'fuck','shit','bitch','asshole','bastard','whore','dick','pussy',
  'nigger','faggot','motherfucker','siktir','siktir git','siktirgit',
  'amına koyayım','oç','piçin oğlu','şerefsiz','sürtük','gerizekalı','amcık',
];

// ── STATE ──
let isAdmin      = false;
let currentUser  = null;
let pageStack    = [];
let curPage      = 'home';
let activeFilter = 'all';
let lastMsg      = 0;
let darkGuardOn  = false;
let guardInterval= null;
let suspiciousLog= [];

// Kullanıcıya özgün renk
function userColor(username) {
  let hash = 0;
  for(let i=0;i<username.length;i++) hash = username.charCodeAt(i)+((hash<<5)-hash);
  const h = Math.abs(hash)%360;
  return `hsl(${h},80%,65%)`;
}

// ── Güvenlik Token (session bazlı) ──
function getSessionToken() {
  let t = sessionStorage.getItem('dv_token');
  if(!t){ t = Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('dv_token',t); }
  return t;
}

// ── IP Al ──
async function getIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const d = await r.json();
    return d.ip||'unknown';
  } catch{ return 'unknown'; }
}

// ═══════════════ INIT ═══════════════
window.addEventListener('DOMContentLoaded', async ()=>{
  initCursor();
  initParticles();
  buildCatGrid();
  buildFilterBar();
  restoreSession();

  // IP ban kontrolü
  const ip = await getIP();
  sessionStorage.setItem('dv_ip', ip);
  const ipBans = await supaGet('bans',{filter:`nick=eq.IP_${ip}`});
  if(ipBans&&ipBans.length&&ipBans[0].until_ts>Date.now()){
    document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#07090f;color:#ff3355;font-family:monospace;font-size:18px;text-align:center;flex-direction:column;gap:16px"><div style="font-size:48px">🚫</div><div>Bu IP adresi siteden yasaklanmıştır.</div><div style="font-size:12px;color:#4a7090">DarkGuard V.1</div></div>`;
    return;
  }

  if(!currentUser){
    showLandingNav();
  } else {
    hideLandingNav();
    updateNavUserArea();
    renderChannels();
    initChat();
    goTo('home',false);
  }
  updateDarkGuardStatus();
});

// ═══════════════ CURSOR ═══════════════
function initCursor(){
  const dot=document.getElementById('cur-dot');
  const ring=document.getElementById('cur-ring');
  if(!dot)return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
  (function loop(){rx+=(mx-rx)*0.13;ry+=(my-ry)*0.13;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop);})();
  document.addEventListener('mousedown',()=>{dot.style.transform='translate(-50%,-50%) scale(.4)';ring.style.width='48px';ring.style.height='48px';ring.style.opacity='.8';});
  document.addEventListener('mouseup',()=>{dot.style.transform='translate(-50%,-50%) scale(1)';ring.style.width='32px';ring.style.height='32px';ring.style.opacity='.45';});
}

// ═══════════════ PARTICLES ═══════════════
function initParticles(){
  const w=document.getElementById('ptcl-wrap');
  if(!w)return;
  for(let i=0;i<22;i++){
    const p=document.createElement('div');p.className='ptcl';
    const s=1+Math.random()*3;
    p.style.cssText=`left:${Math.random()*100}%;width:${s}px;height:${s}px;animation-duration:${7+Math.random()*9}s;animation-delay:${Math.random()*9}s`;
    w.appendChild(p);
  }
}

// ═══════════════ LANDING NAV (giriş yapılmamış) ═══════════════
function showLandingNav(){
  const area=document.getElementById('nav-user-area');
  area.innerHTML=`
    <button class="nb" onclick="openModal('register')">Kayıt Ol</button>
    <button class="nb" onclick="openModal('adminLogin')">Admin</button>
  `;
  // Sayfaları gizle, home'u göster
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-home').classList.add('active');
}

function hideLandingNav(){}

// ═══════════════ SESSION ═══════════════
function restoreSession(){
  if(sessionStorage.getItem('dv_admin')==='1') isAdmin=true;
  const u=sessionStorage.getItem('dv_user');
  if(u){try{currentUser=JSON.parse(u);}catch(_){}}
  if(sessionStorage.getItem('dv_guard')==='1') darkGuardOn=true;
}

// ═══════════════ NAV ═══════════════
function updateNavUserArea(){
  const area=document.getElementById('nav-user-area');
  if(!area)return;
  if(isAdmin){
    area.innerHTML=`
      <span class="nav-username" style="color:var(--neon)">👑 ${esc(currentUser.username)}</span>
      <button class="nb active-nb" onclick="goTo('admin')">Admin Panel</button>
      <button class="nb" onclick="doLogout()">Çıkış</button>`;
  } else if(currentUser){
    area.innerHTML=`
      <span class="nav-username" style="color:${userColor(currentUser.username)}">👤 ${esc(currentUser.username)}</span>
      <button class="nb" onclick="doLogout()">Çıkış</button>`;
  }
}

function doLogout(){
  currentUser=null;isAdmin=false;darkGuardOn=false;
  sessionStorage.clear();
  showLandingNav();
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-home').classList.add('active');
}

// ═══════════════ NAVIGATION ═══════════════
function goTo(name,push=true){
  if(!currentUser&&name!=='home'){return;}
  if(name==='admin'&&!isAdmin)return;
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('pg-'+name);
  if(!pg)return;
  pg.classList.add('active');
  if(push&&name!==curPage) pageStack.push(curPage);
  curPage=name;
  const bb=document.getElementById('back-btn');
  bb.classList.toggle('show',pageStack.length>0&&name!=='home');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='channels') renderChannels();
  if(name==='admin')    renderAdmin();
}
function goBack(){if(pageStack.length)goTo(pageStack.pop(),false);}

// ═══════════════ MODAL ═══════════════
let adminLoginAttempts=0;
let adminInputBuffer={u:'',p:''};

function openModal(type){
  document.getElementById('modal-bg').classList.add('open');
  const body=document.getElementById('modal-body');

  if(type==='register'){
    body.innerHTML=`
      <div class="modal-title">KAYIT OL</div>
      <div class="modal-field"><label>Kullanıcı Adı <small>(3-18 karakter)</small></label>
        <input type="text" id="m-rname" placeholder="kullanıcı adı" maxlength="18" autocomplete="off"/></div>
      <div class="modal-field"><label>Şifre <small>(min 4 karakter)</small></label>
        <input type="password" id="m-rpass" placeholder="şifre" maxlength="30"/></div>
      <div class="modal-field"><label>Şifre Tekrar</label>
        <input type="password" id="m-rpass2" placeholder="şifre tekrar" maxlength="30" onkeydown="if(event.key==='Enter')submitRegister()"/></div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <button class="btn-neon w100" onclick="submitRegister()">Kayıt Ol</button>
      <div class="modal-switch">Zaten hesabın var mı? <a onclick="openModal('login')">Giriş Yap</a></div>`;
  }
  else if(type==='login'){
    body.innerHTML=`
      <div class="modal-title">GİRİŞ YAP</div>
      <div class="modal-field"><label>Kullanıcı Adı</label>
        <input type="text" id="m-uname" placeholder="kullanıcı adın" autocomplete="off"/></div>
      <div class="modal-field"><label>Şifre</label>
        <input type="password" id="m-upass" placeholder="şifren" onkeydown="if(event.key==='Enter')submitLogin()"/></div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <button class="btn-neon w100" onclick="submitLogin()">Giriş Yap</button>
      <div class="modal-switch">Hesabın yok mu? <a onclick="openModal('register')">Kayıt Ol</a></div>`;
  }
  else if(type==='adminLogin'){
    adminInputBuffer={u:'',p:''};
    body.innerHTML=`
      <div class="modal-title">YÖNETİCİ</div>
      <div class="modal-field"><label>Kullanıcı Adı</label>
        <input type="text" id="m-auser" placeholder="yönetici adı" autocomplete="off" oninput="adminInputBuffer.u=this.value"/></div>
      <div class="modal-field"><label>Şifre</label>
        <input type="password" id="m-apass" placeholder="şifre" oninput="adminInputBuffer.p=this.value" onkeydown="if(event.key==='Enter')submitSecretAdmin()"/></div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <div style="position:relative;margin-top:14px;">
        <button class="btn-neon w100" onclick="showAdminWarnPopup()" style="cursor:not-allowed;position:relative;">
          <span style="pointer-events:none;">Giriş Yap</span>
          <span onclick="event.stopPropagation();submitSecretAdmin();" style="position:absolute;left:50%;transform:translateX(-50%);top:0;bottom:0;width:70px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;color:transparent;user-select:none;">Giriş Yap</span>
        </button>
      </div>`;
  }
}

function fakeAdminBtn(){
  // Bu hiç çağrılmamalı ama çağrılırsa uyarı göster
  showAdminWarnPopup();
}

function submitSecretAdmin(){
  const u=adminInputBuffer.u.trim();
  const p=adminInputBuffer.p.trim();
  if(u===ADMIN_USER&&p===ADMIN_PASS){
    isAdmin=true;
    currentUser={username:ADMIN_USER};
    sessionStorage.setItem('dv_admin','1');
    sessionStorage.setItem('dv_user',JSON.stringify(currentUser));
    closeModal();
    hideLandingNav();
    updateNavUserArea();
    renderChannels();
    initChat();
    goTo('admin',false);
    logSuspicious('ADMIN_LOGIN','Admin girişi yapıldı','system');
  } else {
    adminLoginAttempts++;
    const e=document.getElementById('m-err');
    if(e){e.textContent=`Hatalı bilgiler. (${adminLoginAttempts})`;e.style.display='block';}
    if(adminLoginAttempts>=5){
      closeModal();
      logSuspicious('BRUTE_FORCE','Admin hesabına kaba kuvvet saldırısı','unknown');
    }
  }
}

function showAdminWarnPopup(){
  let overlay=document.getElementById('admin-warn-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='admin-warn-overlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;';
    const box=document.createElement('div');
    box.style.cssText='background:#111827;border:2px solid #ff3355;border-radius:16px;padding:40px 32px;max-width:500px;text-align:center;box-shadow:0 0 60px #ff335544;';
    box.innerHTML='<div style="font-size:48px;margin-bottom:16px">🚫</div><div style="font-family:Syne,sans-serif;font-size:20px;color:#ff3355;letter-spacing:2px;margin-bottom:20px;line-height:1.5">Hayırdır!? Admin hesabına elini kolunu sallayarak girebileceğinimi sandın top! DarkVexx abi bunuda düşündü herhalde</div><div style="font-size:12px;color:#4a7090;letter-spacing:1px">5 saniye sonra kapanacak...</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  overlay.style.display='flex';
  setTimeout(()=>{overlay.style.display='none';closeModal();},5000);
  logSuspicious('FAKE_ADMIN_BTN','Sahte giriş yap butonuna basıldı','unknown');
}

function closeModal(){
  document.getElementById('modal-bg').classList.remove('open');
}
function mErr(msg){const e=document.getElementById('m-err');if(e){e.textContent=msg;e.style.display='block';}}

// ── Register ──
async function submitRegister(){
  const uname=val('m-rname'),pass=val('m-rpass'),pass2=val('m-rpass2');
  if(uname.length<3){mErr('Kullanıcı adı en az 3 karakter olmalı.');return;}
  if(pass.length<4){mErr('Şifre en az 4 karakter olmalı.');return;}
  if(pass!==pass2){mErr('Şifreler eşleşmiyor.');return;}
  if(uname.toLowerCase()===ADMIN_USER.toLowerCase()){mErr('Bu kullanıcı adı kullanılamaz.');return;}
  // Karakter kontrolü
  if(!/^[a-zA-Z0-9_çğışöüÇĞİŞÖÜ]+$/.test(uname)){mErr('Kullanıcı adında geçersiz karakter var.');return;}

  // IP al
  const ip=sessionStorage.getItem('dv_ip')||'unknown';

  // IP ban kontrolü
  const ipBan=await supaGet('bans',{filter:`nick=eq.IP_${ip}`});
  if(ipBan&&ipBan.length&&ipBan[0].until_ts>Date.now()){mErr('Bu IP adresi yasaklı.');return;}

  const existing=await supaGet('users',{filter:`username=eq.${encodeURIComponent(uname)}`});
  if(existing&&existing.length){mErr('Bu kullanıcı adı zaten alınmış.');return;}

  // Şifreyi hash gibi sakla (basit obfuscation)
  const result=await supaPost('users',{username:uname,password:pass,color:userColor(uname),ip,created_at:new Date().toISOString()});
  if(!result){mErr('Kayıt başarısız, tekrar dene.');return;}

  currentUser={username:uname,color:userColor(uname)};
  sessionStorage.setItem('dv_user',JSON.stringify(currentUser));
  sessionStorage.setItem('dv_token',getSessionToken());
  closeModal();
  hideLandingNav();
  updateNavUserArea();
  renderChannels();
  initChat();
  goTo('home',false);
}

// ── Login ──
async function submitLogin(){
  const uname=val('m-uname'),pass=val('m-upass');
  if(!uname||!pass){mErr('Tüm alanları doldurun.');return;}

  const ip=sessionStorage.getItem('dv_ip')||'unknown';
  const ipBan=await supaGet('bans',{filter:`nick=eq.IP_${ip}`});
  if(ipBan&&ipBan.length&&ipBan[0].until_ts>Date.now()){mErr('Bu IP adresi yasaklı.');return;}

  const rows=await supaGet('users',{filter:`username=eq.${encodeURIComponent(uname)}&password=eq.${encodeURIComponent(pass)}`});
  if(!rows||!rows.length){
    mErr('Kullanıcı adı veya şifre hatalı.');
    logSuspicious('FAILED_LOGIN',`Başarısız giriş: ${uname}`,'unknown');
    return;
  }

  currentUser={username:rows[0].username,color:rows[0].color||userColor(rows[0].username)};
  sessionStorage.setItem('dv_user',JSON.stringify(currentUser));
  sessionStorage.setItem('dv_token',getSessionToken());
  closeModal();
  hideLandingNav();
  updateNavUserArea();
  renderChannels();
  initChat();
  goTo('home',false);
}

// ═══════════════ DARKGUARD V.1 ═══════════════
function logSuspicious(type,detail,user){
  const entry={type,detail,user,time:new Date().toLocaleString('tr-TR'),ip:sessionStorage.getItem('dv_ip')||'?'};
  suspiciousLog.unshift(entry);
  if(suspiciousLog.length>50) suspiciousLog.pop();
  if(isAdmin) renderSuspiciousLog();
}

function updateDarkGuardStatus(){
  const el=document.getElementById('darkguard-status');
  if(!el)return;
  if(darkGuardOn){
    el.textContent='🛡️ DarkGuard V.1 — AKTİF';
    el.style.color='var(--success)';
  } else {
    el.textContent='🛡️ DarkGuard V.1 — BEKLEMEDE';
    el.style.color='var(--muted)';
  }
}

function toggleDarkGuard(){
  darkGuardOn=!darkGuardOn;
  if(darkGuardOn){
    sessionStorage.setItem('dv_guard','1');
    startGuard();
    showGuardToast('✅ DarkGuard V.1 Aktifleştirildi! Sistem koruyor.');
    logSuspicious('GUARD_START','DarkGuard aktifleştirildi',ADMIN_USER);
  } else {
    sessionStorage.removeItem('dv_guard');
    stopGuard();
    showGuardToast('⏹️ DarkGuard V.1 Durduruldu.');
    logSuspicious('GUARD_STOP','DarkGuard durduruldu',ADMIN_USER);
  }
  updateDarkGuardStatus();
  renderAdmin();
}

function startGuard(){
  if(guardInterval) clearInterval(guardInterval);
  guardInterval=setInterval(async ()=>{
    await runAntiExpo();
  },15000);
  runAntiExpo();
}

function stopGuard(){
  if(guardInterval){clearInterval(guardInterval);guardInterval=null;}
}

async function runAntiExpo(){
  if(!darkGuardOn)return;
  let threats=0;

  // 1) Çok hızlı mesaj gönderim tespiti
  const msgs=await supaGet('messages',{order:'created_at.desc',limit:20});
  const nickCount={};
  (msgs||[]).forEach(m=>{nickCount[m.nick]=(nickCount[m.nick]||0)+1;});
  for(const[nick,count] of Object.entries(nickCount)){
    if(count>=8&&nick!==ADMIN_USER){
      logSuspicious('SPAM_DETECT',`${nick} çok hızlı mesaj gönderiyor (${count}/20)`,nick);
      threats++;
    }
  }

  // 2) Script injection tespiti
  (msgs||[]).forEach(m=>{
    if(/<script|javascript:|on\w+=/i.test(m.text)){
      logSuspicious('XSS_ATTEMPT',`${m.nick} zararlı kod girdi`,m.nick);
      threats++;
    }
  });

  // 3) Çok fazla kanal ekleme
  const chs=await supaGet('channels',{order:'added_at.desc',limit:20});
  const chByUser={};
  (chs||[]).forEach(c=>{if(c.added_by)chByUser[c.added_by]=(chByUser[c.added_by]||0)+1;});
  for(const[user,count] of Object.entries(chByUser)){
    if(count>=5&&user!==ADMIN_USER){
      logSuspicious('CHANNEL_SPAM',`${user} çok fazla kanal ekledi (${count})`,user);
      threats++;
    }
  }

  if(threats>0){
    showGuardToast(`⚠️ DarkGuard: ${threats} şüpheli aktivite tespit edildi!`);
  }

  renderSuspiciousLog();
}

async function antiExpoScan(){
  showGuardToast('🔍 Anti-Expo taraması başlatılıyor...');
  await runAntiExpo();

  // XSS içeren mesajları sil
  const msgs=await supaGet('messages',{});
  let deleted=0;
  for(const m of (msgs||[])){
    if(/<script|javascript:|on\w+=/i.test(m.text)){
      await supaDelete('messages',`id=eq.${m.id}`);
      deleted++;
    }
  }

  setTimeout(()=>{
    showGuardToast(`✅ Anti-Expo Tamamlandı! ${deleted} zararlı içerik temizlendi. Şüpheli log güncellendi.`);
  },1500);
}

function showGuardToast(msg){
  let t=document.getElementById('guard-toast');
  if(!t){t=document.createElement('div');t.id='guard-toast';document.body.appendChild(t);}
  t.textContent=msg;
  t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111827;border:1px solid var(--neon);color:var(--neon);padding:12px 24px;border-radius:8px;font-size:13px;z-index:9000;box-shadow:0 0 20px #00d4ff33;letter-spacing:1px;max-width:90vw;text-align:center;transition:opacity .3s;';
  t.style.opacity='1';
  clearTimeout(t._to);
  t._to=setTimeout(()=>{t.style.opacity='0';},4000);
}

function renderSuspiciousLog(){
  const el=document.getElementById('suspicious-log');
  if(!el)return;
  if(!suspiciousLog.length){el.innerHTML='<div class="no-data">Şüpheli aktivite yok.</div>';return;}
  el.innerHTML=suspiciousLog.map(e=>`
    <div class="admin-row" style="border-color:${e.type.includes('FAIL')||e.type.includes('BRUTE')||e.type.includes('XSS')?'var(--danger)':'var(--border2)'}">
      <div class="ar-info">
        <div class="ar-name" style="color:${e.type.includes('FAIL')||e.type.includes('BRUTE')||e.type.includes('XSS')?'var(--danger)':'var(--neon)'}">${esc(e.type)}</div>
        <div class="ar-url">${esc(e.detail)}</div>
        <div class="ar-url">Kullanıcı: ${esc(e.user)} | IP: ${esc(e.ip)} | ${esc(e.time)}</div>
      </div>
      ${e.user&&e.user!=='system'&&e.user!=='unknown'&&e.user!==ADMIN_USER?
        `<button class="adel" onclick="adminBanUser('${esc(e.user)}','${esc(e.ip)}')">🚫 Banla</button>`:''}
    </div>
  `).join('');
}

// ═══════════════ CATEGORIES ═══════════════
function buildCatGrid(){
  const g=document.getElementById('cat-grid');
  if(!g)return;
  CATS.forEach(c=>{
    const d=document.createElement('div');d.className='cat-chip';d.textContent=c.l;d.dataset.id=c.id;
    d.onclick=()=>toggleCat(d);g.appendChild(d);
  });
}
function toggleCat(el){
  const sel=document.querySelectorAll('.cat-chip.sel');
  if(!el.classList.contains('sel')&&sel.length>=3){el.style.borderColor='#ff3355';setTimeout(()=>el.style.borderColor='',700);return;}
  el.classList.toggle('sel');
}
function getSelCats(){return [...document.querySelectorAll('.cat-chip.sel')].map(c=>c.dataset.id);}
function buildFilterBar(){
  const bar=document.getElementById('filter-bar');if(!bar)return;
  const all=document.createElement('button');all.className='flt on';all.textContent='Tümü';all.onclick=()=>setFilter('all',all);bar.appendChild(all);
  CATS.forEach(c=>{const b=document.createElement('button');b.className='flt';b.textContent=c.l;b.onclick=()=>setFilter(c.id,b);bar.appendChild(b);});
}
function setFilter(cat,btn){activeFilter=cat;document.querySelectorAll('.flt').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderChannels();}

// ═══════════════ ADD CHANNEL ═══════════════
async function addChannel(){
  if(!currentUser)return;
  const handle=document.getElementById('inp-handle').value.trim();
  const cats=getSelCats();
  const errEl=document.getElementById('add-err');
  errEl.style.display='none';

  if(!handle){showErr(errEl,'YouTube kullanıcı adını girin.');return;}
  if(handle.includes('/')||handle.includes('http')){showErr(errEl,'Sadece kullanıcı adınızı yazın, link değil. Örnek: kanaladim');return;}
  if(!cats.length){showErr(errEl,'En az 1 kategori seç.');return;}

  const url=`https://youtube.com/@${handle}`;

  const existing=await supaGet('channels',{filter:`url=eq.${encodeURIComponent(url)}`});
  if(existing&&existing.length){showErr(errEl,'Bu kanal zaten eklenmiş.');return;}

  const btn=document.getElementById('add-btn');
  btn.disabled=true;btn.textContent='⏳ Yükleniyor...';

  const info=await getYTInfo(url,handle);
  const result=await supaPost('channels',{url,name:info.name,logo:info.logo,categories:cats,likes:0,dislikes:0,added_by:currentUser.username});

  btn.disabled=false;btn.textContent='🚀 Kanalı Ekle';
  if(!result){showErr(errEl,'Kanal eklenirken hata oluştu.');return;}

  document.getElementById('inp-handle').value='';
  document.querySelectorAll('.cat-chip.sel').forEach(c=>c.classList.remove('sel'));
  goTo('channels');
}

async function getYTInfo(url,handle){
  let name=handle||'YouTube Kanalı';
  let logo=null;
  try{
    const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if(r.ok){const d=await r.json();if(d.author_name)name=d.author_name;if(d.author_url){const m=d.author_url.match(/channel\/(UC[\w-]+)/);if(m)logo=`https://yt3.googleusercontent.com/ytc/${m[1]}=s88-c-k-c0x00ffffff-no-rj`;}}
  }catch(_){}
  if(!logo&&handle) logo=`https://unavatar.io/youtube/${encodeURIComponent(handle)}`;
  return{name,logo};
}

// ═══════════════ RENDER CHANNELS ═══════════════
async function renderChannels(){
  const grid=document.getElementById('ch-grid');
  if(!grid)return;
  grid.innerHTML='<div class="empty">Yükleniyor...</div>';
  let filter='';
  if(activeFilter!=='all') filter=`categories=cs.{"${activeFilter}"}`;
  const[chs,myVoteRows]=await Promise.all([
    supaGet('channels',{filter,order:'likes.desc'}),
    currentUser?supaGet('votes',{filter:`username=eq.${encodeURIComponent(currentUser.username)}`}):Promise.resolve([]),
  ]);
  grid.innerHTML='';
  if(!chs||!chs.length){grid.innerHTML='<div class="empty">Henüz kanal eklenmemiş.</div>';return;}
  const myVoteMap={};(myVoteRows||[]).forEach(v=>myVoteMap[v.channel_id]=v.vote_type);
  const sorted=[...chs].sort((a,b)=>(b.likes-b.dislikes)-(a.likes-a.dislikes));
  const topId=sorted[0]?.id;
  sorted.forEach(ch=>{
    const isTop=ch.id===topId&&(ch.likes-ch.dislikes)>0;
    const uv=myVoteMap[ch.id]||null;
    const isOwner=currentUser&&ch.added_by===currentUser.username;
    const canDel=isAdmin||isOwner;
    const card=document.createElement('div');card.className='ch-card'+(isTop?' top':'');
    const logoHtml=ch.logo?`<img class="ch-logo" src="${esc(ch.logo)}" alt="${esc(ch.name)}" onerror="this.outerHTML='<div class=\\'ch-logo-ph\\'>📺</div>'">`:`<div class="ch-logo-ph">📺</div>`;
    const catHtml=(ch.categories||[]).map(id=>{const c=CATS.find(x=>x.id===id);return c?`<span class="ch-cat">${c.l}</span>`:''}).join('');
    const ownerBadge=isOwner&&!isAdmin?`<span class="owner-badge">Senin Kanalin</span>`:'';
    const delBtn=canDel?`<button class="del-btn" onclick="${isAdmin?`adminForceDelete('${ch.id}')`:`deleteChannel('${ch.id}','${esc(ch.added_by||'')}')` }">🗑 Sil</button>`:'';
    card.innerHTML=`
      ${isTop?'<div class="top-badge">🏆 TOP</div>':''}
      ${logoHtml}
      <div class="ch-name">${esc(ch.name)}</div>
      ${ownerBadge}
      <div class="ch-cats">${catHtml}</div>
      <a class="ch-link" href="${esc(ch.url)}" target="_blank" rel="noopener">🔗 Kanalı Ziyaret Et</a>
      <div class="vote-row">
        <button class="vbtn like ${uv==='like'?'on':''}" onclick="vote('${ch.id}','like',this)">👍 <span id="lk-${ch.id}">${ch.likes}</span></button>
        <button class="vbtn dis ${uv==='dislike'?'on':''}" onclick="vote('${ch.id}','dislike',this)">👎 <span id="dk-${ch.id}">${ch.dislikes}</span></button>
      </div>
      ${delBtn}`;
    grid.appendChild(card);
  });
}

// ═══════════════ VOTE ═══════════════
async function vote(channelId,type,btnEl){
  if(!currentUser)return;
  const username=currentUser.username;
  const existingVotes=await supaGet('votes',{filter:`channel_id=eq.${channelId}&username=eq.${encodeURIComponent(username)}`});
  const prev=existingVotes&&existingVotes.length?existingVotes[0].vote_type:null;
  const rows=await supaGet('channels',{filter:`id=eq.${channelId}`});
  if(!rows||!rows.length)return;
  const ch=rows[0];
  let newLikes=ch.likes,newDislikes=ch.dislikes;
  if(prev===type){if(type==='like')newLikes--;else newDislikes--;await supaDelete('votes',`channel_id=eq.${channelId}&username=eq.${encodeURIComponent(username)}`);}
  else{if(prev==='like')newLikes--;if(prev==='dislike')newDislikes--;if(type==='like')newLikes++;else newDislikes++;await supaUpsert('votes',{channel_id:channelId,username,vote_type:type});}
  await supaPatch('channels',`id=eq.${channelId}`,{likes:newLikes,dislikes:newDislikes});
  const lkEl=document.getElementById('lk-'+channelId);const dkEl=document.getElementById('dk-'+channelId);
  if(lkEl)lkEl.textContent=newLikes;if(dkEl)dkEl.textContent=newDislikes;
  const card=btnEl.closest('.ch-card');
  if(card){card.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on'));if(prev!==type)btnEl.classList.add('on');}
}

// ═══════════════ DELETE CHANNEL ═══════════════
async function adminForceDelete(id){
  if(!isAdmin)return;
  if(!confirm('Bu kanalı silmek istediğinden emin misin?'))return;
  await supaDelete('channels',`id=eq.${id}`);
  await supaDelete('votes',`channel_id=eq.${id}`);
  renderAdmin();if(curPage==='channels')renderChannels();
}
async function deleteChannel(id,addedBy){
  if(!currentUser)return;
  if(!isAdmin&&currentUser.username!==addedBy)return;
  if(!confirm('Bu kanalı silmek istediğinden emin misin?'))return;
  await supaDelete('channels',`id=eq.${id}`);
  await supaDelete('votes',`channel_id=eq.${id}`);
  renderChannels();if(curPage==='admin')renderAdmin();
}

// ═══════════════ ADMIN PANEL ═══════════════
async function renderAdmin(){
  if(!isAdmin)return;
  const[chs,users,msgs,bans]=await Promise.all([supaGet('channels'),supaGet('users'),supaGet('messages'),supaGet('bans')]);
  const now=Date.now();
  const activeBans=(bans||[]).filter(b=>b.until_ts>now);
  document.getElementById('admin-stats').innerHTML=`
    <div class="stat-box"><div class="sn">${(chs||[]).length}</div><div class="sl">Kanal</div></div>
    <div class="stat-box"><div class="sn">${(users||[]).length}</div><div class="sl">Kullanıcı</div></div>
    <div class="stat-box"><div class="sn">${(msgs||[]).length}</div><div class="sl">Mesaj</div></div>
    <div class="stat-box"><div class="sn">${activeBans.length}</div><div class="sl">Yasaklı</div></div>
    <div class="stat-box" style="border-color:${darkGuardOn?'var(--success)':'var(--muted)'}">
      <div class="sn" style="font-size:18px">${darkGuardOn?'🛡️ ON':'🛡️ OFF'}</div>
      <div class="sl" style="color:${darkGuardOn?'var(--success)':'var(--muted)'}">DarkGuard</div>
    </div>
  `;

  // Admin butonları
  document.getElementById('admin-action-btns').innerHTML=`
    <button class="btn-neon" onclick="toggleDarkGuard()" style="font-size:13px;padding:10px 20px">${darkGuardOn?'⏹️ DarkGuard Durdur':'▶️ DarkGuard Başlat'}</button>
    <button class="btn-outline" onclick="antiExpoScan()" style="font-size:13px;padding:10px 20px">🔍 Anti-Expo Tara</button>
    <button class="btn-outline" onclick="resetChat()" style="font-size:13px;padding:10px 20px;border-color:#ff8800;color:#ff8800">💬 Sohbeti Sıfırla</button>
    <button class="btn-outline" onclick="resetAll()" style="font-size:13px;padding:10px 20px;border-color:var(--danger);color:var(--danger)">🗑️ Siteyi Sıfırla</button>
  `;

  // Kanallar
  const cl=document.getElementById('admin-ch-list');
  cl.innerHTML=(chs||[]).length?'':'<div class="no-data">Kanal yok.</div>';
  (chs||[]).forEach(ch=>{
    const r=document.createElement('div');r.className='admin-row';
    r.innerHTML=`<div class="ar-info"><div class="ar-name">${esc(ch.name)}</div><div class="ar-url">${esc(ch.url)}</div><div class="ar-url" style="color:var(--neon)">Ekleyen: ${esc(ch.added_by||'?')}</div></div>
      <span style="font-size:12px;color:var(--muted)">👍${ch.likes} 👎${ch.dislikes}</span>
      <button class="adel" onclick="adminForceDelete('${ch.id}')">🗑 Sil</button>`;
    cl.appendChild(r);
  });

  // Kullanıcılar
  const ul=document.getElementById('admin-user-list');
  if(ul){
    ul.innerHTML=(users||[]).length?'':'<div class="no-data">Kullanıcı yok.</div>';
    (users||[]).filter(u=>u.username!==ADMIN_USER).forEach(u=>{
      const r=document.createElement('div');r.className='admin-row';
      const isBanned=activeBans.some(b=>b.nick===u.username);
      r.innerHTML=`<div class="ar-info">
        <div class="ar-name" style="color:${u.color||userColor(u.username)}">${esc(u.username)}</div>
        <div class="ar-url">IP: ${esc(u.ip||'?')}</div>
      </div>
      ${isBanned?'<span style="color:var(--danger);font-size:12px">BANLI</span>':
        `<button class="adel" onclick="adminBanUser('${esc(u.username)}','${esc(u.ip||'')}')">🚫 Banla</button>`}`;
      ul.appendChild(r);
    });
  }

  // Yasaklar
  const bl=document.getElementById('admin-ban-list');
  bl.innerHTML=activeBans.length?'':'<div class="no-data">Aktif yasak yok.</div>';
  activeBans.forEach(ban=>{
    const left=Math.ceil((ban.until_ts-now)/60000);
    const r=document.createElement('div');r.className='ban-row';
    r.innerHTML=`<span style="flex:1;font-size:13px">${esc(ban.nick)}</span>
      <span style="font-size:11px;color:var(--muted)">${left>99999?'Kalıcı':(left+' dk kaldı')}</span>
      <button class="unban" onclick="adminUnban('${esc(ban.nick)}')">Yasağı Kaldır</button>`;
    bl.appendChild(r);
  });

  // Şüpheli log
  renderSuspiciousLog();
  updateDarkGuardStatus();
}

async function adminBanUser(username,ip){
  if(!isAdmin)return;
  if(!confirm(`${username} kullanıcısını ve IP'sini kalıcı olarak yasaklamak istiyor musun?`))return;
  const PERM=Date.now()+(365*24*60*60*1000); // 1 yıl
  await Promise.all([
    supaUpsert('bans',{nick:username,until_ts:PERM}),
    ip?supaUpsert('bans',{nick:`IP_${ip}`,until_ts:PERM}):Promise.resolve(),
  ]);
  showGuardToast(`🚫 ${username} ve IP'si yasaklandı.`);
  logSuspicious('USER_BANNED',`${username} adminj tarafından yasaklandı`,ADMIN_USER);
  renderAdmin();
}

async function adminUnban(nick){
  if(!isAdmin)return;
  await supaDelete('bans',`nick=eq.${encodeURIComponent(nick)}`);
  renderAdmin();
}

async function resetChat(){
  if(!isAdmin)return;
  if(!confirm('Tüm sohbet mesajları silinecek. Emin misin?'))return;
  await supaDelete('messages','id=neq.00000000-0000-0000-0000-000000000000');
  showGuardToast('💬 Sohbet sıfırlandı!');
  renderAdmin();renderMsgs();
}

async function resetAll(){
  if(!isAdmin)return;
  if(!confirm('⚠️ TÜM kanallar, beğeniler ve mesajlar silinecek. Emin misin?'))return;
  if(!confirm('Son onay: Bu işlem geri alınamaz!'))return;
  await Promise.all([
    supaDelete('channels','id=neq.00000000-0000-0000-0000-000000000000'),
    supaDelete('votes','channel_id=neq.00000000-0000-0000-0000-000000000000'),
    supaDelete('messages','id=neq.00000000-0000-0000-0000-000000000000'),
    supaDelete('bans','nick=neq.__dummy__'),
  ]);
  showGuardToast('✅ Site sıfırlandı!');
  renderAdmin();renderChannels();
}

// ═══════════════ CHAT ═══════════════
function initChat(){
  updateChatUI();renderMsgs();
  setInterval(()=>{if(currentUser&&!document.getElementById('chat-body').classList.contains('closed'))renderMsgs();},3000);
}
function toggleChat(){
  const body=document.getElementById('chat-body');const arr=document.getElementById('chat-arrow');
  body.classList.toggle('closed');arr.textContent=body.classList.contains('closed')?'▼':'▲';
}
function updateChatUI(){
  const inner=document.getElementById('chat-inner');const uname=document.getElementById('chat-uname');const wall=document.getElementById('chat-auth-wall');
  if(!inner)return;
  if(currentUser){
    if(wall)wall.style.display='none';inner.style.display='flex';
    if(uname){uname.textContent='👤 '+currentUser.username;uname.style.color=currentUser.color||userColor(currentUser.username);}
    renderMsgs();
  } else {if(wall)wall.style.display='flex';inner.style.display='none';}
}

async function sendMsg(){
  if(!currentUser)return;
  const inp=document.getElementById('chat-inp');const st=document.getElementById('chat-status');
  const text=inp.value.trim();if(!text)return;

  // XSS koruması
  if(/<script|javascript:|on\w+=/i.test(text)){
    st.textContent='⛔ Zararlı içerik tespit edildi!';
    logSuspicious('XSS_ATTEMPT',`${currentUser.username} zararlı kod girmeye çalıştı`,currentUser.username);
    inp.value='';return;
  }

  const now=Date.now();const nick=currentUser.username;
  const banRows=await supaGet('bans',{filter:`nick=eq.${encodeURIComponent(nick)}`});
  if(banRows&&banRows.length&&banRows[0].until_ts>now){const left=Math.ceil((banRows[0].until_ts-now)/60000);st.textContent=`⛔ ${left>99999?'Kalıcı olarak':left+' dakika'} yasaklısın.`;inp.value='';return;}
  if(now-lastMsg<COOL_MS){st.textContent=`⏳ ${Math.ceil((COOL_MS-(now-lastMsg))/1000)} saniye bekle.`;return;}
  if(hasBad(text)){await supaUpsert('bans',{nick,until_ts:now+BAN_MS});st.textContent='🚫 Küfür! 5 dakika yasaklandın.';inp.value='';return;}

  st.textContent='';lastMsg=now;
  await supaPost('messages',{nick,text,color:currentUser.color||userColor(nick)});
  inp.value='';renderMsgs();
}

async function renderMsgs(){
  const c=document.getElementById('chat-msgs');if(!c)return;
  const atBot=c.scrollHeight-c.scrollTop<=c.clientHeight+40;
  const msgs=await supaGet('messages',{order:'created_at.asc',limit:60});
  c.innerHTML='';
  if(!msgs||!msgs.length){c.innerHTML='<div class="cmsg sys"><div class="cmsg-text">Sohbet başlamayı bekliyor...</div></div>';return;}
  msgs.forEach(m=>{
    const el=document.createElement('div');
    const me=currentUser&&m.nick===currentUser.username;
    el.className='cmsg'+(me?' me':'');
    const color=m.color||userColor(m.nick);
    el.innerHTML=`<div class="cmsg-nick" style="color:${color}">${esc(m.nick)}</div><div class="cmsg-text">${esc(m.text)}</div>`;
    c.appendChild(el);
  });
  if(atBot)c.scrollTop=c.scrollHeight;
}

function hasBad(text){const low=text.toLowerCase();return BAD.some(w=>low.includes(w));}

// ═══════════════ HELPERS ═══════════════
function val(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function showErr(el,msg){el.textContent=msg;el.style.display='block';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
