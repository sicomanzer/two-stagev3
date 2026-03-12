import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = (searchParams.get('tickers') || 'BKIH.BK,HTC.BK,TACC.BK,TLI.BK').split(',');

  try {
    const results: Record<string, any> = {};
    const yahooFinance = new YahooFinance();
    
    // Suppress notices
    try {
      if (typeof (yahooFinance as any).suppressNotices === 'function') {
        (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
      }
    } catch (e) {}

    for (const ticker of tickers) {
      try {
        // Disable validation to allow partial/invalid schema data through
        const quote: any = await yahooFinance.quoteSummary(ticker, {
          modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'price', 'calendarEvents', 'earnings']
        }, { validateResult: false });
        
        results[ticker] = {
          dividendRate: quote.summaryDetail?.dividendRate,
          trailingAnnualDividendRate: quote.summaryDetail?.trailingAnnualDividendRate,
          trailingAnnualDividendYield: quote.summaryDetail?.trailingAnnualDividendYield,
          dividendYield: quote.summaryDetail?.dividendYield,
          lastDividendValue: quote.defaultKeyStatistics?.lastDividendValue,
          lastDividendDate: quote.defaultKeyStatistics?.lastDividendDate ? new Date(quote.defaultKeyStatistics.lastDividendDate * 1000).toISOString() : null,
        };
      } catch (e: any) {
        results[ticker] = { error: e.message };
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
