
export interface DonationStats {
  realized: number;
  objective: number;
  percentage: number;
  fixed: number;
  mobile: number;
}

export interface SiteRecord {
  name: string;
  fixe: number;
  mobile: number;
  totalJour: number;
  totalMois: number;
  objDate: number;
  objMensuel: number;
}

export interface RegionGroup {
  name: string;
  color: string;
  sites: SiteRecord[];
}

export interface DailyHistorySite {
  name: string;
  region?: string;
  fixe: number;
  mobile: number;
  total: number;
  objective: number;
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
  regions: RegionGroup[];
  dailyHistory: DailyHistoryRecord[];
}

export type AppTab = 'dashboard' | 'daily' | 'weekly' | 'synthesis' | 'performance' | 'entry';
