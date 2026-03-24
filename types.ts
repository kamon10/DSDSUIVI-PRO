
export type UserRole = 'AGENT' | 'PRES' | 'ADMIN' | 'SUPERADMIN';

export interface User {
  nom: string;
  prenoms: string;
  email: string;
  fonction: string;
  site: string;
  role: UserRole;
  region?: string;
}

export interface ActivityLog {
  timestamp: string;
  user: string;
  email: string;
  action: 'CONNEXION' | 'SAISIE' | 'MISE_A_JOUR' | 'SUPPRESSION' | 'ADMIN_CHANGE';
  details: string;
  site?: string;
}

export interface DonationStats {
  realized: number;
  objective: number;
  percentage: number;
  fixed: number;
  mobile: number;
}

export interface DistributionStats {
  total: number;
  totalRendu: number;
  average: number;
  lastUpdate: string;
}

export interface StockRecord {
  pres: string;
  site: string;
  typeProduit: string;
  groupeSanguin: string;
  quantite: number;
}

export interface SiteRecord {
  name: string;
  region?: string;
  fixe?: number;
  mobile?: number;
  totalJour?: number;
  totalMois?: number;
  monthlyFixed?: number;
  monthlyMobile?: number;
  objDate?: number;
  objMensuel?: number;
  manager?: string;
  email?: string;
  phone?: string;
  code?: string;
  annualObjective?: number;
  coords?: [number, number];
}

export interface DistributionRecord {
  date: string;
  codeSite: string;
  site: string;
  region: string;
  etablissement: string;
  typeProduit: string;
  groupeSanguin: string;
  quantite: number;
  rendu: number;
}

export interface RegionData {
  name: string;
  sites: SiteRecord[];
}

export interface DailyHistorySite {
  name: string;
  fixe: number;
  mobile: number;
  total: number;
  objective: number;
  region?: string;
  manager?: string;
  email?: string;
  phone?: string;
}

export interface DailyHistoryRecord {
  date: string;
  stats: {
    realized: number;
    fixed: number;
    mobile: number;
  };
  sites: DailyHistorySite[];
}

export interface GtsRecord {
  date: string;
  site: string;
  region?: string;
  fixe: number;
  mobile: number;
  total: number;
  autoTransfusion: number;
  lieu?: string;
  caCode?: string;
  pvCode?: number;
  [key: string]: any;
}

export interface DashboardData {
  date: string;
  month: string;
  year: number;
  daily: DonationStats;
  monthly: DonationStats;
  annual: DonationStats;
  dailyHistory: DailyHistoryRecord[];
  regions: RegionData[];
  distributions?: {
    records: DistributionRecord[];
    stats: DistributionStats;
  };
  stock?: StockRecord[];
  gts?: GtsRecord[];
}

// Added 'recap-dist' to support the separate flux summary view
export interface Personnel {
  statut: string;
  matricule: string;
  nomPrenom: string;
  dateNaissance: string;
  sexe: string;
  age: number;
  emploi: string;
  site: string;
  service: string;
  dateEmbauche: string;
  anciennete: string;
  fonction: string;
  pres: string;
  categorieEmploi: string;
  typeEmploi: string;
  diplome: string;
  indiceSalariale: number;
  grade: string;
  contact: string;
  personneAContacter: string;
  serviceAnterieur: string;
  cessation: string;
  observation: string;
}

export type AppTab = 'summary' | 'cockpit' | 'map' | 'history' | 'recap' | 'recap-dist' | 'distribution-stock' | 'stock' | 'stock-summary' | 'stock-focus' | 'stock-synthesis' | 'stock-planning' | 'capacity-planning' | 'weekly' | 'performance' | 'pulse' | 'evolution' | 'comparison' | 'objectives' | 'site-focus' | 'entry' | 'monthly-entry' | 'administration' | 'contact' | 'hemo-stats' | 'distribution-detailed' | 'stock-detailed' | 'global-report' | 'gts' | 'gts-synthesis' | 'gts-comparison' | 'collection-planning' | 'sql-test' | 'personnel';
