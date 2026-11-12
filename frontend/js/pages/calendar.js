// ===== หน้า แผนกิจกรรมรายปี: ปฏิทินรายเดือน / รายปี + รายละเอียดกิจกรรมที่เลือก =====
initLayout();

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const controls = document.getElementById('calendar-controls');
const body = document.getElementById('calendar-body');
const panel = document.getElementById('event-panel');

// สถานะของหน้านี้
const state = {
  view: 'month', // 'month' หรือ 'year'
  year: 2026,
  month: 11, // 1-12
  today: bangkokParts(new Date().toISOString()),
  events: [],
  selectedId: null,
  slideFrom: '', // 'from-right' / 'from-left' ใช้เลื่อนปฏิทินตามทิศที่กด
};

function dateKey(year, month, day) {
  return `${year}-${month}-${day}`;
}

function eventsOn(year, month, day) {
  return state.events.filter((e) => {
    const p = bangkokParts(e.start_at);
    return p.year === year && p.month === month && p.day === day;
  });
}

// ---------- ปุ่มควบคุม ----------
function renderControls() {
  const label = state.view === 'month' ? `${MONTH_NAMES[state.month - 1]} ${state.year}` : `ปี ${state.year}`;
  const unit = state.view === 'month' ? 'เดือน' : 'ปี';

  controls.innerHTML = `
    <button type="button" class="icon-button" id="prev-button" aria-label="${unit}ก่อนหน้า">${icon('chevronLeft')}</button>
    <button type="button" class="icon-button" id="next-button" aria-label="${unit}ถัดไป">${icon('chevronRight')}</button>
    <h2 class="calendar-label" aria-live="polite">${label}</h2>
    <button type="button" class="btn btn-outline" id="today-button">วันนี้</button>
    <div class="segmented" role="group" aria-label="มุมมองปฏิทิน">
      <button type="button" data-view="month" aria-pressed="${state.view === 'month'}">เดือน</button>
      <button type="button" data-view="year" aria-pressed="${state.view === 'year'}">ปี</button>
    </div>`;

  document.getElementById('prev-button').addEventListener('click', () => move(-1));
  document.getElementById('next-button').addEventListener('click', () => move(1));
  document.getElementById('today-button').addEventListener('click', () => {
    state.year = state.today.year;
    state.month = state.today.month;
    render();
  });
  controls.querySelectorAll('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    })
  );
}

function move(step) {
  state.slideFrom = step > 0 ? 'from-right' : 'from-left';
  if (state.view === 'year') {
    state.year += step;
  } else {
    state.month += step;
    if (state.month < 1) { state.month = 12; state.year -= 1; }
    if (state.month > 12) { state.month = 1; state.year += 1; }
  }
  render();
}

// ---------- มุมมองรายเดือน ----------
function renderMonth() {
  const firstWeekday = new Date(Date.UTC(state.year, state.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(state.year, state.month, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  let cells = WEEKDAYS.map((d) => `<div class="weekday" aria-hidden="true">${d}</div>`).join('');

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(Date.UTC(state.year, state.month - 1, 1 - firstWeekday + i));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const isToday = dateKey(y, m, d) === dateKey(state.today.year, state.today.month, state.today.day);

    const chips = eventsOn(y, m, d)
      .map(
        (e) => `<button type="button" class="event-chip ${STATUS_CLASS[e.status] || ''}" data-id="${escapeHtml(e.event_id)}"
          aria-pressed="${e.event_id === state.selectedId}" aria-label="${escapeHtml(e.title)} ${escapeHtml(e.status)}">
          <span class="chip-title">${escapeHtml(formatTime(e.start_at))} ${escapeHtml(e.title)}</span>
          <span class="chip-status">${escapeHtml(e.status)}</span>
        </button>`
      )
      .join('');

    cells += `<div class="day-cell ${m !== state.month ? 'outside' : ''} ${isToday ? 'today' : ''}">
      <span class="day-number num" ${isToday ? 'aria-label="วันนี้"' : ''}>${d}</span>${chips}
    </div>`;
  }

  body.innerHTML = `<div class="month-grid ${state.slideFrom}">${cells}</div>`;
  body.querySelectorAll('.event-chip').forEach((chip) =>
    chip.addEventListener('click', () => selectEvent(chip.dataset.id))
  );
}

// ---------- มุมมองรายปี (ไว้กระโดดไปเดือนที่ต้องการ) ----------
function renderYear() {
  const months = MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    const inMonth = state.events.filter((e) => {
      const p = bangkokParts(e.start_at);
      return p.year === state.year && p.month === month;
    });
    const isCurrent = state.year === state.today.year && month === state.today.month;
    const badges = inMonth.slice(0, 3).map((e) => statusBadge(e.status)).join('');

    return `<button type="button" class="year-month ${isCurrent ? 'current' : ''}" data-month="${month}">
      <span class="year-month-name">${name}</span>
      <span class="muted small">${inMonth.length === 0 ? 'ไม่มีกิจกรรม' : `${inMonth.length} กิจกรรม`}</span>
      <span class="year-month-dots">${badges}</span>
    </button>`;
  }).join('');

  body.innerHTML = `<div class="year-grid ${state.slideFrom}">${months}</div>`;
  body.querySelectorAll('[data-month]').forEach((button) =>
    button.addEventListener('click', () => {
      state.month = Number(button.dataset.month);
      state.view = 'month';
      render();
    })
  );
}

// ---------- แผงรายละเอียดกิจกรรมที่เลือก ----------
function renderPanel() {
  const event = state.events.find((e) => e.event_id === state.selectedId);
  panel.classList.toggle('sheet-open', Boolean(event));

  if (!event) {
    panel.innerHTML = `
      <div class="card-header"><h2 class="card-title">รายละเอียดกิจกรรม</h2></div>
      <p class="muted event-panel-empty">เลือกกิจกรรมในปฏิทินเพื่อดูรายละเอียด</p>`;
    return;
  }

  panel.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${escapeHtml(event.title)}</h2>
      <button type="button" class="icon-button sheet-close" id="sheet-close" aria-label="ปิดรายละเอียด">${icon('close')}</button>
    </div>
    <div class="event-panel-body">
      <p style="margin-bottom:16px">${statusBadge(event.status)}</p>
      <dl class="detail-list" style="grid-template-columns:1fr">
        <div><dt>วันที่</dt><dd>${escapeHtml(formatDateLong(event.start_at))}</dd></div>
        <div><dt>เวลา</dt><dd class="num">${escapeHtml(formatTimeRange(event.start_at, event.end_at))}</dd></div>
        <div><dt>สถานที่</dt><dd>${escapeHtml(event.location)}</dd></div>
        <div><dt>ผู้จัด</dt><dd>${escapeHtml(event.organizer)}</dd></div>
      </dl>
      <a class="btn btn-primary" style="margin-top:24px;width:100%" href="event.html?id=${encodeURIComponent(event.event_id)}">ดูรายละเอียดกิจกรรม</a>
    </div>`;

  document.getElementById('sheet-close').addEventListener('click', () => selectEvent(null));
}

function selectEvent(id) {
  state.selectedId = id;
  renderMonth();
  renderPanel();
}

function render() {
  renderControls();
  if (state.view === 'month') renderMonth();
  else renderYear();
  renderPanel();
  state.slideFrom = ''; // เลือกกิจกรรมทีหลังไม่ต้องเลื่อนซ้ำ
}

async function loadCalendar() {
  renderLoading(body, 6);
  try {
    const [eventData, notificationData] = await Promise.all([
      apiRequest('/api/events'),
      getNotifications().catch(() => null),
    ]);
    state.events = eventData.events;

    // ใช้ "วันนี้" ของเซิร์ฟเวอร์ (ตรงกับเวลาที่ใช้คำนวณสถานะใกล้ถึง)
    if (notificationData) state.today = bangkokParts(notificationData.generated_at);
    state.year = state.today.year;
    state.month = state.today.month;
    render();
  } catch (error) {
    renderError(body, error.message, loadCalendar);
  }
}

renderControls();
renderPanel();
loadCalendar();
