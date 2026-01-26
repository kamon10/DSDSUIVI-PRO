
import { DashboardData } from './types';

// Pour 2026 : 365 jours - 52 dimanches = 313 jours de collecte
export const WORKING_DAYS_YEAR = 313;

export const SITES_DATA = [
  // PRES ABIDJAN
  { code: "1000", name: "CRTS TREICHVILLE", region: "PRES ABIDJAN", annualObjective: 35000, manager: "Dr. KACOU Thierry Olivier", email: "kthierryolivier@yahoo.fr", phone: "07 07 30 94 99" },
  { code: "9000", name: "CDTS BINGERVILLE", region: "PRES ABIDJAN", annualObjective: 4000, manager: "Dr. ABE Nicole", email: "abedkn@yahoo.fr", phone: "01 01 05 07 35" },
  { code: "6000", name: "SP PORT BOUET", region: "PRES ABIDJAN", annualObjective: 8000, manager: "Dr. ASSOUKPOU Francine", email: "francineass@yahoo.fr", phone: "07 07 70 14 41" },
  { code: "4000", name: "SP ABOBO", region: "PRES ABIDJAN", annualObjective: 10000, manager: "Dr. AMON épouse BOUKALO Renaude Jani", email: "brenaudeamon@gmail.com", phone: "01 60 57 53 93" },
  { code: "7000", name: "SP ANYAMA", region: "PRES ABIDJAN", annualObjective: 5000, manager: "Dr. KACOU Thierry Olivier", email: "kthierryolivier@yahoo.fr", phone: "07 07 30 94 99" },
  { code: "5000", name: "SP CHU COCODY", region: "PRES ABIDJAN", annualObjective: 11000, manager: "M. AKELE Antoine", email: "antoineakele72@gmail.com", phone: "07 47 43 93 39" },
  { code: "2000", name: "SP YOPOUGON CHU", region: "PRES ABIDJAN", annualObjective: 12000, manager: "M. SARAPAHI Zadi Antonin", email: "zadisarapahi83@gmail.com", phone: "05 96 67 56 39" },
  { code: "11000", name: "CDTS ABOISSO", region: "PRES ABIDJAN", annualObjective: 9000, manager: "Dr. N'GUESSAN Koffi Antoine", email: "antoine_nguessan@yahoo.fr", phone: "07 48 10 08 34" },
  { code: "10000", name: "CDTS BONOUA", region: "PRES ABIDJAN", annualObjective: 6000, manager: "Dr. ACHIEPO Philippe", email: "philippeachiepo@gmail.com", phone: "07 49 76 49 66" },
  { code: "14000", name: "CDTS ADZOPE", region: "PRES ABIDJAN", annualObjective: 12000, manager: "M. OHOUO Atse Leopold", email: "leopoldatse@gmail.com", phone: "07 07 88 12 00" },
  { code: "13000", name: "CDTS AGBOVILLE", region: "PRES ABIDJAN", annualObjective: 10000, manager: "Dr. DAKON Mian Guillaume", email: "dakonmian@yahoo.fr", phone: "05 84 77 31 91" },
  { code: "12000", name: "CDTS DABOU", region: "PRES ABIDJAN", annualObjective: 8000, manager: "Dr. KONAN Jocelin", email: "ndjikonan@yahoo.fr", phone: "07 07 52 84 57" },
  
  // PRES BELIER
  { code: "30000", name: "CRTS YAMOUSSOUKRO", region: "PRES BELIER", annualObjective: 15000, manager: "Dr. EBIBA François", email: "francoisebiba2@gmail.com", phone: "07 09 93 53 72" },
  { code: "31000", name: "CDTS TOUMODI", region: "PRES BELIER", annualObjective: 6000, manager: "Dr. DEYI Charlotte", email: "deyi.charlotte@yahoo.fr", phone: "07 79 80 25 57" },
  { code: "32000", name: "CDTS GAGNOA", region: "PRES BELIER", annualObjective: 11000, manager: "M. KOUAO N'Guetta Louis Jérôme", email: "kouao_jerome@yahoo.fr", phone: "07 58 24 74 65" },
  { code: "36000", name: "CDTS DIVO", region: "PRES BELIER", annualObjective: 11000, manager: "Dr. KOUNEYA Olivier", email: "kouneyabdias@gmail.com", phone: "07 09 97 73 50" },
  { code: "26000", name: "CDTS BOUAFLE", region: "PRES BELIER", annualObjective: 7000, manager: "Dr. LOBE", email: "ozoua101314@gmail.com", phone: "07 78 41 57 86" },
  { code: "37000", name: "CDTS DIMBOKRO", region: "PRES BELIER", annualObjective: 4000, manager: "M. DAUBARD Maxime", email: "daubard164@gmail.com", phone: "07 47 12 54 88" },
  
  // PRES GBEKE
  { code: "33000", name: "CRTS BOUAKE", region: "PRES GBEKE", annualObjective: 25000, manager: "Dr. NENE Lou Fleur", email: "nenelou1979@gmail.com", phone: "07 58 46 82 79" },
  
  // PRES PORO
  { code: "34000", name: "CRTS KORHOGO", region: "PRES PORO", annualObjective: 18000, manager: "Dr. N'GUETTA Eby", email: "ngue_eby@yahoo.fr", phone: "07 08 80 85 52" },
  { code: "35000", name: "CDTS FERKE", region: "PRES PORO", annualObjective: 11000, manager: "M. KOFFI Mondé Eric", email: "ericmonde@gmail.com", phone: "07 09 43 72 06" },
  
  // PRES INDENIE DJUABLIN
  { code: "40000", name: "CRTS ABENGOUROU", region: "PRES INDENIE DJUABLIN", annualObjective: 12000, manager: "Dr. N'ZI Franck", email: "nzifranck1@gmail.com", phone: "07 07 10 88 04" },
  { code: "44000", name: "CDTS DAOUKRO", region: "PRES INDENIE DJUABLIN", annualObjective: 8000, manager: "Dr. GONTO", email: "mariusemmanuelgonto@gmail.com", phone: "01 53 32 27 82" },
  { code: "43000", name: "CDTS BONGOUANOU", region: "PRES INDENIE DJUABLIN", annualObjective: 9000, manager: "Dr. DOFFOU Virginie", email: "doffouvirginie54@gmail.com", phone: "07 79 28 48 39" },
  
  // PRES GONTOUGO
  { code: "41000", name: "CRTS BONDOUKOU", region: "PRES GONTOUGO", annualObjective: 11000, manager: "Dr. KIMOU Sylvain", email: "sylvinkimou@gmail.com", phone: "07 57 27 96 11" },
  { code: "42000", name: "CDTS BOUNA", region: "PRES GONTOUGO", annualObjective: 4000, manager: "Dr. KONAN BRUNO", email: "konanbruno14@yahoo.fr", phone: "07 77 11 88 66" },
  
  // PRES HAUT SASSANDRA
  { code: "20000", name: "CRTS DALOA", region: "PRES HAUT SASSANDRA", annualObjective: 20000, manager: "Dr. BOSSO Jacques", email: "bossojacques@gmail.com", phone: "07 59 32 77 69" },
  { code: "21000", name: "CDTS SEGUELA", region: "PRES HAUT SASSANDRA", annualObjective: 7000, manager: "M. ASSI Aboua Ulrich Modeste", email: "modesteassi@yahoo.fr", phone: "07 07 45 92 91" },
  
  // PRES SAN-PEDRO
  { code: "22000", name: "CRTS SAN-PEDRO", region: "PRES SAN-PEDRO", annualObjective: 15000, manager: "Dr. ASSO Sika Marc", email: "marcoluntch@yahoo.fr", phone: "07 59 42 21 75" },
  { code: "22001", name: "SP MEAGUI", region: "PRES SAN-PEDRO", annualObjective: 1000, manager: "Dr. ASSO Sika Marc", email: "marcoluntch@yahoo.fr", phone: "07 59 42 21 75" },
  
  // PRES TONPKI
  { code: "23000", name: "CRTS MAN", region: "PRES TONPKI", annualObjective: 15000, manager: "Dr. SAFFO Bernard", email: "sabema014@yahoo.fr", phone: "07 07 18 96 06" },
  { code: "27000", name: "CDTS DUEKOUE", region: "PRES TONPKI", annualObjective: 7000, manager: "Dr. DIOMANDE", email: "dr,manthin@gmail.com", phone: "07 49 95 79 37" },
  
  // PRES KABADOUGOU
  { code: "24000", name: "CRTS ODIENNE", region: "PRES KABADOUGOU", annualObjective: 9000, manager: "Dr. TRAORE Yaya", email: "tyaya1664@gmail.com", phone: "07 04 00 57 95" }
];

export const getSiteByInput = (input: string) => {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();
  return SITES_DATA.find(s => 
    s.code === trimmed || 
    s.name.toUpperCase() === trimmed || 
    trimmed.includes(s.name.toUpperCase())
  );
};

export const getSiteName = (input: string): string => {
  const site = getSiteByInput(input);
  return site ? site.name : input.trim();
};

export const getSiteRegion = (input: string): string => {
  const site = getSiteByInput(input);
  return site ? site.region : "DIRECTION NATIONALE";
};

export const getSiteObjectives = (input: string) => {
  const site = getSiteByInput(input);
  if (!site) return { annual: 1000, monthly: 83, daily: 4 };
  const annual = site.annualObjective;
  const monthly = Math.round(annual / 12);
  // Calcul basé sur les jours ouvrés (sans dimanches)
  const daily = Math.round(annual / WORKING_DAYS_YEAR);
  return { annual, monthly, daily };
};

export const INITIAL_DATA: DashboardData = {
  date: "22/01/2026",
  month: "janvier",
  year: 2026,
  daily: { realized: 0, objective: 1137, percentage: 0, fixed: 0, mobile: 0 },
  monthly: { realized: 0, objective: 29667, percentage: 0, fixed: 0, mobile: 0 },
  annual: { realized: 0, objective: 356000, percentage: 0, fixed: 0, mobile: 0 },
  dailyHistory: [],
  regions: []
};

export const COLORS = {
  fixed: '#10b981', // Green 500
  mobile: '#f97316', // Orange 500
  total: '#ef4444', // Red 500
  bgLight: '#f8fafc',
  text: '#1e293b'
};
