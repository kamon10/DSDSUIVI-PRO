
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
  /* Added metadata fields to support detailed daily views and historical analysis */
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

/* Extended AppTab to include all navigation identifiers used in the application */
export type AppTab = 'summary' | 'dashboard' | 'history' | 'recap' | 'daily' | 'weekly' | 'performance' | 'pulse' | 'evolution' | 'comparison' | 'objectives';
