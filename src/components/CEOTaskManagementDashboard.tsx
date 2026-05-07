"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Full-Stack CEO Task Management Dashboard
 */

// --- Types ---

type Department = 'HR' | 'Sales' | 'Marketing' | 'Finance' | 'Developer' | 'Operations';

interface WorkflowStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
}

interface DBTaskEntry {
  _id: string;
  department: Department;
  details?: Record<string, string>;
  tasks: string[];
  status: 'pending' | 'in_progress' | 'completed';
  workflow?: WorkflowStep[];
  assignedBy: string;
  createdAt: string;
}

const DEPARTMENT_CONFIG = {
  HR: [
    { name: 'position', label: 'Position Name', placeholder: 'e.g. Senior React Developer', type: 'text' },
    { name: 'openings', label: 'Number of Openings', placeholder: 'e.g. 2', type: 'number' },
    { name: 'salary', label: 'Salary Range', placeholder: 'e.g. $80,000 - $120,000', type: 'text' },
    { name: 'deadline', label: 'Target Hiring Date', type: 'date' },
  ],
  Sales: [
    { name: 'region', label: 'Target Market/Region', placeholder: 'e.g. North America / APAC', type: 'text' },
    { name: 'quota', label: 'Revenue Target (Quota)', placeholder: 'e.g. $250,000', type: 'text' },
    { name: 'leadSource', label: 'Lead Source Focus', placeholder: 'e.g. Inbound / LinkedIn', type: 'text' },
  ],
  Marketing: [
    { name: 'campaign', label: 'Campaign Title', placeholder: 'e.g. Q3 Product Launch', type: 'text' },
    { name: 'channel', label: 'Primary Channel', placeholder: 'e.g. Google Ads / Instagram', type: 'text' },
    { name: 'audience', label: 'Target Audience', placeholder: 'e.g. Tech Founders 25-40', type: 'text' },
    { name: 'budget', label: 'Allocated Budget', placeholder: 'e.g. $15,000', type: 'text' },
  ],
  Finance: [
    { name: 'reportType', label: 'Financial Report Type', placeholder: 'e.g. Balance Sheet / Audit', type: 'text' },
    { name: 'quarter', label: 'Fiscal Period', placeholder: 'e.g. Q4 2026', type: 'text' },
    { name: 'allocation', label: 'Budget Allocation', placeholder: 'e.g. $50,000 per dept', type: 'text' },
  ],
  Developer: [
    { name: 'projectName', label: 'Project/Feature Name', placeholder: 'e.g. Auth System V2', type: 'text' },
    { name: 'techStack', label: 'Core Tech Stack', placeholder: 'e.g. Next.js, Node, Redis', type: 'text' },
    { name: 'repo', label: 'GitHub Repository', placeholder: 'e.g. company/core-repo', type: 'text' },
    { name: 'env', label: 'Target Environment', placeholder: 'e.g. Production / Staging', type: 'text' },
  ],
  Operations: [
    { name: 'focus', label: 'Operational Focus Area', placeholder: 'e.g. Supply Chain / Security', type: 'text' },
    { name: 'resource', label: 'Resource Allocation', placeholder: 'e.g. 5 Cloud Servers', type: 'text' },
    { name: 'priority', label: 'Operational Urgency', placeholder: 'e.g. Critical / Standard', type: 'text' },
  ],
};

const DEPARTMENTS: Department[] = ['HR', 'Sales', 'Marketing', 'Finance', 'Developer', 'Operations'];

const DEPT_COLORS: Record<string, string> = {
  HR: 'from-pink-500 to-rose-500',
  Sales: 'from-blue-500 to-indigo-500',
  Marketing: 'from-purple-500 to-fuchsia-500',
  Finance: 'from-emerald-500 to-teal-500',
  Developer: 'from-cyan-500 to-blue-500',
  Operations: 'from-orange-500 to-amber-500',
};

// --- Icons ---

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/></svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const IconDatabase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);

const IconChat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
);

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.71 12 3v9.29L20 9.29 12 21v-9.29z"/></svg>
);

// --- Main Component ---

export default function CEOTaskManagementDashboard() {
  const [modal, setModal] = useState({
    isOpen: false,
    step: 1,
    selectedDept: '' as Department | '',
    details: {} as Record<string, string>,
    taskInputs: ['']
  });

  const [workerModal, setWorkerModal] = useState({
    isOpen: false,
    task: null as DBTaskEntry | null,
    isSimulating: false,
    activeTab: 'Overview' as 'Overview' | 'Performance' | 'Insights' | 'ATS Intelligence' | 'Reels' | 'Ideas' | 'Lead Gen' | 'CRM',
    atsCandidates: [] as any[],
    marketingResult: null as string | null
  });

  const [dbEntries, setDbEntries] = useState<DBTaskEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    let interval: any;
    if (workerModal.isOpen && workerModal.isSimulating && workerModal.task) {
      interval = setInterval(async () => {
        const task = workerModal.task!;
        const currentStepIndex = task.workflow?.findIndex(s => s.status !== 'completed');
        
        if (currentStepIndex === -1 || currentStepIndex === undefined) {
          setWorkerModal(prev => ({ ...prev, isSimulating: false }));
          updateTaskStatus(task._id, 'completed');
          return;
        }

        const currentStep = task.workflow![currentStepIndex];
        const nextProgress = Math.min(currentStep.progress + Math.floor(Math.random() * 15) + 5, 100);

        const updatedWorkflow = [...task.workflow!];
        updatedWorkflow[currentStepIndex] = { 
          ...currentStep, 
          progress: nextProgress,
          status: 'in_progress'
        };

        setWorkerModal(prev => ({
          ...prev,
          task: { ...task, workflow: updatedWorkflow }
        }));

        if (nextProgress === 100) {
          await updateStepStatus(task._id, currentStepIndex, 'completed');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workerModal.isOpen, workerModal.isSimulating, workerModal.task]);

  useEffect(() => {
    let atsInterval: any;
    if (workerModal.isOpen && workerModal.activeTab === 'ATS Intelligence' && workerModal.atsCandidates.length === 0) {
      // Initialize mock candidates
      const mockCandidates = [
        { id: 1, name: "Sarah Jenkins", role: "Sr. Frontend Dev", score: 0, status: 'Received' },
        { id: 2, name: "Michael Chen", role: "Backend Engineer", score: 0, status: 'Received' },
        { id: 3, name: "Alex Rivera", role: "UI/UX Designer", score: 0, status: 'Received' },
        { id: 4, name: "Emma Wilson", role: "Project Manager", score: 0, status: 'Received' },
      ];
      setWorkerModal(prev => ({ ...prev, atsCandidates: mockCandidates }));
    }

    if (workerModal.isOpen && workerModal.activeTab === 'ATS Intelligence' && workerModal.isSimulating) {
      atsInterval = setInterval(() => {
        setWorkerModal(prev => {
          const nextCandidates = [...prev.atsCandidates];
          const targetIdx = nextCandidates.findIndex(c => c.status !== 'Shortlisted' && c.status !== 'Rejected');
          
          if (targetIdx === -1) return prev;

          const candidate = nextCandidates[targetIdx];
          if (candidate.status === 'Received') {
            nextCandidates[targetIdx] = { ...candidate, status: 'Analyzing' };
          } else if (candidate.status === 'Analyzing') {
            nextCandidates[targetIdx] = { ...candidate, status: 'Scoring' };
          } else if (candidate.status === 'Scoring') {
            const score = Math.floor(Math.random() * 40) + 60; // 60-100
            nextCandidates[targetIdx] = { 
              ...candidate, 
              score, 
              status: score >= 80 ? 'Shortlisted' : 'Rejected' 
            };
          }

          return { ...prev, atsCandidates: nextCandidates };
        });
      }, 2000);
    }

    return () => clearInterval(atsInterval);
  }, [workerModal.isOpen, workerModal.activeTab, workerModal.isSimulating]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/tasks');
      if (response.data.success) {
        setDbEntries(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => setModal({ ...modal, isOpen: true, step: 1, taskInputs: [''], details: {} });
  const handleCloseModal = () => setModal({ ...modal, isOpen: false, step: 1, selectedDept: '', taskInputs: [''], details: {} });
  const handleSelectDept = (dept: Department) => setModal({ ...modal, selectedDept: dept, step: 2, details: {} });
  const handleAddTaskInput = () => setModal({ ...modal, taskInputs: [...modal.taskInputs, ''] });
  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...modal.taskInputs];
    newInputs[index] = value;
    setModal({ ...modal, taskInputs: newInputs });
  };
  const handleDetailChange = (name: string, value: string) => {
    setModal({ ...modal, details: { ...modal.details, [name]: value } });
  };

  const handleRunPerformance = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/tasks/execute');
      if (response.data.success) {
        alert("Performance Started! All agents are now executing their tasks.");
        fetchTasks();
      }
    } catch (error) {
      console.error("Error starting performance:", error);
      alert("Failed to start global performance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSystem = async () => {
    if (!confirm("Are you sure you want to RESET the entire system? All missions will be permanently deleted.")) return;
    
    try {
      setIsSubmitting(true);
      const response = await axios.delete('/api/tasks/reset');
      if (response.data.success) {
        alert("System Reset Complete! All data cleared.");
        fetchTasks();
      }
    } catch (error) {
      console.error("Error resetting system:", error);
      alert("Failed to reset system.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWork = async (entry: DBTaskEntry) => {
    try {
      setIsSubmitting(true);
      const response = await axios.get(`/api/tasks/${entry._id}`);
      if (response.data.success) {
        setWorkerModal({ 
          isOpen: true, 
          task: response.data.data, 
          isSimulating: false, 
          activeTab: 'Overview',
          atsCandidates: [],
          marketingResult: null
        });
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStepStatus = async (id: string, stepIndex: number, stepStatus: string) => {
    try {
      setIsSubmitting(true);
      const response = await axios.patch(`/api/tasks/${id}`, { stepIndex, stepStatus });
      if (response.data.success) {
        setWorkerModal(prev => ({ ...prev, task: response.data.data }));
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating step:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      setIsSubmitting(true);
      const response = await axios.patch(`/api/tasks/${id}`, { status });
      if (response.data.success) {
        setWorkerModal(prev => ({ ...prev, task: response.data.data, isOpen: status !== 'completed' }));
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating global status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const { selectedDept, taskInputs, details } = modal;
    const validTasks = taskInputs.filter(t => t.trim() !== '');
    if (!selectedDept || validTasks.length === 0) {
      alert("Please select a department and enter at least one task.");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/tasks', { department: selectedDept, tasks: validTasks, details });
      if (response.data.success) {
        handleCloseModal();
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* 1. Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 animate-pulse">
              <IconZap />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">AI Agent Command Center</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">System Status: Live & Operational</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResetSystem}
              disabled={isSubmitting}
              className="px-6 py-3 bg-rose-600/10 border border-rose-500/30 text-rose-500 font-black rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 uppercase text-xs tracking-widest shadow-xl shadow-rose-500/5 disabled:opacity-50"
            >
              <IconX />
              Reset System
            </button>
            <button
              onClick={handleRunPerformance}
              disabled={isSubmitting}
              className="px-6 py-3 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/5 disabled:opacity-50"
            >
              <IconPlay />
              Start Performance
            </button>
            <button
              onClick={handleOpenModal}
              className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 uppercase text-xs tracking-widest shadow-xl shadow-white/5"
            >
              <IconPlus />
              Assign New Mission
            </button>
          </div>
        </div>

        {/* 2. Activity Feed */}
        <div className="bg-[#0c0c10] border border-slate-800/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-pink-500/5 opacity-50" />
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Live Activity Feed</h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-800" />)}
              </div>
            </div>
            <div className="h-24 overflow-hidden relative">
              <div className="space-y-3 animate-marquee">
                {dbEntries.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-xs font-medium py-1 border-l-2 border-indigo-500/30 pl-4 bg-indigo-500/5 rounded-r-lg">
                    <span className="px-2 py-0.5 bg-indigo-500 text-[9px] font-black text-white rounded uppercase tracking-tighter">Running</span>
                    <span className="text-slate-400 uppercase text-[10px]">{entry.department}</span>
                    <span className="text-slate-200 truncate max-w-md">{entry.tasks[0]}</span>
                    <span className="ml-auto text-slate-600 font-mono text-[9px]">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
                {dbEntries.length === 0 && (
                  <p className="text-slate-700 italic text-sm">Waiting for incoming missions...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map(dept => {
            const entries = dbEntries.filter(e => e.department === dept);
            const activeEntry = entries[0];
            const colorClass = DEPT_COLORS[dept];

            return (
              <div key={dept} className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${colorClass} rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000`}></div>
                <div className="relative bg-[#0c0c10] border border-slate-800/50 p-8 rounded-[2.5rem] h-full flex flex-col gap-6 shadow-2xl transition-all hover:translate-y-[-4px]">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-black text-white text-lg tracking-tight">{dept} Agent</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeEntry ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {activeEntry ? 'Working' : 'Idle'}
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colorClass} p-2.5 shadow-lg shadow-indigo-500/20`}>
                      <IconZap />
                    </div>
                  </div>
                  <div className="flex-1">
                    {activeEntry ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeEntry.tasks[0]}</p>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold text-slate-500 uppercase">{activeEntry.status}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 italic">No active missions assigned.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => activeEntry && handleStartWork(activeEntry)}
                      disabled={!activeEntry}
                      className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30"
                    >
                      Open →
                    </button>
                    <button className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                      Chat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Assignment Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative w-full max-w-md bg-[#121214] border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  {modal.step === 1 ? 'Select Department' : `Assign Tasks to ${modal.selectedDept}`}
                </h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
                  <IconClose />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {modal.step === 1 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {DEPARTMENTS.map(dept => (
                      <button key={dept} onClick={() => handleSelectDept(dept)} className="p-6 bg-slate-800/20 border border-slate-800 rounded-2xl hover:bg-indigo-600/10 hover:border-indigo-500/50 transition-all text-slate-400 hover:text-white font-bold">{dept}</button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest border-l-2 border-indigo-600 pl-2">{modal.selectedDept} Requirements</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {modal.selectedDept && DEPARTMENT_CONFIG[modal.selectedDept].map(field => (
                          <div key={field.name} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{field.label}</label>
                            <input type={field.type} placeholder={field.placeholder} value={modal.details[field.name] || ''} onChange={(e) => handleDetailChange(field.name, e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest border-l-2 border-indigo-600 pl-2">Specific Tasks</h3>
                      <div className="space-y-3">
                        {modal.taskInputs.map((input, idx) => (
                          <input key={idx} type="text" value={input} onChange={(e) => handleInputChange(idx, e.target.value)} placeholder={`Describe task ${idx + 1}...`} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" />
                        ))}
                      </div>
                      <button onClick={handleAddTaskInput} className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 font-bold">+ Add Task</button>
                    </div>
                  </div>
                )}
              </div>
              {modal.step === 2 && (
                <div className="p-6 border-t border-slate-800 flex gap-3 shrink-0">
                  <button onClick={() => setModal({ ...modal, step: 1 })} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Back</button>
                  <button onClick={handleSubmit} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl">{isSubmitting ? 'Saving...' : 'Submit Mission'}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. High-Fidelity Agent Workspace (Worker Modal) */}
        {workerModal.isOpen && workerModal.task && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050507]/95 backdrop-blur-xl" onClick={() => setWorkerModal({ ...workerModal, isOpen: false })} />
            
            <div className="relative bg-[#0c0c10] border border-slate-800/50 w-full max-w-6xl h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500">
              
              {/* Header */}
              <div className="p-8 border-b border-slate-800/50 flex items-center justify-between shrink-0 bg-gradient-to-b from-slate-900/20 to-transparent">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setWorkerModal({ ...workerModal, isOpen: false })}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-sm"
                  >
                    <IconX /> Back
                  </button>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${DEPT_COLORS[workerModal.task.department]} p-3 shadow-lg`}>
                      <IconZap />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight leading-none">{workerModal.task.department}</h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Intelligence, execution, growth</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Active Session</span>
                  </div>
                </div>
              </div>

              {/* Main Body Grid */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left Side: Overview & Tasks (70%) */}
                <div className="flex-[7] overflow-y-auto custom-scrollbar p-8 space-y-8 border-r border-slate-800/50">
                  
                  {/* Tabs */}
                  <div className="flex gap-4 border-b border-slate-800/30 pb-4">
                    {['Overview', 'Performance', 'Insights', 
                      ...(workerModal.task.department === 'HR' ? ['ATS Intelligence'] : []),
                      ...(workerModal.task.department === 'Marketing' ? ['Reels', 'Ideas'] : []),
                      ...(workerModal.task.department === 'Sales' ? ['Lead Gen', 'CRM'] : [])
                    ].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setWorkerModal(prev => ({ ...prev, activeTab: tab as any }))}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${workerModal.activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content Rendering */}
                  {workerModal.activeTab === 'Overview' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      {/* Stats Grid */}
                      {/* Stats Grid */}
                      {workerModal.task.department === 'Marketing' ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-6 bg-[#121214] border border-slate-800 rounded-3xl space-y-2 group hover:border-pink-500/30 transition-all cursor-default">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Followers</p>
                            <p className="text-3xl font-black text-rose-500">21K+</p>
                            <p className="text-[10px] text-slate-500 font-bold">+420 this month</p>
                          </div>
                          <div className="p-6 bg-[#121214] border border-slate-800 rounded-3xl space-y-2 group hover:border-emerald-500/30 transition-all cursor-default">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Views</p>
                            <p className="text-3xl font-black text-cyan-400">96.5K</p>
                            <p className="text-[10px] text-slate-500 font-bold">23 reels tracked</p>
                          </div>
                          <div className="p-6 bg-[#121214] border border-slate-800 rounded-3xl space-y-2 group hover:border-purple-500/30 transition-all cursor-default">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top Reels</p>
                            <p className="text-3xl font-black text-purple-500">6</p>
                            <p className="text-[10px] text-slate-500 font-bold">above avg performance</p>
                          </div>
                          <div className="p-6 bg-[#121214] border border-slate-800 rounded-3xl space-y-2 group hover:border-amber-500/30 transition-all cursor-default">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Likes</p>
                            <p className="text-3xl font-black text-amber-500">39.5K</p>
                            <p className="text-[10px] text-slate-500 font-bold">+12% growth</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Task Velocity</p>
                            <p className="text-2xl font-black text-white leading-none">94.2%</p>
                            <p className="text-[9px] text-emerald-500 font-bold uppercase">+12% this week</p>
                          </div>
                          <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Data Processed</p>
                            <p className="text-2xl font-black text-white leading-none">1.2 TB</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase">Cached - Refresh</p>
                          </div>
                          <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Efficiency Score</p>
                            <p className="text-2xl font-black text-rose-500 leading-none">9.8/10</p>
                            <p className="text-[9px] text-rose-500 font-bold uppercase">Peak Performance</p>
                          </div>
                        </div>
                      )}

                      {/* Task List (Quick Tasks Style) */}
                      {/* Quick Tasks & Results Section */}
                      <div className="space-y-6">
                        {workerModal.task.department === 'Marketing' ? (
                          <>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Tasks</h3>
                                <button className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest">23 cached - Refresh</button>
                              </div>
                              <div className="flex flex-col gap-2">
                                {[
                                  "Give me 5 reel ideas for this week based on what's working",
                                  "Write 3 hooks for an AI automation reel",
                                  "What topics are performing best on my account?",
                                  "Create a content calendar for the next 7 days",
                                  "Write a caption for a before/after AI automation reel"
                                ].map((qTask, i) => (
                                  <button 
                                    key={i}
                                    onClick={() => setWorkerModal(prev => ({ ...prev, marketingResult: qTask }))}
                                    className="w-full text-left p-4 rounded-2xl border border-rose-500/30 bg-transparent hover:bg-rose-500/5 transition-all text-rose-500 text-xs font-black tracking-tight"
                                  >
                                    {qTask}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {workerModal.marketingResult && (
                              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Results</h3>
                                <div className="bg-[#121214] border border-slate-800 rounded-3xl p-6 space-y-6">
                                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                        <IconCheck />
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Email to CEO</p>
                                        <p className="text-sm font-bold text-white">Subject: {workerModal.marketingResult}</p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-600 uppercase">Just Now</span>
                                  </div>
                                  <div className="space-y-4">
                                    <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4 py-1">
                                      "Hello CEO, I have analyzed our current Instagram metrics and generated the requested strategy. Here are the top 5 high-performing reel concepts focused on AI automation and user growth..."
                                    </p>
                                    <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
                                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Recommended Concepts:</p>
                                      <ul className="space-y-2 text-[11px] text-slate-300 font-medium">
                                        <li>• <span className="text-rose-500">Concept 1:</span> The Secret to 24/7 Productivity (POV style)</li>
                                        <li>• <span className="text-rose-500">Concept 2:</span> Why your current workflow is leaking revenue</li>
                                        <li>• <span className="text-rose-500">Concept 3:</span> 3 AI tools I can't live without in 2026</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Mission Tasks</h3>
                            <div className="space-y-3">
                              {workerModal.task.tasks.map((task, idx) => (
                                <div key={idx} className="group relative">
                                  <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-all duration-500" />
                                  <button className="relative w-full text-left p-4 bg-slate-900/50 border border-rose-500/30 rounded-2xl text-slate-200 text-sm font-medium hover:border-rose-500 transition-all shadow-lg shadow-rose-500/5">
                                    {task}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Task Results (Simulation Logic) */}
                      <div className="space-y-4 pt-4">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Execution Results</h3>
                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                          <div className="flex items-center gap-2">
                             <div className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center text-[10px] text-black"><IconCheck /></div>
                             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Email to CEO Generated</p>
                          </div>
                          <div className="space-y-2">
                             <p className="text-xs font-bold text-slate-300">Subject: Strategy Update for {workerModal.task.department} Mission</p>
                             <div className="p-4 bg-black/40 rounded-xl text-[11px] text-slate-400 leading-relaxed font-mono">
                                {workerModal.isSimulating ? (
                                  <span className="after:content-['_'] after:animate-pulse">Analyzing real-time metrics and preparing high-fidelity insights based on current task velocity...</span>
                                ) : (
                                  "System is standing by. Click 'Initialize Execution' to generate results."
                                )}
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'Performance' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Execution Pipeline</h3>
                      <div className="space-y-0 relative pl-4 border-l border-slate-800 ml-2">
                        {workerModal.task.workflow?.map((step, i) => (
                          <div key={i} className="pb-8 relative">
                            <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-[#0f0f12] z-10 ${step.status === 'completed' ? 'bg-emerald-500' : step.status === 'in_progress' ? 'bg-amber-500 animate-ping' : 'bg-slate-800'}`} />
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className={`text-sm font-bold ${step.status === 'completed' ? 'text-slate-500' : 'text-slate-200'}`}>{step.step}</span>
                                <span className="text-[10px] font-mono text-slate-500">{step.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                                <div className={`h-full transition-all duration-500 ${step.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${step.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'Insights' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Mission Insights</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl space-y-4">
                          <p className="text-[10px] font-black text-indigo-400 uppercase">Core Strength</p>
                          <div className="h-32 flex items-end gap-2 px-2">
                            {[40, 70, 50, 90, 60, 80].map((h, i) => (
                              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-indigo-500/20 border-t border-indigo-500/50 rounded-t-sm" />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Neural network efficiency is currently at peak capacity for {workerModal.task.department}.</p>
                        </div>
                        <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl space-y-4">
                          <p className="text-[10px] font-black text-pink-400 uppercase">Execution Risk</p>
                          <div className="flex items-center justify-center py-6">
                             <div className="w-24 h-24 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin flex items-center justify-center">
                               <span className="text-lg font-black text-white">0.2%</span>
                             </div>
                          </div>
                          <p className="text-xs text-slate-400 font-medium text-center">Low latency detected in all operational nodes.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'Reels' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Instagram Reels Performance</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="aspect-[9/16] bg-[#121214] rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 group hover:border-pink-500/50 transition-all cursor-pointer overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                               <IconPlay />
                             </div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase">Reel #{i}</p>
                             <div className="absolute bottom-6 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 transition-all">
                               <span className="text-[9px] font-black text-white">4.2K Views</span>
                               <span className="text-[9px] font-black text-rose-500">98% Fav</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'Ideas' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Neural Content Ideas</h3>
                      <div className="space-y-4">
                        {[
                          { title: "The 'Aha' Moment", desc: "Highlight a common problem solved by AI in 15 seconds." },
                          { title: "Behind the Scenes", desc: "Show the 'Agentic Workflow' in action with a fast-paced edit." },
                          { title: "The Efficiency Comparison", desc: "Before vs After using our automation suite." },
                          { title: "CEO POV", desc: "Show what it's like to run a company with 0 employees." }
                        ].map((idea, i) => (
                          <div key={i} className="p-6 bg-[#121214] border border-slate-800 rounded-3xl flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-white uppercase tracking-tight">{idea.title}</p>
                              <p className="text-[10px] font-medium text-slate-500">{idea.desc}</p>
                            </div>
                            <button className="px-5 py-2.5 bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                              Adopt Idea
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'Lead Gen' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/30 p-6 rounded-3xl">
                        <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">PHAZE AI - EMERGENCY LEAD GENERATION CAMPAIGN</h3>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">
                            Status: Pipeline Empty (₹0 current opportunity) | Risk: Critical | Action: IMMEDIATE
                          </p>
                        </div>
                        <div className="px-4 py-2 bg-rose-500 text-white text-[10px] font-black rounded-xl animate-pulse">CRITICAL</div>
                      </div>

                      <div className="space-y-8 bg-[#121214] border border-slate-800 rounded-3xl p-8">
                        <div className="space-y-4">
                          <h4 className="text-lg font-black text-white uppercase tracking-tight border-b border-slate-800 pb-2">PHASE 1: TARGET PROSPECT LIST (20 Leads)</h4>
                          
                          <div className="space-y-6">
                            {/* Segment A */}
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Segment A: High-Ticket SaaS/B2B Startups (₹50K-₹2L deals)</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { name: "Freshworks", focus: "CRM automation", loc: "Bangalore" },
                                  { name: "Razorpay", focus: "FinTech ops", loc: "Bangalore" },
                                  { name: "Postman", focus: "API intelligence", loc: "Bangalore" },
                                  { name: "Atlassian India", focus: "DevOps teams", loc: "Bangalore" },
                                  { name: "Ather Energy", focus: "Supply chain automation", loc: "Bangalore" },
                                  { name: "PhysicsWallah", focus: "EdTech content systems", loc: "Delhi" }
                                ].map((lead, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-indigo-500/50 transition-all">
                                    <p className="text-xs font-bold text-slate-200">
                                      {lead.name} <span className="text-slate-500 font-medium">({lead.focus})</span>
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-600 uppercase italic">{lead.loc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Segment B */}
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Segment B: Mid-Market Companies (₹30K-₹75K deals)</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { name: "Vymo", focus: "CRM automation" },
                                  { name: "Shiprocket", focus: "AI Logistics" },
                                  { name: "Unacademy", focus: "Content/AI Integration" },
                                  { name: "BigBasket", focus: "Demand forecasting" }
                                ].map((lead, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-emerald-500/50 transition-all">
                                    <p className="text-xs font-bold text-slate-200">
                                      {lead.name} <span className="text-slate-500 font-medium">({lead.focus})</span>
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-600 uppercase italic">Bangalore</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Segment C */}
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Segment C: SMBs/Startups (₹25K-₹50K deals)</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { name: "Groww", focus: "FinTech content" },
                                  { name: "Scaler Academy", focus: "EdTech systems" },
                                  { name: "Usha International", focus: "Manufacturing ops" },
                                  { name: "Cred", focus: "FinTech processes" }
                                ].map((lead, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-amber-500/50 transition-all">
                                    <p className="text-xs font-bold text-slate-200">
                                      {lead.name} <span className="text-slate-500 font-medium">({lead.focus})</span>
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-600 uppercase italic">Mumbai/Bangalore</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {workerModal.activeTab === 'CRM' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sales Pipeline Management</h3>
                      <div className="space-y-4">
                        {[
                          { stage: "Lead Generated", count: 20, color: "bg-indigo-500" },
                          { stage: "Outreach Sent", count: 0, color: "bg-amber-500" },
                          { stage: "Meeting Booked", count: 0, color: "bg-emerald-500" },
                          { stage: "Closed Won", count: 0, color: "bg-pink-500" }
                        ].map((stage, i) => (
                          <div key={i} className="p-6 bg-[#121214] border border-slate-800 rounded-3xl space-y-4">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-black text-white uppercase tracking-tight">{stage.stage}</p>
                              <p className="text-xl font-black text-white">{stage.count}</p>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${stage.color}`} style={{ width: `${(stage.count / 20) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Chat Interface (30%) */}
                <div className="flex-[3] bg-black/20 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-800/50">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Chat with Agent</h3>
                  </div>
                  
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
                      <div className="p-3 bg-slate-800/40 rounded-2xl rounded-tl-none text-xs text-slate-300 leading-relaxed">
                        Hello CEO. I am processing the {workerModal.task.department} mission. How can I assist further?
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-800/50">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder={`Ask ${workerModal.task.department} anything...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                        <IconZap />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Execution Bar */}
              <div className="p-6 bg-slate-900/30 border-t border-slate-800/50 flex justify-center">
                {!workerModal.isSimulating && workerModal.task.status !== 'completed' ? (
                  <button 
                    onClick={() => setWorkerModal({ ...workerModal, isSimulating: true })}
                    className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Initialize Execution
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-500 font-black uppercase tracking-[0.2em] text-[10px]">
                    <IconCheck /> Mission Accomplished
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
