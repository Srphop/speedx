// ===== URL ของระบบบัญชีผู้ใช้ (ขึ้นต้นด้วย /api/auth) =====
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { signup, login, getMe, updateTheme, updateProfile, changePassword } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.patch('/me/theme', requireAuth, updateTheme);
router.patch('/me/profile', requireAuth, updateProfile);
router.patch('/me/password', requireAuth, changePassword);

// ล็อกเอาต์ทำที่ frontend: ลบ token ทิ้ง (backend ไม่ต้องจำอะไร)

module.exports = router;
