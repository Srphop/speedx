// ===== เมนูบัญชี (กดรูปโปรไฟล์ขวาบน) =====
//   แก้ไขโปรไฟล์: รูป / สีวงกลม / ชื่อ / ตำแหน่ง
//   เปลี่ยนรหัสผ่าน
//   คีย์ลัด: กด ? ดูทั้งหมด, g แล้วตามด้วยตัวอักษรเพื่อสลับหน้า
//   เกี่ยวกับ SpeedX: สถานะการเชื่อมต่อ Google Sheets
// ข้อมูลโปรไฟล์บันทึกในแท็บ Users ของชีต

// สีวงกลมที่เลือกได้ (ต้องตรงกับ backend/controllers/authController.js)
const AVATAR_COLORS = ['#A0EC29', '#8B2549', '#6B46B0', '#305EAA', '#A35F19', '#1B1F20'];
const POSITION_SUGGESTIONS = ['ประธานชมรม', 'รองประธาน', 'เลขานุการ', 'เหรัญญิก', 'หัวหน้าฝ่ายกิจกรรม', 'หัวหน้าฝ่ายประชาสัมพันธ์', 'สมาชิก'];

// คีย์ลัดสลับหน้า: กด g แล้วตามด้วยตัวอักษร
const PAGE_SHORTCUTS = [
  { key: 'n', label: 'ข่าวสารชมรม', href: 'news.html' },
  { key: 'm', label: 'สมาชิก', href: 'members.html' },
  { key: 'e', label: 'กิจกรรม', href: 'events.html' },
  { key: 'f', label: 'งบการเงิน', href: 'finance.html' },
  { key: 'c', label: 'แผนกิจกรรมรายปี', href: 'calendar.html' },
];

// ---------- วงกลมโปรไฟล์ ----------
// สีอ่อน (เขียว) ใช้ตัวอักษรเข้ม สีเข้มใช้ตัวอักษรขาว
function avatarTextColor(color) {
  return color === '#A0EC29' ? '#1B1F20' : color === '#1B1F20' ? '#A0EC29' : '#FFFFFF';
}

function avatarHtml(user, extraClass = '') {
  if (user.avatar_image) {
    return `<span class="avatar ${extraClass}"><img class="avatar-image" src="${escapeHtml(user.avatar_image)}" alt=""></span>`;
  }
  const style = user.avatar_color
    ? `style="background:${user.avatar_color};color:${avatarTextColor(user.avatar_color)}"`
    : '';
  return `<span class="avatar ${extraClass}" ${style}>${escapeHtml(getInitials(user.name))}</span>`;
}

function currentUser() {
  return getSavedUser() || { name: 'ผู้ใช้', email: '' };
}

// อัปเดตทุกจุดที่โชว์ชื่อ/รูป หลังแก้โปรไฟล์ (ไม่ต้องรีเฟรชหน้า)
function refreshAccountUI() {
  const user = currentUser();
  document.getElementById('header-avatar').innerHTML = `${avatarHtml(user)}<span class="online-dot" aria-hidden="true"></span>`;
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (sidebarAvatar) sidebarAvatar.innerHTML = avatarHtml(user);
  const sidebarName = document.querySelector('.sidebar-user-name');
  if (sidebarName) sidebarName.textContent = user.name;
  renderAccountMenu();
}

// ---------- เมนู ----------
let closeAccountMenu = () => {};

function renderAccountMenu() {
  const user = currentUser();
  const menu = document.getElementById('account-menu');
  menu.innerHTML = `
    <div class="account-card">
      ${avatarHtml(user, 'avatar-lg')}
      <div class="account-card-text">
        <strong>${escapeHtml(user.name)}</strong>
        <span class="muted small">${escapeHtml(user.email)}</span>
        ${user.position ? `<span class="account-position">${escapeHtml(user.position)}</span>` : ''}
      </div>
    </div>
    <div class="menu-divider"></div>
    <button type="button" class="popover-item menu-option" data-action="profile">
      <span class="theme-option-label">${icon('user')} แก้ไขโปรไฟล์</span>
    </button>
    <button type="button" class="popover-item menu-option" data-action="password">
      <span class="theme-option-label">${icon('lock')} เปลี่ยนรหัสผ่าน</span>
    </button>
    <button type="button" class="popover-item menu-option" data-action="shortcuts">
      <span class="theme-option-label">${icon('keyboard')} คีย์ลัด</span><kbd>?</kbd>
    </button>
    <button type="button" class="popover-item menu-option" data-action="about">
      <span class="theme-option-label">${icon('info')} เกี่ยวกับ SpeedX</span>
    </button>
    <div class="menu-divider"></div>
    <button type="button" class="popover-item menu-option" data-action="logout">
      <span class="theme-option-label">${icon('logout')} ออกจากระบบ</span>
    </button>`;

  const actions = {
    profile: openProfileDialog,
    password: openPasswordDialog,
    shortcuts: openShortcutsDialog,
    about: openAboutDialog,
    logout,
  };
  menu.querySelectorAll('[data-action]').forEach((button) =>
    button.addEventListener('click', () => {
      closeAccountMenu();
      actions[button.dataset.action]();
    })
  );
}

function setupAccountMenu() {
  closeAccountMenu = setupPopover(document.getElementById('account-button'), document.getElementById('account-popover'));
  refreshAccountUI();
}

// ---------- กล่อง dialog (สร้างครั้งเดียว ใช้ซ้ำ) ----------
function getDialog(id, title) {
  let dialog = document.getElementById(id);
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = 'dialog dialog-form';
    dialog.setAttribute('aria-labelledby', `${id}-heading`);
    document.body.appendChild(dialog);
  }
  dialog.dataset.title = title;
  return dialog;
}

function dialogHeader(id, title) {
  return `<div class="card-header">
    <h2 class="card-title" id="${id}-heading">${title}</h2>
    <button type="button" class="icon-button" data-close aria-label="ปิด">${icon('close')}</button>
  </div>`;
}

function wireClose(dialog) {
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
}

function showFieldError(dialog, name, message) {
  const box = dialog.querySelector(`[data-error="${name}"]`);
  if (box) box.textContent = message || '';
  const input = dialog.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

// ---------- แก้ไขโปรไฟล์ ----------
// ย่อรูปเป็นสี่เหลี่ยม 128×128 (ตัดตรงกลาง) แล้วแปลงเป็นข้อความ เก็บในชีตได้
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('เลือกได้เฉพาะไฟล์รูปภาพ'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('รูปใหญ่เกิน 8 MB'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่ได้'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองรูปอื่น'));
      image.onload = () => {
        const size = 128;
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d').drawImage(
          image,
          (image.width - side) / 2, (image.height - side) / 2, side, side,
          0, 0, size, size
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openProfileDialog() {
  const user = currentUser();
  const draft = { avatar_image: user.avatar_image || '', avatar_color: user.avatar_color || '' };
  const dialog = getDialog('profile-dialog', 'แก้ไขโปรไฟล์');
  const memberSince = user.created_at ? formatDateLong(user.created_at) : '';

  dialog.innerHTML = `
    <form novalidate>
      ${dialogHeader('profile-dialog', 'แก้ไขโปรไฟล์')}
      <div class="profile-photo-row">
        <div id="profile-preview"></div>
        <div class="profile-photo-actions">
          <div class="profile-buttons">
            <label class="btn btn-outline">
              ${icon('upload')} อัปโหลดรูป
              <input type="file" accept="image/*" class="visually-hidden" id="profile-file">
            </label>
            <button type="button" class="btn btn-danger-text" id="profile-remove-image">ลบรูป</button>
          </div>
          <p class="field-error" data-error="avatar_image"></p>
          <div class="swatches" role="radiogroup" aria-label="สีวงกลมโปรไฟล์">
            ${AVATAR_COLORS.map(
              (color) => `<button type="button" class="swatch" role="radio" data-color="${color}"
                style="background:${color}" aria-label="สี ${color}"></button>`
            ).join('')}
          </div>
          <p class="form-hint">สีวงกลมใช้ตอนไม่มีรูป</p>
        </div>
      </div>

      <div class="form-grid" style="margin-top:20px">
        <div class="field span-full">
          <label for="profile-name">ชื่อที่แสดง</label>
          <input class="input" id="profile-name" name="name" maxlength="60" value="${escapeHtml(user.name)}" autocomplete="name">
          <p class="field-error" data-error="name"></p>
        </div>
        <div class="field span-full">
          <label for="profile-position">ตำแหน่งในชมรม</label>
          <input class="input" id="profile-position" name="position" maxlength="60" list="position-list"
            value="${escapeHtml(user.position || '')}" placeholder="เช่น ประธานชมรม" autocomplete="off">
          <datalist id="position-list">${POSITION_SUGGESTIONS.map((p) => `<option value="${p}">`).join('')}</datalist>
        </div>
      </div>
      <p class="muted small" style="margin-top:16px">อีเมล ${escapeHtml(user.email)}</p>
      ${memberSince ? `<p class="muted small">ใช้ SpeedX ตั้งแต่${escapeHtml(memberSince)}</p>` : ''}

      <p class="form-message" data-error="form" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-outline" data-close>ยกเลิก</button>
        <button type="submit" class="btn btn-primary">บันทึก</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');

  // วาดตัวอย่างวงกลมตามค่าที่กำลังแก้
  function renderPreview() {
    const preview = { name: form.elements.name.value || user.name, ...draft };
    document.getElementById('profile-preview').innerHTML = avatarHtml(preview, 'avatar-xl');
    dialog.querySelectorAll('.swatch').forEach((swatch) => {
      const selected = swatch.dataset.color === draft.avatar_color;
      swatch.setAttribute('aria-checked', String(selected));
    });
    document.getElementById('profile-remove-image').hidden = !draft.avatar_image;
  }

  dialog.querySelectorAll('.swatch').forEach((swatch) =>
    swatch.addEventListener('click', () => {
      draft.avatar_color = swatch.dataset.color;
      renderPreview();
    })
  );

  document.getElementById('profile-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    showFieldError(dialog, 'avatar_image', '');
    try {
      draft.avatar_image = await resizeImage(file);
      renderPreview();
    } catch (error) {
      showFieldError(dialog, 'avatar_image', error.message);
    }
    event.target.value = '';
  });

  document.getElementById('profile-remove-image').addEventListener('click', () => {
    draft.avatar_image = '';
    renderPreview();
  });

  form.elements.name.addEventListener('input', () => {
    showFieldError(dialog, 'name', '');
    renderPreview();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return showFieldError(dialog, 'name', 'กรุณากรอกชื่อ');

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'กำลังบันทึก…';
    dialog.querySelector('[data-error="form"]').textContent = '';

    try {
      const result = await apiRequest('/api/auth/me/profile', {
        method: 'PATCH',
        body: { name, position: form.elements.position.value.trim(), ...draft },
      });
      saveSession(getToken(), result.user);
      refreshAccountUI();
      dialog.close();
      showToast(result.message);
    } catch (error) {
      Object.entries(error.fieldErrors || {}).forEach(([key, message]) => showFieldError(dialog, key, message));
      dialog.querySelector('[data-error="form"]').textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'บันทึก';
    }
  });

  wireClose(dialog);
  renderPreview();
  dialog.showModal();
}

// ---------- เปลี่ยนรหัสผ่าน ----------
function openPasswordDialog() {
  const dialog = getDialog('password-dialog', 'เปลี่ยนรหัสผ่าน');
  const field = (name, label, autocomplete, hint = '') => `
    <div class="field span-full">
      <label for="pw-${name}">${label}</label>
      <input class="input" id="pw-${name}" name="${name}" type="password" autocomplete="${autocomplete}">
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
      <p class="field-error" data-error="${name}"></p>
    </div>`;

  dialog.innerHTML = `
    <form novalidate>
      ${dialogHeader('password-dialog', 'เปลี่ยนรหัสผ่าน')}
      <div class="form-grid">
        ${field('current_password', 'รหัสผ่านปัจจุบัน', 'current-password')}
        ${field('new_password', 'รหัสผ่านใหม่', 'new-password', 'อย่างน้อย 8 ตัวอักษร')}
        ${field('confirm_password', 'ยืนยันรหัสผ่านใหม่', 'new-password')}
      </div>
      <p class="form-message" data-error="form" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-outline" data-close>ยกเลิก</button>
        <button type="submit" class="btn btn-primary">เปลี่ยนรหัสผ่าน</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = {
      current_password: values.current_password ? '' : 'กรุณากรอกรหัสผ่านปัจจุบัน',
      new_password: values.new_password.length >= 8 ? '' : 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร',
      confirm_password: values.confirm_password === values.new_password ? '' : 'รหัสผ่านทั้งสองช่องต้องตรงกัน',
    };
    Object.entries(errors).forEach(([key, message]) => showFieldError(dialog, key, message));
    if (Object.values(errors).some(Boolean)) return;

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    dialog.querySelector('[data-error="form"]').textContent = '';
    try {
      const result = await apiRequest('/api/auth/me/password', {
        method: 'PATCH',
        body: { current_password: values.current_password, new_password: values.new_password },
      });
      dialog.close();
      showToast(result.message);
    } catch (error) {
      Object.entries(error.fieldErrors || {}).forEach(([key, message]) => showFieldError(dialog, key, message));
      if (Object.keys(error.fieldErrors || {}).length === 0) dialog.querySelector('[data-error="form"]').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  wireClose(dialog);
  dialog.showModal();
  form.elements.current_password.focus();
}

// ---------- คีย์ลัด ----------
function openShortcutsDialog() {
  const dialog = getDialog('shortcuts-dialog', 'คีย์ลัด');
  const row = (keys, label) => `<li><span>${label}</span><span class="kbd-group">${keys.map((k) => `<kbd>${k}</kbd>`).join(' ')}</span></li>`;

  dialog.innerHTML = `
    ${dialogHeader('shortcuts-dialog', 'คีย์ลัด')}
    <h3 class="about-heading">สลับหน้า</h3>
    <ul class="shortcut-list">
      ${PAGE_SHORTCUTS.map((s) => row(['g', s.key], s.label)).join('')}
    </ul>
    <h3 class="about-heading" style="margin-top:20px">ทั่วไป</h3>
    <ul class="shortcut-list">
      ${row(['t'], 'เปิดเมนูธีม')}
      ${row(['/'], 'ค้นหากิจกรรม (หน้ากิจกรรม)')}
      ${row(['?'], 'เปิดหน้านี้')}
      ${row(['Esc'], 'ปิดหน้าต่าง / เมนู')}
    </ul>`;

  wireClose(dialog);
  dialog.showModal();
}

// ---------- เกี่ยวกับ SpeedX ----------
async function openAboutDialog() {
  const dialog = getDialog('about-dialog', 'เกี่ยวกับ SpeedX');
  dialog.innerHTML = `
    ${dialogHeader('about-dialog', 'เกี่ยวกับ SpeedX')}
    <div class="about-logo">
      <img class="logo-light-mode" src="assets/logo-charcoal.png" alt="SpeedX">
      <img class="logo-dark-mode" src="assets/logo-original.png" alt="SpeedX">
    </div>
    <p>ระบบจัดการชมรม ดูข่าวสาร กิจกรรม สมาชิก งบการเงิน และแผนกิจกรรมรายปีในที่เดียว</p>
    <ul class="shortcut-list" style="margin-top:16px">
      <li><span>ฐานข้อมูล</span><span id="about-status" class="muted">กำลังเช็ก…</span></li>
      <li><span>เวอร์ชัน</span><span>1.0</span></li>
      <li><span>สร้างด้วย</span><span>Node.js + Express + Google Sheets API</span></li>
      <li><span>ซอร์สโค้ด</span><a class="text-link" href="https://github.com/Srphop/speedx" target="_blank" rel="noopener">GitHub</a></li>
    </ul>`;
  wireClose(dialog);
  dialog.showModal();

  const status = document.getElementById('about-status');
  try {
    const health = await apiRequest('/api/health');
    status.innerHTML = health.dataSource === 'google-sheets'
      ? '<span class="status-badge status-done">เชื่อมต่อ Google Sheets แล้ว</span>'
      : '<span class="status-badge status-upcoming">ใช้ข้อมูลตัวอย่างในเครื่อง</span>';
  } catch (error) {
    status.innerHTML = '<span class="status-badge status-planned">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</span>';
  }
}

// ---------- จับปุ่มคีย์บอร์ด ----------
let waitingForPageKey = false;

document.addEventListener('keydown', (event) => {
  const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (typing || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;

  if (waitingForPageKey) {
    waitingForPageKey = false;
    const target = PAGE_SHORTCUTS.find((s) => s.key === event.key.toLowerCase());
    if (target) window.location.href = target.href;
    return;
  }

  if (event.key === 'g') {
    waitingForPageKey = true;
    setTimeout(() => (waitingForPageKey = false), 1200); // ต้องกดตัวถัดไปภายใน 1.2 วินาที
  } else if (event.key === '?') {
    openShortcutsDialog();
  } else if (event.key === 't') {
    document.getElementById('theme-button').click();
  } else if (event.key === '/' && document.getElementById('event-search')) {
    event.preventDefault();
    document.getElementById('event-search').focus();
  }
});
