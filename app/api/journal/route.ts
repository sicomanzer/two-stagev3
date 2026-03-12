import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    let query = supabase
      .from('journal')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (ticker) {
      query = query.eq('ticker', ticker);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Journal GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, date, action, price, shares, thesis, notes } = body;

    if (!ticker || !date || !action) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('journal')
      .insert([
        {
          ticker,
          date,
          action,
          price,
          shares,
          thesis,
          notes,
          // user_id will be captured by Supabase if Auth is implemented, or ignored if not.
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Journal POST Error:', error);
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
      .from('journal')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Journal DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
