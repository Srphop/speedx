// ===== หน้า สมาชิก =====
const { ATTENDED, getClubData, setMemberStatus } = require('../services/clubData');

// GET /api/members → สมาชิก active + จำนวนกิจกรรมที่เข้าร่วมจริง + สัดส่วนตามคณะ
// ใส่ ?status=all เพื่อดูสมาชิกทั้งหมด รวมคนที่ inactive แล้ว
async function getMembers(req, res, next) {
  try {
    const { members, attendance } = await getClubData();
    const showAll = req.query.status === 'all';

    const list = members
      .filter((m) => showAll || m.membership_status === 'active')
      .map((m) => ({
        member_id: m.member_id,
        name: m.name,
        faculty: m.faculty,
        study_year: m.study_year,
        department: m.department,
        membership_status: m.membership_status,
        attended_count: attendance.filter(
          (a) => a.member_id === m.member_id && a.attendance_status === ATTENDED
        ).length,
      }));

    // นับจำนวนสมาชิกในแต่ละคณะ สำหรับกราฟวงกลม
    const facultyCounts = new Map();
    list.forEach((m) => facultyCounts.set(m.faculty, (facultyCounts.get(m.faculty) || 0) + 1));
    const byFaculty = [...facultyCounts.entries()]
      .map(([faculty, count]) => ({
        faculty,
        count,
        percent: list.length > 0 ? Math.round((count / list.length) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ members: list, total: list.length, by_faculty: byFaculty });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/members/:id/deactivate → ลบสมาชิก = เปลี่ยนสถานะเป็น inactive ในชีต
// (ประวัติการเข้าร่วมในแท็บ Attendance ยังอยู่ครบ)
async function deactivateMember(req, res, next) {
  try {
    const member = await setMemberStatus(req.params.id, 'inactive');
    if (!member) {
      return res.status(404).json({ message: 'ไม่พบสมาชิกคนนี้' });
    }
    res.json({ message: `ลบ ${member.name} ออกจากรายชื่อแล้ว`, member_id: member.member_id });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMembers, deactivateMember };
