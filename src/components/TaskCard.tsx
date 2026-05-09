import React from 'react';

import {
  isDeptTaskSuccessfullyCompleted,
  normalizeTaskStatus,
} from '@/src/lib/deptWorkflow';

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
  onViewEvaluation: _onViewEvaluation,
}: {
  task: any;
  onViewEvaluation?: (id: string, name: string) => void;
}) {
  const statusKey = normalizeTaskStatus(task.status);
  const isRunning =
    statusKey === 'running' || statusKey === 'in_progress' || statusKey === 'working';
  const isCompleted = isDeptTaskSuccessfullyCompleted(task);
  const isWaiting = statusKey === 'waiting_for_ceo' || statusKey === 'pending';
  const isFailed = statusKey === 'failed';

  const rawProgress = Number(task.progress);
  const numericProgress =
    Number.isFinite(rawProgress) ? Math.min(100, Math.max(0, rawProgress)) : 0;
  const displayProgress = isCompleted ? 100 : numericProgress;
  const indeterminateActive =
    !isCompleted && !isFailed && (isRunning || (!isWaiting && displayProgress <= 0));

  const pctLabel =
    indeterminateActive
      ? String.fromCharCode(0x2022, 0x2022, 0x2022)
      : isFailed
        ? '—'
        : `${Math.round(displayProgress)}%`;

  const statusChip = isFailed
    ? 'Needs Attention'
    : isCompleted
      ? 'Mission Complete'
      : isRunning
        ? 'In Progress'
        : isWaiting
          ? 'Pending'
          : 'Standing By';

  return (
    <div
      className={`group relative flex items-center gap-6 p-5 rounded-2xl border transition-all duration-300
      ${
        isCompleted
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : isRunning
            ? 'border-orange-500/20 bg-orange-500/3'
            : isFailed
              ? 'border-red-500/25 bg-red-500/4'
              : 'border-white/5 bg-white/1'
      }`}
    >
      <div className="flex-1 min-w-0">
        <h3
          className={`font-bold text-sm truncate transition-colors duration-500 ${
            isCompleted ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {task.title}
        </h3>
        {indeterminateActive && (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-orange-400/70">
            AI is working… Processing…
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px]">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>{statusChip}</span>
          <span
            className={
              isCompleted
                ? 'text-emerald-500'
                : isRunning
                  ? 'text-orange-500'
                  : isFailed
                    ? 'text-red-400'
                    : 'text-slate-400'
            }
          >
            {pctLabel}
          </span>
        </div>
        <div
          className={`w-full rounded-full overflow-hidden border border-white/10 relative bg-black/40 ${
            indeterminateActive ? 'h-2.5 min-h-[10px]' : 'h-1.5'
          }`}
        >
          {indeterminateActive ? (
            <>
              <div
                className="absolute inset-0 rounded-full bg-orange-500/25 motion-safe:animate-pulse"
                aria-hidden
              />
              <div
                className="absolute left-0 top-0 bottom-0 task-queue-progress-busy-indicator"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-busy="true"
                aria-label="Task in progress"
              />
            </>
          ) : (
            <div
              className={`h-full transition-all duration-1000 ease-out ${
                isCompleted
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : isFailed
                    ? 'bg-red-500/70'
                    : 'bg-orange-500'
              }`}
              style={{ width: `${displayProgress}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
