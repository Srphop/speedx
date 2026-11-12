// ===== หน้า เข้าสู่ระบบ =====
const form = document.getElementById('login-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormMessage('');

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  // ตรวจในหน้าเว็บก่อน ไม่ต้องเสียเวลาเรียก backend
  setFieldError('email', email ? '' : 'กรุณากรอกอีเมล');
  setFieldError('password', password ? '' : 'กรุณากรอกรหัสผ่าน');
  if (!email || !password) return;

  setSubmitting(true, 'เข้าสู่ระบบ');
  try {
    const result = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
    finishLogin(result);
  } catch (error) {
    setFormMessage(error.message);
    setSubmitting(false, 'เข้าสู่ระบบ');
  }
});
