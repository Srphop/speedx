// ===== บัญชีผู้ใช้ เก็บในแท็บ "Users" ของ Google Sheet =====
// หัวตาราง: user_id | name | email | password_hash | theme | created_at | position | avatar_color | avatar_image
// รหัสผ่านไม่ได้เก็บตรง ๆ เก็บแค่ค่าที่เข้ารหัสแล้ว (bcrypt)
// avatar_image = รูปโปรไฟล์ที่ย่อแล้ว เก็บเป็นข้อความ (data URL) ในช่องเดียว
const crypto = require('crypto');
const { readTab, appendRow, writeCell } = require('./googleSheets');

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
async function readUsers() {
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

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find((user) => user.email === email) || null;
}

async function findUserById(userId) {
  const users = await readUsers();
  return users.find((user) => user.user_id === userId) || null;
}

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
    position: '',
    avatar_color: '',
    avatar_image: '',
  };
  await appendRow(USERS_TAB, COLUMNS.map((key) => user[key]));
  return user;
}

// แก้หลายช่องของผู้ใช้คนเดียว เช่น updateUser(id, { name: 'ใหม่', position: 'ประธาน' })
async function updateUser(userId, fields) {
  const user = await findUserById(userId);
  if (!user) return null;

  const keys = Object.keys(fields).filter((key) => COLUMNS.includes(key) && key !== 'user_id');
  if (keys.some((key) => COLUMNS.indexOf(key) >= COLUMNS.indexOf('position'))) await ensureHeader();

  for (const key of keys) {
    if (fields[key] !== user[key]) {
      await writeCell(USERS_TAB, columnLetter(key), user._row, fields[key]);
    }
  }
  return { ...user, ...fields };
}

async function updateUserTheme(userId, theme) {
  return updateUser(userId, { theme });
}

module.exports = { findUserByEmail, findUserById, createUser, updateUser, updateUserTheme };
