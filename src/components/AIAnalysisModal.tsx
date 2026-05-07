'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import Modal from './Modal';

interface AnalysisData {
  score: number;
  score_label: string;
  status: string;
  status_color: string;
  verdict: string;
  highlights: string[];
  strategy_label: string;
  strategy_content: string;
  final_summary: string;
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  department: string;
  taskTitle: string;
}

export default function AIAnalysisModal({ isOpen, onClose, taskId, department, taskTitle }: AIAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'strategy' | 'summary'>('analysis');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchAnalysis();
    }
  }, [isOpen, taskId]);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      // 1. First check connected_tasks for an 'analysis' field
      const { data: taskData } = await supabase
        .from('connected_tasks')
        .select('analysis, application_id')
        .eq('id', taskId)
        .single();

      if (taskData?.analysis) {
        setAnalysis(taskData.analysis);
      } else if (taskData?.application_id) {
        // 2. Fallback to applications table if it's an HR candidate task
        const { data: appData } = await supabase
          .from('applications')
          .select('evaluation')
          .eq('id', taskData.application_id)
          .single();
        
        if (appData?.evaluation) {
          const ev = appData.evaluation;
          setAnalysis({
            score: ev.ats_score,
            score_label: 'ATS Score',
            status: ev.status,
            status_color: ev.status === 'SHORTLISTED' ? 'emerald' : 'red',
            verdict: ev.reasons,
            highlights: ev.strengths || [],
            strategy_label: 'Next Steps',
            strategy_content: ev.status === 'SHORTLISTED' ? ev.interview_schedule : ev.improvement_plan,
            final_summary: ev.final_summary
          });
        }
      }
    } catch (err) {
      console.error('Analysis Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'analysis', label: 'AI Analysis' },
    { id: 'strategy', label: 'Execution Strategy' },
    { id: 'summary', label: 'Executive Summary' }
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`AI ${department} Report`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
          <div className="flex-1">
            <h4 className="text-sm font-black text-white uppercase tracking-widest leading-tight">{taskTitle}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Deep-Dive Intelligence Profile</p>
          </div>
          {analysis && (
            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest
              bg-${analysis.status_color}-500/10 text-${analysis.status_color}-500 border-${analysis.status_color}-500/20`}>
              {analysis.status}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Analyzing departmental data...</p>
          </div>
        ) : !analysis ? (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No detailed AI analysis available for this task.</p>
          </div>
        ) : (
          <>
            {/* Tabs Navigation */}
            <div className="flex gap-2 bg-[#080808] p-1 rounded-xl border border-[#1a1a1a]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all
                    ${activeTab === tab.id ? 'bg-[#151515] text-white shadow-lg shadow-black/50' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[250px] animate-in fade-in duration-500">
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[#151515]" />
                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-orange-500" 
                          strokeDasharray={276} strokeDashoffset={276 - (276 * analysis.score) / 100} />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-white">{analysis.score}</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">{analysis.score_label}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Verdict</h5>
                      <p className="text-xs text-white font-medium leading-relaxed italic border-l-2 border-orange-500/50 pl-4">
                        "{analysis.verdict}"
                      </p>
                    </div>
                  </div>
                  
                  {analysis.highlights && analysis.highlights.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Key Insights</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysis.highlights.map((h, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6">
                    <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">
                      {analysis.strategy_label}
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {analysis.strategy_content}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
                    <p className="text-xs text-slate-200 leading-loose font-medium italic">
                      "{analysis.final_summary}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Generated by Phaze AI Cognitive Engine</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="pt-6 border-t border-[#1a1a1a] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-[#151515] hover:bg-[#222] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
          >
            Close Report
          </button>
          <button
            className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-600/20"
          >
            Approve Execution
          </button>
        </div>
      </div>
    </Modal>
  );
}
