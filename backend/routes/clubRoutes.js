// ===== URL ของข้อมูลชมรม (ขึ้นต้นด้วย /api) ทุกเส้นต้องล็อกอินก่อน =====
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getNews } = require('../controllers/newsController');
const { getEvents, getEventById, addEvent } = require('../controllers/eventController');
const { getMembers, deactivateMember } = require('../controllers/memberController');
const { getFinance } = require('../controllers/financeController');
const { getNotifications } = require('../controllers/notificationController');
const { getOverview } = require('../controllers/overviewController');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/news', getNews);
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.post('/events', addEvent);
router.get('/members', getMembers);
router.patch('/members/:id/deactivate', deactivateMember);
router.get('/finance', getFinance);
router.get('/notifications', getNotifications);

module.exports = router;
