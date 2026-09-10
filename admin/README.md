# แอดมิน · ฟุตซอลลีก (Bacho League)

แอปแอดมินแยกจาก public app — ใช้ Supabase โปรเจกต์เดียวกัน (Auth + UPDATE ผ่าน RLS)

## เตรียมก่อนรัน

### 1. สร้างผู้ใช้ใน Supabase Auth

1. เปิด [Supabase Dashboard](https://supabase.com/dashboard) → โปรเจกต์ Bacho League
2. ไปที่ **Authentication → Users → Add user**
3. สร้างด้วย **email + password** (ใช้ล็อกอินในแอปนี้)

### 2. รัน migration (สิทธิ์เขียน)

ใน **SQL Editor** รันไฟล์:

`../supabase/migrations/202603100002_admin_write.sql`

(ต้องรัน `202603100001_init.sql` ก่อนถ้ายังไม่เคย)

Migration นี้ให้ผู้ใช้ที่ล็อกอินแล้ว (`authenticated`) อัปเดต `matches`, `standings`, `notifications` ได้ — ไม่ใช้ service role ใน client

### 3. ตั้งค่า env

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
