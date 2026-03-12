import React, { useState, useEffect } from 'react';
import { Settings, XCircle, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramBotToken: string;
  setTelegramBotToken: (token: string) => void;
  telegramChatId: string;
  setTelegramChatId: (id: string) => void;
  onSave: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  telegramBotToken,
  setTelegramBotToken,
  telegramChatId,
  setTelegramChatId,
  onSave
}: SettingsModalProps) {
  const [isTestDbLoading, setIsTestDbLoading] = useState(false);

  if (!isOpen) return null;

  const testDbConnection = async () => {
    setIsTestDbLoading(true);
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n${data.details}`);
      } else {
        alert(`❌ เชื่อมต่อฐานข้อมูลไม่สำเร็จ\n${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsTestDbLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-emerald-600" />
            ตั้งค่าการแจ้งเตือน
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Bot Token</label>
            <input
              type="text"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:ABCdefGhI..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              สร้าง Bot ได้ที่ <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@BotFather</a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="123456789"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              หา Chat ID ได้จาก <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@userinfobot</a>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={testDbConnection}
              disabled={isTestDbLoading}
              className="w-full py-2 px-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              {isTestDbLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบการเชื่อมต่อฐานข้อมูล'}
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
