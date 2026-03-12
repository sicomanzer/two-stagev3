'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { calculateScorecard } from '@/lib/calculations';
import type { StockScorecard } from '@/types/stock';

const PRESET_SECTORS: Record<string, string[]> = {
  // FINANCIALS
  'BANK': ['BBL', 'KBANK', 'SCB', 'TISCO', 'KTB', 'TTB', 'KKP', 'BAY', 'TCAP', 'CIMBT'],
  'FINANCE': ['SAWAD', 'MTC', 'TIDLOR', 'KTC', 'AEONTS', 'BAM', 'JMT', 'CHAYO', 'KCG'],
  'INSURANCE': ['BLA', 'TLI', 'THREL', 'BKIH', 'BKI'],
  
  // TECH & COMM
  'ICT': ['ADVANC', 'TRUE', 'INTUCH', 'DIF', 'JASIF', 'SYNEX', 'SIS', 'COM7', 'JMART'],
  'MEDIA': ['PLANB', 'VGI', 'MAJOR', 'WORK', 'BEC', 'ONEE'],
  
  // SERVICES
  'COMMERCE': ['CPALL', 'CPAXT', 'BJC', 'CRC', 'HMPRO', 'GLOBAL', 'DOHOME', 'MEGA', 'MC', 'ILM', 'RS', 'BEAUTY', 'KAMART'],
  'HEALTHCARE': ['BDMS', 'BH', 'BCH', 'CHG', 'PR9', 'THG', 'VIBHA', 'EKH'],
  'TOURISM': ['AOT', 'MINT', 'CENTEL', 'ERW', 'BA', 'AAV', 'SHR'],
  'TRANSPORT': ['BEM', 'BTS', 'PSL', 'RCL', 'TTA', 'KEX', 'PRM', 'NYT', 'WICE'],
  
  // RESOURCES
  'ENERGY': ['PTT', 'PTTEP', 'TOP', 'SPRC', 'BCP', 'GULF', 'GPSC', 'EA', 'BGRIM', 'EGCO', 'RATCH', 'BPP', 'WHAUP', 'BANPU'],
  'PETRO': ['PTTGC', 'IVL', 'IRPC'],
  
  // REAL ESTATE & CON
  'PROPERTY': ['CPN', 'AP', 'SPALI', 'SIRI', 'LH', 'ORI', 'QH', 'WHA', 'AMATA', 'ROJNA', 'AWC', 'MBK'],
  'CONSTRUCTION': ['CK', 'STEC', 'ITD', 'UNIQ', 'SEAFCO', 'PYLON'],
  'MATERIALS': ['SCC', 'SCCC', 'TPIPL', 'TASCO', 'DCC'],
  
  // AGRI & FOOD
  'FOOD': [
    'TU', 'CPF', 'GFPT', 'TFG', // Meat & Processed
    'CBG', 'OSP', 'ICHI', 'SAPPE', 'HTC', 'TACC', // Beverage
    'NSL', 'PB', 'TKN', 'SNNP', 'PM', 'SNP', // Snack & Bakery (Direct Peers for NSL)
    'SORKON', 'RBF', 'LST', 'APURE' // Ingredients & Others
  ],
  'RESTAURANT': ['M', 'AU', 'ZEN', 'MAGURO', 'SNP'],
  'AGRI': ['STA', 'NER', 'GFPT', 'TWPC']
};

// Reverse map to find sector by ticker
const getSectorForTicker = (ticker: string): string | null => {
  const upperTicker = ticker.toUpperCase();
  for (const [sector, tickers] of Object.entries(PRESET_SECTORS)) {
    if (tickers.includes(upperTicker)) {
      return sector;
    }
  }
  return null;
};

interface PeerData {
  ticker: string;
  price: number | null;
  pe: number | null;
  pbv: number | null;
  roe: number | null;
  de: number | null;
  yield: number | null;
  score: number | null;
  scorecard: StockScorecard | null;
  isLoading: boolean;
  error: string | null;
}

interface PeerComparisonProps {
  mainTicker: string;
  mainScorecard?: StockScorecard | null;
}

export default function PeerComparison({ mainTicker, mainScorecard = null }: PeerComparisonProps) {
  const [sector, setSector] = useState<string | null>(getSectorForTicker(mainTicker));
  const [customPeers, setCustomPeers] = useState<string>('');
  const [peersData, setPeersData] = useState<PeerData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Initialize peer list
  const fetchPeersData = useCallback(async (tickers: string[]) => {
    setIsFetching(true);
    const initialData: PeerData[] = tickers.map(t => ({
      ticker: t,
      price: null, pe: null, pbv: null, roe: null, de: null, yield: null,
      score: null, scorecard: null, isLoading: true, error: null
    }));
    setPeersData(initialData);

    const fetchPromises = tickers.map(async (ticker) => {
      try {
        const res = await fetch(`/api/stock?ticker=${ticker}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed');
        
        let score = null;
        let sc: StockScorecard | null = null;
        if (data.history && data.history.length > 0) {
            try {
                sc = calculateScorecard(
                    ticker,
                    data.history,
                    data.currentPrice || null,
                    null,
                    data.pe || null,
                    data.pbv || null,
                    data.ratioBands?.pe?.stats?.avg || null,
                    data.ratioBands?.pbv?.stats?.avg || null
                );
                score = sc.totalScore;
            } catch (e) {
            }
        }

        return {
          ticker,
          price: data.currentPrice || null,
          pe: data.pe || null,
          pbv: data.pbv || null,
          roe: data.roe || null,
          de: data.debtToEquity || null,
          yield: data.dividendYield || null,
          score,
          scorecard: sc,
          isLoading: false,
          error: null
        };
      } catch (err: any) {
        return {
          ticker,
          price: null, pe: null, pbv: null, roe: null, de: null, yield: null,
          score: null, scorecard: null,
          isLoading: false,
          error: err.message
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    const main = mainTicker.toUpperCase();
    const normalized = results.map(peer =>
      mainScorecard && peer.ticker === main
        ? { ...peer, score: mainScorecard.totalScore, scorecard: mainScorecard }
        : peer
    );
    setPeersData(normalized);
    setIsFetching(false);
  }, [mainScorecard, mainTicker]);

  useEffect(() => {
    const currentSector = getSectorForTicker(mainTicker);
    setSector(currentSector);
    
    let peersToFetch: string[] = [];
    if (currentSector) {
      peersToFetch = [...PRESET_SECTORS[currentSector]];
      // ensure main ticker is in the list
      if (!peersToFetch.includes(mainTicker.toUpperCase())) {
         peersToFetch.unshift(mainTicker.toUpperCase());
      }
    } else {
      peersToFetch = [mainTicker.toUpperCase()];
    }

    setCustomPeers(peersToFetch.join(', '));
    fetchPeersData(peersToFetch);
  }, [mainTicker, fetchPeersData]);

  useEffect(() => {
    if (!mainScorecard) return;
    const main = mainTicker.toUpperCase();
    setPeersData(prev =>
      prev.map(peer =>
        peer.ticker === main
          ? { ...peer, score: mainScorecard.totalScore, scorecard: mainScorecard }
          : peer
      )
    );
  }, [mainScorecard, mainTicker]);

  const handleCustomPeersSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const tickers = customPeers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
     if (tickers.length > 0) {
         fetchPeersData(tickers);
     }
  };

  // Calculate Averages (exclude nulls)
  const calculateAvg = (key: keyof PeerData) => {
    const validData = peersData.filter(p => !p.isLoading && !p.error && typeof p[key] === 'number' && p[key] !== null);
    if (validData.length === 0) return null;
    const sum = validData.reduce((acc, p) => acc + (p[key] as number), 0);
    return sum / validData.length;
  };

  const avgPE = calculateAvg('pe');
  const avgPBV = calculateAvg('pbv');
  const avgROE = calculateAvg('roe');
  const avgDE = calculateAvg('de');
  const avgYield = calculateAvg('yield');

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-3xl">🔍</span> Peer Comparison
          </h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            เปรียบเทียบ {mainTicker.toUpperCase()} กับหุ้นในกลุ่มอุตสาหกรรม {sector ? `(${sector})` : '(กำหนดเอง)'}
          </p>
        </div>
        
        <form onSubmit={handleCustomPeersSubmit} className="flex items-center gap-2">
           <input 
              type="text" 
              value={customPeers}
              onChange={(e) => setCustomPeers(e.target.value)}
              placeholder="e.g. SCB, KBANK, BBL"
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-64 uppercase"
           />
           <button 
             type="submit"
             disabled={isFetching}
             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
           >
             Compare
           </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 hide-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100">
            <tr>
              <th className="px-4 py-3 font-bold">Ticker</th>
              <th className="px-4 py-3 text-right font-bold w-24">Price</th>
              <th className="px-4 py-3 text-right font-bold w-20">P/E</th>
              <th className="px-4 py-3 text-right font-bold w-20">P/BV</th>
              <th className="px-4 py-3 text-right font-bold w-24">ROE %</th>
              <th className="px-4 py-3 text-right font-bold w-24">D/E</th>
              <th className="px-4 py-3 text-right font-bold w-24">Yield %</th>
              <th className="px-4 py-3 text-center font-bold w-32">Score</th>
            </tr>
          </thead>
          <tbody>
            {peersData.map((peer, i) => {
              const isMain = peer.ticker === mainTicker.toUpperCase();
              return (
                <tr key={peer.ticker} className={`border-b border-slate-50 transition-colors ${isMain ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-black ${isMain ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {peer.ticker}
                      </span>
                      {isMain && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full font-bold">Target</span>}
                    </div>
                  </td>
                  
                  {peer.isLoading ? (
                    <td colSpan={7} className="px-4 py-3 text-center text-slate-400">Loading {peer.ticker}...</td>
                  ) : peer.error ? (
                    <td colSpan={7} className="px-4 py-3 text-center text-red-400 text-xs">Error: {peer.error}</td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {peer.price ? peer.price.toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${peer.pe && avgPE && peer.pe < avgPE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.pe ? peer.pe.toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${peer.pbv && avgPBV && peer.pbv < avgPBV ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.pbv ? peer.pbv.toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${peer.roe && avgROE && peer.roe > avgROE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.roe ? (peer.roe * 100).toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${peer.de && avgDE && peer.de < avgDE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.de ? peer.de.toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${peer.yield && avgYield && peer.yield > avgYield ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.yield ? (peer.yield * 100).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                         {peer.score !== null ? (
                             <span className={`px-2 py-1 flex justify-center items-center rounded text-xs font-bold gap-1 ${
                                peer.score >= 15 ? 'bg-emerald-100 text-emerald-800' :
                                peer.score >= 10 ? 'bg-blue-100 text-blue-800' :
                                peer.score >= 5 ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                             }`}>
                                {peer.score}/20
                             </span>
                         ) : '-'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            
            {/* Industry Average Row */}
            {!isFetching && peersData.length > 0 && (
               <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                 <td className="px-4 py-3 text-slate-700">Industry AVG</td>
                 <td className="px-4 py-3 text-right text-slate-400">-</td>
                 <td className="px-4 py-3 text-right text-slate-800">{avgPE ? avgPE.toFixed(2) : '-'}</td>
                 <td className="px-4 py-3 text-right text-slate-800">{avgPBV ? avgPBV.toFixed(2) : '-'}</td>
                 <td className="px-4 py-3 text-right text-slate-800">{avgROE ? (avgROE * 100).toFixed(2) : '-'}</td>
                 <td className="px-4 py-3 text-right text-slate-800">{avgDE ? avgDE.toFixed(2) : '-'}</td>
                 <td className="px-4 py-3 text-right text-slate-800">{avgYield ? (avgYield * 100).toFixed(2) : '-'}</td>
                 <td className="px-4 py-3"></td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
         <div>
           <span className="font-bold text-slate-700 mb-1 block">เกี่ยวกับ Peer Comparison</span>
           <ul className="list-disc pl-4 space-y-1">
             <li>ระบบจะวิเคราะห์หุ้นในกลุ่มเดียวกัน (Sector) อัตโนมัติ (เช่น BANK, ICT)</li>
             <li>คุณสามารถเพิ่ม/ลด หุ้นเปรียบเทียบในช่องค้นหา (คั่นด้วยลูกน้ำ ,)</li>
             <li><span className="text-emerald-600 font-bold">สีเขียว</span> แสดงถึงค่าที่ดีกว่าค่าเฉลี่ยของกลุ่ม (Industry AVG)</li>
           </ul>
         </div>
      </div>
    </div>
  );
}
