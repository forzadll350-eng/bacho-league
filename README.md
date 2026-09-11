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

รายละเอียด: ดู `admin/README.md` (สร้าง user ใน Auth + รัน migration `202603100002_admin_write.sql`)

## เชื่อม Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard
2. เปิด **SQL Editor** รันตามลำดับ:
   - `supabase/migrations/202603100001_init.sql`
   - `supabase/seed.sql`
   - `supabase/migrations/202603100002_admin_write.sql` (สิทธิ์ UPDATE สำหรับแอดมินที่ล็อกอิน)
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
- Admin แยกที่ `/admin` (port 5174)

## ฤดูกาล

**สายใยสัมพันธ์ 2569**

Product by Alif Doloh
