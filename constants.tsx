
import { DashboardData } from './types';

export const SITES_DATA = [
  { code: "1000", name: "CRTS TREICHVILLE", region: "PRES ABIDJAN", annualObjective: 35000 },
  { code: "9000", name: "CDTS BINGERVILLE", region: "PRES ABIDJAN", annualObjective: 4000 },
  { code: "6000", name: "SP PORT BOUET", region: "PRES ABIDJAN", annualObjective: 8000 },
  { code: "4000", name: "SP ABOBO", region: "PRES ABIDJAN", annualObjective: 10000 },
  { code: "7000", name: "SP ANYAMA", region: "PRES ABIDJAN", annualObjective: 5000 },
  { code: "5000", name: "SP CHU COCODY", region: "PRES ABIDJAN", annualObjective: 11000 },
  { code: "2000", name: "SP YOPOUGON CHU", region: "PRES ABIDJAN", annualObjective: 12000 },
  { code: "11000", name: "CDTS ABOISSO", region: "PRES ABIDJAN", annualObjective: 9000 },
  { code: "10000", name: "CDTS BONOUA", region: "PRES ABIDJAN", annualObjective: 6000 },
  { code: "14000", name: "CDTS ADZOPE", region: "PRES ABIDJAN", annualObjective: 12000 },
  { code: "13000", name: "CDTS AGBOVILLE", region: "PRES ABIDJAN", annualObjective: 10000 },
  { code: "12000", name: "CDTS DABOU", region: "PRES ABIDJAN", annualObjective: 8000 },
  { code: "30000", name: "CRTS YAMOUSSOUKRO", region: "PRES BELIER", annualObjective: 15000 },
  { code: "31000", name: "CDTS TOUMODI", region: "PRES BELIER", annualObjective: 6000 },
  { code: "32000", name: "CDTS GAGNOA", region: "PRES BELIER", annualObjective: 11000 },
  { code: "36000", name: "CDTS DIVO", region: "PRES BELIER", annualObjective: 11000 },
  { code: "26000", name: "CDTS BOUAFLE", region: "PRES BELIER", annualObjective: 7000 },
  { code: "37000", name: "CDTS DIMBOKRO", region: "PRES BELIER", annualObjective: 4000 },
  { code: "33000", name: "CRTS BOUAKE", region: "PRES GBEKE", annualObjective: 25000 },
  { code: "34000", name: "CRTS KORHOGO", region: "PRES PORO", annualObjective: 18000 },
  { code: "35000", name: "CDTS FERKE", region: "PRES PORO", annualObjective: 11000 },
  { code: "40000", name: "CRTS ABENGOUROU", region: "PRES INDENIE DJUABLIN", annualObjective: 12000 },
  { code: "44000", name: "CDTS DAOUKRO", region: "PRES INDENIE DJUABLIN", annualObjective: 8000 },
  { code: "43000", name: "CDTS BONGOUANOU", region: "PRES INDENIE DJUABLIN", annualObjective: 9000 },
  { code: "41000", name: "CRTS BONDOUKOU", region: "PRES GONTOUGO", annualObjective: 11000 },
  { code: "42000", name: "CDTS BOUNA", region: "PRES GONTOUGO", annualObjective: 4000 },
  { code: "20000", name: "CRTS DALOA", region: "PRES HAUT SASSANDRA", annualObjective: 20000 },
  { code: "21000", name: "CDTS SEGUELA", region: "PRES HAUT SASSANDRA", annualObjective: 7000 },
  { code: "22000", name: "CRTS SAN-PEDRO", region: "PRES SAN-PEDRO", annualObjective: 15000 },
  { code: "22001", name: "SP MEAGUI", region: "PRES SAN-PEDRO", annualObjective: 1000 },
  { code: "23000", name: "CRTS MAN", region: "PRES TONPKI", annualObjective: 15000 },
  { code: "27000", name: "CDTS DUEKOUE", region: "PRES TONPKI", annualObjective: 7000 },
  { code: "24000", name: "CRTS ODIENNE", region: "PRES KABADOUGOU", annualObjective: 9000 }
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
  if (!site) return { annual: 1000, monthly: 83, daily: 3 };
  const annual = site.annualObjective;
  const monthly = Math.round(annual / 12);
  const daily = Math.round(annual / 365);
  return { annual, monthly, daily };
};

export const INITIAL_DATA: DashboardData = {
  date: "22/01/2026",
  month: "janvier",
  year: 2026,
  daily: { realized: 0, objective: 989, percentage: 0, fixed: 0, mobile: 0 },
  monthly: { realized: 0, objective: 29667, percentage: 0, fixed: 0, mobile: 0 },
  annual: { realized: 0, objective: 356000, percentage: 0, fixed: 0, mobile: 0 },
  dailyHistory: [],
  regions: []
};

export const COLORS = {
  dailyHeader: '#00b050',
  monthlyHeader: '#ed7d31',
  annualHeader: '#ff0000',
  dailyReal: '#0070c0',
  dailyObj: '#ff9900',
  annualReal: '#00b0f0',
  annualObj: '#bf8f00',
  text: '#1e293b',
  fixed: '#0070c0',
  mobile: '#ed7d31'
};
