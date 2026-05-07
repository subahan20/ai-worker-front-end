'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Candidate {
  id: string;
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
    strengths?: string[];
    weaknesses?: string[];
    improvement_suggestions?: string[];
    interview_questions?: string[];
    recommended_department?: string;
    education?: string;
    companies?: string[];
    certifications?: string[];
    candidate_name?: string;
    email?: string;
    phone?: string;
  };
}

interface CandidateCardProps {
  candidate: Candidate;
  onRefresh?: () => void;
}

export default function CandidateCard({ candidate, onRefresh }: CandidateCardProps) {
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
  const displayName = d.candidate_name || candidate.parsed_name || candidate.name || 'Unknown Candidate';
  const displayEmail = d.email || candidate.parsed_email || candidate.email || null;
  const displayPhone = d.phone || candidate.parsed_phone || null;
  const displayRole = candidate.parsed_role || candidate.role || d.recommended_department || 'Unspecified Role';
  const displayExp = candidate.parsed_experience || (candidate.experience ? `${candidate.experience}` : null);
  const displaySkills = candidate.parsed_skills || analysis?.matched_skills || [];
  const displayEducation = (() => {
    const edu = d.education || candidate.parsed_education;
    if (!edu) return null;
    if (Array.isArray(edu)) {
      return edu.map((e: any) => `${e.degree || ''} ${e.school ? 'at ' + e.school : ''}`).join(', ');
    }
    return typeof edu === 'string' ? edu : null;
  })();
  const displayCompanies = d.companies || candidate.parsed_companies || [];
  const displayCertifications = d.certifications || candidate.parsed_certifications || [];
  const displayResume = candidate.resume_url || candidate.resume_file || '#';
  const hasResume = !!(candidate.resume_url || candidate.resume_file);

  const score = analysis?.match_score ?? 0;
  const isShortlisted = score >= 80;
  const strokeColor = isShortlisted ? '#10b981' : '#ef4444';
  const glowColor = isShortlisted ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';

  // AUTO-RUN: trigger analysis on mount if none exists
  useEffect(() => {
    if (initialAnalysis || hasFetched.current) return;
    hasFetched.current = true;
    runFallbackAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialAnalysis && !analysis) setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  // Fallback: runs generic analyze (for candidates uploaded before parse-resume was live)
  const runFallbackAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id })
      });
      const data = await res.json();
      if (res.status === 429 || data?.error?.includes('429') || data?.error?.includes('quota')) {
        setError('rate_limit');
      } else if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        if (onRefresh) onRefresh();
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
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
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[#555] text-[10px] font-black uppercase tracking-widest">{displayRole}</p>
            </div>
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
          {displayPhone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">📱</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Phone</p>
                <p className="text-xs text-slate-300 font-bold">{displayPhone}</p>
              </div>
            </div>
          )}
          {displayExp && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">⏱️</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Experience</p>
                <p className="text-xs text-slate-300 font-bold">{displayExp} Years</p>
              </div>
            </div>
          )}
          {displayEducation && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">🎓</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Education</p>
                <p className="text-xs text-slate-300 font-bold">{displayEducation}</p>
              </div>
              {displayCertifications.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">📜</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Certifications</p>
                <p className="text-xs text-slate-300 font-bold">{displayCertifications.slice(0, 3).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
          )}
          {displayCompanies.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111] rounded-xl flex items-center justify-center text-sm border border-[#1e1e1e]">🏢</div>
              <div>
                <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Past Companies</p>
                <p className="text-xs text-slate-300 font-bold">{displayCompanies.slice(0, 3).join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Skills from resume */}
        {displaySkills.length > 0 && (
          <div className="space-y-2">
            <p className="text-[8px] font-black text-[#444] uppercase tracking-widest">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.slice(0, 10).map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black rounded-lg uppercase tracking-wider">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resume link */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#111]">
          {hasResume ? (
            <a
              href={displayResume}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border border-white/10 transition-all"
            >
              📄 View Resume →
            </a>
          ) : (
            <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">No Resume</span>
          )}
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
                {error === 'rate_limit' ? 'Rate Limit — Auto Retrying' : 'Analysis Error'}
              </p>
              <p className="text-[10px] text-[#444] font-medium max-w-[260px]">
                {error === 'rate_limit' ? `Auto-retrying in ~1 min (${retryCount + 1}/3)...` : error}
              </p>
            </div>
            {error !== 'rate_limit' && (
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
                isShortlisted
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              }`}>
                {isShortlisted ? '✅ SHORTLISTED' : '❌ REJECTED'}
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
                    strokeDashoffset={352 - (352 * score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${strokeColor}60)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white leading-none">{score}%</span>
                  <span className="text-[8px] font-black text-[#444] uppercase tracking-widest mt-1">Match</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {d.summary && (
                  <div>
                    <p className="text-[9px] font-black text-[#444] uppercase tracking-widest mb-1">AI Summary</p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{d.summary}"</p>
                  </div>
                )}
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

            {/* Matched / Missing skills */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#1a1a1a]">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Matched Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matched_skills && analysis.matched_skills.length > 0
                    ? analysis.matched_skills.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-wider">{s}</span>
                      ))
                    : <span className="text-[9px] text-[#333] font-bold">None detected</span>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">Missing Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missing_skills && analysis.missing_skills.length > 0
                    ? analysis.missing_skills.map(s => (
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
