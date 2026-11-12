// ===== หน้า สมัครบัญชี =====
const form = document.getElementById('signup-form');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ตรวจทุกช่อง คืนค่า true ถ้าผ่านหมด
function validate() {
  const values = {
    name: form.elements['name'].value.trim(),
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
    confirm: form.elements.confirm.value,
  };

  const errors = {
    name: values.name ? '' : 'กรุณากรอกชื่อ',
    email: EMAIL_PATTERN.test(values.email) ? '' : 'กรอกอีเมลให้ถูกรูปแบบ เช่น name@example.com',
    password: values.password.length >= 8 ? '' : 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    confirm: values.confirm && values.confirm === values.password ? '' : 'รหัสผ่านทั้งสองช่องต้องตรงกัน',
  };

  Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
  return { ok: Object.values(errors).every((m) => !m), values };
}

// ตรวจช่องนั้นอีกครั้งเมื่อออกจากช่อง (เฉพาะช่องที่เคยขึ้น error แล้ว)
['name', 'email', 'password', 'confirm'].forEach((name) => {
  form.elements[name].addEventListener('blur', () => {
    if (form.elements[name].getAttribute('aria-invalid') === 'true') validate();
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormMessage('');

  const { ok, values } = validate();
  if (!ok) return;

  setSubmitting(true, 'สมัครบัญชี');
  try {
    const result = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: { name: values.name, email: values.email, password: values.password },
    });
    finishLogin(result); // สมัครเสร็จ ล็อกอินให้เลย
  } catch (error) {
    // backend บอกว่าช่องไหนผิด (เช่น อีเมลซ้ำ) ก็แสดงใต้ช่องนั้น
    Object.entries(error.fieldErrors).forEach(([name, message]) => setFieldError(name, message));
    if (Object.keys(error.fieldErrors).length === 0) setFormMessage(error.message);
    setSubmitting(false, 'สมัครบัญชี');
  }
});
