import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { WorkerEngine } from '@/src/lib/WorkerEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dept: string }> }
) {
  const { dept } = await params;
  const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);

  try {
    // 1. Fetch all PENDING tasks for this department
    const { data: tasks, error } = await supabase
      .from('connected_tasks')
      .select('*')
      .eq('department', deptName)
      .eq('status', 'PENDING');

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `No pending tasks found for ${deptName} department.` 
      });
    }

    // 2. Start workers for each task (fire and forget)
    tasks.forEach(task => {
      WorkerEngine.executeTask(task.id, task.steps || []).catch(err => 
        console.error(`[Worker] Failed for task ${task.id}:`, err)
      );
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully initialized ${tasks.length} tasks for ${deptName}.`,
      count: tasks.length
    });

  } catch (error: any) {
    console.error(`[Workflow API] Error running dept ${dept}:`, error.message);
    return NextResponse.json(
      { success: false, message: 'Internal server error while initializing workflow.' },
      { status: 500 }
    );
  }
}
