import { useState, useEffect } from 'react';

export function useNotifications() {
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('telegramBotToken');
    const savedChatId = localStorage.getItem('telegramChatId');
    if (savedToken) setTelegramBotToken(savedToken);
    if (savedChatId) setTelegramChatId(savedChatId);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('telegramBotToken', telegramBotToken);
    localStorage.setItem('telegramChatId', telegramChatId);
  };

  const sendTelegramMessage = async (text: string) => {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: text,
          parse_mode: 'Markdown'
        }),
      });
    } catch (err) {
      console.error('Failed to send Telegram message', err);
    }
  };

  const checkPriceAlerts = async (
    items: any[], 
    setIsLoadingData: (v: boolean) => void,
    silent = false,
  ) => {
    if (items.length === 0) return { updatedPortfolio: items, hasUpdates: false };
    
    setIsLoadingData(true);
    let alertMessages: string[] = [];
    let hasUpdates = false;

    // Request Notification permission if needed
    if (!silent && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    try {
      const updatedPortfolio = await Promise.all(items.map(async (item) => {
        try {
          // Fetch latest price
          const res = await fetch(`/api/stock?ticker=${item.ticker}`);
          const data = await res.json();
          
          if (!res.ok) return item; // Keep old data if fetch fails
          
          const latestPrice = data.currentPrice;
          
          // Check for alerts
          let alertLevel = '';
          if (item.target_price && latestPrice <= item.target_price) alertLevel = `Target Price (${item.target_price})`;
          else if (latestPrice <= item.mos50_price) alertLevel = 'MOS 50%';
          else if (latestPrice <= item.mos40_price) alertLevel = 'MOS 40%';
          else if (latestPrice <= item.mos30_price) alertLevel = 'MOS 30%';
          
          if (alertLevel) {
            const msg = `🚨 *${item.ticker}* ราคา ${latestPrice.toFixed(2)} บาท\nแตะระดับ ${alertLevel} (Fair: ${item.fair_price?.toFixed(2)})`;
            alertMessages.push(msg);
          }

          // Always enrich item with fresh financial data
          // This ensures we display values even if they aren't saved in DB yet
          const updatedItem = {
            ...item,
            current_price: latestPrice,
            d0: data.d0,
            roe: data.roe,
            roa: data.roa,
            eps: data.eps,
            debt_to_equity: data.debtToEquity,
            pbv: data.pbv,
            pe: data.pe,
            yield: data.dividendYield
          };

          hasUpdates = true;

          // Update Supabase
          // 1. Always update price (critical)
          if (latestPrice !== item.current_price) {
            fetch('/api/portfolio', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.id, current_price: latestPrice })
            }).catch(err => console.error(`Error updating price for ${item.ticker}`, err));
          }
          
          // 2. Try to update other fields (might fail if columns don't exist in DB)
          // We do this separately to ensure price update always succeeds
          if (data.d0 !== undefined) {
             fetch('/api/portfolio', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                id: item.id,
                d0: data.d0,
                roe: data.roe,
                roa: data.roa,
                eps: data.eps,
                de: data.debtToEquity, // Changed from debt_to_equity to de to match DB column
                pbv: data.pbv,
                pe: data.pe,
                dividend_yield: data.dividendYield
              })
            }).catch(err => console.warn(`Could not persist extended data for ${item.ticker}`, err));
          }

          return updatedItem;
        } catch (err) {
          console.error(`Error checking ${item.ticker}`, err);
          return item;
        }
      }));

      // Send Notifications
      if (!silent && alertMessages.length > 0) {
        // 1. Web Notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Two-Stage DDM Alert', {
            body: `พบหุ้นน่าสนใจ ${alertMessages.length} ตัว! คลิกเพื่อดูรายละเอียด`,
          });
        }

        // 2. Telegram Notification
        if (telegramBotToken && telegramChatId) {
          const text = `🔥 *Two-Stage Price Alert*\n\n${alertMessages.join('\n\n')}`;
          await sendTelegramMessage(text);
        }
        
        // Show in-app alert as well
        alert(`พบหุ้นถึงราคาเป้าหมาย ${alertMessages.length} ตัว!\nตรวจสอบรายละเอียดใน Telegram หรือหน้า Portfolio`);
      } else if (!silent) {
        alert('ตรวจสอบราคาล่าสุดแล้ว ยังไม่พบหุ้นที่ถึงราคาเป้าหมาย (MOS 30% ขึ้นไป)');
      }

      return { updatedPortfolio, hasUpdates };
    } catch (err) {
      console.error('Error checking prices', err);
      alert('เกิดข้อผิดพลาดในการตรวจสอบราคา');
      return { updatedPortfolio: items, hasUpdates: false };
    } finally {
      setIsLoadingData(false);
    }
  };

  return {
    telegramBotToken,
    setTelegramBotToken,
    telegramChatId,
    setTelegramChatId,
    saveSettings,
    checkPriceAlerts
  };
}
