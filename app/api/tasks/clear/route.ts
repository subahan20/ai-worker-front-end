import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST() {
  try {
    // Clear both connected_tasks and applications for a fresh start
    await supabase.from('connected_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    return NextResponse.json({ success: true, message: 'Queue cleared successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
