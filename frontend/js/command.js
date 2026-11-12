// ===== ค้นหาด่วน (กด Ctrl+K หรือ / ที่หน้าไหนก็ได้) =====
// ค้นได้ทั้ง หน้า / คำสั่ง (เพิ่มกิจกรรม เปลี่ยนธีม ฯลฯ) / กิจกรรม / สมาชิก
// ใช้ลูกศรขึ้นลงเลือก กด Enter เปิด กด Esc ปิด

let commandData = null; // กิจกรรม + สมาชิก โหลดครั้งแรกที่เปิด
let commandItems = []; // รายการที่แสดงอยู่ตอนนี้
let commandActive = 0;

// คำสั่งที่ทำได้ทันที
function commandActions() {
  const actions = [
    { title: 'เพิ่มกิจกรรมใหม่', subtitle: 'เปิดฟอร์มเพิ่มกิจกรรมในปฏิทิน', icon: 'plus', run: () => (window.location.href = 'calendar.html?add=1') },
    { title: 'โหมดพรีเซนต์', subtitle: 'โชว์หน้าภาพรวมเต็มจอทีละการ์ด วนเอง', icon: 'play', keywords: 'present slideshow kiosk นำเสนอ', run: () => (window.location.href = 'dashboard.html?present=1') },
    { title: 'ส่งออกรายงานสรุป', subtitle: 'รายงานทั้งชมรมพร้อมพิมพ์ หรือบันทึกเป็น PDF', icon: 'report', keywords: 'export pdf report พิมพ์', run: () => (window.location.href = 'report.html') },
    { title: 'แก้ไขโปรไฟล์', subtitle: 'รูป ชื่อ ตำแหน่ง', icon: 'user', run: () => clickAccountAction('profile') },
    { title: 'เปลี่ยนรหัสผ่าน', subtitle: 'บัญชีของฉัน', icon: 'lock', run: () => clickAccountAction('password') },
    { title: 'ดูคีย์ลัดทั้งหมด', subtitle: 'กด ? ก็ได้', icon: 'keyboard', run: () => clickAccountAction('shortcuts') },
    { title: 'ออกจากระบบ', subtitle: 'กลับไปหน้าเข้าสู่ระบบ', icon: 'logout', run: () => logout() },
  ];
  const themes = THEMES.map((theme) => ({
    title: `เปลี่ยนเป็นธีม${theme.label}`,
    subtitle: 'ธีม',
    icon: theme.icon,
    keywords: 'theme ธีม สี',
    run: () => {
      const option = document.querySelector(`[data-theme-id="${theme.id}"]`);
      if (option) option.click();
    },
  }));
  return actions.concat(themes);
}

function clickAccountAction(name) {
  const button = document.querySelector(`#account-menu [data-action="${name}"]`);
  if (button) button.click();
}

// ---------- หน้าต่าง ----------
function getCommandDialog() {
  let dialog = document.getElementById('command-dialog');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = 'command-dialog';
  dialog.className = 'command-dialog';
  dialog.setAttribute('aria-label', 'ค้นหาด่วน');
  dialog.innerHTML = `
    <div class="command-search">
      ${icon('search')}
      <input id="command-input" type="text" autocomplete="off" spellcheck="false"
        placeholder="ค้นหากิจกรรม สมาชิก หน้า หรือคำสั่ง…"
        role="combobox" aria-expanded="true" aria-controls="command-list" aria-autocomplete="list">
      <kbd>Esc</kbd>
    </div>
    <div class="command-list" id="command-list" role="listbox" aria-label="ผลการค้นหา"></div>
    <div class="command-footer muted small">
      <span><kbd>↑</kbd> <kbd>↓</kbd> เลือก</span>
      <span><kbd>Enter</kbd> เปิด</span>
      <span><kbd>Ctrl</kbd> <kbd>K</kbd> เปิด/ปิด</span>
    </div>`;
  document.body.appendChild(dialog);

  const input = dialog.querySelector('#command-input');
  input.addEventListener('input', () => renderCommandResults(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (commandItems.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setCommandActive((commandActive + step + commandItems.length) % commandItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(commandActive);
    }
  });

  // กดพื้นหลังนอกกล่อง = ปิด
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

async function openCommandPalette() {
  const dialog = getCommandDialog();
  if (dialog.open) {
    dialog.close();
    return;
  }
  const input = dialog.querySelector('#command-input');
  input.value = '';
  dialog.showModal();
  input.focus();
  renderCommandResults('');

  if (!commandData) {
    try {
      const [eventsResult, membersResult] = await Promise.all([apiRequest('/api/events'), apiRequest('/api/members')]);
      commandData = { events: eventsResult.events, members: membersResult.members };
    } catch (error) {
      commandData = { events: [], members: [], error: error.message };
    }
    if (dialog.open) renderCommandResults(input.value);
  }
}

// ---------- ค้นหา ----------
function matchScore(query, ...fields) {
  if (!query) return 1;
  const text = fields.join(' ').toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((word) => text.includes(word))) return 0;
  return fields[0].toLowerCase().startsWith(words[0]) ? 3 : 2; // ขึ้นต้นด้วยคำค้น ให้อยู่บนกว่า
}

function buildCommandGroups(query) {
  const byScore = (list) => list.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const groups = [];

  const pages = byScore(NAV_ITEMS.map((item) => ({
    title: item.label,
    subtitle: 'ไปที่หน้า',
    icon: item.icon,
    href: item.href,
    score: matchScore(query, item.label, item.key),
  })));
  groups.push({ name: 'หน้า', items: pages });

  const actions = byScore(commandActions().map((item) => ({ ...item, score: matchScore(query, item.title, item.subtitle, item.keywords || '') })));
  groups.push({ name: 'คำสั่ง', items: query ? actions : actions.slice(0, 3) });

  if (commandData) {
    const now = Date.now();
    let events = commandData.events.map((e) => ({
      title: e.title,
      subtitle: `${formatDateRange(e.start_at, e.end_at)}  ${e.location || ''}`,
      icon: 'events',
      badge: e.status,
      href: `event.html?id=${encodeURIComponent(e.event_id)}`,
      start: new Date(e.start_at).getTime(),
      score: matchScore(query, e.title, e.category, e.location, e.organizer || ''),
    }));
    // ยังไม่พิมพ์: โชว์กิจกรรมที่กำลังจะมาถึง 4 อันแรก
    events = query
      ? byScore(events).slice(0, 6)
      : events.filter((e) => e.start >= now).sort((a, b) => a.start - b.start).slice(0, 4);
    groups.push({ name: query ? 'กิจกรรม' : 'กิจกรรมที่กำลังจะมาถึง', items: events });

    if (query) {
      const members = byScore(commandData.members.map((m) => ({
        title: m.name,
        subtitle: `${m.faculty} ปี ${m.study_year}  ${m.department}`,
        member: m,
        href: `members.html?member=${encodeURIComponent(m.member_id)}`,
        score: matchScore(query, m.name, m.faculty, m.department, m.member_id),
      }))).slice(0, 6);
      groups.push({ name: 'สมาชิก', items: members });
    }
  } else {
    groups.push({ name: 'กิจกรรม', loading: true, items: [] });
  }

  return groups.filter((group) => group.items.length > 0 || group.loading);
}

function renderCommandResults(query) {
  const list = document.getElementById('command-list');
  const groups = buildCommandGroups(query.trim());
  commandItems = groups.flatMap((group) => group.items);
  commandActive = 0;

  if (commandItems.length === 0 && !groups.some((g) => g.loading)) {
    list.innerHTML = `<div class="command-empty"><p>ไม่พบ “${escapeHtml(query)}”</p><p class="muted small">ลองค้นด้วยชื่อกิจกรรม ชื่อสมาชิก คณะ หรือฝ่าย</p></div>`;
    return;
  }

  let index = 0;
  list.innerHTML = groups
    .map((group) => {
      if (group.loading) {
        return `<p class="command-group">${group.name}</p><div class="command-loading muted small">กำลังโหลด…</div>`;
      }
      const rows = group.items
        .map((item) => {
          const i = index++;
          const lead = item.member
            ? `<span class="avatar command-avatar" style="background:${FACULTY_COLORS[item.member.faculty] || OTHER_COLOR};color:#fff">${escapeHtml(getInitials(item.member.name))}</span>`
            : `<span class="command-icon">${icon(item.icon)}</span>`;
          return `<div class="command-item" role="option" id="command-option-${i}" data-index="${i}" aria-selected="false" style="--i:${i}">
            ${lead}
            <span class="command-text"><span class="command-title">${highlightMatch(item.title, query)}</span><span class="command-subtitle muted small">${escapeHtml(item.subtitle || '')}</span></span>
            ${item.badge ? statusBadge(item.badge) : ''}
            <span class="command-enter" aria-hidden="true">${icon('chevronRight')}</span>
          </div>`;
        })
        .join('');
      return `<p class="command-group">${group.name}</p>${rows}`;
    })
    .join('');

  list.querySelectorAll('.command-item').forEach((row) => {
    row.addEventListener('pointermove', () => setCommandActive(Number(row.dataset.index), false));
    row.addEventListener('click', () => runCommand(Number(row.dataset.index)));
  });
  setCommandActive(0, false);
}

// ทำตัวหนาตรงคำที่ค้นเจอในชื่อ
function highlightMatch(text, query) {
  const word = query.trim().split(/\s+/)[0];
  if (!word) return escapeHtml(text);
  const at = text.toLowerCase().indexOf(word.toLowerCase());
  if (at === -1) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, at))}<mark>${escapeHtml(text.slice(at, at + word.length))}</mark>${escapeHtml(text.slice(at + word.length))}`;
}

function setCommandActive(index, scroll = true) {
  commandActive = index;
  document.querySelectorAll('.command-item').forEach((row) => {
    const active = Number(row.dataset.index) === index;
    row.setAttribute('aria-selected', String(active));
    if (active && scroll) row.scrollIntoView({ block: 'nearest' });
  });
  document.getElementById('command-input').setAttribute('aria-activedescendant', `command-option-${index}`);
}

function runCommand(index) {
  const item = commandItems[index];
  if (!item) return;
  document.getElementById('command-dialog').close();
  if (item.href) window.location.href = item.href;
  else if (item.run) item.run();
}

// ---------- ปุ่มบนหัวหน้า + คีย์ลัด ----------
function setupCommandPalette() {
  const actions = document.querySelector('.header-actions');
  if (actions && !document.getElementById('command-button')) {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    actions.insertAdjacentHTML(
      'afterbegin',
      `<button type="button" class="command-button" id="command-button" aria-label="ค้นหาด่วน (${isMac ? '⌘' : 'Ctrl'}+K)">
        ${icon('search')}<span class="command-button-text">ค้นหา…</span><kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>`
    );
    document.getElementById('command-button').addEventListener('click', openCommandPalette);
  }
}

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openCommandPalette();
    return;
  }
  // กด / (ถ้าหน้านั้นไม่มีช่องค้นหาของตัวเอง)
  const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !typing && !document.getElementById('event-search') && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    openCommandPalette();
  }
});
