// ===== สมัครบัญชี / เข้าสู่ระบบ / ข้อมูลผู้ใช้ =====
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById, createUser, updateUserTheme } = require('../services/userStore');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// สร้าง token ให้ frontend เก็บไว้ใช้ (หมดอายุใน 7 วัน)
function createToken(user) {
  return jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ส่งกลับเฉพาะข้อมูลที่หน้าเว็บต้องใช้ (ไม่ส่ง password_hash)
function toPublicUser(user) {
  return { id: user.user_id, name: user.name, email: user.email, theme: user.theme || 'light' };
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    // ตรวจข้อมูลทีละช่อง แล้วบอกว่าช่องไหนผิด
    const errors = {};
    if (!name) errors.name = 'กรุณากรอกชื่อ';
    if (!EMAIL_PATTERN.test(email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (password.length < 8) errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง', errors });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: 'อีเมลนี้มีบัญชีแล้ว', errors: { email: 'อีเมลนี้มีบัญชีแล้ว' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash });

    res.status(201).json({ token: createToken(user), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const user = await findUserByEmail(email);
    const passwordCorrect = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!passwordCorrect) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.json({ token: createToken(user), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me  (ต้องล็อกอิน)
async function getMe(req, res, next) {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่' });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/auth/me/theme  body: { theme: "light" | "dark" }
async function updateTheme(req, res, next) {
  try {
    const { theme } = req.body;
    if (theme !== 'light' && theme !== 'dark') {
      return res.status(400).json({ message: 'ธีมต้องเป็น light หรือ dark' });
    }

    const user = await updateUserTheme(req.userId, theme);
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้' });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login, getMe, updateTheme };
