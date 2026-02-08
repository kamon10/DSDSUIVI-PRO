
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

export interface DonationStats {
  realized: number;
  objective: number;
  percentage: number;
  fixed: number;
  mobile: number;
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
}

export type AppTab = 'summary' | 'cockpit' | 'history' | 'recap' | 'weekly' | 'performance' | 'pulse' | 'evolution' | 'comparison' | 'objectives' | 'site-focus' | 'entry' | 'administration';
