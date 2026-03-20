// ═══════════════════════════════════════
//  DARK VEXX — app.js (Supabase)
// ═══════════════════════════════════════

const SUPA_URL = 'https://bgjijdapgmzjlczyjszd.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnamlqZGFwZ216amxjenlqc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTY3NDYsImV4cCI6MjA4OTU5Mjc0Nn0.XCGYtyIEabVvpDwYlox_lDYx3TMevnLN5q0wQ097p4E';

// ── Supabase API yardımcısı ──
async function supa(method, table, opts = {}) {
  const { filter, body, order, limit } = opts;
  let url = `${SUPA_URL}/rest/v1/${table}?`;
  if (filter)  url += filter + '&';
  if (order)   url += `order=${order}&`;
  if (limit)   url += `limit=${limit}&`;

  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase hata:', err);
    return null;
  }
  const text = await res.text();
  try { return text ? JSON.parse(text) : []; } catch { return []; }
}

async function supaGet(table, opts = {})         { return await supa('GET',    table, opts) || []; }
async function supaPost(table, body)              { return await supa('POST',   table, { body }); }
async function supaPatch(table, filter, body)     { return await supa('PATCH',  table, { filter, body }); }
async function supaDelete(table, filter)          { return await supa('DELETE', table, { filter }); }
async function supaUpsert(table, body) {
  const url = `${SUPA_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return text ? JSON.parse(text) : []; } catch { return []; }
}

// ── CONSTANTS ──
const ADMIN_USER = 'dakvexx';
const ADMIN_PASS = 'yusuf2313';
const BAN_MS     = 5 * 60 * 1000;
const COOL_MS    = 3000;

const CATS = [
  {id:'oyun',      l:'🎮 Oyun'},
  {id:'satis',     l:'🛒 Satış'},
  {id:'eglence',   l:'🎉 Eğlence'},
  {id:'edit',      l:'✂️ Edit'},
  {id:'yayin',     l:'📡 Yayın'},
  {id:'korku',     l:'👻 Korku'},
  {id:'parodi',    l:'🤡 Parodi'},
  {id:'film',      l:'🎬 Filim'},
  {id:'animasyon', l:'🎨 Animasyon'},
  {id:'sarki',     l:'🎵 Şarkı'},
  {id:'araba',     l:'🚗 Araba'},
  {id:'minecraft', l:'⛏️ Minecraft'},
  {id:'roblox',    l:'🟥 Roblox'},
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
let chatUser     = null;
let pageStack    = [];
let curPage      = 'home';
let activeFilter = 'all';
let lastMsg      = 0;

// ═══════════════ INIT ═══════════════
window.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initParticles();
  buildCatGrid();
  buildFilterBar();
  restoreSession();
  updateNavUserArea();
  renderChannels();
  initChat();
  goTo('home', false);
});

// ═══════════════ CURSOR ═══════════════
function initCursor() {
  const dot  = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  if (!dot) return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    dot.style.left=mx+'px'; dot.style.top=my+'px';
  });
  (function loop() {
    rx+=(mx-rx)*0.13; ry+=(my-ry)*0.13;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mousedown', () => {
    dot.style.transform='translate(-50%,-50%) scale(.4)';
    ring.style.width='48px'; ring.style.height='48px'; ring.style.opacity='.8';
  });
  document.addEventListener('mouseup', () => {
    dot.style.transform='translate(-50%,-50%) scale(1)';
    ring.style.width='32px'; ring.style.height='32px'; ring.style.opacity='.45';
  });
}

// ═══════════════ PARTICLES ═══════════════
function initParticles() {
  const w = document.getElementById('ptcl-wrap');
  if (!w) return;
  for (let i=0; i<22; i++) {
    const p = document.createElement('div');
    p.className = 'ptcl';
    const s = 1+Math.random()*3;
    p.style.cssText = `left:${Math.random()*100}%;width:${s}px;height:${s}px;`
      + `animation-duration:${7+Math.random()*9}s;animation-delay:${Math.random()*9}s`;
    w.appendChild(p);
  }
}

// ═══════════════ NAVIGATION ═══════════════
function goTo(name, push=true) {
  if (name==='admin' && !isAdmin) { openModal('adminLogin'); return; }
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('pg-'+name);
  if (!pg) return;
  pg.classList.add('active');
  if (push && name!==curPage) pageStack.push(curPage);
  curPage = name;
  const bb = document.getElementById('back-btn');
  bb.classList.toggle('show', pageStack.length>0 && name!=='home');
  window.scrollTo({top:0, behavior:'smooth'});
  if (name==='channels') renderChannels();
  if (name==='admin')    renderAdmin();
}

function goBack() {
  if (pageStack.length) goTo(pageStack.pop(), false);
}

// ═══════════════ SESSION ═══════════════
function restoreSession() {
  if (sessionStorage.getItem('dv_admin')==='1') isAdmin = true;
  const u = sessionStorage.getItem('dv_user');
  if (u) { try { chatUser = JSON.parse(u); } catch(_){} }
}

// ═══════════════ NAV ═══════════════
function updateNavUserArea() {
  const area = document.getElementById('nav-user-area');
  if (isAdmin) {
    area.innerHTML = `
      <button class="nb active-nb" onclick="goTo('admin')">Admin</button>
      <button class="nb" onclick="doAdminLogout()">Çıkış</button>`;
  } else {
    area.innerHTML = `<button class="nb" onclick="openModal('adminLogin')">Giriş</button>`;
  }
}

// ═══════════════ MODAL ═══════════════
function openModal(type) {
  document.getElementById('modal-bg').classList.add('open');
  const body = document.getElementById('modal-body');

  if (type === 'adminLogin') {
    body.innerHTML = `
      <div class="modal-title">ADMİN GİRİŞİ</div>
      <div class="modal-field">
        <label>Kullanıcı Adı</label>
        <input type="text" id="m-auser" placeholder="kullanıcı adı" autocomplete="off"/>
      </div>
      <div class="modal-field">
        <label>Şifre</label>
        <input type="password" id="m-apass" placeholder="şifre"
          onkeydown="if(event.key==='Enter')submitAdminLogin()"/>
      </div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <button class="btn-neon w100" onclick="submitAdminLogin()">Giriş Yap</button>`;
  }
  else if (type === 'login') {
    body.innerHTML = `
      <div class="modal-title">GİRİŞ YAP</div>
      <div class="modal-field">
        <label>Kullanıcı Adı</label>
        <input type="text" id="m-uname" placeholder="kullanıcı adın" autocomplete="off"/>
      </div>
      <div class="modal-field">
        <label>Şifre</label>
        <input type="password" id="m-upass" placeholder="şifren"
          onkeydown="if(event.key==='Enter')submitLogin()"/>
      </div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <button class="btn-neon w100" onclick="submitLogin()">Giriş Yap</button>
      <div class="modal-switch">Hesabın yok mu? <a onclick="openModal('register')">Kayıt Ol</a></div>`;
  }
  else if (type === 'register') {
    body.innerHTML = `
      <div class="modal-title">KAYIT OL</div>
      <div class="modal-field">
        <label>Kullanıcı Adı <small>(3–18 karakter)</small></label>
        <input type="text" id="m-rname" placeholder="kullanıcı adı" maxlength="18" autocomplete="off"/>
      </div>
      <div class="modal-field">
        <label>Şifre <small>(min 4 karakter)</small></label>
        <input type="password" id="m-rpass" placeholder="şifre" maxlength="30"/>
      </div>
      <div class="modal-field">
        <label>Şifre Tekrar</label>
        <input type="password" id="m-rpass2" placeholder="şifre tekrar" maxlength="30"
          onkeydown="if(event.key==='Enter')submitRegister()"/>
      </div>
      <div class="msg-box err" id="m-err" style="display:none"></div>
      <button class="btn-neon w100" onclick="submitRegister()">Kayıt Ol</button>
      <div class="modal-switch">Zaten hesabın var mı? <a onclick="openModal('login')">Giriş Yap</a></div>`;
  }
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
}

function mErr(msg) {
  const e = document.getElementById('m-err');
  if (!e) return;
  e.textContent = msg; e.style.display = 'block';
}

// ── Admin Login ──
function submitAdminLogin() {
  const u = val('m-auser'), p = val('m-apass');
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    isAdmin = true;
    sessionStorage.setItem('dv_admin','1');
    closeModal();
    updateNavUserArea();
    goTo('admin');
  } else {
    mErr('Hatalı kullanıcı adı veya şifre.');
  }
}

function doAdminLogout() {
  isAdmin = false;
  sessionStorage.removeItem('dv_admin');
  updateNavUserArea();
  goTo('home');
}

// ── User Login ──
async function submitLogin() {
  const uname = val('m-uname'), pass = val('m-upass');
  if (!uname||!pass) { mErr('Tüm alanları doldurun.'); return; }

  const rows = await supaGet('users', {
    filter: `username=eq.${encodeURIComponent(uname)}&password=eq.${encodeURIComponent(pass)}`
  });

  if (!rows || !rows.length) { mErr('Kullanıcı adı veya şifre hatalı.'); return; }

  chatUser = { username: rows[0].username };
  sessionStorage.setItem('dv_user', JSON.stringify(chatUser));
  closeModal();
  updateChatUI();
}

// ── User Register ──
async function submitRegister() {
  const uname = val('m-rname'), pass = val('m-rpass'), pass2 = val('m-rpass2');
  if (uname.length < 3)  { mErr('Kullanıcı adı en az 3 karakter olmalı.'); return; }
  if (pass.length < 4)   { mErr('Şifre en az 4 karakter olmalı.'); return; }
  if (pass !== pass2)    { mErr('Şifreler eşleşmiyor.'); return; }

  // Kullanıcı adı var mı?
  const existing = await supaGet('users', {
    filter: `username=eq.${encodeURIComponent(uname)}`
  });
  if (existing && existing.length) { mErr('Bu kullanıcı adı alınmış.'); return; }

  const result = await supaPost('users', { username: uname, password: pass });
  if (!result) { mErr('Kayıt başarısız, tekrar dene.'); return; }

  chatUser = { username: uname };
  sessionStorage.setItem('dv_user', JSON.stringify(chatUser));
  closeModal();
  updateChatUI();
}

// ═══════════════ CATEGORIES ═══════════════
function buildCatGrid() {
  const g = document.getElementById('cat-grid');
  if (!g) return;
  CATS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'cat-chip';
    d.textContent = c.l;
    d.dataset.id = c.id;
    d.onclick = () => toggleCat(d);
    g.appendChild(d);
  });
}

function toggleCat(el) {
  const sel = document.querySelectorAll('.cat-chip.sel');
  if (!el.classList.contains('sel') && sel.length >= 3) {
    el.style.borderColor='#ff3355';
    setTimeout(() => el.style.borderColor='', 700);
    return;
  }
  el.classList.toggle('sel');
}

function getSelCats() {
  return [...document.querySelectorAll('.cat-chip.sel')].map(c => c.dataset.id);
}

function buildFilterBar() {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;
  const all = document.createElement('button');
  all.className='flt on'; all.textContent='Tümü'; all.dataset.cat='all';
  all.onclick = () => setFilter('all', all);
  bar.appendChild(all);
  CATS.forEach(c => {
    const b = document.createElement('button');
    b.className='flt'; b.textContent=c.l; b.dataset.cat=c.id;
    b.onclick = () => setFilter(c.id, b);
    bar.appendChild(b);
  });
}

function setFilter(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.flt').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderChannels();
}

// ═══════════════ ADD CHANNEL ═══════════════
async function addChannel() {
  const url  = document.getElementById('inp-url').value.trim();
  const cats = getSelCats();
  const errEl = document.getElementById('add-err');
  errEl.style.display = 'none';

  if (!url)                        { showErr(errEl,'YouTube kanal linki girin.'); return; }
  if (!url.includes('youtube.com')){ showErr(errEl,'Geçerli bir YouTube linki girin.'); return; }
  if (!cats.length)                { showErr(errEl,'En az 1 kategori seç.'); return; }

  // Aynı URL var mı?
  const existing = await supaGet('channels', {
    filter: `url=eq.${encodeURIComponent(url)}`
  });
  if (existing && existing.length) { showErr(errEl,'Bu kanal zaten eklenmiş.'); return; }

  const btn = document.getElementById('add-btn');
  btn.disabled = true; btn.textContent = '⏳ Yükleniyor...';

  const info = await getYTInfo(url);

  const result = await supaPost('channels', {
    url,
    name: info.name,
    logo: info.logo,
    categories: cats,
    likes: 0,
    dislikes: 0,
  });

  btn.disabled = false; btn.textContent = '🚀 Kanalı Ekle';

  if (!result) { showErr(errEl,'Kanal eklenirken hata oluştu.'); return; }

  document.getElementById('inp-url').value = '';
  document.querySelectorAll('.cat-chip.sel').forEach(c => c.classList.remove('sel'));
  goTo('channels');
}

async function getYTInfo(url) {
  let name = extractHandle(url) || 'YouTube Kanalı';
  let logo = null;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (r.ok) {
      const d = await r.json();
      if (d.author_name) name = d.author_name;
      if (d.author_url) {
        const m = d.author_url.match(/channel\/(UC[\w-]+)/);
        if (m) logo = `https://yt3.googleusercontent.com/ytc/${m[1]}=s88-c-k-c0x00ffffff-no-rj`;
      }
    }
  } catch(_) {}
  if (!logo) {
    const h = extractHandle(url);
    if (h) logo = `https://unavatar.io/youtube/${encodeURIComponent(h)}`;
  }
  return { name, logo };
}

function extractHandle(url) {
  const m = url.match(/youtube\.com\/@([^/?&]+)/)
    || url.match(/youtube\.com\/c\/([^/?&]+)/)
    || url.match(/youtube\.com\/user\/([^/?&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ═══════════════ RENDER CHANNELS ═══════════════
async function renderChannels() {
  const grid = document.getElementById('ch-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty">Yükleniyor...</div>';

  let filter = '';
  if (activeFilter !== 'all') {
    filter = `categories=cs.{"${activeFilter}"}`;
  }

  const chs = await supaGet('channels', {
    filter,
    order: 'likes.desc',
  });

  grid.innerHTML = '';
  if (!chs || !chs.length) {
    grid.innerHTML = '<div class="empty">Henüz kanal eklenmemiş.</div>';
    return;
  }

  // Kendi oyunu localStorage'dan al (session bazlı)
  const myVotes = JSON.parse(localStorage.getItem('dv_myvotes') || '{}');

  // En yüksek skoru bul
  const sorted = [...chs].sort((a,b) => (b.likes-b.dislikes)-(a.likes-a.dislikes));
  const topId  = sorted[0]?.id;

  sorted.forEach(ch => {
    const isTop = ch.id === topId && (ch.likes - ch.dislikes) > 0;
    const uv    = myVotes[ch.id] || null;

    const card = document.createElement('div');
    card.className = 'ch-card' + (isTop ? ' top' : '');

    const logoHtml = ch.logo
      ? `<img class="ch-logo" src="${esc(ch.logo)}" alt="${esc(ch.name)}"
           onerror="this.outerHTML='<div class=\\'ch-logo-ph\\'>📺</div>'">`
      : `<div class="ch-logo-ph">📺</div>`;

    const catHtml = (ch.categories || []).map(id => {
      const c = CATS.find(x => x.id===id);
      return c ? `<span class="ch-cat">${c.l}</span>` : '';
    }).join('');

    const delBtn = isAdmin
      ? `<button class="del-btn" onclick="adminDelChannel('${ch.id}')">🗑 Sil</button>`
      : '';

    card.innerHTML = `
      ${isTop ? '<div class="top-badge">🏆 TOP</div>' : ''}
      ${logoHtml}
      <div class="ch-name">${esc(ch.name)}</div>
      <div class="ch-cats">${catHtml}</div>
      <a class="ch-link" href="${esc(ch.url)}" target="_blank" rel="noopener">🔗 Kanalı Ziyaret Et</a>
      <div class="vote-row">
        <button class="vbtn like ${uv==='like'?'on':''}" onclick="vote('${ch.id}','like',this)">
          👍 <span id="lk-${ch.id}">${ch.likes}</span>
        </button>
        <button class="vbtn dis ${uv==='dislike'?'on':''}" onclick="vote('${ch.id}','dislike',this)">
          👎 <span id="dk-${ch.id}">${ch.dislikes}</span>
        </button>
      </div>
      ${delBtn}
    `;
    grid.appendChild(card);
  });
}

async function vote(id, type, btnEl) {
  const myVotes = JSON.parse(localStorage.getItem('dv_myvotes') || '{}');
  const prev = myVotes[id] || null;

  // Mevcut kanal verisini al
  const rows = await supaGet('channels', { filter: `id=eq.${id}` });
  if (!rows || !rows.length) return;
  const ch = rows[0];

  let newLikes    = ch.likes;
  let newDislikes = ch.dislikes;

  if (prev === type) {
    // aynı oya tekrar basınca geri al
    if (type==='like')    newLikes--;
    else                  newDislikes--;
    delete myVotes[id];
  } else {
    if (prev==='like')    newLikes--;
    if (prev==='dislike') newDislikes--;
    if (type==='like')    newLikes++;
    else                  newDislikes++;
    myVotes[id] = type;
  }

  localStorage.setItem('dv_myvotes', JSON.stringify(myVotes));

  await supaPatch('channels', `id=eq.${id}`, { likes: newLikes, dislikes: newDislikes });

  // Sadece sayıları güncelle, sayfayı yeniden yükleme
  const lkEl = document.getElementById('lk-'+id);
  const dkEl = document.getElementById('dk-'+id);
  if (lkEl) lkEl.textContent = newLikes;
  if (dkEl) dkEl.textContent = newDislikes;

  // Buton durumlarını güncelle
  const card = btnEl.closest('.ch-card');
  if (card) {
    card.querySelectorAll('.vbtn').forEach(b => b.classList.remove('on'));
    if (myVotes[id]) btnEl.classList.add('on');
  }
}

// ═══════════════ ADMIN ═══════════════
async function renderAdmin() {
  if (!isAdmin) return;

  const [chs, users, msgs, bans] = await Promise.all([
    supaGet('channels'),
    supaGet('users'),
    supaGet('messages'),
    supaGet('bans'),
  ]);

  const now = Date.now();
  const activeBans = (bans||[]).filter(b => b.until_ts > now);

  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-box"><div class="sn">${(chs||[]).length}</div><div class="sl">Kanal</div></div>
    <div class="stat-box"><div class="sn">${(users||[]).length}</div><div class="sl">Kullanıcı</div></div>
    <div class="stat-box"><div class="sn">${(msgs||[]).length}</div><div class="sl">Mesaj</div></div>
    <div class="stat-box"><div class="sn">${activeBans.length}</div><div class="sl">Yasaklı</div></div>
  `;

  // Kanallar
  const cl = document.getElementById('admin-ch-list');
  cl.innerHTML = (chs||[]).length ? '' : '<div class="no-data">Kanal yok.</div>';
  (chs||[]).forEach(ch => {
    const r = document.createElement('div');
    r.className = 'admin-row';
    r.innerHTML = `
      <div class="ar-info">
        <div class="ar-name">${esc(ch.name)}</div>
        <div class="ar-url">${esc(ch.url)}</div>
      </div>
      <span style="font-size:12px;color:var(--muted)">👍${ch.likes} 👎${ch.dislikes}</span>
      <button class="adel" onclick="adminDelChannel('${ch.id}')">🗑 Sil</button>
    `;
    cl.appendChild(r);
  });

  // Yasaklar
  const bl = document.getElementById('admin-ban-list');
  bl.innerHTML = activeBans.length ? '' : '<div class="no-data">Aktif yasak yok.</div>';
  activeBans.forEach(ban => {
    const left = Math.ceil((ban.until_ts - now) / 60000);
    const r = document.createElement('div');
    r.className = 'ban-row';
    r.innerHTML = `
      <span style="flex:1;font-size:13px">${esc(ban.nick)}</span>
      <span style="font-size:11px;color:var(--muted)">${left} dk kaldı</span>
      <button class="unban" onclick="adminUnban('${esc(ban.nick)}')">Yasağı Kaldır</button>
    `;
    bl.appendChild(r);
  });
}

async function adminDelChannel(id) {
  if (!isAdmin) return;
  await supaDelete('channels', `id=eq.${id}`);
  renderAdmin();
  if (curPage === 'channels') renderChannels();
}

async function adminUnban(nick) {
  if (!isAdmin) return;
  await supaDelete('bans', `nick=eq.${encodeURIComponent(nick)}`);
  renderAdmin();
}

// ═══════════════ CHAT ═══════════════
function initChat() {
  updateChatUI();
  renderMsgs();
  setInterval(() => {
    if (chatUser && !document.getElementById('chat-body').classList.contains('closed')) {
      renderMsgs();
    }
  }, 3000);
}

function toggleChat() {
  const body = document.getElementById('chat-body');
  const arr  = document.getElementById('chat-arrow');
  body.classList.toggle('closed');
  arr.textContent = body.classList.contains('closed') ? '▼' : '▲';
}

function updateChatUI() {
  const wall  = document.getElementById('chat-auth-wall');
  const inner = document.getElementById('chat-inner');
  const uname = document.getElementById('chat-uname');
  if (!wall) return;
  if (chatUser) {
    wall.style.display = 'none';
    inner.style.display = 'flex';
    uname.textContent = '👤 ' + chatUser.username;
    renderMsgs();
  } else {
    wall.style.display = 'flex';
    inner.style.display = 'none';
  }
}

function chatLogout() {
  chatUser = null;
  sessionStorage.removeItem('dv_user');
  updateChatUI();
}

async function sendMsg() {
  if (!chatUser) return;
  const inp  = document.getElementById('chat-inp');
  const st   = document.getElementById('chat-status');
  const text = inp.value.trim();
  if (!text) return;

  const now  = Date.now();
  const nick = chatUser.username;

  // Ban kontrolü
  const banRows = await supaGet('bans', { filter: `nick=eq.${encodeURIComponent(nick)}` });
  if (banRows && banRows.length && banRows[0].until_ts > now) {
    const left = Math.ceil((banRows[0].until_ts - now) / 60000);
    st.textContent = `⛔ ${left} dakika yasaklısın.`;
    inp.value = ''; return;
  }

  // Cooldown
  if (now - lastMsg < COOL_MS) {
    const w = Math.ceil((COOL_MS-(now-lastMsg))/1000);
    st.textContent = `⏳ ${w} saniye bekle.`;
    return;
  }

  // Küfür
  if (hasBad(text)) {
    await supaUpsert('bans', { nick, until_ts: now + BAN_MS });
    st.textContent = '🚫 Küfür! 5 dakika yasaklandın.';
    inp.value = ''; return;
  }

  st.textContent = '';
  lastMsg = now;
  await supaPost('messages', { nick, text });
  inp.value = '';
  renderMsgs();
}

async function renderMsgs() {
  const c = document.getElementById('chat-msgs');
  if (!c) return;
  const atBot = c.scrollHeight - c.scrollTop <= c.clientHeight + 40;

  const msgs = await supaGet('messages', {
    order: 'created_at.asc',
    limit: 60,
  });

  c.innerHTML = '';
  if (!msgs || !msgs.length) {
    c.innerHTML = '<div class="cmsg sys"><div class="cmsg-text">Sohbet başlamayı bekliyor...</div></div>';
    return;
  }

  msgs.forEach(m => {
    const el  = document.createElement('div');
    const me  = chatUser && m.nick === chatUser.username;
    el.className = 'cmsg' + (me ? ' me' : '');
    el.innerHTML = `<div class="cmsg-nick">${esc(m.nick)}</div><div class="cmsg-text">${esc(m.text)}</div>`;
    c.appendChild(el);
  });

  if (atBot) c.scrollTop = c.scrollHeight;
}

function hasBad(text) {
  const low = text.toLowerCase();
  return BAD.some(w => low.includes(w));
}

// ═══════════════ HELPERS ═══════════════
function val(id) { const e=document.getElementById(id); return e?e.value.trim():''; }
function showErr(el,msg) { el.textContent=msg; el.style.display='block'; }
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
