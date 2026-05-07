import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { generateDepartmentOverview } from '@/src/lib/ai-generator';

export async function POST() {
  try {
    // 1. Fetch from 'tasks'
    const { data: mTasks, error: mError } = await supabase
      .from('tasks')
      .select('id')
      .in('status', ['waiting_for_ceo', 'pending', 'Pending']);

    if (mError) throw new Error(`Tasks fetch error: ${mError.message}`);

    // 2. Fetch from 'connected_tasks'
    const { data: cTasks, error: cError } = await supabase
      .from('connected_tasks')
      .select('id')
      .in('status', ['waiting_for_ceo', 'pending', 'Pending']);

    if (cError) throw new Error(`Connected tasks fetch error: ${cError.message}`);

    const mIds = mTasks?.map(t => t.id) || [];
    const cIds = cTasks?.map(t => t.id) || [];

    if (mIds.length === 0 && cIds.length === 0) {
      return NextResponse.json({ message: 'No tasks to approve', count: 0 });
    }

    // 3. Update 'tasks'
    if (mIds.length > 0) {
      await supabase.from('tasks').update({ status: 'running' }).in('id', mIds);
      triggerSimulation('tasks', mIds);
    }

    // 4. Update 'connected_tasks'
    if (cIds.length > 0) {
      await supabase.from('connected_tasks').update({ status: 'running' }).in('id', cIds);
      triggerSimulation('connected_tasks', cIds);
    }

    return NextResponse.json({ 
      message: `Approved ${mIds.length + cIds.length} tasks`,
      tasks: mIds.length,
      connected: cIds.length 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function triggerSimulation(table: string, ids: string[]) {
  (async () => {
    for (let progress = 5; progress <= 100; progress += 5) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      try {
        const isComplete = progress === 100;
        
        // 1. Update basic progress
        await supabase
          .from(table)
          .update({ 
            progress, 
            status: isComplete ? 'Completed' : 'running' 
          })
          .in('id', ids);

        // 2. If complete, generate DYNAMIC AI OVERVIEW
        if (isComplete) {
          for (const taskId of ids) {
            // Get task details for context
            const { data: task } = await supabase.from(table).select('*').eq('id', taskId).single();
            
            if (task) {
              const aiData = await generateDepartmentOverview(
                task.department || 'General',
                task.title || 'System Task',
                task
              );

              // Store in ai_overviews table
              await supabase.from('ai_overviews').insert({
                task_id: taskId,
                department: task.department || 'General',
                ai_overview: aiData.ai_overview,
                ai_summary: aiData.ai_summary,
                strengths: aiData.strengths,
                weaknesses: aiData.weaknesses,
                recommendations: aiData.recommendations,
                workflow_insights: aiData.workflow_insights,
                execution_summary: aiData.execution_summary,
                raw_input_data: task
              });

              // Update the task's analysis column
              await supabase.from(table).update({ analysis: aiData }).eq('id', taskId);

              // 3. SPECIAL: If Marketing task, trigger Internal Instagram Workflow
              if (task.department === 'Marketing' && task.metadata?.instagram_url) {
                try {
                  console.log(`[Marketing Worker] Starting Internal Workflow for: ${task.metadata.instagram_url}`);
                  
                  // Trigger Internal Scraper
                  const scrapeRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/marketing/scrape`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: task.metadata.instagram_url })
                  });
                  const scrapeData = await scrapeRes.json();

                  if (scrapeData.username) {
                    // Trigger Internal AI Analysis
                    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/marketing/analyze`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username: scrapeData.username })
                    });
                    console.log(`[Marketing Worker] Workflow completed for: ${scrapeData.username}`);
                  }
                } catch (marketingErr) {
                  console.error("[Marketing Worker] Automation failure:", marketingErr);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Simulation] ${table} exception:`, err);
        break;
      }
    }
  })();
}
