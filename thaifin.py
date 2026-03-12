
import yfinance as yf

# Monkeypatch yfinance cache to avoid peewee errors (sqlite db lock/permission issues)
try:
    import yfinance.cache as yf_cache
    class MockCache:
        def lookup(self, *args, **kwargs): return None
        def store(self, *args, **kwargs): pass
    
    # Replace the cache getter functions to return a dummy object that has 'lookup' method
    def mock_get_cache():
        return MockCache()

    yf_cache.get_cookie_cache = mock_get_cache
    yf_cache.get_tz_cache = mock_get_cache
    print("[thaifin] Monkeypatched yfinance cache to avoid peewee errors")
except Exception as e:
    print(f"[thaifin] Failed to monkeypatch yfinance cache: {e}")

import pandas as pd
import numpy as np
import traceback

class Stock:
    def __init__(self, ticker):
        self.symbol = ticker.replace('.BK', '')
        # Ensure .BK suffix for yfinance
        self.ticker_str = f"{self.symbol}.BK"
        self.ticker = yf.Ticker(self.ticker_str)
        
        # Try to fetch info to populate metadata
        try:
            self.info = self.ticker.info
            self.company_name = self.info.get('longName', '')
            self.sector = self.info.get('sector', '')
            self.industry = self.info.get('industry', '')
        except:
            self.info = {}
            self.company_name = ''
            self.sector = ''
            self.industry = ''

    @property
    def yearly_dataframe(self):
        try:
            # Fetch financials
            fin = self.ticker.financials.T
            bs = self.ticker.balance_sheet.T
            
            if fin.empty:
                return pd.DataFrame()

            # Merge financials and balance sheet
            # yfinance uses same dates for index usually
            df = fin.join(bs, how='outer')
            
            data = []
            for date, row in df.iterrows():
                try:
                    # Extract values with fallbacks for different yfinance versions/mappings
                    revenue = row.get('Total Revenue', row.get('TotalRevenue', np.nan))
                    net_profit = row.get('Net Income', row.get('NetIncome', np.nan))
                    eps = row.get('Basic EPS', row.get('BasicEPS', np.nan))
                    
                    total_debt = row.get('Total Debt', row.get('TotalDebt', np.nan))
                    equity = row.get('Stockholders Equity', row.get('StockholdersEquity', np.nan))
                    if pd.isna(equity):
                         equity = row.get('Total Equity Gross Minority Interest', np.nan)
                    
                    shares = row.get('Share Issued', row.get('Ordinary Shares Number', np.nan))
                    if pd.isna(shares) and pd.notna(eps) and eps != 0 and pd.notna(net_profit):
                        shares = net_profit / eps

                    assets = row.get('Total Assets', row.get('TotalAssets', np.nan))
                    gross_profit = row.get('Gross Profit', row.get('GrossProfit', np.nan))

                    # Calculate Ratios
                    de = (total_debt / equity) if (pd.notna(total_debt) and pd.notna(equity) and equity != 0) else np.nan
                    npm = (net_profit / revenue * 100) if (pd.notna(net_profit) and pd.notna(revenue) and revenue != 0) else np.nan
                    roe = (net_profit / equity * 100) if (pd.notna(net_profit) and pd.notna(equity) and equity != 0) else np.nan
                    roa = (net_profit / assets * 100) if (pd.notna(net_profit) and pd.notna(assets) and assets != 0) else np.nan
                    gpm = (gross_profit / revenue * 100) if (pd.notna(gross_profit) and pd.notna(revenue) and revenue != 0) else np.nan
                    
                    bvps = (equity / shares) if (pd.notna(equity) and pd.notna(shares) and shares != 0) else np.nan
                    
                    # Store
                    data.append({
                        'fiscal': date,
                        'earning_per_share': eps,
                        'revenue': revenue,
                        'net_profit': net_profit,
                        'debt_to_equity': de,
                        'npm': npm,
                        'roe': roe,
                        'roa': roa,
                        'gpm': gpm,
                        'book_value_per_share': bvps,
                        'dividend_yield': np.nan, # Requires price history matching
                        'total_debt': total_debt,
                        'equity': equity,
                        'price_earning_ratio': np.nan,
                        'price_book_value': np.nan,
                        'mkt_cap': np.nan,
                        'close': np.nan
                    })
                except Exception as e:
                    print(f"Error processing row {date}: {e}")
                    continue
            
            if not data:
                return pd.DataFrame()

            return pd.DataFrame(data).sort_values('fiscal')
            
        except Exception as e:
            print(f"Error getting yearly data for {self.symbol}: {e}")
            traceback.print_exc()
            return pd.DataFrame()

    @property
    def quarter_dataframe(self):
        # Similar logic for quarterly could be added here
        # For now return empty to prevent errors if called
        return pd.DataFrame()
