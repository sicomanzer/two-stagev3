'use client';

import React from 'react';
import type { TrendAnalysis } from '@/types/stock';

interface TrendAnalysisPanelProps {
  analysis: TrendAnalysis;
}

const trendIcon = (trend: string) => {
  switch (trend) {
    case 'up': case 'improving': case 'healthy': return '📈';
    case 'down': case 'declining': case 'concern': case 'deteriorating': return '📉';
    default: return '➡️';
  }
};

const trendColor = (trend: string) => {
  switch (trend) {
    case 'up': case 'improving': case 'healthy': return 'text-emerald-600 bg-emerald-50';
    case 'down': case 'declining': case 'concern': case 'deteriorating': return 'text-red-600 bg-red-50';
    default: return 'text-slate-600 bg-slate-50';
  }
};

function formatCAGR(val: number | null): string {
  if (val === null) return '-';
  return `${val > 0 ? '+' : ''}${(val * 100).toFixed(1)}%`;
}

function cagrCellColor(val: number | null): string {
  if (val === null) return 'text-slate-400';
  if (val > 0.10) return 'text-emerald-600 font-bold';
  if (val > 0.05) return 'text-emerald-500';
  if (val > 0) return 'text-blue-500';
  if (val > -0.05) return 'text-amber-600';
  return 'text-red-600 font-bold';
}

export default function TrendAnalysisPanel({ analysis }: TrendAnalysisPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">📈</span>
          {analysis.ticker} — Trend Analysis
        </h3>
        <p className="text-blue-200 text-xs mt-1">วิเคราะห์แนวโน้มการเติบโตย้อนหลัง 3, 5, 10 ปี (CAGR)</p>
      </div>

      <div className="p-6 space-y-6">

        {/* CAGR Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-bold uppercase text-slate-500">ตัวชี้วัด</th>
                <th className="text-right py-2 px-3 text-xs font-bold uppercase text-slate-500">CAGR 3Y</th>
                <th className="text-right py-2 px-3 text-xs font-bold uppercase text-slate-500">CAGR 5Y</th>
                <th className="text-right py-2 px-3 text-xs font-bold uppercase text-slate-500">CAGR 10Y</th>
                <th className="text-center py-2 px-3 text-xs font-bold uppercase text-slate-500">แนวโน้ม</th>
              </tr>
            </thead>
            <tbody>
              {analysis.cagrs.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-700">{row.metric}</td>
                  <td className={`py-2.5 px-3 text-right ${cagrCellColor(row.cagr3y)}`}>{formatCAGR(row.cagr3y)}</td>
                  <td className={`py-2.5 px-3 text-right ${cagrCellColor(row.cagr5y)}`}>{formatCAGR(row.cagr5y)}</td>
                  <td className={`py-2.5 px-3 text-right ${cagrCellColor(row.cagr10y)}`}>{formatCAGR(row.cagr10y)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendColor(row.trend)}`}>
                      {trendIcon(row.trend)} {row.trend === 'up' ? 'ดี' : row.trend === 'down' ? 'ลด' : 'คงที่'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Earnings Quality */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span>🔍</span> Earnings Quality Check
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QualityCard
              title="NPM Trend"
              value={analysis.earningsQuality.npmTrend}
              icon={trendIcon(analysis.earningsQuality.npmTrend)}
              color={trendColor(analysis.earningsQuality.npmTrend)}
            />
            <QualityCard
              title="Rev vs Profit"
              value={analysis.earningsQuality.revenueVsProfit}
              icon={trendIcon(analysis.earningsQuality.revenueVsProfit)}
              color={trendColor(analysis.earningsQuality.revenueVsProfit)}
            />
            <QualityCard
              title="D/E Trend"
              value={analysis.earningsQuality.deTrend}
              icon={trendIcon(analysis.earningsQuality.deTrend)}
              color={trendColor(analysis.earningsQuality.deTrend)}
            />
            <QualityCard
              title="ปันผลต่อเนื่อง"
              value={`${analysis.earningsQuality.dividendConsistency} ปี`}
              icon="💰"
              color={analysis.earningsQuality.dividendConsistency >= 5 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QualityCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div className={`rounded-xl p-3 border ${color.includes('emerald') ? 'border-emerald-200' : color.includes('red') ? 'border-red-200' : 'border-slate-200'} ${color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-50'}`}>
      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{title}</p>
      <p className={`text-sm font-bold ${color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-700'}`}>
        {icon} {value}
      </p>
    </div>
  );
}
