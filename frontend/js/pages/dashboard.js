// ===== หน้า ภาพรวม: นับถอยหลังกิจกรรมถัดไป + ตัวเลขหลัก + กราฟรายเดือน + ชีพจรชมรม + สมาชิกขาประจำ =====
initLayout();

const content = document.getElementById('dashboard-content');
const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAY_MS = 24 * 60 * 60 * 1000;

let clockOffset = 0; // เวลาเซิร์ฟเวอร์ - เวลาเครื่อง (ใช้ตอนซ้อมเดโมด้วย DEMO_NOW)
let countdownTimer = null;
let stopSpeedLines = () => {};

// ---------- ตัวช่วย ----------
function serverNow() {
  return Date.now() + clockOffset;
}

function greeting(iso) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false }).format(new Date(iso)));
  if (hour < 12) return 'สวัสดีตอนเช้า';
  if (hour < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return { short: MONTH_SHORT[month - 1], year };
}

// วงกลมโปรไฟล์ของสมาชิก ใช้สีประจำคณะ
function memberAvatar(member, size = '') {
  const color = FACULTY_COLORS[member.faculty] || OTHER_COLOR;
  return `<span class="avatar ${size}" style="background:${color};color:#fff">${escapeHtml(getInitials(member.name))}</span>`;
}

// ---------- 1) แถบหัว: กิจกรรมถัดไป + นับถอยหลัง ----------
function heroHtml(next) {
  if (!next) {
    return `<section class="card span-12 dash-hero">
      <canvas class="dash-hero-canvas" aria-hidden="true"></canvas>
      <div class="dash-hero-body">
        <div class="dash-hero-info">
          <p class="dash-hero-label">กิจกรรมถัดไป</p>
          <h2 class="dash-hero-title">ยังไม่มีกิจกรรมที่วางแผนไว้</h2>
          <p class="dash-hero-meta">เริ่มวางแผนกิจกรรมต่อไปของชมรมได้เลย</p>
          <div class="dash-hero-actions"><a class="btn btn-primary" href="calendar.html?add=1">${icon('plus')} เพิ่มกิจกรรม</a></div>
        </div>
      </div>
    </section>`;
  }

  const units = [
    { key: 'days', label: 'วัน' },
    { key: 'hours', label: 'ชั่วโมง' },
    { key: 'minutes', label: 'นาที' },
    { key: 'seconds', label: 'วินาที' },
  ];

  return `<section class="card span-12 dash-hero">
    <canvas class="dash-hero-canvas" aria-hidden="true"></canvas>
    <div class="dash-hero-body">
      <div class="dash-hero-info">
        <p class="dash-hero-label">${next.is_live ? '<span class="live-dot" aria-hidden="true"></span>กำลังจัดอยู่ตอนนี้' : 'กิจกรรมถัดไป'}</p>
        <h2 class="dash-hero-title">${escapeHtml(next.title)}</h2>
        <p class="dash-hero-meta">
          <span>${icon('calendar')} ${escapeHtml(formatDateRange(next.start_at, next.end_at))}, ${escapeHtml(formatTimeRange(next.start_at, next.end_at))}</span>
          <span>${icon('events')} ${escapeHtml(next.location || '-')}</span>
          <span>${icon('members')} ลงชื่อแล้ว ${next.registered_count} คน</span>
        </p>
        <div class="dash-hero-actions">
          <a class="btn btn-primary" href="event.html?id=${encodeURIComponent(next.event_id)}">ดูรายละเอียด</a>
          <a class="btn dash-hero-ghost" href="calendar.html">เปิดปฏิทิน</a>
        </div>
      </div>
      ${next.is_live ? '' : `<div class="hero-countdown" role="timer" aria-live="off" aria-label="เวลาที่เหลือก่อนเริ่มกิจกรรม">
        ${units.map((u) => `<div class="hero-countdown-unit">
          <span class="hero-countdown-value num" data-unit="${u.key}"><span>00</span></span>
          <span class="hero-countdown-label">${u.label}</span>
        </div>`).join('')}
      </div>`}
    </div>
  </section>`;
}

// ตัวเลขนับถอยหลัง: เปลี่ยนเลขเมื่อไหร่ ตัวใหม่เลื่อนลงมาแทน
function startCountdown(next) {
  clearInterval(countdownTimer);
  const box = content.querySelector('.hero-countdown');
  if (!next || !box) return;

  const target = new Date(next.start_at).getTime();
  function tick() {
    const left = Math.max(0, target - serverNow());
    const values = {
      days: Math.floor(left / DAY_MS),
      hours: Math.floor(left / 3600000) % 24,
      minutes: Math.floor(left / 60000) % 60,
      seconds: Math.floor(left / 1000) % 60,
    };
    Object.entries(values).forEach(([unit, value]) => {
      const slot = box.querySelector(`[data-unit="${unit}"]`);
      const text = String(value).padStart(2, '0');
      if (slot.textContent === text) return;
      slot.innerHTML = `<span class="${prefersReducedMotion() ? '' : 'tick'}">${text}</span>`;
    });
    box.setAttribute('aria-label', `อีก ${values.days} วัน ${values.hours} ชั่วโมง ${values.minutes} นาที ก่อนเริ่มกิจกรรม`);
    if (left === 0) {
      clearInterval(countdownTimer);
      setTimeout(loadDashboard, 1500); // ถึงเวลาแล้ว โหลดใหม่ให้ขึ้นว่ากำลังจัด
    }
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

// เส้นแสงความเร็ววิ่งผ่านแถบหัว (ธีม SpeedX)
function startSpeedLines(canvas) {
  stopSpeedLines();
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a0ec29';
  let width = 0;
  let height = 0;
  let lines = [];
  let frame = 0;
  let last = performance.now();

  function newLine(anywhere) {
    const speed = 120 + Math.random() * 520;
    return {
      x: anywhere ? Math.random() * width : -260 - Math.random() * 400,
      y: Math.random() * height,
      length: 60 + (speed / 640) * 240,
      speed,
      width: Math.random() < 0.15 ? 2 : 1,
      color: Math.random() < 0.35 ? accent : 'rgba(255,255,255,0.9)',
      alpha: 0.25 + Math.random() * 0.55,
    };
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    lines = Array.from({ length: Math.round(width / 22) }, () => newLine(true));
  }

  function draw(now) {
    const seconds = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, width, height);
    lines.forEach((line, index) => {
      line.x += line.speed * seconds;
      if (line.x - line.length > width) lines[index] = newLine(false);
      const gradient = ctx.createLinearGradient(line.x - line.length, 0, line.x, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, line.color);
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(line.x - line.length, line.y);
      ctx.lineTo(line.x, line.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    frame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (prefersReducedMotion()) {
    draw(performance.now());
    cancelAnimationFrame(frame);
  } else {
    frame = requestAnimationFrame(draw);
  }
  stopSpeedLines = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
  };
}

// ---------- 2) ตัวเลขหลัก ----------
function ringHtml(percent) {
  const radius = 22;
  const length = 2 * Math.PI * radius;
  const used = Math.min(percent, 100) / 100;
  return `<svg class="kpi-ring" viewBox="0 0 56 56" aria-hidden="true">
    <circle cx="28" cy="28" r="${radius}" class="kpi-ring-track"/>
    <circle cx="28" cy="28" r="${radius}" class="kpi-ring-fill ${percent >= 80 ? 'over' : ''}"
      stroke-dasharray="${length}" style="--ring-length:${length};--ring-offset:${length * (1 - used)}" transform="rotate(-90 28 28)"/>
  </svg>`;
}

function kpisHtml(k) {
  const cards = [
    {
      label: 'สมาชิก active',
      value: `<span data-count="${k.active_members}">${k.active_members}</span> <small>คน</small>`,
      note: k.inactive_members > 0 ? `ไม่ active ${k.inactive_members} คน` : 'ทุกคนยัง active',
      icon: 'members',
      href: 'members.html',
    },
    {
      label: 'กิจกรรมที่จัดแล้ว',
      value: `<span data-count="${k.events_done}">${k.events_done}</span> <small>/ ${k.events_total}</small>`,
      note: `รอจัดอีก ${k.events_planned} กิจกรรม`,
      icon: 'events',
      href: 'events.html',
    },
    {
      label: 'การเข้าร่วมทั้งหมด',
      value: `<span data-count="${k.total_attendance}">${k.total_attendance}</span> <small>ครั้ง</small>`,
      note: `เฉลี่ย ${k.avg_attendance} คนต่อกิจกรรม`,
      icon: 'check',
      href: 'events.html',
    },
    {
      label: 'งบคงเหลือ',
      value: `<span data-count="${k.remaining}" data-format="money">${formatMoney(k.remaining)}</span>`,
      note: `ใช้ไป ${k.used_percent}% ของ ${formatMoney(k.total_funding)}`,
      ring: ringHtml(k.used_percent),
      href: 'finance.html',
    },
  ];

  return cards
    .map(
      (c, index) => `<a class="card span-3 kpi-card" href="${c.href}" style="--i:${index}">
        <span class="kpi-label">${c.label}</span>
        <span class="kpi-value num">${c.value}</span>
        <span class="muted small">${escapeHtml(c.note)}</span>
        ${c.ring || `<span class="kpi-icon" aria-hidden="true">${icon(c.icon)}</span>`}
      </a>`
    )
    .join('');
}

// ---------- 3) กราฟแท่งรายเดือน (เข้าร่วมจริง + ลงชื่อแล้วของกิจกรรมที่ยังไม่จัด) ----------
// แท่งหัวมน ฐานตรง
function roundedTopBar(x, y, width, height, radius) {
  if (height <= 0) return '';
  const r = Math.min(radius, height, width / 2);
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

function drawMonthlyChart(container, monthly) {
  const total = monthly.reduce((sum, m) => sum + m.attendees + m.registered, 0);
  if (total === 0) {
    renderEmpty(container, 'ยังไม่มีคนเข้าร่วมกิจกรรม');
    return;
  }

  // กว้างเท่ากล่องจริง ตัวหนังสือจะได้ไม่เล็กลงบนจอมือถือ
  const W = Math.min(1200, Math.max(300, container.clientWidth || 640));
  const H = Math.round(Math.min(400, Math.max(240, W * 0.42))); // จอกว้าง กราฟสูงตาม
  const pad = { top: 28, right: 8, bottom: 46, left: 32 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(...monthly.map((m) => m.attendees + m.registered));
  const step = max <= 5 ? 1 : max <= 12 ? 3 : max <= 25 ? 5 : 10;
  const top = Math.ceil(max / step) * step;
  const y = (value) => pad.top + plotH - (value / top) * plotH;
  const slot = plotW / monthly.length;
  const barW = Math.min(88, slot * 0.5);
  const GAP = 2; // ช่องว่างระหว่างสองส่วนของแท่ง

  let grid = '';
  for (let v = 0; v <= top; v += step) {
    grid += `<line x1="${pad.left}" x2="${W - pad.right}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'axis-base' : 'axis-grid'}"/>
      <text x="${pad.left - 8}" y="${y(v) + 4}" text-anchor="end" class="axis-text">${v}</text>`;
  }

  const bars = monthly
    .map((m, index) => {
      const x = pad.left + slot * index + (slot - barW) / 2;
      const attendedTop = y(m.attendees);
      const attendedH = pad.top + plotH - attendedTop;
      const registeredH = (m.registered / top) * plotH;
      const hasBoth = m.attendees > 0 && m.registered > 0;
      const registeredY = attendedTop - registeredH - (hasBoth ? GAP : 0);
      const label = monthLabel(m.month);
      const totalValue = m.attendees + m.registered;

      return `<g class="month-bar" style="--i:${index}" data-index="${index}">
        <rect class="bar-hit" x="${pad.left + slot * index}" y="${pad.top}" width="${slot}" height="${plotH}"/>
        <path class="bar-attended" d="${m.registered > 0 ? `M${x},${attendedTop + attendedH} V${attendedTop} H${x + barW} V${attendedTop + attendedH} Z` : roundedTopBar(x, attendedTop, barW, attendedH, 4)}"/>
        <path class="bar-registered" d="${roundedTopBar(x, registeredY, barW, registeredH, 4)}"/>
        ${totalValue > 0 ? `<text x="${x + barW / 2}" y="${(m.registered > 0 ? registeredY : attendedTop) - 8}" text-anchor="middle" class="bar-value">${totalValue}</text>` : ''}
        <text x="${x + barW / 2}" y="${H - 26}" text-anchor="middle" class="axis-month">${label.short} ${String(label.year).slice(2)}</text>
        <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" class="axis-text">${m.events} กิจกรรม</text>
      </g>`;
    })
    .join('');

  container.removeAttribute('aria-busy');
  container.innerHTML = `
    <ul class="chart-key">
      <li><span class="legend-swatch" style="background:var(--chart-1)"></span>เข้าร่วมจริง</li>
      <li><span class="legend-swatch" style="background:var(--chart-2)"></span>ลงชื่อแล้ว (ยังไม่จัด)</li>
    </ul>
    <svg class="monthly-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="จำนวนคนเข้าร่วมกิจกรรมแต่ละเดือน รายละเอียดอยู่ในตารางด้านล่าง">
      ${grid}${bars}
    </svg>
    <table class="visually-hidden">
      <caption>จำนวนคนเข้าร่วมกิจกรรมรายเดือน</caption>
      <thead><tr><th>เดือน</th><th>กิจกรรม</th><th>เข้าร่วมจริง</th><th>ลงชื่อแล้ว</th></tr></thead>
      <tbody>${monthly.map((m) => `<tr><td>${monthLabel(m.month).short} ${monthLabel(m.month).year}</td><td>${m.events}</td><td>${m.attendees}</td><td>${m.registered}</td></tr>`).join('')}</tbody>
    </table>`;

  container.querySelectorAll('.month-bar').forEach((group) => {
    const m = monthly[Number(group.dataset.index)];
    const label = monthLabel(m.month);
    group.addEventListener('pointermove', (event) =>
      showTooltip(event, `<strong>${label.short} ${label.year}</strong><br>${m.events} กิจกรรม<br>เข้าร่วมจริง ${m.attendees} คน${m.registered ? `<br>ลงชื่อแล้ว ${m.registered} คน` : ''}`)
    );
    group.addEventListener('pointerleave', hideTooltip);
  });
}

// ---------- 4) ชีพจรชมรม: ตารางวันแบบ GitHub สีเข้มตามจำนวนคน ----------
function drawPulse(container, pulse, today) {
  const byDate = new Map(pulse.days.map((d) => [d.date, d]));
  const maxPeople = Math.max(1, ...pulse.days.map((d) => d.people));
  const start = new Date(pulse.start);
  const end = new Date(pulse.end);
  const gridStart = new Date(start.getTime() - start.getUTCDay() * DAY_MS); // ย้อนไปวันอาทิตย์
  const weeks = Math.ceil(((end - gridStart) / DAY_MS + 1) / 7);

  let cells = '';
  const monthMarks = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart.getTime() + (w * 7 + d) * DAY_MS);
      const key = date.toISOString().slice(0, 10);
      if (date < start || date > end) {
        cells += '<span class="pulse-cell blank" aria-hidden="true"></span>';
        continue;
      }
      if (date.getUTCDate() === 1) monthMarks.push({ week: w, month: date.getUTCMonth() });

      const entry = byDate.get(key);
      const level = entry ? Math.max(1, Math.ceil((entry.people / maxPeople) * 4)) : 0;
      const future = entry && entry.events.every((e) => !e.done);
      const classes = ['pulse-cell', `level-${level}`, future ? 'future' : '', key === today ? 'today' : ''].join(' ');
      const dateText = formatDate(`${key}T12:00:00+07:00`);
      const label = entry
        ? `${dateText}: ${entry.events.map((e) => e.title).join(', ')} (${entry.people} คน${future ? ' ลงชื่อ' : ''})`
        : `${dateText}: ไม่มีกิจกรรม`;

      cells += entry
        ? `<a class="${classes}" href="event.html?id=${encodeURIComponent(entry.events[0].event_id)}" style="--w:${w}" data-date="${key}" aria-label="${escapeHtml(label)}"></a>`
        : `<span class="${classes}" style="--w:${w}" data-date="${key}" title="${escapeHtml(label)}"></span>`;
    }
  }

  const monthRow = monthMarks
    .map((m) => `<span style="grid-column:${m.week + 1}">${MONTH_SHORT[m.month]}</span>`)
    .join('');

  container.removeAttribute('aria-busy');
  container.dataset.weeks = weeks;
  container.innerHTML = `
    <div class="pulse-wrap">
      <div class="pulse-weekdays" aria-hidden="true">${WEEKDAY_SHORT.map((d, i) => `<span>${i % 2 === 1 ? d : ''}</span>`).join('')}</div>
      <div class="pulse-scroll">
        <div class="pulse-months" style="--weeks:${weeks}" aria-hidden="true">${monthRow}</div>
        <div class="pulse-grid" style="--weeks:${weeks}">${cells}</div>
      </div>
    </div>
    <div class="pulse-legend muted small">
      <span>ช่องขอบประคือกิจกรรมที่ยังไม่จัด</span>
      <span class="pulse-scale" aria-hidden="true">น้อย
        <span class="pulse-cell level-0"></span><span class="pulse-cell level-1"></span><span class="pulse-cell level-2"></span><span class="pulse-cell level-3"></span><span class="pulse-cell level-4"></span>
      มาก</span>
    </div>`;

  container.querySelectorAll('.pulse-cell[data-date]').forEach((cell) => {
    const entry = byDate.get(cell.dataset.date);
    if (!entry) return;
    const dateText = formatDateLong(`${cell.dataset.date}T12:00:00+07:00`);
    cell.addEventListener('pointermove', (event) =>
      showTooltip(event, `<strong>${escapeHtml(dateText)}</strong><br>${entry.events.map((e) => escapeHtml(e.title)).join('<br>')}<br>${entry.people} คน${entry.events.every((e) => !e.done) ? ' (ลงชื่อแล้ว)' : ''}`)
    );
    cell.addEventListener('pointerleave', hideTooltip);
  });

  sizePulse(container);

  // เลื่อนให้เห็นเดือนปัจจุบันบนจอเล็ก
  const todayCell = container.querySelector('.pulse-cell.today');
  if (todayCell) {
    const scroller = container.querySelector('.pulse-scroll');
    scroller.scrollLeft = Math.max(0, todayCell.offsetLeft - scroller.clientWidth / 2);
  }
}

// ช่องขยายเต็มความกว้างการ์ด (ไม่เล็กกว่า 18px ไม่ใหญ่กว่า 44px)
function sizePulse(container) {
  const scroller = container.querySelector('.pulse-scroll');
  if (!scroller) return;
  const weeks = Number(container.dataset.weeks);
  const cell = Math.max(18, Math.min(52, Math.floor((scroller.clientWidth - (weeks - 1) * 4) / weeks)));
  container.querySelector('.pulse-wrap').style.setProperty('--cell', `${cell}px`);
}

// ---------- 5) สมาชิกขาประจำ: โพเดียม 3 อันดับ + อันดับ 4-5 ----------
function podiumHtml(top, doneEvents) {
  if (top.length === 0) {
    return '<div class="state"><p>ยังไม่มีใครเข้าร่วมกิจกรรม</p></div>';
  }

  const crown = `<svg class="podium-crown" viewBox="0 0 32 24" aria-hidden="true"><path d="M3 20 L5 7 L11 13 L16 3 L21 13 L27 7 L29 20 Z"/><rect x="3" y="20" width="26" height="3" rx="1"/></svg>`;
  const order = [1, 0, 2].filter((index) => top[index]); // ที่ 2 ซ้าย ที่ 1 กลาง ที่ 3 ขวา
  const podium = order
    .map((index) => {
      const m = top[index];
      return `<div class="podium-place place-${index + 1}" style="--i:${index}">
        ${index === 0 ? crown : ''}
        ${memberAvatar(m, 'podium-avatar')}
        <span class="podium-name">${escapeHtml(m.name)}</span>
        <span class="muted small">${escapeHtml(m.faculty)}</span>
        <div class="podium-block"><span class="podium-rank num">${index + 1}</span><span class="podium-count num">${m.attended_count} ครั้ง</span></div>
      </div>`;
    })
    .join('');

  const rest = top
    .slice(3)
    .map(
      (m, i) => `<li>
        <span class="num muted">${i + 4}</span>
        ${memberAvatar(m)}
        <span class="podium-rest-name">${escapeHtml(m.name)}<span class="muted small">${escapeHtml(m.department)}</span></span>
        <span class="num"><strong>${m.attended_count}</strong> <span class="muted small">/ ${doneEvents}</span></span>
      </li>`
    )
    .join('');

  return `<div class="podium">${podium}</div>${rest ? `<ol class="podium-rest">${rest}</ol>` : ''}`;
}

// ---------- 6) ความเคลื่อนไหวล่าสุด ----------
const ACTIVITY_STYLE = {
  funding: { icon: 'finance', label: 'รายรับ' },
  expense: { icon: 'report', label: 'รายจ่าย' },
  event: { icon: 'check', label: 'กิจกรรม' },
  news: { icon: 'news', label: 'ข่าว' },
};

// "เมื่อวาน", "3 วันที่แล้ว", "2 ชั่วโมงที่แล้ว"
function timeAgo(iso, nowIso) {
  const seconds = (new Date(iso) - new Date(nowIso)) / 1000;
  const format = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });
  const steps = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size || unit === 'minute') {
      if (unit === 'day' && Math.abs(seconds) >= 86400 * 30) return formatDate(iso);
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return '';
}

function activityHtml(items, nowIso) {
  if (!items || items.length === 0) return '<div class="state"><p>ยังไม่มีความเคลื่อนไหว</p></div>';
  return `<ol class="timeline">${items
    .map((item, index) => {
      const style = ACTIVITY_STYLE[item.type] || ACTIVITY_STYLE.news;
      const body = `<span class="timeline-title">${escapeHtml(item.title)}</span><span class="muted small">${escapeHtml(item.detail || '')}</span>`;
      return `<li class="timeline-item type-${item.type}" style="--i:${index}">
        <span class="timeline-dot" aria-hidden="true">${icon(style.icon)}</span>
        <div class="timeline-body">
          ${item.event_id ? `<a href="event.html?id=${encodeURIComponent(item.event_id)}">${body}</a>` : `<div>${body}</div>`}
          <time class="muted small" datetime="${escapeHtml(item.at)}" title="${escapeHtml(formatDateLong(item.at))}">${style.label}, ${escapeHtml(timeAgo(item.at, nowIso))}</time>
        </div>
      </li>`;
    })
    .join('')}</ol>`;
}

// ---------- 7) โหมดพรีเซนต์: เอาการ์ดในหน้านี้ขึ้นเต็มจอทีละใบ วนเองทุก 8 วินาที ----------
const SLIDE_SECONDS = 8;
let presentation = null;

function startPresentation(fromClick) {
  if (presentation || !content.querySelector('.dash-hero')) return;

  // สไลด์ = การ์ดในหน้า (ย้ายตัวจริงไปโชว์ แล้วย้ายกลับตอนจบ ตัวเลขนับถอยหลังเลยยังเดินอยู่)
  const slides = [
    { title: content.querySelector('.dash-hero-label') ? content.querySelector('.dash-hero-label').textContent.trim() : 'กิจกรรมถัดไป', nodes: [content.querySelector('.dash-hero')], width: 1200 },
    { title: 'ตัวเลขหลัก', nodes: [...content.querySelectorAll('.kpi-card')], width: 1200, grid: true },
    ...[...content.querySelectorAll('[data-slide]')].map((node) => ({ title: node.dataset.slide, nodes: [node], width: node.classList.contains('span-4') ? 720 : 1200 })),
  ];

  const overlay = document.createElement('div');
  overlay.className = 'present';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'โหมดพรีเซนต์');
  overlay.innerHTML = `
    <div class="present-glow" aria-hidden="true"></div>
    <header class="present-top">
      <img src="assets/logo-white.png" alt="SpeedX" class="present-logo">
      <h2 class="present-title" aria-live="polite"></h2>
      <span class="present-count num"></span>
      <button type="button" class="present-button" data-act="prev" aria-label="สไลด์ก่อนหน้า">${icon('chevronLeft')}</button>
      <button type="button" class="present-button" data-act="pause" aria-label="หยุดชั่วคราว">${icon('pause')}</button>
      <button type="button" class="present-button" data-act="next" aria-label="สไลด์ถัดไป">${icon('chevronRight')}</button>
      <button type="button" class="present-button" data-act="close" aria-label="ออกจากโหมดพรีเซนต์ (Esc)">${icon('close')}</button>
    </header>
    <div class="present-stage"></div>
    <div class="present-dots">${slides.map((s, i) => `<button type="button" data-go="${i}" aria-label="ไปสไลด์ ${i + 1}: ${escapeHtml(s.title)}"></button>`).join('')}</div>
    <div class="present-progress" aria-hidden="true"><span></span></div>`;
  document.body.appendChild(overlay);

  // ย้ายการ์ดเข้าแต่ละสไลด์ ทิ้งที่คั่นไว้ให้ย้ายกลับถูกที่
  const placeholders = [];
  const frames = slides.map((slide) => {
    const frame = document.createElement('div');
    frame.className = `present-frame${slide.grid ? ' present-grid' : ''}`;
    frame.style.width = `${slide.width}px`;
    slide.nodes.forEach((node) => {
      const marker = document.createComment('slide');
      node.before(marker);
      placeholders.push([marker, node]);
      frame.appendChild(node);
    });
    return frame;
  });

  const stage = overlay.querySelector('.present-stage');
  const progress = overlay.querySelector('.present-progress span');
  let index = 0;
  let timer = null;
  let paused = false;

  function fit(frame) {
    frame.style.zoom = 1;
    const room = stage.getBoundingClientRect();
    const zoom = Math.min((room.width * 0.94) / frame.offsetWidth, (room.height * 0.94) / frame.offsetHeight, 2);
    frame.style.zoom = Math.max(0.5, zoom);
  }

  function show(next) {
    index = (next + frames.length) % frames.length;
    stage.replaceChildren(frames[index]); // ใส่ใหม่ = อนิเมชั่นในการ์ดเล่นใหม่
    overlay.querySelector('.present-title').textContent = slides[index].title;
    overlay.querySelector('.present-count').textContent = `${index + 1} / ${frames.length}`;
    overlay.querySelectorAll('[data-go]').forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    window.dispatchEvent(new Event('resize')); // ให้กราฟ / เส้นแสง วาดใหม่ตามขนาดในสไลด์
    const pulse = frames[index].querySelector('#pulse-chart');
    if (pulse) sizePulse(pulse);
    const monthly = frames[index].querySelector('#monthly-chart');
    if (monthly && lastData) drawMonthlyChart(monthly, lastData.monthly);
    fit(frames[index]);
    restartTimer();
  }

  function restartTimer() {
    clearTimeout(timer);
    progress.style.animation = 'none';
    void progress.offsetWidth; // รีสตาร์ทแถบเวลา
    progress.style.animation = paused ? 'none' : `present-progress ${SLIDE_SECONDS}s linear forwards`;
    if (!paused) timer = setTimeout(() => show(index + 1), SLIDE_SECONDS * 1000);
  }

  function togglePause() {
    paused = !paused;
    const button = overlay.querySelector('[data-act="pause"]');
    button.innerHTML = icon(paused ? 'play' : 'pause');
    button.setAttribute('aria-label', paused ? 'เล่นต่อ' : 'หยุดชั่วคราว');
    restartTimer();
  }

  function onKey(event) {
    if (event.key === 'Escape') stop();
    else if (event.key === 'ArrowRight' || event.key === 'PageDown') show(index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') show(index - 1);
    else if (event.key === ' ') togglePause();
    else return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onResize() {
    fit(frames[index]);
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement) stop();
  }

  function stop() {
    if (!presentation) return;
    presentation = null;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    placeholders.forEach(([marker, node]) => marker.replaceWith(node));
    overlay.remove();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    window.dispatchEvent(new Event('resize'));
    const monthly = document.getElementById('monthly-chart');
    if (monthly && lastData) drawMonthlyChart(monthly, lastData.monthly);
    const pulse = document.getElementById('pulse-chart');
    if (pulse) sizePulse(pulse);
    document.getElementById('present-button').focus();
  }

  overlay.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) show(Number(go.dataset.go));
    const act = event.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'next') show(index + 1);
    if (act.dataset.act === 'prev') show(index - 1);
    if (act.dataset.act === 'pause') togglePause();
    if (act.dataset.act === 'close') stop();
  });
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);

  presentation = { stop };
  if (fromClick && document.documentElement.requestFullscreen) {
    document.documentElement
      .requestFullscreen()
      .then(() => document.addEventListener('fullscreenchange', onFullscreenChange))
      .catch(() => {});
  }
  show(0);
  overlay.querySelector('[data-act="close"]').focus({ preventScroll: true });
}

// ---------- รวมทั้งหน้า ----------
let lastData = null;

function renderDashboard(data) {
  lastData = data;
  clockOffset = new Date(data.now).getTime() - Date.now();
  const user = getSavedUser() || { name: '' };
  const firstName = String(user.name || '').trim().split(/\s+/)[0];

  content.innerHTML = `
    <div class="dash-greeting">
      <div>
        <h2>${greeting(data.now)}${firstName ? ` ${escapeHtml(firstName)}` : ''}</h2>
        <p class="muted">${escapeHtml(formatDateLong(data.now))}</p>
      </div>
      <div class="dash-actions">
        <a class="btn btn-outline" href="report.html">${icon('report')}<span>ส่งออกรายงาน</span></a>
        <button type="button" class="btn btn-primary" id="present-button">${icon('play')}<span>โหมดพรีเซนต์</span></button>
      </div>
    </div>
    <div class="grid">
      ${heroHtml(data.next_event)}
      ${kpisHtml(data.kpis)}

      <section class="card span-8" data-slide="คนเข้าร่วมกิจกรรมรายเดือน">
        <div class="card-header"><h2 class="card-title">คนเข้าร่วมกิจกรรมรายเดือน</h2></div>
        <div id="monthly-chart"></div>
      </section>
      <section class="card span-4" data-slide="ประเภทกิจกรรม">
        <div class="card-header"><h2 class="card-title">ประเภทกิจกรรม</h2></div>
        <div id="category-chart" class="compact-pie"></div>
      </section>

      <section class="card span-8" data-slide="ชีพจรชมรม">
        <div class="card-header dash-header-wrap">
          <h2 class="card-title">ชีพจรชมรม</h2>
          <span class="muted small">แต่ละช่องคือ 1 วัน สีเข้มขึ้นตามจำนวนคน</span>
        </div>
        <div id="pulse-chart"></div>
      </section>
      <section class="card span-4" data-slide="สมาชิกขาประจำ">
        <div class="card-header">
          <h2 class="card-title">สมาชิกขาประจำ</h2>
          <a class="text-link small" href="members.html">ดูทั้งหมด</a>
        </div>
        ${podiumHtml(data.top_members, data.done_events)}
      </section>

      <section class="card span-12" data-slide="ความเคลื่อนไหวล่าสุด">
        <div class="card-header">
          <h2 class="card-title">ความเคลื่อนไหวล่าสุด</h2>
          <span class="muted small">รวมจากทุกแท็บในชีต ใหม่สุดอยู่บน</span>
        </div>
        ${activityHtml(data.activity, data.now)}
      </section>
    </div>`;

  document.getElementById('present-button').addEventListener('click', () => startPresentation(true));

  animateCounters(content);
  startCountdown(data.next_event);
  startSpeedLines(content.querySelector('.dash-hero-canvas'));
  drawMonthlyChart(document.getElementById('monthly-chart'), data.monthly);
  lastChartWidth = document.getElementById('monthly-chart').clientWidth;
  drawPulse(document.getElementById('pulse-chart'), data.pulse, data.today);

  const total = data.categories.reduce((sum, c) => sum + c.count, 0);
  drawPieChart(
    document.getElementById('category-chart'),
    data.categories.map((c, i) => ({ label: c.category, value: c.count, color: budgetColor(i) })),
    {
      donut: true,
      title: 'สัดส่วนประเภทกิจกรรม',
      centerLabel: 'กิจกรรม',
      centerValue: String(total),
      centerCount: total,
      formatValue: (v) => `${v} กิจกรรม`,
      emptyMessage: 'ยังไม่มีกิจกรรม',
    }
  );
}

// เปลี่ยนขนาดจอ → วาดกราฟรายเดือนใหม่ให้พอดีกล่อง
let resizeTimer = null;
let lastChartWidth = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const pulse = document.getElementById('pulse-chart');
    if (pulse) sizePulse(pulse);
    const box = document.getElementById('monthly-chart');
    if (!box || !lastData || box.clientWidth === lastChartWidth) return;
    lastChartWidth = box.clientWidth;
    drawMonthlyChart(box, lastData.monthly);
  }, 250);
});

async function loadDashboard() {
  renderLoading(content, 8);
  try {
    renderDashboard(await apiRequest('/api/overview'));
    // เปิดมาจากค้นหาด่วน (dashboard.html?present=1) → เข้าโหมดพรีเซนต์เลย
    if (new URLSearchParams(window.location.search).get('present') === '1') {
      history.replaceState(null, '', 'dashboard.html');
      setTimeout(() => startPresentation(false), 900);
    }
  } catch (error) {
    renderError(content, error.message, loadDashboard);
  }
}

loadDashboard();
