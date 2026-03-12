import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import sys

try:
    from tabulate import tabulate
except ImportError:
    print("กรุณาติดตั้งไลบรารี tabulate ก่อนรันโปรแกรม: pip install tabulate")
    sys.exit(1)

# กำหนดสี ANSI สำหรับการแสดงผลใน Console
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def get_dividend_cagr(ticker_obj, years=5):
    """
    ฟังก์ชันคำนวณอัตราการเติบโตของเงินปันผล (g) แบบ CAGR ย้อนหลัง
    """
    divs = ticker_obj.dividends
    if divs.empty or len(divs) < years:
        return None
    
    # จัดกลุ่มเงินปันผลตามปี
    divs_per_year = divs.groupby(divs.index.year).sum()
    
    current_year = datetime.now().year
    
    # หาปีเริ่มต้นและปีสิ้นสุดที่มีข้อมูล
    years_available = divs_per_year.index.tolist()
    
    # ถ้าไม่มีข้อมูลเพียงพอ
    if len(years_available) < 2:
        return None
        
    # พยายามหาข้อมูลย้อนหลังตามจำนวนปีที่กำหนด
    end_year = years_available[-1]
    start_year = end_year - years
    
    if start_year in divs_per_year.index:
        start_val = divs_per_year[start_year]
        end_val = divs_per_year[end_year]
        n = years
    else:
        # ถ้าไม่มีข้อมูลย้อนหลังถึงปีที่กำหนด ให้ใช้ปีแรกสุดที่มี
        start_year = years_available[0]
        start_val = divs_per_year[start_year]
        end_val = divs_per_year[end_year]
        n = end_year - start_year
        
    if start_val <= 0 or n <= 0:
        return None
        
    # คำนวณ CAGR
    cagr = (end_val / start_val) ** (1/n) - 1
    return cagr

def calculate_two_stage_ddm(ticker, ks=0.10, g=None, explicit_years=5):
    """
    ฟังก์ชันหลักสำหรับคำนวณ Two-Stage Dividend Discount Model
    """
    try:
        stock = yf.Ticker(ticker)
        
        # ดึงราคาปัจจุบัน
        hist = stock.history(period="1d")
        if hist.empty:
            return {"error": f"ไม่พบข้อมูลราคาสำหรับ {ticker}"}
        current_price = hist['Close'].iloc[-1]
        
        # ดึงข้อมูลปันผล 12 เดือนล่าสุด (TTM) เพื่อหา D0
        divs = stock.dividends
        if divs.empty:
            return {"error": f"ไม่พบข้อมูลเงินปันผลสำหรับ {ticker}"}
            
        # คำนวณ D0 (ปันผล 1 ปีล่าสุด)
        # ใช้วิธีดึงข้อมูลย้อนหลัง 365 วันจากวันล่าสุดที่มีข้อมูล
        last_div_date = divs.index[-1]
        one_year_ago = last_div_date - pd.DateOffset(years=1)
        d0 = divs[divs.index > one_year_ago].sum()
        
        if d0 <= 0:
            # ถ้าไม่มีปันผลใน 1 ปีล่าสุด ลองดูปีปฏิทินล่าสุด
            last_year = datetime.now().year - 1
            divs_last_year = divs[divs.index.year == last_year].sum()
            if divs_last_year > 0:
                d0 = divs_last_year
            else:
                return {"error": f"หุ้น {ticker} ไม่มีการจ่ายปันผลในรอบปีที่ผ่านมา"}
        
        # คำนวณ g ถ้าไม่ได้ระบุมา
        calculated_g = False
        if g is None:
            g = get_dividend_cagr(stock, years=5)
            calculated_g = True
            if g is None:
                return {"error": f"ไม่สามารถคำนวณอัตราการเติบโต (g) ย้อนหลังได้ โปรดระบุค่า g เอง"}
                
        # ตรวจสอบค่า g
        if g < 0:
            if calculated_g:
                return {"error": f"อัตราการเติบโต (g) ที่คำนวณได้ติดลบ ({g*100:.2f}%) โปรดระบุค่า g เอง"}
            else:
                return {"error": f"อัตราการเติบโต (g) ติดลบ ({g*100:.2f}%)"}
                
        if g >= ks:
            return {"error": f"อัตราการเติบโต (g={g*100:.2f}%) ต้องน้อยกว่าอัตราผลตอบแทนที่คาดหวัง (ks={ks*100:.2f}%)"}
            
        # สร้างตารางการคำนวณแบบ Excel
        current_year = datetime.now().year
        table_data = []
        
        # ปีที่ 0 (ปัจจุบัน)
        table_data.append([current_year, d0, "-", "-", f"{ks*100:.2f}%"])
        
        pv_sum = 0
        prev_d = d0
        
        # Explicit period (ปีที่ 1 ถึง explicit_years)
        for t in range(1, explicit_years + 1):
            year = current_year + t
            d_t = prev_d * (1 + g)
            pv_t = d_t / ((1 + ks) ** t)
            pv_sum += pv_t
            table_data.append([year, d_t, pv_t, f"{g*100:.2f}%", f"{ks*100:.2f}%"])
            prev_d = d_t
            
        # Terminal Year
        terminal_year = current_year + explicit_years + 1
        d_terminal = prev_d * (1 + g) # D_{n+1}
        tv = d_terminal / (ks - g)    # Terminal Value ที่สิ้นปี explicit_years
        pv_tv = tv / ((1 + ks) ** explicit_years) # Discount TV กลับมาที่ปัจจุบัน
        
        # แสดงแถว Terminal แบบเดียวกับ Excel
        table_data.append([f"Terminal ({terminal_year})", d_terminal, pv_tv, f"+{g*100:.2f}%", f"{ks*100:.2f}%"])
        
        # คำนวณ Fair Price
        fair_price = pv_sum + pv_tv
        
        # คำนวณ Margin of Safety
        margin = ((fair_price - current_price) / current_price) * 100
        
        # กำหนดสถานะ
        if margin >= 15:
            status = "Undervalued"
            color = GREEN
        elif margin <= -15:
            status = "Overvalued"
            color = RED
        else:
            status = "Fair"
            color = YELLOW
            
        return {
            "ticker": ticker,
            "current_price": current_price,
            "d0": d0,
            "g": g,
            "ks": ks,
            "fair_price": fair_price,
            "margin": margin,
            "status": status,
            "color": color,
            "table_data": table_data
        }
        
    except Exception as e:
        return {"error": f"เกิดข้อผิดพลาดในการคำนวณ {ticker}: {str(e)}"}

def print_ddm_result(result):
    """
    ฟังก์ชันแสดงผลลัพธ์การประเมินมูลค่าหุ้นรายตัว
    """
    if "error" in result:
        print(f"{RED}Error: {result['error']}{RESET}")
        return
        
    print(f"\n{'='*70}")
    print(f"ผลการประเมินมูลค่าหุ้น {result['ticker']} ด้วย Two-Stage DDM")
    print(f"{'='*70}")
    print(f"ราคาปัจจุบัน (Current Price): {result['current_price']:.2f} บาท")
    print(f"เงินปันผลปีปัจจุบัน (D0): {result['d0']:.4f} บาท")
    print(f"อัตราการเติบโต (g): {result['g']*100:.2f}%")
    print(f"อัตราผลตอบแทนที่ต้องการ (ks): {result['ks']*100:.2f}%")
    print("-" * 70)
    
    headers = ["ปี", "Dividend per share", "Present Value", "Growth", "K"]
    
    # จัดรูปแบบตัวเลขในตาราง
    formatted_table = []
    for row in result['table_data']:
        formatted_row = [
            row[0],
            f"{row[1]:.4f}" if isinstance(row[1], (int, float)) else row[1],
            f"{row[2]:.4f}" if isinstance(row[2], (int, float)) else row[2],
            row[3],
            row[4]
        ]
        formatted_table.append(formatted_row)
        
    print(tabulate(formatted_table, headers=headers, tablefmt="grid", stralign="right"))
    print("-" * 70)
    print(f"มูลค่าที่เหมาะสม (Fair Price): {result['fair_price']:.2f} บาท")
    print(f"ส่วนเผื่อเพื่อความปลอดภัย (Margin of Safety): {result['color']}{result['margin']:.2f}%{RESET}")
    print(f"สถานะ: {result['color']}{result['status']}{RESET}")
    print(f"{'='*70}\n")

def screen_multiple_stocks(ticker_list, ks=0.10, g=None, explicit_years=5, min_margin=15):
    """
    ฟังก์ชันสแกนหุ้นหลายตัวและแสดงผลเป็นตาราง
    """
    print(f"\nกำลังสแกนหุ้น {len(ticker_list)} ตัว...")
    results = []
    
    for ticker in ticker_list:
        res = calculate_two_stage_ddm(ticker, ks, g, explicit_years)
        if "error" in res:
            results.append([ticker, "-", "-", "-", "-", "-", "-", RED + "Error" + RESET, res['error']])
        else:
            # กำหนดคำแนะนำ
            rec = "BUY" if res['margin'] >= min_margin else ("SELL" if res['margin'] <= -min_margin else "HOLD")
            rec_color = GREEN if rec == "BUY" else (RED if rec == "SELL" else YELLOW)
            
            results.append([
                ticker,
                f"{res['current_price']:.2f}",
                f"{res['d0']:.4f}",
                f"{res['g']*100:.2f}%",
                f"{res['ks']*100:.2f}%",
                f"{res['fair_price']:.2f}",
                f"{res['color']}{res['margin']:.2f}%{RESET}",
                f"{res['color']}{res['status']}{RESET}",
                f"{rec_color}{rec}{RESET}"
            ])
            
    headers = ["Ticker", "Current Price", "D0", "g(%)", "ks", "Fair Price", "Margin%", "Status", "Recommendation"]
    print("\n" + tabulate(results, headers=headers, tablefmt="pretty", stralign="right"))

def console_menu():
    """
    เมนูโต้ตอบกับผู้ใช้ผ่าน Console
    """
    while True:
        print("\n" + "="*60)
        print("โปรแกรมประเมินมูลค่าหุ้นด้วย Two-Stage DDM (อ.กวี)")
        print("="*60)
        print("1. ประเมินมูลค่าหุ้นรายตัว")
        print("2. สแกนหุ้นหลายตัว (Screening)")
        print("3. ออกจากโปรแกรม")
        
        choice = input("เลือกเมนู (1-3): ")
        
        if choice == '1':
            ticker = input("ป้อนชื่อหุ้น (เช่น ADVANC.BK): ").strip().upper()
            if not ticker.endswith('.BK') and not ticker.endswith('.bk'):
                ticker += '.BK'
                
            ks_input = input("ป้อน ks (%) [ค่าเริ่มต้น 10.0]: ").strip()
            ks = float(ks_input)/100 if ks_input else 0.10
            
            g_input = input("ป้อน g (%) [เว้นว่างเพื่อคำนวณอัตโนมัติ]: ").strip()
            g = float(g_input)/100 if g_input else None
            
            years_input = input("ป้อนจำนวนปี Explicit [ค่าเริ่มต้น 5]: ").strip()
            years = int(years_input) if years_input else 5
            
            result = calculate_two_stage_ddm(ticker, ks, g, years)
            
            # ถ้าคำนวณ g อัตโนมัติไม่ได้ ให้ถามผู้ใช้ใหม่
            if "error" in result and g is None and "โปรดระบุค่า g เอง" in result["error"]:
                print(f"{YELLOW}{result['error']}{RESET}")
                g_input = input("ป้อน g (%): ").strip()
                g = float(g_input)/100 if g_input else 0.05
                result = calculate_two_stage_ddm(ticker, ks, g, years)
                
            print_ddm_result(result)
            
        elif choice == '2':
            tickers_input = input("ป้อนรายชื่อหุ้น คั่นด้วยคอมมา (เช่น ADVANC,PTT,AOT): ").strip().upper()
            tickers = [t.strip() + '.BK' if not t.strip().endswith('.BK') else t.strip() for t in tickers_input.split(',')]
            
            ks_input = input("ป้อน ks (%) [ค่าเริ่มต้น 10.0]: ").strip()
            ks = float(ks_input)/100 if ks_input else 0.10
            
            g_input = input("ป้อน g (%) [เว้นว่างเพื่อคำนวณอัตโนมัติ]: ").strip()
            g = float(g_input)/100 if g_input else None
            
            margin_input = input("ป้อน Margin of Safety ขั้นต่ำ (%) [ค่าเริ่มต้น 15]: ").strip()
            min_margin = float(margin_input) if margin_input else 15.0
            
            screen_multiple_stocks(tickers, ks, g, min_margin=min_margin)
            
        elif choice == '3':
            print("ออกจากโปรแกรม...")
            break
        else:
            print("กรุณาเลือกเมนู 1-3")

if __name__ == "__main__":
    # ตัวอย่างการรันท้ายโค้ดตามที่โจทย์ต้องการ
    print(f"{YELLOW}--- ตัวอย่างการรันโปรแกรมอัตโนมัติ ---{RESET}")
    
    # 1. ทดสอบประเมินมูลค่า ADVANC.BK
    print("1. ประเมินมูลค่า ADVANC.BK (ks=10%, g=5%, 5 ปี)")
    result = calculate_two_stage_ddm("ADVANC.BK", ks=0.10, g=0.05, explicit_years=5)
    if "error" not in result:
        print(f"Fair Price ของ ADVANC.BK: {result['fair_price']:.2f} บาท")
    else:
        print(f"{RED}Error: {result['error']}{RESET}")
        
    # 2. ทดสอบสแกนหุ้นหลายตัว
    print("\n2. สแกนหุ้นหลายตัว (ks=9.5%)")
    screen_multiple_stocks(["ADVANC.BK", "PTT.BK", "AOT.BK", "CPALL.BK"], ks=0.095)
    
    print(f"{YELLOW}-----------------------------------{RESET}\n")
    
    # เข้าสู่เมนูโต้ตอบกับผู้ใช้
    # หากรันผ่าน command line แบบมี argument จะไม่เข้าเมนู (เพื่อความสะดวกในการทดสอบ)
    if len(sys.argv) <= 1:
        console_menu()
