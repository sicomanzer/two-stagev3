'use client';

import React from 'react';
import type { ScenarioAnalysis } from '@/types/stock';

interface ScenarioAnalysisPanelProps {
  analysis: ScenarioAnalysis;
}

export default function ScenarioAnalysisPanel({ analysis }: ScenarioAnalysisPanelProps) {
  const maxFair = Math.max(...analysis.scenarios.map(s => s.fairPrice));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">🎲</span>
          {analysis.ticker} — Scenario Analysis
        </h3>
        <p className="text-amber-100 text-xs mt-1">วิเคราะห์มูลค่าหุ้นตาม Scenario ต่างๆ (Bull / Base / Bear)</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Scenario Cards */}
        {analysis.scenarios.map((scenario, i) => {
          const pct = maxFair > 0 ? (scenario.fairPrice / maxFair) * 100 : 0;
          const isBase = scenario.name.includes('Base');
          const isBull = scenario.name.includes('Bull');

          return (
            <div 
              key={i} 
              className={`rounded-xl p-4 border transition-all ${
                isBase ? 'border-blue-200 bg-blue-50/50' : 
                isBull ? 'border-emerald-200 bg-emerald-50/50' : 
                'border-amber-200 bg-amber-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {isBull ? '🚀' : isBase ? '📊' : '🐻'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{scenario.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      g={((scenario.g) * 100).toFixed(0)}% | ks={((scenario.ks) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-lg text-slate-800">{scenario.fairPrice.toFixed(2)}</span>
                  <span className="text-slate-500 text-xs ml-1">บาท</span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isBull ? 'bg-emerald-500' : isBase ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Probability */}
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">
                  Probability: {(scenario.probability * 100).toFixed(0)}%
                </span>
                {analysis.currentPrice && (
                  <span className={`text-[10px] font-bold ${
                    scenario.fairPrice > analysis.currentPrice ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {scenario.fairPrice > analysis.currentPrice ? '▲' : '▼'} 
                    {' '}{Math.abs(((scenario.fairPrice - analysis.currentPrice) / analysis.currentPrice * 100)).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Weighted Result */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                ★ Probability-Weighted Fair Value
              </p>
              <p className="text-3xl font-extrabold mt-1">
                {analysis.weightedFairPrice.toFixed(2)} <span className="text-lg font-medium text-slate-400">บาท</span>
              </p>
            </div>
            {analysis.currentPrice && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Current: ฿{analysis.currentPrice.toFixed(2)}</p>
                <p className={`text-xl font-bold mt-1 ${
                  analysis.weightedFairPrice > analysis.currentPrice ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {analysis.weightedFairPrice > analysis.currentPrice ? '+' : ''}
                  {(((analysis.weightedFairPrice - analysis.currentPrice) / analysis.currentPrice) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
