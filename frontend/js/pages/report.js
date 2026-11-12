// ===== รายงานสรุปชมรม (report.html): รวมข้อมูลทุกหน้าเป็นเอกสาร A4 พร้อมพิมพ์ / บันทึกเป็น PDF =====
// ใช้ API เดิม 3 เส้น: /api/overview, /api/finance, /api/events

const report = document.getElementById('report');
const printButton = document.getElementById('print-button');
const MONTH_LONG = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

document.getElementById('back-link').innerHTML = `${icon('arrowLeft')}<span>กลับ</span>`;
printButton.innerHTML = `${icon('printer')}<span>พิมพ์ / บันทึกเป็น PDF</span>`;
printButton.addEventListener('click', () => window.print());

// แท่งแนวนอนเล็ก ๆ ในตาราง (พิมพ์ออกมาก็ยังเห็น)
function barHtml(value, max) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return `<span class="r-bar"><span style="width:${width}%"></span></span>`;
}

function section(number, title, body, note = '') {
  return `<section class="r-section">
    <h2><span class="r-num">${number}</span>${title}</h2>
    ${note ? `<p class="r-note">${note}</p>` : ''}
    ${body}
  </section>`;
}

function renderReport(overview, finance, events) {
  const user = getSavedUser() || { name: '' };
  const k = overview.kpis;
  const generated = `${formatDateLong(overview.now)} เวลา ${formatTime(overview.now)} น.`;

  // ---------- 1. ตัวเลขหลัก ----------
  const kpis = [
    { label: 'สมาชิก active', value: `${k.active_members}`, unit: 'คน' },
    { label: 'กิจกรรมที่จัดแล้ว', value: `${k.events_done} / ${k.events_total}`, unit: 'กิจกรรม' },
    { label: 'การเข้าร่วมทั้งหมด', value: `${k.total_attendance}`, unit: `ครั้ง (เฉลี่ย ${k.avg_attendance} คน)` },
    { label: 'งบคงเหลือ', value: formatMoney(k.remaining), unit: `ใช้ไป ${k.used_percent}%` },
  ];
  const kpiHtml = `<div class="r-kpis">${kpis
    .map((x) => `<div class="r-kpi"><span class="r-kpi-label">${x.label}</span><span class="r-kpi-value">${escapeHtml(x.value)}</span><span class="r-kpi-unit">${escapeHtml(x.unit)}</span></div>`)
    .join('')}</div>`;

  // ---------- 2. กิจกรรมทั้งหมด (เรียงตามวัน) ----------
  const sortedEvents = [...events].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const eventRows = sortedEvents
    .map(
      (e) => `<tr>
        <td><strong>${escapeHtml(e.title)}</strong><span class="r-sub">${escapeHtml(e.category)} | ${escapeHtml(e.location || '-')}</span></td>
        <td class="r-nowrap">${escapeHtml(formatDateRange(e.start_at, e.end_at))}</td>
        <td><span class="r-status r-${STATUS_CLASS[e.status] || 'status-cancelled'}">${escapeHtml(e.status)}</span></td>
        <td class="r-right">${e.attendee_count}</td>
        <td class="r-right">${escapeHtml(formatMoney(e.actual_spent))}</td>
      </tr>`
    )
    .join('');
  const eventsHtml = `<table class="r-table">
    <thead><tr><th>กิจกรรม</th><th>วันที่</th><th>สถานะ</th><th class="r-right">เข้าร่วมจริง</th><th class="r-right">ใช้จ่ายจริง</th></tr></thead>
    <tbody>${eventRows}</tbody>
  </table>`;

  // ---------- 3. รายเดือน ----------
  const maxMonth = Math.max(1, ...overview.monthly.map((m) => m.attendees + m.registered));
  const monthRows = overview.monthly
    .map((m) => {
      const [year, month] = m.month.split('-').map(Number);
      return `<tr>
        <td>${MONTH_LONG[month - 1]} ${year}</td>
        <td class="r-right">${m.events}</td>
        <td class="r-right">${m.attendees}</td>
        <td class="r-right">${m.registered || '-'}</td>
        <td class="r-bar-cell">${barHtml(m.attendees + m.registered, maxMonth)}</td>
      </tr>`;
    })
    .join('');
  const monthlyHtml = `<table class="r-table">
    <thead><tr><th>เดือน</th><th class="r-right">กิจกรรม</th><th class="r-right">เข้าร่วมจริง</th><th class="r-right">ลงชื่อแล้ว</th><th></th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>`;

  // ---------- 4. การเงิน ----------
  const maxSource = Math.max(1, ...finance.funding_sources.map((f) => f.amount));
  const sourceRows = finance.funding_sources
    .map(
      (f) => `<tr>
        <td><strong>${escapeHtml(f.source_name)}</strong><span class="r-sub">${escapeHtml(f.source_type)}</span></td>
        <td class="r-right">${escapeHtml(formatMoney(f.amount))}</td>
        <td class="r-right">${escapeHtml(formatMoney(f.spent))}</td>
        <td class="r-right">${escapeHtml(formatMoney(f.amount - f.spent))}</td>
        <td class="r-bar-cell">${barHtml(f.amount, maxSource)}</td>
      </tr>`
    )
    .join('');
  const maxCategory = Math.max(1, ...finance.spending_by_category.map((c) => c.amount));
  const categoryRows = finance.spending_by_category
    .map(
      (c) => `<tr>
        <td>${escapeHtml(c.category)}</td>
        <td class="r-right">${escapeHtml(formatMoney(c.amount))}</td>
        <td class="r-right">${c.percent}%</td>
        <td class="r-bar-cell">${barHtml(c.amount, maxCategory)}</td>
      </tr>`
    )
    .join('');
  const financeHtml = `
    <div class="r-budget">
      <div class="r-budget-track"><span style="width:${Math.min(100, finance.used_percent)}%"></span><i style="left:80%"></i></div>
      <p>ใช้ไป <strong>${escapeHtml(formatMoney(finance.total_spent))}</strong> จาก ${escapeHtml(formatMoney(finance.total_funding))} (${finance.used_percent}%) เส้นเตือนอยู่ที่ 80%</p>
    </div>
    <h3>แหล่งเงิน</h3>
    <table class="r-table">
      <thead><tr><th>แหล่งเงิน</th><th class="r-right">ได้รับ</th><th class="r-right">ใช้ไป</th><th class="r-right">คงเหลือ</th><th></th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table>
    <h3>ใช้จ่ายตามหมวด</h3>
    <table class="r-table">
      <thead><tr><th>หมวด</th><th class="r-right">จำนวนเงิน</th><th class="r-right">สัดส่วน</th><th></th></tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>`;

  // ---------- 5. สมาชิกขาประจำ ----------
  const topHtml = overview.top_members.length
    ? `<ol class="r-top">${overview.top_members
        .map((m) => `<li><strong>${escapeHtml(m.name)}</strong><span>${escapeHtml(m.faculty)} ปี ${escapeHtml(m.study_year)}, ${escapeHtml(m.department)}</span><b>${m.attended_count} ครั้ง</b></li>`)
        .join('')}</ol>`
    : '<p class="r-note">ยังไม่มีข้อมูลการเข้าร่วม</p>';

  // ---------- กิจกรรมถัดไป ----------
  const next = overview.next_event;
  const nextHtml = next
    ? `<div class="r-next"><span>กิจกรรมถัดไป</span><strong>${escapeHtml(next.title)}</strong><em>${escapeHtml(formatDateRangeLong(next.start_at, next.end_at))}, ${escapeHtml(formatTimeRange(next.start_at, next.end_at))} ที่ ${escapeHtml(next.location || '-')} (ลงชื่อแล้ว ${next.registered_count} คน)</em></div>`
    : '';

  report.removeAttribute('aria-busy');
  report.innerHTML = `
    <header class="r-header">
      <img src="assets/logo-charcoal.png" alt="SpeedX" class="r-logo">
      <div class="r-title">
        <h1>รายงานสรุปชมรม</h1>
        <p>ข้อมูล ณ ${escapeHtml(generated)}${user.name ? `  จัดทำโดย ${escapeHtml(user.name)}` : ''}</p>
      </div>
    </header>
    ${nextHtml}
    ${section(1, 'ตัวเลขหลัก', kpiHtml)}
    ${section(2, 'กิจกรรมทั้งหมด', eventsHtml, `${events.length} กิจกรรม เรียงตามวันที่จัด`)}
    ${section(3, 'การเข้าร่วมรายเดือน', monthlyHtml)}
    ${section(4, 'การเงิน', financeHtml)}
    ${section(5, 'สมาชิกขาประจำ', topHtml, 'นับจากการเข้าร่วมจริงในแท็บ Attendance')}
    <footer class="r-footer">
      <span>สร้างจากระบบ SpeedX: Club Activity Dashboard</span>
      <span>ข้อมูลทั้งหมดดึงสดจาก Google Sheets</span>
    </footer>`;

  document.title = `รายงานสรุปชมรม ${todayFileStamp()} | SpeedX`; // ชื่อไฟล์ตอนบันทึก PDF
  printButton.disabled = false;
}

// วันที่สำหรับชื่อไฟล์ PDF
function todayFileStamp() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

async function loadReport() {
  try {
    const [overview, finance, eventsResult] = await Promise.all([
      apiRequest('/api/overview'),
      apiRequest('/api/finance'),
      apiRequest('/api/events'),
    ]);
    renderReport(overview, finance, eventsResult.events);
    // เปิดมาพร้อม ?print=1 (จากปุ่มลัด) → เปิดหน้าต่างพิมพ์ทันที
    if (new URLSearchParams(window.location.search).get('print') === '1') setTimeout(() => window.print(), 600);
  } catch (error) {
    report.removeAttribute('aria-busy');
    report.innerHTML = `<p class="report-loading">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(error.message)}</p>`;
  }
}

loadReport();
