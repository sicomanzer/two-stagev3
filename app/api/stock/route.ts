
import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  // Try to suppress notices if the method exists
  try {
    const yahooFinance = new YahooFinance();
    if (typeof (yahooFinance as any).suppressNotices === 'function') {
      (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
    }
  } catch (e) {
    // Ignore error if suppressNotices fails
  }

  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    // Add .BK suffix for Thai stocks if not present
    const symbol = ticker.toUpperCase().endsWith('.BK') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.BK`;

    const yahooFinance = new YahooFinance();
    
    // Setup dates for historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 20);

    // Fetch data in parallel
    const [quoteResult, chartResult, fundamentalsResult] = await Promise.allSettled([
      yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'price', 'incomeStatementHistory']
      }, { validateResult: false }),
      yahooFinance.chart(symbol, {
        period1: startDate.toISOString().split('T')[0],
        interval: '1mo',
        events: 'div'
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        type: 'annual',
        module: 'all'
      })
    ]);

    const quote: any = quoteResult.status === 'fulfilled' ? quoteResult.value : {};
    let chartData: any = chartResult.status === 'fulfilled' ? chartResult.value : null;
    let financials: any[] = fundamentalsResult.status === 'fulfilled' ? (fundamentalsResult.value as any[]) : [];

    if (quoteResult.status === 'rejected') console.error('Quote fetch failed:', quoteResult.reason);
    if (chartResult.status === 'rejected') console.error('Chart fetch failed:', chartResult.reason);
    if (fundamentalsResult.status === 'rejected') console.error('Fundamentals fetch failed:', fundamentalsResult.reason);

    // Process History Data
    const history: any[] = [];
    const yearMap = new Map<number, any>();
    
    // Process Financials (Annual)
    let lastShares = 0;
    let lastEquity = 0;

    if (financials && financials.length > 0) {
        // Sort ascending by date to track last known values
        financials.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        financials.forEach((f: any) => {
            if (!f.date) return;
            const year = new Date(f.date).getFullYear();
            
            // Extract Metrics
            const revenue = f.totalRevenue || f.operatingRevenue;
            const netProfit = f.netIncome || f.netIncomeCommonStockholders || f.netIncomeContinuousOperations;
            const eps = f.dilutedEPS || f.basicEPS;
            
            // Debt Calculation
            let totalDebt = f.totalDebt;
            if (totalDebt === undefined || totalDebt === null) {
                 totalDebt = (f.currentDebt || 0) + (f.longTermDebt || 0);
            }
            
            const totalEquity = f.totalEquityGrossMinorityInterest || f.totalStockholderEquity;
            const shares = f.shareIssued || f.dilutedAverageShares || f.basicAverageShares;
            
            if (shares) lastShares = shares;
            if (totalEquity) lastEquity = totalEquity;
            
            const de = (totalDebt && totalEquity) ? totalDebt / totalEquity : null;
            const npm = (netProfit && revenue) ? (netProfit / revenue) * 100 : null;
            
            // BVPS (Book Value Per Share)
            const bvps = (totalEquity && shares) ? totalEquity / shares : null;

            yearMap.set(year, {
                year,
                revenue,
                netProfit,
                eps,
                de,
                npm,
                bvps,
                shares: shares || null,
                dps: 0, // Will fill later
                price: null // Will fill later
            });
        });
    }

    // Merge Income Statement History (Legacy) for missing years (e.g. 2025)
    if (quote.incomeStatementHistory && quote.incomeStatementHistory.incomeStatementHistory) {
        quote.incomeStatementHistory.incomeStatementHistory.forEach((f: any) => {
             if (!f.endDate) return;
             const year = new Date(f.endDate).getFullYear();
             
             // If year already exists and has key data, skip
             const existing = yearMap.get(year);
             if (existing && existing.revenue && existing.netProfit) return;
             
             // Otherwise, add or update
             const revenue = f.totalRevenue || f.operatingRevenue;
             const netProfit = f.netIncome || f.netIncomeCommonStockholders;
             
             // Try to calculate EPS if missing
             let eps = f.dilutedEPS || f.basicEPS;
             if (!eps && netProfit && lastShares) {
                 eps = netProfit / lastShares;
             }
             
             // Try to calculate NPM
             const npm = (netProfit && revenue) ? (netProfit / revenue) * 100 : null;
             
             const entry = existing || {
                 year,
                 dps: 0,
                 price: null,
                 de: null,
                 bvps: null
             };
             
             if (revenue) entry.revenue = revenue;
             if (netProfit) entry.netProfit = netProfit;
             if (eps) entry.eps = eps;
             if (npm) entry.npm = npm;
             
             yearMap.set(year, entry);
        });
    }

    // ===== thaifin Integration: Backfill 10+ years of fundamentals =====
    // Yahoo Finance typically only provides 4-5 years of fundamental data for Thai stocks.
    // thaifin (Python microservice on port 5001) provides 10-16 years from SET/Settrade/Finnomena.
    // Strategy: Use thaifin data to FILL GAPS only — Yahoo data takes priority for overlapping years.
    try {
        const tickerClean = symbol.replace('.BK', '');
        const thaifinRes = await fetch(`http://localhost:5001/api/fundamentals?ticker=${tickerClean}`, {
            signal: AbortSignal.timeout(8000) // 8s timeout
        });

        if (thaifinRes.ok) {
            const thaifinData = await thaifinRes.json();

            if (thaifinData.history && Array.isArray(thaifinData.history)) {
                thaifinData.history.forEach((tf: any) => {
                    const year = tf.year;
                    if (!year) return;

                    const existing = yearMap.get(year);

                    if (!existing) {
                        // Year doesn't exist at all — add full entry from thaifin
                        yearMap.set(year, {
                            year,
                            revenue: tf.revenue || null,
                            netProfit: tf.netProfit || null,
                            eps: tf.eps || null,
                            de: tf.de || null,
                            npm: tf.npm || null,
                            bvps: tf.bvps || null,
                            roe: tf.roe || null,
                            roa: tf.roa || null,
                            dps: 0,
                            price: tf.close || null,
                            source: 'thaifin'
                        });
                    } else {
                        // Year exists — fill in missing fields only
                        if (!existing.revenue && tf.revenue) existing.revenue = tf.revenue;
                        if (!existing.netProfit && tf.netProfit) existing.netProfit = tf.netProfit;
                        if (!existing.eps && tf.eps) existing.eps = tf.eps;
                        if (existing.de == null && tf.de != null) existing.de = tf.de;
                        if (existing.npm == null && tf.npm != null) existing.npm = tf.npm;
                        if (!existing.bvps && tf.bvps) existing.bvps = tf.bvps;
                        if (!existing.roe && tf.roe) existing.roe = tf.roe;
                        if (!existing.roa && tf.roa) existing.roa = tf.roa;
                        yearMap.set(year, existing);
                    }
                });
            }

            console.log(`[thaifin] ✅ Merged ${thaifinData.totalYears || 0} years for ${tickerClean}`);
        }
    } catch (thaifinErr: any) {
        // thaifin server not available — gracefully degrade to Yahoo-only data
        console.warn(`[thaifin] ⚠️ Server unavailable (${thaifinErr.message}), using Yahoo data only`);
    }

    // Process Dividends from Chart Events
    const dividendByYear = new Map<number, number>();
    try {
       if (chartData && chartData.events && chartData.events.dividends) {
           const divs = chartData.events.dividends;
           if (Array.isArray(divs)) {
               divs.forEach((d: any) => {
                   if (d.date && d.amount) {
                       const year = new Date(d.date).getFullYear();
                       const current = dividendByYear.get(year) || 0;
                       dividendByYear.set(year, current + d.amount);
                   }
               });
           } else {
               // Handle as object map if it comes that way (legacy)
               Object.values(divs).forEach((d: any) => {
                   if (d.date && d.amount) {
                       const dateVal = typeof d.date === 'number' ? new Date(d.date * 1000) : new Date(d.date);
                       const year = dateVal.getFullYear();
                       const current = dividendByYear.get(year) || 0;
                       dividendByYear.set(year, current + d.amount);
                   }
               });
           }
       }
    } catch(e) { console.error('Error processing dividends:', e); }

    // Process Price History to get Annual Average/Close Price
    const priceByYear = new Map<number, number>();
    const monthlyData: any[] = []; // Store monthly data for PE/PBV Bands

    if (chartData && chartData.quotes) {
        const tempPriceSum = new Map<number, { sum: number, count: number }>();
        
        // Sort financials by date descending for easier lookup
        const sortedFinancials = [...financials].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // ===== Build combined EPS/BVPS lookup from Yahoo financials + thaifin yearMap =====
        // This enables PE/PBV bands to extend to 10+ years instead of only 4-5 years.
        // For each monthly price point, we try: 1) Yahoo financials (most precise), 2) thaifin yearMap (broader coverage)
        const yearlyEpsBvps = new Map<number, { eps: number | null; bvps: number | null; shares?: number | null; source?: string; }>();
        
        // First: populate from thaifin yearMap (broader but annual-level precision)
        yearMap.forEach((entry, year) => {
            yearlyEpsBvps.set(year, {
                eps: entry.eps || null,
                bvps: entry.bvps || null,
                shares: entry.shares || null, // Add shares to yearlyEpsBvps
                source: entry.source || null
            });
        });
        
        // Then: override with Yahoo financials where available (more precise per-date data)
        sortedFinancials.forEach((f: any) => {
            if (!f.date) return;
            const year = new Date(f.date).getFullYear();
            const eps = f.dilutedEPS || f.basicEPS;
            const totalEquity = f.totalEquityGrossMinorityInterest || f.totalStockholderEquity;
            const shares = f.shareIssued || f.dilutedAverageShares || f.basicAverageShares;
            const bvps = (totalEquity && shares) ? totalEquity / shares : null;
            if (eps || bvps) {
                yearlyEpsBvps.set(year, {
                    eps: eps || yearlyEpsBvps.get(year)?.eps || null,
                    bvps: bvps || yearlyEpsBvps.get(year)?.bvps || null,
                });
            }
        });

        chartData.quotes.forEach((q: any) => {
            if (!q.date || !q.close) return;
            const date = new Date(q.date);
            const year = date.getFullYear();
            
            // Annual Price Calculation
            const current = tempPriceSum.get(year) || { sum: 0, count: 0 };
            tempPriceSum.set(year, { sum: current.sum + q.close, count: current.count + 1 });

            // Monthly Data for PE/PBV Bands
            // Strategy: Try Yahoo financials first (date-precise), then fall back to yearMap (annual)
            let eps: number | null = null;
            let bvps: number | null = null;

            // 1) Try Yahoo financials (most recent report before this quote date)
            const report = sortedFinancials.find(f => new Date(f.date) <= date);
            if (report) {
                eps = report.dilutedEPS || report.basicEPS || null;
                const totalEquity = report.totalEquityGrossMinorityInterest || report.totalStockholderEquity;
                const shares = report.shareIssued || report.dilutedAverageShares || report.basicAverageShares;
                bvps = (totalEquity && shares) ? totalEquity / shares : null;
            }

            // 2) Fallback to thaifin yearMap if Yahoo didn't have data
            if (!eps || !bvps) {
                // Try current year first, then previous year (for early months before annual report is published)
                const yearData = yearlyEpsBvps.get(year) || yearlyEpsBvps.get(year - 1);
                if (yearData) {
                    if (!eps && yearData.eps) eps = yearData.eps;
                    if (!bvps && yearData.bvps) bvps = yearData.bvps;
                }
            }

            const pe = (eps && eps > 0) ? q.close / eps : null;
            const pbv = (bvps && bvps > 0) ? q.close / bvps : null;

            if (pe !== null || pbv !== null) {
                monthlyData.push({
                    date: date.toISOString().split('T')[0], // YYYY-MM-DD
                    price: q.close,
                    pe,
                    pbv
                });
            }
        });

        tempPriceSum.forEach((val, year) => {
            priceByYear.set(year, val.sum / val.count);
        });
    }

    // Calculate Band Statistics (AVG, SD)
    const calculateStats = (data: number[]) => {
        if (data.length === 0) return { avg: 0, sd: 0 };
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length;
        const squareDiffs = data.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
        const sd = Math.sqrt(avgSquareDiff);
        return { avg, sd };
    };

    const peValues = monthlyData.map(d => d.pe).filter(v => v !== null && v > 0 && v < 100); // Filter outliers
    const pbvValues = monthlyData.map(d => d.pbv).filter(v => v !== null && v > 0 && v < 20); // Filter outliers

    const peStats = calculateStats(peValues);
    const pbvStats = calculateStats(pbvValues);

    const ratioBands = {
        pe: {
            data: monthlyData.map(d => ({
                date: d.date,
                value: d.pe,
                price: d.price
            })).filter(d => d.value !== null && d.value > 0 && d.value < 100),
            stats: peStats
        },
        pbv: {
            data: monthlyData.map(d => ({
                date: d.date,
                value: d.pbv,
                price: d.price
            })).filter(d => d.value !== null && d.value > 0 && d.value < 20),
            stats: pbvStats
        }
    };

    // Merge everything into History Array
    // We want last 20 years, e.g. 2004-2024
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 20; y <= currentYear; y++) {
        let entry = yearMap.get(y) || { year: y };
        
        // Add Dividend
        if (dividendByYear.has(y)) {
            entry.dps = dividendByYear.get(y);
        }
        
        // Add Price
        if (priceByYear.has(y)) {
            entry.price = priceByYear.get(y);
        }

        // Calculate PE and PBV if possible
        if (entry.price && entry.eps) {
            entry.pe = entry.price / entry.eps;
        }
        if (entry.price && entry.bvps) {
            entry.pbv = entry.price / entry.bvps;
        }

        // Only add if we have at least some data
        if (entry.revenue || entry.netProfit || entry.eps || entry.dps || entry.price) {
             history.push(entry);
        }
    }

    // Sort by year
    history.sort((a, b) => a.year - b.year);

    // Manual Overrides for known incorrect data from Yahoo
    const overrides: Record<string, number> = {
      'BKIH.BK': 17.0,
      'HTC.BK': 1.02,
      'TACC.BK': 0.4,
      'TLI.BK': 0.5,
      'TTW.BK': 0.60,
      'ICHI.BK': 1.05,
      'TU.BK': 0.7,
      'MEGA.BK': 1.60,
      'SCB.BK': 10.44,
      'TISCO.BK': 7.75,
      'MC.BK': 0.96
    };

    let d0 = quote.summaryDetail?.dividendRate || quote.summaryDetail?.trailingAnnualDividendRate;
    
    // Apply override if exists
    if (overrides[symbol]) {
      d0 = overrides[symbol];
    }

    const currentPrice = quote.financialData?.currentPrice || quote.price?.regularMarketPrice;
    
    // Recalculate yield if we have D0 and Price (Override yield if D0 was overridden)
    let dividendYield = quote.summaryDetail?.dividendYield;
    if (d0 && currentPrice) {
      dividendYield = d0 / currentPrice;
    }

    const data = {
      currentPrice: currentPrice,
      d0: d0,
      roe: quote.financialData?.returnOnEquity,
      payoutRatio: quote.summaryDetail?.payoutRatio,
      // Additional fields for table
      pe: quote.summaryDetail?.trailingPE,
      pbv: quote.defaultKeyStatistics?.priceToBook,
      eps: quote.defaultKeyStatistics?.trailingEps || quote.defaultKeyStatistics?.forwardEps,
      debtToEquity: quote.financialData?.debtToEquity !== undefined && quote.financialData?.debtToEquity !== null ? quote.financialData.debtToEquity / 100 : undefined, // Yahoo returns percentage (e.g. 150 for 1.5), we need ratio
      roa: quote.financialData?.returnOnAssets,
      marketCap: quote.summaryDetail?.marketCap,
      dividendYield: dividendYield,
      shortName: quote.price?.shortName,
      longName: quote.price?.longName,
      currency: quote.financialData?.financialCurrency,
      history: history, // Add history to response
      ratioBands: ratioBands, // Add detailed monthly ratio bands
      
      // Simple FCF proxy calculation (Net Income as fallback if FCF not directly available)
      fcf: quote.financialData?.freeCashflow || 
           (history.length > 0 && history[history.length - 1].netProfit ? history[history.length - 1].netProfit : null)
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data', details: error.message }, { status: 500 });
  }
}
