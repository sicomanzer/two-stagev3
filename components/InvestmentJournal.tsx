import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types/portfolio';
import { Trash2 } from 'lucide-react';

interface InvestmentJournalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
}

export default function InvestmentJournal({ isOpen, onClose, ticker }: InvestmentJournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [action, setAction] = useState<'BUY' | 'SELL' | 'WATCH' | 'NOTE'>('NOTE');
  const [price, setPrice] = useState('');
  const [shares, setShares] = useState('');
  const [thesis, setThesis] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal?ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
       console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && ticker) {
      fetchEntries();
    }
  }, [isOpen, ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !date || !action) return;

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          date,
          action,
          price: price ? parseFloat(price) : null,
          shares: shares ? parseFloat(shares) : null,
          thesis,
          notes
        }),
      });

      if (res.ok) {
        // Reset form except defaults
        setThesis('');
        setNotes('');
        setPrice('');
        setShares('');
        fetchEntries(); // reload
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(entries.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-emerald-500/10 border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📓</span> {ticker} Investment Journal
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 bg-slate-50/50">
            
            {/* Form */}
            <div className="w-full md:w-1/3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit sticky top-0">
                <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Add New Entry</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"/>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                            <select value={action} onChange={e => setAction(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all">
                                <option value="BUY">🟢 BUY</option>
                                <option value="SELL">🔴 SELL</option>
                                <option value="WATCH">👀 WATCH</option>
                                <option value="NOTE">📝 NOTE</option>
                            </select>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Price</label>
                            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"/>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Shares</label>
                            <input type="number" step="0.0001" value={shares} onChange={e => setShares(e.target.value)} placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"/>
                         </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Investment Thesis 💡</label>
                        <textarea value={thesis} onChange={e => setThesis(e.target.value)} placeholder="Why are you taking this action? (e.g. Undervalued by 30% based on DCF)" rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-slate-50 focus:bg-white transition-all"/>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Additional Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Upcoming earnings, risks, etc." rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-slate-50 focus:bg-white transition-all"/>
                     </div>
                     <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors mt-2 shadow-sm">
                        Save Entry
                     </button>
                </form>
            </div>

            {/* List */}
            <div className="w-full md:w-2/3 space-y-4">
                {loading ? (
                    <div className="text-center p-10 text-slate-400">Loading entries...</div>
                ) : entries.length === 0 ? (
                    <div className="bg-white border text-sm border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400 hover:bg-slate-50 transition-colors">
                        <p className="text-4xl mb-3">📓</p>
                        <p>No journal entries yet.</p>
                        <p className="text-xs">Start logging your thesis logically to avoid emotional decisions.</p>
                    </div>
                ) : (
                    entries.map(entry => (
                        <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                            <button 
                                onClick={() => handleDelete(entry.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-red-50 p-2 rounded-full"
                            >
                                <Trash2 size={16} />
                            </button>
                            
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                                    entry.action === 'BUY' ? 'bg-emerald-100 text-emerald-800' :
                                    entry.action === 'SELL' ? 'bg-red-100 text-red-800' :
                                    entry.action === 'WATCH' ? 'bg-blue-100 text-blue-800' :
                                    'bg-slate-100 text-slate-800'
                                }`}>
                                    {entry.action}
                                </span>
                                <span className="text-sm font-bold text-slate-700">{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                
                                {entry.price && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded ml-auto">Price: ฿{entry.price}</span>}
                                {entry.shares && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Shares: {entry.shares}</span>}
                            </div>
                            
                            {entry.thesis && (
                                <div className="mb-3">
                                    <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">💡 Investment Thesis</p>
                                    <p className="text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 leading-relaxed">{entry.thesis}</p>
                                </div>
                            )}
                            {entry.notes && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">📝 Notes</p>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
