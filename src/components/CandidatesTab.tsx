'use client';

import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';
import { useAppSelector } from '../redux/hooks';
import { selectHRData } from '../redux/slices/tasksSlice';

type FilterType = 'ALL' | 'SHORTLISTED' | 'REJECTED';

export default function CandidatesTab() {
  const candidates = useAppSelector(selectHRData);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const normalizedCandidates = useMemo(() => {
    // De-duplicate by candidate/application id; polling + multiple HR tasks
    // can otherwise render the same candidate many times and trigger repeated analysis calls.
    const byId = new Map<string, any>();
    for (const candidate of candidates) {
      const candidateId = candidate?.id ? String(candidate.id) : '';
      if (!candidateId) continue;
      if (!byId.has(candidateId)) {
        byId.set(candidateId, candidate);
      }
    }
    return Array.from(byId.values());
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return normalizedCandidates.filter(candidate => {
      if (filter === 'ALL') return true;
      
      const analysis = candidate.analysis && Array.isArray(candidate.analysis) && candidate.analysis.length > 0 
        ? candidate.analysis[0] 
        : candidate.analysis; // Fallback if analysis is already an object

      if (!analysis || !analysis.decision) return false;

      return analysis.decision.toUpperCase() === filter;
    });
  }, [normalizedCandidates, filter]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Premium Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0a0a0a] p-6 rounded-[2rem] border border-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-blue-600 rounded-full" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Candidate Radar</h3>
            <p className="text-[9px] text-[#444] font-bold uppercase tracking-widest mt-1">Filtering {normalizedCandidates.length} Global Applications</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(['ALL', 'SHORTLISTED', 'REJECTED'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border ${
                filter === f 
                  ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]' 
                  : 'bg-transparent text-[#555] border-[#1a1a1a] hover:border-white/20 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate List */}
      <div className="grid grid-cols-1 gap-8">
        {filteredCandidates.length === 0 ? (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] border-dashed rounded-[3rem] p-24 text-center space-y-6">
            <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mx-auto text-4xl border border-white/5 opacity-50">📂</div>
            <div className="space-y-2">
              <p className="text-xs font-black text-white uppercase tracking-[0.3em]">No Match Found</p>
              <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest leading-relaxed max-w-[300px] mx-auto">
                No candidates currently meet the <span className="text-white">{filter}</span> filter criteria in the current autonomous queue.
              </p>
            </div>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} onRefresh={() => {}} />
          ))
        )}
      </div>

    </div>
  );
}
