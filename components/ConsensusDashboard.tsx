'use client';

import React from 'react';
import type { ValuationConsensus } from '@/types/stock';

interface ConsensusDashboardProps {
  consensus: ValuationConsensus;
  ticker: string;
}

export default function ConsensusDashboard({ consensus, ticker }: ConsensusDashboardProps) {
  const models = [
    { name: 'DDM (อ.กวี)', data: consensus.ddm, color: 'bg-emerald-500', bgLight: 'bg-emerald-50' },
    { name: 'Graham Number', data: consensus.graham, color: 'bg-blue-500', bgLight: 'bg-blue-50' },
    { name: 'PE Band (-1SD)', data: consensus.peBand, color: 'bg-purple-500', bgLight: 'bg-purple-50' },
    { name: 'DCF (Free Cash Flow)', data: consensus.dcf, color: 'bg-orange-500', bgLight: 'bg-orange-50' },
  ].filter(m => m.data !== null);

  const maxFair = Math.max(...models.map(m => m.data!.fairPrice), consensus.currentPrice || 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          {ticker} — Fair Value Consensus
        </h3>
        <p className="text-slate-300 text-xs mt-1">Multi-Model Valuation Cross-Check</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Model Bars */}
        {models.map((model, i) => {
          const fair = model.data!.fairPrice;
          const pct = maxFair > 0 ? (fair / maxFair) * 100 : 0;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-700">{model.name}</span>
                <span className="font-bold text-slate-900">{fair.toFixed(2)} บาท</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${model.color} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Consensus Result */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">★ Consensus Fair Value</p>
                <p className="text-3xl font-extrabold text-emerald-700 mt-1">
                  {consensus.consensusFairPrice.toFixed(2)} <span className="text-lg font-medium">บาท</span>
                </p>
              </div>
              {consensus.currentPrice && consensus.upside !== null && (
                <div className="text-center sm:text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase">Current: {consensus.currentPrice.toFixed(2)}</p>
                  <p className={`text-2xl font-extrabold mt-1 ${
                    consensus.upside > 15 ? 'text-emerald-600' :
                    consensus.upside > 0 ? 'text-blue-600' :
                    consensus.upside > -15 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {consensus.upside > 0 ? '+' : ''}{consensus.upside.toFixed(1)}%
                  </p>
                  <p className={`text-xs font-bold px-3 py-1 rounded-full inline-block mt-1 ${
                    consensus.upside > 30 ? 'bg-emerald-100 text-emerald-700' :
                    consensus.upside > 15 ? 'bg-green-100 text-green-700' :
                    consensus.upside > 0 ? 'bg-blue-100 text-blue-700' :
                    consensus.upside > -15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {consensus.upside > 30 ? '🔥 STRONG BUY' :
                     consensus.upside > 15 ? '✅ BUY ZONE' :
                     consensus.upside > 0 ? '➡️ FAIR' :
                     consensus.upside > -15 ? '⚠️ HOLD' : '🛑 OVERVALUED'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Ruler */}
        {consensus.currentPrice && consensus.consensusFairPrice > 0 && (
          <div className="mt-4">
            <PriceRuler 
              currentPrice={consensus.currentPrice} 
              fairPrice={consensus.consensusFairPrice} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PriceRuler({ currentPrice, fairPrice }: { currentPrice: number; fairPrice: number }) {
  const mos50 = fairPrice * 0.5;
  const mos40 = fairPrice * 0.6;
  const mos30 = fairPrice * 0.7;
  const maxPrice = Math.max(fairPrice * 1.3, currentPrice * 1.1);
  const minPrice = Math.min(mos50 * 0.8, currentPrice * 0.9);
  const range = maxPrice - minPrice;

  const getPosition = (price: number) => Math.max(0, Math.min(100, ((price - minPrice) / range) * 100));

  return (
    <div className="relative h-12 bg-gradient-to-r from-emerald-100 via-yellow-100 to-red-100 rounded-lg overflow-visible">
      {/* MOS Markers */}
      {[
        { price: mos50, label: 'MOS 50%', color: 'bg-emerald-600' },
        { price: mos40, label: 'MOS 40%', color: 'bg-teal-600' },
        { price: mos30, label: 'MOS 30%', color: 'bg-cyan-600' },
        { price: fairPrice, label: 'FV', color: 'bg-blue-600' },
      ].map((marker, i) => (
        <div 
          key={i}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${getPosition(marker.price)}%` }}
        >
          <div className={`w-0.5 h-full ${marker.color} opacity-50`} />
          <span className="text-[8px] font-bold text-slate-500 whitespace-nowrap mt-0.5">{marker.label}</span>
        </div>
      ))}

      {/* Current Price Indicator */}
      <div 
        className="absolute top-0 h-full flex flex-col items-center z-10"
        style={{ left: `${getPosition(currentPrice)}%` }}
      >
        <div className="w-4 h-4 bg-slate-800 rounded-full border-2 border-white shadow-lg -mt-1 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
        <span className="text-[9px] font-bold text-slate-800 whitespace-nowrap bg-white/80 px-1 rounded">
          ฿{currentPrice.toFixed(0)}
        </span>
      </div>
    </div>
  );
}
