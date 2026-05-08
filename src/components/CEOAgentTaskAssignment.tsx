"use client";

import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { apiUrl } from '@/src/lib/api';

/**
 * CEOAgentTaskAssignment Component
 * 
 * A modern task assignment system for a CEO Agent.
 * Features a dashboard card and a multi-step modal with dynamic forms based on department selection.
 */

// --- Icons (SVG Components) ---

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const DepartmentIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'HR':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'Sales':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>;
    case 'Marketing':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
    case 'Finance':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
    case 'Developer':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case 'Operations':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    default:
      return null;
  }
};

// --- Constants ---

const DEPARTMENTS = [
  'HR', 'Sales', 'Marketing', 'Finance', 'Developer', 'Operations'
];

interface FormField {
  label: string;
  name: string;
  type: string;
  placeholder: string;
}

const DEPARTMENT_FIELDS: Record<string, FormField[]> = {
  HR: [
    { label: 'Candidate Name', name: 'candidateName', type: 'text', placeholder: 'e.g. John Doe' },
    { label: 'Position', name: 'position', type: 'text', placeholder: 'e.g. Senior Developer' },
    { label: 'Reason for Hire', name: 'reason', type: 'text', placeholder: 'e.g. Team expansion' }
  ],
  Sales: [
    { label: 'Client Name', name: 'clientName', type: 'text', placeholder: 'e.g. Acme Corp' },
    { label: 'Deal Value ($)', name: 'dealValue', type: 'number', placeholder: 'e.g. 5000' },
    { label: 'Closing Date', name: 'closingDate', type: 'date', placeholder: '' }
  ],
  Marketing: [
    { label: 'Campaign Title', name: 'campaignTitle', type: 'text', placeholder: 'e.g. Summer Launch' },
    { label: 'Target Audience', name: 'target', type: 'text', placeholder: 'e.g. Young Professionals' },
    { label: 'Budget ($)', name: 'budget', type: 'number', placeholder: 'e.g. 1000' }
  ],
  Finance: [
    { label: 'Report Period', name: 'period', type: 'text', placeholder: 'e.g. Q2 2024' },
    { label: 'Expense Category', name: 'category', type: 'text', placeholder: 'e.g. R&D' },
    { label: 'Total Amount', name: 'amount', type: 'number', placeholder: '0.00' }
  ],
  Developer: [
    { label: 'Repository URL', name: 'repo', type: 'text', placeholder: 'https://github.com/...' },
    { label: 'Feature Name', name: 'feature', type: 'text', placeholder: 'e.g. Auth System' },
    { label: 'Environment', name: 'env', type: 'text', placeholder: 'e.g. Staging' }
  ],
  Operations: [
    { label: 'Process Name', name: 'process', type: 'text', placeholder: 'e.g. Inventory Sync' },
    { label: 'Location', name: 'location', type: 'text', placeholder: 'e.g. NY Warehouse' },
    { label: 'Priority Level', name: 'priority', type: 'text', placeholder: 'High/Medium/Low' }
  ]
};

// --- Types ---

interface AppState {
  isOpen: boolean;
  step: 1 | 2;
  department: string;
  tasks: string[];
  formData: Record<string, string>;
}

export default function CEOAgentTaskAssignment() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-8 text-slate-200 font-sans">
      <div className="max-w-4xl mx-auto">
        <CEOAgentCard onAssignTask={() => setIsOpen(true)} />
        <TaskAssignmentModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}

export function CEOAgentCard({ onAssignTask }: { onAssignTask: () => void }) {
  return (
    <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl transition-all hover:shadow-indigo-500/10">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">CEO Agent</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Ready to Assign New Workflows
            </p>
          </div>
        </div>

        <button
          onClick={onAssignTask}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <IconPlus />
          Assign Task
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Tasks', value: '08' },
          { label: 'Completed Today', value: '14' },
          { label: 'Agent Status', value: 'Optimal' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">{stat.label}</p>
            <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskAssignmentModal({ 
  isOpen, 
  onClose,
  requestId,
  onTaskAssigned
}: { 
  isOpen: boolean, 
  onClose: () => void,
  requestId?: string | null,
  onTaskAssigned?: (department: string) => void
}) {
  // 3. State Management (Single useState object)
  const [state, setState] = useState<AppState>({
    isOpen: isOpen,
    step: 1,
    department: '',
    tasks: [''],
    formData: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync isOpen from props
  React.useEffect(() => {
    if (isOpen) {
      setState(prev => ({ ...prev, isOpen: true, step: 1, department: '', tasks: [''], formData: {} }));
    } else {
      setState(prev => ({ ...prev, isOpen: false }));
    }
  }, [isOpen]);

  const handleSelectDepartment = (dept: string) => {
    setState(prev => ({
      ...prev,
      department: dept,
      step: 2,
      formData: {} // Reset form data when changing department
    }));
  };

  const handleFormChange = (name: string, value: string) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value
      }
    }));
  };

  const handleAddTask = () => {
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, '']
    }));
  };

  const handleRemoveTask = (index: number) => {
    if (state.tasks.length === 1) return;
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...state.tasks];
    newTasks[index] = value;
    setState(prev => ({
      ...prev,
      tasks: newTasks
    }));
  };

  const handleCloseModal = () => {
    onClose();
  };

  const handleSubmit = async () => {
    // Basic validation
    const validTasks = state.tasks.filter(t => t.trim() !== '');
    if (validTasks.length === 0) {
      alert("Please add at least one task.");
      return;
    }

    setIsSubmitting(true);

    // 4. Behavior (Data Collection & API Placeholder)
    const payload = {
      department: state.department,
      details: state.formData,
      tasks: validTasks
    };

    console.log("Submitting to CEO:", payload);

    try {
      // 1. Prepare tasks for database insertion
      const insertPayload = validTasks.map(t => ({
        title: t,
        department: state.department,
        description: `Manual assignment: ${state.department} workflow`,
        priority: 'HIGH', 
        status: 'waiting_for_ceo',
        progress: 0,
        created_at: new Date().toISOString()
      }));

      const { error: dbError } = await supabase
        .from('connected_tasks')
        .insert(insertPayload);

      if (dbError) throw dbError;

      // 2. Trigger backend notification if needed
      if (requestId) {
        await fetch(apiUrl('/workflow/start'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, department: state.department })
        }).catch(console.error);
      }

      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Success Feedback
      if (onTaskAssigned) {
        onTaskAssigned(state.department);
      }
    } catch (err: any) {
      console.error('Task Assignment Error:', err);
      alert(`Error assigning tasks: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      handleCloseModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={handleCloseModal}
      />

      <div className="relative w-full max-w-lg bg-[#121214] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {state.step === 1 ? 'Select Department' : `Assign to ${state.department}`}
            </h2>
            <p className="text-slate-400 text-sm">
              {state.step === 1 ? 'Choose the department for this assignment.' : 'Fill in the details below.'}
            </p>
          </div>
          <button 
            onClick={handleCloseModal}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <IconClose />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Step 1: Department Selection Modal */}
          {state.step === 1 && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => handleSelectDepartment(dept)}
                  className="group flex flex-col items-center justify-center p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl transition-all hover:bg-indigo-600/10 hover:border-indigo-500/50 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-slate-700 transition-colors mb-3">
                    <DepartmentIcon type={dept} />
                  </div>
                  <span className="font-semibold text-slate-300 group-hover:text-white">{dept}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Task Assignment Modal (Dynamic Form) */}
          {state.step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              {/* Dynamic Fields */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Department Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  {DEPARTMENT_FIELDS[state.department]?.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={state.formData[field.name] || ''}
                        onChange={(e) => handleFormChange(field.name, e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-200 placeholder:text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Specific Tasks</h3>
                  <span className="text-[10px] text-slate-600">Add one or more steps</span>
                </div>
                
                <div className="space-y-3">
                  {state.tasks.map((task, index) => (
                    <div key={index} className="flex gap-2 group">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => handleTaskChange(index, e.target.value)}
                          placeholder={`Describe task ${index + 1}...`}
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-200 placeholder:text-slate-600"
                          autoFocus={index === state.tasks.length - 1 && index > 0}
                        />
                      </div>
                      {state.tasks.length > 1 && (
                        <button
                          onClick={() => handleRemoveTask(index)}
                          className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddTask}
                  className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <IconPlus />
                  Add Task
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex gap-3 shrink-0">
          {state.step === 2 && (
            <button
              onClick={() => setState(prev => ({ ...prev, step: 1 }))}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all active:scale-95"
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          
          {state.step === 2 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit to CEO'
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
