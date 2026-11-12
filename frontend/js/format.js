// ===== ตัวช่วยจัดรูปแบบข้อความ ตัวเลข วันที่ =====
const TIME_ZONE = 'Asia/Bangkok';
const LOCALE = 'th-TH-u-ca-gregory'; // ภาษาไทย แต่ใช้ปี ค.ศ. ให้ตรงกับในชีต

// กันข้อความจากชีตกลายเป็นโค้ด HTML
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  return '฿' + Number(amount || 0).toLocaleString('th-TH');
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function formatDateLong(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function formatTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

function formatTimeRange(startIso, endIso) {
  return endIso ? `${formatTime(startIso)}–${formatTime(endIso)} น.` : `${formatTime(startIso)} น.`;
}

// แยกวันที่ตามเวลาไทย → { year, month (1-12), day }
function bangkokParts(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(iso));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// วันที่แบบไทยเป็นข้อความ "YYYY-MM-DD" ไว้เทียบว่าวันเดียวกันไหม
function bangkokDateKey(iso) {
  const p = bangkokParts(iso);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// กิจกรรมหลายวันไหม (วันจบคนละวันกับวันเริ่ม)
function isMultiDay(startIso, endIso) {
  return Boolean(startIso && endIso) && bangkokDateKey(startIso) !== bangkokDateKey(endIso);
}

// "14 พ.ย. 2026" หรือ "20 พ.ย. 2026 – 22 พ.ย. 2026"
function formatDateRange(startIso, endIso) {
  return isMultiDay(startIso, endIso) ? `${formatDate(startIso)} – ${formatDate(endIso)}` : formatDate(startIso);
}

// แบบยาว ใช้ในหน้ารายละเอียด
function formatDateRangeLong(startIso, endIso) {
  return isMultiDay(startIso, endIso)
    ? `${formatDateLong(startIso)} ถึง ${formatDateLong(endIso)}`
    : formatDateLong(startIso);
}

// จำนวนวันของกิจกรรม (นับรวมวันแรกและวันสุดท้าย)
function countDays(startIso, endIso) {
  if (!isMultiDay(startIso, endIso)) return 1;
  return Math.round((new Date(bangkokDateKey(endIso)) - new Date(bangkokDateKey(startIso))) / 86400000) + 1;
}

// สถานะกิจกรรม → class สี (ป้ายต้องมีข้อความเสมอ ไม่ใช้สีอย่างเดียว)
const STATUS_CLASS = {
  'ใกล้ถึง': 'status-upcoming',
  'วางแผนไว้': 'status-planned',
  'จัดแล้ว': 'status-done',
  'ยกเลิก': 'status-cancelled',
};

function statusBadge(status) {
  const className = STATUS_CLASS[status] || 'status-cancelled';
  return `<span class="status-badge ${className}">${escapeHtml(status)}</span>`;
}

function getInitials(name) {
  return String(name || '?').trim().charAt(0).toUpperCase();
}
