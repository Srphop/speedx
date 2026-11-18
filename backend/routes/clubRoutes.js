// ===== URL ของข้อมูลชมรม (ขึ้นต้นด้วย /api) ทุกเส้นต้องล็อกอินก่อน =====
// เส้นที่แก้ข้อมูลชมรม ใส่ requireMember เพิ่ม: ผู้เยี่ยมชมเรียกไม่ได้ (ได้ 403)
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireMember = require('../middleware/requireMember');
const { getNews } = require('../controllers/newsController');
const { getEvents, getEventById, addEvent, joinEvent, cancelJoin } = require('../controllers/eventController');
const { getMembers, deactivateMember } = require('../controllers/memberController');
const { getFinance } = require('../controllers/financeController');
const { getNotifications } = require('../controllers/notificationController');
const { getOverview } = require('../controllers/overviewController');
const { heartbeat, leave } = require('../controllers/presenceController');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/news', getNews);
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.post('/events', requireMember, addEvent);
router.post('/events/:id/join', requireMember, joinEvent); // กดเข้าร่วมกิจกรรม
router.delete('/events/:id/join', requireMember, cancelJoin); // ยกเลิกการเข้าร่วม
router.get('/members', getMembers);
router.patch('/members/:id/deactivate', requireMember, deactivateMember);
router.get('/finance', getFinance);
router.get('/notifications', getNotifications);
router.post('/presence', heartbeat);
router.delete('/presence', leave);

module.exports = router;
