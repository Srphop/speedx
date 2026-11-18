// ===== แถบ "ออนไลน์ตอนนี้" =====
const { listUsers } = require('../services/userStore');
const { markOnline, markOffline, markLeaving, listOnline } = require('../services/presence');
const { toPublicUser } = require('./authController');

// หน้าที่เปิดอยู่ (ไว้โชว์ว่าแต่ละคนดูหน้าไหน)
const PAGES = {
  overview: 'ภาพรวม',
  members: 'สมาชิก',
  events: 'กิจกรรม',
  finance: 'งบการเงิน',
  calendar: 'แผนกิจกรรมรายปี',
  news: 'ข่าวสารชมรม',
};

// POST /api/presence  body: { page: "overview" }
// บอกว่ายังออนไลน์อยู่ แล้วได้รายชื่อคนออนไลน์ + ข้อมูลบัญชีตัวเองล่าสุด (ยศ / สิทธิ์) กลับไป
async function heartbeat(req, res, next) {
  try {
    // แท็บ Users ที่เซิร์ฟเวอร์จำไว้ (อ่านชีตใหม่เองทุก 5 วินาที ไม่ต้องรอ Google ตรงนี้)
    const users = new Map((await listUsers()).map((user) => [user.user_id, user]));
    if (!users.has(req.userId)) return res.status(401).json({ message: 'ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่' });
    markOnline(req.userId, PAGES[req.body.page] || '');

    const online = listOnline((userId) => {
      const found = users.get(userId);
      if (!found) return null;
      const { id, name, avatar_color, avatar_image, role, is_member } = toPublicUser(found);
      return { id, name, avatar_color, avatar_image, role, is_member };
    });
    res.json({ online, me: online.find((person) => person.id === req.userId) || null });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/presence          → ออกจากระบบแล้ว เอาชื่อออกจากแถบทันที
// DELETE /api/presence?soon=1   → ปิดแท็บ / ออกจากหน้า ชื่อหายใน 10 วินาที ถ้าไม่มีหน้าใหม่เปิดตามมา
function leave(req, res) {
  if (req.query.soon) markLeaving(req.userId);
  else markOffline(req.userId);
  res.json({ message: 'ออฟไลน์แล้ว' });
}

module.exports = { heartbeat, leave };
