
import { DashboardData } from './types';

export const WORKING_DAYS_YEAR = 313;

export const SITES_DATA = [
  // PRES ABIDJAN
  { code: "1", name: "CRTS DE TREICHVILLE", region: "PRES ABIDJAN", annualObjective: 35000, manager: "Dr. KACOU Thierry Olivier", email: "kthierryolivier@yahoo.fr", phone: "07 07 30 94 99" },
  { code: "9", name: "CDTS DE BINGERVILLE", region: "PRES ABIDJAN", annualObjective: 4000, manager: "Dr. ABE Nicole", email: "abedkn@yahoo.fr", phone: "01 01 05 07 35" },
  { code: "6", name: "SP HG PORT BOUET", region: "PRES ABIDJAN", annualObjective: 8000, manager: "Dr. ASSOUKPOU Francine", email: "francineass@yahoo.fr", phone: "07 07 70 14 41" },
  { code: "4", name: "SP FSU ABOBO BAOULE", region: "PRES ABIDJAN", annualObjective: 10000, manager: "Dr. AMON épouse BOUKALO Renaude Jani", email: "brenaudeamon@gmail.com", phone: "01 60 57 53 93" },
  { code: "7", name: "SP HG ANYAMA", region: "PRES ABIDJAN", annualObjective: 5000, manager: "Dr. KACOU Thierry Olivier", email: "kthierryolivier@yahoo.fr", phone: "07 07 30 94 99" },
  { code: "5", name: "SP CHU DE COCODY", region: "PRES ABIDJAN", annualObjective: 11000, manager: "M. AKELE Antoine", email: "antoineakele72@gmail.com", phone: "07 47 43 93 39" },
  { code: "2", name: "SP CHU DE YOPOUGON", region: "PRES ABIDJAN", annualObjective: 12000, manager: "M. SARAPAHI Zadi Antonin", email: "zadisarapahi83@gmail.com", phone: "05 96 67 56 39" },
  { code: "11", name: "CDTS D'ABOISSO", region: "PRES ABIDJAN", annualObjective: 9000, manager: "Dr. N'GUESSAN Koffi Antoine", email: "antoine_nguessan@yahoo.fr", phone: "07 48 10 08 34" },
  { code: "10", name: "CDTS DE BONOUA", region: "PRES ABIDJAN", annualObjective: 6000, manager: "Dr. ACHIEPO Philippe", email: "philippeachiepo@gmail.com", phone: "07 49 76 49 66" },
  { code: "14", name: "CDTS D'ADZOPE", region: "PRES ABIDJAN", annualObjective: 12000, manager: "M. OHOUO Atse Leopold", email: "leopoldatse@gmail.com", phone: "07 07 88 12 00" },
  { code: "13", name: "CDTS D'AGBOVILLE", region: "PRES ABIDJAN", annualObjective: 10000, manager: "Dr. DAKON Mian Guillaume", email: "dakonmian@yahoo.fr", phone: "05 84 77 31 91" },
  { code: "12", name: "CDTS DE DABOU", region: "PRES ABIDJAN", annualObjective: 8000, manager: "Dr. KONAN Jocelin", email: "ndjikonan@yahoo.fr", phone: "07 07 52 84 57" },
  
  // PRES BELIER
  { code: "30", name: "CRTS DE YAMOUSSOUKRO", region: "PRES BELIER", annualObjective: 15000, manager: "Dr. EBIBA François", email: "francoisebiba2@gmail.com", phone: "07 09 93 53 72" },
  { code: "31", name: "CDTS DE TOUMODI", region: "PRES BELIER", annualObjective: 6000, manager: "Dr. DEYI Charlotte", email: "deyi.charlotte@yahoo.fr", phone: "07 79 80 25 57" },
  { code: "32", name: "CDTS DE GAGNOA", region: "PRES BELIER", annualObjective: 11000, manager: "M. KOUAO N'Guetta Louis Jérôme", email: "kouao_jerome@yahoo.fr", phone: "07 58 24 74 65" },
  { code: "36", name: "CDTS DE DIVO", region: "PRES BELIER", annualObjective: 11000, manager: "Dr. KOUNEYA Olivier", email: "kouneyabdias@gmail.com", phone: "07 09 97 73 50" },
  { code: "26", name: "CDTS DE BOUAFLE", region: "PRES BELIER", annualObjective: 7000, manager: "Dr. LOBE", email: "ozoua101314@gmail.com", phone: "07 78 41 57 86" },
  { code: "37", name: "CDTS DE DIMBOKRO", region: "PRES BELIER", annualObjective: 4000, manager: "M. DAUBARD Maxime", email: "daubard164@gmail.com", phone: "07 47 12 54 88" },
  
  // PRES GBEKE
  { code: "33", name: "CRTS DE BOUAKE", region: "PRES GBEKE", annualObjective: 25000, manager: "Dr. NENE Lou Fleur", email: "nenelou1979@gmail.com", phone: "07 58 46 82 79" },
  
  // PRES PORO
  { code: "34", name: "CRTS DE KORHOGO", region: "PRES PORO", annualObjective: 18000, manager: "Dr. N'GUETTA Eby", email: "ngue_eby@yahoo.fr", phone: "07 08 80 85 52" },
  { code: "35", name: "CDTS DE FERKESSEDOUGOU", region: "PRES PORO", annualObjective: 11000, manager: "M. KOFFI Mondé Eric", email: "ericmonde@gmail.com", phone: "07 09 43 72 06" },
  
  // PRES INDENIE DJUABLIN
  { code: "40", name: "CRTS D'ABENGOUROU", region: "PRES INDENIE DJUABLIN", annualObjective: 12000, manager: "Dr. N'ZI Franck", email: "nzifranck1@gmail.com", phone: "07 07 10 88 04" },
  { code: "44", name: "CDTS DE DAOUKRO", region: "PRES INDENIE DJUABLIN", annualObjective: 8000, manager: "Dr. GONTO", email: "mariusemmanuelgonto@gmail.com", phone: "01 53 32 27 82" },
  { code: "43", name: "CDTS DE BONGOUANOU", region: "PRES INDENIE DJUABLIN", annualObjective: 9000, manager: "Dr. DOFFOU Virginie", email: "doffouvirginie54@gmail.com", phone: "07 79 28 48 39" },
  
  // PRES GONTOUGO
  { code: "41", name: "CRTS DE BONDOUKOU", region: "PRES GONTOUGO", annualObjective: 11000, manager: "Dr. KIMOU Sylvain", email: "sylvinkimou@gmail.com", phone: "07 57 27 96 11" },
  { code: "42", name: "CDTS DE BOUNA", region: "PRES GONTOUGO", annualObjective: 4000, manager: "Dr. KONAN BRUNO", email: "konanbruno14@yahoo.fr", phone: "07 77 11 88 66" },
  
  // PRES HAUT SASSANDRA
  { code: "20", name: "CRTS DE DALOA", region: "PRES HAUT SASSANDRA", annualObjective: 20000, manager: "Dr. BOSSO Jacques", email: "bossojacques@gmail.com", phone: "07 59 32 77 69" },
  { code: "21", name: "CDTS DE SEGUELA", region: "PRES HAUT SASSANDRA", annualObjective: 7000, manager: "M. ASSI Aboua Ulrich Modeste", email: "modesteassi@yahoo.fr", phone: "07 07 45 92 91" },
  
  // PRES SAN-PEDRO
  { code: "22", name: "CRTS DE SAN PEDRO", region: "PRES SAN PEDRO", annualObjective: 15000, manager: "Dr. ASSO Sika Marc", email: "marcoluntch@yahoo.fr", phone: "07 59 42 21 75" },
  { code: "221", name: "SP DE MEAGUI", region: "PRES SAN PEDRO", annualObjective: 1000, manager: "Dr. ASSO Sika Marc", email: "marcoluntch@yahoo.fr", phone: "07 59 42 21 75" },
  
  // PRES TONPKI
  { code: "23", name: "CRTS DE MAN", region: "PRES TONPKI", annualObjective: 15000, manager: "Dr. SAFFO Bernard", email: "sabema014@yahoo.fr", phone: "07 07 18 96 06" },
  { code: "27", name: "CDTS DE DUEKOUE", region: "PRES TONPKI", annualObjective: 7000, manager: "Dr. DIOMANDE", email: "dr,manthin@gmail.com", phone: "07 49 95 79 37" },
  
  // PRES KABADOUGOU
  { code: "24", name: "CRTS DE ODIENNE", region: "PRES KABADOUGOU", annualObjective: 9000, manager: "Dr. TRAORE Yaya", email: "tyaya1664@gmail.com", phone: "07 04 00 57 95" }
];

export const PRES_COORDINATES: Record<string, [number, number]> = {
  "PRES ABIDJAN": [5.3600, -4.0083],
  "PRES BELIER": [6.8276, -5.2893],
  "PRES GBEKE": [7.6897, -5.0315],
  "PRES PORO": [9.4580, -5.6295],
  "PRES INDENIE DJUABLIN": [6.7297, -3.4964],
  "PRES GONTOUGO": [8.0402, -2.8000],
  "PRES HAUT SASSANDRA": [6.8774, -6.4502],
  "PRES SAN PEDRO": [4.7485, -6.6363],
  "PRES TONPKI": [7.4125, -7.5538],
  "PRES KABADOUGOU": [9.5051, -7.5643]
};

const normalizeStr = (s: string) => 
  s.normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .toUpperCase()
   .trim();

export const getSiteByInput = (input: string) => {
  if (!input) return null;
  const inputNorm = normalizeStr(input);
  const byCode = SITES_DATA.find(s => s.code === inputNorm);
  if (byCode) return byCode;
  const byName = SITES_DATA.find(s => normalizeStr(s.name) === inputNorm);
  if (byName) return byName;
  const byInclusion = SITES_DATA.find(s => {
    const sNameNorm = normalizeStr(s.name);
    return inputNorm.includes(sNameNorm) || sNameNorm.includes(inputNorm);
  });
  return byInclusion || null;
};

export const getSiteObjectives = (input: string) => {
  const site = getSiteByInput(input);
  if (!site) return { annual: 1200, monthly: 100, daily: 4 };
  const annual = site.annualObjective;
  const monthly = Math.round(annual / 12);
  const daily = Math.round(annual / WORKING_DAYS_YEAR);
  return { annual, monthly, daily };
};

export const INITIAL_DATA: DashboardData = {
  date: "---",
  month: "En cours",
  year: 2026,
  daily: { realized: 0, objective: 0, percentage: 0, fixed: 0, mobile: 0 },
  monthly: { realized: 0, objective: 0, percentage: 0, fixed: 0, mobile: 0 },
  annual: { realized: 0, objective: 0, percentage: 0, fixed: 0, mobile: 0 },
  dailyHistory: [],
  regions: [],
  distributions: {
    records: [],
    stats: { total: 0, totalRendu: 0, average: 0, lastUpdate: "---" }
  }
};

export const COLORS = {
  blue: '#3b82f6', 
  green: '#10b981', 
  orange: '#f59e0b', 
  red: '#ef4444',
  yellow: '#facc15',
  slate: '#1e293b',
  warmBg: '#fff7ed',
  fixed: '#10b981', 
  mobile: '#f59e0b', 
  total: '#10b981', 
  distribution: '#f59e0b'
};

export const PRODUCT_COLORS: Record<string, string> = {
  "CGR": "#ef4444", 
  "CGR ADULTE": "#ef4444",
  "CGR NOURRISON": "#f97316",
  "CGR PEDIATRIQUE": "#22c55e",
  "CONCENTRE DE PLAQUETTES": "#3b82f6", 
  "PLASMA A USAGE THERAPEUTIQUE": "#eab308" 
};

export const GROUP_COLORS: Record<string, string> = {
  "O+": "#ef4444", 
  "B+": "#8b5cf6", 
  "A+": "#3b82f6", 
  "AB+": "#22c55e", 
  "AB-": "#eab308", 
  "O-": "#94a3b8", 
  "A-": "#06b6d4", 
  "B-": "#4f46e5"  
};

export const DEFAULT_LINK_1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv";
export const DEFAULT_LINK_DISTRIBUTION = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvWxbSrjoG4XC2svVnGtLwYDEomCtuwW2Ap_vHKP0M6ONojDQU5LKTJj8Srel5k1d1mD9UI3F5R6r_/pub?gid=237684642&single=true&output=csv";
export const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRrIftmEeSUAutygeL2GHngC_kqV_repT9ArEP9okIz4zZPMtOxPVIfEOg8KvGezAf/exec";
