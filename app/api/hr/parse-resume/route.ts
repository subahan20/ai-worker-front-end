import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;
    const applicationId = formData.get('applicationId') as string | null;

    if (!file || !applicationId) {
      return NextResponse.json({ error: 'resume file and applicationId are required' }, { status: 400 });
    }

    // 1. Extract text from PDF using pdf-parse
    let extractedText = '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Use require to avoid ESM/CJS .default mismatch
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParseModule = require('pdf-parse');
      const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || '';
    } catch (pdfErr) {
      console.warn('PDF parse failed, using empty text:', pdfErr);
      extractedText = '';
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from the PDF. Please ensure the resume is not scanned/image-only.' },
        { status: 422 }
      );
    }

    // 2. Send extracted text to Groq for full structured AI analysis
    const prompt = `
You are an expert HR recruiter and talent evaluator. Analyze the following resume text and return a detailed hiring evaluation.

RESUME TEXT:
---
${extractedText.slice(0, 6000)}
---

Return ONLY valid JSON (no markdown, no extra text):
{
  "candidate_name": "Full name extracted from resume",
  "email": "Email if found, else null",
  "phone": "Phone if found, else null",
  "role": "Primary role/profession (e.g. Frontend Developer, Data Scientist)",
  "years_experience": "Estimated years of experience as a number string e.g. '5'",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "education": "Highest qualification and institution",
  "companies": ["Company1", "Company2"],
  "certifications": ["cert1"],
  "match_score": 75,
  "decision": "SHORTLISTED or REJECTED",
  "summary": "2-3 sentence professional summary of the candidate",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "improvement_suggestions": ["Suggestion 1", "Suggestion 2"],
  "recommended_department": "Best department fit: HR, Sales, Marketing, Developer, Finance, or Operations",
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "interview_questions": ["Question 1?", "Question 2?", "Question 3?"]
}

STRICT RULES:
- match_score >= 80 = SHORTLISTED, < 80 = REJECTED
- Be critical and precise with the score
- Extract real data only from the resume text
- Never fabricate information
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const ai = JSON.parse(completion.choices[0]?.message?.content || '{}');

    const score = Math.min(100, Math.max(0, parseInt(ai.match_score) || 0));
    // Always use exact values the DB constraint allows
    const decision: 'SHORTLISTED' | 'REJECTED' = score >= 80 ? 'SHORTLISTED' : 'REJECTED';

    // 3. Update applications table with parsed resume data
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        extracted_text: extractedText.slice(0, 10000),
        parsed_name: ai.candidate_name || null,
        parsed_email: ai.email || null,
        parsed_phone: ai.phone || null,
        parsed_role: ai.role || null,
        parsed_experience: ai.years_experience || null,
        parsed_skills: Array.isArray(ai.skills) ? ai.skills : [],
        parsed_education: ai.education || null,
        parsed_companies: Array.isArray(ai.companies) ? ai.companies : [],
      })
      .eq('id', applicationId);

    if (updateError) {
      console.warn('Failed to update parsed fields (columns may not exist yet):', updateError.message);
    }

    // 4. Insert into candidate_analysis (delete existing first for clean re-run)
    const improvementText = Array.isArray(ai.improvement_suggestions)
      ? ai.improvement_suggestions.join('. ').slice(0, 500)
      : String(ai.improvement_suggestions || '').slice(0, 500);

    const analysisPayload = {
      candidate_id: applicationId,
      decision,  // always exactly 'SHORTLISTED' or 'REJECTED'
      reason: (ai.summary || 'Resume analyzed by AI').slice(0, 500),
      improvement: improvementText,
      match_score: score,
      matched_skills: Array.isArray(ai.matched_skills) ? ai.matched_skills : (Array.isArray(ai.skills) ? ai.skills.slice(0, 4) : []),
      missing_skills: Array.isArray(ai.missing_skills) ? ai.missing_skills : [],
      details: {
        summary: ai.summary || '',
        strengths: Array.isArray(ai.strengths) ? ai.strengths : [],
        weaknesses: Array.isArray(ai.weaknesses) ? ai.weaknesses : [],
        improvement_suggestions: Array.isArray(ai.improvement_suggestions) ? ai.improvement_suggestions : [],
        recommended_department: ai.recommended_department || '',
        interview_questions: Array.isArray(ai.interview_questions) ? ai.interview_questions : [],
        education: ai.education || '',
        companies: Array.isArray(ai.companies) ? ai.companies : [],
        certifications: Array.isArray(ai.certifications) ? ai.certifications : [],
        candidate_name: ai.candidate_name || '',
        email: ai.email || '',
        phone: ai.phone || '',
      },
    };

    // Delete existing record first, then insert fresh
    await supabase.from('candidate_analysis').delete().eq('candidate_id', applicationId);

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from('candidate_analysis')
      .insert([analysisPayload])
      .select()
      .single();

    if (insertError) {
      console.error('Analysis insert error:', insertError.message, '| Code:', insertError.code);
      // Return the analysis to UI anyway — user sees real data even if DB save failed
      return NextResponse.json({
        success: true,
        analysis: { id: crypto.randomUUID(), ...analysisPayload },
        parsed: { name: ai.candidate_name, role: ai.role, score, decision },
        db_error: insertError.message,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: insertedAnalysis,
      parsed: {
        name: ai.candidate_name,
        role: ai.role,
        score,
        decision,
      },
    });

  } catch (error: any) {
    console.error('Resume Parse API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
