// ===== ฐานข้อมูลของ SpeedX = Google Sheet =====
// ทุกส่วนของระบบอ่าน/เขียนข้อมูลผ่านไฟล์นี้ไฟล์เดียว
//   readAllTabs()  อ่านข้อมูลชมรมทุกแท็บในครั้งเดียว
//   readTab()      อ่านแท็บเดียว (ใช้กับแท็บ Users)
//   appendRow()    เพิ่มแถวใหม่ท้ายแท็บ (สมัครบัญชี)
//   writeCell()    แก้ค่าช่องเดียว (ลบสมาชิก / เปลี่ยนธีม)
//
// ยังไม่ได้ตั้งค่า GOOGLE_* ใน .env → ใช้ "ชีตจำลอง" เป็นไฟล์ JSON ในเครื่องแทน
// จะได้เปิดเว็บลองได้ทันทีโดยไม่ต้องตั้งค่าอะไร
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const mockSheet = require('../data/mock-sheet.json');

// แท็บข้อมูลชมรม (ชื่อต้องตรงกับในชีต)
const CLUB_TABS = ['Members', 'Events', 'Attendance', 'Funding', 'Expenses', 'News'];

function isUsingGoogleSheets() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
}

// =====================================================
// โหมด Google Sheets จริง
// =====================================================
let sheetsApi = null;
function getSheetsApi() {
  if (!sheetsApi) {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      // บน Render มักวาง key เป็นบรรทัดเดียวที่มี \n อยู่ ต้องแปลงกลับเป็นขึ้นบรรทัดใหม่
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsApi = google.sheets({ version: 'v4', auth });
  }
  return sheetsApi;
}

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID;

// error ที่จะโชว์ให้ผู้ใช้เห็น (ไม่เปิดเผยรายละเอียดภายใน)
function sheetsError(action, cause) {
  console.error(`Google Sheets ${action} failed:`, cause.message);
  const error = new Error(cause.message);
  error.status = 502;
  error.publicMessage = `${action}ข้อมูลจาก Google Sheets ไม่สำเร็จ`;
  return error;
}

// =====================================================
// โหมดชีตจำลองในเครื่อง (ไฟล์ backend/data/local-sheet.json)
// เริ่มจากข้อมูลตัวอย่าง mock-sheet.json แล้วบันทึกการแก้ไขลงไฟล์
// อยากล้างข้อมูลกลับเป็นค่าเริ่มต้น → ลบไฟล์ local-sheet.json ทิ้ง
// =====================================================
const LOCAL_FILE = path.join(__dirname, '..', 'data', 'local-sheet.json');
let localSheet = null;

function getLocalSheet() {
  if (!localSheet) {
    localSheet = fs.existsSync(LOCAL_FILE)
      ? JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'))
      : JSON.parse(JSON.stringify(mockSheet));
  }
  return localSheet;
}

function saveLocalSheet() {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(localSheet, null, 1));
}

function columnIndex(letter) {
  return letter.charCodeAt(0) - 'A'.charCodeAt(0);
}

// =====================================================
// ฟังก์ชันที่ส่วนอื่นเรียกใช้
// =====================================================

// อ่านข้อมูลชมรมทุกแท็บ → { Members: [[หัวตาราง], [แถว 2], ...], Events: [...], ... }
async function readAllTabs() {
  if (!isUsingGoogleSheets()) {
    const sheet = getLocalSheet();
    const tabs = {};
    CLUB_TABS.forEach((name) => (tabs[name] = JSON.parse(JSON.stringify(sheet[name] || []))));
    return tabs;
  }

  try {
    const response = await getSheetsApi().spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID(),
      ranges: CLUB_TABS,
      valueRenderOption: 'UNFORMATTED_VALUE', // ตัวเลขมาเป็นตัวเลข ไม่มีลูกน้ำ
      dateTimeRenderOption: 'SERIAL_NUMBER', // วันที่มาเป็นตัวเลข ไม่ขึ้นกับภาษาของชีต
    });

    const tabs = {};
    response.data.valueRanges.forEach((range, index) => {
      tabs[CLUB_TABS[index]] = range.values || [];
    });
    return tabs;
  } catch (cause) {
    throw sheetsError('อ่าน', cause);
  }
}

// อ่านแท็บเดียว ถ้ายังไม่มีแท็บนี้ในชีต จะสร้างให้อัตโนมัติ
async function readTab(tabName) {
  if (!isUsingGoogleSheets()) {
    return JSON.parse(JSON.stringify(getLocalSheet()[tabName] || []));
  }

  try {
    const response = await getSheetsApi().spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: tabName,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    return response.data.values || [];
  } catch (cause) {
    if (String(cause.message).includes('Unable to parse range')) {
      await createTab(tabName);
      return [];
    }
    throw sheetsError('อ่าน', cause);
  }
}

async function createTab(tabName) {
  try {
    await getSheetsApi().spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
    console.log(`สร้างแท็บ ${tabName} ในชีตให้แล้ว`);
  } catch (cause) {
    throw sheetsError('สร้างแท็บ', cause);
  }
}

// เพิ่มแถวใหม่ท้ายแท็บ เช่น appendRow('Users', ['U-1', 'ชื่อ', ...])
// options.asTyped = true → ให้ Google แปลงค่าเหมือนพิมพ์เอง (เช่น "2026-11-20 13:00" กลายเป็นวันที่)
async function appendRow(tabName, values, options = {}) {
  if (!isUsingGoogleSheets()) {
    const sheet = getLocalSheet();
    if (!sheet[tabName]) sheet[tabName] = [];
    sheet[tabName].push(values);
    saveLocalSheet();
    return;
  }

  try {
    await getSheetsApi().spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range: `${tabName}!A1`,
      valueInputOption: options.asTyped ? 'USER_ENTERED' : 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  } catch (cause) {
    throw sheetsError('บันทึก', cause);
  }
}

// แก้ค่าช่องเดียว เช่น writeCell('Members', 'F', 3, 'inactive') = ช่อง F3 ของแท็บ Members
async function writeCell(tabName, columnLetter, rowNumber, value) {
  if (!isUsingGoogleSheets()) {
    getLocalSheet()[tabName][rowNumber - 1][columnIndex(columnLetter)] = value;
    saveLocalSheet();
    return;
  }

  try {
    await getSheetsApi().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${tabName}!${columnLetter}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  } catch (cause) {
    throw sheetsError('บันทึก', cause);
  }
}

// เขียนทั้งคอลัมน์ทีเดียว เช่น writeColumn('Events', 'K', ['objective', 'ข้อ 1', ...]) = K1, K2, ...
async function writeColumn(tabName, columnLetter, values) {
  if (!isUsingGoogleSheets()) {
    const rows = getLocalSheet()[tabName];
    values.forEach((value, index) => {
      if (!rows[index]) rows[index] = [];
      rows[index][columnIndex(columnLetter)] = value;
    });
    saveLocalSheet();
    return;
  }

  try {
    await getSheetsApi().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${tabName}!${columnLetter}1:${columnLetter}${values.length}`,
      valueInputOption: 'RAW',
      requestBody: { values: values.map((value) => [value]) },
    });
  } catch (cause) {
    throw sheetsError('บันทึก', cause);
  }
}

module.exports = { isUsingGoogleSheets, readAllTabs, readTab, appendRow, writeCell, writeColumn };
