// ===== บัญชีผู้ใช้ เก็บในแท็บ "Users" ของ Google Sheet =====
// หัวตาราง: user_id | name | email | password_hash | theme | created_at | position | avatar_color | avatar_image
// รหัสผ่านไม่ได้เก็บตรง ๆ เก็บแค่ค่าที่เข้ารหัสแล้ว (bcrypt)
// avatar_image = รูปโปรไฟล์ที่ย่อแล้ว เก็บเป็นข้อความ (data URL) ในช่องเดียว
//
// สิทธิ์ใช้งาน: ประธานชมรมตั้งในชีตเองที่คอลัมน์ position (ผู้ใช้แก้เองจากหน้าเว็บไม่ได้)
//   ว่างไว้ (หรือเขียนว่า ผู้เยี่ยมชม) → ผู้เยี่ยมชม ดูได้อย่างเดียว
//   ใส่อะไรก็ได้ เช่น สมาชิก / ประธานชมรม / เหรัญญิก → สมาชิกชมรม แก้ข้อมูลได้ทุกอย่าง และโชว์เป็นยศ
const crypto = require('crypto');
const { readTab, appendRow, writeCell } = require('./googleSheets');
const { createLiveCache } = require('./liveCache');

const USERS_TAB = 'Users';
const COLUMNS = [
  'user_id',
  'name',
  'email',
  'password_hash',
  'theme',
  'created_at',
  'position',
  'avatar_color',
  'avatar_image',
];

function columnLetter(key) {
  return String.fromCharCode('A'.charCodeAt(0) + COLUMNS.indexOf(key));
}

// อ่านผู้ใช้ทั้งหมด → [{ user_id, name, email, ..., _row: เลขแถวในชีต }]
// จำไว้แบบเดียวกับข้อมูลชมรม: ระหว่างมีคนใช้ อ่านแท็บ Users ใหม่ทุก 5 วินาที
// (ประธานเปลี่ยนยศในชีต เว็บเห็นภายในไม่กี่วินาที แต่ไม่ต้องอ่านชีตทุกคำขอ)
const usersCache = createLiveCache(readUsersFromSheet, { refreshMs: 5 * 1000 });

function readUsers(options) {
  return usersCache.get(options);
}

async function readUsersFromSheet() {
  const rows = await readTab(USERS_TAB);
  return rows.slice(1).map((cells, index) => {
    const user = { _row: index + 2 }; // แถว 1 คือหัวตาราง
    COLUMNS.forEach((key, column) => {
      const value = cells[column];
      user[key] = value === undefined || value === null ? '' : String(value);
    });
    return user;
  });
}

// ชีตที่สร้างก่อนมีคอลัมน์ใหม่ (position, avatar_...) → เติมหัวตารางที่ขาดให้
async function ensureHeader() {
  const header = (await readTab(USERS_TAB))[0] || [];
  for (const [index, key] of COLUMNS.entries()) {
    if (String(header[index] || '').trim() !== key) {
      await writeCell(USERS_TAB, columnLetter(key), 1, key);
    }
  }
}

// fresh: true → อ่านชีตใหม่ (ใช้ตอนสมัคร กันอีเมลซ้ำ)
async function findUserByEmail(email, options) {
  const users = await readUsers(options);
  return users.find((user) => user.email === email) || null;
}

async function findUserById(userId) {
  const users = await readUsers();
  return users.find((user) => user.user_id === userId) || null;
}

const VISITOR_LABEL = 'ผู้เยี่ยมชม';

async function createUser({ name, email, passwordHash }) {
  // แท็บยังว่าง → ใส่หัวตารางก่อน
  const rows = await readTab(USERS_TAB);
  if (rows.length === 0) await appendRow(USERS_TAB, COLUMNS);

  const user = {
    user_id: crypto.randomUUID(),
    name,
    email,
    password_hash: passwordHash,
    theme: 'light',
    created_at: new Date().toISOString(),
    position: VISITOR_LABEL, // สมัครใหม่ = ผู้เยี่ยมชมเสมอ ประธานค่อยเปลี่ยนในชีต
    avatar_color: '',
    avatar_image: '',
  };
  await appendRow(USERS_TAB, COLUMNS.map((key) => user[key]));
  usersCache.invalidate();
  return user;
}

// แก้หลายช่องของผู้ใช้คนเดียว เช่น updateUser(id, { name: 'ใหม่', position: 'ประธาน' })
async function updateUser(userId, fields) {
  const user = (await readUsers({ fresh: true })).find((item) => item.user_id === userId); // เลขแถวล่าสุดก่อนเขียน
  if (!user) return null;

  const keys = Object.keys(fields).filter((key) => COLUMNS.includes(key) && key !== 'user_id');
  if (keys.some((key) => COLUMNS.indexOf(key) >= COLUMNS.indexOf('position'))) await ensureHeader();

  for (const key of keys) {
    if (fields[key] !== user[key]) {
      await writeCell(USERS_TAB, columnLetter(key), user._row, fields[key]);
    }
  }
  usersCache.invalidate();
  return { ...user, ...fields };
}

async function updateUserTheme(userId, theme) {
  return updateUser(userId, { theme });
}

// บัญชีนี้เป็นสมาชิกชมรมไหม (ดูจากคอลัมน์ position ที่ประธานตั้งในชีต)
function isClubMember(user) {
  const position = String((user && user.position) || '').trim();
  return position !== '' && position !== VISITOR_LABEL && position.toLowerCase() !== 'visitor';
}

// ยศที่โชว์บนเว็บ: ตำแหน่งในชีต หรือ "ผู้เยี่ยมชม"
function roleLabel(user) {
  return isClubMember(user) ? String(user.position).trim() : VISITOR_LABEL;
}

module.exports = { listUsers: readUsers, findUserByEmail, findUserById, createUser, updateUser, updateUserTheme, isClubMember, roleLabel };
