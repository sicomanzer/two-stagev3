/**
 * VI Calculation Engine
 * รวมสูตรการคำนวณทั้งหมดสำหรับ Value Investing
 */

import type { 
  DDMResult, DDMTableRow, GrahamResult, PEGResult, DCFResult,
  ValuationConsensus, StockScorecard, ScoreCategory,
  TrendAnalysis, CAGRData, Scenario, ScenarioAnalysis,
  StockHistory, ScreeningResult, AllocationRatio
} from '@/types/stock';

// ===================================================================
// 1. TWO-STAGE DDM (อ.กวี ชูกิจเกษม)
// ===================================================================

export function calculateDDM(
  ticker: string,
  d0: number,
  g: number,
  ks: number,
  years: number,
  currentPrice: number | null
): DDMResult {
  const tableData: DDMTableRow[] = [];
  const baseYear = new Date().getFullYear();

  // Year 0
  tableData.push({
    year: (baseYear - 1).toString(),
    dividend: d0,
    pv: null,
    growth: null,
    k: ks,
  });

  let pvSum = 0;
  let prevD = d0;

  // Explicit Years
  for (let t = 1; t <= years; t++) {
    const year = baseYear + t - 1;
    const dt = prevD * (1 + g);
    const pv = dt / Math.pow(1 + ks, t);
    pvSum += pv;

    tableData.push({
      year: year.toString(),
      dividend: dt,
      pv,
      growth: g,
      k: null,
    });

    prevD = dt;
  }

  // Terminal Year
  const terminalYear = baseYear + years;
  const dTerminal = prevD * (1 + g);
  const tv = dTerminal / (ks - g);
  const pvTv = tv / Math.pow(1 + ks, years);

  tableData.push({
    year: `${terminalYear} (Terminal)`,
    dividend: dTerminal,
    pv: pvTv,
    growth: g,
    k: null,
    isTerminal: true,
  });

  const fairPrice = pvSum + pvTv;
  let margin: number | null = null;
  let status: 'Undervalued' | 'Overvalued' | 'Fair' = 'Fair';
  let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  if (currentPrice) {
    margin = ((fairPrice - currentPrice) / currentPrice) * 100;
    if (margin >= 15) {
      status = 'Undervalued';
      recommendation = 'BUY';
    } else if (margin <= -15) {
      status = 'Overvalued';
      recommendation = 'SELL';
    }
  }

  return {
    ticker,
    currentPrice,
    d0,
    g,
    ks,
    fairPrice,
    margin,
    status,
    recommendation,
    tableData,
  };
}

// ===================================================================
// 2. GRAHAM NUMBER (Benjamin Graham)
// ===================================================================

export function calculateGrahamNumber(
  eps: number | null,
  bvps: number | null,
  currentPrice: number | null
): GrahamResult | null {
  if (!eps || eps <= 0 || !bvps || bvps <= 0) return null;

  const grahamNumber = Math.sqrt(22.5 * eps * bvps);
  let margin: number | null = null;
  let status = 'N/A';

  if (currentPrice && currentPrice > 0) {
    margin = ((grahamNumber - currentPrice) / currentPrice) * 100;
    if (margin > 20) status = 'Very Undervalued';
    else if (margin > 0) status = 'Undervalued';
    else if (margin > -20) status = 'Fair';
    else status = 'Overvalued';
  }

  return { grahamNumber, eps, bvps, margin, status };
}

// ===================================================================
// 3. PEG RATIO (Price/Earnings to Growth)
// ===================================================================

export function calculatePEG(
  pe: number | null,
  epsGrowth: number | null // as decimal, e.g. 0.10 for 10%
): PEGResult | null {
  if (!pe || pe <= 0 || !epsGrowth || epsGrowth <= 0) return null;

  const epsGrowthPercent = epsGrowth * 100;
  const peg = pe / epsGrowthPercent;

  let status = '';
  if (peg < 0.5) status = 'Very Undervalued';
  else if (peg < 1.0) status = 'Undervalued';
  else if (peg < 1.5) status = 'Fair';
  else if (peg < 2.0) status = 'Slightly Overvalued';
  else status = 'Overvalued';

  return { peg, pe, epsGrowth: epsGrowthPercent, status };
}

// ===================================================================
// 3.5 DCF (Discounted Cash Flow)
// ===================================================================

export function calculateDCF(
  fcf0: number | null, // Free Cash Flow at year 0
  shares: number | null,
  wacc: number = 0.08, // Default WACC 8%
  growthRate: number = 0.05, // Phase 1 Growth 5%
  terminalGrowthRate: number = 0.02, // Terminal Growth 2%
  years: number = 5
): DCFResult | null {
  if (!fcf0 || fcf0 <= 0 || !shares || shares <= 0) return null;

  const fcfValues: number[] = [];
  let currentFCF = fcf0;
  let pvSum = 0;

  // 1. Explicit Forecast Period
  for (let t = 1; t <= years; t++) {
    currentFCF = currentFCF * (1 + growthRate);
    fcfValues.push(currentFCF);
    
    // Calculate Present Value of FCF
    const pv = currentFCF / Math.pow(1 + wacc, t);
    pvSum += pv;
  }

  // 2. Terminal Value Calculation (Gordon Growth Model)
  const terminalFCF = currentFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (wacc - terminalGrowthRate);
  
  // Present Value of Terminal Value
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, years);

  // 3. Enterprise Value
  const enterpriseValue = pvSum + pvTerminalValue;
  // *Usually we add cash and subtract debt here, but keeping it simple proxy for now*
  
  // 4. Fair Value Per Share
  const fairValue = enterpriseValue / shares;

  return {
    fairValue,
    fcfValues,
    terminalValue,
    wacc,
    terminalGrowth: terminalGrowthRate,
    margin: null // calculated later
  };
}

// ===================================================================
// 4. VALUATION CONSENSUS (Multi-Model)
// ===================================================================

export function calculateConsensus(
  ddmFair: number | null,
  grahamFair: number | null,
  peBandFair: number | null, // -1SD PE based fair price
  dcfFair: number | null,
  currentPrice: number | null
): ValuationConsensus {
  const models: { fairPrice: number; weight: number }[] = [];

  // Assign weights (DDM gets highest for dividend stocks)
  if (ddmFair && ddmFair > 0) {
    models.push({ fairPrice: ddmFair, weight: 0.35 });
  }
  if (grahamFair && grahamFair > 0) {
    models.push({ fairPrice: grahamFair, weight: 0.20 });
  }
  if (peBandFair && peBandFair > 0) {
    models.push({ fairPrice: peBandFair, weight: 0.20 });
  }
  if (dcfFair && dcfFair > 0) {
    models.push({ fairPrice: dcfFair, weight: 0.25 });
  }

  // Normalize weights if not all models are available
  const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight > 0) {
    models.forEach(m => (m.weight = m.weight / totalWeight));
  }

  const consensusFairPrice = models.reduce(
    (sum, m) => sum + m.fairPrice * m.weight,
    0
  );

  const upside =
    currentPrice && currentPrice > 0
      ? ((consensusFairPrice - currentPrice) / currentPrice) * 100
      : null;

  return {
    ddm: ddmFair && ddmFair > 0 ? { fairPrice: ddmFair, weight: 0.35 } : null,
    graham: grahamFair && grahamFair > 0 ? { fairPrice: grahamFair, weight: 0.30 } : null,
    dcf: dcfFair && dcfFair > 0 ? { fairPrice: dcfFair, weight: 0.25 } : null,
    peBand: peBandFair && peBandFair > 0 ? { fairPrice: peBandFair, weight: 0.35 } : null,
    consensusFairPrice,
    currentPrice,
    upside,
  };
}

// ===================================================================
// 5. STOCK SCORECARD (VI Quality Score — /20)
// ===================================================================

export function calculateScorecard(
  ticker: string,
  history: StockHistory[],
  currentPrice: number | null,
  fairPrice: number | null,
  latestPE: number | null,
  latestPBV: number | null,
  peAvg: number | null,
  pbvAvg: number | null
): StockScorecard {
  const categories: ScoreCategory[] = [];
  let totalScore = 0;

  // Need at least 5 years of data
  const recent5 = history.slice(-5);
  const recent10 = history.slice(-10);

  // --- 1. ROE > 15% consistently (3 pts) ---
  const roeValues = recent5.map(h => h.roe).filter((v): v is number => v != null);
  let roeScore = 0;
  if (roeValues.length >= 3) {
    const avgROE = roeValues.reduce((a, b) => a + b, 0) / roeValues.length;
    const allAbove15 = roeValues.every(v => v > 0.12);
    if (avgROE > 0.15 && allAbove15) roeScore = 3;
    else if (avgROE > 0.12) roeScore = 2;
    else if (avgROE > 0.08) roeScore = 1;
  }
  categories.push({
    name: 'ROE',
    score: roeScore,
    maxScore: 3,
    detail: roeValues.length > 0 ? `AVG ${(roeValues.reduce((a, b) => a + b, 0) / roeValues.length * 100).toFixed(1)}%` : 'N/A',
    icon: '📊',
  });
  totalScore += roeScore;

  // --- 2. D/E < 1.0 (2 pts) ---
  const deValues = recent5.map(h => h.de).filter((v): v is number => v != null);
  let deScore = 0;
  if (deValues.length > 0) {
    const latestDE = deValues[deValues.length - 1];
    if (latestDE < 0.5) deScore = 2;
    else if (latestDE < 1.0) deScore = 1;
  }
  categories.push({
    name: 'D/E',
    score: deScore,
    maxScore: 2,
    detail: deValues.length > 0 ? `${deValues[deValues.length - 1].toFixed(2)}x` : 'N/A',
    icon: '🏦',
  });
  totalScore += deScore;

  // --- 3. Dividend consistency (3 pts) ---
  const dpsValues = history.map(h => h.dps).filter((v): v is number => v != null && v > 0);
  let divScore = 0;
  const consecutiveYears = dpsValues.length;
  if (consecutiveYears >= 10) divScore = 3;
  else if (consecutiveYears >= 7) divScore = 2;
  else if (consecutiveYears >= 5) divScore = 1;
  
  // Check if dividend is growing
  if (divScore >= 2 && dpsValues.length >= 2) {
    const first = dpsValues[0];
    const last = dpsValues[dpsValues.length - 1];
    if (last > first) divScore = Math.min(divScore + 0, 3); // already counted
  }
  categories.push({
    name: 'เงินปันผล',
    score: divScore,
    maxScore: 3,
    detail: `จ่ายต่อเนื่อง ${consecutiveYears} ปี`,
    icon: '💰',
  });
  totalScore += divScore;

  // --- 4. EPS Growth CAGR > 5% (2 pts) ---
  const epsCAGR = calculateCAGR(recent5.map(h => h.eps));
  let epsScore = 0;
  if (epsCAGR !== null) {
    if (epsCAGR > 0.10) epsScore = 2;
    else if (epsCAGR > 0.05) epsScore = 1;
  }
  categories.push({
    name: 'EPS Growth',
    score: epsScore,
    maxScore: 2,
    detail: epsCAGR !== null ? `CAGR ${(epsCAGR * 100).toFixed(1)}%` : 'N/A',
    icon: '📈',
  });
  totalScore += epsScore;

  // --- 5. Revenue Growth CAGR > 5% (2 pts) ---
  const revCAGR = calculateCAGR(recent5.map(h => h.revenue));
  let revScore = 0;
  if (revCAGR !== null) {
    if (revCAGR > 0.10) revScore = 2;
    else if (revCAGR > 0.05) revScore = 1;
  }
  categories.push({
    name: 'Revenue Growth',
    score: revScore,
    maxScore: 2,
    detail: revCAGR !== null ? `CAGR ${(revCAGR * 100).toFixed(1)}%` : 'N/A',
    icon: '🏭',
  });
  totalScore += revScore;

  // --- 6. NPM Stability (1 pt) ---
  const npmValues = recent5.map(h => h.npm).filter((v): v is number => v != null);
  let npmScore = 0;
  if (npmValues.length >= 3) {
    const avg = npmValues.reduce((a, b) => a + b, 0) / npmValues.length;
    const maxDeviation = Math.max(...npmValues.map(v => Math.abs(v - avg) / avg));
    if (maxDeviation < 0.30) npmScore = 1;
  }
  categories.push({
    name: 'NPM Stability',
    score: npmScore,
    maxScore: 1,
    detail: npmValues.length > 0 ? `AVG ${npmValues[npmValues.length - 1].toFixed(1)}%` : 'N/A',
    icon: '📉',
  });
  totalScore += npmScore;

  // --- 7. Payout Ratio 30%-70% (1 pt) ---
  let payoutScore = 0;
  if (dpsValues.length > 0 && recent5.length > 0) {
    const lastEps = recent5[recent5.length - 1]?.eps;
    const lastDps = dpsValues[dpsValues.length - 1];
    if (lastEps && lastEps > 0) {
      const payout = lastDps / lastEps;
      if (payout >= 0.30 && payout <= 0.70) payoutScore = 1;
    }
  }
  categories.push({
    name: 'Payout Ratio',
    score: payoutScore,
    maxScore: 1,
    detail: payoutScore > 0 ? 'อยู่ในช่วง 30-70%' : 'นอกช่วง',
    icon: '🎯',
  });
  totalScore += payoutScore;

  // --- 8. PE below average (2 pts) ---
  let peScore = 0;
  if (latestPE && peAvg) {
    if (latestPE < peAvg * 0.8) peScore = 2;
    else if (latestPE < peAvg) peScore = 1;
  }
  categories.push({
    name: 'PE Band',
    score: peScore,
    maxScore: 2,
    detail: latestPE ? `PE ${latestPE.toFixed(1)} vs AVG ${peAvg?.toFixed(1) || 'N/A'}` : 'N/A',
    icon: '📊',
  });
  totalScore += peScore;

  // --- 9. PBV below average (2 pts) ---
  let pbvScore = 0;
  if (latestPBV && pbvAvg) {
    if (latestPBV < pbvAvg * 0.8) pbvScore = 2;
    else if (latestPBV < pbvAvg) pbvScore = 1;
  }
  categories.push({
    name: 'PBV Band',
    score: pbvScore,
    maxScore: 2,
    detail: latestPBV ? `PBV ${latestPBV.toFixed(2)} vs AVG ${pbvAvg?.toFixed(2) || 'N/A'}` : 'N/A',
    icon: '📊',
  });
  totalScore += pbvScore;

  // --- 10. MOS > 30% (2 pts) ---
  let mosScore = 0;
  if (currentPrice && fairPrice && fairPrice > 0) {
    const mos = ((fairPrice - currentPrice) / fairPrice) * 100;
    if (mos >= 50) mosScore = 2;
    else if (mos >= 30) mosScore = 1;
  }
  categories.push({
    name: 'Margin of Safety',
    score: mosScore,
    maxScore: 2,
    detail: currentPrice && fairPrice ? `MOS ${(((fairPrice - currentPrice) / fairPrice) * 100).toFixed(0)}%` : 'N/A',
    icon: '🛡️',
  });
  totalScore += mosScore;

  // Rating
  let rating: 1 | 2 | 3 | 4 | 5 = 1;
  let ratingLabel = '';
  if (totalScore >= 17) { rating = 5; ratingLabel = 'หุ้นพิเศษ — หายากมาก'; }
  else if (totalScore >= 13) { rating = 4; ratingLabel = 'หุ้นดี — คุ้มค่าแก่การลงทุน'; }
  else if (totalScore >= 9) { rating = 3; ratingLabel = 'หุ้นพอใช้ — ต้องดูเพิ่มเติม'; }
  else if (totalScore >= 5) { rating = 2; ratingLabel = 'หุ้นเสี่ยง — ระวัง'; }
  else { rating = 1; ratingLabel = 'หุ้นไม่ผ่าน — ไม่ตรงเกณฑ์ VI'; }

  return {
    ticker,
    totalScore,
    maxScore: 20,
    rating,
    ratingLabel,
    categories,
  };
}

// ===================================================================
// 6. TREND ANALYSIS (CAGR + Earnings Quality)
// ===================================================================

export function calculateCAGR(values: (number | null)[]): number | null {
  const filtered = values.filter((v): v is number => v != null && v > 0);
  if (filtered.length < 2) return null;

  const start = filtered[0];
  const end = filtered[filtered.length - 1];
  const years = filtered.length - 1;

  if (start <= 0 || end <= 0 || years <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

export function calculateTrendAnalysis(
  ticker: string,
  history: StockHistory[]
): TrendAnalysis {
  const recent3 = history.slice(-3);
  const recent5 = history.slice(-5);
  const recent10 = history.slice(-10);

  const cagrs: CAGRData[] = [
    {
      metric: 'Revenue',
      cagr3y: calculateCAGR(recent3.map(h => h.revenue)),
      cagr5y: calculateCAGR(recent5.map(h => h.revenue)),
      cagr10y: calculateCAGR(recent10.map(h => h.revenue)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.revenue))),
    },
    {
      metric: 'Net Profit',
      cagr3y: calculateCAGR(recent3.map(h => h.netProfit)),
      cagr5y: calculateCAGR(recent5.map(h => h.netProfit)),
      cagr10y: calculateCAGR(recent10.map(h => h.netProfit)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.netProfit))),
    },
    {
      metric: 'EPS',
      cagr3y: calculateCAGR(recent3.map(h => h.eps)),
      cagr5y: calculateCAGR(recent5.map(h => h.eps)),
      cagr10y: calculateCAGR(recent10.map(h => h.eps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.eps))),
    },
    {
      metric: 'DPS',
      cagr3y: calculateCAGR(recent3.map(h => h.dps)),
      cagr5y: calculateCAGR(recent5.map(h => h.dps)),
      cagr10y: calculateCAGR(recent10.map(h => h.dps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.dps))),
    },
    {
      metric: 'BVPS',
      cagr3y: calculateCAGR(recent3.map(h => h.bvps)),
      cagr5y: calculateCAGR(recent5.map(h => h.bvps)),
      cagr10y: calculateCAGR(recent10.map(h => h.bvps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.bvps))),
    },
  ];

  // Earnings Quality
  const npmValues = recent5.map(h => h.npm).filter((v): v is number => v != null);
  let npmTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (npmValues.length >= 3) {
    const first = npmValues[0];
    const last = npmValues[npmValues.length - 1];
    if (last > first * 1.1) npmTrend = 'improving';
    else if (last < first * 0.9) npmTrend = 'declining';
  }

  const revGrowth = calculateCAGR(recent5.map(h => h.revenue));
  const profitGrowth = calculateCAGR(recent5.map(h => h.netProfit));
  let revenueVsProfit: 'healthy' | 'warning' | 'concern' = 'healthy';
  if (revGrowth !== null && profitGrowth !== null) {
    if (profitGrowth < revGrowth * 0.5) revenueVsProfit = 'concern';
    else if (profitGrowth < revGrowth) revenueVsProfit = 'warning';
  }

  const deValues = recent5.map(h => h.de).filter((v): v is number => v != null);
  let deTrend: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (deValues.length >= 3) {
    const first = deValues[0];
    const last = deValues[deValues.length - 1];
    if (last < first * 0.9) deTrend = 'improving';
    else if (last > first * 1.2) deTrend = 'deteriorating';
  }

  const dpsValues = history.map(h => h.dps).filter((v): v is number => v != null && v > 0);

  return {
    ticker,
    cagrs,
    earningsQuality: {
      npmTrend,
      revenueVsProfit,
      deTrend,
      dividendConsistency: dpsValues.length,
    },
  };
}

function getTrend(cagr: number | null): 'up' | 'down' | 'stable' {
  if (cagr === null) return 'stable';
  if (cagr > 0.03) return 'up';
  if (cagr < -0.03) return 'down';
  return 'stable';
}

// ===================================================================
// 7. SCENARIO ANALYSIS
// ===================================================================

export function calculateScenarioAnalysis(
  ticker: string,
  d0: number,
  currentPrice: number | null,
  years: number
): ScenarioAnalysis {
  const scenarios: Scenario[] = [
    { name: 'Bull Case', g: 0.07, ks: 0.10, probability: 0.25, fairPrice: 0 },
    { name: 'Base Case', g: 0.05, ks: 0.10, probability: 0.50, fairPrice: 0 },
    { name: 'Bear Case', g: 0.03, ks: 0.12, probability: 0.25, fairPrice: 0 },
  ];

  scenarios.forEach(s => {
    const result = calculateDDM(ticker, d0, s.g, s.ks, years, currentPrice);
    s.fairPrice = result.fairPrice;
  });

  const weightedFairPrice = scenarios.reduce(
    (sum, s) => sum + s.fairPrice * s.probability,
    0
  );

  return { ticker, scenarios, weightedFairPrice, currentPrice };
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

export function getStatus(
  price: number,
  mos30: number,
  mos40: number,
  mos50: number,
  fairPrice: number
): { label: string; color: string } {
  if (!price || price <= 0) return { label: '-', color: 'text-slate-400' };
  if (price <= mos50) return { label: 'MOS 50%', color: 'text-emerald-600 bg-emerald-100' };
  if (price <= mos40) return { label: 'MOS 40%', color: 'text-teal-600 bg-teal-100' };
  if (price <= mos30) return { label: 'MOS 30%', color: 'text-cyan-600 bg-cyan-100' };
  if (price < fairPrice) return { label: 'ต่ำกว่า FV', color: 'text-blue-600 bg-blue-100' };
  return { label: 'รอก่อนนะ', color: 'text-amber-600 bg-amber-100' };
}

export function calculateShares(budget: number, price: number): number {
  if (!price || price <= 0) return 0;
  return Math.floor(budget / price / 100) * 100;
}

export function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return '-';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(2);
}

export function formatPercent(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '-';
  return (val * 100).toFixed(decimals) + '%';
}

export function getRatingStars(rating: number): string {
  return '⭐'.repeat(rating);
}

export function getRatingColor(rating: number): string {
  switch (rating) {
    case 5: return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    case 4: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 3: return 'text-blue-600 bg-blue-50 border-blue-200';
    case 2: return 'text-amber-600 bg-amber-50 border-amber-200';
    default: return 'text-red-600 bg-red-50 border-red-200';
  }
}
