'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import { apiUrl } from '@/src/lib/api';
import { extractInstagramHandle, replaceInstagramUrlsInText } from '@/src/lib/instagram';
import Modal from './Modal';
import { ToastContainer, useToast } from './Toast';
import TaskQueue from './TaskQueue';
import CandidateEvaluationModal from './CandidateEvaluationModal';
import PlanModal from './PlanModal';
import TaskCard from './TaskCard';
import AIAnalysisModal from './AIAnalysisModal';
import {
  shouldBlockDeptInsights,
  isDeptTaskSuccessfullyCompleted,
  deptIdleProcessingLine,
  deptProcessingHeadline,
  deptProcessingSubcopy,
  deptCompletedCardBrief,
} from '@/src/lib/deptWorkflow';
import CandidatesTab from './CandidatesTab';
import MarketingTab from './MarketingTab';
import SalesTab from './SalesTab';
import { useGetTasksQuery } from '../redux/api/tasksApi';
import { TASKS_QUERY_OPTIONS } from '../redux/api/tasksQueryDefaults';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { RootState } from '../redux/store';
import { 
  selectHRData, 
  selectMarketingData, 
  selectSalesData, 
  selectOpsData, 
  selectFinanceData 
} from '../redux/slices/tasksSlice';
export type Department = 'HR' | 'Sales' | 'Finance' | 'Marketing' | 'Operations';
export type Status = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  department: Department;
  priority: 'Low' | 'Medium' | 'High';
  status: Status;
  created_at: string;
}

const DEPARTMENTS: Department[] = ['HR', 'Sales', 'Finance', 'Operations', 'Marketing'];

const AGENT_SPECIFICS = {
  HR: {
    tabName: 'Candidates',
    stats: ['Match%', 'Exp', 'Score'],
    items: [
      { id: '1', title: 'John Doe - Principal AI Architect', date: '04 May', priority: 'HIGH', stat1: '98%', stat2: '12y', stat3: '94' },
      { id: '2', title: 'Jane Smith - Senior Product Designer', date: '03 May', priority: 'MED', stat1: '85%', stat2: '8y', stat3: '88' }
    ],
    insights: 'Hiring signals skew toward senior builders who can own outcomes end to end. Remote-first remains the default expectation for top talent.',
    results: [
      { type: 'CANDIDATE', priority: 'HIGH', title: 'John Doe (Principal AI Architect)', desc: 'Deep product engineering with clear ownership stories.', meta: 'Strong match for technical depth and team leadership.' }
    ],
    badge: 'bg-purple-500/10 text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    text: 'text-purple-400',
    icon: '👥',
    subtitle: 'Hiring, reviews, and candidate experience in one view'
  },
  Sales: {
    tabName: 'Leads',
    stats: ['Potential', 'Value', 'Score'],
    items: [
      { id: '1', title: 'Tesla Inc. — Fleet modernization program', date: '02 May', priority: 'HIGH', stat1: '9.2', stat2: '$450K', stat3: '95' },
      { id: '2', title: 'Groq - Neural Dashboard Integration', date: '01 May', priority: 'HIGH', stat1: '8.8', stat2: '$1.2M', stat3: '92' }
    ],
    insights: 'Enterprise buyers move faster when the story leads with measurable impact—not price cuts alone. Value-led narratives are winning the inbox.',
    results: [
      { type: 'LEAD', priority: 'HIGH', title: 'Tesla Inc. (Operations Dept)', desc: 'Decision maker engaged with whitepaper.', meta: 'Direct ROI alignment.' }
    ],
    badge: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    text: 'text-emerald-400',
    icon: '🔥',
    subtitle: 'Pipeline health, proposals, and revenue motion'
  },
  Finance: {
    tabName: 'Invoices',
    stats: ['Amount', 'Overdue', 'Risk'],
    items: [
      { id: '1', title: 'Invoice #8842 - AWS Infrastructure', date: '28 Apr', priority: 'HIGH', stat1: '$12.4K', stat2: '14d', stat3: '9.4' },
      { id: '2', title: 'Invoice #8839 - NVIDIA H100 Cluster', date: '25 Apr', priority: 'LOW', stat1: '$840K', stat2: '2d', stat3: '1.2' }
    ],
    insights: 'SaaS collections are stretching slightly; polite, well-timed follow-ups are shortening days payable without damaging relationships.',
    results: [
      { type: 'INVOICE', priority: 'HIGH', title: 'Amazon Web Services ($12,400)', desc: 'Invoice past terms with a clear payment path.', meta: 'Cadence that stays professional while protecting cash flow.' }
    ],
    badge: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    text: 'text-amber-400',
    icon: '💰',
    subtitle: 'Cash flow, invoices, and financial clarity'
  },
  Marketing: {
    tabName: 'Reels',
    stats: ['Views', 'Likes', 'Comm'],
    items: [
      { id: '1', title: 'Maine Claude ko apna business assistant bana diya...', date: '24 Apr', priority: 'LOW', stat1: '8.1K', stat2: '0.1K', stat3: '162' },
      { id: '2', title: 'Llama 3.3 just dropped on Groq. 💥 Most powerful...', date: '24 Apr', priority: 'LOW', stat1: '10.7K', stat2: '0.2K', stat3: '3' }
    ],
    insights: 'Standout social posts pair a crisp hook with proof—before/after, numbers, or a single memorable takeaway that fits in the first second.',
    results: [
      { type: 'RESULTS', priority: 'HIGH', title: '"I stopped manually responding to DMs..."', desc: 'Customer conversations handled at scale—with receipts.', meta: 'High retention through faster, warmer replies.' }
    ],
    badge: 'bg-pink-500/10 text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.1)]',
    text: 'text-pink-400',
    icon: '📣',
    subtitle: 'Social performance, creative direction, growth'
  },

  Operations: {
    tabName: 'Deployments',
    stats: ['Uptime', 'Errors', 'Latency'],
    items: [],
    insights: 'Reliability holds at enterprise-grade levels, with meaningful savings on cloud spend after rightsizing and smarter scheduling.',
    results: [],
    badge: 'bg-blue-500/10 text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    text: 'text-blue-400',
    icon: '⚙️',
    subtitle: 'Delivery, reliability, and how work ships'
  }
};

/** HR task / selector row: resolve single analysis record (object), not array. */
function getHrAnalysisRecord(row: any): Record<string, any> | null {
  if (!row) return null;
  if (Array.isArray(row.candidate_analysis) && row.candidate_analysis.length > 0) {
    const first = row.candidate_analysis[0];
    if (first && typeof first === 'object') return first as Record<string, any>;
  }
  const direct = row.analysis;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct as Record<string, any>;
  return null;
}

function hrDecision(row: any): string {
  return String(getHrAnalysisRecord(row)?.decision || '').toUpperCase();
}

/** Map backend `/analysis/hr` payload + `details.*` to Overview UI shape. */
function buildHROverviewFromAnalysisRecord(row: any, analysisRecord: Record<string, any> | null): {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} | null {
  if (!analysisRecord || typeof analysisRecord !== 'object') return null;
  const details =
    analysisRecord.details && typeof analysisRecord.details === 'object'
      ? (analysisRecord.details as Record<string, any>)
      : {};
  const name = String(row?.name || row?.display_name || row?.applicantName || '').trim();

  const toStrList = (arr: unknown) =>
    Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter((x) => x.length > 0) : [];

  const briefing =
    [
      details.executive_briefing,
      details.summary,
      analysisRecord.summary,
      row?.ai_summary,
      row?.aiSummary,
    ]
      .map((x) => String(x || '').trim())
      .find((x) => x.length > 0) || '';

  const reason = String(analysisRecord.reason || '').trim();
  let summary = briefing;
  if (!summary && name && reason) summary = `Candidate: ${name} — ${reason}`;
  else if (!summary && name) {
    const score = analysisRecord.match_score;
    summary =
      score != null && score !== ''
        ? `Candidate: ${name} — Match score ${score}% (${String(analysisRecord.decision || 'N/A').toUpperCase()}).`
        : `Candidate: ${name} — AI assessment on file.`;
  } else if (!summary && reason) summary = reason;
  else if (!summary && analysisRecord.match_score != null) {
    summary = `Match score ${analysisRecord.match_score}% — ${reason || String(analysisRecord.decision || '').toUpperCase() || 'HR review'}.`;
  }
  if (!summary) return null;

  let strengths = toStrList(details.strengths);
  if (!strengths.length) strengths = toStrList(details.pros);
  if (!strengths.length) strengths = toStrList(analysisRecord.matched_skills);
  if (!strengths.length && reason) strengths = [`Assessment: ${reason}`];

  let weaknesses = toStrList(details.weaknesses);
  if (!weaknesses.length) weaknesses = toStrList(details.cons);
  if (!weaknesses.length) weaknesses = toStrList(analysisRecord.missing_skills);

  const recommendations: string[] = [];
  const strat = String(details.strategic_recommendation || '').trim();
  if (strat) recommendations.push(strat);
  const interviewPlan = String(details.interview_plan || '').trim();
  if (interviewPlan) recommendations.push(interviewPlan);
  recommendations.push(...toStrList(details.improvement_suggestions));
  const improvement = String(analysisRecord.improvement || '').trim();
  if (improvement && !recommendations.includes(improvement)) recommendations.push(improvement);
  if (!recommendations.length) {
    recommendations.push('Proceed with structured interview and calibrated scorecard validation.');
  }

  return { summary, strengths, weaknesses, recommendations };
}

function isPlaceholderRoleString(value: string) {
  const t = String(value || '').trim().toLowerCase();
  return !t || t === 'unspecified' || t === 'unspecified role' || t === 'unknown';
}

/** CEO report shortlisted cards — same idea as backend `resolveReportRole` (cached reports, old payloads). */
function formatShortlistedCardRole(c: { role?: string; strengths?: string[] }) {
  const primary = String(c?.role || '').trim();
  if (!isPlaceholderRoleString(primary)) return primary;
  const skills = Array.isArray(c.strengths) ? c.strengths.filter(Boolean).map(String) : [];
  if (skills.length) return `Skills focus: ${skills.slice(0, 4).join(', ')}`;
  return 'Role not stated on application';
}

function pickMarketingText(...vals: unknown[]): string {
  for (const v of vals) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      const inner = v
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0 && x !== 'undefined' && x !== 'null');
      if (inner.length) return inner.join('; ');
      continue;
    }
    const s = String(v).trim();
    if (s.length > 0 && s !== 'undefined' && s !== 'null') return s;
  }
  return '';
}

function marketingBulletList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0 && x !== 'undefined' && x !== 'null');
  }
  if (raw != null) {
    const s = String(raw).trim();
    if (s.length > 0 && s !== 'undefined') return [s];
  }
  return [];
}

/** Marketing Overview: never interpolate `undefined`; synthesize useful copy from task + metadata + any AI fields. */
function buildMarketingOverviewAnalysis(profile: any): {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} | null {
  if (!profile) return null;
  const meta = profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {};
  const rawObj =
    (Array.isArray(profile.marketing_analysis) && profile.marketing_analysis[0] && typeof profile.marketing_analysis[0] === 'object'
      ? profile.marketing_analysis[0]
      : null) ||
    (profile.analysis && typeof profile.analysis === 'object' && !Array.isArray(profile.analysis) ? profile.analysis : null);

  const handle =
    pickMarketingText(
      profile.handle_name,
      meta.handle_name,
      meta.profile_name,
      meta.company_name,
      String(profile.title || '').match(/(?:Viral Audit|Instagram presence review):\s*(.+)$/i)?.[1]
    ) || 'this brand';

  const platform = pickMarketingText(profile.platform, meta.platform) || 'Instagram';

  let aiCore = pickMarketingText(
    rawObj?.summary,
    rawObj?.reason,
    rawObj?.overview,
    rawObj?.executive_summary,
    rawObj?.details?.summary,
    profile.aiSummary,
    profile.summary,
    profile.description,
    meta.analysis_summary
  );
  if (aiCore) aiCore = replaceInstagramUrlsInText(aiCore);

  const igUrl = pickMarketingText(meta.instagram_url);
  const igHandle = igUrl ? extractInstagramHandle(igUrl) : null;
  const igDisplay = igHandle ? `@${igHandle}` : '';
  const business = pickMarketingText(meta.business_type, meta.budget);
  const competitors = pickMarketingText(meta.competitors);

  const summaryBody =
    aiCore ||
    [
      `We’re lining up a clear read on ${handle} on ${platform}—what’s working, what’s flat, and where attention converts.`,
      igUrl ? `Profile on file: ${igDisplay || 'Instagram (linked)'}.` : null,
      business ? `Goals and constraints captured: ${business}.` : null,
      competitors ? `Competitive set noted for positioning: ${competitors}.` : null,
      'As richer performance signals arrive, we’ll translate them into a tight set of creative bets and a calendar you can ship with confidence.',
    ]
      .filter(Boolean)
      .join(' ');

  let strengths = marketingBulletList(rawObj?.pros || rawObj?.strengths);
  if (!strengths.length) {
    strengths = [
      igUrl
        ? 'Your Instagram destination is documented so every recommendation ties back to a real profile.'
        : 'Brand and channel context is captured so recommendations stay grounded in how you show up today.',
      business
        ? `Your positioning notes (${business}) give us a credible lens for message-market fit.`
        : 'There’s room to sharpen the story once we align themes with what your audience saves and shares.',
      'Short-form creative plus one flagship call-to-action is the fastest path to clearer conversion signals.',
    ];
  }

  let weaknesses = marketingBulletList(rawObj?.cons || rawObj?.weaknesses);
  if (!weaknesses.length) {
    weaknesses = [
      rawObj
        ? 'Finer-grained performance context will make the difference between “good ideas” and “ideas we can bet on.”'
        : 'We’re still early—recommendations are directional until recent posts and outcomes are reflected in the workspace.',
      'Peer benchmarks will sharpen once we compare engagement quality—not just volume—against similar accounts.',
      'Creative themes should be refreshed on a steady rhythm as new results land, so the plan stays relevant.',
    ];
  }

  const rec =
    pickMarketingText(
      rawObj?.content_ideas,
      rawObj?.recommendations,
      rawObj?.strategy,
      rawObj?.improvement
    ) ||
    'Run a two-week sprint: three distinct story angles per week, refresh creative weekly, and point every post to one measurable outcome on your site. Track saves, shares, and qualified conversations—not vanity alone.';

  return {
    summary: `${handle} on ${platform} — ${summaryBody}`,
    strengths,
    weaknesses,
    recommendations: [rec],
  };
}

export default function NeuralWorkflowSystem() {
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Data' | 'Ideas'>('Overview');
  const [runningDepts, setRunningDepts] = useState<Set<string>>(new Set());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const allMarketingData = useAppSelector((state: RootState) => selectMarketingData(state));
  const allHRData = useAppSelector((state: RootState) => selectHRData(state));
  const allSalesData = useAppSelector((state: RootState) => selectSalesData(state));
  const allOpsData = useAppSelector((state: RootState) => selectOpsData(state));
  const allFinanceData = useAppSelector((state: RootState) => selectFinanceData(state));

  const [hrReport, setHrReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<{title: string, dept: string, content: any} | null>(null);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedTaskForAnalysis, setSelectedTaskForAnalysis] = useState<{id: string, dept: string, title: string} | null>(null);

  const inferDiscipline = (candidate: any): string => {
    const rawRole = String(candidate?.role || '').trim();
    const role = rawRole.toLowerCase();
    if (role && role !== 'unspecified' && role !== 'unspecified role' && role !== 'unknown') {
      const first = rawRole.split(/\s+/)[0];
      return first || 'Generalist';
    }
    const skills = Array.isArray(candidate?.strengths) ? candidate.strengths : [];
    const joined = skills.join(' ').toLowerCase();
    if (/(react|next|javascript|typescript|html|css|frontend|ui)/.test(joined)) return 'Frontend';
    if (/(node|express|api|backend|postgres|mongodb|sql|database)/.test(joined)) return 'Backend';
    if (/(marketing|seo|content|growth|campaign)/.test(joined)) return 'Marketing';
    if (/(sales|lead|crm|pipeline|revenue)/.test(joined)) return 'Sales';
    if (/(finance|account|budget|invoice|cashflow)/.test(joined)) return 'Finance';
    if (/(hr|recruit|talent|people|hiring)/.test(joined)) return 'HR';
    return 'Generalist';
  };

  const fetchHRReport = async () => {
    try {
      const res = await fetch(apiUrl('/hr/report/generate'));
      const data = await res.json();
      if (data.success) setHrReport(data.report);
    } catch (err) {
      console.error('Failed to fetch HR report:', err);
    }
  };

  const generateHRReport = async (force = false) => {
    setIsGeneratingReport(true);
    const loadingId = addToast(force ? '🤖 Synthesizing report from all analyzed talent...' : '🤖 Analyzing candidates and drafting CEO report...', 'loading');
    try {
      const res = await fetch(apiUrl('/hr/report/generate'), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }) 
      });
      const data = await res.json();
      if (data.success) {
        if (data.report) {
          setHrReport(data.report);
          removeToast(loadingId);
          addToast('✅ CEO Strategic Report Generated', 'success');
        } else {
          removeToast(loadingId);
          addToast('ℹ️ No shortlisted candidates found yet.', 'success');
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      removeToast(loadingId);
      addToast(`❌ Report failed: ${err.message}`, 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const { data: allTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useGetTasksQuery(
    undefined,
    TASKS_QUERY_OPTIONS
  );

  const hasRunningWorkflowTask = React.useMemo(
    () =>
      allTasks.some((t) => {
        const s = String(t.status ?? '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
        return s === 'running' || s === 'working' || s === 'in_progress';
      }),
    [allTasks]
  );

  useEffect(() => {
    if (!hasRunningWorkflowTask) return;
    const intervalMs = 5000;
    const id = window.setInterval(() => {
      void refetchTasks();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [hasRunningWorkflowTask, refetchTasks]);

  // Local state for UI only
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const completedDepts = React.useMemo(() => {
    const depts = new Set<string>();
    allTasks.forEach((t) => {
      if (isDeptTaskSuccessfullyCompleted(t)) depts.add(t.department);
    });
    return depts;
  }, [allTasks]);

  const fetchTasks = () => refetchTasks();

  // AUTO-GENERATE CEO REPORT: fires when HR Ideas tab is open and analyzed candidates exist
  useEffect(() => {
    if (selectedDept !== 'HR' || activeTab !== 'Ideas') return;
    const tasksForDept = allTasks.filter((t) => t.department === 'HR');
    const hrLatest =
      tasksForDept.length === 0
        ? null
        : [...tasksForDept].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
    if (hrLatest && !isDeptTaskSuccessfullyCompleted(hrLatest)) return;
    if (isGeneratingReport || hrReport) return;
    const analyzedCount = allHRData.filter((c: any) => {
      const analysis = Array.isArray(c?.candidate_analysis) ? c.candidate_analysis[0] : c?.analysis;
      const decision = String(analysis?.decision || '').toUpperCase();
      return Boolean(analysis) && (decision === 'SHORTLISTED' || decision === 'REJECTED' || decision === 'PARSING_FAILED');
    }).length;

    if (analyzedCount > 0) {
      generateHRReport(true); // Force generation since we have analyzed candidates
    }
  }, [selectedDept, activeTab, allTasks, allHRData, hrReport, isGeneratingReport]);


  const fetchCandidates = async () => {
    // Stage 1: try full query with parsed resume columns
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, name, email, role, department, experience, resume_url,
          parsed_name, parsed_email, parsed_phone, parsed_role,
          parsed_experience, parsed_skills, parsed_education, parsed_companies,
          parsed_projects, parsed_certifications,
          created_at,
          candidate_analysis(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // PGRST204 = column not found — migration not run yet
        if (error.code === 'PGRST204' || error.message?.includes('column')) {
          throw new Error('parsed_columns_missing');
        }
        throw error;
      }
      setCandidates(data || []);
      return;
    } catch (err: any) {
      if (err?.message !== 'parsed_columns_missing') {
        console.error('Failed to fetch candidates:', err?.message || err);
        return;
      }
    }

    // Stage 2: fallback — basic select without parsed columns
    // Run fix_all_db_errors.sql in Supabase to enable full parsing
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, candidate_analysis(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Only warn once per session to avoid log spam
      if (!(globalThis as any).__hrMigrationWarned) {
        (globalThis as any).__hrMigrationWarned = true;
        console.warn('[HR] Run fix_all_db_errors.sql in Supabase to enable real resume parsing.');
      }
      setCandidates(data || []);
    } catch (fallbackErr: any) {
      console.error('Failed to fetch candidates (fallback):', fallbackErr?.message || fallbackErr);
    }
  };

  const handleSendToCEO = async (candidate: any) => {
    if (!candidate.evaluation) {
      addToast('❌ No evaluation data to send', 'error');
      return;
    }

    setIsSendingEmail(candidate.id);
    const loadingId = addToast('📧 Sending report to CEO...', 'loading');

    try {
      const res = await fetch(apiUrl('/tasks/execute'), { // Reusing execute or creating new?
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'CEO_EMAIL',
          candidateName: candidate.name,
          evaluation: candidate.evaluation
        }),
      });

      if (!res.ok) throw new Error('Failed to send email');
      
      removeToast(loadingId);
      addToast(`✅ Evaluation for ${candidate.name} sent to CEO`, 'success');
    } catch (err: any) {
      removeToast(loadingId);
      addToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleGenerateTask = async () => {
    if (!description.trim() || isGenerating) return;
    setIsGenerating(true);
    const loadingId = addToast('🤖 Analyzing task...', 'loading');

    try {
      const aiRes = await fetch(apiUrl('/tasks/assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (!aiRes.ok) throw new Error('AI assignment failed');
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);
      let mappedDept = aiData.department as Department;
      if (!DEPARTMENTS.includes(mappedDept)) mappedDept = 'Operations';

      const saveRes = await fetch(apiUrl('/tasks'), {
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

      await refetchTasks();
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

  const startWorkflow = async (dept: Department) => {
    setRunningDepts(prev => new Set([...prev, dept]));
    try {
      const response = await fetch(apiUrl(`/workflow/${dept.toLowerCase()}/run`), { method: 'POST' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn(`[Workflow] ${dept} responded with ${response.status}:`, err?.message);
      }
    } catch (error) {
      console.error(`[Workflow] Network error for ${dept}:`, error);
    } finally {
      setRunningDepts(prev => { const next = new Set(prev); next.delete(dept); return next; });
    }
  };

  // Get the most recent task for each department to determine current status
  const getActiveTaskForDept = (dept: Department) => {
    const tasksForDept = allTasks.filter(t => t.department === dept);
    if (tasksForDept.length === 0) return null;
    // Sort by created_at descending and pick the first
    return [...tasksForDept].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const latestModalDeptTask = React.useMemo(() => {
    if (!selectedDept) return null;
    const tasksForDept = allTasks.filter((t) => t.department === selectedDept);
    if (tasksForDept.length === 0) return null;
    return [...tasksForDept].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [allTasks, selectedDept]);

  const deptInsightsBlocked = shouldBlockDeptInsights(latestModalDeptTask);

  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-[#050505] text-[#d1d1d1] font-sans overflow-x-hidden px-0 py-6 sm:py-8 selection:bg-orange-500/30">
      <header className="w-full max-w-none mx-auto flex items-center justify-between mb-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20">
            <span className="text-white text-xl font-bold italic">P</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Phaze AI <span className="text-[#555]">Business OS</span></h1>
        </div>
        <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowPlanModal(true)}
                className="group relative px-6 py-2.5 bg-white text-black hover:bg-orange-500 hover:text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-sm">✦</span> Create Plan
                </span>
              </button>

        </div>
      </header>

      <main className="w-full max-w-none mx-auto space-y-10 pb-24 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* CEO CONTROL AGENT HERO */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[100px] -mr-32 -mt-32" />
          <div className="w-32 h-32 bg-[#1a1a1a] rounded-3xl flex items-center justify-center relative border border-white/5 shadow-2xl">
             <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 via-orange-500 to-yellow-500 rounded-full animate-pulse blur-sm opacity-50" />
             <span className="absolute text-4xl">🧠</span>
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">CEO Control Agent</h2>
            <p className="text-sm text-[#888] font-medium uppercase tracking-widest">Cross-team clarity · Faster decisions · Cleaner execution</p>
          </div>
        </section>

        {/* --- Task Queue Integration --- */}
        <TaskQueue tasks={allTasks} isLoading={isLoadingTasks} />

        {/* --- Department Agents Grid --- */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] px-2">Department Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPARTMENTS.map(dept => {
              const config = AGENT_SPECIFICS[dept];
              const activeTask = getActiveTaskForDept(dept);
              const status = activeTask?.status?.toLowerCase() || 'idle';
              
              const isDone =
                Boolean(activeTask) && isDeptTaskSuccessfullyCompleted(activeTask);
              const isWorking =
                (runningDepts.has(dept) || status === 'running' || status === 'working' || status === 'in_progress') &&
                !isDone;
              const isWaiting =
                (status === 'waiting_for_ceo' || status === 'pending') && !isWorking && !isDone;

              const doneBrief = deptCompletedCardBrief(dept, activeTask?.title);

              return (
                <div key={dept} className={`bg-[#0f0f0f] rounded-[2rem] p-6 border ${isDone ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-[#1a1a1a]'} shadow-xl flex flex-col justify-between min-h-[240px] transition-all duration-500 hover:border-[#333]`}>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-[#1a1a1a] border ${isDone ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : config.border} flex items-center justify-center text-2xl shadow-lg transition-all duration-500`}>
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-[15px]">{dept} Department</h3>
                        <p className="text-[10px] text-[#555] font-black uppercase tracking-widest mt-1 max-w-[180px] leading-tight">{config.subtitle}</p>
                        {isDone && (
                          <div className="flex items-center gap-1.5 text-emerald-500 text-[9px] font-black uppercase tracking-widest mt-3 bg-emerald-500/10 px-2 py-1 rounded-md w-fit border border-emerald-500/20 animate-in fade-in slide-in-from-top-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"/>
                            Mission Successfully Completed
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Status Dot */}
                    <div className="flex items-center gap-2 bg-[#151515] px-2.5 py-1 rounded-md border border-[#222]">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isWorking ? 'bg-yellow-500 animate-pulse' : 
                        isWaiting ? 'bg-[#444]' :
                        isDone ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                        'bg-[#444]'
                      }`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        isWorking ? 'text-yellow-400' : 
                        isWaiting ? 'text-[#666]' :
                        isDone ? 'text-emerald-400' :
                        'text-[#666]'
                      }`}>
                        {isWorking ? 'WORKING' : isWaiting ? 'IDLE' : isDone ? 'COMPLETED' : 'IDLE'}
                      </span>
                    </div>
                  </div>

                  {/* Task Box */}
                  <div className={`flex-1 rounded-xl p-4 mb-4 text-xs font-medium border transition-all ${
                    isWorking ? 'border-yellow-500/30 bg-yellow-500/5' : 
                    isDone ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 
                    activeTask ? 'border-orange-500/30 bg-orange-500/5' : 
                    'border-[#1a1a1a] bg-transparent text-[#555] flex items-center italic'
                  }`}>
                    {isWorking ? (
                      <div className="space-y-2">
                        <p className="text-yellow-400 leading-relaxed animate-pulse">
                          {deptIdleProcessingLine(dept)}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60">
                          Processing… · AI is working…
                        </p>
                        {activeTask?.title ? (
                          <p className="text-[10px] text-white/40 font-bold truncate" title={activeTask.title}>
                            {activeTask.title}
                          </p>
                        ) : null}
                      </div>
                    ) : isDone ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-[8px] font-black text-black rounded uppercase tracking-tighter shadow-lg">Success</span>
                          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{doneBrief.title}</span>
                        </div>
                        <p className="text-emerald-400/90 leading-relaxed line-clamp-3">
                          {doneBrief.body}
                        </p>
                      </div>
                    ) : activeTask ? (
                      <div className="space-y-2">
                        <p className="text-orange-400 leading-relaxed">{deptIdleProcessingLine(dept)}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/60">
                          Queued or awaiting approval — insights stay hidden until this run completes.
                        </p>
                        {activeTask.title ? (
                          <p className="text-[10px] text-white/40 font-bold truncate">{activeTask.title}</p>
                        ) : null}
                      </div>
                    ) : (
                      "Standing by for tasks..."
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedDept(dept); setShowWorkflowModal(true); }}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border ${isDone ? `${config.border} ${config.text} hover:bg-[#151515]` : 'border-[#222] text-[#555] hover:bg-[#1a1a1a] hover:text-white'} flex items-center justify-center gap-2`}
                    >
                      Open Details <span>&rarr;</span>
                    </button>
                    <button className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#555] border border-[#222] hover:bg-[#1a1a1a] hover:text-white rounded-xl transition-colors">
                      Chat
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </main>
      
      {/* Legacy Details Modal View */}
      {showWorkflowModal && selectedDept && (
        <div className="fixed inset-0 z-[200] flex animate-in fade-in duration-300">
          <div className="flex-1 min-w-0 bg-[#050505] overflow-y-auto py-8 sm:py-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 custom-scrollbar">
            <div className="w-full max-w-none mx-auto space-y-12">
              <div className="flex justify-between items-start">
                <button onClick={() => setShowWorkflowModal(false)} className="text-sm font-bold text-[#555] hover:text-white flex items-center gap-2 transition-colors"><span>←</span> Back</button>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-3xl shadow-2xl">{AGENT_SPECIFICS[selectedDept].icon}</div>
                  <div>
                    <h2 className="text-4xl font-bold text-white tracking-tighter italic">{selectedDept}</h2>
                    <p className="text-xs text-[#555] font-black uppercase tracking-widest mt-1">{AGENT_SPECIFICS[selectedDept].subtitle}</p>
                  </div>
                </div>
                <div className="w-20" />
              </div>

              <div className="flex gap-10 border-b border-[#1a1a1a] mb-10 px-4">
                {['Overview', 'Data', 'Ideas'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                      activeTab === tab ? 'text-white' : 'text-[#444] hover:text-[#888]'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                  </button>
                ))}
              </div>

              <div className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <>
                    {activeTab === 'Overview' && (
                  <div className="w-full space-y-10">
                    {(() => {
                      if (deptInsightsBlocked) {
                        return (
                          <div className="bg-[#0f0f0f] border border-orange-500/20 p-12 sm:p-16 rounded-[3rem] flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-4xl animate-pulse">
                              ✦
                            </div>
                            <div className="space-y-3 max-w-lg">
                              <p className="text-white text-xl font-bold tracking-tight">{deptProcessingHeadline(selectedDept)}</p>
                              <p className="text-[#888] text-sm font-medium leading-relaxed">{deptProcessingSubcopy(selectedDept)}</p>
                              {latestModalDeptTask?.title ? (
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                                  Active run: {latestModalDeptTask.title}
                                </p>
                              ) : null}
                              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-500/80">
                                Processing… · AI is working…
                              </p>
                            </div>
                          </div>
                        );
                      }

                      let analysis: any = null;

                      if (selectedDept === 'HR') {
                        const shortlistedRow = allHRData.find((c) => {
                          const d = hrDecision(c);
                          return d === 'SHORTLISTED' || d === 'SELECTED' || d === 'HIRE';
                        });
                        const prioritizedRow =
                          shortlistedRow ||
                          allHRData.find((c) => getHrAnalysisRecord(c)) ||
                          null;

                        if (prioritizedRow) {
                          const rec = getHrAnalysisRecord(prioritizedRow);
                          analysis = buildHROverviewFromAnalysisRecord(prioritizedRow, rec);
                        } else {
                          const latestTask = [...allTasks]
                            .filter((t) => t.department === selectedDept)
                            .sort(
                              (a, b) =>
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0] as any;
                          const raw = latestTask?.analysis;
                          const rec =
                            raw && typeof raw === 'object' && !Array.isArray(raw)
                              ? raw
                              : Array.isArray(raw)
                                ? raw[0] || null
                                : null;
                          analysis = buildHROverviewFromAnalysisRecord(latestTask || {}, rec);
                        }
                      } else if (selectedDept === 'Marketing') {
                        const latestMk = allMarketingData[0];
                        if (latestMk) {
                          analysis = buildMarketingOverviewAnalysis(latestMk);
                        }
                        if (!analysis) {
                          const latestTask = [...allTasks]
                            .filter((t) => t.department === selectedDept)
                            .sort(
                              (a, b) =>
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0];
                          if (latestTask) {
                            analysis = buildMarketingOverviewAnalysis({
                              ...latestTask,
                              handle_name: (latestTask as any).title,
                              platform: 'Marketing',
                              marketing_analysis: [],
                            });
                          }
                        }
                      } else if (selectedDept === 'Sales') {
                        const latestSales = allSalesData[0] as any;
                        if (latestSales) {
                          const weaknesses =
                            (latestSales.analysis?.gap_list as string[] | undefined) ||
                            (Array.isArray(latestSales.analysis?.weaknesses) ? latestSales.analysis.weaknesses : null) ||
                            (Array.isArray(latestSales.weaknesses) ? latestSales.weaknesses : null) ||
                            [];
                          analysis = {
                            summary:
                              latestSales.analysis?.overview ||
                              latestSales.overview ||
                              'Pipeline context is on file—prioritize the accounts with clearest intent signals and the shortest path to revenue.',
                            strengths: [
                              latestSales.analysis?.target_customers ||
                                latestSales.target_customers ||
                                'Opportunities are segmented so outreach stays specific, not generic.',
                            ],
                            weaknesses:
                              weaknesses.length > 0
                                ? weaknesses.map((x: unknown) => String(x))
                                : [
                                    'Sharpen follow-up velocity so warm conversations do not cool while internal reviews run long.',
                                  ],
                            recommendations: [
                              latestSales.analysis?.strategy ||
                                latestSales.strategy ||
                                'Align the next sprint around one flagship offer proof point and tighten the qualification checklist your reps use daily.',
                            ],
                          };
                        }
                      } else if (selectedDept === 'Operations') {
                        const latestOps = allOpsData[0] as any;
                        if (latestOps) {
                          analysis = {
                            summary:
                              latestOps.analysis?.summary ||
                              latestOps.summary ||
                              'Operational posture is summarized for leadership: throughput, friction points, and what to automate next.',
                            strengths:
                              (latestOps.analysis?.improvements as string[] | undefined) ||
                              latestOps.improvements ||
                              [],
                            weaknesses:
                              (latestOps.analysis?.inefficiencies as string[] | undefined) ||
                              latestOps.inefficiencies ||
                              [],
                            recommendations:
                              (latestOps.analysis?.execution_steps as string[] | undefined) ||
                              latestOps.execution_steps ||
                              [],
                          };
                        }
                      } else if (selectedDept === 'Finance') {
                        const latestFinance = allFinanceData[0] as any;
                        if (latestFinance) {
                          analysis = {
                            summary: latestFinance.summary,
                            strengths: latestFinance.highlights || [],
                            weaknesses:
                              Array.isArray(latestFinance.watch_items) &&
                              latestFinance.watch_items.length > 0
                                ? latestFinance.watch_items.map((x: unknown) => String(x))
                                : [
                                    'Use the next reporting window to confirm burn and collections trends before expanding discretionary spend.',
                                  ],
                            recommendations: latestFinance.recommendations || [],
                          };
                        }
                      } else {
                        // Generic department task overview
                        const latestTask = [...allTasks]
                          .filter(t => t.department === selectedDept)
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                        analysis = latestTask?.analysis;
                      }

                      if (!analysis) return (
                        <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-16 rounded-[3rem] text-center space-y-8 flex flex-col items-center">
                          <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-orange-500/20 mb-4 animate-pulse">
                            💡
                          </div>
                          <div>
                            <p className="text-white text-xl font-bold tracking-tight mb-2">No Strategic Data Available</p>
                            <p className="text-[#555] text-xs max-w-[300px] mx-auto uppercase tracking-widest font-black">We’re preparing this department’s view. Connect a plan or refresh data and the highlights will appear here.</p>
                          </div>
                          <button 
                            onClick={() => setShowPlanModal(true)}
                            className="px-8 py-4 bg-orange-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all"
                          >
                            Generate AI Strategy
                          </button>
                        </div>
                      );

                      return (
                        <div className="space-y-6">
                          {/* Summary */}
                          <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-10 rounded-[2.5rem] space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-orange-500">AI Executive Briefing</h3>
                            <div className="space-y-4">
                              {(analysis.summary || analysis.final_summary || 'Overview generated successfully.')
                                .split(/(?=Week \d:)/)
                                .map((segment: string) => segment.trim())
                                .filter((segment: string) => segment.length > 0 && segment !== 'undefined')
                                .map((segment: string, idx: number) => (
                                  <p key={idx} className="text-lg font-bold text-slate-100 leading-relaxed tracking-tight">
                                    {segment}
                                  </p>
                                ))}
                            </div>
                          </div>

                          {/* Strengths and Weaknesses */}
                          <div className="grid grid-cols-2 gap-6">
                            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem]">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Strengths
                              </h4>
                              <ul className="space-y-3">
                                {(analysis.strengths || analysis.highlights || []).map((item: string, i: number) => (
                                  <li key={i} className="text-sm text-slate-300 font-medium">{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem]">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Weaknesses
                              </h4>
                              <ul className="space-y-3">
                                {(analysis.weaknesses || []).map((item: string, i: number) => (
                                  <li key={i} className="text-sm text-slate-300 font-medium">{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Recommendation */}
                          <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Strategic Recommendation</h4>
                            <div className="flex gap-2 flex-wrap">
                               {(analysis.recommendations || [analysis.strategy_content])
                                 .filter((item: unknown) => item != null && String(item).trim().length > 0)
                                 .map((item: string, i: number) => (
                                 <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white">
                                   {item}
                                 </span>
                               ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'Data' && selectedDept === 'HR' && (
                  <CandidatesTab candidates={allHRData} onRefresh={refetchTasks} />
                )}

                {activeTab === 'Data' && selectedDept === 'Marketing' && (
                  <MarketingTab profiles={allMarketingData} />
                )}

                {activeTab === 'Data' && selectedDept === 'Sales' && (
                  <SalesTab />
                )}



                {activeTab === 'Data' && selectedDept !== 'HR' && selectedDept !== 'Marketing' && selectedDept !== 'Sales' && (
                  <div className="w-full space-y-10">
                    {/* Header */}
                    <div className="flex justify-between items-center px-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-[#444]">
                        {selectedDept === 'Operations' ? allOpsData.length : 
                         selectedDept === 'Finance' ? allFinanceData.length : 
                         (AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).items.length} {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).tabName.toUpperCase()} · STORED IN DB
                       </h3>
                       <button 
                        onClick={() => refetchTasks()}
                        className="text-[10px] font-black text-[#555] uppercase tracking-widest hover:text-white transition-all underline underline-offset-4"
                       >
                         Refresh Feed
                       </button>
                    </div>

                    {/* Content List */}
                    <div className="space-y-4">
                      {/* 1. Show database insights if they exist */}
                      {selectedDept === 'Operations' && allOpsData.map((item: any) => (
                        <div key={item.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-blue-500/50 transition-all group">
                          <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-[#151515] border border-white/5 rounded-2xl flex items-center justify-center text-3xl">⚙️</div>
                            <div className="space-y-3">
                              <h4 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">Operational Briefing: {new Date(item.created_at).toLocaleDateString()}</h4>
                              <p className="text-sm text-[#555] leading-relaxed line-clamp-2">{item.summary}</p>
                              <div className="flex gap-4">
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-blue-500/20">{item.inefficiencies?.length || 0} Inefficiencies</span>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-emerald-500/20">{item.improvements?.length || 0} Improvements</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selectedDept === 'Finance' && allFinanceData.map((item: any) => (
                        <div key={item.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-amber-500/50 transition-all group">
                          <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-[#151515] border border-white/5 rounded-2xl flex items-center justify-center text-3xl">💰</div>
                            <div className="space-y-3">
                              <h4 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">Financial Audit: {new Date(item.created_at).toLocaleDateString()}</h4>
                              <p className="text-sm text-[#555] leading-relaxed line-clamp-2">{item.summary}</p>
                              <div className="flex gap-4 items-center">
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-amber-500/20">Score: {item.score}/100</span>
                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{item.recommendations?.length || 0} Critical Recommendations</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 2. Fallback to AGENT_SPECIFICS items if they exist */}
                      {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).items.map((item: any) => (
                        <div key={item.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-pink-500/50 transition-all group relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-8">
                              <div className="w-20 h-20 bg-[#151515] border border-white/5 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                📄
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-orange-500/20">{item.priority}</span>
                                  <span className="text-[10px] font-black text-[#444] uppercase tracking-widest">{item.date}</span>
                                </div>
                                <h4 className="text-xl font-black text-white group-hover:text-pink-400 transition-colors max-w-xl leading-tight">{item.title}</h4>
                                <div className="flex gap-6 text-[10px] font-black text-[#444] uppercase tracking-widest">
                                  <span className="flex items-center gap-2">👁️ {item.stat1} {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).stats[0]}</span>
                                  <span className="flex items-center gap-2">❤️ {item.stat2} {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).stats[1]}</span>
                                  <span className="flex items-center gap-2">💬 {item.stat3} {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).stats[2]}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 3. Empty State */}
                      {((selectedDept === 'Operations' && allOpsData.length === 0) ||
                        (selectedDept === 'Finance' && allFinanceData.length === 0)) &&
                        AGENT_SPECIFICS[selectedDept].items.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                          <div className="text-4xl">📭</div>
                          <p className="text-sm text-[#444] font-black uppercase tracking-widest">No active database items for {selectedDept}</p>
                          <p className="text-xs text-[#333] max-w-xs mx-auto">Click "Overview" and run an AI Strategy mission to populate this department's intelligence nodes.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'Ideas' && (
                  <div className="w-full space-y-8">
                     <div className="flex w-full justify-between items-center px-0 sm:px-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#444]">AI Strategic Ideas</h3>
                     </div>
                     {deptInsightsBlocked ? (
                       <div className="bg-[#0f0f0f] border border-orange-500/20 p-12 sm:p-16 rounded-[3rem] flex flex-col items-center text-center space-y-6">
                         <div className="w-16 h-16 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                         <div className="space-y-3 max-w-lg">
                           <p className="text-white text-lg font-bold tracking-tight">{deptProcessingHeadline(selectedDept)}</p>
                           <p className="text-[#888] text-xs font-medium leading-relaxed">{deptProcessingSubcopy(selectedDept)}</p>
                           <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-500/80">
                             Playbooks and AI pitch assets unlock after this department run completes.
                           </p>
                         </div>
                       </div>
                     ) : (
                     <div className="grid w-full gap-6">
                     {(() => {
                         if (selectedDept === 'HR') {
                          return (
                            <div className="w-full space-y-10 animate-in fade-in duration-700">
                               {/* CEO Report Section */}
                               {isGeneratingReport ? (
                                 <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-20 rounded-[3rem] flex flex-col items-center justify-center space-y-6">
                                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                                    <div className="text-center">
                                      <p className="text-sm font-black uppercase tracking-[0.4em] text-purple-500 mb-2">Synthesizing Intel</p>
                                      <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Aggregating candidate data into strategic CEO summary...</p>
                                    </div>
                                 </div>
                                ) : !hrReport ? (
                                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] border-dashed p-20 rounded-[3rem] flex flex-col items-center justify-center space-y-8 text-center">
                                     <div className="relative">
                                       <div className="w-20 h-20 rounded-full border-2 border-purple-500/20 border-t-purple-500/60 animate-spin" />
                                       <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
                                     </div>
                                     <div className="space-y-2">
                                       <h4 className="text-lg font-black text-white uppercase tracking-tight">
                                         {allHRData.some((c: any) => {
                                            const analysis = Array.isArray(c?.candidate_analysis) ? c.candidate_analysis[0] : c?.analysis;
                                            const dec = String(analysis?.decision || '').toUpperCase();
                                            return dec === 'SHORTLISTED' || dec === 'SELECTED' || dec === 'HIRE' || dec === 'REJECTED';
                                          })
                                           ? 'Auto-Generating CEO Report...'
                                           : 'Awaiting Candidate Analysis'}
                                       </h4>
                                       <p className="text-[11px] text-[#444] font-bold uppercase tracking-widest max-w-none w-full mx-auto leading-relaxed text-center">
                                         {allHRData.length > 0
                                           ? 'AI has analyzed candidates but none are flagged as "Shortlisted" yet. You can manually generate a report for all analyzed talent.'
                                           : 'Add candidates in the Data tab. AI will auto-analyze and generate this report.'}
                                       </p>
                                     </div>
                                     
                                     {allHRData.length > 0 && !isGeneratingReport && (
                                       <button 
                                         onClick={() => generateHRReport(true)}
                                         className="px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-xl active:scale-95"
                                       >
                                         ⚡ Force Generate Report
                                       </button>
                                     )}

                                     <div className="flex gap-2">
                                       {[0,1,2,3].map(i => (
                                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500/40 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                                       ))}
                                     </div>
                                  </div>
                               ) : (
                                 <div className="w-full min-w-0 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] xl:rounded-[3rem] overflow-hidden shadow-2xl relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                                    
                                    {/* Report Header */}
                                    <div className="w-full min-w-0 border-b border-[#1a1a1a] bg-[#0a0a0a] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                       <div className="flex min-w-0 w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-5 md:gap-6">
                                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-2xl shadow-inner sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl">
                                            📈
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <h4 className="text-balance text-lg font-black uppercase leading-tight tracking-tight text-white sm:text-xl md:text-2xl lg:text-3xl xl:text-[1.65rem] 2xl:text-3xl">
                                              CEO STRATEGIC TALENT REPORT
                                            </h4>
                                            <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-purple-500 sm:text-[10px] sm:tracking-widest">
                                              AI-Driven Organizational Intelligence
                                            </p>
                                          </div>
                                       </div>
                                       <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 lg:w-auto lg:shrink-0">
                                         <button 
                                           type="button"
                                           onClick={() => window.print()}
                                           className="w-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white transition-all border border-white/10 bg-white/5 rounded-lg hover:bg-white/10 sm:w-auto sm:rounded-xl sm:px-6 sm:text-[10px]"
                                         >
                                           Download PDF
                                         </button>
                                         <button 
                                           type="button"
                                           onClick={() => generateHRReport()}
                                           className="w-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-purple-400 transition-all border border-purple-500/20 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 sm:w-auto sm:rounded-xl sm:px-6 sm:text-[10px]"
                                         >
                                           Regenerate
                                         </button>
                                       </div>
                                    </div>

                                    {/* Talent Dashboard Stats */}
                                    <div className="grid w-full min-w-0 grid-cols-1 gap-4 bg-[#080808]/50 px-4 py-6 border-b border-[#1a1a1a] sm:gap-5 sm:px-6 sm:py-7 md:grid-cols-3 md:gap-6 md:px-8 lg:px-10 lg:py-8">
                                       <div className="space-y-2 rounded-2xl border border-purple-500/10 bg-purple-500/5 p-4 sm:rounded-3xl sm:p-5 md:rounded-[2rem] md:p-6">
                                          <p className="text-[8px] font-black uppercase tracking-widest text-purple-400 sm:text-[9px]">Total Shortlisted</p>
                                          <p className="text-3xl font-black italic tracking-tighter text-white sm:text-4xl">{hrReport.shortlisted_candidates?.length || 0}</p>
                                       </div>
                                       <div className="space-y-2 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 sm:rounded-3xl sm:p-5 md:rounded-[2rem] md:p-6">
                                          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400 sm:text-[9px]">Avg Match Score</p>
                                          <p className="text-3xl font-black italic tracking-tighter text-white sm:text-4xl">
                                            {Math.round(hrReport.shortlisted_candidates?.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / (hrReport.shortlisted_candidates?.length || 1))}%
                                          </p>
                                       </div>
                                       <div className="space-y-2 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 sm:rounded-3xl sm:p-5 md:rounded-[2rem] md:p-6">
                                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 sm:text-[9px]">Top Discipline</p>
                                          <p className="text-xl font-black uppercase leading-tight tracking-tighter text-white sm:text-2xl md:text-3xl lg:text-4xl break-words">
                                            {inferDiscipline(hrReport.shortlisted_candidates?.[0])}
                                          </p>
                                       </div>
                                    </div>

                                    {/* Email Content */}
                                    <div className="w-full min-w-0 space-y-6 p-4 sm:space-y-7 sm:p-6 md:space-y-8 md:p-8 lg:p-10">
                                       <div className="space-y-3 sm:space-y-4">
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] sm:text-[11px] sm:tracking-[0.3em]">Subject Line</p>
                                          <div className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-4 sm:rounded-2xl sm:p-5 md:p-6">
                                             <p className="text-base font-bold tracking-tight text-white sm:text-lg">{hrReport.subject}</p>
                                          </div>
                                       </div>

                                       <div className="space-y-3 sm:space-y-4">
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] sm:text-[11px] sm:tracking-[0.3em]">Email Preview</p>
                                          <div className="relative rounded-2xl border border-[#1a1a1a] bg-[#080808] p-4 pt-10 sm:rounded-3xl sm:p-6 sm:pt-12 md:p-8">
                                             <div className="absolute right-3 top-3 text-[8px] font-black uppercase tracking-widest text-[#222] sm:right-6 sm:top-6 sm:text-[9px]">Confidential / AI Output</div>
                                             <div className="text-xs font-medium leading-relaxed text-slate-300 whitespace-pre-wrap sm:text-sm sm:leading-[1.8]">
                                               {hrReport.email_body}
                                             </div>
                                          </div>
                                       </div>

                                       <div className="space-y-3 sm:space-y-4">
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] sm:text-[11px] sm:tracking-[0.3em]">Shortlisted Candidates Breakdown</p>
                                          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                                            {hrReport.shortlisted_candidates?.map((c: any) => (
                                              <div key={c.id} className="group/card flex flex-col gap-4 rounded-xl border border-[#1a1a1a] bg-[#080808] p-4 transition-all hover:border-purple-500/30 sm:rounded-2xl sm:p-5 md:p-6">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-bold tracking-tight text-white">{c.name}</p>
                                                    <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-purple-500 sm:text-[9px]">{formatShortlistedCardRole(c)}</p>
                                                  </div>
                                                  <div className="flex flex-col items-start sm:items-end shrink-0">
                                                    <span className="text-lg font-black text-white sm:text-xl">{c.score}%</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#333]">Match Score</span>
                                                  </div>
                                                </div>
                                                <div className="space-y-2">
                                                  <p className="text-[9px] font-black text-[#333] uppercase tracking-widest">Key Strengths</p>
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {c.strengths?.slice(0, 3).map((s: string) => (
                                                      <span key={s} className="px-2 py-0.5 bg-purple-500/5 border border-purple-500/10 rounded text-[8px] font-bold text-purple-400 uppercase">{s}</span>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                       </div>

                                       {/* Strategic Roadmap */}
                                       {hrReport.details?.roadmap && (
                                         <div className="space-y-3 sm:space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] sm:text-[11px] sm:tracking-[0.3em]">Strategic Roadmap</p>
                                            <div className="space-y-3 rounded-xl border border-purple-500/10 bg-purple-500/5 p-4 sm:space-y-4 sm:rounded-2xl sm:p-6">
                                              {hrReport.details.roadmap.map((step: string, i: number) => (
                                                <div key={i} className="flex gap-4 items-start">
                                                  <span className="w-5 h-5 bg-purple-500/10 rounded-lg flex items-center justify-center text-[10px] font-black text-purple-500 border border-purple-500/20">{i+1}</span>
                                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{step}</p>
                                                </div>
                                              ))}
                                            </div>
                                         </div>
                                       )}

                                       {/* Action Buttons */}
                                       <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4 sm:pt-6">
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const mailto = `mailto:ceo@company.com?subject=${encodeURIComponent(hrReport.subject)}&body=${encodeURIComponent(hrReport.email_body)}`;
                                              window.location.href = mailto;
                                            }}
                                            className="w-full flex-1 rounded-xl bg-white py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.98] sm:rounded-2xl sm:py-5 sm:text-xs sm:tracking-[0.3em]"
                                          >
                                            🚀 Send to CEO Now
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${hrReport.subject}\n\n${hrReport.email_body}`);
                                              addToast('✅ Copied to clipboard', 'success');
                                            }}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 sm:w-auto sm:px-10 sm:py-5 sm:rounded-2xl sm:text-[10px]"
                                          >
                                            Copy Email
                                          </button>
                                       </div>
                                    </div>

                                    <div className="flex flex-col gap-2 border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4 md:px-8 lg:px-10">
                                       <p className="text-[8px] font-bold uppercase tracking-widest text-[#333] sm:text-[9px]">Generated by AI HR Agent • {new Date(hrReport.created_at).toLocaleString()}</p>
                                       <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500/50 sm:text-[9px]">Encrypted & Stored</p>
                                    </div>
                                 </div>
                               )}
                            </div>
                          );
                        } else if (selectedDept === 'Marketing') {
                          const viralReady = allMarketingData.filter(p => p.marketing_analysis?.length > 0);
                          return (
                            <div className="w-full space-y-8">
                               {/* General Marketing Strategy (Always Visible) */}
                               <div className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-6 sm:p-8 rounded-[2rem] hover:border-pink-500/30 transition-all space-y-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-6 items-center">
                                      <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-pink-500/20">
                                        📣
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-bold text-white tracking-tight">Growth & distribution playbook</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 mt-1">Short-form creative · Channel fit · Audience signals</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setSelectedRoadmap({
                                          title: 'Growth & distribution playbook',
                                          dept: 'Marketing',
                                          content: {
                                            objective: 'Turn consistent creative output into measurable pipeline—by pairing crisp hooks with proof, and aligning every post to one revenue story.',
                                            steps: [
                                              'Establish three repeatable hook formats grounded in customer language and proof points.',
                                              'Publish on a steady weekly rhythm with creative refreshes tied to performance, not guesswork.',
                                              'Route high-intent comments and DMs to a single, fast follow-up experience your team can sustain.',
                                              'Review saves, shares, and site sessions weekly to decide what gets another week—and what graduates to paid.'
                                            ],
                                            roi: 'Higher-quality attention, faster learning cycles, and clearer attribution from social to signups.',
                                            resources: 'Creative templates, lightweight analytics, and one owner who keeps the calendar honest.'
                                          }
                                        });
                                        setShowRoadmapModal(true);
                                      }}
                                      className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-pink-500 hover:border-pink-500 transition-all flex items-center gap-2 relative z-50"
                                    >
                                      <span>📊</span> Generate Detailed Report
                                    </button>
                                  </div>
                                  <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] min-w-0">
                                        <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-4">Hooks that land</p>
                                        <ul className="space-y-3">
                                          <li className="text-xs text-slate-300 font-medium">• Lead with a sharp tension: what changed, why it matters, what to do next.</li>
                                          <li className="text-xs text-slate-300 font-medium">• Pair a bold claim with one credible proof point customers can verify fast.</li>
                                        </ul>
                                     </div>
                                     <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] min-w-0">
                                        <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-4">Where to show up</p>
                                        <ul className="space-y-3">
                                          <li className="text-xs text-slate-300 font-medium">• Short-form for discovery; keep one flagship CTA that maps to a real business outcome.</li>
                                          <li className="text-xs text-slate-300 font-medium">• Long-form for depth—threads and posts that teach, then invite the next step.</li>
                                        </ul>
                                     </div>
                                  </div>
                               </div>
                               {/* Viral Ready Profile Ideas */}
                               {viralReady.map(profile => {
                                 const analysis = Array.isArray(profile.marketing_analysis)
                                   ? profile.marketing_analysis[0]
                                   : null;
                                 if (!analysis) return null;
                                 const mailtoLink = `mailto:ceo@company.com?subject=Marketing Opportunity: ${encodeURIComponent(profile.handle_name)}&body=${encodeURIComponent(`Hi CEO,\n\nHere’s a concise read on ${profile.handle_name} (${profile.platform})—strong signals for the next creative sprint.\n\nSummary:\n${analysis.summary || analysis.reason || 'Summary available in the dashboard.'}\n\nStrengths:\n${(analysis.pros || []).map((p:string) => '- ' + p).join('\n') || '- See dashboard for highlights'}\n\nDirection:\n${analysis.content_ideas || 'Creative direction is outlined in the workspace—happy to walk through options.'}\n\nIf you want, we can align budget and timeline next week.\n\nBest,\nMarketing`)}`;

                                 return (
                                   <div key={profile.id} className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-6 sm:p-8 rounded-[2rem] border-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.05)] space-y-6">
                                      <div className="flex justify-between items-start">
                                        <div className="flex gap-6 items-center">
                                          <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-pink-500/20">
                                            🚀
                                          </div>
                                          <div>
                                            <h4 className="text-xl font-bold text-white tracking-tight">{profile.handle_name} Strategy</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 mt-1">{profile.platform} · {profile.followers}</p>
                                          </div>
                                        </div>
                                        <a href={mailtoLink} className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-pink-500 hover:text-white transition-all shadow-xl flex items-center gap-2">
                                          <span>✉️</span> Send Pitch to CEO
                                        </a>
                                      </div>
                                      <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] space-y-4">
                                         <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"/> Content direction
                                         </p>
                                         <p className="text-sm text-slate-300 leading-relaxed font-medium">{analysis.content_ideas || analysis.summary}</p>
                                      </div>
                                   </div>
                                 );
                               })}
                            </div>
                          );
                        } else if (selectedDept === 'Sales') {
                          const latestSales = allSalesData[0];
                          
                          return (
                            <div className="w-full space-y-8">
                               <div className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-6 sm:p-8 rounded-[2rem] hover:border-emerald-500/30 transition-all space-y-6">
                                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                                    <div className="flex gap-6 items-center min-w-0">
                                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-500/20 shrink-0">
                                        💰
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xl font-bold text-white tracking-tight">Revenue motion blueprint</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Pipeline clarity · Message-market fit · Follow-through</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setSelectedRoadmap({
                                          title: 'Revenue motion blueprint',
                                          dept: 'Sales',
                                          content: {
                                            objective: 'Build a repeatable path from first touch to qualified conversation—grounded in clear ICP, crisp proof, and a follow-up rhythm your team can sustain.',
                                            steps: [
                                              'Define your best-fit accounts and the one outcome you want every conversation to advance.',
                                              'Shape outreach around customer language, proof, and a single CTA that maps to your funnel.',
                                              'Use short discovery calls to qualify fit fast—then send tailored follow-ups within 24 hours.',
                                              'Keep CRM hygiene lightweight: stages, next steps, and reasons win or lose—so forecasts stay honest.'
                                            ],
                                            roi: 'More qualified conversations, shorter sales cycles, and cleaner forecasting without adding headcount noise.',
                                            resources: 'A tight ICP doc, a message library, CRM discipline, and weekly pipeline review.'
                                          }
                                        });
                                        setShowRoadmapModal(true);
                                      }}
                                      className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:border-emerald-500 transition-all flex items-center gap-2 relative z-50"
                                    >
                                      <span>💹</span> Generate Detailed Report
                                    </button>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-2">Core Sales Logic</p>
                                     <p className="text-sm text-slate-300 leading-relaxed font-medium">Meet buyers where decisions are made: lead with outcomes, show the math, and make the next step obvious. Proof beats pitch every time.</p>
                                  </div>
                               </div>

                               {latestSales && (
                                 <div className="w-full bg-[#0f0f0f] border border-emerald-500/20 p-6 sm:p-8 rounded-[2rem] shadow-[0_0_20px_rgba(16,185,129,0.05)] space-y-6">
                                    <div className="flex justify-between items-start">
                                      <div className="flex gap-6 items-center">
                                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-500/20">
                                          💸
                                        </div>
                                        <div>
                                          <h4 className="text-xl font-bold text-white tracking-tight">Active Sales Strategy</h4>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Lead Generation & Outreach</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                       <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">Strategic Roadmap</p>
                                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{latestSales.strategy}</p>
                                       </div>
                                    </div>
                                 </div>
                               )}
                            </div>
                          );
                        } else if (selectedDept === 'Operations') {
                          const latestOps = allOpsData[0];
                          
                          return (
                            <div className="w-full space-y-8">
                               <div className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-6 sm:p-8 rounded-[2rem] hover:border-blue-500/30 transition-all space-y-6">
                                  <div className="flex gap-6 items-center min-w-0">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-500/20 shrink-0">
                                      ⚖️
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xl font-bold text-white tracking-tight">Operational Excellence Framework</h4>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Global Process Optimization</p>
                                    </div>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-2">Efficiency Thesis</p>
                                     <p className="text-sm text-slate-300 leading-relaxed font-medium">Great operations isn’t more tools—it’s fewer handoffs, clearer ownership, and dashboards people actually trust. Tighten the loop between work shipped and outcomes measured.</p>
                                  </div>
                               </div>

                               {latestOps && (
                                 <div className="w-full bg-[#0f0f0f] border border-blue-500/20 p-6 sm:p-8 rounded-[2rem] shadow-[0_0_20px_rgba(59,130,246,0.05)] space-y-6">
                                    <div className="flex justify-between items-start">
                                      <div className="flex gap-6 items-center">
                                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-500/20">
                                          ⚙️
                                        </div>
                                        <div>
                                          <h4 className="text-xl font-bold text-white tracking-tight">Active Ops Roadmap</h4>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Optimization Steps</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                       <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Execution Pipeline</p>
                                       <p className="text-sm text-slate-300 leading-relaxed font-medium">{(latestOps.execution_steps || []).join(', ')}</p>
                                    </div>
                                 </div>
                               )}
                            </div>
                          );
                         } else if (selectedDept === 'Finance') {
                          return (
                            <div className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-6 sm:p-8 rounded-[2rem] hover:border-amber-500/30 transition-all space-y-6">
                               <div className="flex gap-6 items-center min-w-0">
                                 <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-amber-500/20 shrink-0">
                                   💰
                                 </div>
                                 <div className="min-w-0">
                                   <h4 className="text-xl font-bold text-white tracking-tight">Financial clarity playbook</h4>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mt-1">Cash discipline · Revenue resilience · Forecast confidence</p>
                                 </div>
                               </div>
                               <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] min-w-0">
                                     <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4">Revenue levers</p>
                                     <ul className="space-y-2">
                                       <li className="text-[11px] text-slate-300">• Friendly, timely reminders that recover revenue without sounding robotic.</li>
                                       <li className="text-[11px] text-slate-300">• Packaging and pricing tests aligned to value—so expansion feels natural, not forced.</li>
                                     </ul>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] min-w-0">
                                     <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4">Operational edge</p>
                                     <ul className="space-y-2">
                                       <li className="text-[11px] text-slate-300">• Cleaner spend visibility—categories your finance team can trust at month-end.</li>
                                       <li className="text-[11px] text-slate-300">• Forward-looking cash views so leadership can act early, not react late.</li>
                                     </ul>
                                  </div>
                               </div>
                            </div>
                          );
                         }
                        return (
                          <div className="p-10 text-center text-[#555] italic bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2rem]">
                            Select a department to view strategic ideas.
                          </div>
                        );
                     })()}
                     </div>
                     )}
                  </div>
                )}
              </>
            </div>
            </div>
          </div>

          <div className="w-[400px] bg-[#0a0a0a] border-l border-[#1a1a1a] p-10 flex flex-col justify-between hidden xl:flex">
             <div className="space-y-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#333]">Chat with {selectedDept}</h3>
                <div className="space-y-6">
                   <div className="p-5 bg-[#111] rounded-2xl text-[11px] text-[#888] leading-relaxed border border-white/5 italic">
                      {deptInsightsBlocked
                        ? `Your latest ${selectedDept.toLowerCase()} run is still processing. I will stay in sync with results and can help interpret them the moment this job completes.`
                        : `I have analyzed the current ${selectedDept.toLowerCase()} data. Ask for a tight summary, risks, or next actions and I will anchor answers in what is on file.`}
                   </div>
                </div>
             </div>
             <div className="relative">
                <input className="w-full h-14 bg-black border border-[#1a1a1a] rounded-2xl px-5 text-sm outline-none focus:border-orange-500/50" placeholder="Type a message..." />
                <button className="absolute right-4 top-4 text-xs font-bold text-orange-500">Send</button>
             </div>
          </div>
        </div>
      )}

      {/* --- Roadmap Detail Modal --- */}
      {showRoadmapModal && selectedRoadmap && (
        <Modal 
          isOpen={showRoadmapModal} 
          onClose={() => setShowRoadmapModal(false)}
          title={selectedRoadmap.title}
        >
          <div className="p-2 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/5 text-[#555] text-[10px] font-black uppercase tracking-[0.2em] rounded-md border border-white/5">{selectedRoadmap.dept}</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Deep Analysis Active</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-3">Primary Objective</p>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{selectedRoadmap.content.objective}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3">Expected ROI</p>
                    <p className="text-sm text-emerald-400 font-black tracking-tight">{selectedRoadmap.content.roi}</p>
                  </div>
               </div>

               <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-6">
                  <p className="text-[9px] font-black text-[#555] uppercase tracking-widest">Execution Steps</p>
                  <div className="space-y-4">
                    {selectedRoadmap.content.steps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <span className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#555] border border-white/5 group-hover:text-white group-hover:border-white/20 transition-all">{i+1}</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium group-hover:text-slate-200">{step}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <p className="text-[9px] font-black text-[#444] uppercase tracking-widest">Required Resources:</p>
                  <span className="px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-bold rounded-xl border border-white/5">{selectedRoadmap.content.resources}</span>
               </div>
               <button 
                onClick={() => {
                  addToast('Report generated & sent to CEO dashboard', 'success');
                  setShowRoadmapModal(false);
                }}
                className="px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
               >
                 Approve for Execution
               </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        body { background-color: #050505; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>

      
      {/* Plan Modal */}
      <PlanModal 
        isOpen={showPlanModal} 
        onClose={() => setShowPlanModal(false)} 
        onPlanCreated={() => {
          refetchTasks();
        }}
      />

      {/* AI Analysis Modal (Dynamic for all depts) */}
      <AIAnalysisModal 
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        taskId={selectedTaskForAnalysis?.id || null}
        department={selectedTaskForAnalysis?.dept || ''}
        taskTitle={selectedTaskForAnalysis?.title || ''}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
