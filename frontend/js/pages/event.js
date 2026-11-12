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

function renderDetail(data) {
  const e = data.event;
  document.title = `${e.title} | SpeedX`;

  detailBox.innerHTML = `
    <div class="event-heading">
      <h2>${escapeHtml(e.title)}</h2>
      ${statusBadge(e.status)}
    </div>

    <section class="card" style="margin-bottom:24px">
      <dl class="detail-list">
        <div><dt>วันที่</dt><dd>${escapeHtml(formatDateLong(e.start_at))}</dd></div>
        <div><dt>เวลา</dt><dd class="num">${escapeHtml(formatTimeRange(e.start_at, e.end_at))}</dd></div>
        <div><dt>สถานที่</dt><dd>${escapeHtml(e.location)}</dd></div>
        <div><dt>ประเภท</dt><dd>${escapeHtml(e.category)}</dd></div>
        <div><dt>ฝ่ายที่จัด</dt><dd>${escapeHtml(e.organizer)}</dd></div>
        <div><dt>งบที่วางแผนไว้</dt><dd class="num">${escapeHtml(formatMoney(e.planned_budget))}</dd></div>
      </dl>
      ${e.description ? `<p class="muted" style="margin-top:16px">${escapeHtml(e.description)}</p>` : ''}
    </section>

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
