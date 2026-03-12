
'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';

interface StockHistory {
  year: number;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  dps: number | null;
  de: number | null;
  npm: number | null;
  pe: number | null;
  pbv: number | null;
  price: number | null;
  bvps: number | null;
}

interface BandData {
  date: string;
  value: number;
  price: number;
}

interface RatioBands {
  pe: {
    data: BandData[];
    stats: { avg: number; sd: number };
  };
  pbv: {
    data: BandData[];
    stats: { avg: number; sd: number };
  };
}

interface StockChartsProps {
  history: StockHistory[];
  ratioBands?: RatioBands;
  ticker: string;
}

const formatNumber = (num: number | null) => {
  if (num === null || num === undefined) return '-';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(2);
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value)} {unit}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartContainer = ({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <h3 className="text-xl font-bold text-slate-800 mb-6">{title}</h3>
    <div className="h-[350px] w-full">
      {children}
    </div>
    {footer && (
      <div className="mt-6 pt-4 border-t border-slate-50 text-center font-bold text-[#003399] text-sm md:text-base">
        {footer}
      </div>
    )}
  </div>
);

export default function StockCharts({ history, ratioBands, ticker }: StockChartsProps) {
  if (!history || history.length === 0) {
    return <div className="text-center p-8 text-slate-500">ไม่มีข้อมูลประวัติสำหรับหุ้นนี้</div>;
  }

  // Prepare PE Band Data
  const peChartData = ratioBands?.pe.data.map(d => {
    const { avg, sd } = ratioBands.pe.stats;
    return {
      date: d.date.substring(2, 7).replace('-', '/'), // YY/MM
      pe: d.value,
      avg: avg,
      sd1p: avg + sd,
      sd2p: avg + 2 * sd,
      sd1m: avg - sd,
      sd2m: avg - 2 * sd,
    };
  }) || [];

  const peLast = peChartData[peChartData.length - 1];
  const peStats = ratioBands?.pe.stats;
  const peFooter = peStats ? `[ Last PE = ${peLast?.pe.toFixed(2)} ] (${(peStats.avg - 2 * peStats.sd).toFixed(2)}) (${(peStats.avg - peStats.sd).toFixed(2)}) [ AVG = ${peStats.avg.toFixed(2)} ] (${(peStats.avg + peStats.sd).toFixed(2)}) (${(peStats.avg + 2 * peStats.sd).toFixed(2)})` : '';

  // Prepare PBV Band Data
  const pbvChartData = ratioBands?.pbv.data.map(d => {
    const { avg, sd } = ratioBands.pbv.stats;
    return {
      date: d.date.substring(2, 7).replace('-', '/'), // YY/MM
      pbv: d.value,
      avg: avg,
      sd1p: avg + sd,
      sd2p: avg + 2 * sd,
      sd1m: avg - sd,
      sd2m: avg - 2 * sd,
    };
  }) || [];

  const pbvLast = pbvChartData[pbvChartData.length - 1];
  const pbvStats = ratioBands?.pbv.stats;
  const pbvFooter = pbvStats ? `[ Last PBV = ${pbvLast?.pbv.toFixed(2)} ] (${(pbvStats.avg - 2 * pbvStats.sd).toFixed(2)}) (${(pbvStats.avg - pbvStats.sd).toFixed(2)}) [ AVG = ${pbvStats.avg.toFixed(2)} ] (${(pbvStats.avg + pbvStats.sd).toFixed(2)}) (${(pbvStats.avg + 2 * pbvStats.sd).toFixed(2)})` : '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* EPS Chart */}
      <ChartContainer title={`${ticker} : กำไรต่อหุ้น (EPS)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
            <Tooltip content={<CustomTooltip unit="THB" />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="eps" name="EPS" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* DPS Chart */}
      <ChartContainer title={`${ticker} : เงินปันผลต่อหุ้น (DPS)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
            <Tooltip content={<CustomTooltip unit="THB" />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="dps" name="DPS" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* D/E Ratio Chart */}
      <ChartContainer title={`${ticker} : อัตราส่วนหนี้สินต่อทุน (D/E)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
            <Tooltip content={<CustomTooltip unit="x" />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="de" name="D/E" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Net Profit Chart */}
      <ChartContainer title={`${ticker} : กำไรสุทธิ (Net Profit)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => (val/1e6).toFixed(0) + 'M'} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="netProfit" name="Net Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Revenue Chart */}
      <ChartContainer title={`${ticker} : รายได้รวม (Revenue)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => (val/1e6).toFixed(0) + 'M'} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Net Profit Margin Chart */}
      <ChartContainer title={`${ticker} : อัตรากำไรสุทธิ (NPM %)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} unit="%" />
            <Tooltip content={<CustomTooltip unit="%" />} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="npm" name="NPM" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* P/E Band Chart */}
      <ChartContainer title={`${ticker} : PE Band (P/E Ratio Band)`} footer={peFooter}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={peChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} interval={Math.floor(peChartData.length / 10)} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36}/>
            <Line type="monotone" dataKey="pe" name="PE" stroke="#003399" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="sd2m" name="-2SD" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="sd1m" name="-1SD" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="avg" name="AVG" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="sd1p" name="+1SD" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="sd2p" name="+2SD" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* P/BV Band Chart */}
      <ChartContainer title={`${ticker} : PBV Band (P/BV Ratio Band)`} footer={pbvFooter}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pbvChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} interval={Math.floor(pbvChartData.length / 10)} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36}/>
            <Line type="monotone" dataKey="pbv" name="PBV" stroke="#7e22ce" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="sd2m" name="-2SD" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="sd1m" name="-1SD" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="avg" name="AVG" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="sd1p" name="+1SD" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="sd2p" name="+2SD" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

    </div>
  );
}
