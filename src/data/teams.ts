import type { Team } from '../types/sports'

/** 8 อปท. อำเภอบาเจาะ · จ.นราธิวาส */
export const TEAMS: Record<string, Team> = {
  lubosawo: {
    id: 'lubosawo',
    nameTh: 'อบต.ลุโบะสาวอ',
    nameEn: 'SAO Lubosawo',
    shortName: 'LS',
    crestUrl: '/crests/lubosawo.webp',
    orgTh: 'อบต.ลุโบะสาวอ',
  },
  palukasamoh: {
    id: 'palukasamoh',
    nameTh: 'อบต.ปะลุกาสาเมาะ',
    nameEn: 'SAO Palukasamoh',
    shortName: 'PK',
    crestUrl: '/crests/palukasamoh.webp',
    orgTh: 'อบต.ปะลุกาสาเมาะ',
  },
  tonsai: {
    id: 'tonsai',
    nameTh: 'เทศบาลตำบลต้นไทร',
    nameEn: 'Tonsai Municipality',
    shortName: 'TS',
    crestUrl: '/crests/tonsai.webp',
    orgTh: 'เทศบาลตำบลต้นไทร',
  },
  barehtai: {
    id: 'barehtai',
    nameTh: 'อบต.บาเระใต้',
    nameEn: 'SAO Bare Tai',
    shortName: 'BT',
    crestUrl: '/crests/barehtai.webp',
    orgTh: 'อบต.บาเระใต้',
  },
  bareNuea: {
    id: 'bare-nuea',
    nameTh: 'อบต.บาเระเหนือ',
    nameEn: 'SAO Bare Nuea',
    shortName: 'BN',
    crestUrl: '/crests/bare-nuea.webp',
    orgTh: 'อบต.บาเระเหนือ',
  },
  bachoSao: {
    id: 'bacho-sao',
    nameTh: 'อบต.บาเจาะ',
    nameEn: 'SAO Bacho',
    shortName: 'BS',
    crestUrl: '/crests/bacho-sao.webp',
    orgTh: 'อบต.บาเจาะ',
  },
  kayohMati: {
    id: 'kayoh-mati',
    nameTh: 'อบต.กาเยาะมาตี',
    nameEn: 'SAO Kayoh Mati',
    shortName: 'KM',
    crestUrl: '/crests/kayoh-mati.webp',
    orgTh: 'อบต.กาเยาะมาตี',
  },
  bachoMunicipal: {
    id: 'bacho-municipal',
    nameTh: 'เทศบาลตำบลบาเจาะ',
    nameEn: 'Bacho Municipality',
    shortName: 'BM',
    crestUrl: '/crests/bacho-municipal.webp',
    orgTh: 'เทศบาลตำบลบาเจาะ',
  },
}

/** Placeholder slots · ไม่ใส่ใน TEAM_LIST (ลงทะเบียน) */
export const SLOT_TEAMS: Record<string, Team> = {
  slotA1: {
    id: 'slot-a1',
    nameTh: 'ที่ 1 สาย A',
    nameEn: 'Group A #1',
    shortName: 'A1',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลสาย',
  },
  slotA2: {
    id: 'slot-a2',
    nameTh: 'ที่ 2 สาย A',
    nameEn: 'Group A #2',
    shortName: 'A2',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลสาย',
  },
  slotB1: {
    id: 'slot-b1',
    nameTh: 'ที่ 1 สาย B',
    nameEn: 'Group B #1',
    shortName: 'B1',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลสาย',
  },
  slotB2: {
    id: 'slot-b2',
    nameTh: 'ที่ 2 สาย B',
    nameEn: 'Group B #2',
    shortName: 'B2',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลสาย',
  },
  slotSf1: {
    id: 'slot-sf1',
    nameTh: 'ผู้ชนะรองฯ 1',
    nameEn: 'SF1 Winner',
    shortName: 'SF1',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลรองฯ',
  },
  slotSf2: {
    id: 'slot-sf2',
    nameTh: 'ผู้ชนะรองฯ 2',
    nameEn: 'SF2 Winner',
    shortName: 'SF2',
    crestUrl: '/crests/league.webp',
    orgTh: 'รอผลรองฯ',
  },
}

/** ลำดับตามที่กำหนด */
export const TEAM_LIST: Team[] = [
  TEAMS.lubosawo,
  TEAMS.palukasamoh,
  TEAMS.tonsai,
  TEAMS.barehtai,
  TEAMS.bareNuea,
  TEAMS.bachoSao,
  TEAMS.kayohMati,
  TEAMS.bachoMunicipal,
]

export const LEAGUE = {
  id: 'bacho-league',
  nameTh: 'ฟุตซอลลีก',
  taglineTh: 'สายใยสัมพันธ์ อบต.อำเภอบาเจาะ',
  crestUrl: '/crests/league.webp',
  seasonName: 'สายใยสัมพันธ์ 2569',
  yearBe: 2569,
} as const
