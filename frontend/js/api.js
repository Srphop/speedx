// ===== เรียก backend + จัดการ token ล็อกอิน =====
const TOKEN_KEY = 'speedx-token';
const USER_KEY = 'speedx-user';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    // ถ้าเก็บไม่ได้ ผู้ใช้จะต้องล็อกอินใหม่เมื่อเปลี่ยนหน้า
  }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    // ไม่ต้องทำอะไร
  }
}

// เรียก API แล้วได้ข้อมูล JSON กลับมา ถ้าผิดพลาดจะ throw error ที่มีข้อความภาษาไทย
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkError) {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
  }

  const data = await response.json().catch(() => ({}));

  // token หมดอายุ หรือบัญชีถูกลบ → กลับไปหน้าเข้าสู่ระบบ
  if (response.status === 401 && token) {
    clearSession();
    window.location.href = 'login.html';
  }

  if (!response.ok) {
    const error = new Error(data.message || 'เกิดข้อผิดพลาด ลองอีกครั้ง');
    error.fieldErrors = data.errors || {};
    throw error;
  }

  return data;
}
