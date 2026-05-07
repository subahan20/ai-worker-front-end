import { supabase } from './supabase';

const DEPT_STEPS: Record<string, string[]> = {
  HR: ['Analyze resumes', 'Shortlist candidates', 'Schedule interviews', 'Send email to candidates'],
  Sales: ['Scrape lead data', 'Qualify leads', 'Generate personalized pitches', 'Send outreach sequences'],
  Marketing: ['Analyze trends', 'Draft copy', 'Generate image assets', 'Schedule posts'],
  Finance: ['Gather receipts', 'Categorize expenses', 'Reconcile accounts', 'Generate summary report'],
  Operations: ['Check system health', 'Optimize resource allocation', 'Run backup sequence', 'Log metrics'],
  Developer: ['Analyze issue', 'Write code', 'Run unit tests', 'Create pull request']
};

export class WorkerEngine {
  /**
   * Executes a background task simulating an AI worker.
   */
  static async executeTask(taskId: string, steps: string[]) {
    // 1. Set status to running and start at step 0
    await supabase
      .from('connected_tasks')
      .update({ status: 'running', current_step: 0 })
      .eq('id', taskId);

    // Fetch department for chaining
    const { data: currentTask } = await supabase
      .from('connected_tasks')
      .select('department')
      .eq('id', taskId)
      .single();

    // 2. Loop through sequential steps provided by the AI
    for (let i = 0; i < steps.length; i++) {
      // Simulate heavy processing (2 seconds per step)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const progress = Math.round(((i + 1) / steps.length) * 100);
      
      // Update current step index and progress in DB
      await supabase
        .from('connected_tasks')
        .update({ 
          current_step: i, 
          status: 'running',
          progress: progress
        })
        .eq('id', taskId);
        
      console.log(`[Worker] Task ${taskId} - Step ${i + 1}/${steps.length} (${progress}%)`);
    }

    // 3. Complete task
    await supabase
      .from('connected_tasks')
      .update({ status: 'completed', progress: 100 })
      .eq('id', taskId);
      
    console.log(`[Worker] Task ${taskId} successfully completed.`);
  }
}
