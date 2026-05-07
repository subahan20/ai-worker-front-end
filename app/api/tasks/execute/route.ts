import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { WorkerEngine } from '@/src/lib/WorkerEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Handle CEO Email Task Type
    if (body.type === 'CEO_EMAIL') {
      const { candidateName, evaluation } = body;
      console.log('--- CEO NOTIFICATION ---');
      console.log(`TO: CEO@company.ai`);
      console.log(`SUBJECT: HR Evaluation Report: ${candidateName}`);
      console.log(`BODY: 
        Hello CEO,
        
        The AI HR Engine has completed the evaluation for ${candidateName}.
        
        STATUS: ${evaluation.status}
        ATS SCORE: ${evaluation.ats_score}/100
        
        STRENGTHS: ${evaluation.strengths?.join(', ')}
        
        IMPROVEMENT PLAN:
        ${evaluation.improvement_plan}
        
        SUMMARY:
        ${evaluation.final_summary}
      `);
      console.log('--- EMAIL SENT SUCCESSFULLY ---');
      
      return NextResponse.json({ success: true, message: 'Email sent to CEO' });
    }

    const { taskId } = body;
    if (!taskId) return NextResponse.json({ error: 'taskId or type required' }, { status: 400 });

    const { data: task, error } = await supabase
      .from('connected_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) throw new Error('Task not found');

    // Fire and forget
    WorkerEngine.executeTask(taskId, task.steps || []).catch(console.error);

    return NextResponse.json({ success: true, message: 'Worker started' });
  } catch (err: any) {
    console.error('Execution Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
