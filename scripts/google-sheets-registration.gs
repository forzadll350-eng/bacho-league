/**
 * Bacho League → Google Sheet (อัปเดตล่าสุด)
 * ไฟล์: นักกีฬา และผู้ลงทะเบียนเข้าร่วม
 * ID: 1pNtuMt1CTx7e6BS5685LoR26xdGiStewxN2ZWq2FXp0
 *
 * สำคัญ: หลังแก้โค้ดต้อง Deploy → Manage deployments → ดินสอ → New version → Deploy
 * แล้ว Run ฟังก์ชัน fixByOrgFormulas() หรือ refreshByOrgLists() ครั้งหนึ่ง
 *
 * ผู้เข้าร่วม — ตำแหน่งอาจเป็นค่าดรอปดาวน์ หรือข้อความอิสระเมื่อเลือก "อื่นๆ"
 * อปท. มาจาก teamName (รายการเดียวกับนักกีฬา)
 */

var SPREADSHEET_ID = '1pNtuMt1CTx7e6BS5685LoR26xdGiStewxN2ZWq2FXp0'

var SHEET = {
  football: 'ลงทะเบียนฟุตซอล',
  volleyball: 'ลงทะเบียนวอลเลย์บอล',
  attendee: 'ลงทะเบียนผู้เข้าร่วม',
  byOrg: 'รายชื่อรวมแยก อปท.',
}

var VOLLEYBALL_ORGS = [
  'อบต.ลุโบะสาวอ',
  'อบต.ปะลุกาสาเมาะ',
  'เทศบาลตำบลต้นไทร',
  'อบต.บาเระเหนือ',
  'อบต.บาเจาะ',
  'อบต.กาเยาะมาตี',
  'เทศบาลตำบลบาเจาะ',
]

var DATA_START = 5
var LIST_START = 8
var LIST_ROWS = 80

/** แก้สะกดบาเราะ→บาเระ และตัดช่องว่าง เพื่อเทียบ อปท. */
function normalizeOrg_(s) {
  return String(s || '')
    .trim()
    .replace(/บาเราะ/g, 'บาเระ')
    .replace(/\s+/g, '')
}

function orgEquals_(a, b) {
  if (!b) return true
  return normalizeOrg_(a) === normalizeOrg_(b)
}

/** เขียนสะกดมาตรฐานลงชีต */
function canonicalOrgName_(s) {
  return String(s || '')
    .trim()
    .replace(/บาเราะเหนือ/g, 'บาเระเหนือ')
    .replace(/บาเราะใต้/g, 'บาเระใต้')
}

function getSs_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID)
}

function nextSeq_(sheet) {
  var last = sheet.getLastRow()
  if (last < DATA_START) return 1
  var vals = sheet.getRange(DATA_START, 1, last - DATA_START + 1, 1).getValues()
  var max = 0
  for (var i = 0; i < vals.length; i++) {
    var n = Number(vals[i][0])
    if (!isNaN(n) && n > max) max = n
  }
  return max + 1
}

function firstEmptyRow_(sheet, checkCol) {
  var last = Math.max(sheet.getLastRow(), DATA_START - 1)
  var col = checkCol || 3
  for (var r = DATA_START; r <= last + 1; r++) {
    if (!String(sheet.getRange(r, col).getValue() || '').trim()) return r
  }
  return last + 1
}

function findRowByNamePhone_(sheet, fullName, phone) {
  var last = sheet.getLastRow()
  if (last < DATA_START) return 0
  var names = sheet.getRange(DATA_START, 3, last - DATA_START + 1, 1).getValues()
  var phones = sheet.getRange(DATA_START, 4, last - DATA_START + 1, 1).getValues()
  var wantPhone = String(phone || '').replace(/\D/g, '')
  for (var i = 0; i < names.length; i++) {
    var n = String(names[i][0] || '').trim()
    var p = String(phones[i][0] || '').replace(/\D/g, '')
    if (n === String(fullName || '').trim() && (!wantPhone || p === wantPhone)) {
      return DATA_START + i
    }
  }
  return 0
}

function findAthleteRow_(sheet, fullName, teamName) {
  var last = sheet.getLastRow()
  if (last < DATA_START) return 0
  var rows = sheet.getRange(DATA_START, 2, last - DATA_START + 1, 2).getValues()
  var wantedName = String(fullName || '').trim()
  var wantedOrg = canonicalOrgName_(teamName || '')
  for (var i = 0; i < rows.length; i++) {
    var rowOrg = canonicalOrgName_(rows[i][0] || '')
    var rowName = String(rows[i][1] || '').trim()
    if (rowName === wantedName && orgEquals_(rowOrg, wantedOrg)) return DATA_START + i
  }
  return 0
}

/**
 * นักกีฬา: Aลำดับ Bอปท. Cชื่อ Dตำแหน่ง Eอายุ Fเบอร์เสื้อ Gรูป
 * H = สูตร — ห้ามทับ
 */
function appendAthlete_(d) {
  var sport = d.sport === 'volleyball' ? 'volleyball' : 'football'
  var sheet = getSs_().getSheetByName(SHEET[sport])
  if (!sheet) throw new Error('ไม่พบชีต ' + SHEET[sport])

  // ไม่บล็อกวอลเลย์ที่นี่ — แอปคัดบาเระใต้ออกแล้ว
  // (เคยใช้ regex แล้วไปชนชื่อไทยผิดใน Apps Script)

  var org = canonicalOrgName_(d.teamName || '')
  var existing = findAthleteRow_(sheet, d.fullName || '', org)
  var row = existing || firstEmptyRow_(sheet, 3)
  var seq = existing ? sheet.getRange(row, 1).getValue() || nextSeq_(sheet) : nextSeq_(sheet)
  sheet.getRange(row, 1, 1, 7).setValues([
    [
      seq,
      org,
      d.fullName || '',
      d.positionLabel || d.position || '',
      d.age || '',
      d.jerseyNumber || '',
      d.photoUrl || '',
    ],
  ])
  refreshByOrgLists(org)
  return { sheet: SHEET[sport], row: row, action: existing ? 'update' : 'insert' }
}

/**
 * ผู้เข้าร่วม: Aลำดับ Bอปท. Cชื่อ Dเบอร์โทร Eตำแหน่ง Fตำบล Gหมายเหตุ
 */
function appendAttendee_(d) {
  var sheet = getSs_().getSheetByName(SHEET.attendee)
  if (!sheet) throw new Error('ไม่พบชีต ' + SHEET.attendee)

  var fullName = d.fullName || ''
  var phone = d.phone || ''
  var positionLabel = String(d.positionLabel || d.position || '').trim()
  var note = d.note || ''
  var org = canonicalOrgName_(d.teamName || d.orgName || '')
  var subdistrict = String(d.subdistrict || '').trim() || org

  if (!org && /^(อบต\.|เทศบาล)/.test(subdistrict)) {
    org = canonicalOrgName_(subdistrict)
  } else if (subdistrict) {
    subdistrict = canonicalOrgName_(subdistrict)
  }

  var existing = findRowByNamePhone_(sheet, fullName, phone)
  var row = existing || firstEmptyRow_(sheet, 3)
  var seq = existing ? sheet.getRange(row, 1).getValue() || nextSeq_(sheet) : nextSeq_(sheet)

  sheet.getRange(row, 1, 1, 7).setValues([
    [seq, org, fullName, phone, positionLabel, subdistrict, note],
  ])
  refreshByOrgLists(org)
  return {
    sheet: SHEET.attendee,
    row: row,
    action: existing ? 'update' : 'insert',
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('ไม่มี postData')
  }
  return JSON.parse(e.postData.contents)
}

/**
 * ล้างแถวข้อมูลลงทะเบียนใน 3 ชีต (เก็บหัวตารางแถว 1–4)
 */
function clearRegistrationSheets() {
  var ss = getSs_()
  var names = [SHEET.football, SHEET.volleyball, SHEET.attendee]
  var cleared = []
  for (var i = 0; i < names.length; i++) {
    var sheet = ss.getSheetByName(names[i])
    if (!sheet) continue
    var last = sheet.getLastRow()
    if (last >= DATA_START) {
      sheet.getRange(DATA_START, 1, last - DATA_START + 1, sheet.getLastColumn()).clearContent()
    }
    cleared.push(names[i])
  }
  refreshByOrgLists()
  return { cleared: cleared }
}

/**
 * อ่านรายชื่อจากชีตลงทะเบียน แล้วเขียนลงชีตรวมตาม อปท. ที่เลือกใน B4
 * ใช้ค่าจริง (ไม่พึ่ง FILTER) — แก้เคสนับได้แต่รายชื่อไม่ขึ้น
 */
function refreshByOrgLists(orgOverride) {
  var ss = getSs_()
  var sh = ss.getSheetByName(SHEET.byOrg)
  if (!sh) throw new Error('ไม่พบชีต ' + SHEET.byOrg)

  // เว็บฮุกส่ง org มาโดยตรง เพื่อไม่ให้การบันทึกหลักล้มเพราะ B4/กฎเก่าในชีตสรุป
  var org = String(orgOverride || sh.getRange('B4').getDisplayValue() || '').trim()
  var attendees = filterAttendees_(ss, org)
  var football = filterAthletes_(ss, SHEET.football, org)
  var volleyball = filterAthletes_(ss, SHEET.volleyball, org)

  // เขียนหัวข้อเป็นค่าจริงแทนสูตรเดิมที่อาจค้าง #N/A หลังแก้สะกดชื่อ อปท.
  sh.getRange('A6').setValue('👤 ผู้เข้าร่วม — ' + org + '  (รวม ' + attendees.length + ' คน)')
  sh.getRange('G6').setValue('⚽ นักกีฬาฟุตซอล — ' + org + '  (รวม ' + football.length + ' / 20 คน)')
  sh.getRange('L6').setValue('🏐 นักกีฬาวอลเลย์บอล — ' + org + '  (รวม ' + volleyball.length + ' คน)')

  // ผู้เข้าร่วม A–E
  writeOrgBlock_(
    sh,
    1,
    5,
    attendees,
    '— ยังไม่มีผู้เข้าร่วม —',
  )

  // ฟุตซอล G–J
  writeOrgBlock_(
    sh,
    7,
    4,
    football,
    '— ยังไม่มีนักกีฬาฟุตซอล —',
  )

  // วอลเลย์ L–O
  writeOrgBlock_(
    sh,
    12,
    4,
    volleyball,
    '— ยังไม่มีนักกีฬาวอลเลย์บอล —',
  )

  return { org: org }
}

function filterAttendees_(ss, org) {
  var sheet = ss.getSheetByName(SHEET.attendee)
  if (!sheet) return []
  var last = sheet.getLastRow()
  if (last < DATA_START) return []
  var vals = sheet.getRange(DATA_START, 1, last - DATA_START + 1, 7).getValues()
  var out = []
  for (var i = 0; i < vals.length; i++) {
    var rowOrg = String(vals[i][1] || '').trim()
    var name = String(vals[i][2] || '').trim()
    if (!name) continue
    if (org && !orgEquals_(rowOrg, org)) continue
    out.push([
      String(vals[i][4] || '').trim(), // ตำแหน่ง
      name,
      String(vals[i][3] || '').trim(), // เบอร์
      String(vals[i][5] || '').trim(), // ตำบล
      String(vals[i][6] || '').trim(), // หมายเหตุ
    ])
  }
  return out
}

function filterAthletes_(ss, sheetName, org) {
  var sheet = ss.getSheetByName(sheetName)
  if (!sheet) return []
  var last = sheet.getLastRow()
  if (last < DATA_START) return []
  var vals = sheet.getRange(DATA_START, 1, last - DATA_START + 1, 6).getValues()
  var out = []
  for (var i = 0; i < vals.length; i++) {
    var rowOrg = String(vals[i][1] || '').trim()
    var name = String(vals[i][2] || '').trim()
    if (!name) continue
    if (org && !orgEquals_(rowOrg, org)) continue
    out.push([
      String(vals[i][3] || '').trim(), // ตำแหน่ง
      name,
      vals[i][4] === '' || vals[i][4] == null ? '' : vals[i][4], // อายุ
      String(vals[i][5] || '').trim(), // เบอร์เสื้อ
    ])
  }
  return out
}

function writeOrgBlock_(sh, startCol, numCols, rows, emptyMsg) {
  // getRange(row, column, numRows, numColumns) รับ "จำนวน" ไม่ใช่เลขแถว/คอลัมน์สุดท้าย
  var block = sh.getRange(LIST_START, startCol, LIST_ROWS, numCols)
  try {
    block.breakApart()
  } catch (e) {}
  block.clearContent()
  if (!rows || !rows.length) {
    sh.getRange(LIST_START, startCol).setValue(emptyMsg)
    return
  }
  sh.getRange(LIST_START, startCol, rows.length, numCols).setValues(rows)
}

/** เมื่อเปลี่ยน อปท. ใน B4 ให้รีเฟรชรายชื่อ */
function onEdit(e) {
  try {
    if (!e || !e.range) return
    var sh = e.range.getSheet()
    if (sh.getName() !== SHEET.byOrg) return
    if (e.range.getA1Notation() !== 'B4') return
    refreshByOrgLists()
  } catch (err) {
    // ไม่ throw จาก onEdit
  }
}

/**
 * Run จาก Apps Script editor ครั้งเดียวหลังวางโค้ดนี้
 * (ชื่อเดิม fixByOrgFormulas — ล้างสูตรพัง + เขียนรายชื่อจากข้อมูลจริง)
 */
function fixByOrgFormulas() {
  fixBareNueaSpelling()
  fixVolleyballTeamValidation()
  return refreshByOrgLists()
}

/** ล้างกฎเดิมที่ปฏิเสธทุกทีม แล้วสร้าง dropdown วอลเลย์ใหม่โดยตัดเฉพาะบาเระใต้ */
function fixVolleyballTeamValidation() {
  var sheet = getSs_().getSheetByName(SHEET.volleyball)
  if (!sheet) throw new Error('ไม่พบชีต ' + SHEET.volleyball)
  var numRows = sheet.getMaxRows() - DATA_START + 1
  var range = sheet.getRange(DATA_START, 2, numRows, 1)
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(VOLLEYBALL_ORGS, true)
    .setAllowInvalid(false)
    .setHelpText('กรุณาเลือก อปท. จากรายการ (ไม่รวม อบต.บาเระใต้)')
    .build()
  range.clearDataValidations()
  range.setDataValidation(rule)
  return { range: range.getA1Notation(), orgs: VOLLEYBALL_ORGS.length }
}

/**
 * แก้สะกด บาเราะเหนือ → บาเระเหนือ ในทุกชีตลงทะเบียน + ช่องเลือก อปท.
 */
function fixBareNueaSpelling() {
  var ss = getSs_()
  var names = [SHEET.football, SHEET.volleyball, SHEET.attendee, SHEET.byOrg]
  var changed = 0
  for (var i = 0; i < names.length; i++) {
    var sheet = ss.getSheetByName(names[i])
    if (!sheet) continue
    var range = sheet.getDataRange()
    var vals = range.getValues()
    var dirty = false
    for (var r = 0; r < vals.length; r++) {
      for (var c = 0; c < vals[r].length; c++) {
        if (typeof vals[r][c] !== 'string') continue
        var next = canonicalOrgName_(vals[r][c])
        if (next !== vals[r][c]) {
          vals[r][c] = next
          dirty = true
          changed++
        }
      }
    }
    if (dirty) range.setValues(vals)

    // ดรอปดาวน์ B4 ในชีตรวม
    if (names[i] === SHEET.byOrg) {
      try {
        var rules = sheet.getRange('B4').getDataValidations()
        // getDataValidations returns 2D; use getDataValidation
        var rule = sheet.getRange('B4').getDataValidation()
        if (rule) {
          var criteria = rule.getCriteriaType()
          var args = rule.getCriteriaValues()
          if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST && args && args[0]) {
            var list = args[0].map(function (x) {
              return canonicalOrgName_(x)
            })
            var builder = SpreadsheetApp.newDataValidation()
              .requireValueInList(list, true)
              .setAllowInvalid(false)
            sheet.getRange('B4').setDataValidation(builder.build())
            sheet.getRange('B4').setValue(canonicalOrgName_(sheet.getRange('B4').getValue()))
          }
        }
      } catch (e) {}
    }
  }
  return { changed: changed }
}

function doPost(e) {
  try {
    var d = parseBody_(e)
    if (d.kind === 'clear_registrations') {
      var cleared = clearRegistrationSheets()
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, action: 'clear', sheets: cleared.cleared }),
      ).setMimeType(ContentService.MimeType.JSON)
    }
    if (d.kind === 'fix_bare_nuea' || d.kind === 'fix_spelling') {
      var fixed = fixBareNueaSpelling()
      var refreshed = refreshByOrgLists()
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          action: 'fix_bare_nuea',
          changed: fixed.changed,
          org: refreshed.org,
        }),
      ).setMimeType(ContentService.MimeType.JSON)
    }
    if (d.kind === 'refresh_by_org' || d.kind === 'fix_by_org_formulas') {
      var refreshed2 = refreshByOrgLists()
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, action: 'refresh_by_org', org: refreshed2.org }),
      ).setMimeType(ContentService.MimeType.JSON)
    }
    if (d.kind === 'sync_athlete') {
      // เติมแถวที่ลงในแอปแล้วแต่ชีตว่าง
      var sync = appendAthlete_(d)
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, sheet: sync.sheet, row: sync.row, action: 'sync' }),
      ).setMimeType(ContentService.MimeType.JSON)
    }
    var result = d.kind === 'attendee' ? appendAttendee_(d) : appendAthlete_(d)

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, sheet: result.sheet, row: result.row, action: result.action }),
    ).setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

function doGet() {
  return ContentService.createTextOutput(
    'Bacho League → Sheet OK · ' + SPREADSHEET_ID + ' · build=v7-noblock',
  )
}

/** ทดสอบเขียนวอลเลย์บาเระเหนือ (Run จาก editor) */
function testAppendBareNueaVolleyball() {
  fixVolleyballTeamValidation()
  return appendAthlete_({
    kind: 'athlete',
    sport: 'volleyball',
    teamId: 'bare-nuea',
    teamName: 'อบต.บาเระเหนือ',
    fullName: 'Test tes2',
    position: 'mission',
    positionLabel: 'ภารกิจ',
    age: 26,
    jerseyNumber: '',
    photoUrl: '',
  })
}
