// ===== ส่วนแสดงผลที่ใช้ซ้ำ: กำลังโหลด / ไม่มีข้อมูล / ผิดพลาด / ข้อความแจ้ง =====

function renderLoading(container, lines = 4) {
  container.setAttribute('aria-busy', 'true');
  container.innerHTML =
    '<span class="visually-hidden">กำลังโหลด</span>' +
    Array.from({ length: lines }, (_, i) => `<div class="skeleton" style="width:${90 - i * 12}%"></div>`).join('');
}

function renderEmpty(container, message, actionHtml = '') {
  container.removeAttribute('aria-busy');
  container.innerHTML = `<div class="state"><p>${escapeHtml(message)}</p>${actionHtml}</div>`;
}

// แสดง error พร้อมปุ่ม "ลองอีกครั้ง" ที่เรียกฟังก์ชันโหลดเดิมซ้ำ
function renderError(container, message, onRetry) {
  container.removeAttribute('aria-busy');
  container.innerHTML = `
    <div class="state state-error" role="alert">
      <p>${escapeHtml(message)}</p>
      <button type="button" class="btn btn-outline">ลองอีกครั้ง</button>
    </div>`;
  container.querySelector('button').addEventListener('click', onRetry);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('leaving'), 2900); // เลื่อนลงหายไป (animations.css)
  setTimeout(() => toast.remove(), 3200);
}

// ปิดเมนูลอยเมื่อกดข้างนอกหรือกด Esc
function setupPopover(button, popover) {
  function close() {
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = popover.hidden;
    document.querySelectorAll('.popover').forEach((p) => (p.hidden = true));
    document.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    popover.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));
  });

  popover.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) {
      close();
      button.focus();
    }
  });

  return close;
}

// ===== ปุ่มเข้าร่วมกิจกรรม (หน้ากิจกรรม / รายละเอียด / ภาพรวม / ปฏิทิน ใช้ร่วมกัน) =====
// กดได้เฉพาะสมาชิกชมรม และกิจกรรมที่สถานะ "ใกล้ถึง" (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้น)
// event ต้องมี event_id, status, my_status ('ลงชื่อแล้ว' | 'เข้าร่วมจริง' | 'ไม่มา' | null)
// options.small = ปุ่มเล็ก, options.explain = บอกเหตุผลเมื่อกดไม่ได้
function joinControlHtml(event, options = {}) {
  const id = escapeHtml(event.event_id);
  const size = options.small ? 'btn-small' : '';

  if (event.my_status === 'เข้าร่วมจริง') {
    return `<span class="join-done">${icon('check')}<span>คุณเข้าร่วมแล้ว</span></span>`;
  }
  if (event.status !== 'ใกล้ถึง') {
    // บอกเหตุผลเฉพาะกิจกรรมที่ยังไม่ถึง (จัดแล้ว / ยกเลิก ไม่ต้องมีอะไร)
    return options.explain && event.status === 'วางแผนไว้'
      ? '<p class="join-hint">กดเข้าร่วมได้เมื่อกิจกรรมใกล้ถึง (ภายใน 3 วันก่อนเริ่ม)</p>'
      : '';
  }
  if (isClubMember() === false) {
    return options.explain ? `<p class="join-hint">${icon('lock')}<span>ผู้เยี่ยมชมกดเข้าร่วมไม่ได้ ให้ประธานตั้งตำแหน่งในชีตก่อน</span></p>` : '';
  }
  if (event.my_status === 'ลงชื่อแล้ว') {
    return `<span class="join-control">
      <span class="join-done">${icon('check')}<span>ลงชื่อแล้ว</span></span>
      <button type="button" class="btn btn-outline ${size}" data-join-cancel="${id}">ยกเลิก</button>
    </span>`;
  }
  return `<button type="button" class="btn btn-primary ${size}" data-join="${id}">${icon('plus')}<span>เข้าร่วมกิจกรรม</span></button>`;
}

// ผูกปุ่มเข้าร่วม / ยกเลิก ใน container แล้วเรียก onChanged() ให้หน้าโหลดข้อมูลใหม่
function bindJoinControls(container, onChanged) {
  container.querySelectorAll('[data-join], [data-join-cancel]').forEach((button) => {
    // ปุ่มอยู่ในแถวตารางที่กดแล้วเปิดหน้ารายละเอียด → ไม่ให้ส่งต่อไปถึงแถว
    button.addEventListener('keydown', (event) => event.stopPropagation());
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const cancel = button.hasAttribute('data-join-cancel');
      const id = cancel ? button.dataset.joinCancel : button.dataset.join;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        const result = await apiRequest(`/api/events/${encodeURIComponent(id)}/join`, { method: cancel ? 'DELETE' : 'POST' });
        showToast(result.message);
        await onChanged();
      } catch (error) {
        showToast(error.message);
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  });
}
