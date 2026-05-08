'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../redux/hooks';
import { selectMarketingData } from '../redux/slices/tasksSlice';

export default function MarketingTab() {
  const reports = useAppSelector(selectMarketingData);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    if (reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-center bg-[#080808] p-10 rounded-[3rem] border border-white/5">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Marketing Intelligence</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500">Autonomous Viral Auditor · Results Vault</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-pink-500/10 border border-pink-500/20 rounded-2xl">
           <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_#ec4899]" />
           <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Worker Online</p>
        </div>
      </header>

      {selectedReport && selectedReport.analysis ? (
        <div className="space-y-8">
          <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[2.5rem] space-y-10">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Groq Content Strategy</h3>
              <span className="px-3 py-1 bg-pink-500/10 text-pink-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-pink-500/20">
                Department: Marketing
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 p-8 rounded-3xl border border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-500">Hook Analysis</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {selectedReport.analysis.viral_patterns?.hook_analysis || 'Analyzing viral hooks...'}
                </p>
              </div>
              <div className="bg-black/40 p-8 rounded-3xl border border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Visual Style</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {selectedReport.analysis.viral_patterns?.visual_patterns || 'Analyzing visual patterns...'}
                </p>
              </div>
            </div>

            <div className="bg-pink-500/10 border border-pink-500/20 p-8 rounded-[2.5rem] space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-pink-500">Execution Thesis</h3>
               <p className="text-xs text-pink-100/70 leading-relaxed italic">
                 "{selectedReport.analysis.execution_summary || 'Generating execution thesis...'}"
               </p>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#444]">Next-Gen Content Ideas</h4>
              {selectedReport.analysis.content_strategy?.new_ideas?.map((idea: any, i: number) => (
                <div key={i} className="group bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-pink-500/30 transition-all space-y-6">
                  <div className="flex justify-between items-center">
                    <h5 className="text-lg font-bold text-white tracking-tight">{idea.title}</h5>
                    <span className="px-4 py-1.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-full">Idea 0{i+1}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-5 bg-pink-500/5 border border-pink-500/10 rounded-2xl">
                      <p className="text-[9px] font-black uppercase text-pink-500 mb-2">The Viral Hook</p>
                      <p className="text-sm text-pink-100 font-bold leading-relaxed">{idea.hook}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-[#333]">Production Script</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{idea.script}</p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 p-4 bg-[#0d0d0d] rounded-xl border border-white/5">
                         <p className="text-[8px] font-black uppercase text-[#333] mb-1">Target Caption</p>
                         <p className="text-[10px] text-slate-500 line-clamp-1">{idea.caption}</p>
                      </div>
                      <div className="flex-1 p-4 bg-[#0d0d0d] rounded-xl border border-white/5">
                         <p className="text-[8px] font-black uppercase text-[#333] mb-1">CTA Strategy</p>
                         <p className="text-[10px] text-emerald-500 font-black">{idea.cta}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center border border-dashed border-white/10 rounded-[3rem] bg-[#050505] space-y-4">
          <div className="text-4xl">🔎</div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-[0.4em]">Audit Vault Empty</p>
            <p className="text-[10px] text-slate-800 font-black uppercase tracking-widest">Assign a marketing task to begin analysis</p>
          </div>
        </div>
      )}
    </div>
  );
}

