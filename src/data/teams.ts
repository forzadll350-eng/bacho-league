import type { Team } from '../types/sports'

/** 8 อปท. อำเภอบาเจาะ · จ.นราธิวาส */
export const TEAMS: Record<string, Team> = {
  lubosawo: {
    id: 'lubosawo',
    nameTh: 'อบต.ลุโบะสาวอ',
    nameEn: 'SAO Lubosawo',
    shortName: 'LS',
    crestUrl: '/crests/lubosawo.png',
    orgTh: 'อบต.ลุโบะสาวอ',
  },
  palukasamoh: {
    id: 'palukasamoh',
    nameTh: 'อบต.ปะลุกาสาเมาะ',
    nameEn: 'SAO Palukasamoh',
    shortName: 'PK',
    crestUrl: '/crests/palukasamoh.png',
    orgTh: 'อบต.ปะลุกาสาเมาะ',
  },
  tonsai: {
    id: 'tonsai',
    nameTh: 'เทศบาลตำบลต้นไทร',
    nameEn: 'Tonsai Municipality',
    shortName: 'TS',
    crestUrl: '/crests/tonsai.png',
    orgTh: 'เทศบาลตำบลต้นไทร',
  },
  barehtai: {
    id: 'barehtai',
    nameTh: 'อบต.บาเระใต้',
    nameEn: 'SAO Bare Tai',
    shortName: 'BT',
    crestUrl: '/crests/barehtai.png',
    orgTh: 'อบต.บาเระใต้',
  },
  bareNuea: {
    id: 'bare-nuea',
    nameTh: 'อบต.บาเราะเหนือ',
    nameEn: 'SAO Bare Nuea',
    shortName: 'BN',
    crestUrl: '/crests/bare-nuea.png',
    orgTh: 'อบต.บาเราะเหนือ',
  },
  bachoSao: {
    id: 'bacho-sao',
    nameTh: 'อบต.บาเจาะ',
    nameEn: 'SAO Bacho',
    shortName: 'BS',
    crestUrl: '/crests/bacho-sao.png',
    orgTh: 'อบต.บาเจาะ',
  },
  kayohMati: {
    id: 'kayoh-mati',
    nameTh: 'อบต.กาเยาะมาตี',
    nameEn: 'SAO Kayoh Mati',
    shortName: 'KM',
    crestUrl: '/crests/kayoh-mati.png',
    orgTh: 'อบต.กาเยาะมาตี',
  },
  bachoMunicipal: {
    id: 'bacho-municipal',
    nameTh: 'เทศบาลตำบลบาเจาะ',
    nameEn: 'Bacho Municipality',
    shortName: 'BM',
    crestUrl: '/crests/bacho-municipal.png',
    orgTh: 'เทศบาลตำบลบาเจาะ',
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
  crestUrl: '/crests/league.png',
  seasonName: 'สายใยสัมพันธ์ 2569',
  yearBe: 2569,
} as const
