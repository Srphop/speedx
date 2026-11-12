// ===== กระดิ่งแจ้งเตือน =====
// แจ้งเตือนเกิดจากเงื่อนไขจริงในข้อมูล ไม่ใช่ข้อความเขียนตายตัว
//   1) กิจกรรมที่วางแผนไว้ และจะเริ่มภายใน 3 วัน (เวลาไทย)
//   2) ใช้งบรวมเกิน 80% ของเงินที่ได้รับ
const { BUDGET_ALERT_RATIO, getClubData, isUpcoming } = require('../services/clubData');
const { getNow, daysUntil } = require('../utils/time');

function describeDaysLeft(days) {
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  return `อีก ${days} วัน`;
}

// GET /api/notifications
async function getNotifications(req, res, next) {
  try {
    const { events, funding, expenses } = await getClubData();
    const now = getNow();
    const notifications = [];

    events
      .filter((event) => isUpcoming(event, now))
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .forEach((event) => {
        const days = daysUntil(event.start_at, now);
        notifications.push({
          id: `event-${event.event_id}`,
          type: 'event',
          event_id: event.event_id,
          title: event.title,
          start_at: event.start_at,
          location: event.location,
          days_left: days,
          message: `${event.title} จะเริ่ม${describeDaysLeft(days)}`,
        });
      });

    const totalFunding = funding.reduce((sum, f) => sum + f.amount, 0);
    const totalSpent = expenses.reduce((sum, x) => sum + x.amount, 0);
    if (totalFunding > 0 && totalSpent / totalFunding >= BUDGET_ALERT_RATIO) {
      notifications.push({
        id: 'budget-alert',
        type: 'budget',
        title: 'งบใกล้หมด',
        message: `ใช้งบไปแล้ว ${Math.round((totalSpent / totalFunding) * 100)}% ของงบทั้งหมด`,
      });
    }

    res.json({ notifications, generated_at: now.toISOString() });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotifications };
