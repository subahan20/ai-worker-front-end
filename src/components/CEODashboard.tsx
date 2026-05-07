'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, useToast } from './Toast';
import { supabase } from '@/src/lib/supabase';

// --- Types ---
export type Department = 'HR' | 'Sales' | 'Marketing' | 'Finance' | 'Operations';
export type Status = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  department: Department;
  priority: 'Low' | 'Medium' | 'High';
  status: 'waiting_for_ceo' | 'running' | 'completed' | 'failed' | 'Pending' | 'In Progress' | 'Completed' | 'Failed';
  progress: number;
  created_at: string;
}

interface ConnectedTask {
  id: string;
  department: string;
  status: string;
}

const DEPARTMENTS: Department[] = ['HR', 'Sales', 'Finance', 'Operations', 'Marketing'];

const DEPT_CONFIG: Record<Department, { badge: string; border: string; glow: string; text: string; icon: string; subtitle: string }> = {
  Sales: {
    badge: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    text: 'text-emerald-400',
    icon: '🔥',
    subtitle: 'Leads pipeline, proposals, deal tracking'
  },
  HR: {
    badge: 'bg-purple-500/10 text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    text: 'text-purple-400',
    icon: '👥',
    subtitle: 'Team management, performance, tasks'
  },
  Operations: {
    badge: 'bg-blue-500/10 text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    text: 'text-blue-400',
    icon: '⚙️',
    subtitle: 'Projects, deadlines, client delivery'
  },
  Marketing: {
    badge: 'bg-pink-500/10 text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.1)]',
    text: 'text-pink-400',
    icon: '📣',
    subtitle: 'Instagram, content strategy, growth'
  },
  Finance: {
    badge: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    text: 'text-amber-400',
    icon: '💰',
    subtitle: 'Invoices, expenses, revenue tracking'
  }
};

export default function CEODashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connectedTasks, setConnectedTasks] = useState<ConnectedTask[]>([]);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
      
      const { data: connData } = await supabase
        .from('connected_tasks')
        .select('id, department, status');
      if (connData) setConnectedTasks(connData);

    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  useEffect(() => { 
    fetchTasks();
    const channel = supabase
      .channel('tasks_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const handleApproveAll = async () => {
    const pendingCount = tasks.filter(t => t.status === 'waiting_for_ceo').length;
    if (pendingCount === 0) {
      addToast('No tasks waiting for approval', 'success');
      return;
    }

    const loadingId = addToast(`🚀 Approving ${pendingCount} tasks...`, 'loading');
    try {
      const res = await fetch('/api/tasks/approve', { method: 'POST' });
      if (!res.ok) throw new Error('Approval failed');
      
      removeToast(loadingId);
      addToast(`✅ ${pendingCount} tasks approved. Workers starting...`, 'success');
      fetchTasks();
    } catch (err) {
      removeToast(loadingId);
      addToast('❌ Failed to approve tasks', 'error');
    }
  };

  const handleGenerateTask = async () => {
    if (!description.trim() || isGenerating) return;
    setIsGenerating(true);
    const loadingId = addToast('🤖 Analyzing task...', 'loading');

    try {
      const aiRes = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (!aiRes.ok) throw new Error('AI assignment failed');
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);

      // Default to Engineering if Developer is requested by AI fallback
      let mappedDept = aiData.department;
      if (mappedDept === 'Engineering') mappedDept = 'Developer';
      if (!DEPARTMENTS.includes(mappedDept)) mappedDept = 'Operations';

      const saveRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiData.task_title,
          description: description.trim(),
          department: mappedDept,
          priority: aiData.priority,
        }),
      });

      if (!saveRes.ok) throw new Error('Failed to save task');
      const newTask: Task = await saveRes.json();

      setTasks(prev => [newTask, ...prev]);
      setDescription('');
      removeToast(loadingId);
      addToast(`✅ Task assigned to ${mappedDept}`, 'success');

    } catch (err: any) {
      removeToast(loadingId);
      addToast(`❌ ${err.message || 'Something went wrong'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get the most recent task for each department
  const getActiveTaskForDept = (dept: Department) => {
    return tasks.find(t => t.department === dept && t.status !== 'Completed' && t.status !== 'completed');
  };

  return (
    <div className="min-h-screen bg-[#101115] text-slate-300 font-sans p-6 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* --- Top Input Area --- */}
        <div className="flex gap-4 items-center bg-[#17181e] p-4 rounded-xl border border-slate-800/60 shadow-lg">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerateTask(); }}
            placeholder="Assign a new task to any department..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600 px-2"
          />
          
          <button
            onClick={handleApproveAll}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] flex items-center gap-2"
          >
            <span>🛡️</span> Approve Tasks
          </button>

          <button
            onClick={handleGenerateTask}
            disabled={isGenerating || !description.trim()}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Routing...' : 'Execute'}
          </button>
        </div>

        {/* --- Top Section: Active Tasks List --- */}
        <div className="bg-[#17181e] rounded-2xl border border-slate-800/60 shadow-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {tasks.map((task, idx) => {
              const deptConfig = DEPT_CONFIG[task.department] ?? DEPT_CONFIG.Operations;
              const isWaiting = task.status === 'waiting_for_ceo';
              const isRunning = task.status === 'running';
              const isCompleted = task.status?.toLowerCase() === 'completed' || task.status === 'Completed';

              return (
                <div key={task.id || idx} className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md border ${deptConfig.badge} ${deptConfig.border} ${deptConfig.glow}`}>
                      <span className="text-sm">{deptConfig.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">{task.department}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 truncate">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-6 w-72">
                    {isWaiting && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                        Waiting for CEO
                      </span>
                    )}
                    {isRunning && (
                      <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-400">
                          <span>Processing...</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 transition-all duration-500 ease-linear shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm font-medium">No tasks in the queue. Type above to generate one.</div>
            )}
          </div>
        </div>

        {/* --- Main Section --- */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-100 uppercase tracking-[0.2em] px-2">Department Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPARTMENTS.map(dept => {
              const config = DEPT_CONFIG[dept];
              const deptTasks = tasks.filter(t => t.department === dept);
              const activeTask = deptTasks.find(t => t.status === 'running');
              const waitingTask = deptTasks.find(t => t.status === 'waiting_for_ceo');
              const lastCompletedTask = deptTasks.find(t => t.status?.toLowerCase() === 'completed' || t.status === 'Completed');
              
              const isWorking = !!activeTask;
              const isWaiting = !!waitingTask;
              const isCompleted = !!lastCompletedTask && !isWorking && !isWaiting;

              return (
                <div key={dept} className={`bg-[#1c1e26] rounded-2xl p-5 border ${isWorking ? 'border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : isCompleted ? 'border-emerald-500/30' : 'border-slate-800/60'} shadow-xl flex flex-col justify-between min-h-[260px] transition-all duration-500`}>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-[#17181e] border ${config.border} flex items-center justify-center text-xl shadow-lg`}>
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">{dept} Agent</h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[180px] leading-tight">{config.subtitle}</p>
                      </div>
                    </div>
                    {/* Status Dot */}
                    <div className="flex items-center gap-1.5 bg-[#17181e] px-2.5 py-1 rounded-full border border-slate-800/60">
                      <span className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-orange-500 animate-pulse' : isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isWorking ? 'text-orange-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isWorking ? 'WORKING' : isCompleted ? 'SUCCESS' : 'IDLE'}
                      </span>
                    </div>
                  </div>

                  {/* Message Box */}
                  <div className="flex-1 flex flex-col justify-center">
                    {isWorking ? (
                      <div className="text-center space-y-2 py-4">
                        <div className="text-orange-400 text-xs font-black uppercase tracking-widest animate-pulse">Working...</div>
                        <div className="text-[10px] text-slate-500 font-medium">Processing tasks in pipeline</div>
                      </div>
                    ) : isCompleted ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center space-y-1">
                        <div className="text-emerald-400 text-xs font-black uppercase tracking-widest">Successfully Completed</div>
                        <div className="text-[9px] text-emerald-500/60 font-bold">ALL TASKS FINALIZED</div>
                      </div>
                    ) : isWaiting ? (
                      <div className="text-center py-4">
                        <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Awaiting CEO Approval</div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-slate-600 text-[10px] font-black uppercase tracking-widest">System Ready</div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1c1e26] bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500">AI</div>
                      ))}
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                      View Logs →
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

    </div>
  );
}
