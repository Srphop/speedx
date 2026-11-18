// ===== โครงหน้าหลังล็อกอิน: แถบเมนูซ้าย + หัวหน้า (ธีม / กระดิ่ง / บัญชี) =====
// ทุกหน้าเรียก initLayout() ก่อน แล้วค่อยโหลดข้อมูลของหน้าตัวเอง

// ยังไม่ล็อกอิน → ไปหน้าเข้าสู่ระบบทันที
if (!getToken()) {
  window.location.replace('login.html');
}

const NAV_ITEMS = [
  { key: 'overview', label: 'ภาพรวม', href: 'dashboard.html', icon: 'dashboard' },
  { key: 'members', label: 'สมาชิก', href: 'members.html', icon: 'members' },
  { key: 'events', label: 'กิจกรรม', href: 'events.html', icon: 'events' },
  { key: 'finance', label: 'งบการเงิน', href: 'finance.html', icon: 'finance' },
  { key: 'calendar', label: 'แผนกิจกรรมรายปี', href: 'calendar.html', icon: 'calendar' },
  { key: 'news', label: 'ข่าวสารชมรม', href: 'news.html', icon: 'news' },
];

// แจ้งเตือนโหลดครั้งเดียว ใช้ร่วมกันทั้งกระดิ่งและหน้าข่าวสาร
// fresh = true → ทิ้งของเดิม ขอใหม่ (ใช้ตอนเช็กข้อมูลใหม่ทุก 10 วินาที)
let notificationsRequest = null;
function getNotifications(fresh = false) {
  if (fresh) notificationsRequest = null;
  if (!notificationsRequest) {
    notificationsRequest = apiRequest('/api/notifications').catch((error) => {
      notificationsRequest = null; // ให้ลองใหม่ได้
      throw error;
    });
  }
  return notificationsRequest;
}

// ---------- เปลี่ยนหน้าแบบมีทิศทาง ----------
// ไปเมนูที่อยู่ล่างกว่า → เนื้อหาเลื่อนขึ้นมาจากข้างล่าง, ไปเมนูข้างบน → เลื่อนลงมาจากข้างบน
// (หน้าเก่าจดลำดับตัวเองไว้ตอนออก หน้าใหม่เอามาเทียบ แล้วติดป้าย data-nav-dir ให้ CSS เลือกท่า)
const NAV_FROM_KEY = 'speedx-nav-from';

function pageRank(path) {
  const file = (path.split('/').pop() || 'dashboard.html').split(/[?#]/)[0];
  if (file === 'event.html') return NAV_ITEMS.findIndex((item) => item.key === 'events') + 0.5; // หน้ารายละเอียด = ลึกกว่าหน้ากิจกรรม
  return NAV_ITEMS.findIndex((item) => item.href === file);
}

(function setupPageDirection() {
  window.addEventListener('pageswap', () => {
    try {
      sessionStorage.setItem(NAV_FROM_KEY, String(pageRank(window.location.pathname)));
    } catch (error) {
      // เบราว์เซอร์ไม่ให้ใช้ storage ก็แค่ไม่มีทิศทาง
    }
  });

  let from = null;
  try {
    from = sessionStorage.getItem(NAV_FROM_KEY);
    sessionStorage.removeItem(NAV_FROM_KEY);
  } catch (error) {
    return;
  }
  const to = pageRank(window.location.pathname);
  if (from === null || to < 0 || Number(from) < 0 || Number(from) === to) return;

  const root = document.documentElement;
  root.dataset.navDir = to > Number(from) ? 'down' : 'up';
  const clear = () => delete root.dataset.navDir;
  window.addEventListener('pagereveal', (event) => {
    if (event.viewTransition) event.viewTransition.finished.then(clear, clear);
    else clear();
  }, { once: true });
  setTimeout(clear, 1500);
})();

// โหลดหน้าในเมนูไว้ล่วงหน้าตอนชี้เมาส์ค้าง → กดแล้วเปลี่ยนหน้าไวขึ้น (Chrome / Edge)
function addNavPrefetch() {
  if (document.querySelector('script[type="speculationrules"]')) return;
  if (!(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
  const rules = document.createElement('script');
  rules.type = 'speculationrules';
  rules.textContent = JSON.stringify({
    prefetch: [{ source: 'list', urls: NAV_ITEMS.map((item) => item.href), eagerness: 'moderate' }],
  });
  document.head.appendChild(rules);
}

function logout() {
  // เอาชื่อออกจากแถบ "ออนไลน์ตอนนี้" ทันที (ส่งแล้วไม่ต้องรอ)
  const token = getToken();
  if (token) {
    fetch(`${API_BASE_URL}/api/presence`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
  }
  clearSession();
  window.location.href = 'login.html';
}

// ---------- สิทธิ์: สมาชิกชมรม / ผู้เยี่ยมชม ----------
// ติดป้าย data-access ที่ <html> → CSS ซ่อนปุ่มที่มี class "member-only" ให้ผู้เยี่ยมชม
// (backend กันอีกชั้นด้วย requireMember ต่อให้กดได้ก็บันทึกไม่ได้)
function applyAccess() {
  const member = isClubMember();
  const root = document.documentElement;
  if (member === undefined) delete root.dataset.access;
  else root.dataset.access = member ? 'member' : 'visitor';

  const chip = document.getElementById('access-chip');
  if (chip) chip.hidden = member !== false;
}

// ---------- ข้อมูลสดจากชีต ----------
// ทุกหน้าที่โชว์ข้อมูลชมรมเรียก keepFresh(() => loadXxx(true)) ไว้
// → ระหว่างเปิดหน้าอยู่ ดึงข้อมูลใหม่เงียบ ๆ ทุก 10 วินาที และทันทีที่กลับมาที่แท็บนี้
//   แก้ในชีตแล้วหน้าเว็บอัปเดตเอง ไม่ต้องกดรีเฟรช (วาดใหม่เฉพาะตอนข้อมูลเปลี่ยนจริง)
// ไม่ดึงตอน: แท็บซ่อนอยู่ / กำลังกรอกฟอร์มในหน้าต่าง / อยู่ในโหมดพรีเซนต์
const LIVE_EVERY_MS = 10 * 1000;
const freshTasks = [];

function keepFresh(reload) {
  freshTasks.push(reload);
}

// เอาไว้เทียบว่าข้อมูลเปลี่ยนไหม (ไม่นับเวลาของเซิร์ฟเวอร์ที่เปลี่ยนทุกครั้งที่ขอ)
function dataKey(data) {
  return JSON.stringify(data, (key, value) => (key === 'now' || key === 'generated_at' ? undefined : value));
}

let refreshing = false;
async function refreshLiveData() {
  if (refreshing || document.hidden || document.querySelector('dialog[open], .present')) return;
  refreshing = true;
  try {
    getNotifications(true);
    await Promise.all([loadBell(true), ...freshTasks.map((reload) => reload())]);
  } catch (error) {
    // เน็ตหลุด / เซิร์ฟเวอร์หลับ: ลองใหม่รอบหน้า
  } finally {
    refreshing = false;
  }
}

function startLiveData() {
  setInterval(refreshLiveData, LIVE_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshLiveData();
  });
}

// ---------- แถบ "ออนไลน์ตอนนี้" ----------
// บอก backend ทุก 25 วินาทีว่ายังเปิดเว็บอยู่ แล้วได้รายชื่อคนออนไลน์กลับมา
const PRESENCE_EVERY_MS = 25 * 1000;
const ONLINE_SHOWN = 6;

function roleClass(person) {
  if (!person.is_member) return 'role-visitor';
  return /ประธาน|president/i.test(person.role) ? 'role-lead' : 'role-member';
}

function renderOnline(online) {
  const list = document.getElementById('online-list');
  if (!list) return;
  const me = (getSavedUser() || {}).id;
  document.getElementById('online-count').textContent = `${online.length} คน`;

  const rows = online.slice(0, ONLINE_SHOWN).map((person) => `<li class="online-person" title="${escapeHtml(person.name)}, ${escapeHtml(person.role)}${person.page ? ` กำลังดูหน้า${escapeHtml(person.page)}` : ''}">
      <span class="online-avatar">${avatarHtml(person, 'avatar-sm')}<span class="online-dot" aria-hidden="true"></span></span>
      <span class="online-text">
        <span class="online-name">${escapeHtml(person.name)}${person.id === me ? ' <span class="online-you">(คุณ)</span>' : ''}</span>
        <span class="role-chip ${roleClass(person)}">${escapeHtml(person.role)}</span>
      </span>
    </li>`);
  if (online.length > ONLINE_SHOWN) rows.push(`<li class="online-more">และอีก ${online.length - ONLINE_SHOWN} คน</li>`);
  list.innerHTML = rows.join('');
}

async function sendPresence() {
  if (!getToken()) return;
  try {
    const data = await apiRequest('/api/presence', { method: 'POST', body: { page: document.body.dataset.nav } });
    // ได้ยศ / สิทธิ์ล่าสุดจากชีตมาด้วย → ประธานเปลี่ยนในชีตแล้วหน้าเว็บเปลี่ยนตามเอง
    if (data.me) {
      const saved = getSavedUser() || {};
      const changed = saved.is_member !== data.me.is_member || saved.role !== data.me.role;
      saveSession(getToken(), { ...saved, role: data.me.role, is_member: data.me.is_member });
      if (changed) {
        applyAccess();
        if (typeof refreshAccountUI === 'function') refreshAccountUI();
        document.dispatchEvent(new CustomEvent('access-change'));
      }
    }
    renderOnline(data.online);
  } catch (error) {
    // ออฟไลน์ / เซิร์ฟเวอร์หลับ: ลองใหม่รอบหน้า
  }
}

// ปิดแท็บ / ปิดเบราว์เซอร์ / ออกจากหน้า → บอก backend ว่ากำลังออก (ไม่ต้องรอคำตอบ)
// ถ้าแค่กดไปหน้าอื่นในเว็บ หน้าใหม่จะส่ง "ยังอยู่" ตามมาภายใน 10 วินาที ชื่อเลยไม่หาย
function sendLeaving() {
  const token = getToken();
  if (!token) return;
  fetch(`${API_BASE_URL}/api/presence?soon=1`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
}

function startPresence() {
  sendPresence();
  setInterval(sendPresence, PRESENCE_EVERY_MS);
  // กลับมาที่แท็บนี้ → อัปเดตทันที
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sendPresence();
  });
  window.addEventListener('pagehide', sendLeaving);
  // กดย้อนกลับแล้วเบราว์เซอร์เอาหน้าเดิมจากหน่วยความจำมาโชว์ → บอกว่ากลับมาแล้ว
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) sendPresence();
  });
}

function renderSidebar() {
  const current = document.body.dataset.nav;
  const links = NAV_ITEMS.map(
    (item) => `<li>
      <a class="nav-link" href="${item.href}" ${item.key === current ? 'aria-current="page"' : ''}>
        ${icon(item.icon)}<span>${item.label}</span>
      </a>
    </li>`
  ).join('');

  addNavPrefetch();

  const user = getSavedUser() || { name: 'ผู้ใช้', email: '' };
  const sidebar = document.getElementById('sidebar');
  sidebar.setAttribute('aria-label', 'เมนูหลัก');
  sidebar.innerHTML = `
    <a class="sidebar-logo" href="dashboard.html"><img src="assets/logo-original.png" alt="SpeedX"></a>
    <nav><ul class="nav-list">${links}</ul></nav>
    <section class="online-panel" aria-labelledby="online-title">
      <p class="online-title" id="online-title"><span class="online-pulse" aria-hidden="true"></span>ออนไลน์ตอนนี้ <span class="online-count" id="online-count"></span></p>
      <ul class="online-list" id="online-list" aria-live="polite"></ul>
    </section>
    <div class="sidebar-bottom">
      <div class="sidebar-user">
        <span id="sidebar-avatar" aria-hidden="true">${avatarHtml(user)}</span>
        <div style="min-width:0">
          <div class="sidebar-user-name">${escapeHtml(user.name)}</div>
          <div class="sidebar-user-email">${escapeHtml(user.email)}</div>
        </div>
      </div>
      <button type="button" class="sidebar-logout" id="logout-button">${icon('logout')}<span>ออกจากระบบ</span></button>
    </div>`;

  document.getElementById('logout-button').addEventListener('click', logout);
}

function renderHeader() {
  const user = getSavedUser() || { name: 'ผู้ใช้', email: '' };
  const header = document.getElementById('main-header');
  header.innerHTML = `
    <button type="button" class="icon-button menu-button" id="menu-button" aria-label="เปิดเมนู" aria-expanded="false">${icon('menu')}</button>
    <h1 class="page-title">${escapeHtml(document.body.dataset.title)}</h1>
    <span class="access-chip" id="access-chip" hidden title="ให้ประธานชมรมตั้งตำแหน่งให้ในชีต Users เพื่อแก้ไขข้อมูลได้">${icon('lock')}<span>ผู้เยี่ยมชม ดูได้อย่างเดียว</span></span>
    <div class="header-actions">
      <div class="popover-anchor">
        <button type="button" class="icon-button" id="theme-button" aria-haspopup="menu" aria-expanded="false"></button>
        <div class="popover theme-popover" id="theme-popover" role="menu" hidden>
          <p class="popover-title">ธีม</p>
          <div id="theme-options"></div>
        </div>
      </div>

      <div class="popover-anchor">
        <button type="button" class="icon-button" id="bell-button" aria-label="การแจ้งเตือน" aria-expanded="false">
          ${icon('bell')}<span class="badge-count" id="bell-count" hidden></span>
        </button>
        <div class="popover" id="bell-popover" hidden>
          <p class="popover-title">การแจ้งเตือน</p>
          <div id="bell-list"></div>
        </div>
      </div>

      <div class="popover-anchor">
        <button type="button" class="icon-button" id="account-button" aria-label="บัญชีของฉัน" aria-expanded="false">
          <span class="avatar-wrap" id="header-avatar"></span>
        </button>
        <div class="popover account-popover" id="account-popover" role="menu" hidden>
          <div id="account-menu"></div>
        </div>
      </div>
    </div>`;

  setupThemeButton();
  setupPopover(document.getElementById('bell-button'), document.getElementById('bell-popover'));
  setupAccountMenu(); // เมนูบัญชี: โปรไฟล์ / รหัสผ่าน / คีย์ลัด / เกี่ยวกับ (ดู account.js)
  setupDrawer();
}

// เมนูเลือกธีม: เปลี่ยนทันที แล้วบันทึกลงบัญชีผู้ใช้ (แท็บ Users ในชีต)
function setupThemeButton() {
  const button = document.getElementById('theme-button');
  const popover = document.getElementById('theme-popover');
  const options = document.getElementById('theme-options');
  const closeMenu = setupPopover(button, popover);

  function render(current) {
    const active = THEMES.find((theme) => theme.id === current) || THEMES[0];
    button.innerHTML = icon(active.icon);
    button.setAttribute('aria-label', `เลือกธีม (ตอนนี้: ${active.label})`);

    options.innerHTML = THEMES.map(
      (theme) => `<button type="button" class="popover-item menu-option" role="menuitemradio"
        aria-checked="${theme.id === current}" data-theme-id="${theme.id}">
        <span class="theme-option-label">${icon(theme.icon)} ${theme.label}</span>
        ${theme.id === current ? icon('check') : ''}
      </button>`
    ).join('');

    options.querySelectorAll('[data-theme-id]').forEach((option) =>
      option.addEventListener('click', () => choose(option.dataset.themeId))
    );
  }

  function choose(next) {
    closeMenu();
    if (next === document.documentElement.getAttribute('data-theme')) return;

    switchThemeWithReveal(next, button); // สีใหม่กระจายเป็นวงกลมจากปุ่ม (ดู animations.js)
    render(next);
    button.focus();

    const user = getSavedUser();
    if (user) saveSession(getToken(), { ...user, theme: next });
    apiRequest('/api/auth/me/theme', { method: 'PATCH', body: { theme: next } }).catch(() => {
      // บันทึกลงบัญชีไม่สำเร็จ ธีมในเครื่องยังเปลี่ยนแล้ว ไม่ต้องรบกวนผู้ใช้
    });
  }

  render(document.documentElement.getAttribute('data-theme'));
}

// เมนูแบบลิ้นชักบนจอเล็ก
function setupDrawer() {
  const sidebar = document.getElementById('sidebar');
  const button = document.getElementById('menu-button');
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  document.body.appendChild(backdrop);

  function setOpen(open) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('a').focus();
  }

  button.addEventListener('click', () => setOpen(true));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      setOpen(false);
      button.focus();
    }
  });
}

// กระดิ่งสั่นครั้งเดียวต่อการเปิดเว็บ (เปลี่ยนหน้าแล้วไม่สั่นซ้ำ จะได้ไม่น่ารำคาญ)
function ringBellOncePerVisit(hasNotifications) {
  if (!hasNotifications) return;
  try {
    if (sessionStorage.getItem('speedx-bell-rung')) return;
    sessionStorage.setItem('speedx-bell-rung', '1');
  } catch (error) {
    // เก็บไม่ได้ก็สั่นทุกครั้ง ไม่เป็นไร
  }
  document.getElementById('bell-button').classList.add('bell-ring');
}

// โหลดรายการแจ้งเตือนใส่กระดิ่ง (quiet = เช็กใหม่เงียบ ๆ เปลี่ยนเฉพาะตอนรายการเปลี่ยน)
let lastBellKey = '';
async function loadBell(quiet = false) {
  const list = document.getElementById('bell-list');
  const count = document.getElementById('bell-count');
  if (!quiet) renderLoading(list, 2);

  try {
    const { notifications } = await getNotifications();
    const key = dataKey(notifications);
    if (quiet && key === lastBellKey) return;
    lastBellKey = key;
    count.hidden = notifications.length === 0;
    count.textContent = notifications.length;
    ringBellOncePerVisit(notifications.length > 0);
    document.getElementById('bell-button').setAttribute('aria-label', `การแจ้งเตือน ${notifications.length} รายการ`);

    if (notifications.length === 0) {
      renderEmpty(list, 'ไม่มีกิจกรรมที่จะเริ่มใน 3 วันนี้');
      return;
    }

    list.removeAttribute('aria-busy');
    list.innerHTML = notifications
      .map((n) => {
        if (n.type === 'event') {
          return `<a class="popover-item" href="event.html?id=${encodeURIComponent(n.event_id)}">
            <strong>${escapeHtml(n.message)}</strong>
            <span class="muted small">${escapeHtml(formatDateLong(n.start_at))} ${escapeHtml(formatTime(n.start_at))} น.</span>
            <span class="muted small">${escapeHtml(n.location)}</span>
          </a>`;
        }
        return `<a class="popover-item" href="finance.html">
          <strong>${escapeHtml(n.title)}</strong>
          <span class="muted small">${escapeHtml(n.message)}</span>
        </a>`;
      })
      .join('');
  } catch (error) {
    if (quiet) return;
    renderError(list, error.message, () => loadBell());
  }
}

function initLayout() {
  renderSidebar();
  renderHeader();
  if (typeof setupCommandPalette === 'function') setupCommandPalette(); // ค้นหาด่วน Ctrl+K (command.js)
  applyAccess();
  loadBell();
  startPresence();
  startLiveData();
}
