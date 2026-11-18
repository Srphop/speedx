// ===== ใครออนไลน์อยู่ตอนนี้ =====
// หน้าเว็บส่ง "ยังอยู่นะ" มาทุก 25 วินาที (POST /api/presence)
// ปิดแท็บ / ปิดเบราว์เซอร์ → หน้าเว็บส่ง "กำลังออก" มา ชื่อหายภายใน 10 วินาที
//   (เผื่อ 10 วินาทีเพราะการกดเปลี่ยนหน้าในเว็บก็ส่ง "กำลังออก" เหมือนกัน หน้าใหม่จะส่ง "ยังอยู่" มาทันก่อน)
// ส่งไม่ทันเลย (แบตหมด / เน็ตหลุด) → ไม่ได้ยินเกิน 80 วินาที ถือว่าออฟไลน์
//   (80 วินาที เพราะ Chrome หน่วงตัวจับเวลาของแท็บที่ซ่อนอยู่ได้ถึงนาทีละครั้ง)
// เก็บในหน่วยความจำของเซิร์ฟเวอร์ (ไม่ต้องเขียนชีตทุกครั้ง) รีสตาร์ทเซิร์ฟเวอร์แล้วจะเริ่มนับใหม่
const ONLINE_MS = 80 * 1000;
const LEAVING_GRACE_MS = 10 * 1000;
const PROFILE_REFRESH_MS = 60 * 1000; // อ่านชื่อ / ยศจากชีตใหม่อย่างมากนาทีละครั้งต่อคน

const sessions = new Map(); // userId → { user, page, lastSeen, fetchedAt }

function needsProfile(userId) {
  const entry = sessions.get(userId);
  return !entry || Date.now() - entry.fetchedAt > PROFILE_REFRESH_MS;
}

function markOnline(userId, page, user) {
  const entry = sessions.get(userId) || {};
  sessions.set(userId, {
    user: user || entry.user,
    fetchedAt: user ? Date.now() : entry.fetchedAt,
    page,
    lastSeen: Date.now(),
  });
}

function markOffline(userId) {
  sessions.delete(userId);
}

// ปิดแท็บ: ยังไม่ลบทันที ให้เวลา 10 วินาที ถ้าเป็นแค่การเปลี่ยนหน้า หน้าใหม่จะส่ง "ยังอยู่" มาก่อน
function markLeaving(userId) {
  const entry = sessions.get(userId);
  if (!entry) return;
  entry.lastSeen = Math.min(entry.lastSeen, Date.now() - ONLINE_MS + LEAVING_GRACE_MS);
}

// รายชื่อคนออนไลน์: สมาชิกชมรมก่อน แล้วเรียงตามชื่อ
function listOnline() {
  const now = Date.now();
  const online = [];
  for (const [userId, entry] of sessions) {
    if (now - entry.lastSeen > ONLINE_MS) {
      sessions.delete(userId);
    } else if (entry.user) {
      online.push({ ...entry.user, page: entry.page, last_seen: new Date(entry.lastSeen).toISOString() });
    }
  }
  return online.sort((a, b) => Number(b.is_member) - Number(a.is_member) || a.name.localeCompare(b.name, 'th'));
}

module.exports = { needsProfile, markOnline, markOffline, markLeaving, listOnline };
