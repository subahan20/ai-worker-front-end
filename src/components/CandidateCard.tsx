'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiUrl } from '@/src/lib/api';

const analyzedCandidates = new Set<string>();
const inFlightCandidates = new Set<string>();

interface Candidate {
  id: string;
  display_name?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  experience?: string | number;
  resume_url?: string;
  resume_file?: string;
  // Parsed resume fields
  parsed_name?: string;
  parsed_email?: string;
  parsed_phone?: string;
  parsed_role?: string;
  parsed_experience?: string;
  parsed_skills?: string[];
  parsed_education?: any;
  parsed_companies?: string[];
  parsed_projects?: any[];
  parsed_certifications?: string[];
  parsed_text?: string;
  parser_status?: string;
  parser_error?: string;
  ai_summary?: string;
  matched_skills?: string[];
  missing_skills?: string[];
  metadata?: any;
  candidate_analysis?: Analysis[];
}

interface Analysis {
  id: string;
  decision: string;
  reason: string;
  improvement: string;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  details?: {
    summary?: string;
    executive_briefing?: string;
    strengths?: string[];
    weaknesses?: string[];
    strategic_recommendation?: string;
    confidence?: string;
    risk_level?: string;
    improvement_suggestions?: string[];
    interview_questions?: string[];
    recommended_department?: string;
    education?: string;
    companies?: string[];
    certifications?: string[];
    candidate_name?: string;
    email?: string;
    phone?: string;
    parser_status?: string;
    parser_error?: string;
  };
}

interface CandidateCardProps {
  candidate: Candidate;
  onRefresh?: () => void;
}

export default function CandidateCard({ candidate, onRefresh }: CandidateCardProps) {
  const candidateId = candidate?.id ? String(candidate.id) : '';
  const initialAnalysis = candidate.candidate_analysis && candidate.candidate_analysis.length > 0
    ? candidate.candidate_analysis[0]
    : null;

  const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasFetched = useRef(false);

  // Resolve display values — prefer parsed resume data over form data
  const d = analysis?.details || {};
  const displayName =
    candidate.display_name ||
    d.candidate_name ||
    candidate.parsed_name ||
    candidate.name ||
    candidate?.metadata?.candidate_name ||
    candidate?.metadata?.parsed_resume?.name ||
    'Resume Parsing Failed';
  const displayEmail =
    d.email ||
    candidate.parsed_email ||
    candidate.email ||
    candidate?.metadata?.candidate_email ||
    candidate?.metadata?.parsed_resume?.email ||
    null;
  const score = analysis?.match_score ?? (candidate as any)?.score ?? (candidate as any)?.metadata?.candidate_score ?? null;
  const parserFailed = String(candidate.parser_status || analysis?.details?.parser_status || '').toLowerCase() === 'failed';
  const isShortlisted = !parserFailed && typeof score === 'number' && score >= 80;
  const strokeColor = isShortlisted ? '#10b981' : '#ef4444';
  const glowColor = isShortlisted ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
  const hasParsedText = Boolean(String(candidate.parsed_text || '').trim());

  // AUTO-RUN: trigger analysis on mount if none exists
  useEffect(() => {
    if (!candidateId) {
      setError('Candidate ID missing');
      return;
    }
    // If there is no resume/application context and no prior analysis, skip auto analyze.
    // This prevents flooding /analysis/hr with non-candidate task records.
    if (!initialAnalysis && !candidate.resume_url && !candidate.resume_file && !candidate.parsed_name && !candidate.parsed_email) {
      setError('Awaiting candidate resume data');
      return;
    }
    if (parserFailed || !hasParsedText) {
      setError(candidate.parser_error || 'Resume text extraction failed');
      return;
    }
    if (initialAnalysis || hasFetched.current || analyzedCandidates.has(candidateId) || inFlightCandidates.has(candidateId)) return;
    hasFetched.current = true;
    runFallbackAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, initialAnalysis, parserFailed, hasParsedText]);

  useEffect(() => {
    if (initialAnalysis && !analysis) setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  // Fallback: runs generic analyze (for candidates uploaded before parse-resume was live)
  const runFallbackAnalysis = async () => {
    if (!candidateId) {
      setError('Candidate ID missing');
      return;
    }
    if (inFlightCandidates.has(candidateId)) return;

    inFlightCandidates.add(candidateId);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/analysis/hr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      });
      const data = await res.json();
      if (res.status === 429 || data?.error?.includes('429') || data?.error?.includes('quota')) {
        setError('rate_limit');
      } else if (!res.ok && data?.code === 'RESUME_TEXT_MISSING') {
        setError(data?.error || 'Resume text extraction failed');
      } else if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        analyzedCandidates.add(candidateId);
        if (onRefresh) onRefresh();
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
      inFlightCandidates.delete(candidateId);
      setLoading(false);
    }
  };

  // Auto-retry on rate limit
  useEffect(() => {
    if (error === 'rate_limit' && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(r => r + 1);
        runFallbackAnalysis();
      }, 62000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, retryCount]);

  return (
    <div className="bg-[#0c0c0e] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden flex flex-col xl:flex-row group hover:border-white/10 transition-all shadow-2xl relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none rounded-[2.5rem]"
        style={{ background: isShortlisted && analysis ? '#10b981' : analysis ? '#ef4444' : '#6366f1' }}
      />

      {/* ═══ LEFT SIDE: Candidate Profile ═══ */}
      <div className="xl:w-[42%] p-10 border-b xl:border-b-0 xl:border-r border-[#1a1a1a] flex flex-col gap-7">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">{displayName}</h3>
          </div>
          <span className="shrink-0 px-3 py-1.5 bg-[#111] border border-[#222] rounded-full text-[9px] font-black text-[#444] uppercase tracking-widest">
            HR Intel
          </span>
        </div>

        {/* Info rows */}
        <div className="space-y-3">
          {displayEmail && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">✉️</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Email</p>
                <p className="text-xs text-slate-300 font-bold truncate max-w-[200px]">{displayEmail}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#111]">
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
            <p className="text-[8px] font-black text-[#333] uppercase tracking-widest">Autonomous HR Agent</p>
          </span>
        </div>
      </div>

      {/* ═══ RIGHT SIDE: AI Analysis ═══ */}
      <div className="xl:w-[58%] p-10 bg-[#080808] flex flex-col relative overflow-hidden">
        {/* Glow */}
        <div
          className="absolute -right-16 -top-16 w-56 h-56 blur-[100px] opacity-[0.12] pointer-events-none rounded-full"
          style={{ background: isShortlisted && analysis ? '#10b981' : analysis ? '#ef4444' : '#6366f1' }}
        />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-blue-500/20 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center text-xl">🤖</div>
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-purple-400">AI Analyzing Resume</p>
              <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Running neural screening algorithms...</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>

        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-2xl border border-amber-500/20">⚡</div>
            <div>
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">
                {error === 'rate_limit' ? 'Rate Limit — Auto Retrying' : 'Parsing / Analysis Error'}
              </p>
              <p className="text-[10px] text-[#444] font-medium max-w-[260px]">
                {error === 'rate_limit' ? `Auto-retrying in ~1 min (${retryCount + 1}/3)...` : error}
              </p>
            </div>
            {error !== 'rate_limit' && !parserFailed && hasParsedText && (
              <button onClick={runFallbackAnalysis} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all">
                Retry
              </button>
            )}
          </div>

        ) : !analysis ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">⏳</div>
            </div>
            <p className="text-[10px] text-[#444] font-black uppercase tracking-widest">Queuing AI analysis...</p>
          </div>

        ) : (
          <div className="flex-1 space-y-7 animate-in fade-in slide-in-from-right-6 duration-700">

            {/* Score + Status header */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.3em]">AI Match Score</p>
              <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border flex items-center gap-1.5 ${
                parserFailed
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : isShortlisted
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              }`}>
                {parserFailed ? '⚠️ PARSING FAILED' : isShortlisted ? '✅ SHORTLISTED' : '❌ REJECTED'}
              </div>
            </div>

            {/* Score ring + Summary */}
            <div className="flex flex-col md:flex-row gap-7 items-center">
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#1a1a1a" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="64" cy="64" r="56"
                    stroke={strokeColor}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={352}
                    strokeDashoffset={352 - (352 * (typeof score === 'number' ? score : 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${strokeColor}60)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white leading-none">{typeof score === 'number' ? `${score}%` : 'N/A'}</span>
                  <span className="text-[8px] font-black text-[#444] uppercase tracking-widest mt-1">Match</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {(d.executive_briefing || d.summary || candidate.ai_summary) && (
                  <div>
                    <p className="text-[9px] font-black text-[#444] uppercase tracking-widest mb-1">AI Executive Briefing</p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{d.executive_briefing || d.summary || candidate.ai_summary}"</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-wider rounded-lg text-slate-300">
                    Confidence: {String(d.confidence || 'medium').toUpperCase()}
                  </span>
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-wider rounded-lg text-slate-300">
                    Risk: {String(d.risk_level || 'medium').toUpperCase()}
                  </span>
                </div>
                {d.recommended_department && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Best Fit: {d.recommended_department}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            {(d.strengths?.length || d.weaknesses?.length) && (
              <div className="grid grid-cols-2 gap-4">
                {d.strengths && d.strengths.length > 0 && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-2">
                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Strengths</p>
                    <ul className="space-y-1">
                      {d.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-[10px] text-emerald-400/80 font-medium flex gap-1.5">
                          <span className="text-emerald-500 shrink-0">+</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.weaknesses && d.weaknesses.length > 0 && (
                  <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-2xl space-y-2">
                    <p className="text-[9px] font-black text-red-500/60 uppercase tracking-widest">Weaknesses</p>
                    <ul className="space-y-1">
                      {d.weaknesses.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-[10px] text-red-400/70 font-medium flex gap-1.5">
                          <span className="text-red-500 shrink-0">–</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {d.strategic_recommendation && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-indigo-400/70 uppercase tracking-widest">Strategic Recommendation</p>
                <p className="text-[10px] text-indigo-100/80 leading-relaxed">{d.strategic_recommendation}</p>
              </div>
            )}

            {/* Matched / Missing skills */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#1a1a1a]">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Matched Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.matched_skills || candidate.matched_skills) && (analysis.matched_skills || candidate.matched_skills || []).length > 0
                    ? (analysis.matched_skills || candidate.matched_skills || []).map(s => (
                        <span key={s} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-wider">{s}</span>
                      ))
                    : <span className="text-[9px] text-[#333] font-bold">None detected</span>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">Missing Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.missing_skills || candidate.missing_skills) && (analysis.missing_skills || candidate.missing_skills || []).length > 0
                    ? (analysis.missing_skills || candidate.missing_skills || []).map(s => (
                        <span key={s} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black rounded-lg uppercase tracking-wider">{s}</span>
                      ))
                    : <span className="text-[9px] text-[#333] font-bold">None detected</span>}
                </div>
              </div>
            </div>

            {/* Improvement suggestions */}
            {d.improvement_suggestions && d.improvement_suggestions.length > 0 && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Improvement Suggestions</p>
                <ul className="space-y-1">
                  {d.improvement_suggestions.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-[10px] text-amber-400/70 font-medium flex gap-1.5">
                      <span className="text-amber-500 shrink-0">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interview questions */}
            {d.interview_questions && d.interview_questions.length > 0 && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">AI Interview Questions</p>
                <ul className="space-y-1">
                  {d.interview_questions.slice(0, 3).map((q, i) => (
                    <li key={i} className="text-[10px] text-blue-400/70 font-medium flex gap-1.5">
                      <span className="text-blue-500 shrink-0">{i + 1}.</span>{q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#111]">
              <p className="text-[8px] text-[#222] font-black uppercase tracking-widest">Generated by Autonomous HR Agent</p>
              <p className="text-[8px] text-[#222] font-bold">{new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
