// ===== ธีมสว่าง / มืด =====
// ไฟล์นี้โหลดใน <head> เพื่อใส่ธีมก่อนหน้าเว็บแสดง (กันจอกะพริบสีขาว)
// เปิดครั้งแรก = สว่าง, หลังจากนั้นจำธีมที่เลือกไว้ (ในเครื่อง + ในบัญชีผู้ใช้)
const THEME_KEY = 'speedx-theme';

// ธีมทั้งหมด: สว่าง / มืด + ธีมเทศกาล (ธีมเทศกาลมีเอฟเฟกต์วิ่ง ดู seasonal.js)
const THEMES = [
  { id: 'light', label: 'สว่าง', icon: 'sun' },
  { id: 'dark', label: 'มืด', icon: 'moon' },
  { id: 'halloween', label: 'ฮาโลวีน', icon: 'pumpkin' },
  { id: 'valentine', label: 'วาเลนไทน์', icon: 'heart' },
  { id: 'christmas', label: 'คริสต์มาส', icon: 'tree' },
  // ธีมภาพพื้นหลัง (รูปอยู่ใน assets/themes/)
  { id: 'neon', label: 'นีออนม่วง', icon: 'sparkle' },
  { id: 'blade', label: 'ดาบมรกต', icon: 'sword' },
  { id: 'cyber', label: 'ไซเบอร์', icon: 'chip' },
];

function isKnownTheme(id) {
  return THEMES.some((theme) => theme.id === id);
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isKnownTheme(saved) ? saved : 'light';
  } catch (error) {
    return 'light';
  }
}

function applyTheme(theme) {
  if (!isKnownTheme(theme)) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof startSeasonEffect === 'function') startSeasonEffect(theme); // เอฟเฟกต์ของธีมเทศกาล
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // เบราว์เซอร์บางแบบห้ามเก็บข้อมูล ไม่เป็นไร ธีมยังเปลี่ยนได้
  }
}

applyTheme(getSavedTheme());
