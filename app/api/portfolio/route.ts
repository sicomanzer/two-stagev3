import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    let query = supabase
      .from('portfolio')
      .select('*')
      .order('created_at', { ascending: false });

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ticker, currentPrice, fairPrice, d0, g, ks,
      pe, pbv, debtToEquity, roa, roe, dividendYield, eps,
      mos30Price, shares30, cost30,
      mos40Price, shares40, cost40,
      mos50Price, shares50, cost50,
      statusLabel,
      portfolioId // New field
    } = body;

    const { data, error } = await supabase
      .from('portfolio')
      .insert([
        {
          ticker,
          current_price: currentPrice,
          fair_price: fairPrice,
          d0,
          g,
          ks,
          pe,
          pbv,
          de: debtToEquity,
          roa,
          roe,
          dividend_yield: dividendYield,
          eps,
          mos30_price: mos30Price,
          mos30_shares: shares30,
          mos30_cost: cost30,
          mos40_price: mos40Price,
          mos40_shares: shares40,
          mos40_cost: cost40,
          mos50_price: mos50Price,
          mos50_shares: shares50,
          mos50_cost: cost50,
          status: statusLabel,
          portfolio_id: portfolioId // Save to specific portfolio
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ id: data[0].id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Build dynamic update object
    // Note: Ensure frontend sends keys that match Supabase columns, or map them here if needed.
    // Based on previous code, we should map specific fields if they come in as camelCase but DB is snake_case.
    // However, the frontend currently sends DB-compatible keys for some patches, or we need to be careful.
    // Let's assume the frontend sends keys that match the DB columns for PATCH, OR we map known ones.
    
    // Simple mapping for known mixedCase keys to snake_case if they exist in updates
    const mappedUpdates: any = { ...updates };
    if (updates.currentPrice !== undefined) {
       mappedUpdates.current_price = updates.currentPrice;
       delete mappedUpdates.currentPrice;
    }
    if (updates.debtToEquity !== undefined) {
        mappedUpdates.de = updates.debtToEquity;
        delete mappedUpdates.debtToEquity;
    }
    if (updates.dividendYield !== undefined) {
        mappedUpdates.dividend_yield = updates.dividendYield;
        delete mappedUpdates.dividendYield;
    }
    
    // Remove any keys that are undefined/null if that's not intended (optional)

    const { error } = await supabase
      .from('portfolio')
      .update(mappedUpdates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
