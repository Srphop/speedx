// ===== หน้า กิจกรรม / รายละเอียดกิจกรรม / แผนกิจกรรมรายปี =====
const {
  ATTENDED,
  REGISTERED,
  getClubData,
  getDisplayStatus,
  sumBy,
  withPercent,
} = require('../services/clubData');
const { getNow } = require('../utils/time');

// GET /api/events → กิจกรรมทั้งหมด (ใช้ทั้งหน้าตารางกิจกรรมและปฏิทิน)
async function getEvents(req, res, next) {
  try {
    const { events, attendance, expenses } = await getClubData();
    const now = getNow();

    const items = events
      .map((event) => ({
        event_id: event.event_id,
        title: event.title,
        category: event.category,
        start_at: event.start_at,
        end_at: event.end_at,
        location: event.location,
        organizer: event.department,
        status: getDisplayStatus(event, now),
        attendee_count: attendance.filter(
          (a) => a.event_id === event.event_id && a.attendance_status === ATTENDED
        ).length,
        actual_spent: expenses
          .filter((x) => x.event_id === event.event_id)
          .reduce((sum, x) => sum + x.amount, 0),
      }))
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at)); // ใหม่สุดอยู่บน

    res.json({ events: items });
  } catch (error) {
    next(error);
  }
}

// GET /api/events/:id → รายละเอียดกิจกรรม + ผู้เข้าร่วมแยกตามฝ่าย + งบที่ใช้
async function getEventById(req, res, next) {
  try {
    const { events, attendance, members, expenses } = await getClubData();
    const event = events.find((e) => e.event_id === req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'ไม่พบกิจกรรมนี้' });
    }

    // ผู้เข้าร่วมจริง (นับเฉพาะ "เข้าร่วมจริง") จัดกลุ่มตามฝ่ายในชมรม
    const attendeeRows = attendance.filter(
      (a) => a.event_id === event.event_id && a.attendance_status === ATTENDED
    );
    const groups = new Map();
    attendeeRows.forEach((row) => {
      const member = members.find((m) => m.member_id === row.member_id);
      if (!member) return;
      const department = member.department || 'ไม่ระบุฝ่าย';
      if (!groups.has(department)) groups.set(department, []);
      groups.get(department).push({
        member_id: member.member_id,
        name: member.name,
        faculty: member.faculty,
        study_year: member.study_year,
      });
    });

    const attendeeGroups = [...groups.entries()]
      .map(([department, people]) => ({ department, count: people.length, members: people }))
      .sort((a, b) => b.count - a.count);

    // ค่าใช้จ่ายจริงของกิจกรรมนี้ แยกตามหมวด
    const eventExpenses = expenses.filter((x) => x.event_id === event.event_id);
    const totalSpent = eventExpenses.reduce((sum, x) => sum + x.amount, 0);
    const spendingByCategory = withPercent(sumBy(eventExpenses, 'category'), totalSpent).map(
      (item) => ({ category: item.key, amount: item.amount, percent: item.percent })
    );

    res.json({
      event: {
        event_id: event.event_id,
        title: event.title,
        category: event.category,
        description: event.description,
        start_at: event.start_at,
        end_at: event.end_at,
        location: event.location,
        organizer: event.department,
        planned_budget: event.planned_budget,
        status: getDisplayStatus(event, getNow()),
      },
      attendee_total: attendeeRows.length,
      registered_total: attendance.filter(
        (a) => a.event_id === event.event_id && a.attendance_status === REGISTERED
      ).length,
      attendee_groups: attendeeGroups,
      total_spent: totalSpent,
      spending_by_category: spendingByCategory,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getEvents, getEventById };
