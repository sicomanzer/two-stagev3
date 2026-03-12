'use client';

import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertCircle, CheckCircle2, XCircle, Save, Trash2, LayoutDashboard, Settings, Bell, Plus, Pencil, BarChart3 } from 'lucide-react';
import StockCharts from '../components/StockCharts';
import ConsensusDashboard from '../components/ConsensusDashboard';
import Scorecard from '../components/Scorecard';
import TrendAnalysisPanel from '../components/TrendAnalysis';
import ScenarioAnalysisPanel from '../components/ScenarioAnalysis';
import PortfolioAnalytics from '../components/PortfolioAnalytics';
import PeerComparison from '../components/PeerComparison';
import InvestmentJournal from '../components/InvestmentJournal';
import {
  calculateDDM, calculateGrahamNumber, calculatePEG,
  calculateConsensus, calculateScorecard, calculateTrendAnalysis,
  calculateScenarioAnalysis, calculateCAGR,
  getStatus as getStatusCalc, calculateShares as calcShares, formatNumber, calculateDCF
} from '../lib/calculations';
import SettingsModal from '../components/layout/SettingsModal';
import { ValuationConsensus, StockScorecard, TrendAnalysis, ScenarioAnalysis as ScenarioAnalysisType } from '../types/stock';
import Header, { AppMode } from '../components/layout/Header';
import { useNotifications } from '../hooks/useNotifications';
import { usePortfolio } from '../hooks/usePortfolio';

export default function Home() {
  const [ticker, setTicker] = useState('ADVANC');
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [ratioBands, setRatioBands] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState('');
  const [d0, setD0] = useState('10.61');
  const [ks, setKs] = useState('10');
  const [g, setG] = useState('5');
  const [explicitYears, setExplicitYears] = useState('5');
  
  // App Mode
  const [mode, setMode] = useState<'single' | 'multi' | 'portfolio'>('single');
  const [multiTickers, setMultiTickers] = useState(`TU
TISCO
SCB
MC
MEGA
ICHI
BKIH
TLI
TACC
HTC
TTW`);
  const [multiResults, setMultiResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Portfolio Logic from Hook
  const {
    portfolios,
    currentPortfolioId,
    setCurrentPortfolioId,
    portfolio,
    setPortfolio,
    fetchPortfolioData,
    
    isPortfolioModalOpen,
    setIsPortfolioModalOpen,
    newPortfolioName,
    setNewPortfolioName,
    editingPortfolioId,
    
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveTargetPortfolioId,
    setSaveTargetPortfolioId,
    itemsToSave,

    openCreateModal,
    openEditModal,
    handleCreateOrUpdatePortfolio,
    handleDeletePortfolioGroup,
    handleDeletePortfolioItem,
    handleSaveToPortfolio,
    handleSaveAllToPortfolio,
    confirmSaveToPortfolio
  } = usePortfolio(setIsLoadingData);
  const {
    telegramBotToken,
    setTelegramBotToken,
    telegramChatId,
    setTelegramChatId,
    saveSettings: baseSaveSettings,
    checkPriceAlerts
  } = useNotifications();

  const saveSettings = () => {
    baseSaveSettings();
    setShowSettings(false);
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  // Growth Assistant States
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMethod, setAssistantMethod] = useState<'sustainable' | 'historical' | 'preset'>('sustainable');
  const [roe, setRoe] = useState('12');
  const [payoutRatio, setPayoutRatio] = useState('50');
  const [divStart, setDivStart] = useState('');
  const [divEnd, setDivEnd] = useState('');
  const [yearsCount, setYearsCount] = useState('5');

  // Budget & Allocation
  const [totalBudget, setTotalBudget] = useState('5,000,000');
  const [budgetMode, setBudgetMode] = useState<'total' | 'per_ticker'>('total');
  const [allocationRatio, setAllocationRatio] = useState({
    mos30: 30, // 30%
    mos40: 40, // 40%
    mos50: 30  // 30%
  });

  const [result, setResult] = useState<any>(null);
  const [fcf, setFcf] = useState<number | null>(null);

  // === NEW: Multi-Model Valuation States ===
  const [consensus, setConsensus] = useState<ValuationConsensus | null>(null);
  const [scorecard, setScorecard] = useState<StockScorecard | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [scenarioAnalysis, setScenarioAnalysis] = useState<ScenarioAnalysisType | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [journalTicker, setJournalTicker] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (mode === 'portfolio') {
      fetchPortfolioData().then(async data => {
        if (data && data.length > 0 && data.some((i: any) => i.d0 === undefined || i.d0 === null)) {
          const { updatedPortfolio, hasUpdates } = await checkPriceAlerts(data, setIsLoadingData, true);
          if (hasUpdates) {
            setPortfolio(updatedPortfolio);
          }
        }
      });
    }
    

  }, [mode]);

  const handleManualPriceCheck = async () => {
    const { updatedPortfolio, hasUpdates } = await checkPriceAlerts(portfolio, setIsLoadingData, false);
    if (hasUpdates) {
      setPortfolio(updatedPortfolio);
    }
  };

  const fetchStockData = async () => {
    if (!ticker) return;
    setIsLoadingData(true);
    setError(null);
    setStockHistory([]);
    try {
      const res = await fetch(`/api/stock?ticker=${ticker}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
      
      if (data.currentPrice) setCurrentPrice(data.currentPrice.toFixed(2));
      if (data.d0) setD0(data.d0.toFixed(2));
      if (data.roe) setRoe((data.roe * 100).toFixed(2));
      if (data.payoutRatio) setPayoutRatio((data.payoutRatio * 100).toFixed(2));
      
      if (data.history) {
        setStockHistory(data.history);
      }
      if (data.fcf) {
        setFcf(data.fcf);
      }
      
      if (data.ratioBands) {
        setRatioBands(data.ratioBands);
      }
      
      // Auto-open assistant if we have ROE/Payout data
      if (data.roe || data.payoutRatio) {
        setIsAssistantOpen(true);
        setAssistantMethod('sustainable');
      }
      
    } catch (err: any) {
      setError(`ไม่สามารถดึงข้อมูลหุ้น ${ticker} ได้: ${err.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateInputs = (data: any) => {
    const { d0, g, ks, years } = data;
    if (isNaN(d0) || d0 < 0) throw new Error('เงินปันผล (D0) ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (isNaN(g)) throw new Error('อัตราการเติบโต (g) ต้องเป็นตัวเลข');
    if (isNaN(ks) || ks <= 0) throw new Error('ผลตอบแทนที่คาดหวัง (ks) ต้องเป็นตัวเลขที่มากกว่า 0');
    if (isNaN(years) || years <= 0) throw new Error('จำนวนปีต้องเป็นตัวเลขที่มากกว่า 0');
    if (g >= ks) throw new Error(`อัตราการเติบโต (g=${(g * 100).toFixed(2)}%) ต้องน้อยกว่าอัตราผลตอบแทนที่คาดหวัง (ks=${(ks * 100).toFixed(2)}%) เพื่อให้แบบจำลองทำงานได้`);
  };

  const calculateStockValue = (ticker: string, d0: number, g: number, ks: number, years: number, currentPrice: number | null) => {
    const tableData = [];
    const baseYear = new Date().getFullYear();
    
    // Year 0
    tableData.push({
      year: (baseYear - 1).toString(),
      dividend: d0,
      pv: null,
      growth: null,
      k: ks
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
        pv: pv,
        growth: g,
        k: null
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
      isTerminal: true
    });

    const fairPrice = pvSum + pvTv;
    let margin = null;
    let status = 'Fair';
    let recommendation = 'HOLD';

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
      tableData
    };
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (mode === 'single') {
        const d0Num = parseFloat(d0);
        let gNum = parseFloat(g) / 100;
        const ksNum = parseFloat(ks) / 100;
        const yearsNum = parseInt(explicitYears);
        const currentPriceNum = currentPrice ? parseFloat(currentPrice) : null;

        // Cap g at 7% (0.07)
        if (gNum > 0.07) {
          gNum = 0.07;
          setG('7.00'); // Update input to reflect capped value
        }

        validateInputs({ d0: d0Num, g: gNum, ks: ksNum, years: yearsNum });
        
        const res = calculateStockValue(ticker || 'Unknown', d0Num, gNum, ksNum, yearsNum, currentPriceNum);
        setResult(res);

        // === Multi-Model Valuation ===
        if (stockHistory.length > 0) {
          // Graham Number
          const latestHistory = stockHistory[stockHistory.length - 1];
          const grahamRes = calculateGrahamNumber(
            latestHistory?.eps || null,
            latestHistory?.bvps || null,
            currentPriceNum
          );

          // PE Band fair price (-1SD)
          let peBandFair: number | null = null;
          if (ratioBands?.pe?.stats && latestHistory?.eps && latestHistory.eps > 0) {
            const peAtMinus1SD = ratioBands.pe.stats.avg - ratioBands.pe.stats.sd;
            peBandFair = peAtMinus1SD * latestHistory.eps;
          }

          // DCF Valuation 
          let dcfFair: number | null = null;
          if (fcf !== null && latestHistory?.shares) {
            const dcfRes = calculateDCF(fcf, latestHistory.shares);
            if (dcfRes) dcfFair = dcfRes.fairValue;
          }

          // Consensus
          const consensusResult = calculateConsensus(
            res.fairPrice,
            grahamRes?.grahamNumber || null,
            peBandFair,
            dcfFair,
            currentPriceNum
          );
          setConsensus(consensusResult);

          // Scorecard
          const sc = calculateScorecard(
            ticker,
            stockHistory,
            currentPriceNum,
            res.fairPrice,
            ratioBands?.pe?.data?.length ? ratioBands.pe.data[ratioBands.pe.data.length - 1]?.value : null,
            ratioBands?.pbv?.data?.length ? ratioBands.pbv.data[ratioBands.pbv.data.length - 1]?.value : null,
            ratioBands?.pe?.stats?.avg || null,
            ratioBands?.pbv?.stats?.avg || null
          );
          setScorecard(sc);

          // Trend Analysis
          const trend = calculateTrendAnalysis(ticker, stockHistory);
          setTrendAnalysis(trend);

          // Scenario Analysis
          const scenario = calculateScenarioAnalysis(ticker, d0Num, currentPriceNum, yearsNum);
          setScenarioAnalysis(scenario);
        }

      } else {
        const tickersRaw = multiTickers.split(/[\n,]+/).map(t => t.trim()).filter(t => t !== '');
        if (tickersRaw.length === 0) throw new Error('กรุณาระบุชื่อหุ้นอย่างน้อย 1 ตัว');

        setIsLoadingData(true);
        const ksNum = parseFloat(ks) / 100;
        const yearsNum = parseInt(explicitYears);

        // Fetch data for all tickers
        const results = await Promise.all(tickersRaw.map(async (item) => {
          try {
            const parts = item.split(':');
            const t = parts[0].trim();
            // If price is provided in input, use it. Otherwise use fetched price.
            const inputPrice = parts[1] ? parseFloat(parts[1].trim()) : null;

            const res = await fetch(`/api/stock?ticker=${t}`);
            const data = await res.json();

            if (!res.ok) {
              return { 
                ticker: t, 
                error: data.error || 'Failed to fetch', 
                d0: 0, g: 0, ks: 0, fairPrice: 0, margin: null, status: 'Error', recommendation: 'N/A', currentPrice: null
              };
            }

            // Calculate g using Sustainable Growth Rate
            // g = ROE * (1 - PayoutRatio)
            let gCalc = 0;
            const roeVal = data.roe || 0;
            const payoutVal = data.payoutRatio || 0;
            
            if (roeVal && payoutVal) {
              gCalc = roeVal * (1 - payoutVal);
            }

            // Cap g at 7% (0.07) as per requirement
            if (gCalc > 0.07) {
              gCalc = 0.07;
            }

            // Safety check: if g >= ks, cap it or mark it?
            // Strict DDM requires g < ks. 
            // If g >= ks, fair price is undefined (infinite).
            // For this table, let's handle it by returning a specific status or null fair price.
            
            const priceToUse = inputPrice || data.currentPrice;
            const d0Val = data.d0 || 0;

            let calculation = null;
            if (gCalc < ksNum) {
               calculation = calculateDDM(t, d0Val, gCalc, ksNum, yearsNum, priceToUse);
            } else {
               // Fallback calculation for display purposes only (showing g > ks error)
               calculation = {
                 ticker: t,
                 currentPrice: priceToUse,
                 d0: d0Val,
                 g: gCalc,
                 ks: ksNum,
                 fairPrice: 0, // Invalid
                 margin: null,
                 status: 'Error: g >= ks',
                 recommendation: 'N/A',
                 tableData: []
               };
            }

            // Calculate MOS Prices and Status
            const fairPrice = calculation.fairPrice;
            const mos30Price = fairPrice * 0.7;
            const mos40Price = fairPrice * 0.6;
            const mos50Price = fairPrice * 0.5;
            
            const statusInfo = getStatus(priceToUse, mos30Price, mos40Price, mos50Price, fairPrice);
            
            // Calculate Budget Allocation per Ticker
            let perTickerBudget = parseFloat(totalBudget.replace(/,/g, ''));
            if (isNaN(perTickerBudget)) perTickerBudget = 0;
            
            if (budgetMode === 'total') {
              perTickerBudget = perTickerBudget / tickersRaw.length;
            }
            const budget30 = perTickerBudget * (allocationRatio.mos30 / 100);
            const budget40 = perTickerBudget * (allocationRatio.mos40 / 100);
            const budget50 = perTickerBudget * (allocationRatio.mos50 / 100);

            // Calculate Shares and Costs
            const shares30 = calculateShares(budget30, mos30Price);
            const cost30 = shares30 * mos30Price;
            
            const shares40 = calculateShares(budget40, mos40Price);
            const cost40 = shares40 * mos40Price;
            
            const shares50 = calculateShares(budget50, mos50Price);
            const cost50 = shares50 * mos50Price;

            return {
              ...calculation,
              pe: data.pe,
              pbv: data.pbv,
              eps: data.eps,
              debtToEquity: data.debtToEquity,
              roa: data.roa,
              marketCap: data.marketCap,
              dividendYield: data.dividendYield,
              roe: roeVal,
              payoutRatio: payoutVal,
              mos30Price, mos40Price, mos50Price,
              shares30, cost30,
              shares40, cost40,
              shares50, cost50,
              statusLabel: statusInfo.label,
              statusColor: statusInfo.color
            };

          } catch (err) {
            return { 
              ticker: item, 
              error: 'Error processing',
              d0: 0, g: 0, ks: 0, fairPrice: 0, margin: null, status: 'Error', recommendation: 'N/A', currentPrice: null
            };
          }
        }));

        setMultiResults(results);
        setIsLoadingData(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoadingData(false);
    }
  };

  const calculateAssistantG = () => {
    try {
      let calculatedG = 0;
      if (assistantMethod === 'sustainable') {
        const r = parseFloat(roe);
        const p = parseFloat(payoutRatio);
        if (isNaN(r) || isNaN(p)) return '0.00';
        calculatedG = (r / 100) * (1 - p / 100) * 100;
      } else if (assistantMethod === 'historical') {
        const start = parseFloat(divStart);
        const end = parseFloat(divEnd);
        const n = parseInt(yearsCount);
        if (isNaN(start) || isNaN(end) || isNaN(n) || start <= 0 || n <= 0) return '0.00';
        calculatedG = (Math.pow(end / start, 1 / n) - 1) * 100;
      } else if (assistantMethod === 'preset') {
        calculatedG = 3;
      }
      return calculatedG.toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  const applyAssistantG = () => {
    const suggested = calculateAssistantG();
    const ksNum = parseFloat(ks);
    let gNum = parseFloat(suggested);
    
    // Cap g at 7%
    if (gNum > 7) {
      gNum = 7;
    }

    if (!isNaN(ksNum) && !isNaN(gNum) && gNum >= ksNum) {
      const adjusted = (ksNum - 0.01).toFixed(2);
      // Ensure adjusted doesn't exceed 7% if ks is high (though gNum cap above handles most cases)
      setG(parseFloat(adjusted) > 7 ? '7.00' : adjusted);
    } else {
      setG(gNum.toFixed(2));
    }
    setIsAssistantOpen(false);
  };

  const getStatus = (price: number, mos30: number, mos40: number, mos50: number, fairPrice: number) => {
    if (!price || price <= 0) return { label: '-', color: 'text-slate-400' };
    if (price <= mos50) return { label: 'MOS 50%', color: 'text-emerald-600 bg-emerald-100' };
    if (price <= mos40) return { label: 'MOS 40%', color: 'text-teal-600 bg-teal-100' };
    if (price <= mos30) return { label: 'MOS 30%', color: 'text-cyan-600 bg-cyan-100' };
    if (price < fairPrice) return { label: 'ต่ำกว่า FV', color: 'text-blue-600 bg-blue-100' };
    return { label: 'รอก่อนนะ', color: 'text-amber-600 bg-amber-100' };
  };

  const calculateShares = (budget: number, price: number) => {
    if (!price || price <= 0) return 0;
    const shares = Math.floor(budget / price / 100) * 100;
    return shares;
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div suppressHydrationWarning className="max-w-[95%] mx-auto space-y-8">
        
        {/* Header */}
        <Header 
          mode={mode as AppMode} 
          setMode={(newMode: AppMode) => setMode(newMode)} 
          setError={setError} 
          setShowSettings={setShowSettings} 
        />

        <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Form */}
          {mode !== 'portfolio' && (
          <div suppressHydrationWarning className="lg:col-span-1 space-y-6 lg:order-last">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                {mode === 'single' ? 'พารามิเตอร์การประเมิน' : 'พารามิเตอร์การสแกน'}
              </h2>
              {!isClient ? (
                <div suppressHydrationWarning className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse bg-slate-50 rounded-xl">
                  Loading...
                </div>
              ) : (
                <form onSubmit={handleCalculate} className="space-y-4">
                
                {mode === 'multi' && (
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-700">งบประมาณการลงทุน</label>
                      <div className="flex bg-white rounded-lg p-1 border border-slate-200 text-[10px] font-medium">
                        <button
                          type="button"
                          onClick={() => setBudgetMode('total')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            budgetMode === 'total' 
                            ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          รวมทั้งหมด
                        </button>
                        <button
                          type="button"
                          onClick={() => setBudgetMode('per_ticker')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            budgetMode === 'per_ticker' 
                            ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          ต่อบริษัท
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          {budgetMode === 'total' ? 'เงินทุนรวม (บาท)' : 'เงินลงทุนต่อบริษัท (บาท)'}
                        </label>
                        <input
                          type="text"
                          value={totalBudget}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val))) {
                              setTotalBudget(Number(val).toLocaleString());
                            } else if (val === '') {
                              setTotalBudget('');
                            }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 30%</label>
                          <input
                            type="number"
                            value={allocationRatio.mos30}
                            onChange={(e) => setAllocationRatio({...allocationRatio, mos30: parseFloat(e.target.value)})}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 40%</label>
                          <input
                            type="number"
                            value={allocationRatio.mos40}
                            onChange={(e) => setAllocationRatio({...allocationRatio, mos40: parseFloat(e.target.value)})}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 50%</label>
                          <input
                            type="number"
                            value={allocationRatio.mos50}
                            onChange={(e) => setAllocationRatio({...allocationRatio, mos50: parseFloat(e.target.value)})}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'single' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อหุ้น (Ticker)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="เช่น ADVANC"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={fetchStockData}
                        disabled={isLoadingData || !ticker}
                        className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                      >
                        {isLoadingData ? 'Loading...' : 'ดึงข้อมูล'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">รายชื่อหุ้น (Ticker:Price, ...)</label>
                      <button
                        type="button"
                        onClick={() => setMultiTickers('')}
                        className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} />
                        Clear All
                      </button>
                    </div>
                    <textarea
                      value={multiTickers}
                      onChange={(e) => setMultiTickers(e.target.value.toUpperCase())}
                      placeholder="ADVANC:240, PTT:35, AOT"
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">ระบุชื่อหุ้น หรือ ชื่อหุ้น:ราคา เพื่อคำนวณ Margin</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เงินปันผลปีล่าสุด (D0)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={d0}
                    onChange={(e) => setD0(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">อัตราการเติบโต g (%)</label>
                    <button 
                      type="button"
                      onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <TrendingUp size={12} />
                      ช่วยคำนวณค่า g
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={g}
                    onChange={(e) => setG(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                  {(() => {
                    const gNum = parseFloat(g);
                    const ksNum = parseFloat(ks);
                    if (!isNaN(gNum) && !isNaN(ksNum) && gNum >= ksNum) {
                      return (
                        <p className="text-[10px] mt-1 text-red-600">
                          อัตราการเติบโต (g) ต้องน้อยกว่า ks เพื่อให้แบบจำลองทำงานได้
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Growth Assistant Panel */}
                {isAssistantOpen && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAssistantMethod('sustainable')}
                        className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                          assistantMethod === 'sustainable' 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Sustainable
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantMethod('historical')}
                        className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                          assistantMethod === 'historical' 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Historical
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantMethod('preset')}
                        className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                          assistantMethod === 'preset' 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        GDP/Preset
                      </button>
                    </div>

                    {assistantMethod === 'sustainable' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ROE (%)</label>
                          <input
                            type="number"
                            value={roe}
                            onChange={(e) => setRoe(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Payout (%)</label>
                          <input
                            type="number"
                            value={payoutRatio}
                            onChange={(e) => setPayoutRatio(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {assistantMethod === 'historical' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ปันผลปีแรก</label>
                            <input
                              type="number"
                              value={divStart}
                              onChange={(e) => setDivStart(e.target.value)}
                              placeholder="เช่น 5.00"
                              className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ปันผลล่าสุด</label>
                            <input
                              type="number"
                              value={divEnd}
                              onChange={(e) => setDivEnd(e.target.value)}
                              placeholder="เช่น 8.50"
                              className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">จำนวนปีที่ผ่านไป</label>
                          <input
                            type="number"
                            value={yearsCount}
                            onChange={(e) => setYearsCount(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {assistantMethod === 'preset' && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setG('2')} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-50">2% (Conservative)</button>
                        <button type="button" onClick={() => setG('3')} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-50">3% (GDP Growth)</button>
                      </div>
                    )}

                    {assistantMethod !== 'preset' && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-500">ผลลัพธ์: </span>
                          <span className="font-bold text-emerald-600">{calculateAssistantG()}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={applyAssistantG}
                          className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          ใช้ค่านี้
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ผลตอบแทนที่คาดหวัง ks (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ks}
                    onChange={(e) => setKs(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนปี Explicit (ปี)</label>
                  <input
                    type="number"
                    value={explicitYears}
                    onChange={(e) => setExplicitYears(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                {mode === 'single' && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ราคาปัจจุบัน (ใส่เพื่อหา Margin)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      placeholder="ไม่บังคับ"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 mt-4"
                >
                  <Calculator size={20} />
                  <span>{mode === 'single' ? 'คำนวณมูลค่าที่เหมาะสม' : 'สแกนหุ้นทั้งหมด'}</span>
                </button>
              </form>
              )}
            </div>

            {/* Results Summary & Table */}
            {mode === 'single' && result && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Fair Price & Status */}
                <div className="bg-emerald-600 rounded-2xl p-6 shadow-md text-white flex flex-col items-center gap-6 text-center">
                  <div className="w-full">
                    <p className="text-emerald-100 font-medium mb-1">มูลค่าที่เหมาะสม (Fair Price)</p>
                    <div className="flex items-baseline justify-center space-x-2">
                      <span className="text-5xl font-bold">{result.fairPrice.toFixed(2)}</span>
                      <span className="text-emerald-200 text-xl">บาท</span>
                    </div>
                  </div>
                  
                  {result.currentPrice && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-700/50 p-4 rounded-xl">
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-emerald-200 mb-1">Margin of Safety</p>
                        <p className={`text-2xl font-bold ${
                          result.margin >= 15 ? 'text-emerald-300' : 
                          result.margin <= -15 ? 'text-red-300' : 'text-amber-300'
                        }`}>
                          {result.margin > 0 ? '+' : ''}{result.margin.toFixed(2)}%
                        </p>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-full flex items-center space-x-2 font-medium bg-white/10 whitespace-nowrap`}>
                        {result.status === 'Undervalued' && <CheckCircle2 size={18} className="text-emerald-300" />}
                        {result.status === 'Overvalued' && <XCircle size={18} className="text-red-300" />}
                        {result.status === 'Fair' && <AlertCircle size={18} className="text-amber-300" />}
                        <span>{result.status}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Calculation Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-[#4472C4] text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg">{result.ticker}</h3>
                    <div className="flex space-x-8 text-sm font-medium">
                      <span>Assumption</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-slate-700 bg-[#E9EBF5] border-b border-slate-300">
                        <tr>
                          <th className="px-6 py-3 font-bold">Year</th>
                          <th className="px-6 py-3 font-bold text-right">Dividend per share</th>
                          <th className="px-6 py-3 font-bold text-right">Present Value</th>
                          <th className="px-6 py-3 font-bold text-right">Growth</th>
                          <th className="px-6 py-3 font-bold text-right">K</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.tableData.map((row: any, i: number) => (
                          <tr key={i} className={`border-b border-slate-200 last:border-0 ${
                            row.isTerminal ? 'bg-slate-50 font-medium' : 'bg-white'
                          }`}>
                            <td className="px-6 py-3 text-slate-900">{row.year}</td>
                            <td className="px-6 py-3 text-right text-slate-800">
                              {row.dividend !== null ? row.dividend.toFixed(2) : ''}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-800">
                              {row.pv !== null ? row.pv.toFixed(2) : ''}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-800">
                              {row.growth !== null ? `${(row.growth * 100).toFixed(0)}%` : ''}
                              {row.isTerminal && ' ✚'}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-800">
                              {row.k !== null ? `${(row.k * 100).toFixed(2)}%` : ''}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#70AD47] text-white font-bold text-base">
                          <td className="px-6 py-4">Fair Prices</td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-right">{result.fairPrice.toFixed(2)}</td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Consensus Dashboard — in right sidebar */}
            {mode === 'single' && result && consensus && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <ConsensusDashboard consensus={consensus} ticker={ticker} />
              </div>
            )}
          </div>
          )}

          {/* Results Area */}
          <div suppressHydrationWarning className={`${mode === 'portfolio' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6 lg:order-first`}>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold">เกิดข้อผิดพลาด</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {mode === 'single' ? (
              <>
                {!result && !error && stockHistory.length === 0 && (
                  <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center h-full min-h-[400px]">
                    <TrendingUp size={48} className="mb-4 opacity-20" />
                    <p>กรอกข้อมูลและกดคำนวณเพื่อดูผลลัพธ์รายตัว</p>
                  </div>
                )}



                {stockHistory.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 space-y-6">
                    <StockCharts history={stockHistory} ratioBands={ratioBands} ticker={ticker} />

                    {/* === Scorecard, Trend, Scenario — below charts in left area === */}
                    {scorecard && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <Scorecard scorecard={scorecard} />
                      </div>
                    )}

                    {trendAnalysis && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                        <TrendAnalysisPanel analysis={trendAnalysis} />
                      </div>
                    )}

                    {scenarioAnalysis && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                        <ScenarioAnalysisPanel analysis={scenarioAnalysis} />
                      </div>
                    )}

                    {result && ticker && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                        <PeerComparison mainTicker={ticker} />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {mode === 'multi' && multiResults.length === 0 && !error && (
                  <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center h-full min-h-[400px]">
                    <TrendingUp size={48} className="mb-4 opacity-20" />
                    <p>ระบุรายชื่อหุ้นและกดสแกนเพื่อเปรียบเทียบมูลค่า</p>
                  </div>
                )}

                {mode === 'multi' && multiResults.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="px-6 py-4 border-b border-slate-200 bg-emerald-600 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg">Stock Screening Results</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMultiResults([])}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Trash2 size={14} />
                          Clear
                        </button>
                        <button
                          onClick={() => handleSaveAllToPortfolio(multiResults)}
                          disabled={multiResults.length === 0}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={14} />
                          Save All ({multiResults.length})
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-slate-700 bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-3 font-bold text-xs uppercase text-slate-500 whitespace-nowrap sticky left-0 bg-slate-50 z-10" rowSpan={2}>Ticker</th>
                            <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Status</th>
                            <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Save</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Price</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Fair Price</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Div Yld %</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D0 (Baht)</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/E</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/BV</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D/E</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROE %</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROA %</th>
                            <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>EPS</th>
                            
                            {/* MOS 30% */}
                            <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-cyan-600 whitespace-nowrap" colSpan={3}>MOS 30%</th>
                            
                            {/* MOS 40% */}
                            <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-teal-600 whitespace-nowrap" colSpan={3}>MOS 40%</th>
                            
                            {/* MOS 50% */}
                            <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-emerald-600 whitespace-nowrap" colSpan={3}>MOS 50%</th>
                          </tr>
                          <tr className="bg-slate-100 text-xs text-slate-500">
                            {/* Sub-headers for MOS */}
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold">Cost</th>
                            
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold">Cost</th>
                            
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {multiResults.map((res: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-3 font-bold text-slate-900 text-sm sticky left-0 bg-white">{res.ticker}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${res.statusColor}`}>
                                  {res.statusLabel}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => handleSaveToPortfolio(res)}
                                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Save to Portfolio"
                                >
                                  <Save size={16} />
                                </button>
                              </td>
                              <td className="px-3 py-3 text-right text-slate-600 text-sm font-medium">{res.currentPrice ? res.currentPrice.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right font-bold text-emerald-600 text-sm">{res.fairPrice > 0 ? res.fairPrice.toFixed(2) : 'N/A'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.dividendYield ? (res.dividendYield * 100).toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-sm">{res.d0 ? res.d0.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.pe ? res.pe.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.pbv ? res.pbv.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.debtToEquity ? res.debtToEquity.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.roe ? (res.roe * 100).toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.roa ? (res.roa * 100).toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.eps ? res.eps.toFixed(2) : '-'}</td>
                              
                              {/* MOS 30% Data */}
                              <td className="px-3 py-3 text-right text-cyan-700 font-medium text-xs bg-cyan-50/30">{res.mos30Price?.toFixed(2)}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{res.shares30?.toLocaleString()}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{res.cost30?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              
                              {/* MOS 40% Data */}
                              <td className="px-3 py-3 text-right text-teal-700 font-medium text-xs bg-teal-50/30">{res.mos40Price?.toFixed(2)}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{res.shares40?.toLocaleString()}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{res.cost40?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                              {/* MOS 50% Data */}
                              <td className="px-3 py-3 text-right text-emerald-700 font-medium text-xs bg-emerald-50/30">{res.mos50Price?.toFixed(2)}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{res.shares50?.toLocaleString()}</td>
                              <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{res.cost50?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {mode === 'portfolio' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard size={20} />
                          <h3 className="font-bold text-lg">My Portfolio</h3>
                        </div>
                        
                        {/* Portfolio Selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={currentPortfolioId || ''}
                            onChange={(e) => setCurrentPortfolioId(e.target.value)}
                            className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            {portfolios.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={openCreateModal}
                            className="p-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
                            title="New Portfolio"
                          >
                            <Plus size={16} />
                          </button>
                          {currentPortfolioId && (
                            <>
                              <button
                                onClick={openEditModal}
                                className="p-1.5 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors"
                                title="Rename Portfolio"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeletePortfolioGroup(currentPortfolioId)}
                                className="p-1.5 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors"
                                title="Delete Portfolio"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                            onClick={handleManualPriceCheck}
                            disabled={isLoadingData}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                          <Bell size={14} />
                          {isLoadingData ? 'Checking...' : 'Check Prices'}
                        </button>
                        <button
                          onClick={() => setShowAnalytics(!showAnalytics)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            showAnalytics ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-600 hover:bg-slate-500'
                          }`}
                        >
                          <BarChart3 size={14} />
                          {showAnalytics ? 'Hide Analytics' : 'Analytics'}
                        </button>
                        <span className="text-sm font-medium opacity-80">{portfolio.length} items</span>
                      </div>
                    </div>

                    {/* Portfolio Analytics Dashboard */}
                    {showAnalytics && portfolio.length > 0 && (
                      <div className="p-6 border-b border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                        <PortfolioAnalytics items={portfolio} />
                      </div>
                    )}
                    
                    {portfolio.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <p>No items in portfolio yet.</p>
                        <button 
                          onClick={() => setMode('multi')}
                          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          Go to Screening
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-slate-700 bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-3 font-bold text-xs uppercase text-slate-500 whitespace-nowrap sticky left-0 bg-slate-50 z-10" rowSpan={2}>Ticker</th>
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Action</th>
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Status</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Price</th>
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Alert Target</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Fair Price</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Div Yld %</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D0 (Baht)</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/E</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/BV</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D/E</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROE %</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROA %</th>
                              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>EPS</th>
                              
                              {/* MOS 30% */}
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-cyan-600 whitespace-nowrap" colSpan={3}>MOS 30%</th>
                              
                              {/* MOS 40% */}
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-teal-600 whitespace-nowrap" colSpan={3}>MOS 40%</th>
                              
                              {/* MOS 50% */}
                              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-emerald-600 whitespace-nowrap" colSpan={3}>MOS 50%</th>
                            </tr>
                            <tr className="bg-slate-100 text-xs text-slate-500">
                            {/* Sub-headers for MOS */}
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold">Cost</th>
                            
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold">Cost</th>
                            
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Buy<br/>Price</th>
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Shares</th>
                            <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold">Cost</th>
                          </tr>
                          </thead>
                          <tbody>
                            {portfolio.map((item: any, i: number) => {
                              // Re-evaluate status based on current price (which is saved in DB)
                              // Note: In a real app, we might want to re-fetch live prices here
                              const statusInfo = getStatus(item.current_price, item.mos30_price, item.mos40_price, item.mos50_price, item.fair_price);
                              
                              return (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-3 font-bold text-slate-900 text-sm sticky left-0 bg-white">{item.ticker}</td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleDeletePortfolioItem(item.id)}
                                        className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Remove from Portfolio"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                      <button
                                        onClick={() => setJournalTicker(item.ticker)}
                                        className="p-1 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                        title="Investment Journal"
                                      >
                                        <span className="text-sm">📓</span>
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-sm font-medium">{item.current_price ? item.current_price.toFixed(2) : '-'}</td>
                                  
                                  {/* Custom Target Price */}
                                  <td className="px-3 py-3 text-center">
                                    <button 
                                      onClick={() => {
                                        const newTarget = prompt(`ตั้งราคาแจ้งเตือน (Target Price) สำหรับ ${item.ticker}:`, item.target_price || '');
                                        if (newTarget !== null) {
                                          const parsed = parseFloat(newTarget);
                                          if (!isNaN(parsed) || newTarget === '') {
                                            fetch('/api/portfolio', {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ id: item.id, target_price: newTarget === '' ? null : parsed })
                                            }).then(() => fetchPortfolioData());
                                          } else {
                                            alert('กรุณากรอกตัวเลขที่ถูกต้อง');
                                          }
                                        }
                                      }}
                                      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${item.target_price ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                      title="Set Custom Target Price"
                                    >
                                      {item.target_price ? `🎯 ${item.target_price.toFixed(2)}` : '+ Target'}
                                    </button>
                                  </td>
                                  
                                  <td className="px-3 py-3 text-right font-bold text-emerald-600 text-sm">{item.fair_price ? item.fair_price.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">
                                {(item.dividend_yield || item.yield) ? ((item.dividend_yield || item.yield) * 100).toFixed(2) : '-'}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.d0 ? item.d0.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.pe ? item.pe.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.pbv ? item.pbv.toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">
                                {(item.de || item.debt_to_equity) ? (item.de || item.debt_to_equity).toFixed(2) : '-'}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.roe ? (item.roe * 100).toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.roa ? (item.roa * 100).toFixed(2) : '-'}</td>
                              <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.eps ? item.eps.toFixed(2) : '-'}</td>
                                  
                                  {/* MOS 30% Data */}
                                  <td className="px-3 py-3 text-right text-cyan-700 font-medium text-xs bg-cyan-50/30">{item.mos30_price?.toFixed(2)}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{item.mos30_shares?.toLocaleString()}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{item.mos30_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                  
                                  {/* MOS 40% Data */}
                                  <td className="px-3 py-3 text-right text-teal-700 font-medium text-xs bg-teal-50/30">{item.mos40_price?.toFixed(2)}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{item.mos40_shares?.toLocaleString()}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{item.mos40_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                                  {/* MOS 50% Data */}
                                  <td className="px-3 py-3 text-right text-emerald-700 font-medium text-xs bg-emerald-50/30">{item.mos50_price?.toFixed(2)}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{item.mos50_shares?.toLocaleString()}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{item.mos50_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        telegramBotToken={telegramBotToken} 
        setTelegramBotToken={setTelegramBotToken} 
        telegramChatId={telegramChatId} 
        setTelegramChatId={setTelegramChatId} 
        onSave={saveSettings} 
      />

      {/* Portfolio Creation/Edit Modal */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingPortfolioId ? 'Rename Portfolio' : 'Create New Portfolio'}
            </h3>
            <input
              type="text"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              placeholder="Portfolio Name"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsPortfolioModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdatePortfolio}
                disabled={!newPortfolioName.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingPortfolioId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Portfolio Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Save {itemsToSave.length} Item{itemsToSave.length > 1 ? 's' : ''} to...
            </h3>
            
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700">Select Portfolio</label>
              <select
                value={saveTargetPortfolioId}
                onChange={(e) => setSaveTargetPortfolioId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              {portfolios.length === 0 && (
                <p className="text-xs text-red-500">Please create a portfolio first.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveToPortfolio}
                disabled={!saveTargetPortfolioId || isLoadingData}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoadingData ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investment Journal Modal */}
      <InvestmentJournal 
        isOpen={!!journalTicker} 
        onClose={() => setJournalTicker(null)} 
        ticker={journalTicker || ''} 
      />

    </div>
  );
}
