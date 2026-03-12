import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase.from('portfolio').select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Connection successful',
      details: `Found ${data === null ? '0' : 'some'} records` // count might be null if no rows, but connection is ok
    });
  } catch (error: any) {
    console.error('Database Test Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
