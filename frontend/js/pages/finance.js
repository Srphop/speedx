// ===== หน้า งบการเงิน =====
initLayout();

const content = document.getElementById('finance-content');
const ALERT_PERCENT = 80; // เส้นเตือนบนแถบงบ (ตรงกับการแจ้งเตือนในกระดิ่ง)

function renderFinance(data) {
  const usedWidth = Math.min(data.used_percent, 100);

  const eventRows = data.spending_by_event
    .map(
      (e) => `<tr class="clickable" tabindex="0" data-id="${escapeHtml(e.event_id)}">
        <td><strong>${escapeHtml(e.title)}</strong></td>
        <td class="num">${escapeHtml(formatDate(e.start_at))}</td>
        <td class="num align-right">${escapeHtml(formatMoney(e.planned_budget))}</td>
        <td class="num align-right"><strong>${escapeHtml(formatMoney(e.amount))}</strong></td>
        <td class="row-arrow">${icon('chevronRight')}</td>
      </tr>`
    )
    .join('');

  content.innerHTML = `
    <div class="grid">
      <section class="card span-4 stat-card">
        <span class="stat-icon" aria-hidden="true">${icon('finance')}</span>
        <p class="stat-label">งบทั้งหมด</p>
        <p class="stat-value" data-count="${data.total_funding}" data-format="money">${formatMoney(data.total_funding)}</p>
        <p class="muted small">จาก ${data.funding_sources.length} แหล่งเงิน</p>
      </section>
      <section class="card span-4 stat-card highlight">
        <span class="stat-icon" aria-hidden="true">${icon('events')}</span>
        <p class="stat-label">ใช้ไปแล้ว</p>
        <p class="stat-value" data-count="${data.total_spent}" data-format="money">${formatMoney(data.total_spent)}</p>
        <p class="muted small">${data.used_percent}% ของงบทั้งหมด</p>
      </section>
      <section class="card span-4 stat-card">
        <span class="stat-icon" aria-hidden="true">${icon('check')}</span>
        <p class="stat-label">งบคงเหลือ</p>
        <p class="stat-value" data-count="${data.remaining}" data-format="money">${formatMoney(data.remaining)}</p>
        <p class="muted small">${Math.round((100 - data.used_percent) * 10) / 10}% ของงบทั้งหมด</p>
      </section>

      <section class="card span-12">
        <div class="card-header" style="margin-bottom:0">
          <h2 class="card-title">การใช้งบ</h2>
          <span class="num"><strong>${data.used_percent}%</strong></span>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.used_percent}"
             aria-label="ใช้งบไปแล้ว ${data.used_percent}%">
          <div class="progress-fill ${data.used_percent >= ALERT_PERCENT ? 'over' : ''}" style="width:${usedWidth}%"></div>
          <div class="progress-marker" style="left:${ALERT_PERCENT}%" title="เส้นเตือน ${ALERT_PERCENT}%"></div>
        </div>
        <div class="progress-legend muted small">
          <span>ใช้ไป ${formatMoney(data.total_spent)} จาก ${formatMoney(data.total_funding)}</span>
          <span>เส้นตั้งที่ ${ALERT_PERCENT}% ถ้าเกินจะมีแจ้งเตือนที่กระดิ่ง</span>
        </div>
      </section>

      <section class="card span-6">
        <div class="card-header"><h2 class="card-title">ใช้จ่ายตามหมวด</h2></div>
        <div id="category-chart"></div>
      </section>
      <section class="card span-6">
        <div class="card-header"><h2 class="card-title">แหล่งเงิน</h2></div>
        <div id="source-chart"></div>
      </section>

      <section class="card span-12">
        <div class="card-header"><h2 class="card-title">ค่าใช้จ่ายรายกิจกรรม</h2></div>
        ${
          data.spending_by_event.length === 0
            ? '<div class="state"><p>ยังไม่มีค่าใช้จ่ายของกิจกรรมใด</p></div>'
            : `<div class="table-wrap"><table class="table">
                <thead><tr><th scope="col">กิจกรรม</th><th scope="col">วันที่</th>
                  <th scope="col" class="align-right">งบที่วางแผนไว้</th><th scope="col" class="align-right">ใช้จริง</th><th scope="col"><span class="visually-hidden">เปิด</span></th></tr></thead>
                <tbody>${eventRows}</tbody>
              </table></div>`
        }
      </section>
    </div>`;

  animateCounters(content); // ตัวเลขเงินวิ่งขึ้น

  drawBarList(
    document.getElementById('category-chart'),
    data.spending_by_category.map((c) => ({ label: c.category, value: c.amount, percent: c.percent })),
    { formatValue: formatMoney, emptyMessage: 'ยังไม่มีค่าใช้จ่าย' }
  );

  drawPieChart(
    document.getElementById('source-chart'),
    data.funding_sources.map((s, i) => ({ label: s.source_name, value: s.amount, color: budgetColor(i) })),
    {
      donut: true,
      title: 'แหล่งเงินของชมรม',
      centerLabel: 'งบทั้งหมด',
      centerValue: formatMoney(data.total_funding),
      centerCount: data.total_funding,
      centerFormat: 'money',
      formatValue: formatMoney,
      emptyMessage: 'ยังไม่มีข้อมูลแหล่งเงิน',
    }
  );

  content.querySelectorAll('tr[data-id]').forEach((row) => {
    const open = () => (window.location.href = `event.html?id=${encodeURIComponent(row.dataset.id)}`);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') open();
    });
  });
}

async function loadFinance() {
  renderLoading(content, 8);
  try {
    renderFinance(await apiRequest('/api/finance'));
  } catch (error) {
    renderError(content, error.message, loadFinance);
  }
}

loadFinance();
