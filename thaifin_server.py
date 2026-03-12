"""
thaifin microservice — ดึงข้อมูลงบการเงินหุ้นไทยย้อนหลัง 10+ ปี
ใช้เป็น backend เสริมให้ Next.js app เรียกผ่าน HTTP
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from thaifin import Stock
import traceback

app = Flask(__name__)
CORS(app)  # Allow Next.js to call this server


@app.route('/api/fundamentals', methods=['GET'])
def get_fundamentals():
    """
    GET /api/fundamentals?ticker=ADVANC
    Returns 10+ years of annual fundamental data:
    EPS, Revenue, Net Profit, D/E, NPM%, and more.
    """
    ticker = request.args.get('ticker', '').strip().upper()
    
    if not ticker:
        return jsonify({'error': 'ticker parameter is required'}), 400
    
    # Remove .BK suffix if present (thaifin uses bare symbol)
    ticker_clean = ticker.replace('.BK', '')
    
    try:
        stock = Stock(ticker_clean)
        df = stock.yearly_dataframe
        
        if df.empty:
            return jsonify({'error': f'No data found for {ticker_clean}'}), 404
        
        # Reset index to get fiscal year as a column, converting Period to int
        df = df.reset_index()
        
        # Build response — yearly data sorted by fiscal year
        history = []
        for _, row in df.iterrows():
            # Extract year from fiscal column (may be Period, int, or string)
            fiscal_val = row.get('fiscal', row.get('Fiscal', None))
            if fiscal_val is None:
                continue
            try:
                year = int(fiscal_val.year) if hasattr(fiscal_val, 'year') else int(fiscal_val)
            except (ValueError, TypeError):
                continue
            
            entry = {
                'year': year,
                'eps': _safe_float(row.get('earning_per_share')),
                'revenue': _safe_float(row.get('revenue')),
                'netProfit': _safe_float(row.get('net_profit')),
                'de': _safe_float(row.get('debt_to_equity')),
                'npm': _safe_float(row.get('npm')),
                'roe': _safe_float(row.get('roe')),
                'roa': _safe_float(row.get('roa')),
                'gpm': _safe_float(row.get('gpm')),
                'bvps': _safe_float(row.get('book_value_per_share')),
                'dividendYield': _safe_float(row.get('dividend_yield')),
                'totalDebt': _safe_float(row.get('total_debt')),
                'equity': _safe_float(row.get('equity')),
                'pe': _safe_float(row.get('price_earning_ratio')),
                'pbv': _safe_float(row.get('price_book_value')),
                'mktCap': _safe_float(row.get('mkt_cap')),
                'close': _safe_float(row.get('close')),
            }
            history.append(entry)
        
        # Sort by year ascending
        history.sort(key=lambda x: x['year'])
        
        # Also get company info
        company_info = {
            'symbol': ticker_clean,
            'companyName': str(getattr(stock, 'company_name', '') or ''),
            'sector': str(getattr(stock, 'sector', '') or ''),
            'industry': str(getattr(stock, 'industry', '') or ''),
        }
        
        return jsonify({
            'info': company_info,
            'history': history,
            'totalYears': len(history),
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': f'Failed to fetch data for {ticker_clean}: {str(e)}'
        }), 500


@app.route('/api/fundamentals/quarter', methods=['GET'])
def get_quarter_fundamentals():
    """
    GET /api/fundamentals/quarter?ticker=ADVANC
    Returns quarterly fundamental data (10+ years).
    """
    ticker = request.args.get('ticker', '').strip().upper()
    
    if not ticker:
        return jsonify({'error': 'ticker parameter is required'}), 400
    
    ticker_clean = ticker.replace('.BK', '')
    
    try:
        stock = Stock(ticker_clean)
        df = stock.quarter_dataframe
        
        if df.empty:
            return jsonify({'error': f'No data found for {ticker_clean}'}), 404
        
        history = []
        for idx, row in df.iterrows():
            # idx is like "2009Q1"
            entry = {
                'period': str(idx),
                'eps': _safe_float(row.get('earning_per_share')),
                'revenue': _safe_float(row.get('revenue')),
                'netProfit': _safe_float(row.get('net_profit')),
                'de': _safe_float(row.get('debt_to_equity')),
                'npm': _safe_float(row.get('npm')),
                'roe': _safe_float(row.get('roe')),
                'roa': _safe_float(row.get('roa')),
            }
            history.append(entry)
        
        return jsonify({
            'symbol': ticker_clean,
            'history': history,
            'totalQuarters': len(history),
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': f'Failed to fetch data for {ticker_clean}: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'thaifin-server'})


def _safe_float(val):
    """Safely convert a value to float, return None if not possible."""
    if val is None:
        return None
    try:
        import math
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


if __name__ == '__main__':
    print("[thaifin] Server starting on http://localhost:5001")
    print("Endpoints:")
    print("   GET /api/fundamentals?ticker=ADVANC  (annual, 10+ years)")
    print("   GET /api/fundamentals/quarter?ticker=ADVANC  (quarterly)")
    print("   GET /api/health")
    app.run(host='0.0.0.0', port=5001, debug=False)
