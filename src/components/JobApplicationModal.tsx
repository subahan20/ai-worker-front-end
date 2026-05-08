'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import Modal from './Modal';
import { apiUrl } from '@/src/lib/api';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JobApplicationModal({ isOpen, onClose }: JobApplicationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    experience: '',
    package: ''
  });

  const [resume, setResume] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departmentRoles: Record<string, string[]> = {
    'HR': ['HR Manager', 'Recruiter', 'People Operations', 'Benefits Specialist'],
    'Sales': ['Account Executive', 'Business Development', 'Sales Manager', 'Customer Success'],
    'Operations': ['Operations Manager', 'Project Coordinator', 'Supply Chain Analyst', 'Office Administrator'],
    'Marketing': ['Digital Marketer', 'Content Strategist', 'SEO Specialist', 'Growth Lead', 'Social Media Manager']
  };

  const departments = Object.keys(departmentRoles);
  const currentRoles = formData.department ? departmentRoles[formData.department] : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset role if department changes
      role: name === 'department' ? '' : prev.role
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setStatus({ type: 'error', message: 'Please upload a PDF file' });
        e.target.value = '';
        return;
      }
      setResume(file);
      setStatus(null);
    }
  };

  const validateForm = () => {
    const { name, email, department, experience, package: pkg } = formData;
    return !!(name && email && department && experience && pkg && resume);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', department: '', role: '', experience: '', package: '' });
    setResume(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setStatus({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const fileExt = resume!.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resume!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      const { data: insertedApp, error: insertError } = await supabase
        .from('applications')
        .insert([{
          name: formData.name,
          email: formData.email,
          department: formData.department,
          role: formData.role,
          experience: parseInt(formData.experience) || 0,
          package: formData.package,
          resume_url: publicUrl,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (insertedApp?.id) {
        const parseRes = await fetch(apiUrl('/parse-resume'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeUrl: publicUrl,
            applicationId: insertedApp.id
          })
        });

        if (parseRes.ok) {
          const parsePayload = await parseRes.json().catch(() => null);
          if (parsePayload?.success && parsePayload?.data) {
            await fetch(apiUrl('/tasks/from-resume'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicationId: insertedApp.id,
                resumeUrl: publicUrl,
                parsedData: parsePayload.data,
                department: 'HR',
                title: `Resume Review: ${parsePayload.data?.name || insertedApp.name || 'Candidate'}`,
                description: 'Parsed resume details synced into tasks.',
              }),
            }).catch(console.error);
          }
        }

        fetch(apiUrl('/analysis/hr'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: insertedApp.id })
        }).catch(console.error);
      }

      setStatus({ type: 'success', message: 'Application submitted. We will contact you shortly.' });
      resetForm();
      setTimeout(() => { onClose(); }, 2500);

    } catch (error: any) {
      console.error('Submission error:', error);
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join Our Team">
      <form onSubmit={handleSubmit} className="space-y-5 pb-4">
        <p className="text-[#555] text-[9px] font-black uppercase tracking-widest italic border-b border-[#1a1a1a] pb-4">
          Enter your credentials to apply for a position within the Phaze AI ecosystem.
        </p>

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Full Name <span className="text-red-500">*</span></label>
          <input
            required
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Email Address <span className="text-red-500">*</span></label>
          <input
            required
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]"
            placeholder="john@phazeai.io"
          />
        </div>

        {/* Department & Role */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Department <span className="text-red-500">*</span></label>
            <select
              required
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-3 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Select...</option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={!formData.department}
              className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-3 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>Select...</option>
              {currentRoles.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
        </div>

        {/* Experience & Package */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Years of Experience <span className="text-red-500">*</span></label>
            <input
              required
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              placeholder="0"
              min="0"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Expected Package <span className="text-red-500">*</span></label>
            <input
              required
              name="package"
              value={formData.package}
              onChange={handleInputChange}
              className="w-full h-11 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]"
              placeholder="$80K - $120K"
            />
          </div>
        </div>

        {/* Resume Upload */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-[#444] uppercase tracking-widest">Resume (PDF) <span className="text-red-500">*</span></label>
          <div
            className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group ${resume ? 'border-orange-500/40 bg-orange-500/5' : 'border-[#1a1a1a] hover:bg-[#111]'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {resume ? (
                <>
                  <div className="w-10 h-10 bg-orange-600/20 rounded-full flex items-center justify-center text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black text-white uppercase tracking-widest truncate max-w-xs">{resume.name}</span>
                  <span className="text-[8px] text-[#444] font-bold uppercase">Click to replace</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-[#111] rounded-full flex items-center justify-center text-[#333] group-hover:text-orange-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black text-[#555] group-hover:text-white uppercase tracking-widest transition-all">Upload Resume</span>
                  <span className="text-[8px] text-[#333] font-bold uppercase">PDF · Max 5MB</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`p-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
            {status.message}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !validateForm()}
          className={`w-full py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all active:scale-[0.98] flex items-center justify-center gap-2
            ${isSubmitting || !validateForm() ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/10'}`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : 'Submit Application →'}
        </button>
      </form>
    </Modal>
  );
}
