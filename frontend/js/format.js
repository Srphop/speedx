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
