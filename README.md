# ฟุตซอลลีก

แอปผลกีฬามือถือสำหรับลีกอำเภอบาเจาะ (8 อปท.)

- Public app: ไม่มี login
- Admin: อยู่ที่โฟลเดอร์ `/admin` (แอป Vite แยก) — เชื่อม Supabase ตัวเดียวกัน

## รันท้องถิ่น

```bash
npm install
npm run dev
```

เปิด http://localhost:5173/

ถ้ายังไม่มี `.env` แอปจะแสดงสถานะว่าง (Offline) — ไม่ใช้ข้อมูลจำลอง

### Admin (`/admin`)

```bash
cd admin
npm install
cp .env.example .env   # ใส่ anon key
npm run dev            # http://localhost:5174/
```

สิทธิ์แอดมินถูกบังคับทั้งหน้าเว็บและ RLS: `lubo1–lubo8@bacholeague.app` และ
`nitikornluboksawo@gmail.com` เท่านั้น

## เชื่อม Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard
2. เปิด **SQL Editor** รัน migration ตามชื่อไฟล์เรียงลำดับ แล้วรัน `supabase/seed.sql`
3. คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วใส่:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   (จาก Project Settings → API)
4. รีสตาร์ท `npm run dev` — แถบสถานะจะขึ้น **Official Feed**

## Deploy (Vercel)

Production ต้อง deploy ผ่าน repository guard เท่านั้น:

```bash
npm run deploy:prod
npm run deploy:admin:prod
```

Public app ใช้ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ส่วน proxy ของ
Google Sheets ใช้ตัวแปร server-only `GOOGLE_SHEETS_WEBHOOK_URL` และ
`GOOGLE_SHEETS_SHARED_SECRET` (ห้ามขึ้นต้นด้วย `VITE_`)

## สแตก

- React + Vite + TypeScript
- Supabase (DB + Realtime)
- Vercel (hosting)
- Admin แยกที่ `/admin` (port 5174)

## ฤดูกาล

**สายใยสัมพันธ์ 2569**

Product by Alif Doloh
