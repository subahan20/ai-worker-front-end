'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import TaskCard, { WorkerTask } from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import { useToast } from './Toast';

export default function TaskQueue() {
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
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
      const res = await fetch('/api/tasks/approve', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Approval failed');
      }
      addToast('All tasks approved and starting simulation...', 'success');
    } catch (err: any) {
      console.error('Approve all error:', err);
      addToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // 1. Listen to manual CEO tasks
    const manualChannel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();

    // 2. Listen to connected automated tasks
    const connectedChannel = supabase
      .channel('connected_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_tasks' }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(manualChannel);
      supabase.removeChannel(connectedChannel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      // 1. Fetch from CEO-controlled tasks
      const { data: manualTasks, error: mError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch from automated connected tasks
      const { data: connectedTasks, error: cError } = await supabase
        .from('connected_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (mError) console.error('Tasks error:', mError);
      if (cError) console.error('Connected tasks error:', cError);

      // Merge and sort by created_at
      const allTasks = [...(manualTasks || []), ...(connectedTasks || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTasks(allTasks as any);
    } catch (err) {
      console.error('Unified fetch error:', err);
    }
  };

  const pendingCount = tasks.filter(t => (t.status as string || '').toLowerCase() === 'waiting_for_ceo').length;

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
              {isApproving ? 'Approving...' : '🚀 Apprrove'}
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
