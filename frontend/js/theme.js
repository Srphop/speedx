// ===== ธีมสว่าง / มืด =====
// ไฟล์นี้โหลดใน <head> เพื่อใส่ธีมก่อนหน้าเว็บแสดง (กันจอกะพริบสีขาว)
// เปิดครั้งแรก = สว่าง, หลังจากนั้นจำธีมที่เลือกไว้ (ในเครื่อง + ในบัญชีผู้ใช้)
const THEME_KEY = 'speedx-theme';

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    return 'light';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // เบราว์เซอร์บางแบบห้ามเก็บข้อมูล ไม่เป็นไร ธีมยังเปลี่ยนได้
  }
}

applyTheme(getSavedTheme());
