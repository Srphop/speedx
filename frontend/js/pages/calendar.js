// ===== หน้า แผนกิจกรรมรายปี: ปฏิทินรายเดือน / รายปี + รายละเอียดกิจกรรม + เพิ่มกิจกรรม =====
initLayout();

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const CATEGORIES = ['จิตอาสา', 'ให้ความรู้', 'สานสัมพันธ์', 'รับน้อง', 'อื่น ๆ'];
const DEPARTMENTS = ['ฝ่ายกิจกรรม', 'ฝ่ายประชาสัมพันธ์', 'ฝ่ายการเงิน'];

const controls = document.getElementById('calendar-controls');
const body = document.getElementById('calendar-body');
const calendarCard = document.getElementById('calendar-card');
const panel = document.getElementById('event-panel');
const addDialog = document.getElementById('add-dialog');
const addForm = document.getElementById('add-form');

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

// วันที่แบบที่ช่อง <input type="date"> ใช้ เช่น "2026-11-05"
function inputDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// วันเริ่ม/วันจบของกิจกรรม เป็นข้อความ "YYYY-MM-DD" (เทียบกันได้ตรง ๆ)
function eventRange(e) {
  const start = bangkokDateKey(e.start_at);
  const end = e.end_at ? bangkokDateKey(e.end_at) : start;
  return { start, end: end < start ? start : end };
}

// กิจกรรมที่จัดอยู่ในวันนั้น (รวมกิจกรรมหลายวันที่คร่อมวันนั้นด้วย)
function eventsOn(key) {
  return state.events
    .filter((e) => {
      const r = eventRange(e);
      return r.start <= key && key <= r.end;
    })
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
}

// กิจกรรมหลายวันในสัปดาห์หนึ่ง → จัดเป็น "เลน" ให้แถบของกิจกรรมเดียวกันอยู่แถวเดียวกันทุกวัน
function weekLanes(weekKeys) {
  const first = weekKeys[0];
  const last = weekKeys[6];
  const multi = state.events
    .filter((e) => {
      const r = eventRange(e);
      return r.start !== r.end && r.start <= last && r.end >= first;
    })
    .sort((a, b) => eventRange(a).start.localeCompare(eventRange(b).start) || eventRange(b).end.localeCompare(eventRange(a).end));

  const laneEnds = []; // วันสุดท้ายที่ใช้แต่ละเลนไปแล้ว
  const lanes = new Map();
  multi.forEach((e) => {
    const r = eventRange(e);
    let lane = laneEnds.findIndex((end) => end < r.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = r.end;
    lanes.set(e.event_id, lane);
  });
  return lanes;
}

// ปุ่มกิจกรรมหนึ่งอันในช่องวัน (กิจกรรมหลายวันจะต่อกันเป็นแถบยาว)
function chipHtml(e, key, column) {
  const r = eventRange(e);
  const multi = r.start !== r.end;
  const fromLeft = multi && key > r.start && column > 0; // ต่อมาจากวันก่อนหน้าในแถวเดียวกัน
  const toRight = multi && key < r.end && column < 6; // ยังต่อไปวันถัดไปในแถวเดียวกัน
  const isFirstPiece = key === r.start || column === 0; // แสดงชื่อเฉพาะวันแรก หรือต้นสัปดาห์
  const time = key === r.start ? `${formatTime(e.start_at)} ` : '';
  const days = multi ? ` · ${countDays(e.start_at, e.end_at)} วัน` : '';
  // จำนวนช่องที่แถบนี้ยาวต่อไปในแถวนี้ (ให้ชื่อวิ่งยาวไปตามแถบได้)
  const daysLeft = Math.round((new Date(r.end) - new Date(key)) / 86400000) + 1;
  const spanInRow = multi ? Math.min(daysLeft, 7 - column) : 1;
  const classes = ['event-chip', STATUS_CLASS[e.status] || '', multi ? 'multi-day' : '', fromLeft ? 'cont-left' : '', toRight ? 'cont-right' : '', isFirstPiece ? '' : 'continued'];

  return `<button type="button" class="${classes.join(' ')}" data-id="${escapeHtml(e.event_id)}" style="--span:${spanInRow}"
    ${isFirstPiece ? '' : 'tabindex="-1"'}
    aria-pressed="${e.event_id === state.selectedId}" aria-label="${escapeHtml(e.title)} ${escapeHtml(formatDateRange(e.start_at, e.end_at))} ${escapeHtml(e.status)}">
    <span class="chip-title">${escapeHtml(time + e.title)}</span>
    <span class="chip-status">${escapeHtml(e.status + days)}</span>
  </button>`;
}

// ช่องว่างความสูงเท่าปุ่มกิจกรรม ไว้ดันให้แถบหลายวันตรงแถวกัน
const LANE_SPACER = '<span class="event-chip lane-spacer" aria-hidden="true"><span class="chip-title">&nbsp;</span><span class="chip-status">&nbsp;</span></span>';

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
    </div>
    <button type="button" class="btn btn-primary" id="add-button">${icon('plus')} เพิ่มกิจกรรม</button>`;

  document.getElementById('prev-button').addEventListener('click', () => move(-1));
  document.getElementById('next-button').addEventListener('click', () => move(1));
  document.getElementById('today-button').addEventListener('click', () => {
    state.year = state.today.year;
    state.month = state.today.month;
    render();
  });
  document.getElementById('add-button').addEventListener('click', () => openAddDialog());
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

  const cellDate = (i) => {
    const date = new Date(Date.UTC(state.year, state.month - 1, 1 - firstWeekday + i));
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
  };
  let lanes = new Map();

  for (let i = 0; i < totalCells; i++) {
    const { y, m, d } = cellDate(i);
    const key = inputDate(y, m, d);
    const column = i % 7;
    const isToday = dateKey(y, m, d) === dateKey(state.today.year, state.today.month, state.today.day);

    // ต้นสัปดาห์: จัดเลนของกิจกรรมหลายวันใหม่
    if (column === 0) {
      lanes = weekLanes([0, 1, 2, 3, 4, 5, 6].map((n) => {
        const c = cellDate(i + n);
        return inputDate(c.y, c.m, c.d);
      }));
    }

    const dayEvents = eventsOn(key);
    const laneSlots = [];
    dayEvents.filter((e) => lanes.has(e.event_id)).forEach((e) => (laneSlots[lanes.get(e.event_id)] = e));
    const laneHtml = Array.from(laneSlots, (e) => (e ? chipHtml(e, key, column) : LANE_SPACER)).join('');
    const singleHtml = dayEvents.filter((e) => !lanes.has(e.event_id)).map((e) => chipHtml(e, key, column)).join('');
    const chips = laneHtml + singleHtml;

    cells += `<div class="day-cell ${m !== state.month ? 'outside' : ''} ${isToday ? 'today' : ''}">
      <span class="day-number num" ${isToday ? 'aria-label="วันนี้"' : ''}>${d}</span>
      <button type="button" class="day-add" data-date="${inputDate(y, m, d)}" aria-label="เพิ่มกิจกรรมวันที่ ${d} ${MONTH_NAMES[m - 1]}">${icon('plus')}</button>
      ${chips}
    </div>`;
  }

  body.innerHTML = `<div class="month-grid ${state.slideFrom}">${cells}</div>`;
  body.querySelectorAll('.event-chip').forEach((chip) =>
    chip.addEventListener('click', () => selectEvent(chip.dataset.id === state.selectedId ? null : chip.dataset.id))
  );
  body.querySelectorAll('.day-add').forEach((button) =>
    button.addEventListener('click', () => openAddDialog(button.dataset.date))
  );
}

// ---------- มุมมองรายปี (ไว้กระโดดไปเดือนที่ต้องการ) ----------
function renderYear() {
  const months = MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    const monthStart = inputDate(state.year, month, 1);
    const monthEnd = inputDate(state.year, month, 31); // เทียบเป็นข้อความ ใช้ 31 ได้ทุกเดือน
    const inMonth = state.events.filter((e) => {
      const r = eventRange(e);
      return r.start <= monthEnd && r.end >= monthStart;
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

// ---------- แผงรายละเอียดกิจกรรม (แสดงเฉพาะตอนเลือกกิจกรรมแล้ว) ----------
function renderPanel() {
  const event = state.events.find((e) => e.event_id === state.selectedId);

  // ยังไม่ได้เลือก → ซ่อนแผง ให้ปฏิทินกว้างเต็มแถว
  panel.hidden = !event;
  panel.classList.toggle('sheet-open', Boolean(event));
  calendarCard.classList.toggle('span-12', !event);
  calendarCard.classList.toggle('span-8', Boolean(event));
  if (!event) return;

  panel.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${escapeHtml(event.title)}</h2>
      <button type="button" class="icon-button" id="panel-close" aria-label="ปิดรายละเอียด">${icon('close')}</button>
    </div>
    <div class="event-panel-body">
      <p style="margin-bottom:16px">${statusBadge(event.status)}</p>
      ${event.description ? `<p class="muted" style="margin-bottom:16px">${escapeHtml(event.description)}</p>` : ''}
      <dl class="detail-list" style="grid-template-columns:1fr">
        <div><dt>วันที่</dt><dd>${escapeHtml(formatDateRangeLong(event.start_at, event.end_at))}</dd></div>
        ${isMultiDay(event.start_at, event.end_at) ? `<div><dt>ระยะเวลา</dt><dd>${countDays(event.start_at, event.end_at)} วัน</dd></div>` : ''}
        <div><dt>เวลา</dt><dd class="num">${escapeHtml(formatTimeRange(event.start_at, event.end_at))}</dd></div>
        <div><dt>สถานที่</dt><dd>${escapeHtml(event.location)}</dd></div>
        <div><dt>ผู้จัด</dt><dd>${escapeHtml(event.organizer)}</dd></div>
      </dl>
      <a class="btn btn-primary" style="margin-top:24px;width:100%" href="event.html?id=${encodeURIComponent(event.event_id)}">ดูรายละเอียดกิจกรรม</a>
    </div>`;

  document.getElementById('panel-close').addEventListener('click', () => selectEvent(null));
}

function selectEvent(id) {
  state.selectedId = id;
  renderMonth();
  renderPanel();
}

// กด Esc ปิดแผงรายละเอียด
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.selectedId && !addDialog.open) selectEvent(null);
});

function render() {
  renderControls();
  if (state.view === 'month') renderMonth();
  else renderYear();
  renderPanel();
  state.slideFrom = ''; // เลือกกิจกรรมทีหลังไม่ต้องเลื่อนซ้ำ
}

// ---------- เพิ่มกิจกรรม (บันทึกเป็นแถวใหม่ในแท็บ Events ของชีต) ----------
function fillSelect(name, options) {
  addForm.elements[name].innerHTML = options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
}

function setAddError(name, message) {
  const input = addForm.elements[name];
  document.getElementById(`add-${name}-error`).textContent = message || '';
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function clearAddErrors() {
  ['title', 'date', 'end_date', 'start_time', 'end_time', 'location', 'planned_budget'].forEach((name) => setAddError(name, ''));
  document.getElementById('add-message').textContent = '';
}

function openAddDialog(date) {
  addForm.reset();
  clearAddErrors();

  // ฝ่ายที่จัด: ฝ่ายหลัก + ฝ่ายที่เคยจัดกิจกรรมในชีต
  const organizers = [...new Set([...DEPARTMENTS, ...state.events.map((e) => e.organizer).filter(Boolean)])];
  fillSelect('category', CATEGORIES);
  fillSelect('department', organizers);

  addForm.elements.date.value = date || inputDate(state.today.year, state.today.month, state.today.day);
  addForm.elements.end_date.value = addForm.elements.date.value; // เริ่มต้นเป็นกิจกรรมวันเดียว
  addForm.elements.end_date.min = addForm.elements.date.value;
  addForm.elements.start_time.value = '13:00';
  addForm.elements.end_time.value = '16:00';
  addForm.elements.planned_budget.value = '0';
  addDialog.showModal();
  addForm.elements.title.focus();
}

// ตรวจในหน้าเว็บก่อนส่ง
function validateAddForm(values) {
  const errors = {
    title: values.title ? '' : 'กรุณากรอกชื่อกิจกรรม',
    date: values.date ? '' : 'กรุณาเลือกวันที่เริ่ม',
    end_date: !values.end_date ? 'กรุณาเลือกวันที่จบ' : values.end_date < values.date ? 'วันที่จบต้องไม่ก่อนวันที่เริ่ม' : '',
    start_time: values.start_time ? '' : 'กรุณาเลือกเวลาเริ่ม',
    // วันเดียวกัน เวลาจบต้องหลังเวลาเริ่ม (หลายวันไม่ต้องเช็ก)
    end_time: !values.end_time
      ? 'กรุณาเลือกเวลาจบ'
      : values.end_date === values.date && values.end_time <= values.start_time ? 'เวลาจบต้องหลังเวลาเริ่ม' : '',
    location: values.location ? '' : 'กรุณากรอกสถานที่',
    planned_budget: Number(values.planned_budget) >= 0 ? '' : 'งบต้องเป็นตัวเลข 0 ขึ้นไป',
  };
  Object.entries(errors).forEach(([name, message]) => setAddError(name, message));
  return Object.values(errors).every((m) => !m);
}

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAddErrors();

  const values = Object.fromEntries(new FormData(addForm).entries());
  Object.keys(values).forEach((key) => (values[key] = String(values[key]).trim()));
  if (!validateAddForm(values)) return;

  const button = document.getElementById('add-submit');
  button.disabled = true;
  button.textContent = 'กำลังบันทึก…';

  try {
    const result = await apiRequest('/api/events', { method: 'POST', body: values });
    addDialog.close();
    showToast(result.message);
    launchConfetti(); // พลุกระดาษฉลอง (animations.js)

    // โหลดกิจกรรมใหม่ แล้วพาไปเดือนนั้นพร้อมเปิดรายละเอียดกิจกรรมที่เพิ่ม
    const data = await apiRequest('/api/events');
    state.events = data.events;
    const [year, month] = values.date.split('-').map(Number);
    state.year = year;
    state.month = month;
    state.view = 'month';
    state.selectedId = result.event_id;
    render();
  } catch (error) {
    Object.entries(error.fieldErrors || {}).forEach(([name, message]) => setAddError(name, message));
    document.getElementById('add-message').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'เพิ่มกิจกรรม';
  }
});

// พิมพ์แก้ช่องไหน ล้าง error ของช่องนั้น
['title', 'date', 'end_date', 'start_time', 'end_time', 'location', 'planned_budget'].forEach((name) =>
  addForm.elements[name].addEventListener('input', () => setAddError(name, ''))
);

// เลื่อนวันที่เริ่มไปหลังวันที่จบ → ขยับวันที่จบตามให้อัตโนมัติ
addForm.elements.date.addEventListener('change', () => {
  const { date, end_date: endDate } = addForm.elements;
  endDate.min = date.value;
  if (!endDate.value || endDate.value < date.value) endDate.value = date.value;
  setAddError('end_date', '');
});

document.getElementById('add-cancel').addEventListener('click', () => addDialog.close());
document.getElementById('add-close').innerHTML = icon('close');
document.getElementById('add-close').addEventListener('click', () => addDialog.close());

// ---------- โหลดข้อมูล ----------
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

    // เปิดมาจากค้นหาด่วน / หน้าภาพรวม (calendar.html?add=1) → เปิดฟอร์มเพิ่มกิจกรรมเลย
    if (new URLSearchParams(window.location.search).get('add') === '1') {
      history.replaceState(null, '', 'calendar.html');
      openAddDialog();
    }
  } catch (error) {
    renderError(body, error.message, loadCalendar);
  }
}

renderControls();
renderPanel();
loadCalendar();
