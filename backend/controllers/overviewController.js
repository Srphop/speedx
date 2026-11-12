// ===== หน้า ภาพรวม (Dashboard): สรุปทุกอย่างของชมรมในหน้าเดียว =====
const { ATTENDED, REGISTERED, getClubData } = require('../services/clubData');
const { getNow, bangkokDateKey } = require('../utils/time');

const CANCELLED = 'ยกเลิก';
const DONE = 'จัดแล้ว';
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11" ของวันที่ (เวลาไทย)
function monthKey(iso) {
  return bangkokDateKey(iso).slice(0, 7);
}

// เดือนถัดไป "2026-12" → "2027-01"
function nextMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

// ทุกวันตั้งแต่ start ถึง end (ข้อความ "YYYY-MM-DD")
function eachDay(startKey, endKey) {
  const days = [];
  for (let t = new Date(startKey).getTime(); t <= new Date(endKey).getTime(); t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

// GET /api/overview
async function getOverview(req, res, next) {
  try {
    const { members, events, attendance, funding, expenses, news } = await getClubData();
    const now = getNow();

    const activeMembers = members.filter((m) => m.membership_status === 'active');
    const liveEvents = events.filter((e) => e.event_status !== CANCELLED && e.start_at);
    const doneEvents = liveEvents.filter((e) => e.event_status === DONE);
    const attendedRows = attendance.filter((a) => a.attendance_status === ATTENDED);
    const countFor = (eventId, status) =>
      attendance.filter((a) => a.event_id === eventId && a.attendance_status === status).length;

    // ---------- ตัวเลขหลัก ----------
    const totalFunding = funding.reduce((sum, f) => sum + f.amount, 0);
    const totalSpent = expenses.reduce((sum, x) => sum + x.amount, 0);
    const kpis = {
      active_members: activeMembers.length,
      inactive_members: members.length - activeMembers.length,
      events_total: liveEvents.length,
      events_done: doneEvents.length,
      events_planned: liveEvents.filter((e) => e.event_status !== DONE && new Date(e.end_at || e.start_at) >= now).length,
      total_attendance: attendedRows.length,
      avg_attendance: doneEvents.length > 0 ? Math.round((attendedRows.length / doneEvents.length) * 10) / 10 : 0,
      total_funding: totalFunding,
      total_spent: totalSpent,
      remaining: totalFunding - totalSpent,
      used_percent: totalFunding > 0 ? Math.round((totalSpent / totalFunding) * 1000) / 10 : 0,
    };

    // ---------- กิจกรรมถัดไป (หรือที่กำลังจัดอยู่ตอนนี้) ----------
    const nextEvent = liveEvents
      .filter((e) => new Date(e.end_at || e.start_at) >= now)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];

    const next = nextEvent
      ? {
          event_id: nextEvent.event_id,
          title: nextEvent.title,
          category: nextEvent.category,
          description: nextEvent.description,
          start_at: nextEvent.start_at,
          end_at: nextEvent.end_at,
          location: nextEvent.location,
          is_live: new Date(nextEvent.start_at) <= now,
          registered_count: countFor(nextEvent.event_id, REGISTERED) + countFor(nextEvent.event_id, ATTENDED),
        }
      : null;

    // ---------- รายเดือน: ตั้งแต่เดือนแรกที่มีกิจกรรม ถึงเดือนสุดท้าย (ไม่เกิน 12 เดือน) ----------
    const monthKeys = liveEvents.map((e) => monthKey(e.start_at)).concat(monthKey(now.toISOString())).sort();
    const months = [];
    for (let key = monthKeys[0]; key <= monthKeys[monthKeys.length - 1] && months.length < 12; key = nextMonth(key)) {
      months.push(key);
    }
    const monthly = months.map((key) => {
      const inMonth = liveEvents.filter((e) => monthKey(e.start_at) === key);
      return {
        month: key,
        events: inMonth.length,
        attendees: inMonth.reduce((sum, e) => sum + countFor(e.event_id, ATTENDED), 0),
        registered: inMonth.reduce((sum, e) => sum + countFor(e.event_id, REGISTERED), 0),
      };
    });

    // ---------- ชีพจรชมรม: ทุกวันในช่วงเดือนข้างบน วันไหนมีกิจกรรม มีคนมากี่คน ----------
    const rangeStart = `${months[0]}-01`;
    const lastMonth = months[months.length - 1];
    const [lastYear, lastMonthNumber] = lastMonth.split('-').map(Number);
    const rangeEnd = `${lastMonth}-${String(new Date(Date.UTC(lastYear, lastMonthNumber, 0)).getUTCDate()).padStart(2, '0')}`;

    const pulse = [];
    liveEvents.forEach((e) => {
      const startKey = bangkokDateKey(e.start_at);
      const endKey = e.end_at ? bangkokDateKey(e.end_at) : startKey;
      const people = countFor(e.event_id, ATTENDED) || countFor(e.event_id, REGISTERED);
      eachDay(startKey, endKey < startKey ? startKey : endKey).forEach((day) => {
        let entry = pulse.find((p) => p.date === day);
        if (!entry) {
          entry = { date: day, people: 0, events: [] };
          pulse.push(entry);
        }
        entry.people += people;
        entry.events.push({ event_id: e.event_id, title: e.title, done: e.event_status === DONE });
      });
    });

    // ---------- สมาชิกขาประจำ: เข้าร่วมจริงมากที่สุด ----------
    const topMembers = activeMembers
      .map((m) => ({
        member_id: m.member_id,
        name: m.name,
        faculty: m.faculty,
        department: m.department,
        study_year: m.study_year,
        attended_count: attendedRows.filter((a) => a.member_id === m.member_id).length,
      }))
      .filter((m) => m.attended_count > 0)
      .sort((a, b) => b.attended_count - a.attended_count || a.name.localeCompare(b.name, 'th'))
      .slice(0, 5);

    // ---------- ประเภทกิจกรรม ----------
    const categoryCounts = new Map();
    liveEvents.forEach((e) => categoryCounts.set(e.category || 'อื่น ๆ', (categoryCounts.get(e.category || 'อื่น ๆ') || 0) + 1));
    const categories = [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ---------- ความเคลื่อนไหวล่าสุด: รวมเหตุการณ์ที่มีวันเวลาจากทุกแท็บ เรียงใหม่สุดก่อน ----------
    const eventTitle = (id) => (events.find((e) => e.event_id === id) || {}).title || '';
    const activity = [
      ...funding.map((f) => ({ type: 'funding', at: f.received_date, title: `ได้รับเงิน ฿${f.amount.toLocaleString('th-TH')}`, detail: f.source_name })),
      ...expenses.map((x) => ({ type: 'expense', at: x.paid_date, title: `จ่าย ฿${x.amount.toLocaleString('th-TH')} ค่า${x.category}`, detail: [x.description, eventTitle(x.event_id)].filter(Boolean).join(' สำหรับ '), event_id: x.event_id })),
      ...doneEvents.map((e) => ({ type: 'event', at: e.end_at || e.start_at, title: `จัด${e.title}เสร็จแล้ว`, detail: `มีคนมาจริง ${countFor(e.event_id, ATTENDED)} คน ที่${e.location}`, event_id: e.event_id })),
      ...news.map((n) => ({ type: 'news', at: n.published_at, title: n.title, detail: n.news_type, event_id: n.event_id })),
    ]
      .filter((item) => item.at && new Date(item.at) <= now)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    res.json({
      now: now.toISOString(),
      activity,
      today: bangkokDateKey(now),
      kpis,
      next_event: next,
      monthly,
      pulse: { start: rangeStart, end: rangeEnd, days: pulse.sort((a, b) => a.date.localeCompare(b.date)) },
      top_members: topMembers,
      done_events: doneEvents.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOverview };
