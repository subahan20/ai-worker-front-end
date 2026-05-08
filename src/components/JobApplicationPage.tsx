'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import Modal from './Modal';
import { apiUrl } from '@/src/lib/api';

export default function JobApplicationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const departments = ['HR', 'Engineering', 'Marketing', 'Sales'];
  const roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Designer'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    const { name, email, department, role, experience, package: pkg } = formData;
    if (!name || !email || !department || !role || !experience || !pkg || !resume) {
      return false;
    }
    return true;
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
      // 1. Upload Resume to Supabase Storage
      const fileExt = resume!.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resume!);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // 3. Store Application Data in Supabase Table
      const { data: insertedApp, error: insertError } = await supabase
        .from('applications')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            department: formData.department,
            role: formData.role,
            experience: parseInt(formData.experience) || 0,
            package: formData.package,
            resume_url: publicUrl,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 4a. Parse resume on backend
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
              })
            }).catch(console.error);
          }
        }
      }

      // 4b. Run HR analysis on backend (fire-and-forget)
      if (insertedApp?.id) {
        fetch(apiUrl('/analysis/hr'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: insertedApp.id })
        }).catch(console.error);
      }

      // Success
      setStatus({ type: 'success', message: 'Application submitted successfully! Our team will contact you soon.' });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        department: '',
        role: '',
        experience: '',
        package: ''
      });
      setResume(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Close modal after delay
      setTimeout(() => {
        setIsModalOpen(false);
        setStatus(null);
      }, 3000);

    } catch (error: any) {
      console.error('Submission error:', error);
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d1d1] font-sans selection:bg-orange-500/30">
      <header className="max-w-7xl mx-auto flex items-center justify-between py-8 px-6 md:px-12 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
            <span className="text-white text-xl font-bold italic">P</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Phaze AI <span className="text-[#555]">Business OS</span>
          </h1>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/10 active:scale-95"
        >
          Apply Now
        </button>
      </header>

      {/* Main Content */}
      <main className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-[120px] -z-10 animate-pulse delay-1000" />

        <div className="max-w-6xl mx-auto py-24 md:py-32 px-6 flex flex-col items-center text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/5 border border-orange-500/10 rounded-full text-orange-500 text-[10px] font-black uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Active Roles Available
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tighter italic uppercase">
            Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">future</span> of business
          </h2>
          
          <p className="text-lg text-[#888] max-w-2xl mx-auto leading-relaxed font-medium">
            Join the team redefining autonomous orchestration. We're looking for world-class talent to build the core of Phaze AI.
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black hover:bg-[#eee] px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              Start Application
            </button>
            <button className="bg-[#0f0f0f] border border-[#1a1a1a] text-[#888] hover:text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
              Open Positions
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-20 w-full">
            {[
              { label: 'Founded', value: '2024' },
              { label: 'Scale', value: 'Global' },
              { label: 'Revenue', value: '$10M+' },
              { label: 'Speed', value: '∞' },
            ].map((stat, i) => (
              <div key={i} className="p-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2rem] hover:border-[#333] transition-all">
                <div className="text-3xl font-bold text-white mb-1 italic tracking-tighter">{stat.value}</div>
                <div className="text-[10px] font-black text-[#555] uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal with Form */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setStatus(null);
          }
        }} 
        title="Join Our Team"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          <p className="text-[#555] text-[10px] font-black uppercase tracking-widest mb-6 italic">
            Enter your credentials to apply for a position within the Phaze AI ecosystem.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Full Name</label>
              <input 
                required 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]" 
                placeholder="JOHN DOE" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Email Address</label>
              <input 
                required 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]" 
                placeholder="DOE@PHAZEAI.IO" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Department</label>
                <select 
                  required 
                  name="department" 
                  value={formData.department} 
                  onChange={handleInputChange} 
                  className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>SELECT DEPARTMENT</option>
                  {departments.map(dept => <option key={dept} value={dept}>{dept.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Role Applying For</label>
                <select 
                  required 
                  name="role" 
                  value={formData.role} 
                  onChange={handleInputChange} 
                  className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>SELECT ROLE</option>
                  {roles.map(role => <option key={role} value={role}>{role.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Years of Experience</label>
                <input 
                  required 
                  type="number" 
                  name="experience" 
                  value={formData.experience} 
                  onChange={handleInputChange} 
                  className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                  placeholder="0" 
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Expected Package</label>
                <input 
                  required 
                  name="package" 
                  value={formData.package} 
                  onChange={handleInputChange} 
                  className="w-full h-12 bg-[#050505] border border-[#1a1a1a] rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-[#333]" 
                  placeholder="E.G. $120K" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#444] uppercase tracking-widest">Resume (PDF)</label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group ${resume ? 'border-orange-500/50 bg-orange-500/5' : 'border-[#1a1a1a] hover:bg-[#111]'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  required 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-3">
                  {resume ? (
                    <>
                      <div className="w-12 h-12 bg-orange-600/20 rounded-full flex items-center justify-center text-orange-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{resume.name}</span>
                      <span className="text-[9px] font-bold text-[#444] uppercase tracking-tighter">Click to replace document</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-[#111] rounded-full flex items-center justify-center text-[#333] group-hover:text-orange-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black text-[#555] group-hover:text-white uppercase tracking-widest transition-all">Upload Resume Database</span>
                      <span className="text-[9px] font-bold text-[#333] uppercase tracking-tighter">PDF FORMAT ONLY · MAX 5MB</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              {status.message}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting || !validateForm()}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3
              ${isSubmitting ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/10 hover:shadow-orange-600/20'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Submit Application →'}
          </button>
        </form>
      </Modal>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-[#1a1a1a] py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-500 font-bold text-sm">P</div>
            <span className="font-bold text-white tracking-tight">Phaze AI</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-[#444]">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookie</a>
          </div>
          <div className="text-[10px] font-bold text-[#333] uppercase tracking-widest">
            © 2024 Phaze AI OS. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #222;
        }
        input::placeholder {
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
