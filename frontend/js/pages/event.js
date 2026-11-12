// ===== หน้า รายละเอียดกิจกรรม (event.html?id=EVT-001) =====
initLayout();

const eventId = new URLSearchParams(window.location.search).get('id');
const detailBox = document.getElementById('event-detail');
document.getElementById('back-link').innerHTML = `${icon('arrowLeft')} กลับไปหน้ากิจกรรม`;

function attendeesHtml(data) {
  if (data.attendee_groups.length === 0) {
    const registered = data.registered_total > 0 ? ` ตอนนี้ลงชื่อไว้ ${data.registered_total} คน` : '';
    return `<div class="state"><p>ยังไม่มีผู้เข้าร่วมจริง${registered}</p></div>`;
  }

  // แยกตามฝ่าย กลุ่มแรกเปิดไว้ กลุ่มอื่นยุบ
  return data.attendee_groups
    .map(
      (group, index) => `<details class="accordion" ${index === 0 ? 'open' : ''}>
        <summary><span>${escapeHtml(group.department)} <span class="muted num">(${group.count} คน)</span></span>${icon('chevronDown')}</summary>
        <ul>${group.members
          .map((m) => `<li><span>${escapeHtml(m.name)}</span><span class="muted small">${escapeHtml(m.faculty)} ปี ${escapeHtml(m.study_year)}</span></li>`)
          .join('')}</ul>
      </details>`
    )
    .join('');
}

// รายการแบบมีไอคอนนำหน้า (วัตถุประสงค์ / สิ่งที่ทำในกิจกรรม)
function listHtml(items, iconName, className) {
  return `<ul class="${className}">${items
    .map((item) => `<li>${icon(iconName)}<span>${escapeHtml(item)}</span></li>`)
    .join('')}</ul>`;
}

// การ์ด "เกี่ยวกับกิจกรรม": ทำอะไร มีวัตถุประสงค์อะไร ใครเข้าร่วมได้
function aboutHtml(e) {
  const objectives = e.objectives && e.objectives.length > 0
    ? listHtml(e.objectives, 'check', 'about-list')
    : '<p class="muted small">ยังไม่ได้ระบุ เพิ่มได้ในคอลัมน์ objective ของแท็บ Events</p>';

  const highlights = e.highlights && e.highlights.length > 0
    ? listHtml(e.highlights, 'chevronRight', 'about-list')
    : '<p class="muted small">ยังไม่ได้ระบุ เพิ่มได้ในคอลัมน์ highlights ของแท็บ Events</p>';

  return `
    <section class="card span-8 stack-md">
      <div class="card-header"><h2 class="card-title">เกี่ยวกับกิจกรรม</h2></div>
      ${e.description ? `<p class="event-description">${escapeHtml(e.description)}</p>` : ''}
      <div class="about-grid">
        <div>
          <h3 class="about-heading">วัตถุประสงค์</h3>
          ${objectives}
        </div>
        <div>
          <h3 class="about-heading">สิ่งที่ทำในกิจกรรม</h3>
          ${highlights}
        </div>
      </div>
      ${e.target_group ? `<p class="target-group"><span class="muted">กลุ่มเป้าหมาย</span> <strong>${escapeHtml(e.target_group)}</strong></p>` : ''}
    </section>`;
}

function renderDetail(data) {
  const e = data.event;
  document.title = `${e.title} | SpeedX`;

  detailBox.innerHTML = `
    <div class="event-heading">
      <h2>${escapeHtml(e.title)}</h2>
      ${statusBadge(e.status)}
    </div>

    <div class="grid" style="margin-bottom:24px">
      ${aboutHtml(e)}
      <section class="card span-4 stack-md">
        <div class="card-header"><h2 class="card-title">ข้อมูลกิจกรรม</h2></div>
        <dl class="detail-list" style="grid-template-columns:1fr">
          <div><dt>วันที่</dt><dd>${escapeHtml(formatDateRangeLong(e.start_at, e.end_at))}</dd></div>
          ${isMultiDay(e.start_at, e.end_at) ? `<div><dt>ระยะเวลา</dt><dd>${countDays(e.start_at, e.end_at)} วัน</dd></div>` : ''}
          <div><dt>เวลา</dt><dd class="num">${escapeHtml(formatTimeRange(e.start_at, e.end_at))}</dd></div>
          <div><dt>สถานที่</dt><dd>${escapeHtml(e.location)}</dd></div>
          <div><dt>ประเภท</dt><dd>${escapeHtml(e.category)}</dd></div>
          <div><dt>ฝ่ายที่จัด</dt><dd>${escapeHtml(e.organizer)}</dd></div>
          <div><dt>งบที่วางแผนไว้</dt><dd class="num">${escapeHtml(formatMoney(e.planned_budget))}</dd></div>
        </dl>
        <div class="calendar-actions">
          <a class="btn btn-outline btn-small" href="${escapeHtml(googleCalendarUrl(e))}" target="_blank" rel="noopener">${icon('calendar')}<span>Google Calendar</span></a>
          <button type="button" class="btn btn-outline btn-small" id="download-ics">${icon('download')}<span>ไฟล์ปฏิทิน .ics</span></button>
        </div>
      </section>
    </div>

    <div class="grid">
      <section class="card span-6">
        <div class="card-header">
          <h2 class="card-title">สมาชิกที่เข้าร่วม</h2>
          <span class="muted num">${data.attendee_total} คน</span>
        </div>
        ${attendeesHtml(data)}
      </section>
      <section class="card span-6">
        <div class="card-header"><h2 class="card-title">งบที่ใช้ในกิจกรรม</h2></div>
        <div id="budget-chart"></div>
      </section>
    </div>`;

  document.getElementById('download-ics').addEventListener('click', () => downloadIcs(e));

  drawPieChart(
    document.getElementById('budget-chart'),
    data.spending_by_category.map((c, i) => ({ label: c.category, value: c.amount, color: budgetColor(i) })),
    {
      donut: true,
      title: 'งบที่ใช้ในกิจกรรม แยกตามหมวด',
      centerLabel: 'ใช้จริง',
      centerValue: formatMoney(data.total_spent),
      centerCount: data.total_spent,
      centerFormat: 'money',
      formatValue: formatMoney,
      emptyMessage: 'กิจกรรมนี้ยังไม่มีค่าใช้จ่าย',
    }
  );
}

async function loadEvent() {
  if (!eventId) {
    renderEmpty(detailBox, 'ไม่ได้ระบุกิจกรรม เลือกกิจกรรมจากหน้ากิจกรรม');
    return;
  }
  renderLoading(detailBox, 6);
  try {
    renderDetail(await apiRequest(`/api/events/${encodeURIComponent(eventId)}`));
  } catch (error) {
    renderError(detailBox, error.message, loadEvent);
  }
}

loadEvent();
