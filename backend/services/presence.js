// ===== ใครออนไลน์อยู่ตอนนี้ =====
// หน้าเว็บส่ง "ยังอยู่นะ" มาทุก 10 วินาที (POST /api/presence)
// ปิดแท็บ / ปิดเบราว์เซอร์ → หน้าเว็บส่ง "กำลังออก" มา ชื่อหายภายใน 10 วินาที
//   (เผื่อ 10 วินาทีเพราะการกดเปลี่ยนหน้าในเว็บก็ส่ง "กำลังออก" เหมือนกัน หน้าใหม่จะส่ง "ยังอยู่" มาทันก่อน)
// ส่งไม่ทันเลย (แบตหมด / เน็ตหลุด) → ไม่ได้ยินเกิน 80 วินาที ถือว่าออฟไลน์
//   (80 วินาที เพราะ Chrome หน่วงตัวจับเวลาของแท็บที่ซ่อนอยู่ได้ถึงนาทีละครั้ง)
// ที่นี่จำแค่ว่าใครอยู่หน้าไหน ส่วนชื่อ / ยศ / รูป ดึงจากแท็บ Users ล่าสุดทุกครั้งที่ขอรายชื่อ
// → ประธานเปลี่ยนยศในชีต ทุกคนเห็นยศใหม่ภายในไม่กี่วินาที
// เก็บในหน่วยความจำของเซิร์ฟเวอร์ (ไม่ต้องเขียนชีตทุกครั้ง) รีสตาร์ทเซิร์ฟเวอร์แล้วจะเริ่มนับใหม่
const ONLINE_MS = 80 * 1000;
const LEAVING_GRACE_MS = 10 * 1000;

const sessions = new Map(); // userId → { page, lastSeen }

function markOnline(userId, page) {
  sessions.set(userId, { page, lastSeen: Date.now() });
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
// profileOf(userId) → ชื่อ / ยศล่าสุดจากชีต (ไม่พบ = บัญชีถูกลบ ไม่ต้องโชว์)
function listOnline(profileOf) {
  const now = Date.now();
  const online = [];
  for (const [userId, entry] of sessions) {
    if (now - entry.lastSeen > ONLINE_MS) {
      sessions.delete(userId);
      continue;
    }
    const profile = profileOf(userId);
    if (profile) online.push({ ...profile, page: entry.page, last_seen: new Date(entry.lastSeen).toISOString() });
  }
  return online.sort((a, b) => Number(b.is_member) - Number(a.is_member) || a.name.localeCompare(b.name, 'th'));
}

module.exports = { markOnline, markOffline, markLeaving, listOnline };
