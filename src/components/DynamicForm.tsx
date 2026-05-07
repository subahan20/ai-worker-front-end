'use client';

import React from 'react';

interface DynamicFormProps {
  department: string;
  formData: any;
  setFormData: (data: any) => void;
}

export default function DynamicForm({ department, formData, setFormData }: DynamicFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full bg-[#080808] border border-[#1a1a1a] rounded-xl px-4 py-3 text-white text-xs font-medium focus:border-orange-500/50 outline-none transition-all placeholder:text-[#333]";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block";

  if (department === 'HR') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Autonomous HR Intake
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
            Upload a candidate resume. Our AI will automatically parse the full name, role, experience, skills, and education to build a strategic talent profile.
          </p>
          
          <div>
            <label className={labelClass}>Select Target Role (Optional)</label>
            <select name="role" onChange={handleChange} className={inputClass}>
              <option value="">Auto-Detect from Resume</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="UI/UX Designer">UI/UX Designer</option>
              <option value="Product Manager">Product Manager</option>
              <option value="AI Engineer">AI Engineer</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className={labelClass}>Upload Resume (PDF/DOCX)</label>
          <div className="relative group">
            <input 
              type="file" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormData((prev: any) => ({ 
                    ...prev, 
                    resumeFile: file,
                    resumeFileName: file.name 
                  }));
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`flex flex-col items-center justify-center gap-4 ${inputClass} border-dashed border-[#333] hover:border-purple-500/50 group-hover:bg-purple-500/5 transition-all py-10`}>
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📄
              </div>
              <div className="text-center">
                <span className="text-white text-[10px] font-black uppercase tracking-widest block mb-1">
                  {formData.resumeFileName || 'Drop Resume Here'}
                </span>
                <span className="text-[#444] text-[9px] font-bold uppercase tracking-widest">
                  Single Source of Truth Parsing
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (department === 'Marketing') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <label className={labelClass}>Company Name</label>
          <input type="text" name="companyName" placeholder="e.g. Microsoft" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Instagram Profile Link</label>
          <input type="url" name="instagramUrl" placeholder="https://instagram.com/microsoft/" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Business Type</label>
          <input type="text" name="businessType" placeholder="e.g. SaaS, E-commerce" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Monthly Budget</label>
          <input type="text" name="budget" placeholder="e.g. $5,000" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Main Competitors</label>
          <input type="text" name="competitors" placeholder="e.g. Competitor A, Competitor B" onChange={handleChange} className={inputClass} required />
        </div>
      </div>
    );
  }

  if (department === 'Operations') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <label className={labelClass}>Task Type</label>
          <input type="text" name="taskType" placeholder="e.g. Process Setup" onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Required Tools</label>
          <input type="text" name="tools" placeholder="e.g. Notion, Slack" onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Deadline</label>
          <input type="date" name="deadline" onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select name="priority" onChange={handleChange} className={inputClass}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>
    );
  }

  if (department === 'Sales') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <label className={labelClass}>Instagram Profile Link (or Website)</label>
          <input type="url" name="profileLink" placeholder="https://instagram.com/..." onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Business Type</label>
          <input type="text" name="businessType" placeholder="e.g. E-commerce, SaaS, Agency" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Target Audience</label>
          <input type="text" name="targetAudience" placeholder="e.g. Small Business Owners, Gen Z" onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Product/Service Description</label>
          <textarea name="description" placeholder="Describe what you sell..." onChange={handleChange} className={`${inputClass} min-h-[100px]`} required />
        </div>
      </div>
    );
  }

  if (department === 'Engineering') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <label className={labelClass}>Request Type</label>
          <select name="type" onChange={handleChange} className={inputClass}>
            <option value="Feature">Feature Request</option>
            <option value="Bug">Bug Fix</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Tech Stack</label>
          <input type="text" name="stack" placeholder="e.g. Next.js, Supabase" onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Repo Link</label>
          <input type="text" name="repo" placeholder="github.com/..." onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Deadline</label>
          <input type="date" name="deadline" onChange={handleChange} className={inputClass} />
        </div>
      </div>
    );
  }

  if (department === 'Finance') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <label className={labelClass}>Financial Data Type</label>
          <select name="dataType" onChange={handleChange} className={inputClass}>
            <option value="">Select Type</option>
            <option value="Revenue">Revenue & Sales</option>
            <option value="Expenses">Operating Expenses</option>
            <option value="Burn">Burn Rate & Runway</option>
            <option value="Investments">Investments & Funding</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Key Metric / Value</label>
          <input type="text" name="metric" placeholder="e.g. $50,000 monthly burn" onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Financial Notes</label>
          <textarea name="notes" placeholder="Enter financial details for analysis..." onChange={handleChange} className={`${inputClass} min-h-[100px]`} />
        </div>
      </div>
    );
  }

  return null;
}
