// ===== ที่จำข้อมูลจากชีต แบบ "ตอบทันที แล้วค่อยอัปเดตเบื้องหลัง" =====
// เดิม: ข้อมูลเก่าเกิน 5 วินาที → คำขอนั้นต้องรอ Google ตอบก่อน (ช้าเกือบ 1 วินาที)
// ตอนนี้:
//   - คำขอทุกครั้งได้ข้อมูลที่จำไว้ทันที
//   - ระหว่างที่มีคนใช้เว็บ เซิร์ฟเวอร์ไปอ่านชีตใหม่เองทุก refreshMs → แก้ในชีตแล้วเว็บเห็นภายในไม่กี่วินาที
//   - ไม่มีใครใช้นานเกิน maxAgeMs → คำขอแรกรออ่านชีตใหม่ก่อน จะได้ไม่เห็นข้อมูลเก่ามาก
//   - หลายคำขอพร้อมกัน → อ่านชีตครั้งเดียวแล้วใช้ร่วมกัน
//   - เพิ่งเขียนลงชีต → เรียก invalidate() คำขอถัดไปได้ข้อมูลใหม่แน่นอน
function createLiveCache(load, { refreshMs, maxAgeMs = 60 * 1000, idleMs = 2 * 60 * 1000 }) {
  let data = null;
  let loadedAt = 0;
  let loading = null;
  let version = 0; // เพิ่มทุกครั้งที่เขียนลงชีต ผลอ่านที่เริ่มก่อนเขียนจะไม่ถูกเก็บ
  let lastUsed = 0;

  function refresh() {
    if (loading) return loading;
    const startedAt = version;
    const current = load()
      .then((result) => {
        if (startedAt === version) {
          data = result;
          loadedAt = Date.now();
        }
        return result;
      })
      .finally(() => {
        if (loading === current) loading = null;
      });
    loading = current;
    return current;
  }

  // fresh: true → อ่านชีตใหม่เสมอ (ใช้ก่อนเขียนลงชีต จะได้เลขแถวที่ถูกต้อง)
  async function get({ fresh = false } = {}) {
    lastUsed = Date.now();
    if (fresh) {
      invalidate();
      return refresh();
    }
    const age = Date.now() - loadedAt;
    if (!data || age > maxAgeMs) return refresh();
    if (age > refreshMs) refresh().catch((error) => console.error('อ่านชีตเบื้องหลังไม่สำเร็จ:', error.message));
    return data;
  }

  function invalidate() {
    version += 1;
    data = null;
    loading = null;
  }

  // อ่านชีตใหม่ล่วงหน้าเรื่อย ๆ ระหว่างที่ยังมีคนเปิดเว็บอยู่
  const timer = setInterval(() => {
    const someoneActive = Date.now() - lastUsed < idleMs;
    if (someoneActive && data && Date.now() - loadedAt >= refreshMs) {
      refresh().catch((error) => console.error('อ่านชีตเบื้องหลังไม่สำเร็จ:', error.message));
    }
  }, 1000);
  timer.unref(); // ไม่ต้องรอตัวจับเวลานี้ตอนปิดเซิร์ฟเวอร์

  return { get, invalidate };
}

module.exports = { createLiveCache };
