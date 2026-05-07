import React from 'react';

export interface WorkerTask {
  id: string;
  application_id?: string;
  title: string;
  department: string;
  status: 'waiting_for_ceo' | 'running' | 'completed' | 'failed';
  steps: string[];
  current_step: number;
  progress: number;
  created_at: string;
}

export default function TaskCard({ 
  task, 
  onViewEvaluation 
}: { 
  task: any, 
  onViewEvaluation?: (id: string, name: string) => void
}) {
  const status = (task.status || '').toLowerCase();
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isWaiting = status === 'waiting_for_ceo';
  const isFailed = status === 'failed';
  const progress = isCompleted ? 100 : (task.progress || 0);
  
  // Minimalist View: Priority and Description removed as requested
  return (
    <div className={`group relative flex items-center gap-6 p-5 rounded-2xl border transition-all duration-300
      ${isCompleted ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : isRunning ? 'border-orange-500/20 bg-orange-500/[0.03]' : 'border-white/5 bg-white/[0.01]'}`}>
      
      {/* Content Section - Minimalist */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-bold text-sm truncate transition-colors duration-500 ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
          {task.title}
        </h3>
      </div>

      {/* Progress Bar (Right Side) */}
      <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px]">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>{isCompleted ? 'Mission Complete' : isRunning ? 'In Progress' : isWaiting ? 'Pending' : 'Standing By'}</span>
          <span className={isCompleted ? 'text-emerald-500' : isRunning ? 'text-orange-500' : 'text-slate-400'}>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : isRunning ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
