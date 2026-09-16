from __future__ import annotations

from pathlib import Path
from typing import Iterable

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "bacho-league-competition-schedule-2569.pdf"
LOGO = ROOT / "public" / "crests" / "league.png"
PAGE_W, PAGE_H = landscape(A4)

NAVY = HexColor("#101A2D")
INK = HexColor("#18212F")
MUTED = HexColor("#5D6778")
PAPER = HexColor("#F6F4EF")
WHITE = HexColor("#FFFFFF")
GOLD = HexColor("#F1B84B")
ORANGE = HexColor("#E87532")
GREEN = HexColor("#18845A")
GREEN_DARK = HexColor("#0B6242")
PURPLE = HexColor("#6F3AA6")
PURPLE_DARK = HexColor("#4B2476")
BLUE = HexColor("#2C5F93")
BLUE_SOFT = HexColor("#E7F0F8")
RED_SOFT = HexColor("#FCE8E3")
GREEN_SOFT = HexColor("#E5F5EC")
PURPLE_SOFT = HexColor("#F1E9FA")
LINE = HexColor("#D9D7D0")


def register_fonts() -> tuple[str, str]:
    candidates = [
        (Path("C:/Windows/Fonts/tahoma.ttf"), Path("C:/Windows/Fonts/tahomabd.ttf")),
        (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("PosterRegular", str(regular)))
            pdfmetrics.registerFont(TTFont("PosterBold", str(bold)))
            return "PosterRegular", "PosterBold"
    raise FileNotFoundError("A Thai-capable TrueType font was not found")


REGULAR, BOLD = register_fonts()


def rounded_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, radius=10):
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, radius, stroke=0, fill=1)


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    size: float,
    color=INK,
    font=REGULAR,
    align: str = "left",
):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, text)
    elif align == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def wrap_text(text: str, max_width: float, size: float, font=REGULAR) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if pdfmetrics.stringWidth(trial, font, size) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    size: float,
    leading: float,
    color=INK,
    font=REGULAR,
    align: str = "left",
    max_lines: int = 3,
):
    lines = wrap_text(text, max_width, size, font)[:max_lines]
    for i, line in enumerate(lines):
        anchor = x + max_width / 2 if align == "center" else x
        draw_text(c, line, anchor, y - i * leading, size, color, font, align)


def draw_brand_header(c: canvas.Canvas, section: str, subtitle: str, accent=GOLD):
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 94, PAGE_W, 94, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(0, PAGE_H - 98, PAGE_W, 4, fill=1, stroke=0)
    if LOGO.exists():
        c.drawImage(str(LOGO), 28, PAGE_H - 82, width=58, height=58, mask="auto", preserveAspectRatio=True)
    draw_text(c, "ฟุตซอลลีก สายใยสัมพันธ์ อปท.อำเภอบาเจาะ", 102, PAGE_H - 39, 21, WHITE, BOLD)
    draw_text(c, section, 102, PAGE_H - 66, 14, GOLD, BOLD)
    draw_text(c, subtitle, PAGE_W - 28, PAGE_H - 54, 9.5, HexColor("#D8DFEA"), REGULAR, "right")


def draw_footer(c: canvas.Canvas, page_no: int):
    draw_text(c, "สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส", 28, 18, 8.5, MUTED)
    draw_text(c, f"21 กันยายน 2569  •  หน้า {page_no}/3", PAGE_W - 28, 18, 8.5, MUTED, REGULAR, "right")


def team_cell(c: canvas.Canvas, text: str, x: float, y: float, w: float, h: float, fill=WHITE):
    rounded_rect(c, x, y, w, h, fill, 7)
    draw_wrapped(c, text, x + 8, y + h / 2 + 3, w - 16, 9.2, 11, INK, BOLD, "center", 2)


def draw_futsal_page(c: canvas.Canvas):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_brand_header(
        c,
        "ตารางการแข่งขันฟุตซอล",
        "ครึ่งละ 10 นาที  •  พักครึ่ง 5 นาที  •  เปลี่ยนทีม 5 นาที",
        ORANGE,
    )

    draw_text(c, "รอบแบ่งสาย  •  สองสนามพร้อมกัน", 28, PAGE_H - 126, 14, NAVY, BOLD)
    draw_text(c, "แข่งขันต่อเนื่อง ไม่มีพักเที่ยง", PAGE_W - 28, PAGE_H - 125, 10.5, ORANGE, BOLD, "right")

    x0, y_top = 28, PAGE_H - 145
    col_time, col_detail = 83, 252
    gap = 8
    col_team = (PAGE_W - 56 - col_time - col_detail - gap * 3) / 2
    headers = [
        (x0, col_time, "เวลา"),
        (x0 + col_time + gap, col_team, "สนามที่ 1  •  สาย A"),
        (x0 + col_time + gap + col_team + gap, col_team, "สนามที่ 2  •  สาย B"),
        (x0 + col_time + gap + (col_team + gap) * 2, col_detail, "รายละเอียดเวลาในแต่ละนัด"),
    ]
    for x, w, label in headers:
        rounded_rect(c, x, y_top - 27, w, 27, NAVY, 7)
        draw_text(c, label, x + w / 2, y_top - 18, 9, WHITE, BOLD, "center")

    group_rows = [
        ("10:00", "ต้นไทร พบ กาเยาะมาตี", "บาเระใต้ พบ บาเระเหนือ"),
        ("10:30", "ลุโบะสาวอ พบ เทศบาลบาเจาะ", "อบต.บาเจาะ พบ ปะลุกาสาเมาะ"),
        ("11:00", "ต้นไทร พบ ลุโบะสาวอ", "บาเระใต้ พบ อบต.บาเจาะ"),
        ("11:30", "กาเยาะมาตี พบ เทศบาลบาเจาะ", "บาเระเหนือ พบ ปะลุกาสาเมาะ"),
        ("12:00", "ต้นไทร พบ เทศบาลบาเจาะ", "บาเระใต้ พบ ปะลุกาสาเมาะ"),
        ("12:30", "กาเยาะมาตี พบ ลุโบะสาวอ", "บาเระเหนือ พบ อบต.บาเจาะ"),
    ]
    row_h = 36
    y = y_top - 33 - row_h
    for idx, (time, court1, court2) in enumerate(group_rows):
        shade = WHITE if idx % 2 == 0 else HexColor("#EEECE6")
        rounded_rect(c, x0, y, col_time, row_h - 3, shade, 6)
        draw_text(c, time, x0 + col_time / 2, y + 13, 12, NAVY, BOLD, "center")
        team_cell(c, court1, x0 + col_time + gap, y, col_team, row_h - 3, shade)
        team_cell(c, court2, x0 + col_time + gap + col_team + gap, y, col_team, row_h - 3, shade)
        start_h, start_m = map(int, time.split(":"))
        total = start_h * 60 + start_m
        def hhmm(minutes: int) -> str:
            return f"{minutes // 60:02d}:{minutes % 60:02d}"
        detail = (
            f"{hhmm(total)}–{hhmm(total+10)} ครึ่งแรก  •  "
            f"{hhmm(total+10)}–{hhmm(total+15)} พักครึ่ง\n"
            f"{hhmm(total+15)}–{hhmm(total+25)} ครึ่งหลัง  •  "
            f"{hhmm(total+25)}–{hhmm(total+30)} เปลี่ยนทีม"
        )
        dx = x0 + col_time + gap + (col_team + gap) * 2
        rounded_rect(c, dx, y, col_detail, row_h - 3, shade, 6)
        for line_no, line in enumerate(detail.split("\n")):
            draw_text(c, line, dx + 8, y + 19 - line_no * 12, 7.7, MUTED, REGULAR)
        y -= row_h

    rounded_rect(c, 28, y - 1, PAGE_W - 56, 27, BLUE_SOFT, 7)
    draw_text(c, "13:00–13:30  ตรวจผลและเตรียมรอบน็อคเอาต์  •  ไม่ใช่เวลาพักเที่ยง", PAGE_W / 2, y + 8, 10, BLUE, BOLD, "center")
    y -= 36

    draw_text(c, "รอบน็อคเอาต์  •  สนามที่ 1", 28, y + 16, 12, NAVY, BOLD)
    knockout = [
        ("13:30", "รองชนะเลิศ 1", "ที่ 1 สาย A พบ ที่ 2 สาย B"),
        ("14:00", "รองชนะเลิศ 2", "ที่ 1 สาย B พบ ที่ 2 สาย A"),
        ("14:30", "ชิงอันดับ 3", "ผู้แพ้รอบรองชนะเลิศ พบกัน"),
        ("15:00", "ชิงชนะเลิศ", "ผู้ชนะรอบรองชนะเลิศ พบกัน"),
    ]
    card_w = (PAGE_W - 56 - 18) / 4
    for i, (time, title, matchup) in enumerate(knockout):
        x = 28 + i * (card_w + 6)
        fill = ORANGE if i < 2 else GOLD if i == 2 else GREEN
        rounded_rect(c, x, y - 52, card_w, 58, fill, 9)
        draw_text(c, time, x + 12, y - 12, 12, WHITE if i != 2 else NAVY, BOLD)
        draw_text(c, title, x + card_w - 10, y - 11, 9, WHITE if i != 2 else NAVY, BOLD, "right")
        draw_wrapped(c, matchup, x + 10, y - 29, card_w - 20, 8.2, 10, WHITE if i != 2 else NAVY, BOLD, "center", 2)

    draw_text(c, "หมายเหตุ: เวลาจบการแข่งขันของแต่ละนัดคือ 25 นาที และกันเวลา 5 นาทีสำหรับเปลี่ยนทีม", 28, 35, 8.3, MUTED)
    draw_footer(c, 1)
    c.showPage()


def draw_volleyball_page(c: canvas.Canvas):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_brand_header(
        c,
        "ตารางการแข่งขันวอลเลย์บอลหญิง",
        "แข่ง 2 ใน 3 เซต  •  เซตละ 15 คะแนน  •  ชนะ 2 เซตรวดจบ",
        PURPLE,
    )
    draw_text(c, "รอบแบ่งสาย  •  คู่ละประมาณ 40 นาที", 28, PAGE_H - 126, 14, NAVY, BOLD)
    draw_text(c, "แข่งขันต่อเนื่อง ไม่มีพักเที่ยง", PAGE_W - 28, PAGE_H - 125, 10.5, PURPLE, BOLD, "right")

    group_a = "A1 อบต.บาเจาะ  •  A2 บาเระเหนือ  •  A3 ต้นไทร  •  A4 เทศบาลบาเจาะ"
    group_b = "B1 กาเยาะมาตี  •  B2 ปะลุกาสาเมาะ  •  B3 บาเระใต้  •  B4 ลุโบะสาวอ"
    rounded_rect(c, 28, PAGE_H - 174, (PAGE_W - 64) / 2, 34, GREEN_SOFT, 8)
    draw_text(c, group_a, 40, PAGE_H - 161, 8.4, GREEN_DARK, BOLD)
    rounded_rect(c, 36 + (PAGE_W - 64) / 2, PAGE_H - 174, (PAGE_W - 64) / 2, 34, PURPLE_SOFT, 8)
    draw_text(c, group_b, 48 + (PAGE_W - 64) / 2, PAGE_H - 161, 8.4, PURPLE_DARK, BOLD)

    rows = [
        ("10:00–10:40", "รอบ 1", "อบต.บาเจาะ พบ บาเระเหนือ", "กาเยาะมาตี พบ ปะลุกาสาเมาะ", False),
        ("10:40–11:20", "รอบ 1", "ต้นไทร พบ เทศบาลบาเจาะ", "บาเระใต้ พบ ลุโบะสาวอ", True),
        ("11:20–12:00", "รอบ 2", "อบต.บาเจาะ พบ ต้นไทร", "กาเยาะมาตี พบ บาเระใต้", True),
        ("12:00–12:40", "รอบ 2", "บาเระเหนือ พบ เทศบาลบาเจาะ", "ปะลุกาสาเมาะ พบ ลุโบะสาวอ", False),
        ("12:40–13:20", "รอบ 3", "อบต.บาเจาะ พบ เทศบาลบาเจาะ", "กาเยาะมาตี พบ ลุโบะสาวอ", False),
        ("13:20–14:00", "รอบ 3", "บาเระเหนือ พบ ต้นไทร", "ปะลุกาสาเมาะ พบ บาเระใต้", True),
    ]

    x0, y_top = 28, PAGE_H - 188
    widths = [105, 66, 274, 274, 70]
    labels = ["เวลา", "รอบ", "สนามที่ 1  •  สาย A", "สนามที่ 2  •  สาย B", "หมายเหตุ"]
    x = x0
    for w, label in zip(widths, labels):
        rounded_rect(c, x, y_top - 28, w - 4, 28, NAVY, 6)
        draw_text(c, label, x + (w - 4) / 2, y_top - 18, 9, WHITE, BOLD, "center")
        x += w

    y = y_top - 66
    for idx, (time, round_label, court1, court2, forfeiture) in enumerate(rows):
        h = 38
        shade = WHITE if idx % 2 == 0 else HexColor("#EEECE6")
        values = [time, round_label, court1, court2, "รอใส่ผล" if forfeiture else "แข่งขัน"]
        x = x0
        for col, (w, value) in enumerate(zip(widths, values)):
            fill = RED_SOFT if forfeiture and col in (3, 4) else shade
            rounded_rect(c, x, y, w - 4, h - 3, fill, 6)
            color = ORANGE if forfeiture and col in (3, 4) else INK
            font = BOLD if col != 1 else REGULAR
            draw_wrapped(c, value, x + 6, y + 20, w - 16, 8.8, 11, color, font, "center", 2)
            x += w
        y -= h

    rounded_rect(c, 28, y - 10, PAGE_W - 56, 51, PURPLE, 10)
    draw_text(c, "14:30–15:10  นัดชิงชนะเลิศ", 45, y + 20, 14, WHITE, BOLD)
    draw_text(c, "ที่ 1 สาย A  พบ  ที่ 1 สาย B", PAGE_W - 45, y + 20, 12, WHITE, BOLD, "right")
    draw_text(c, "วอลเลย์บอลไม่มีรอบรองชนะเลิศ", PAGE_W - 45, y + 4, 8.7, HexColor("#E8DAF8"), REGULAR, "right")

    rounded_rect(c, 28, 47, PAGE_W - 56, 49, RED_SOFT, 9)
    draw_text(c, "กรณีคู่ที่มีบาเระใต้", 42, 78, 10.5, ORANGE, BOLD)
    draw_text(c, "ยังไม่ให้แต้มล่วงหน้า • เมื่อถึงเวลาแข่ง แอดมินค่อยบันทึกคู่แข่งชนะ 2–0 เซต (15–0, 15–0) และจบการแข่งขัน", 42, 59, 9, INK, REGULAR)
    draw_footer(c, 2)
    c.showPage()


def draw_agenda_page(c: canvas.Canvas):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_brand_header(c, "กำหนดการวันแข่งขัน", "วันจันทร์ที่ 21 กันยายน 2569", GREEN)

    draw_text(c, "กำหนดการรวม", 28, PAGE_H - 130, 17, NAVY, BOLD)
    rounded_rect(c, PAGE_W - 292, PAGE_H - 143, 264, 29, GREEN_SOFT, 8)
    draw_text(c, "การแข่งขันดำเนินต่อเนื่อง ไม่มีพักเที่ยง", PAGE_W - 160, PAGE_H - 133, 10.5, GREEN_DARK, BOLD, "center")

    agenda = [
        ("08:30–09:00", "ลงทะเบียน", "นักกีฬา เจ้าหน้าที่ และผู้เข้าร่วมงาน"),
        ("09:00–09:15", "จัดแถวและเตรียมพิธี", "ทุกหน่วยงานพร้อมบริเวณพิธีเปิด"),
        ("09:15–09:30", "พิธีเปิด", "ประธานกล่าวเปิดการแข่งขัน"),
        ("09:30–10:00", "ฟุตซอลคู่ VIP", "กิจกรรมก่อนเริ่มการแข่งขันตามตาราง"),
        ("10:00–13:00", "รอบแบ่งสาย", "ฟุตซอลสองสนามและวอลเลย์บอลสองสนาม แข่งต่อเนื่อง"),
        ("13:00–13:30", "ตรวจผลฟุตซอล", "สรุปอันดับและเตรียมรอบน็อคเอาต์ โดยวอลเลย์บอลยังแข่งขันต่อ"),
        ("13:30–15:25", "รอบน็อคเอาต์ฟุตซอล", "รองชนะเลิศ ชิงอันดับ 3 และชิงชนะเลิศ ตามลำดับ"),
        ("14:30–15:10", "ชิงชนะเลิศวอลเลย์บอล", "ที่ 1 สาย A พบ ที่ 1 สาย B"),
        ("15:30–16:00", "มอบรางวัลและพิธีปิด", "มอบรางวัล สรุปผล และปิดการแข่งขัน"),
    ]

    x0, y = 28, PAGE_H - 180
    time_w = 126
    row_h = 39
    for i, (time, title, detail) in enumerate(agenda):
        fill = WHITE if i % 2 == 0 else HexColor("#EEECE6")
        rounded_rect(c, x0, y, time_w, row_h - 4, NAVY if i not in (4, 6, 7, 8) else GREEN, 7)
        draw_text(c, time, x0 + time_w / 2, y + 12, 10, WHITE, BOLD, "center")
        rounded_rect(c, x0 + time_w + 7, y, 190, row_h - 4, fill, 7)
        draw_text(c, title, x0 + time_w + 18, y + 12, 10, NAVY, BOLD)
        rounded_rect(c, x0 + time_w + 204, y, PAGE_W - 56 - time_w - 204, row_h - 4, fill, 7)
        draw_wrapped(c, detail, x0 + time_w + 216, y + 17, PAGE_W - 56 - time_w - 228, 8.6, 10.5, MUTED, REGULAR, "left", 2)
        y -= row_h

    rounded_rect(c, 28, 43, PAGE_W - 56, 48, NAVY, 10)
    draw_text(c, "ข้อปฏิบัติสำคัญ", 45, 72, 10.5, GOLD, BOLD)
    draw_text(c, "ฟุตซอลทุกนัด: ครึ่งแรก 10 นาที • พักครึ่ง 5 นาที • ครึ่งหลัง 10 นาที • เปลี่ยนทีม 5 นาที", 45, 55, 8.8, WHITE, REGULAR)
    draw_text(c, "วอลเลย์บอล: ประมาณ 40 นาทีต่อคู่ • ไม่มีรอบรอง • รอบชิงเริ่ม 14:30 น.", PAGE_W - 45, 55, 8.8, WHITE, REGULAR, "right")
    draw_footer(c, 3)
    c.showPage()


def build_pdf(output: Path = OUTPUT):
    output.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("ตารางการแข่งขันฟุตซอลและวอลเลย์บอล สายใยสัมพันธ์ 2569")
    c.setAuthor("ฟุตซอลลีก สายใยสัมพันธ์ อปท.อำเภอบาเจาะ")
    c.setSubject("ตารางการแข่งขันและกำหนดการ 21 กันยายน 2569")
    draw_futsal_page(c)
    draw_volleyball_page(c)
    draw_agenda_page(c)
    c.save()


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
