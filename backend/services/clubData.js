// ===== แปลงข้อมูลดิบจากชีตให้เป็น object ที่ใช้ง่าย + กติกากลางของระบบ =====
const { readAllTabs, writeCell } = require('./googleSheets');
const { toIsoDate, daysUntil } = require('../utils/time');

const REMINDER_DAYS = 3; // แจ้งเตือนกิจกรรมที่จะเริ่มภายใน 3 วัน
const BUDGET_ALERT_RATIO = 0.8; // แจ้งเตือนเมื่อใช้งบเกิน 80%
const ATTENDED = 'เข้าร่วมจริง';
const REGISTERED = 'ลงชื่อแล้ว';
const CACHE_MS = 5 * 1000; // จำข้อมูลไว้ 30 วินาที จะได้ไม่เรียก Google ถี่เกิน

let cachedData = null;
let cachedAt = 0;

// ---------- ตัวช่วยแปลงค่า ----------
function toNumber(value) {
  if (typeof value === 'number') return value;
  const number = Number(String(value || '').replace(/[,฿\s]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function toText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// [[หัวตาราง], [แถว], ...] → [{ หัวตาราง: ค่า, _row: เลขแถวในชีต }, ...]
function rowsToObjects(rows) {
  const [header = [], ...body] = rows;
  const keys = header.map((key) => toText(key));

  return body
    .map((cells, index) => {
      const item = { _row: index + 2 }; // แถว 1 คือหัวตาราง ข้อมูลเริ่มแถว 2
      keys.forEach((key, column) => {
        item[key] = cells[column] === undefined ? '' : cells[column];
      });
      return item;
    })
    .filter((item) => keys.some((key) => toText(item[key]) !== '')); // ข้ามแถวว่าง
}

// เลขคอลัมน์ → ตัวอักษร (0 → A, 5 → F)
function columnLetter(index) {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

// ---------- อ่านและจัดรูปข้อมูลทุกแท็บ ----------
async function loadFromSheet() {
  const tabs = await readAllTabs();
  const membersHeader = (tabs.Members[0] || []).map(toText);

  return {
    // สมาชิก: เลือกเฉพาะช่องที่หน้าเว็บใช้ (ไม่ส่งที่อยู่ / ข้อมูลสุขภาพ ออกไป)
    members: rowsToObjects(tabs.Members).map((row) => ({
      member_id: toText(row.member_id),
      name: toText(row.name),
      faculty: toText(row.faculty),
      study_year: toNumber(row.study_year),
      department: toText(row.department),
      membership_status: toText(row.membership_status).toLowerCase() || 'active',
      _row: row._row,
    })),
    memberStatusColumn: columnLetter(membersHeader.indexOf('membership_status')),

    events: rowsToObjects(tabs.Events).map((row) => ({
      event_id: toText(row.event_id),
      title: toText(row.title),
      category: toText(row.category),
      description: toText(row.description),
      start_at: toIsoDate(row.start_at),
      end_at: toIsoDate(row.end_at),
      location: toText(row.location),
      department: toText(row.department),
      planned_budget: toNumber(row.planned_budget),
      event_status: toText(row.event_status),
    })),

    attendance: rowsToObjects(tabs.Attendance).map((row) => ({
      event_id: toText(row.event_id),
      member_id: toText(row.member_id),
      attendance_status: toText(row.attendance_status),
    })),

    funding: rowsToObjects(tabs.Funding).map((row) => ({
      funding_id: toText(row.funding_id),
      source_type: toText(row.source_type),
      source_name: toText(row.source_name),
      amount: toNumber(row.amount),
      received_date: toIsoDate(row.received_date),
    })),

    expenses: rowsToObjects(tabs.Expenses).map((row) => ({
      expense_id: toText(row.expense_id),
      event_id: toText(row.event_id),
      funding_id: toText(row.funding_id),
      category: toText(row.category),
      description: toText(row.description),
      amount: toNumber(row.amount),
      paid_date: toIsoDate(row.paid_date),
    })),

    news: rowsToObjects(tabs.News).map((row) => ({
      news_id: toText(row.news_id),
      title: toText(row.title),
      summary: toText(row.summary),
      news_type: toText(row.news_type),
      published_at: toIsoDate(row.published_at),
      cover_image_url: toText(row.cover_image_url) || null,
      event_id: toText(row.event_id) || null,
    })),
  };
}

// ดึงข้อมูลชมรม (ใช้ของที่จำไว้ ถ้ายังไม่เกิน 30 วินาที)
async function getClubData() {
  const cacheStillFresh = cachedData && Date.now() - cachedAt < CACHE_MS;
  if (!cacheStillFresh) {
    cachedData = await loadFromSheet();
    cachedAt = Date.now();
  }
  return cachedData;
}

// เขียนสถานะสมาชิกกลับลงชีต แล้วล้างข้อมูลที่จำไว้ให้โหลดใหม่
async function setMemberStatus(memberId, status) {
  cachedData = null;
  const data = await getClubData();
  const member = data.members.find((item) => item.member_id === memberId);
  if (!member) return null;

  await writeCell('Members', data.memberStatusColumn, member._row, status);
  cachedData = null;
  return { ...member, membership_status: status };
}

// ---------- กติกาสถานะกิจกรรม ----------
// "ใกล้ถึง" = กิจกรรมที่วางแผนไว้ และจะเริ่มภายใน 3 วัน (เวลาไทย)
function isUpcoming(event, now) {
  if (event.event_status !== 'วางแผนไว้' || !event.start_at) return false;
  if (new Date(event.start_at) < now) return false;
  return daysUntil(event.start_at, now) <= REMINDER_DAYS;
}

function getDisplayStatus(event, now) {
  return isUpcoming(event, now) ? 'ใกล้ถึง' : event.event_status;
}

// รวมยอดตามกลุ่ม เช่น sumBy(expenses, 'category') → [{ key: 'อาหาร', amount: 12500 }]
function sumBy(items, keyName) {
  const totals = new Map();
  items.forEach((item) => {
    const key = item[keyName] || 'ไม่ระบุ';
    totals.set(key, (totals.get(key) || 0) + item.amount);
  });
  return [...totals.entries()].map(([key, amount]) => ({ key, amount }));
}

// เติมเปอร์เซ็นต์ให้แต่ละรายการ แล้วเรียงจากมากไปน้อย
function withPercent(items, total) {
  return items
    .map((item) => ({ ...item, percent: total > 0 ? Math.round((item.amount / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

module.exports = {
  ATTENDED,
  REGISTERED,
  REMINDER_DAYS,
  BUDGET_ALERT_RATIO,
  getClubData,
  setMemberStatus,
  isUpcoming,
  getDisplayStatus,
  sumBy,
  withPercent,
};
