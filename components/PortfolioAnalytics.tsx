'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { PortfolioItem } from '@/types/portfolio';

interface PortfolioAnalyticsProps {
  items: PortfolioItem[];
}

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#d946ef',
];

export default function PortfolioAnalytics({ items }: PortfolioAnalyticsProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center text-slate-400">
        <p>ยังไม่มีข้อมูลใน Portfolio สำหรับวิเคราะห์</p>
      </div>
    );
  }

  // Calculate allocation data
  const totalValue = items.reduce((sum, item) => {
    const price = item.current_price || 0;
    const shares = item.mos30_shares || item.mos40_shares || 100;
    return sum + price * shares;
  }, 0);

  const allocationData = items.map((item, i) => {
    const price = item.current_price || 0;
    const shares = item.mos30_shares || item.mos40_shares || 100;
    const value = price * shares;
    return {
      name: item.ticker,
      value: value,
      pct: totalValue > 0 ? (value / totalValue * 100) : 0,
      color: COLORS[i % COLORS.length],
    };
  }).sort((a, b) => b.value - a.value);

  // Calculate summary stats
  const totalInvested = items.reduce((sum, item) => {
    return sum + (item.mos30_cost || 0) + (item.mos40_cost || 0) + (item.mos50_cost || 0);
  }, 0);

  const totalAnnualDividend = items.reduce((sum, item) => {
    const d0 = item.d0 || 0;
    const shares = (item.mos30_shares || 0) + (item.mos40_shares || 0) + (item.mos50_shares || 0);
    return sum + (d0 * shares);
  }, 0);

  const avgDividendYield = items.reduce((sum, item) => {
    return sum + (item.dividend_yield || item.yield || 0);
  }, 0) / items.length;

  // MOS Distribution
  const mosDistribution = [
    { name: 'MOS 50%', count: items.filter(i => i.status === 'MOS 50%').length, color: '#10b981' },
    { name: 'MOS 40%', count: items.filter(i => i.status === 'MOS 40%').length, color: '#14b8a6' },
    { name: 'MOS 30%', count: items.filter(i => i.status === 'MOS 30%').length, color: '#06b6d4' },
    { name: 'ต่ำกว่า FV', count: items.filter(i => i.status === 'ต่ำกว่า FV').length, color: '#3b82f6' },
    { name: 'รอก่อนนะ', count: items.filter(i => i.status === 'รอก่อนนะ' || !i.status).length, color: '#f59e0b' },
  ].filter(d => d.count > 0);

  // Dividend Yield Ranking
  const yieldRanking = items
    .map(item => ({
      ticker: item.ticker,
      yield: (item.dividend_yield || item.yield || 0) * 100,
    }))
    .sort((a, b) => b.yield - a.yield);

  // --- NEW: Performance Tracking ---
  const performanceData = items.map(item => {
     // Simplified assumptions: If user has 'shares' entered for MOS levels, we assume they bought it.
     // If not, we fall back to 0 cost and 0 shares.
     const totalShares = (item.mos30_shares || 0) + (item.mos40_shares || 0) + (item.mos50_shares || 0);
     const totalCost = (item.mos30_cost || 0) + (item.mos40_cost || 0) + (item.mos50_cost || 0);
     
     const currentPrice = item.current_price || 0;
     const marketValue = currentPrice * totalShares;
     const unrealizedPL = marketValue - totalCost;
     const unrealizedPLPct = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;
     const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

     return {
         ticker: item.ticker,
         marketValue,
         totalCost,
         avgCost,
         unrealizedPL,
         unrealizedPLPct,
         totalShares
     }
  }).sort((a,b) => b.marketValue - a.marketValue);

  const totalMarketValue = performanceData.reduce((sum, d) => sum + d.marketValue, 0);
  const totalPL = performanceData.reduce((sum, d) => sum + d.unrealizedPL, 0);
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  // --- NEW: Dividend Calendar (Mock) ---
  // Since we don't have exact ex-dividend dates from Yahoo Finance basic quote,
  // we will distribute the annual dividend evenly or across typical months (Apr, Sep) for Thai stocks.
  const dividendCalendar = items.filter(item => (item.d0 || 0) > 0 && ((item.mos30_shares || 0) + (item.mos40_shares || 0) + (item.mos50_shares || 0) > 0)).map(item => {
      const shares = (item.mos30_shares || 0) + (item.mos40_shares || 0) + (item.mos50_shares || 0);
      const totalDiv = (item.d0 || 0) * shares;
      
      // Thai stocks usually pay heavily in April and some in Sep
      return {
          ticker: item.ticker,
          totalDiv,
          aprDiv: totalDiv * 0.6,
          sepDiv: totalDiv * 0.4
      }
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const calendarData = months.map(m => ({ month: m, amount: 0 }));
  
  dividendCalendar.forEach(item => {
      calendarData[3].amount += item.aprDiv; // Apr
      calendarData[8].amount += item.sepDiv; // Sep
  });

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm">
          <p className="font-bold text-slate-700">{payload[0].name}</p>
          <p className="text-slate-600">{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท</p>
          <p className="text-slate-500 text-xs">{payload[0].payload.pct?.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          title="จำนวนหุ้น"
          value={`${items.length}`}
          subtitle="ตัว"
          icon="📊"
          color="bg-blue-50 border-blue-200"
        />
        <SummaryCard
          title="ต้นทุนรวม"
          value={`฿${totalInvested > 0 ? (totalInvested / 1000000).toFixed(2) : '0'}`}
          subtitle="ล้านบาท"
          icon="🏦"
          color="bg-slate-50 border-slate-200"
        />
        <SummaryCard
          title="มูลค่าตลาด"
          value={`฿${totalMarketValue > 0 ? (totalMarketValue / 1000000).toFixed(2) : '0'}`}
          subtitle="ล้านบาท"
          icon="💰"
          color="bg-emerald-50 border-emerald-200"
        />
        <SummaryCard
          title="P/L รวม"
          value={`${totalPL > 0 ? '+' : ''}${totalPLPct.toFixed(2)}%`}
          subtitle={`฿${totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท`}
          icon={totalPL >= 0 ? '📈' : '📉'}
          color={totalPL >= 0 ? "bg-emerald-100 border-emerald-300" : "bg-red-100 border-red-300"}
        />
        <SummaryCard
          title="ปันผลต่อปี (โดยประมาณ)"
          value={`฿${totalAnnualDividend > 0 ? totalAnnualDividend.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}`}
          subtitle={`เฉลี่ย ${(avgDividendYield * 100).toFixed(2)}%`}
          icon="💵"
          color="bg-purple-50 border-purple-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allocation Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>🥧</span> Portfolio Allocation
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, pct }: any) => `${name} ${pct.toFixed(0)}%`}
                  labelLine={false}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dividend Yield Ranking */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>💰</span> Dividend Yield Ranking
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldRanking} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" unit="%" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} width={60} />
                <Tooltip
                  formatter={(value: any) => [`${value.toFixed(2)}%`, 'Div Yield']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="yield" name="Yield %" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MOS Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>🛡️</span> MOS Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mosDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  label={({ name, count }: any) => `${name} (${count})`}
                >
                  {mosDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Unrealized P/L */}
               <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>📈</span> Unrealized P/L
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {performanceData.filter(d => d.totalShares > 0).length > 0 ? performanceData.filter(d => d.totalShares > 0).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <div className="font-bold text-slate-800">{item.ticker}</div>
                          <div className="text-[10px] text-slate-500">{item.totalShares.toLocaleString()} หุ้น • ทุน {item.avgCost.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black ${item.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.unrealizedPL >= 0 ? '+' : ''}{item.unrealizedPL.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} 
                              <span className="text-xs ml-1">({item.unrealizedPLPct >= 0 ? '+' : ''}{item.unrealizedPLPct.toFixed(2)}%)</span>
                          </div>
                          <div className="text-[10px] text-slate-500">มูลค่า: ฿{item.marketValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                        </div>
                      </div>
                    )) : (
                        <div className="text-center text-sm text-slate-400 py-8">คุณยังไม่ได้กรอกจำนวนหุ้นและราคาต้นทุน</div>
                    )}
                  </div>
               </div>
               
               {/* Dividend Calendar */}
               <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>📅</span> Dividend Calendar (Estimated)
                  </h3>
                  <div className="h-[250px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calendarData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `฿${(val/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: any) => [`฿${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'ปันผลรับ']}
                          labelStyle={{ color: '#334155', fontWeight: 'bold' }}
                          cursor={{fill: '#f8fafc'}}
                        />
                        <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-400 text-center">*ปฏิทินประมาณการ อ้างอิงรอบการจ่ายปันผลปกติของหุ้นไทย (เม.ย. และ ก.ย.)</p>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle: string; icon: string; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-slate-500">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-xl font-extrabold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400">{subtitle}</p>
    </div>
  );
}
