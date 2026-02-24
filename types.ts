
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
  fixe: number;
  mobile: number;
  totalJour: number;
  totalMois: number;
  monthlyFixed?: number;
  monthlyMobile?: number;
  objDate: number;
  objMensuel: number;
  manager?: string;
  email?: string;
  phone?: string;
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
}

// Added 'recap-dist' to support the separate flux summary view
export type AppTab = 'summary' | 'cockpit' | 'map' | 'history' | 'recap' | 'recap-dist' | 'stock' | 'weekly' | 'performance' | 'pulse' | 'evolution' | 'comparison' | 'objectives' | 'site-focus' | 'entry' | 'administration' | 'contact' | 'hemo-stats';
