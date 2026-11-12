// ===== เครื่องมือเรื่องวันเวลา (ยึดเวลาไทย Asia/Bangkok = UTC+7) =====
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// "ตอนนี้" ของระบบ ตั้ง DEMO_NOW ใน .env เพื่อซ้อมเดโมด้วยวันที่สมมติได้
function getNow() {
  return process.env.DEMO_NOW ? new Date(process.env.DEMO_NOW) : new Date();
}

// สร้างเวลาจริงจาก "เวลาไทย" ที่อ่านจากชีต
function fromBangkokParts(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - BANGKOK_OFFSET_MS);
}

// แปลงค่าวันที่จากชีตให้เป็นข้อความ ISO เช่น "2026-11-14T06:00:00.000Z"
// รองรับ: ตัวเลข serial ของ Google Sheets, "2026-11-14 13:00:00", "14/11/2026 13:00"
function toIsoDate(value) {
  if (value === '' || value === null || value === undefined) return null;

  if (typeof value === 'number') {
    // Google Sheets นับวันตั้งแต่ 30 ธ.ค. 1899 (วันที่เป็นเวลาไทยตามที่พิมพ์ในชีต)
    const wallClockMs = Math.round((value - 25569) * DAY_MS);
    return new Date(wallClockMs - BANGKOK_OFFSET_MS).toISOString();
  }

  const text = String(value).trim();

  const isoLike = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoLike) {
    const [, y, m, d, h, min, s] = isoLike.map((part) => Number(part || 0));
    return fromBangkokParts(y, m, d, h, min, s).toISOString();
  }

  const thaiLike = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (thaiLike) {
    const [, d, m, y, h, min, s] = thaiLike.map((part) => Number(part || 0));
    const year = y > 2400 ? y - 543 : y; // ปี พ.ศ. → ค.ศ.
    return fromBangkokParts(year, m, d, h, min, s).toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// วันที่แบบไทยเป็นข้อความ "YYYY-MM-DD" ใช้นับจำนวนวัน
function bangkokDateKey(date) {
  return new Date(new Date(date).getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

// อีกกี่วันถึงวันนั้น (นับตามปฏิทินไทย วันนี้ = 0, พรุ่งนี้ = 1)
function daysUntil(date, now) {
  const target = new Date(bangkokDateKey(date));
  const today = new Date(bangkokDateKey(now));
  return Math.round((target - today) / DAY_MS);
}

module.exports = { getNow, toIsoDate, bangkokDateKey, daysUntil };
