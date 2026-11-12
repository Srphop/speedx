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
let notificationsRequest = null;
function getNotifications() {
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
  clearSession();
  window.location.href = 'login.html';
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

// โหลดรายการแจ้งเตือนใส่กระดิ่ง
async function loadBell() {
  const list = document.getElementById('bell-list');
  const count = document.getElementById('bell-count');
  renderLoading(list, 2);

  try {
    const { notifications } = await getNotifications();
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
    renderError(list, error.message, loadBell);
  }
}

function initLayout() {
  renderSidebar();
  renderHeader();
  if (typeof setupCommandPalette === 'function') setupCommandPalette(); // ค้นหาด่วน Ctrl+K (command.js)
  loadBell();
}
