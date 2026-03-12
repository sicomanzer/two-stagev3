import React from 'react';
import { Calculator, Settings } from 'lucide-react';

export type AppMode = 'single' | 'multi' | 'portfolio';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  setError: (error: string | null) => void;
  setShowSettings: (show: boolean) => void;
}

export default function Header({ mode, setMode, setError, setShowSettings }: HeaderProps) {
  return (
    <div suppressHydrationWarning className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center space-x-4">
        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
          <Calculator size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">VI Stock Analyzer</h1>
          <p className="text-slate-500 text-sm mt-1">เครื่องมือวิเคราะห์และประเมินมูลค่าหุ้นสำหรับนักลงทุน VI</p>
        </div>
      </div>
      
      <div suppressHydrationWarning className="flex bg-slate-100 p-1 rounded-xl self-start md:self-center">
        <button 
          onClick={() => { setMode('single'); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'single' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Single Stock
        </button>
        <button 
          onClick={() => { setMode('multi'); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'multi' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Multi-Screening
        </button>
        <button 
          onClick={() => { setMode('portfolio'); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'portfolio' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Portfolio
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className={`px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all ml-1`}
          title="ตั้งค่าการแจ้งเตือน"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
