// ===== สมัครบัญชี / เข้าสู่ระบบ / ข้อมูลผู้ใช้ =====
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById, createUser, updateUser, updateUserTheme } = require('../services/userStore');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// สร้าง token ให้ frontend เก็บไว้ใช้ (หมดอายุใน 7 วัน)
function createToken(user) {
  return jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ส่งกลับเฉพาะข้อมูลที่หน้าเว็บต้องใช้ (ไม่ส่ง password_hash)
function toPublicUser(user) {
  return {
    id: user.user_id,
    name: user.name,
    email: user.email,
    theme: user.theme || 'light',
    created_at: user.created_at,
    position: user.position || '',
    avatar_color: user.avatar_color || '',
    avatar_image: user.avatar_image || '',
  };
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

// ธีมที่เลือกได้ (ต้องตรงกับ frontend/js/theme.js)
const THEMES = ['light', 'dark', 'halloween', 'valentine', 'christmas'];

// PATCH /api/auth/me/theme  body: { theme: "light" | "dark" | "halloween" | "valentine" | "christmas" }
async function updateTheme(req, res, next) {
  try {
    const { theme } = req.body;
    if (!THEMES.includes(theme)) {
      return res.status(400).json({ message: 'ไม่มีธีมนี้' });
    }

    const user = await updateUserTheme(req.userId, theme);
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้' });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// สีวงกลมโปรไฟล์ที่เลือกได้ (ต้องตรงกับ frontend/js/account.js)
const AVATAR_COLORS = ['#A0EC29', '#8B2549', '#6B46B0', '#305EAA', '#A35F19', '#1B1F20'];
const MAX_IMAGE_LENGTH = 45000; // ช่องในชีตเก็บได้ไม่เกิน 50,000 ตัวอักษร

// PATCH /api/auth/me/profile  body: { name, position, avatar_color, avatar_image }
async function updateProfile(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const position = String(req.body.position || '').trim().slice(0, 60);
    const avatarColor = String(req.body.avatar_color || '');
    const avatarImage = String(req.body.avatar_image || '');

    const errors = {};
    if (!name) errors.name = 'กรุณากรอกชื่อ';
    if (name.length > 60) errors.name = 'ชื่อยาวได้ไม่เกิน 60 ตัวอักษร';
    if (avatarColor && !AVATAR_COLORS.includes(avatarColor)) errors.avatar_color = 'ไม่มีสีนี้';
    // รับเฉพาะรูปที่ย่อแล้วจากหน้าเว็บ (data URL ของ png / jpeg / webp)
    if (avatarImage && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarImage)) {
      errors.avatar_image = 'ไฟล์รูปไม่ถูกต้อง';
    } else if (avatarImage.length > MAX_IMAGE_LENGTH) {
      errors.avatar_image = 'รูปใหญ่เกินไป ลองรูปอื่น';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors });
    }

    const user = await updateUser(req.userId, {
      name,
      position,
      avatar_color: avatarColor,
      avatar_image: avatarImage,
    });
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้' });
    res.json({ message: 'บันทึกโปรไฟล์แล้ว', user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/auth/me/password  body: { current_password, new_password }
async function changePassword(req, res, next) {
  try {
    const current = req.body.current_password || '';
    const next_ = req.body.new_password || '';

    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ message: 'ไม่พบบัญชีนี้' });

    if (!(await bcrypt.compare(current, user.password_hash))) {
      return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง', errors: { current_password: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } });
    }
    if (next_.length < 8) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่สั้นเกินไป', errors: { new_password: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' } });
    }

    await updateUser(req.userId, { password_hash: await bcrypt.hash(next_, 10) });
    res.json({ message: 'เปลี่ยนรหัสผ่านแล้ว' });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login, getMe, updateTheme, updateProfile, changePassword };
