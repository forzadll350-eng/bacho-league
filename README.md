# ฟุตซอลลีก

แอปผลกีฬามือถือสำหรับลีกอำเภอบาเจาะ (8 อปท.)

- Public app: ไม่มี login
- Admin: สร้างแยก แล้วเชื่อม Supabase ตัวเดียวกัน

## รันท้องถิ่น

```bash
npm install
npm run dev
```

เปิด http://localhost:5173/

ตอนนี้ถ้ายังไม่มี `.env` จะใช้ **mock data** (Demo Feed)

## เชื่อม Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard
2. เปิด **SQL Editor** รันตามลำดับ:
   - `supabase/migrations/202603100001_init.sql`
   - `supabase/seed.sql`
3. คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วใส่:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   (จาก Project Settings → API)
4. รีสตาร์ท `npm run dev` — แถบสถานะจะขึ้น **Official Feed**

## Deploy (Vercel)

เชื่อม GitHub repo `bacho-league` แล้วใส่ Environment Variables ชุดเดียวกับ `.env`

## สแตก

- React + Vite + TypeScript
- Supabase (DB + Realtime)
- Vercel (hosting)
- Admin แยกโปรเจกต์ (ยังไม่รวมในแอปนี้)

## ฤดูกาล

**สายใยสัมพันธ์ 2569**

Product by Alif Doloh
