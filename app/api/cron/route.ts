import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PortfolioItem } from '@/types/portfolio';

// Initialize Supabase Client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');

    // Secure the route with a secret key
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all portfolio items
    const { data: items, error } = await supabase
      .from('portfolio')
      .select('*');

    if (error) throw error;
    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'No items to check' });
    }

    const alertMessages: string[] = [];
    const updatedItems = [];

    // 2. Check each item against current prices
    for (const item of (items as PortfolioItem[])) {
      try {
        // Fetch latest price from our internal API (ensure full URL in production)
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const res = await fetch(`${protocol}://${host}/api/stock?ticker=${item.ticker}`);
        const data = await res.json();

        if (!res.ok) continue;

        const latestPrice = data.currentPrice;

        // Check against Target Price if defined, else MOS
        let alertLevel = '';
        if (item.target_price && latestPrice <= item.target_price) {
          alertLevel = `Target Price (${item.target_price})`;
        } else if (item.mos50_price && latestPrice <= item.mos50_price) {
          alertLevel = 'MOS 50%';
        } else if (item.mos40_price && latestPrice <= item.mos40_price) {
          alertLevel = 'MOS 40%';
        } else if (item.mos30_price && latestPrice <= item.mos30_price) {
          alertLevel = 'MOS 30%';
        }

        if (alertLevel) {
          const msg = `🚨 *${item.ticker}* ราคา ${latestPrice.toFixed(2)} บาท\nแตะระดับ *${alertLevel}* (Fair: ${item.fair_price?.toFixed(2)})`;
          alertMessages.push(msg);
        }

        // Always update price in DB
        if (latestPrice !== item.current_price) {
           await supabase
            .from('portfolio')
            .update({ current_price: latestPrice })
            .eq('id', item.id);
        }
      } catch (err) {
        console.error(`Error checking price for ${item.ticker}:`, err);
      }
    }

    // 3. Send Notifications via Telegram (if configured globally or per-user)
    // NOTE: In a multi-user app, you would fetch User profiles here to get their telegram Chat IDs.
    // For now, we will assume a global environment variable for the admin.
    
    // (Optional) You can use the browser's local storage token via another means,
    // but Cron implies server execution.
    // Easiest is to add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.local
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId && alertMessages.length > 0) {
      const text = `🔥 *Two-Stage Daily Alert (Cron)* 🔥\n\n${alertMessages.join('\n\n')}`;
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        }),
      });
    }

    return NextResponse.json({
      message: 'Cron job executed successfully',
      alertsSent: alertMessages.length
    });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
