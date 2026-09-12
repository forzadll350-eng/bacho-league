-- ติ๊กในแอดมิน: ซ่อนช่วงเวลาตาราง โชว์ "กำลังแข่ง" บนแอปสาธารณะ
alter table public.matches
  add column if not exists hide_schedule_time boolean not null default false;
