'use client';

import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';
import { useAppSelector } from '../redux/hooks';
import { selectHRData } from '../redux/slices/tasksSlice';

type FilterType = 'ALL' | 'SHORTLISTED' | 'REJECTED';

interface CandidatesTabProps {
  candidates?: any[];
  onRefresh?: () => void;
}

export default function CandidatesTab({ candidates: candidatesProp, onRefresh }: CandidatesTabProps) {
  const candidatesFromStore = useAppSelector(selectHRData);
  const candidates = candidatesProp ?? candidatesFromStore;
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
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 md:space-y-10 animate-in fade-in duration-700">
      
      {/* Premium Filters — responsive sm → 2xl */}
      <div className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 sm:gap-5 sm:rounded-3xl sm:p-5 md:flex-row md:items-center md:justify-between md:gap-5 md:p-6 md:rounded-[1.75rem] lg:gap-6 lg:p-7 lg:rounded-[2rem] xl:p-8 2xl:p-10">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-3.5 md:gap-4">
          <div className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-blue-600 sm:h-9 md:mt-0 md:h-10 lg:h-11" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-white sm:text-sm sm:tracking-[0.15em] md:tracking-[0.18em] lg:text-base lg:tracking-[0.2em] xl:text-[1.05rem] 2xl:text-lg">
              Candidate Radar
            </h3>
            <p className="mt-1 text-[8px] font-bold uppercase leading-snug tracking-[0.08em] text-[#444] sm:text-[9px] sm:tracking-[0.1em] md:tracking-widest lg:text-[10px] xl:mt-1.5">
              Filtering {normalizedCandidates.length} Global Applications
            </p>
          </div>
        </div>

        <div
          className="w-full min-w-0 md:w-auto md:max-w-[55%] lg:max-w-none"
          role="tablist"
          aria-label="Filter candidates"
        >
          <div className="-mx-1 flex min-w-0 flex-nowrap gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:gap-2.5 sm:px-0 sm:pb-0 md:flex-wrap md:justify-end md:overflow-visible lg:gap-3 xl:gap-3.5 [&::-webkit-scrollbar]:hidden">
            {(['ALL', 'SHORTLISTED', 'REJECTED'] as FilterType[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`shrink-0 snap-start rounded-lg border px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:rounded-xl sm:px-5 sm:py-2 sm:text-[10px] sm:tracking-[0.15em] md:px-6 md:py-2.5 md:tracking-[0.18em] lg:px-7 lg:tracking-[0.2em] xl:px-8 2xl:px-10 2xl:py-3 2xl:text-[11px] ${
                  filter === f
                    ? 'border-white bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]'
                    : 'border-[#1a1a1a] bg-transparent text-[#555] hover:border-white/20 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate List */}
      <div className="grid grid-cols-1 gap-6 sm:gap-7 md:gap-8">
        {filteredCandidates.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#1a1a1a] bg-[#0f0f0f] p-12 text-center sm:rounded-[2.25rem] sm:p-16 md:rounded-[2.5rem] md:p-20 lg:rounded-[2.75rem] lg:p-20 xl:rounded-[3rem] xl:p-24 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mx-auto text-4xl border border-white/5 opacity-50">📂</div>
            <div className="space-y-2">
              <p className="text-xs font-black text-white uppercase tracking-[0.3em]">No Match Found</p>
              <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest leading-relaxed max-w-[300px] mx-auto">
                No candidates match <span className="text-white">{filter}</span> right now. Try another view or refresh once new profiles land.
              </p>
            </div>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} onRefresh={onRefresh || (() => {})} />
          ))
        )}
      </div>

    </div>
  );
}
