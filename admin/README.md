# แอดมิน · ฟุตซอลลีก (Bacho League)

แอปแอดมินแยกจาก public app — ใช้ Supabase โปรเจกต์เดียวกัน (Auth + UPDATE ผ่าน RLS)

## บัญชีแอดมิน (สนาม)

| ไอดี | PIN |
|------|-----|
| lubo1 … lubo8 | `123456` |

- เข้าด้วยไอดีอย่างเดียว (ระบบแปลงเป็นอีเมลภายใน)
- **เข้าซ้อนเครื่องไม่ได้** — ถ้าไอดีเดียวกันล็อกอินเครื่องใหม่ เครื่องเก่าจะถูกเตะออก
- อีเมลใน Auth: `luboN@bacholeague.app`

## เตรียมก่อนรัน

### 1. รัน migration

ใน **SQL Editor** รัน:

- `../supabase/migrations/202603100002_admin_write.sql`
- `../supabase/migrations/202603110010_admin_single_session.sql`

```bash
cp .env.example .env
```

ใส่ `VITE_SUPABASE_ANON_KEY` จาก Project Settings → API (anon/public key เท่านั้น — **ห้าม** ใส่ service role)

`VITE_SUPABASE_URL` ในตัวอย่างชี้ไปโปรเจกต์เดียวกันกับแอปสาธารณะแล้ว

### 4. ติดตั้งและรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:5174/

## สิ่งที่ทำได้ (MVP)

- ล็อกอิน / ออกจากระบบ
- การ์ดสรุป: ถ่ายทอดสด / จบแล้ว / กำหนดการ + คะแนนนำ (แตะเพื่อกรอง)
- สลับกีฬา: ฟุตบอล / วอลเลย์บอล
- แก้ไขแมตช์: สถานะ, คะแนน, นาฬิกา, ช่วงเวลา

## หมายเหตุ

- Public app อ่านอย่างเดียว (SELECT RLS)
- Admin เขียนผ่าน session ของผู้ใช้ Auth + policy ใน migration
- ไม่มีหน้าสถิติ / รายงาน / ตั้งค่าระบบใน MVP นี้
