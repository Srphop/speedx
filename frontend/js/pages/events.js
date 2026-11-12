// ===== หน้า กิจกรรม: ค้นหา + กรองสถานะ + ตารางกิจกรรม =====
initLayout();

const FILTERS = ['ทั้งหมด', 'จัดแล้ว', 'ใกล้ถึง', 'วางแผนไว้'];
const tableBox = document.getElementById('event-table');
const searchInput = document.getElementById('event-search');
const filterButton = document.getElementById('filter-button');
const filterPopover = document.getElementById('filter-popover');

let allEvents = [];
let selectedFilter = 'ทั้งหมด';

document.getElementById('search-icon').outerHTML = icon('search');

// ---------- เมนูตัวกรอง ----------
function renderFilterMenu() {
  filterButton.innerHTML = `${icon('filter')} ตัวกรอง: ${selectedFilter}`;
  filterPopover.innerHTML = FILTERS.map(
    (name) => `<button type="button" class="popover-item menu-option" role="menuitemradio"
      aria-checked="${name === selectedFilter}" data-filter="${name}">
      <span>${name}</span>${name === selectedFilter ? icon('check') : ''}
    </button>`
  ).join('');

  filterPopover.querySelectorAll('[data-filter]').forEach((option) => {
    option.addEventListener('click', () => {
      selectedFilter = option.dataset.filter;
      closeFilterMenu();
      renderFilterMenu();
      renderTable();
      filterButton.focus();
    });
  });
}
const closeFilterMenu = setupPopover(filterButton, filterPopover);

// ---------- ตาราง ----------
function getVisibleEvents() {
  const keyword = searchInput.value.trim().toLowerCase();
  return allEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(keyword);
    const matchesFilter = selectedFilter === 'ทั้งหมด' || event.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });
}

function renderTable() {
  const events = getVisibleEvents();

  if (events.length === 0) {
    renderEmpty(
      tableBox,
      'ไม่พบกิจกรรมที่ตรงกับคำค้นหรือตัวกรองนี้',
      '<button type="button" class="btn btn-outline" id="reset-filters">ล้างคำค้นและตัวกรอง</button>'
    );
    document.getElementById('reset-filters').addEventListener('click', () => {
      searchInput.value = '';
      selectedFilter = 'ทั้งหมด';
      renderFilterMenu();
      renderTable();
    });
    return;
  }

  const rows = events
    .map(
      (e) => `<tr class="clickable" tabindex="0" data-id="${escapeHtml(e.event_id)}">
        <td>
          <strong>${escapeHtml(e.title)}</strong>
          ${e.description ? `<div class="muted small row-description">${escapeHtml(e.description)}</div>` : ''}
        </td>
        <td class="num">${escapeHtml(formatDateRange(e.start_at, e.end_at))}<div class="muted small">${escapeHtml(formatTimeRange(e.start_at, e.end_at))}${isMultiDay(e.start_at, e.end_at) ? ` (${countDays(e.start_at, e.end_at)} วัน)` : ''}</div></td>
        <td><span class="tag">${escapeHtml(e.category)}</span></td>
        <td>${statusBadge(e.status)}</td>
        <td class="row-arrow">${icon('chevronRight')}</td>
      </tr>`
    )
    .join('');

  tableBox.removeAttribute('aria-busy');
  tableBox.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th scope="col">ชื่อกิจกรรม</th><th scope="col">วันที่</th><th scope="col">ประเภท</th><th scope="col">สถานะ</th><th scope="col"><span class="visually-hidden">เปิด</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="muted small" style="margin-top:12px">แสดง ${events.length} จาก ${allEvents.length} กิจกรรม เลือกแถวเพื่อดูรายละเอียด</p>`;

  // คลิกหรือกด Enter ที่แถว → เปิดรายละเอียดกิจกรรม
  tableBox.querySelectorAll('tr[data-id]').forEach((row) => {
    const open = () => (window.location.href = `event.html?id=${encodeURIComponent(row.dataset.id)}`);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') open();
    });
  });
}

async function loadEvents() {
  renderLoading(tableBox, 6);
  try {
    const data = await apiRequest('/api/events');
    allEvents = data.events;
    renderTable();
  } catch (error) {
    renderError(tableBox, error.message, loadEvents);
  }
}

searchInput.addEventListener('input', renderTable);
renderFilterMenu();
loadEvents();
