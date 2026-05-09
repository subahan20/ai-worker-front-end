'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import DynamicForm from './DynamicForm';
import { useToast } from './Toast';
import { supabase } from '@/src/lib/supabase';
import { apiUrl } from '@/src/lib/api';
import { formatInstagramProfileLabel } from '@/src/lib/instagram';

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
        addToast('📤 Uploading Resume...', 'loading');
        
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
            name: null,
            email: null,
            role: formData.role?.trim() || '',
            experience: null,
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
        addToast('🤖 AI is parsing resume...', 'loading');
        const parseRes = await fetch(apiUrl('/parse-resume'), {
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

        const parsePayload = await parseRes.json().catch(() => null);
        if (!parsePayload?.success || !parsePayload?.data) {
          throw new Error('Parsed resume payload is missing');
        }

        // Persist parser output into tasks as the single dashboard source.
        const taskSyncRes = await fetch(apiUrl('/tasks/from-resume'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: application.id,
            resumeUrl: publicUrl,
            parsedData: parsePayload.data,
            department: 'HR',
            title: `Resume Review: ${parsePayload.data?.name || 'Candidate'}`,
            description: 'Parsed resume details synced into tasks.',
          }),
        });
        if (!taskSyncRes.ok) {
          const taskErr = await taskSyncRes.json().catch(() => ({}));
          throw new Error(taskErr.error || 'Failed to sync parsed data to tasks');
        }

        // 4. Trigger HR analysis so candidate-linked HR tasks are created with profile context.
        const analyzeRes = await fetch(apiUrl('/analysis/hr'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: application.id })
        });

        if (!analyzeRes.ok) {
          const analyzeErr = await analyzeRes.json().catch(() => ({}));
          throw new Error(analyzeErr.error || 'Candidate analysis failed');
        }

        addToast('✅ Resume parsed and candidate profile created!', 'success');
      } else if (department === 'Marketing') {
        // SPECIAL CASE: Marketing Task Creation (must use backend /tasks so TaskQueue sees it)
        const igWho =
          formatInstagramProfileLabel(formData.instagramUrl) ||
          String(formData.companyName || '').trim() ||
          'this profile';
        const res = await fetch(apiUrl('/tasks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Instagram presence review: ${formData.companyName}`,
            description: `Review ${igWho} on Instagram to surface what resonates with your audience, where momentum is building, and which creative directions deserve the next sprint of focus.`,
            department: 'Marketing',
            priority: 'HIGH',
            details: {
              company_name: formData.companyName,
              instagram_url: formData.instagramUrl,
              business_type: formData.businessType,
              budget: formData.budget,
              competitors: formData.competitors
            }
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create marketing task');
        }
        addToast('Marketing plan added to your queue for review.', 'success');
      } else {
        // STANDARD CASE: Other Departments
        const endpoint = department === 'Sales' ? apiUrl('/sales/analyze') : apiUrl('/plan/generate');
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
