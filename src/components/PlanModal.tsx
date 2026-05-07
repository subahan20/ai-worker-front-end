'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import DynamicForm from './DynamicForm';
import { useToast } from './Toast';
import { supabase } from '@/src/lib/supabase';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated?: () => void;
}

export default function PlanModal({ isOpen, onClose, onPlanCreated }: PlanModalProps) {
  const [department, setDepartment] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const departments = ['HR', 'Marketing', 'Operations', 'Sales', 'Finance', 'Engineering'];

  const handleSubmit = async () => {
    if (!department) return;
    
    setIsSubmitting(true);
    try {
      let finalFormData = { ...formData };

      // SPECIAL CASE: HR Resume Parsing
      if (department === 'HR' && formData.resumeFile) {
        addToast('📤 Uploading Resume...', 'info');
        
        const file = formData.resumeFile;
        if (!(file instanceof File)) {
          throw new Error('Invalid file object. Please select a valid PDF or DOCX file.');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(fileExt || '')) {
          throw new Error(`Unsupported file type: ${fileExt}. Please upload a PDF or Word document.`);
        }

        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `resumes/${fileName}`;

        // 1. Upload to Supabase Storage
        if (!supabase.storage) {
          throw new Error('Supabase Storage client is not initialized. Check your environment variables.');
        }
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);

        // 2. Create Initial Application Record
        const { data: application, error: appError } = await supabase
          .from('applications')
          .insert([{
            name: 'Processing...',
            email: 'parsing@ai.com',
            role: formData.role || 'Unspecified Role',
            experience: '0',
            resume_url: publicUrl,
            department: 'HR'
          }])
          .select()
          .single();

        if (appError) {
          console.error('Database Insertion Error:', appError);
          throw new Error(`Failed to create application record: ${appError.message}`);
        }

        if (!application || !application.id) {
          throw new Error('Database returned empty application record after insertion.');
        }

        // 3. Trigger Autonomous Parsing API (SERVER-SIDE ONLY)
        addToast('🤖 AI is parsing resume...', 'info');
        const parseRes = await fetch('/api/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            resumeUrl: publicUrl, 
            applicationId: application.id
          })
        });

        if (!parseRes.ok) {
          const errorText = await parseRes.text();
          let errorMessage = 'Parsing failed';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            const match = errorText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || 
                          errorText.match(/<title>([\s\S]*?)<\/title>/i);
            errorMessage = match ? match[1] : `Server Error (${parseRes.status})`;
          }
          throw new Error(`Parsing API Error: ${errorMessage}`);
        }

        addToast('✅ Resume parsed and candidate profile created!', 'success');
      } else if (department === 'Marketing') {
        // SPECIAL CASE: Marketing Task Creation
        const { error: taskError } = await supabase
          .from('tasks')
          .insert([{
            title: `Instagram Viral Audit: ${formData.companyName}`,
            description: `Autonomous audit of ${formData.instagramUrl} to extract viral patterns and content ideas.`,
            department: 'Marketing',
            type: 'Marketing',
            priority: 'High',
            status: 'waiting_for_ceo',
            metadata: {
              company_name: formData.companyName,
              instagram_url: formData.instagramUrl,
              business_type: formData.businessType,
              budget: formData.budget,
              competitors: formData.competitors
            }
          }]);

        if (taskError) throw taskError;
        addToast('🚀 Marketing Task queued for CEO approval!', 'success');
      } else {
        // STANDARD CASE: Other Departments
        const endpoint = department === 'Sales' ? '/api/sales/analyze' : '/api/plan/generate';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department, formData: finalFormData })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Unknown error');
        }
        
        addToast(`✅ AI Strategic Plan for ${department} generated successfully!`, 'success');
      }

      // Finalize
      setTimeout(() => {
        onPlanCreated?.();
        onClose();
        setDepartment('');
        setFormData({});
      }, 800);

    } catch (err: any) {
      // CONSOLIDATED HIGH-VISIBILITY LOGGING
      const errorReport = `
🚨 --- PLAN CREATION ERROR ---
Type: ${typeof err}
Name: ${err.name || 'N/A'}
Message: ${err.message || 'N/A'}
Code: ${err.code || 'N/A'}
Hint: ${err.hint || 'N/A'}
Stack: ${err.stack || 'N/A'}
Full Object: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}
-------------------------------`;
      
      console.error(errorReport);
      
      let errorMessage = err.message || 'An unknown error occurred.';
      addToast(`❌ Error: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create AI Strategic Plan">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
            Select Department
          </label>
          <div className="grid grid-cols-3 gap-2">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => { setDepartment(dept); setFormData({}); }}
                className={`py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all
                  ${department === dept 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-[#080808] border-[#1a1a1a] text-slate-500 hover:border-[#333]'}`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {department && (
          <div className="border-t border-[#1a1a1a] pt-6">
            <DynamicForm 
              department={department} 
              formData={formData} 
              setFormData={setFormData} 
            />
          </div>
        )}

        <div className="pt-6 border-t border-[#1a1a1a] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-[#151515] hover:bg-[#222] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!department || isSubmitting}
            className="flex-1 py-3.5 bg-white text-black hover:bg-orange-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Processing...
              </>
            ) : 'Generate Plan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
