'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import Modal from './Modal';

interface EvaluationData {
  ats_score: number;
  status: 'SHORTLISTED' | 'REJECTED';
  reasons: string;
  strengths: string[];
  improvement_plan: string;
  interview_schedule: string;
  final_summary: string;
}

interface CandidateEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  candidateName: string;
}

export default function CandidateEvaluationModal({ isOpen, onClose, applicationId, candidateName }: CandidateEvaluationModalProps) {
  const [activeTab, setActiveTab] = useState<'decision' | 'steps' | 'summary'>('decision');
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchEvaluation();
    }
  }, [isOpen, applicationId]);

  const fetchEvaluation = async () => {
    if (!applicationId) {
      console.error('CandidateEvaluationModal: No applicationId provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('CandidateEvaluationModal: Fetching evaluation for ID:', applicationId);
      
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

      if (error) {
        console.error('CandidateEvaluationModal: Supabase Error:', error);
        throw error;
      }

      if (!data) {
        console.warn('CandidateEvaluationModal: No candidate record found for ID:', applicationId);
        setEvaluation(null);
      } else {
        console.log('CandidateEvaluationModal: Data received:', data);
        setEvaluation(data.evaluation);
      }
    } catch (err: any) {
      console.error('CandidateEvaluationModal: Final Catch Error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        fullError: err
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'decision', label: 'Decision' },
    { id: 'steps', label: 'Next Steps' },
    { id: 'summary', label: 'Summary' }
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Candidate Evaluation">
      <div className="space-y-6">
        {/* Candidate Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">{candidateName}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Application Analysis Profile</p>
          </div>
          {evaluation && (
            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest
              ${evaluation.status === 'SHORTLISTED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
              {evaluation.status}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">AI is processing candidate data...</p>
          </div>
        ) : !evaluation ? (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No evaluation data found.</p>
          </div>
        ) : (
          <>
            {/* Tabs Navigation */}
            <div className="flex gap-2 bg-[#080808] p-1 rounded-xl border border-[#1a1a1a]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all
                    ${activeTab === tab.id ? 'bg-[#151515] text-white shadow-lg shadow-black/50' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[250px] animate-in fade-in duration-500">
              {activeTab === 'decision' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[#151515]" />
                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-orange-500" 
                          strokeDasharray={276} strokeDashoffset={276 - (276 * evaluation.ats_score) / 100} />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-white">{evaluation.ats_score}</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">ATS Score</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Key Verdict</h5>
                      <p className="text-xs text-white font-medium leading-relaxed italic border-l-2 border-orange-500/50 pl-4">
                        "{evaluation.reasons}"
                      </p>
                    </div>
                  </div>
                  
                  {evaluation.strengths && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidate Strengths</h5>
                      <div className="flex flex-wrap gap-2">
                        {evaluation.strengths.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'steps' && (
                <div className="space-y-6">
                  <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6">
                    <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">
                      {evaluation.status === 'SHORTLISTED' ? 'Interview Strategy' : 'Improvement Roadmap'}
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {evaluation.status === 'SHORTLISTED' ? evaluation.interview_schedule : evaluation.improvement_plan}
                    </p>
                  </div>
                  {evaluation.status === 'SHORTLISTED' && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recommended Focus</h5>
                      <p className="text-xs text-slate-400 italic">
                        "Focus on validating the technical depth in their recent projects and cultural alignment with the current scale."
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
                    <p className="text-xs text-slate-200 leading-loose font-medium italic">
                      "{evaluation.final_summary}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Generated by Phaze AI Neural Engine</span>
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
            Close Profile
          </button>
          {evaluation?.status === 'SHORTLISTED' && (
            <button
              onClick={() => alert('Proceeding to interview scheduling...')}
              className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-600/20"
            >
              Schedule Interview
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
