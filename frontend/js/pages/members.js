// ===== หน้า สมาชิก: ตารางสมาชิก + กราฟสัดส่วนตามคณะ + ลบสมาชิก =====
initLayout();

const tableBox = document.getElementById('member-table');
const chartBox = document.getElementById('faculty-chart');
const totalText = document.getElementById('member-total');
const dialog = document.getElementById('remove-dialog');
let memberToRemove = null;

function renderTable(members) {
  const mostAttended = Math.max(1, ...members.map((m) => m.attended_count));

  if (members.length === 0) {
    renderEmpty(tableBox, 'ยังไม่มีสมาชิกที่ active');
    return;
  }

  const rows = members
    .map(
      (m, index) => `<tr data-row="${escapeHtml(m.member_id)}" style="--i:${index}">
        <td>
          <div class="member-cell">
            <span class="member-avatar" style="background:${FACULTY_COLORS[m.faculty] || OTHER_COLOR}" aria-hidden="true">${escapeHtml(getInitials(m.name))}</span>
            <div><strong>${escapeHtml(m.name)}</strong><div class="muted small">${escapeHtml(m.department)}</div></div>
          </div>
        </td>
        <td>${escapeHtml(m.faculty)}</td>
        <td class="num">ปี ${escapeHtml(m.study_year)}</td>
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
          <th scope="col">ชื่อ</th><th scope="col">คณะ</th><th scope="col">ชั้นปี</th>
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

function renderChart(byFaculty) {
  const items = byFaculty.map((f) => ({
    label: f.faculty,
    value: f.count,
    color: FACULTY_COLORS[f.faculty] || OTHER_COLOR,
  }));
  drawPieChart(chartBox, items, {
    title: 'สัดส่วนสมาชิกตามคณะ',
    formatValue: (v) => `${v} คน`,
    emptyMessage: 'ยังไม่มีสมาชิกสำหรับแสดงกราฟ',
  });
}

async function loadMembers() {
  renderLoading(tableBox, 6);
  renderLoading(chartBox, 3);
  try {
    const data = await apiRequest('/api/members');
    totalText.innerHTML = `<span data-count="${data.total}">${data.total}</span> คน`;
    animateCounters(totalText);
    renderTable(data.members);
    renderChart(data.by_faculty);
  } catch (error) {
    renderError(tableBox, error.message, loadMembers);
    chartBox.innerHTML = '';
  }
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
      setTimeout(loadMembers, 340);
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
