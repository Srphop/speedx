// ===== บัญชีผู้ใช้ เก็บในแท็บ "Users" ของ Google Sheet =====
// หัวตาราง: user_id | name | email | password_hash | theme | created_at
// รหัสผ่านไม่ได้เก็บตรง ๆ เก็บแค่ค่าที่เข้ารหัสแล้ว (bcrypt)
const crypto = require('crypto');
const { readTab, appendRow, writeCell } = require('./googleSheets');

const USERS_TAB = 'Users';
const COLUMNS = ['user_id', 'name', 'email', 'password_hash', 'theme', 'created_at'];

// อ่านผู้ใช้ทั้งหมด → [{ user_id, name, email, ..., _row: เลขแถวในชีต }]
async function readUsers() {
  const rows = await readTab(USERS_TAB);
  return rows.slice(1).map((cells, index) => {
    const user = { _row: index + 2 }; // แถว 1 คือหัวตาราง
    COLUMNS.forEach((key, column) => {
      user[key] = cells[column] === undefined ? '' : String(cells[column]);
    });
    return user;
  });
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
  };
  await appendRow(USERS_TAB, COLUMNS.map((key) => user[key]));
  return user;
}

async function updateUserTheme(userId, theme) {
  const user = await findUserById(userId);
  if (!user) return null;

  const themeColumn = String.fromCharCode('A'.charCodeAt(0) + COLUMNS.indexOf('theme'));
  await writeCell(USERS_TAB, themeColumn, user._row, theme);
  return { ...user, theme };
}

module.exports = { findUserByEmail, findUserById, createUser, updateUserTheme };
