// ===== ใส่คอลัมน์ วัตถุประสงค์ / สิ่งที่ทำในกิจกรรม / กลุ่มเป้าหมาย ลงแท็บ Events =====
// รันครั้งเดียวด้วยคำสั่ง: npm run add-event-details
// ข้อความมาจากไฟล์ backend/data/event-details.json (แก้ไฟล์นั้นก่อนรันได้)
// ถ้าในชีตมีคอลัมน์พวกนี้อยู่แล้ว จะเขียนทับค่าเดิมของกิจกรรมที่อยู่ในไฟล์
require('dotenv').config();

const { readTab, writeColumn, isUsingGoogleSheets } = require('../services/googleSheets');
const details = require('../data/event-details.json');

const NEW_COLUMNS = ['objective', 'highlights', 'target_group'];

function columnLetter(index) {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

async function main() {
  console.log(isUsingGoogleSheets() ? 'เขียนลง Google Sheet...' : 'ยังไม่ได้ตั้งค่า Google ใน .env จะเขียนลงชีตจำลองในเครื่องแทน');

  const rows = await readTab('Events');
  const header = rows[0].map((cell) => String(cell).trim());

  for (const key of NEW_COLUMNS) {
    // คอลัมน์ยังไม่มี → ต่อท้ายหัวตาราง
    let index = header.indexOf(key);
    if (index === -1) {
      index = header.length;
      header.push(key);
    }

    // ค่าในคอลัมน์นี้ทุกแถว: หัวตาราง + ข้อความของแต่ละกิจกรรม (ไม่มีในไฟล์ → คงค่าเดิม)
    const values = rows.map((row, rowIndex) => {
      if (rowIndex === 0) return key;
      const eventId = String(row[0]).trim();
      const fromFile = details[eventId] && details[eventId][key];
      return fromFile !== undefined ? fromFile : row[index] === undefined ? '' : row[index];
    });

    await writeColumn('Events', columnLetter(index), values);
    console.log(`เขียนคอลัมน์ ${key} (คอลัมน์ ${columnLetter(index)}) แล้ว`);
  }

  console.log('เสร็จแล้ว เปิดหน้ารายละเอียดกิจกรรมดูได้เลย');
}

main().catch((error) => {
  console.error('ไม่สำเร็จ:', error.publicMessage || error.message);
  process.exit(1);
});
