export type CampaignType = 'Influencer' | 'Traffic' | 'Organic';
export type CampaignStatus = 'Active' | 'Completed' | 'Paused';

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface DailyRecord {
  id: string;
  date: string;
  salesCount: number;
  revenue: number;
  spent: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  platform: string; // e.g., Facebook, Instagram, TikTok
  influencerName?: string; // Only for Influencer type
  startDate: string;
  endDate: string;
  budget: number;
  totalSpent: number;
  revenue: number;
  status: CampaignStatus;
  customData?: Record<string, any>;
  dailyRecords?: DailyRecord[];
}

export interface DashboardMetrics {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  totalProfit: number;
  overallROI: number;
}
