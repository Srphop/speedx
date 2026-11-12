// ===== ส่งออกข้อมูล: ไฟล์ CSV (เปิดใน Excel / Google Sheets ได้) และไฟล์ปฏิทิน .ics =====

// วันที่วันนี้ตามเวลาไทย ใช้ตั้งชื่อไฟล์ เช่น speedx-members-2026-11-13.csv
function todayStamp() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

// ให้เบราว์เซอร์ดาวน์โหลดข้อความเป็นไฟล์
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// แปลงตารางเป็น CSV: ช่องที่มี , " หรือขึ้นบรรทัดใหม่ ต้องครอบด้วย ""
function toCsv(headers, rows) {
  const cell = (value) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

// ﻿ (BOM) ข้างหน้า ทำให้ Excel อ่านภาษาไทยถูก ไม่เป็นภาษาต่างดาว
function downloadCsv(name, headers, rows) {
  const filename = `speedx-${name}-${todayStamp()}.csv`;
  downloadFile(filename, '﻿' + toCsv(headers, rows), 'text/csv;charset=utf-8');
  showToast(`ดาวน์โหลด ${filename} แล้ว (${rows.length} แถว)`);
}

// ปุ่ม "ส่งออก CSV" ขนาดเล็ก ใช้ในหัวการ์ด
function exportButtonHtml(id, label = 'ส่งออก CSV') {
  return `<button type="button" class="btn btn-outline btn-small" id="${id}">${icon('download')}<span>${label}</span></button>`;
}

// ---------- ปฏิทิน ----------
// "20261114T060000Z" (เวลา UTC แบบที่ปฏิทินทุกเจ้าเข้าใจ)
function calendarStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${calendarStamp(event.start_at)}/${calendarStamp(event.end_at || event.start_at)}`,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ไฟล์ .ics: กดเปิดแล้วเพิ่มลงปฏิทินในมือถือ / Outlook / Apple Calendar ได้
function downloadIcs(event) {
  const text = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SpeedX//Club Activity Dashboard//TH',
    'BEGIN:VEVENT',
    `UID:${event.event_id}@speedx`,
    `DTSTAMP:${calendarStamp(new Date().toISOString())}`,
    `DTSTART:${calendarStamp(event.start_at)}`,
    `DTEND:${calendarStamp(event.end_at || event.start_at)}`,
    `SUMMARY:${text(event.title)}`,
    `LOCATION:${text(event.location)}`,
    `DESCRIPTION:${text(event.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text(event.title)} พรุ่งนี้`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  downloadFile(`${event.event_id}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8');
  showToast('ดาวน์โหลดไฟล์ปฏิทินแล้ว เปิดไฟล์เพื่อเพิ่มลงปฏิทินในเครื่อง');
}
