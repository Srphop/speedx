// ===== สมาชิกกดเข้าร่วมกิจกรรมเอง → เขียนลงแท็บ Attendance =====
// กติกา
//   - กดได้เฉพาะบัญชีสมาชิกชมรม (position ในแท็บ Users ไม่ว่าง) — route ใส่ requireMember ไว้แล้ว
//   - กดได้เฉพาะกิจกรรมที่สถานะ "ใกล้ถึง" (วางแผนไว้ และเริ่มภายใน 3 วัน)
//   - กดแล้วได้แถว event_id | member_id | ลงชื่อแล้ว  ประธานค่อยเปลี่ยนเป็น "เข้าร่วมจริง" / "ไม่มา" ในชีตหลังจบงาน
//   - ยกเลิก = เปลี่ยนช่องสถานะเป็น "ยกเลิก" (ไม่ลบแถว ประวัติยังอยู่) กดเข้าร่วมใหม่ก็ใช้แถวเดิม
//
// บัญชีผู้ใช้ (แท็บ Users) กับสมาชิก (แท็บ Members) เป็นคนละแท็บ จับคู่ด้วยคอลัมน์ member_id ในแท็บ Users
//   1. มี member_id อยู่แล้ว → ใช้อันนั้น
//   2. ยังไม่มี → หาสมาชิกที่ชื่อตรงกันในแท็บ Members (ที่ยังไม่มีบัญชีอื่นจับคู่ไว้)
//   3. ไม่เจอ → เพิ่มเป็นสมาชิกใหม่ในแท็บ Members ให้
const { appendRow, writeCell } = require('./googleSheets');
const { getClubData, invalidateClubData, isUpcoming, REGISTERED, ATTENDED } = require('./clubData');
const { listUsers, findUserById, updateUser } = require('./userStore');
const { getNow } = require('../utils/time');

const CANCELLED = 'ยกเลิก';

function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

// หาสมาชิกของบัญชีนี้ แบบอ่านอย่างเดียว (ไม่เขียนชีต) → member หรือ null
async function findMemberForUser(user, data) {
  if (!user) return null;
  const linkedId = String(user.member_id || '').trim();
  if (linkedId) return data.members.find((m) => m.member_id === linkedId) || null;

  const takenIds = new Set((await listUsers()).map((u) => String(u.member_id || '').trim()).filter(Boolean));
  const name = normalizeName(user.name);
  return data.members.find((m) => normalizeName(m.name) === name && !takenIds.has(m.member_id)) || null;
}

// สถานะการเข้าร่วมของบัญชีนี้ในแต่ละกิจกรรม → Map(event_id → 'ลงชื่อแล้ว' | 'เข้าร่วมจริง' | 'ไม่มา')
async function myAttendance(userId, data) {
  const member = await findMemberForUser(await findUserById(userId), data);
  const statuses = new Map();
  if (!member) return statuses;
  data.attendance
    .filter((a) => a.member_id === member.member_id && a.attendance_status && a.attendance_status !== CANCELLED)
    .forEach((a) => statuses.set(a.event_id, a.attendance_status));
  return statuses;
}

// หา (หรือสร้าง) สมาชิกของบัญชีนี้ แล้วจดคู่ไว้ในแท็บ Users
async function ensureMemberForUser(user, data) {
  let member = await findMemberForUser(user, data);

  if (!member && String(user.member_id || '').trim()) {
    throw httpError(409, `ไม่พบสมาชิก ${user.member_id} ในแท็บ Members ให้ประธานแก้คอลัมน์ member_id ในแท็บ Users`);
  }

  if (!member) {
    // รหัสถัดไป: MEM-012 → MEM-013
    const lastNumber = Math.max(0, ...data.members.map((m) => Number(m.member_id.replace(/\D/g, '')) || 0));
    const values = {
      member_id: `MEM-${String(lastNumber + 1).padStart(3, '0')}`,
      name: user.name,
      membership_status: 'active',
    };
    await appendRow('Members', data.membersHeader.map((key) => (values[key] === undefined ? '' : values[key])));
    member = { member_id: values.member_id, name: user.name, membership_status: 'active' };
  }

  if (String(user.member_id || '').trim() !== member.member_id) {
    await updateUser(user.user_id, { member_id: member.member_id });
  }
  return member;
}

// กันกดรัว ๆ แล้วได้แถวซ้ำ: คำขอของคนเดียวกันทำทีละอัน
const locks = new Map();
function oneAtATime(key, task) {
  const previous = locks.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  locks.set(key, current);
  current.finally(() => {
    if (locks.get(key) === current) locks.delete(key);
  }).catch(() => {});
  return current;
}

async function loadUpcomingEvent(eventId) {
  const data = await getClubData({ fresh: true }); // อ่านชีตล่าสุดก่อนเขียน จะได้เลขแถวที่ถูก
  const event = data.events.find((e) => e.event_id === eventId);
  if (!event) throw httpError(404, 'ไม่พบกิจกรรมนี้');
  if (!isUpcoming(event, getNow())) {
    throw httpError(400, 'กดเข้าร่วมหรือยกเลิกได้เฉพาะกิจกรรมที่สถานะ "ใกล้ถึง" (เริ่มภายใน 3 วัน)');
  }
  return { data, event };
}

function joinEvent(userId, eventId) {
  return oneAtATime(userId, async () => {
    const user = await findUserById(userId);
    if (!user) throw httpError(401, 'ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่');
    const { data, event } = await loadUpcomingEvent(eventId);

    const member = await ensureMemberForUser(user, data);
    if (member.membership_status === 'inactive') {
      throw httpError(403, 'สมาชิกคนนี้ถูกปิดสถานะในแท็บ Members แล้ว เข้าร่วมกิจกรรมไม่ได้');
    }

    const existing = data.attendance.find((a) => a.event_id === eventId && a.member_id === member.member_id);
    if (existing && [REGISTERED, ATTENDED].includes(existing.attendance_status)) {
      invalidateClubData();
      return { event, member, status: existing.attendance_status, already: true };
    }

    if (existing) {
      // เคยยกเลิกไว้ → ใช้แถวเดิม
      await writeCell('Attendance', data.attendanceStatusColumn, existing._row, REGISTERED);
    } else {
      const values = { event_id: eventId, member_id: member.member_id, attendance_status: REGISTERED };
      await appendRow('Attendance', data.attendanceHeader.map((key) => (values[key] === undefined ? '' : values[key])));
    }
    invalidateClubData();
    return { event, member, status: REGISTERED, already: false };
  });
}

function cancelJoin(userId, eventId) {
  return oneAtATime(userId, async () => {
    const user = await findUserById(userId);
    if (!user) throw httpError(401, 'ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่');
    const { data, event } = await loadUpcomingEvent(eventId);

    const member = await findMemberForUser(user, data);
    const existing = member && data.attendance.find((a) => a.event_id === eventId && a.member_id === member.member_id);
    if (!existing || existing.attendance_status !== REGISTERED) {
      throw httpError(400, 'คุณยังไม่ได้ลงชื่อเข้าร่วมกิจกรรมนี้');
    }

    await writeCell('Attendance', data.attendanceStatusColumn, existing._row, CANCELLED);
    invalidateClubData();
    return { event, member };
  });
}

module.exports = { joinEvent, cancelJoin, myAttendance, findMemberForUser };
