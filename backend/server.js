// ===== SpeedX: จุดเริ่มต้นของเซิร์ฟเวอร์ =====
// เซิร์ฟเวอร์ตัวเดียวทำ 2 อย่าง
//   1) /api/...  = backend (ล็อกอิน + ข้อมูลชมรมจาก Google Sheets)
//   2) ที่เหลือ   = ส่งไฟล์หน้าเว็บในโฟลเดอร์ frontend/
require('dotenv').config();

const path = require('path');
const express = require('express');

const authRoutes = require('./routes/authRoutes');
const clubRoutes = require('./routes/clubRoutes');
const { isUsingGoogleSheets } = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 3222;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'speedx-dev-secret'; // ใช้ในเครื่องได้ ตอนขึ้นเว็บจริงต้องตั้งเอง
  console.warn('ยังไม่ได้ตั้ง JWT_SECRET ใน .env กำลังใช้ค่าชั่วคราว');
}

app.use(express.json());

// ---------- backend ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataSource: isUsingGoogleSheets() ? 'google-sheets' : 'local-files',
  });
});

app.use('/api/auth', authRoutes); // สมัคร / ล็อกอิน / ข้อมูลผู้ใช้
app.use('/api', clubRoutes); // ข้อมูลชมรม (ต้องล็อกอินก่อน)

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'ไม่พบ API นี้' });
});

// ---------- frontend ----------
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// error ที่ไม่ได้ดักไว้ จะมาจบที่นี่
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.publicMessage || 'เซิร์ฟเวอร์มีปัญหา ลองอีกครั้ง' });
});

app.listen(PORT, () => {
  console.log(`SpeedX พร้อมแล้ว เปิด http://localhost:${PORT}`);
  console.log(
    isUsingGoogleSheets()
      ? 'ข้อมูล: Google Sheets API'
      : 'ข้อมูล: ไฟล์ในเครื่อง backend/data/ (ยังไม่ได้ตั้งค่า Google ใน .env)'
  );
});
