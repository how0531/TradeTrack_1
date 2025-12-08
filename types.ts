export interface Portfolio {
  id: string;
  name: string;
  initialCapital: number;
  color: string;
}

export interface Trade {
  id: string;
  date: string;
  pnl: number;
  strategy?: string;
  emotion?: string;
  note?: string;
  image?: string;
  portfolioId?: string;
  timestamp?: string;
  amount?: string; // Used in form handling, sometimes stored
  type?: 'profit' | 'loss'; // Used in form handling
}

export interface AppConfig {
  appId: string;
}

export interface Metrics {
  curve: any[];
  drawdown: any[];
  currentEq: number;
  eqChange: number;
  eqChangePct: number;
  currentDD: number;
  maxDD: number;
  winRate: number;
  pf: number;
  stratStats: Record<string, StrategyStat>;
  isPeak: boolean;
  sharpe: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
}

export interface StrategyStat {
  pnl: number;
  trades: number;
  winRate: number;
  mddPct: number;
  curDDPct: number;
  isNewHigh: boolean;
}

export interface Streaks {
  current: number;
  best: number;
}

export interface MonthlyStats {
  pnl: number;
  winRate: number;
  count: number;
}

export type TimeRange = 'ALL' | '1M' | '3M' | 'YTD' | 'CUSTOM';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Lang = 'zh' | 'en';

export interface CalendarDay {
    key: string;
    day: number | string;
    pnl: number;
}