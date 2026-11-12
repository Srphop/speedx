// ===== ด่านตรวจ: API ไหนใส่ตัวนี้ ต้องล็อกอินก่อนถึงเรียกได้ =====
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // frontend ส่ง token มาใน header แบบ "Authorization: Bearer <token>"
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId; // ให้ controller รู้ว่าใครเป็นคนเรียก
    next();
  } catch (error) {
    return res.status(401).json({ message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

module.exports = requireAuth;
