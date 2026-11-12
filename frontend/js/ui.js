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
