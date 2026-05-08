import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/src/lib/supabase';

interface AIOverview {
  ai_overview: string;
  ai_summary: string;
  strengths: string[];
  weaknesses: string[];
  workflow_insights: string[];
  recommendations: string[];
  execution_summary: string;
  department: string;
}

export default function TaskDetailModal({ 
  taskId, 
  taskTitle, 
  isOpen, 
  onClose 
}: { 
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<AIOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchOverview();
    }
  }, [isOpen, taskId]);

  async function fetchOverview() {
    setLoading(true);
    try {
      const { data: overview, error } = await supabase
        .from('ai_overviews')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (overview) {
        setData(overview);
      } else {
        // Fallback if not generated yet (e.g. task still running)
        setData(null);
      }
    } catch (err) {
      console.error("Error fetching AI overview:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskTitle}>
      <div className="space-y-8 p-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[#555] uppercase tracking-widest animate-pulse">Fetching AI Analysis...</p>
          </div>
        ) : data ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            
            {/* Executive Briefing */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">AI Executive Briefing</h3>
                <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-orange-500/20">
                  Dynamic Analysis
                </span>
              </div>
              <div className="space-y-4">
                {data.ai_overview.split('\n\n').map((para, i) => (
                  <p key={i} className="text-lg font-bold text-slate-200 leading-relaxed tracking-tight">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0a0a0a] border border-emerald-500/10 p-8 rounded-[2rem] space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" /> Core Strengths
                </h4>
                <ul className="space-y-3">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-400 font-medium flex gap-3">
                      <span className="text-emerald-500">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0a0a0a] border border-red-500/10 p-8 rounded-[2rem] space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" /> Critical Friction
                </h4>
                <ul className="space-y-3">
                  {data.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-slate-400 font-medium flex gap-3">
                      <span className="text-red-500">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Workflow Insights */}
            <div className="bg-[#0f0f0f] border border-blue-500/10 p-8 rounded-[2rem] space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Autonomous Workflow Insights</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.workflow_insights.map((insight, i) => (
                  <div key={i} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-4">
                    <span className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 text-xs font-black border border-blue-500/20">0{i+1}</span>
                    <p className="text-xs text-slate-300 font-bold">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-white/5 p-8 rounded-[2rem] space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50">Strategic Recommendations</h4>
              <div className="flex flex-wrap gap-3">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="px-6 py-3 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[9px] font-black text-[#555] uppercase tracking-widest">Execution Pulse: Nominal</p>
              </div>
              <p className="text-[9px] font-black text-[#333] uppercase tracking-widest">{data.execution_summary}</p>
            </div>

          </div>
        ) : (
          <div className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-4xl mx-auto border border-white/10 opacity-50">
              ⏳
            </div>
            <div className="space-y-2">
              <p className="text-white text-lg font-bold">Analysis in Progress</p>
              <p className="text-[#555] text-xs max-w-[300px] mx-auto uppercase tracking-widest font-black">Groq AI is currently auditing this department workflow. Results will stream in real-time.</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
