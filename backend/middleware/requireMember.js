// ===== ด่านตรวจขั้นที่ 2: API ที่แก้ข้อมูลชมรม ต้องเป็นสมาชิกชมรมเท่านั้น =====
// ใช้ต่อจาก requireAuth (ต้องรู้ก่อนว่าใครล็อกอิน)
// อ่านสิทธิ์จากชีตทุกครั้ง → ประธานเปลี่ยนในชีตแล้วมีผลทันที ไม่ต้องล็อกอินใหม่
const { findUserById, isClubMember } = require('../services/userStore');

async function requireMember(req, res, next) {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่' });

    if (!isClubMember(user)) {
      return res.status(403).json({
        message: 'บัญชีผู้เยี่ยมชมดูข้อมูลได้อย่างเดียว ให้ประธานชมรมตั้งตำแหน่งในชีตก่อนจึงจะแก้ไขได้',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireMember;
