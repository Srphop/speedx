# SpeedX: ระบบจัดการชมรม

เว็บสำหรับทีมงานชมรม ใช้ดูข่าวสาร กิจกรรม สมาชิก งบการเงิน และแผนกิจกรรมรายปี
**ฐานข้อมูลคือ Google Sheet** อ่าน/เขียนผ่าน Google Sheets API (บัญชีผู้ใช้ก็เก็บในแท็บ `Users` ของชีตเดียวกัน)

Final Project วิชา 2110221 โจทย์ P4 Club Activity Dashboard

- **Live:** https://speedx.onrender.com (เปลี่ยนเป็นลิงก์จริงของทีม)

## เปิดเว็บในเครื่อง (ไม่ต้องตั้งค่าอะไร)

ต้องมี Node.js 18 ขึ้นไป (เช็กด้วย `node -v`)

```bash
npm install
npm start
```

เปิด **http://localhost:3222** แล้วสมัครบัญชีได้เลย

ยังไม่ได้ต่อ Google ระบบจะใช้ "ชีตจำลอง" ในไฟล์ `backend/data/local-sheet.json` แทน
(สมัครบัญชี ลบสมาชิก เปลี่ยนธีม จะถูกบันทึกลงไฟล์นี้ เปิดดูได้ว่าข้อมูลเข้าจริง)
อยากล้างข้อมูลกลับเป็นค่าเริ่มต้น ลบไฟล์ `local-sheet.json` ทิ้งแล้วรันใหม่

## โครงสร้างโปรเจกต์

```
speedx/
├─ package.json              npm start = รัน backend/server.js
├─ .env.example              ตัวอย่างค่าตั้งค่า (ก๊อปเป็น .env)
├─ backend/                  ฝั่งเซิร์ฟเวอร์ (Node.js + Express)
│  ├─ server.js              จุดเริ่ม: /api = backend, ที่เหลือ = ส่งหน้าเว็บใน frontend/
│  ├─ routes/                กำหนด URL ของ API
│  ├─ controllers/           ตรรกะของแต่ละหน้า (auth, news, events, members, finance, notifications)
│  ├─ middleware/requireAuth.js  เช็ก token ก่อนเข้า API ที่ต้องล็อกอิน
│  ├─ services/googleSheets.js   ← ตัวคุยกับ Google Sheets API (อ่าน / เพิ่มแถว / แก้ช่อง)
│  ├─ services/userStore.js      บัญชีผู้ใช้ในแท็บ Users
│  ├─ services/clubData.js       แปลงข้อมูลชีต + กติกา (ใกล้ถึง, งบเกิน 80%)
│  ├─ utils/time.js          วันเวลาแบบไทย (Asia/Bangkok)
│  └─ data/mock-sheet.json   ข้อมูลตัวอย่าง (ใช้ตอนยังไม่ต่อ Google)
└─ frontend/                 ฝั่งหน้าเว็บ (HTML + CSS + JavaScript ธรรมดา)
   ├─ login.html, signup.html, news.html, members.html,
   │  events.html, event.html, finance.html, calendar.html
   ├─ css/style.css          หน้าตา + สีธีมสว่าง/มืด
   ├─ css/animations.css     อนิเมชั่นทั้งหมด
   ├─ js/api.js              ตัวเรียก backend
   ├─ js/layout.js           เมนูซ้าย + หัวหน้า + กระดิ่ง
   ├─ js/charts.js           กราฟ
   └─ js/pages/              โค้ดของแต่ละหน้า
```

## แท็บในชีต

| แท็บ | ใช้ทำอะไร |
|---|---|
| `Members` | รายชื่อสมาชิก (ลบสมาชิก = เปลี่ยน `membership_status` เป็น `inactive`) |
| `Events` | กิจกรรม |
| `Attendance` | การเข้าร่วม (นับเฉพาะ `เข้าร่วมจริง`) |
| `Funding` | แหล่งเงิน |
| `Expenses` | ค่าใช้จ่าย |
| `News` | ข่าวสาร |
| `Users` | บัญชีผู้ใช้ (ระบบสร้างแท็บนี้ให้เองตอนมีคนสมัครครั้งแรก) |

## API

| Method | URL | ทำอะไร |
|---|---|---|
| POST | `/api/auth/signup` | สมัครบัญชี (เพิ่มแถวในแท็บ Users) |
| POST | `/api/auth/login` | เข้าสู่ระบบ ได้ token กลับมา |
| GET | `/api/auth/me` | ข้อมูลผู้ใช้ที่ล็อกอินอยู่ |
| PATCH | `/api/auth/me/theme` | บันทึกธีมสว่าง/มืด |
| GET | `/api/news` | ข่าวสาร |
| GET | `/api/events` | กิจกรรมทั้งหมด |
| GET | `/api/events/:id` | รายละเอียดกิจกรรม ผู้เข้าร่วม และงบ |
| GET | `/api/members` | สมาชิก active + สัดส่วนตามคณะ |
| PATCH | `/api/members/:id/deactivate` | ลบสมาชิก |
| GET | `/api/finance` | สรุปงบ |
| GET | `/api/notifications` | แจ้งเตือนกิจกรรมใน 3 วัน และงบเกิน 80% |
| GET | `/api/health` | เช็กว่าเซิร์ฟเวอร์ทำงาน และใช้ข้อมูลจากไหน |

## ตรงเกณฑ์ข้อไหน

| เกณฑ์ | ในแอปนี้ |
|---|---|
| User Login | สมัคร / เข้าสู่ระบบ / ออกจากระบบ รหัสผ่านเข้ารหัสด้วย bcrypt |
| API Integration | Google Sheets API ทั้งอ่านและเขียน |
| Deployed & Live | Render (https) |
| Dashboard (Tier B) | การ์ดสถิติ แถบการใช้งบ กราฟ คำนวณจากข้อมูลในชีต |
| Dark Mode (Tier C) | ปุ่มสลับธีม จำธีมไว้ในบัญชีผู้ใช้ |
| Notification (Tier C) | กระดิ่งแจ้งเตือนกิจกรรมที่จะเริ่มใน 3 วัน และงบใช้เกิน 80% |

---

## ต่อ Google Sheet จริง

1. เข้า https://console.cloud.google.com สร้างโปรเจกต์ใหม่ เช่น `speedx`
2. **APIs & Services → Library** ค้นหา **Google Sheets API** แล้วกด **Enable**
3. **APIs & Services → Credentials → Create credentials → Service account** ตั้งชื่อ แล้วกด Done
4. คลิก service account ที่สร้าง → แท็บ **Keys → Add key → Create new key → JSON** จะได้ไฟล์ .json (**ห้าม commit ไฟล์นี้**)
5. ก๊อป `.env.example` เป็น `.env` แล้วใส่ค่าจากไฟล์ .json
   ```
   GOOGLE_CLIENT_EMAIL=ค่า client_email
   GOOGLE_PRIVATE_KEY="ค่า private_key ทั้งก้อน"
   ```
6. เปิด Google Sheet → **Share** → ใส่อีเมล `client_email` ให้สิทธิ์ **Editor**
7. รัน `npm start` ใหม่ ต้องขึ้น `ข้อมูล: Google Sheets API` แล้วลองสมัครบัญชี จะเห็นแถวใหม่โผล่ในแท็บ `Users`

ข้อมูลชมรมถูกจำไว้ 30 วินาที แก้ในชีตแล้วรอสักครู่ค่อยรีเฟรชหน้าเว็บ

## ขึ้นเว็บจริงบน Render (ได้ลิงก์ https)

1. อัปโปรเจกต์ขึ้น GitHub (เช็กว่าไม่มีไฟล์ `.env` หรือไฟล์ key .json ติดไป)
2. https://render.com → **New → Web Service** → เลือก repo นี้
3. **Build Command:** `npm install` **Start Command:** `npm start` **Instance Type:** Free
4. **Environment Variables:** `JWT_SECRET`, `GOOGLE_SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
5. กด Deploy ได้ลิงก์ประมาณ `https://speedx-xxxx.onrender.com` เปิดได้ทั้งหน้าเว็บและ API ในลิงก์เดียว

**ก่อนพรีเซนต์:** Render แบบฟรีจะหลับเมื่อไม่มีคนใช้ 15 นาที เปิดเว็บทิ้งไว้ก่อน 2 นาที
อยากให้สถานะ "ใกล้ถึง" ตรงกับที่ซ้อม ตั้ง `DEMO_NOW` เช่น `2026-11-12T10:00:00+07:00`

## License
MIT ดูไฟล์ [LICENSE](LICENSE)
