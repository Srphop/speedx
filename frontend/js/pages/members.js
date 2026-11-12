// ===== หน้า สมาชิก: ตัวกรอง + ตารางสมาชิก + กราฟสัดส่วนตามคณะ + ลบสมาชิก =====
initLayout();

const tableBox = document.getElementById('member-table');
const chartBox = document.getElementById('faculty-chart');
const totalText = document.getElementById('member-total');
const filterBox = document.getElementById('member-filters');
const dialog = document.getElementById('remove-dialog');
let memberToRemove = null;

let allMembers = []; // สมาชิก active ทั้งหมดจาก backend
let lastData = ''; // ข้อมูลรอบล่าสุด ไว้เทียบว่าชีตเปลี่ยนไหม

// ---------- ตัวกรอง ----------
// ค่าที่เลือกอยู่ ('' = ทั้งหมด)
const filters = { faculty: '', year: '', department: '', attended: '' };

// ช่วงจำนวนครั้งที่เข้าร่วมกิจกรรม
const ATTENDED_OPTIONS = [
  { value: 'none', label: 'ยังไม่เคยเข้าร่วม', test: (n) => n === 0 },
  { value: 'some', label: '1–2 ครั้ง', test: (n) => n >= 1 && n <= 2 },
  { value: 'many', label: '3 ครั้งขึ้นไป', test: (n) => n >= 3 },
];

// รายการค่าที่ไม่ซ้ำ เรียงตามตัวอักษร เช่น ['นิเทศศาสตร์', 'วิทยาศาสตร์', ...]
function uniqueValues(key) {
  return [...new Set(allMembers.map((m) => m[key]).filter((v) => v !== '' && v !== undefined))].sort((a, b) =>
    String(a).localeCompare(String(b), 'th', { numeric: true })
  );
}

function selectHtml(name, label, options) {
  const optionTags = options
    .map((o) => `<option value="${escapeHtml(o.value)}" ${String(filters[name]) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`)
    .join('');
  return `<label class="filter-field">
    <span>${label}</span>
    <select class="select" data-filter="${name}">
      <option value="">ทั้งหมด</option>${optionTags}
    </select>
  </label>`;
}

function renderFilters() {
  const anyActive = Object.values(filters).some(Boolean);
  filterBox.innerHTML = `
    ${selectHtml('faculty', 'คณะ', uniqueValues('faculty').map((v) => ({ value: v, label: v })))}
    ${selectHtml('year', 'ชั้นปี', uniqueValues('study_year').map((v) => ({ value: v, label: `ปี ${v}` })))}
    ${selectHtml('department', 'ฝ่าย', uniqueValues('department').map((v) => ({ value: v, label: v })))}
    ${selectHtml('attended', 'เข้าร่วมกิจกรรม', ATTENDED_OPTIONS)}
    <button type="button" class="btn btn-outline filter-reset" id="filter-reset" ${anyActive ? '' : 'hidden'}>ล้างตัวกรอง</button>`;

  filterBox.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      filters[select.dataset.filter] = select.value;
      renderFilters();
      renderVisible();
      filterBox.querySelector(`[data-filter="${select.dataset.filter}"]`).focus();
    });
  });

  document.getElementById('filter-reset').addEventListener('click', resetFilters);
}

function resetFilters() {
  Object.keys(filters).forEach((key) => (filters[key] = ''));
  renderFilters();
  renderVisible();
}

function getVisibleMembers() {
  const attendedRule = ATTENDED_OPTIONS.find((o) => o.value === filters.attended);
  return allMembers.filter(
    (m) =>
      (!filters.faculty || m.faculty === filters.faculty) &&
      (!filters.year || String(m.study_year) === filters.year) &&
      (!filters.department || m.department === filters.department) &&
      (!attendedRule || attendedRule.test(m.attended_count))
  );
}

// ---------- ตาราง ----------
function renderTable(members) {
  if (members.length === 0) {
    const hasFilter = Object.values(filters).some(Boolean);
    renderEmpty(
      tableBox,
      hasFilter ? 'ไม่มีสมาชิกที่ตรงกับตัวกรองนี้' : 'ยังไม่มีสมาชิกที่ active',
      hasFilter ? '<button type="button" class="btn btn-outline" id="empty-reset">ล้างตัวกรอง</button>' : ''
    );
    if (hasFilter) document.getElementById('empty-reset').addEventListener('click', resetFilters);
    return;
  }

  const mostAttended = Math.max(1, ...members.map((m) => m.attended_count));
  const rows = members
    .map(
      (m, index) => `<tr data-row="${escapeHtml(m.member_id)}" style="--i:${index}">
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td>${escapeHtml(m.faculty)}</td>
        <td class="num">ปี ${escapeHtml(m.study_year)}</td>
        <td>${escapeHtml(m.department)}</td>
        <td class="num align-right">
          <span class="mini-meter">
            <span class="mini-meter-track" aria-hidden="true"><span class="mini-meter-fill" style="display:block;width:${(m.attended_count / mostAttended) * 100}%"></span></span>
            <span>${m.attended_count} ครั้ง</span>
          </span>
        </td>
        <td class="align-right">
          <button type="button" class="btn btn-danger-text" data-id="${escapeHtml(m.member_id)}" data-name="${escapeHtml(m.name)}">ลบ</button>
        </td>
      </tr>`
    )
    .join('');

  tableBox.removeAttribute('aria-busy');
  tableBox.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th scope="col">ชื่อ</th><th scope="col">คณะ</th><th scope="col">ชั้นปี</th><th scope="col">ฝ่าย</th>
          <th scope="col" class="align-right">เข้าร่วมกิจกรรมจริง</th><th scope="col"><span class="visually-hidden">จัดการ</span></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  tableBox.querySelectorAll('button[data-id]').forEach((button) => {
    button.setAttribute('aria-label', `ลบ ${button.dataset.name}`);
    button.addEventListener('click', () => openRemoveDialog(button.dataset.id, button.dataset.name));
  });
}

// ---------- กราฟสัดส่วนตามคณะ (ตามสมาชิกที่กรองอยู่) ----------
function renderChart(members) {
  const counts = new Map();
  members.forEach((m) => counts.set(m.faculty, (counts.get(m.faculty) || 0) + 1));

  const items = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([faculty, count]) => ({ label: faculty, value: count, color: FACULTY_COLORS[faculty] || OTHER_COLOR }));

  drawPieChart(chartBox, items, {
    title: 'สัดส่วนสมาชิกตามคณะ',
    formatValue: (v) => `${v} คน`,
    emptyMessage: 'ไม่มีสมาชิกสำหรับแสดงกราฟ',
  });
}

// วาดตาราง กราฟ และจำนวนคน ตามตัวกรองที่เลือก
function renderVisible() {
  const visible = getVisibleMembers();
  totalText.textContent =
    visible.length === allMembers.length ? `${allMembers.length} คน` : `แสดง ${visible.length} จาก ${allMembers.length} คน`;
  renderTable(visible);
  renderChart(visible);
}

// ---------- โหลดข้อมูล ----------
// quiet = true คือโหลดเงียบ ๆ เบื้องหลัง (ไม่โชว์แถบโหลด ไม่โชว์ error)
async function loadMembers(quiet = false) {
  if (!quiet) {
    renderLoading(tableBox, 6);
    renderLoading(chartBox, 3);
  }
  try {
    const data = await apiRequest('/api/members');

    // ข้อมูลเหมือนเดิม ไม่ต้องวาดใหม่ (ตารางกับกราฟจะได้ไม่กระพริบ)
    if (quiet && JSON.stringify(data) === lastData) return;
    lastData = JSON.stringify(data);

    allMembers = data.members;
    renderFilters();
    renderVisible();
    if (!quiet) flashLinkedMember();
  } catch (error) {
    if (quiet) return;
    renderError(tableBox, error.message, () => loadMembers());
    chartBox.innerHTML = '';
  }
}

// เปิดมาจากค้นหาด่วน (members.html?member=MEM-001) → เลื่อนไปที่แถวนั้นแล้วกระพริบ
function flashLinkedMember() {
  const id = new URLSearchParams(window.location.search).get('member');
  if (!id) return;
  const row = tableBox.querySelector(`tr[data-row="${CSS.escape(id)}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  row.classList.add('row-flash');
}

// ---------- ลบสมาชิก (เปลี่ยนสถานะเป็น inactive ใน Google Sheet) ----------
function openRemoveDialog(id, name) {
  memberToRemove = { id, name };
  document.getElementById('remove-text').textContent =
    `ลบ ${name} ออกจากรายชื่อสมาชิกใช่ไหม ประวัติการเข้าร่วมกิจกรรมของ ${name} จะยังอยู่ครบ`;
  document.getElementById('remove-error').textContent = '';
  dialog.showModal();
}

document.getElementById('remove-cancel').addEventListener('click', () => dialog.close());

document.getElementById('remove-confirm').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'กำลังลบ…';

  try {
    const result = await apiRequest(`/api/members/${encodeURIComponent(memberToRemove.id)}/deactivate`, { method: 'PATCH' });
    dialog.close();
    showToast(result.message);

    // แถวที่ลบเลื่อนออกก่อน แล้วค่อยโหลดตารางและกราฟใหม่
    const row = tableBox.querySelector(`tr[data-row="${CSS.escape(memberToRemove.id)}"]`);
    if (row && !prefersReducedMotion()) {
      row.classList.add('row-leaving');
      setTimeout(() => loadMembers(), 340);
    } else {
      loadMembers();
    }
  } catch (error) {
    document.getElementById('remove-error').textContent = `${error.message} กดลบสมาชิกอีกครั้งเพื่อลองใหม่`;
  } finally {
    button.disabled = false;
    button.textContent = 'ลบสมาชิก';
  }
});

loadMembers();

// เช็กข้อมูลใหม่จากชีตทุก 10 วินาที แก้ในชีตแล้วหน้าเว็บอัปเดตเอง ไม่ต้องกดรีเฟรช
setInterval(() => {
  if (!dialog.open && document.visibilityState === 'visible') loadMembers(true);
}, 10000);
