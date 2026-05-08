'use client';

import React, { useState } from 'react';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import { useToast } from './Toast';
import { useGetTasksQuery, useApproveTasksMutation } from '../redux/api/tasksApi';

export default function TaskQueue() {
  const { data: tasks = [], isLoading } = useGetTasksQuery(undefined, {
    pollingInterval: 5000,
  });
  const [approveTasks] = useApproveTasksMutation();
  const [isApproving, setIsApproving] = useState(false);

  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ 
    isOpen: false, 
    id: null, 
    title: '' 
  });
  const { addToast } = useToast();

  const handleApproveAll = async () => {
    if (isApproving) return;
    setIsApproving(true);
    try {
      await approveTasks().unwrap();
      addToast('All tasks approved and starting simulation...', 'success');
    } catch (err: any) {
      console.error('Approve all error:', err);
      addToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const pendingCount = tasks.filter(t => (t.status as string || '').toLowerCase() === 'waiting_for_ceo').length;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Synchronizing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      <header className="flex justify-between items-center bg-[#080808] p-6 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-white uppercase tracking-[0.3em]">Command Center</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {tasks.length} active autonomous workloads ({pendingCount} pending)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button 
              onClick={handleApproveAll}
              disabled={isApproving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-600/20 flex items-center gap-2"
            >
              {isApproving ? 'Approving...' : '🚀 Approve All'}
            </button>
          )}

          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </header>

      {tasks.length === 0 ? (
        <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-[#050505]">
          <p className="text-sm font-bold text-slate-700 uppercase tracking-[0.4em]">No Active Workflows</p>
          <p className="text-[10px] text-slate-800 font-black uppercase tracking-widest mt-2">All departments are currently idle</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onViewEvaluation={(id, title) => setDetailModal({ isOpen: true, id, title })}
            />
          ))}
        </div>
      )}

      <TaskDetailModal 
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
        taskId={detailModal.id || ''}
        taskTitle={detailModal.title}
      />
    </div>
  );
}
