// ===== ตัวช่วยของหน้าเข้าสู่ระบบ / สมัครบัญชี =====

// ล็อกอินอยู่แล้ว ไม่ต้องอยู่หน้านี้
if (getToken()) {
  window.location.replace('dashboard.html');
}

// ปุ่มรูปตา แสดง/ซ่อนรหัสผ่าน
document.querySelectorAll('.password-toggle').forEach((button) => {
  const input = document.getElementById(button.dataset.target);
  function update() {
    const visible = input.type === 'text';
    button.innerHTML = icon(visible ? 'eyeOff' : 'eye');
    button.setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
  }
  button.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    update();
  });
  update();
});

// แสดง error ใต้ช่องที่ผิด (ส่ง '' เพื่อล้าง)
function setFieldError(name, message) {
  const input = document.getElementById(name);
  document.getElementById(`${name}-error`).textContent = message || '';
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function setFormMessage(message) {
  document.getElementById('form-message').textContent = message || '';
}

// ระหว่างส่งฟอร์ม: ล็อกปุ่ม และถ้ารอนานบอกว่าเซิร์ฟเวอร์กำลังตื่น (Render แบบฟรีจะหลับเมื่อไม่มีคนใช้)
function setSubmitting(submitting, label) {
  const button = document.getElementById('submit-button');
  const hint = document.getElementById('wake-hint');
  button.disabled = submitting;
  button.textContent = submitting ? 'กำลังดำเนินการ…' : label;
  document.dispatchEvent(new CustomEvent('space-warp', { detail: submitting })); // ดาวเร่งเป็น warp (space.js)

  clearTimeout(setSubmitting.timer);
  hint.hidden = true;
  if (submitting) setSubmitting.timer = setTimeout(() => (hint.hidden = false), 5000);
}

// ล็อกอินสำเร็จ: เก็บ token ใช้ธีมของบัญชี แล้วไปหน้าภาพรวม
function finishLogin(result) {
  saveSession(result.token, result.user);
  applyTheme(result.user.theme || 'light');

  // โลโก้พุ่งเข้าหาจอ + แฟลช (space.js) แล้วค่อยเปลี่ยนหน้า
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.dispatchEvent(new CustomEvent('space-jump'));
  setTimeout(() => (window.location.href = 'dashboard.html'), reduceMotion ? 0 : 900);
}
