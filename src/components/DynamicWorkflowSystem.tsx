'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import Modal from './Modal';
import { ToastContainer, useToast } from './Toast';
import TaskQueue from './TaskQueue';
import CandidateEvaluationModal from './CandidateEvaluationModal';
import PlanModal from './PlanModal';
import TaskCard from './TaskCard';
import AIAnalysisModal from './AIAnalysisModal';
import CandidatesTab from './CandidatesTab';
import MarketingTab from './MarketingTab';
import SalesTab from './SalesTab';
export type Department = 'HR' | 'Sales' | 'Finance' | 'Marketing' | 'Developer' | 'Operations';
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

const DEPARTMENTS: Department[] = ['HR', 'Sales', 'Finance', 'Operations', 'Marketing', 'Developer'];

const AGENT_SPECIFICS = {
  HR: {
    tabName: 'Candidates',
    stats: ['Match%', 'Exp', 'Score'],
    items: [
      { id: '1', title: 'John Doe - Principal AI Architect', date: '04 May', priority: 'HIGH', stat1: '98%', stat2: '12y', stat3: '94' },
      { id: '2', title: 'Jane Smith - Senior Product Designer', date: '03 May', priority: 'MED', stat1: '85%', stat2: '8y', stat3: '88' }
    ],
    insights: 'Talent pool shows 15% increase in cross-functional AI expertise. Top candidates prioritize remote-first autonomy.',
    results: [
      { type: 'CANDIDATE', priority: 'HIGH', title: 'John Doe (Principal AI Architect)', desc: 'Expertise in RAG and agentic workflows.', meta: 'Matches technical depth + leadership scaling.' }
    ],
    badge: 'bg-purple-500/10 text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    text: 'text-purple-400',
    icon: '👥',
    subtitle: 'Team management, performance, tasks'
  },
  Sales: {
    tabName: 'Leads',
    stats: ['Potential', 'Value', 'Score'],
    items: [
      { id: '1', title: 'Tesla Inc. - Autonomous Fleet Project', date: '02 May', priority: 'HIGH', stat1: '9.2', stat2: '$450K', stat3: '95' },
      { id: '2', title: 'Groq - Neural Dashboard Integration', date: '01 May', priority: 'HIGH', stat1: '8.8', stat2: '$1.2M', stat3: '92' }
    ],
    insights: 'Enterprise accounts responding 40% faster to value-driven automation narratives than cost-saving proposals.',
    results: [
      { type: 'LEAD', priority: 'HIGH', title: 'Tesla Inc. (Operations Dept)', desc: 'Decision maker engaged with whitepaper.', meta: 'Direct ROI alignment.' }
    ],
    badge: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    text: 'text-emerald-400',
    icon: '🔥',
    subtitle: 'Leads pipeline, proposals, deal tracking'
  },
  Finance: {
    tabName: 'Invoices',
    stats: ['Amount', 'Overdue', 'Risk'],
    items: [
      { id: '1', title: 'Invoice #8842 - AWS Infrastructure', date: '28 Apr', priority: 'HIGH', stat1: '$12.4K', stat2: '14d', stat3: '9.4' },
      { id: '2', title: 'Invoice #8839 - NVIDIA H100 Cluster', date: '25 Apr', priority: 'LOW', stat1: '$840K', stat2: '2d', stat3: '1.2' }
    ],
    insights: 'Late payments trending up in SaaS sector. Automated reminder sequences reducing DPO by 12 days.',
    results: [
      { type: 'INVOICE', priority: 'HIGH', title: 'Amazon Web Services ($12,400)', desc: 'Payment overdue. Autonomous recovery active.', meta: 'Persistence + polite escalation formula.' }
    ],
    badge: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    text: 'text-amber-400',
    icon: '💰',
    subtitle: 'Invoices, expenses, revenue tracking'
  },
  Marketing: {
    tabName: 'Reels',
    stats: ['Views', 'Likes', 'Comm'],
    items: [
      { id: '1', title: 'Maine Claude ko apna business assistant bana diya...', date: '24 Apr', priority: 'LOW', stat1: '8.1K', stat2: '0.1K', stat3: '162' },
      { id: '2', title: 'Llama 3.3 just dropped on Groq. 💥 Most powerful...', date: '24 Apr', priority: 'LOW', stat1: '10.7K', stat2: '0.2K', stat3: '3' }
    ],
    insights: 'Top-performing reels (560K+ views) focus on tangible workflow replacements and data-driven results.',
    results: [
      { type: 'RESULTS', priority: 'HIGH', title: '"I stopped manually responding to DMs..."', desc: 'Handling customer service at scale with proof.', meta: 'Workflow replacement + quantifiable output formula.' }
    ],
    badge: 'bg-pink-500/10 text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.1)]',
    text: 'text-pink-400',
    icon: '📣',
    subtitle: 'Instagram, content strategy, growth'
  },
  Developer: {
    tabName: 'Commits',
    stats: ['Changes', 'Files', 'Tests'],
    items: [],
    insights: 'Code generation agents are reducing boilerplate time by 60%.',
    results: [],
    badge: 'bg-cyan-500/10 text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.1)]',
    text: 'text-cyan-400',
    icon: '💻',
    subtitle: 'Code, tools, builds, technical tasks'
  },
  Operations: {
    tabName: 'Deployments',
    stats: ['Uptime', 'Errors', 'Latency'],
    items: [],
    insights: 'System stability remains at 99.99%. Cloud costs optimized by 15%.',
    results: [],
    badge: 'bg-blue-500/10 text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    text: 'text-blue-400',
    icon: '⚙️',
    subtitle: 'Projects, deadlines, client delivery'
  }
};

export default function NeuralWorkflowSystem() {
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Data' | 'Ideas'>('Overview');
  const [runningDepts, setRunningDepts] = useState<Set<string>>(new Set());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [marketingProfiles, setMarketingProfiles] = useState<any[]>([
    {
      id: 'mock-1',
      handle_name: 'AI Automation saves 100 hours',
      platform: 'Instagram Reels',
      followers: '1.2M',
      likes: '145K',
      bio: 'Hook: "Stop doing this manually." Visuals: Quick screen recording of Zapier. High engagement due to actionable tip.',
      marketing_analysis: []
    }
  ]);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [selectedTaskForAnalysis, setSelectedTaskForAnalysis] = useState<{id: string, title: string, dept: string} | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string, name: string } | null>(null);
  const [salesInsights, setSalesInsights] = useState<any[]>([]);
  const [opsInsights, setOpsInsights] = useState<any[]>([]);
  const [financeInsights, setFinanceInsights] = useState<any[]>([]);
  const [devInsights, setDevInsights] = useState<any[]>([]);
  const [hrReport, setHrReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<{title: string, dept: string, content: any} | null>(null);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const fetchHRReport = async () => {
    try {
      const res = await fetch('/api/hr/report/generate');
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
      const res = await fetch('/api/hr/report/generate', { 
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

  const handleApproveAll = async () => {
    const loadingId = addToast('🚀 Initializing all department workers...', 'loading');
    try {
      const res = await fetch('/api/tasks/approve', { method: 'POST' });
      if (!res.ok) throw new Error('Approval failed');
      const data = await res.json();
      removeToast(loadingId);
      addToast(`✅ ${data.message}`, 'success');
      fetchTasks(); // Refresh local list
    } catch (err) {
      removeToast(loadingId);
      console.error('Approve all error:', err);
      addToast('❌ Global approval failed', 'error');
    }
  };
  
  // Tasks Queue State
  const [tasks, setTasks] = useState<any[]>([]);
  const [connectedTasks, setConnectedTasks] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const completedDepts = React.useMemo(() => {
    const depts = new Set<string>();
    [...tasks, ...connectedTasks].forEach(t => {
      if (t.status?.toUpperCase() === 'COMPLETED' || t.status?.toUpperCase() === 'SUCCESS') {
        depts.add(t.department);
      }
    });
    if (candidates.some(c => c.candidate_analysis?.length > 0)) depts.add('HR');
    if (marketingProfiles.some(p => p.marketing_analysis?.length > 0)) depts.add('Marketing');
    if (salesInsights.length > 0) depts.add('Sales');
    if (opsInsights.length > 0) depts.add('Operations');
    if (financeInsights.length > 0) depts.add('Finance');
    if (devInsights.length > 0) depts.add('Developer');
    return depts;
  }, [tasks, connectedTasks, candidates, marketingProfiles, salesInsights, opsInsights]);

  const fetchTasks = useCallback(async () => {
    try {
      // Fetch manual tasks
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }

      // Fetch automated connected tasks
      const { data: cData, error } = await supabase
        .from('connected_tasks')
        .select('*');
      if (!error && cData) {
        setConnectedTasks(cData);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  useEffect(() => { 
    fetchTasks();

    // 1. Listen for manual tasks
    const taskChannel = supabase.channel('dashboard_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();

    // 2. Listen for automated connected tasks
    const connectedChannel = supabase.channel('dashboard_connected')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_tasks' }, fetchTasks)
      .subscribe();

    // 3. Listen for HR Applications & Analysis (Autonomous UI Refreshes)
    const hrChannel = supabase.channel('dashboard_hr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        console.log('🔄 Application updated, refreshing radar...');
        fetchCandidates();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_analysis' }, () => {
        console.log('🔬 Analysis complete, updating candidate cards...');
        fetchCandidates();
        fetchHRReport(); // Auto-refresh report if something was analyzed
      })
      .subscribe();

    if (selectedDept === 'HR') {
      fetchCandidates();
      fetchHRReport();
    }
    if (selectedDept === 'Marketing') {
      fetchMarketingProfiles();
    }
    if (selectedDept === 'Sales') {
      fetchSalesInsights();
    }
    if (selectedDept === 'Operations') {
      fetchOpsInsights();
    }
    if (selectedDept === 'Finance') {
      fetchFinanceInsights();
    }
    if (selectedDept === 'Developer') {
      fetchDevInsights();
    }

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(connectedChannel);
      supabase.removeChannel(hrChannel);
    };
  // Remove activeTab from deps — tab switching should NOT re-fetch candidates
  }, [fetchTasks, selectedDept]);

  // AUTO-GENERATE CEO REPORT: fires when HR Ideas tab is open and analyzed candidates exist
  useEffect(() => {
    if (selectedDept !== 'HR' || activeTab !== 'Ideas') return;
    if (isGeneratingReport || hrReport) return;
    
    const analyzedCount = candidates.filter(c => c.candidate_analysis && c.candidate_analysis.length > 0).length;

    if (analyzedCount > 0) {
      generateHRReport(true); // Force generation since we have analyzed candidates
    }
  }, [selectedDept, activeTab, candidates, hrReport, isGeneratingReport]);


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

  const fetchMarketingProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*, marketing_insights(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMarketingProfiles(data || []);
    } catch (err) {
      console.error('Failed to fetch marketing profiles:', err);
    }
  };

  const fetchSalesInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_insights')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSalesInsights(data || []);
    } catch (err: any) {
      console.error('Failed to fetch sales insights:', err.message || err);
    }
  };

  const fetchOpsInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('ops_insights')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched Ops Insights:', data);
      setOpsInsights(data || []);
    } catch (err: any) {
      console.error('Failed to fetch ops insights:', err.message || err);
    }
  };

  const fetchFinanceInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_insights')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFinanceInsights(data || []);
    } catch (err: any) {
      console.error('Failed to fetch finance insights:', err.message || err);
    }
  };

  const fetchDevInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('dev_insights')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDevInsights(data || []);
    } catch (err: any) {
      console.error('Failed to fetch dev insights:', err.message || err);
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
      const res = await fetch('/api/tasks/execute', { // Reusing execute or creating new?
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
      const aiRes = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (!aiRes.ok) throw new Error('AI assignment failed');
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);

      // Default to Engineering if Developer is requested by AI fallback
      let mappedDept = aiData.department as Department;
      if (mappedDept as any === 'Engineering') mappedDept = 'Developer';
      if (!DEPARTMENTS.includes(mappedDept)) mappedDept = 'Operations';

      const saveRes = await fetch('/api/tasks', {
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

      setTasks(prev => [newTask, ...prev]);
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
      const response = await fetch(`/api/workflow/${dept.toLowerCase()}/run`, { method: 'POST' });
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
    const allTasks = [...tasks, ...connectedTasks].filter(t => t.department === dept);
    if (allTasks.length === 0) return null;
    // Sort by created_at descending and pick the first
    return allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d1d1] font-sans p-6 overflow-x-hidden selection:bg-orange-500/30">
      <header className="max-w-[1400px] mx-auto flex items-center justify-between mb-8 px-4">
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

      <main className="max-w-[1400px] mx-auto space-y-10 pb-24">
        
        {/* CEO CONTROL AGENT HERO */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[100px] -mr-32 -mt-32" />
          <div className="w-32 h-32 bg-[#1a1a1a] rounded-3xl flex items-center justify-center relative border border-white/5 shadow-2xl">
             <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 via-orange-500 to-yellow-500 rounded-full animate-pulse blur-sm opacity-50" />
             <span className="absolute text-4xl">🧠</span>
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">CEO Control Agent</h2>
            <p className="text-sm text-[#888] font-medium uppercase tracking-widest">Autonomous Orchestration · Global Scaling</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button 
                onClick={handleApproveAll}
                className="px-8 py-3 bg-white text-black text-[10px] font-black rounded-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                Approve & Initialize All
              </button>
            </div>
          </div>
        </section>

        {/* --- Task Queue Integration --- */}
        <TaskQueue />

        {/* --- Department Agents Grid --- */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] px-2">Department Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPARTMENTS.map(dept => {
              const config = AGENT_SPECIFICS[dept];
              const activeTask = getActiveTaskForDept(dept);
              const status = activeTask?.status?.toLowerCase() || 'idle';
              
              const isWorking = runningDepts.has(dept) || status === 'running' || status === 'working';
              const isWaiting = (status === 'waiting_for_ceo' || status === 'pending') && !isWorking;
              const isDone = status === 'completed' || status === 'success' || (activeTask?.progress === 100);

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
                      <span className="text-yellow-400 leading-relaxed animate-pulse">Running autonomous mission for {dept} department...</span>
                    ) : isDone ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-[8px] font-black text-black rounded uppercase tracking-tighter shadow-lg">Success</span>
                          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Successfully Completed</span>
                        </div>
                        <p className="text-emerald-400/80 leading-relaxed italic line-clamp-2">
                          {activeTask?.description || 'Mission objectives achieved successfully.'}
                        </p>
                      </div>
                    ) : activeTask ? (
                      <span className="text-orange-400 leading-relaxed">{activeTask.description || `Task: ${activeTask.title}`}</span>
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
          <div className="flex-1 bg-[#050505] overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12">
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

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <>
                    {activeTab === 'Overview' && (
                  <div className="space-y-10">
                    {(() => {
                      let analysis: any = null;

                      if (selectedDept === 'HR') {
                        // For HR, override the generic task overview with the latest Shortlisted candidate's deep AI insights
                        const latestShortlisted = candidates.filter(c => {
                          const dec = c.candidate_analysis?.[0]?.decision?.toUpperCase();
                          return dec === 'SHORTLISTED' || dec === 'SELECTED' || dec === 'HIRE';
                        })[0];
                        if (latestShortlisted) {
                          const details = latestShortlisted.candidate_analysis[0].details || {};
                          analysis = {
                            summary: `Candidate: ${latestShortlisted.name} - ${details.summary || latestShortlisted.candidate_analysis[0].reason}`,
                            strengths: details.pros || ['Strong technical background', 'Good communication skills'],
                            weaknesses: details.cons || ['Requires ramp-up time on specific internal tools'],
                            recommendations: [details.interview_plan || 'Proceed with technical interview immediately.']
                          };
                        } else {
                          // Fallback to generic task if no candidates are shortlisted yet
                          const latestTask = [...tasks, ...connectedTasks]
                            .filter(t => t.department === selectedDept)
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                          analysis = latestTask?.analysis;
                        }
                      } else if (selectedDept === 'Marketing') {
                        // For Marketing, override the generic task overview with the latest Analyzed profile
                        const latestAnalyzed = marketingProfiles.filter(p => p.marketing_analysis?.length > 0)[0];
                        if (latestAnalyzed) {
                          const analysisObj = latestAnalyzed.marketing_analysis[0];
                          analysis = {
                            summary: `Marketing Profile: ${latestAnalyzed.handle_name} (${latestAnalyzed.platform}) - ${analysisObj.summary || analysisObj.reason}`,
                            strengths: analysisObj.pros || ['Good engagement rate', 'Consistent posting'],
                            weaknesses: analysisObj.cons || ['Low follower growth', 'Needs more video content'],
                            recommendations: [analysisObj.content_ideas || 'Focus on viral short-form video.']
                          };
                        } else {
                          // Fallback to generic task
                          const latestTask = [...tasks, ...connectedTasks]
                            .filter(t => t.department === selectedDept)
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                          analysis = latestTask?.analysis;
                        }
                      } else if (selectedDept === 'Sales') {
                        const latestSales = salesInsights[0];
                        if (latestSales) {
                          analysis = {
                            summary: latestSales.overview,
                            strengths: [latestSales.target_customers],
                            weaknesses: ['Competitor saturation', 'Cold reach limits'],
                            recommendations: [latestSales.strategy]
                          };
                        }
                      } else if (selectedDept === 'Operations') {
                        const latestOps = opsInsights[0];
                        if (latestOps) {
                          analysis = {
                            summary: latestOps.summary,
                            strengths: latestOps.improvements || [],
                            weaknesses: latestOps.inefficiencies || [],
                            recommendations: latestOps.execution_steps || []
                          };
                        }
                      } else if (selectedDept === 'Finance') {
                        const latestFinance = financeInsights[0];
                        if (latestFinance) {
                          analysis = {
                            summary: latestFinance.summary,
                            strengths: latestFinance.highlights || [],
                            weaknesses: ['Budget constraints', 'High burn rate'],
                            recommendations: latestFinance.recommendations || []
                          };
                        }
                      } else if (selectedDept === 'Developer') {
                        const latestDev = devInsights[0];
                        if (latestDev) {
                          analysis = {
                            summary: latestDev.architecture_overview,
                            strengths: latestDev.tech_stack || [],
                            weaknesses: latestDev.vulnerabilities || [],
                            recommendations: [latestDev.scalability_plan]
                          };
                        }
                      } else {
                        // Generic department task overview
                        const latestTask = [...tasks, ...connectedTasks]
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
                            <p className="text-[#555] text-xs max-w-[300px] mx-auto uppercase tracking-widest font-black">Groq AI is currently auditing this department workflow. Results will stream in real-time.</p>
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
                              {(analysis.summary || analysis.final_summary || "Overview generated successfully.")
                                .split(/(?=Week \d:)/)
                                .map((segment: string, idx: number) => (
                                  <p key={idx} className="text-lg font-bold text-slate-100 leading-relaxed tracking-tight">
                                    {segment.trim()}
                                  </p>
                                ))
                              }
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
                               {(analysis.recommendations || [analysis.strategy_content]).map((item: string, i: number) => (
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
                  <CandidatesTab candidates={candidates} onRefresh={fetchCandidates} />
                )}

                {activeTab === 'Data' && selectedDept === 'Marketing' && (
                  <MarketingTab profiles={marketingProfiles} setProfiles={setMarketingProfiles} />
                )}

                {activeTab === 'Data' && selectedDept === 'Sales' && (
                  <SalesTab />
                )}



                {activeTab === 'Data' && selectedDept !== 'HR' && selectedDept !== 'Marketing' && selectedDept !== 'Sales' && (
                  <div className="space-y-10">
                    {/* Header */}
                    <div className="flex justify-between items-center px-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-[#444]">
                        {selectedDept === 'Operations' ? opsInsights.length : 
                         selectedDept === 'Finance' ? financeInsights.length : 
                         selectedDept === 'Developer' ? devInsights.length : 
                         (AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).items.length} {(AGENT_SPECIFICS[selectedDept as Department] as typeof AGENT_SPECIFICS['HR']).tabName.toUpperCase()} · STORED IN DB
                       </h3>
                       <button 
                        onClick={() => {
                          if (selectedDept === 'Operations') fetchOpsInsights();
                          if (selectedDept === 'Finance') fetchFinanceInsights();
                          if (selectedDept === 'Developer') fetchDevInsights();
                        }}
                        className="text-[10px] font-black text-[#555] uppercase tracking-widest hover:text-white transition-all underline underline-offset-4"
                       >
                         Refresh Feed
                       </button>
                    </div>

                    {/* Content List */}
                    <div className="space-y-4">
                      {/* 1. Show database insights if they exist */}
                      {selectedDept === 'Operations' && opsInsights.map((item: any) => (
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

                      {selectedDept === 'Finance' && financeInsights.map((item: any) => (
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

                      {selectedDept === 'Developer' && devInsights.map((item: any) => (
                        <div key={item.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-cyan-500/50 transition-all group">
                          <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-[#151515] border border-white/5 rounded-2xl flex items-center justify-center text-3xl">💻</div>
                            <div className="space-y-3">
                              <h4 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors">Architecture Roadmap: {new Date(item.created_at).toLocaleDateString()}</h4>
                              <p className="text-sm text-[#555] leading-relaxed line-clamp-2">{item.architecture_overview}</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.tech_stack?.map((tech: string) => (
                                  <span key={tech} className="px-2 py-1 bg-white/5 text-[#555] text-[8px] font-black rounded-md border border-white/5">{tech}</span>
                                ))}
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
                      {((selectedDept === 'Operations' && opsInsights.length === 0) ||
                        (selectedDept === 'Finance' && financeInsights.length === 0) ||
                        (selectedDept === 'Developer' && devInsights.length === 0)) &&
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
                  <div className="space-y-8">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#444]">AI Strategic Ideas</h3>
                     </div>
                     <div className="grid gap-6">
                     {(() => {
                         if (selectedDept === 'HR') {
                          return (
                            <div className="space-y-10 animate-in fade-in duration-700">
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
                                         {candidates.some(c => {
                                            const dec = c.candidate_analysis?.[0]?.decision?.toUpperCase();
                                            return dec === 'SHORTLISTED' || dec === 'SELECTED' || dec === 'HIRE';
                                          })
                                           ? 'Auto-Generating CEO Report...'
                                           : 'Awaiting Candidate Analysis'}
                                       </h4>
                                       <p className="text-[11px] text-[#444] font-bold uppercase tracking-widest max-w-[400px] mx-auto leading-relaxed">
                                         {candidates.length > 0
                                           ? 'AI has analyzed candidates but none are flagged as "Shortlisted" yet. You can manually generate a report for all analyzed talent.'
                                           : 'Add candidates in the Data tab. AI will auto-analyze and generate this report.'}
                                       </p>
                                     </div>
                                     
                                     {candidates.length > 0 && !isGeneratingReport && (
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
                                 <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[3rem] overflow-hidden shadow-2xl relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                                    
                                    {/* Report Header */}
                                    <div className="p-10 border-b border-[#1a1a1a] flex justify-between items-center bg-[#0a0a0a]">
                                       <div className="flex items-center gap-6">
                                          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-3xl border border-purple-500/20 shadow-inner">
                                            📈
                                          </div>
                                          <div>
                                            <h4 className="text-2xl font-black text-white tracking-tight uppercase">CEO STRATEGIC TALENT REPORT</h4>
                                            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1">AI-Driven Organizational Intelligence</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                         <button 
                                           onClick={() => window.print()}
                                           className="px-6 py-2.5 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                                         >
                                           Download PDF
                                         </button>
                                         <button 
                                           onClick={generateHRReport}
                                           className="px-6 py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-500/20 transition-all"
                                         >
                                           Regenerate
                                         </button>
                                       </div>
                                    </div>

                                    {/* Talent Dashboard Stats */}
                                    <div className="px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#080808]/50 border-b border-[#1a1a1a]">
                                       <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-[2rem] space-y-2">
                                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Total Shortlisted</p>
                                          <p className="text-4xl font-black text-white italic tracking-tighter">{hrReport.shortlisted_candidates?.length || 0}</p>
                                       </div>
                                       <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] space-y-2">
                                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Avg Match Score</p>
                                          <p className="text-4xl font-black text-white italic tracking-tighter">
                                            {Math.round(hrReport.shortlisted_candidates?.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / (hrReport.shortlisted_candidates?.length || 1))}%
                                          </p>
                                       </div>
                                       <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] space-y-2">
                                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Top Discipline</p>
                                          <p className="text-4xl font-black text-white italic tracking-tighter uppercase truncate">
                                            {hrReport.shortlisted_candidates?.[0]?.role?.split(' ')[0] || 'ENGINEERING'}
                                          </p>
                                       </div>
                                    </div>

                                    {/* Email Content */}
                                    <div className="p-10 space-y-8">
                                       <div className="space-y-4">
                                          <p className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em]">Subject Line</p>
                                          <div className="p-6 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                                             <p className="text-lg font-bold text-white tracking-tight">{hrReport.subject}</p>
                                          </div>
                                       </div>

                                       <div className="space-y-4">
                                          <p className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em]">Email Preview</p>
                                          <div className="p-8 bg-[#080808] border border-[#1a1a1a] rounded-3xl relative">
                                             <div className="absolute top-6 right-6 text-[9px] font-black text-[#222] uppercase tracking-widest">Confidential / AI Output</div>
                                             <div className="text-sm text-slate-300 leading-[1.8] whitespace-pre-wrap font-medium">
                                               {hrReport.email_body}
                                             </div>
                                          </div>
                                       </div>

                                       <div className="space-y-4">
                                          <p className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em]">Shortlisted Candidates Breakdown</p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {hrReport.shortlisted_candidates?.map((c: any) => (
                                              <div key={c.id} className="p-6 bg-[#080808] border border-[#1a1a1a] rounded-2xl flex flex-col gap-4 group/card hover:border-purple-500/30 transition-all">
                                                <div className="flex justify-between items-start">
                                                  <div>
                                                    <p className="text-sm font-bold text-white tracking-tight">{c.name}</p>
                                                    <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-1">{c.role}</p>
                                                  </div>
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black text-white">{c.score}%</span>
                                                    <span className="text-[8px] font-black text-[#333] uppercase tracking-widest">Match Score</span>
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
                                         <div className="space-y-4">
                                            <p className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em]">Strategic Roadmap</p>
                                            <div className="bg-purple-500/5 border border-purple-500/10 p-6 rounded-2xl space-y-4">
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
                                       <div className="flex gap-4 pt-6">
                                          <button 
                                            onClick={() => {
                                              const mailto = `mailto:ceo@company.com?subject=${encodeURIComponent(hrReport.subject)}&body=${encodeURIComponent(hrReport.email_body)}`;
                                              window.location.href = mailto;
                                            }}
                                            className="flex-1 py-5 bg-white text-black text-xs font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                                          >
                                            🚀 Send to CEO Now
                                          </button>
                                          <button 
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${hrReport.subject}\n\n${hrReport.email_body}`);
                                              addToast('✅ Copied to clipboard', 'success');
                                            }}
                                            className="px-10 py-5 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                          >
                                            Copy Email
                                          </button>
                                       </div>
                                    </div>

                                    <div className="px-10 py-4 bg-[#0a0a0a] border-t border-[#1a1a1a] flex justify-between items-center">
                                       <p className="text-[9px] font-bold text-[#333] uppercase tracking-widest">Generated by AI HR Agent • {new Date(hrReport.created_at).toLocaleString()}</p>
                                       <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest">Encrypted & Stored</p>
                                    </div>
                                 </div>
                               )}
                            </div>
                          );
                        } else if (selectedDept === 'Marketing') {
                          const viralReady = marketingProfiles.filter(p => p.marketing_analysis?.length > 0);
                          return (
                            <div className="space-y-8">
                               {/* General Marketing Strategy (Always Visible) */}
                               <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-pink-500/30 transition-all space-y-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-6 items-center">
                                      <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-pink-500/20">
                                        📣
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-bold text-white tracking-tight">Viral Growth Architecture</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 mt-1">Multi-Channel Distribution Strategy</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        console.log('Marketing Roadmap clicked');
                                        setSelectedRoadmap({
                                          title: 'Viral Growth Architecture',
                                          dept: 'Marketing',
                                          content: {
                                            objective: 'Dominate short-form platforms by leveraging AI hook generation and automated distribution nodes.',
                                            steps: [
                                              'Fine-tune Llama 3.1 on viral reel hooks and psychological triggers.',
                                              'Automate video clipping and captioning for 24/7 cross-platform posting.',
                                              'Implement "Engagement Pod" bots for initial social proof boosting.',
                                              'AI sentiment analysis on comments to auto-generate personalized replies.'
                                            ],
                                            roi: 'Targeting 10M+ impressions per month with 0 manual content creation hours.',
                                            resources: '1 Content Agent, Groq API (High Latency Priority), Canva Automation SDK.'
                                          }
                                        });
                                        setShowRoadmapModal(true);
                                      }}
                                      className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-pink-500 hover:border-pink-500 transition-all flex items-center gap-2 relative z-50"
                                    >
                                      <span>📊</span> Generate Detailed Report
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                     <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                        <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-4">Viral Hooks</p>
                                        <ul className="space-y-3">
                                          <li className="text-xs text-slate-300 font-medium">• "The Secret Workflow AI Startups Hate"</li>
                                          <li className="text-xs text-slate-300 font-medium">• Quantifiable Results: 0 to 1M in 30 Days</li>
                                        </ul>
                                     </div>
                                     <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                        <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-4">Channel Mix</p>
                                        <ul className="space-y-3">
                                          <li className="text-xs text-slate-300 font-medium">• Short-Form (Reels/TikTok) Dominance</li>
                                          <li className="text-xs text-slate-300 font-medium">• LinkedIn Value-First Threading</li>
                                        </ul>
                                     </div>
                                  </div>
                               </div>
                               {/* Viral Ready Profile Ideas */}
                               {viralReady.map(profile => {
                                 const analysis = profile.marketing_analysis[0];
                                 const mailtoLink = `mailto:ceo@company.com?subject=Marketing Opportunity: ${encodeURIComponent(profile.handle_name)}&body=${encodeURIComponent(`Hi CEO,\n\nI ran a viral audit on ${profile.handle_name} (${profile.platform}) and the AI flagged it as VIRAL READY.\n\nSummary:\n${analysis.summary || analysis.reason}\n\nStrengths:\n${(analysis.pros || []).map((p:string) => '- ' + p).join('\n')}\n\nContent Strategy / Pitch:\n${analysis.content_ideas || 'No specific ideas generated.'}\n\nLet me know if we should allocate budget to test this strategy.\n\nBest,\nMarketing Team`)}`;

                                 return (
                                   <div key={profile.id} className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] border-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.05)] space-y-6">
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
                                            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"/> Viral Content Strategy
                                         </p>
                                         <p className="text-sm text-slate-300 leading-relaxed font-medium">{analysis.content_ideas || analysis.summary}</p>
                                      </div>
                                   </div>
                                 );
                               })}
                            </div>
                          );
                         } else if (selectedDept === 'Sales') {
                          const latestSales = salesInsights[0];
                          
                          return (
                            <div className="space-y-8">
                               <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-emerald-500/30 transition-all space-y-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-6 items-center">
                                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-500/20">
                                        💰
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-bold text-white tracking-tight">Global Sales Infrastructure</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">High-Conversion Outreach Roadmap</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        console.log('Sales Roadmap clicked');
                                        setSelectedRoadmap({
                                          title: 'Global Sales Infrastructure',
                                          dept: 'Sales',
                                          content: {
                                            objective: 'Build a borderless sales engine using AI-led discovery and automated high-ticket closing sequences.',
                                            steps: [
                                              'Sync Apollo.io data with autonomous email agents for Tier-1 prospecting.',
                                              'Deploy AI Voice Agents for initial outbound qualification calls.',
                                              'Implement Dynamic Sales Deck generation based on lead pain-points.',
                                              'Automated CRM lifecycle management with zero manual entry.'
                                            ],
                                            roi: 'Expected 3x increase in Qualified Leads and 20% higher conversion on deals.',
                                            resources: '1 Sales Agent, Groq Llama 3 (for call analysis), CRM Webhooks.'
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
                                     <p className="text-sm text-slate-300 leading-relaxed font-medium">Focus on Tier-1 stakeholders in growth-stage automation sectors. Primary lever: Quantifiable ROI proof.</p>
                                  </div>
                               </div>

                               {latestSales && (
                                 <div className="bg-[#0f0f0f] border border-emerald-500/20 p-8 rounded-[2rem] shadow-[0_0_20px_rgba(16,185,129,0.05)] space-y-6">
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
                          const latestOps = opsInsights[0];
                          
                          return (
                            <div className="space-y-8">
                               <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-blue-500/30 transition-all space-y-6">
                                  <div className="flex gap-6 items-center">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-500/20">
                                      ⚖️
                                    </div>
                                    <div>
                                      <h4 className="text-xl font-bold text-white tracking-tight">Operational Excellence Framework</h4>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Global Process Optimization</p>
                                    </div>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-2">Efficiency Thesis</p>
                                     <p className="text-sm text-slate-300 leading-relaxed font-medium">Removing manual bottlenecks via automated department workers. Goal: 100% autonomous data sync.</p>
                                  </div>
                               </div>

                               {latestOps && (
                                 <div className="bg-[#0f0f0f] border border-blue-500/20 p-8 rounded-[2rem] shadow-[0_0_20px_rgba(59,130,246,0.05)] space-y-6">
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
                            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-amber-500/30 transition-all space-y-6">
                               <div className="flex gap-6 items-center">
                                 <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-amber-500/20">
                                   💰
                                 </div>
                                 <div>
                                   <h4 className="text-xl font-bold text-white tracking-tight">Financial Growth Framework</h4>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mt-1">Capital Efficiency & Revenue Recovery</p>
                                 </div>
                               </div>
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4">Revenue Ideas</p>
                                     <ul className="space-y-2">
                                       <li className="text-[11px] text-slate-300">• Automated Dunning Sequences</li>
                                       <li className="text-[11px] text-slate-300">• Dynamic Subscription Pricing</li>
                                     </ul>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4">Optimization</p>
                                     <ul className="space-y-2">
                                       <li className="text-[11px] text-slate-300">• AI Expense Categorization</li>
                                       <li className="text-[11px] text-slate-300">• Predictive Cashflow Models</li>
                                     </ul>
                                  </div>
                               </div>
                            </div>
                          );
                        } else if (selectedDept === 'Developer') {
                          return (
                            <div className="space-y-8">
                               <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-8 rounded-[2rem] hover:border-cyan-500/30 transition-all space-y-6">
                                  <div className="flex gap-6 items-center">
                                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-cyan-500/20">
                                      💻
                                    </div>
                                    <div>
                                      <h4 className="text-xl font-bold text-white tracking-tight">Technical Scaling Roadmap</h4>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mt-1">Agentic Infrastructure & Automation</p>
                                    </div>
                                  </div>
                                  <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                     <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">Build Pipeline</p>
                                     <p className="text-sm text-slate-300 leading-relaxed font-medium">Migrating to a fully agentic CI/CD pipeline. Goal: Zero-manual deployment for core microservices.</p>
                                  </div>
                               </div>
                               {devInsights[0] && (
                                 <div className="bg-[#0f0f0f] border border-cyan-500/20 p-8 rounded-[2rem] shadow-[0_0_20px_rgba(6,182,212,0.05)] space-y-6">
                                    <div className="flex justify-between items-start">
                                      <div className="flex gap-6 items-center">
                                        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-cyan-500/20">
                                          🚀
                                        </div>
                                        <div>
                                          <h4 className="text-xl font-bold text-white tracking-tight">Technical Roadmap</h4>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mt-1">Scale & Security</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                                       <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">Architecture Overview</p>
                                       <p className="text-sm text-slate-300 leading-relaxed font-medium">{devInsights[0].architecture_overview}</p>
                                    </div>
                                 </div>
                               )}
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
                      "I have analyzed the current {selectedDept.toLowerCase()} data. All nodes are reporting nominal efficiency. Would you like to deep-dive into the forecast or individual performance metrics?"
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
          fetchTasks();
          fetchCandidates();
          fetchMarketingProfiles();
          fetchSalesInsights();
          fetchOpsInsights();
          fetchFinanceInsights();
          fetchDevInsights();
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
