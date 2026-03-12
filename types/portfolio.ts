// ===== Portfolio Types =====

export interface PortfolioGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface PortfolioItem {
  id: number;
  ticker: string;
  current_price: number | null;
  fair_price: number | null;
  d0: number | null;
  g: number | null;
  ks: number | null;
  pe: number | null;
  pbv: number | null;
  de: number | null;
  roa: number | null;
  roe: number | null;
  dividend_yield: number | null;
  eps: number | null;
  mos30_price: number | null;
  mos30_shares: number | null;
  mos30_cost: number | null;
  mos40_price: number | null;
  mos40_shares: number | null;
  mos40_cost: number | null;
  mos50_price: number | null;
  mos50_shares: number | null;
  mos50_cost: number | null;
  status: string | null;
  portfolio_id: string;
  created_at: string;
  
  // Phase 3 Extensions
  target_price?: number | null; // User defined target price alert
  
  // Extended fields (may come from live data)
  debt_to_equity?: number | null;
  yield?: number | null;
}

export interface JournalEntry {
  id: string;
  ticker: string;
  date: string;
  action: 'BUY' | 'SELL' | 'WATCH' | 'NOTE';
  price: number | null;
  shares: number | null;
  thesis: string;
  notes: string;
  created_at: string;
}
