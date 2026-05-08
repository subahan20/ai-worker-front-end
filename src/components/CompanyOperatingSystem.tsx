'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { apiUrl } from '@/src/lib/api';

type Department = 'HR' | 'Sales' | 'Finance' | 'Marketing';

interface WorkflowStep {
  step: string;
  status: 'pending' | 'completed';
  progress: number;
}

interface Task {
  id: string;
  department: Department;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  workflow_steps: WorkflowStep[];
  created_at: string;
}

interface SystemLog {
  id: string;
  message: string;
  created_at: string;
}

export default function CompanyOperatingSystem() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      alert('⚠️ Supabase credentials not found in .env. Please check your environment variables.');
      return;
    }
    fetchInitialData();
    subscribeToChanges();
  }, []);

  const fetchInitialData = async () => {
    const { data: taskData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(20);
    const { data: logData } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(10);
    if (taskData) setTasks(taskData);
    if (logData) setLogs(logData);
  };

  const subscribeToChanges = () => {
    supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as Task, ...prev.slice(0, 19)]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Task) : t));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
        setLogs(prev => [payload.new as SystemLog, ...prev.slice(0, 9)]);
      })
      .subscribe();
  };

  const runSystemCheck = async () => {
    setSystemStatus('RUNNING');
    try {
      const res = await fetch(apiUrl('/system/run'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(`❌ Check Failed: ${data.error}`);
    } catch (err: any) {
      alert(`❌ Network error: ${err.message}`);
    } finally {
      setTimeout(() => setSystemStatus('IDLE'), 1500);
    }
  };

  const executeTaskStep = async (taskId: string) => {
    setExecutingTaskId(taskId);
    try {
      const res = await fetch(apiUrl(`/tasks/${taskId}/execute`), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(`❌ Execution Failed: ${data.error}`);
    } catch (err: any) {
      alert(`❌ Network error: ${err.message}`);
    } finally {
      setExecutingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800/50 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="font-black text-xl italic tracking-tighter">OS</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-widest uppercase">Company OS <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded ml-2">V2.0</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Autonomous Agent Orchestration</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={async () => {
                const res = await fetch(apiUrl('/system/seed'), { method: 'POST' });
                if (res.ok) alert('✅ Database seeded.');
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:text-white transition-all"
            >
              Seed Data
            </button>
            <button 
              onClick={runSystemCheck}
              disabled={systemStatus === 'RUNNING'}
              className="px-6 py-2.5 bg-white text-black text-xs font-black rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
            >
              {systemStatus === 'RUNNING' ? 'Orchestrating...' : 'Run Global Check'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        {/* Department Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['HR', 'Sales', 'Finance', 'Marketing'] as Department[]).map(dept => (
            <div key={dept} className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-all" />
              <div className="relative bg-[#121214] border border-slate-800 p-8 rounded-[2rem] space-y-6">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <span className="text-xl">{dept === 'HR' ? '👥' : dept === 'Sales' ? '💰' : dept === 'Finance' ? '📊' : '🚀'}</span>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 uppercase tracking-widest">Alive</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{dept} Agent</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Status: Standing by for missions</p>
                </div>
                <div className="pt-4 border-t border-slate-800/50 flex gap-2">
                  <button onClick={() => alert(`${dept} Agent Dashboard Loading...`)} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors">Workspace</button>
                  <button onClick={() => alert(`Connecting to ${dept} Neural Link...`)} className="px-4 py-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-lg transition-colors">💬</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Active Tasks Feed */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black tracking-widest uppercase border-l-4 border-indigo-600 pl-4">Task Pipeline</h2>
            
            <div className="space-y-6">
              {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} className={`p-8 bg-[#121214]/60 border ${task.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800/50'} rounded-[2.5rem] space-y-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden`}>
                  {task.status === 'in_progress' && <div className="absolute top-0 left-0 h-1 bg-indigo-500 animate-progress-flow w-full" />}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border ${task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-900 text-indigo-400 border-slate-800'}`}>
                        {task.department.substring(0, 1)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{task.title}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {task.department} Department • ID: {task.id.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => executeTaskStep(task.id)}
                      disabled={task.status === 'completed' || executingTaskId === task.id}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105 active:scale-95 shadow-lg shadow-white/5 disabled:opacity-50'}`}
                    >
                      {executingTaskId === task.id ? 'Processing...' : task.status === 'in_progress' ? 'Next Step' : 'Initialize'}
                    </button>
                  </div>

                  {/* Workflow Steps Visualizer */}
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    {task.workflow_steps?.map((step, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                          <span className={step.status === 'completed' ? 'text-emerald-500' : 'text-slate-500'}>{step.step}</span>
                          <span className="text-slate-700">{step.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full transition-all duration-700 ${step.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-600/30'}`}
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                  <p className="text-slate-600 font-black uppercase tracking-widest text-xs italic">Awaiting AI Mission Assignment...</p>
                </div>
              )}
            </div>
          </div>

          {/* System Logs */}
          <div className="space-y-6">
             <h2 className="text-xl font-black tracking-widest uppercase border-l-4 border-emerald-600 pl-4">Decision Logs</h2>
             <div className="bg-[#121214] border border-slate-800 rounded-[3rem] p-8 h-[600px] flex flex-col shadow-2xl shadow-black/50">
               <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                 {logs.map(log => (
                   <div key={log.id} className="space-y-3 animate-in fade-in duration-700">
                     <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20 px-2 py-1 rounded-lg">Neural Action</span>
                       <span className="text-[9px] font-mono text-slate-700 uppercase">{new Date(log.created_at).toLocaleTimeString()}</span>
                     </div>
                     <p className="text-[12px] text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-800 pl-4 group-hover:border-emerald-500 transition-colors">
                       "{log.message}"
                     </p>
                   </div>
                 ))}
               </div>
               <div className="mt-8 pt-8 border-t border-slate-800/50">
                 <div className="p-5 bg-black/40 rounded-3xl flex items-center gap-4 border border-slate-800/50">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS Internal: Monitoring Live Streams</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        @keyframes progress-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-flow {
          animation: progress-flow 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
