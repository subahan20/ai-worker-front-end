import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API || '' });

export async function POST(req: Request) {
  try {
    const { candidateId } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    // 1. Check if analysis already exists
    const { data: existingAnalysis, error: existingError } = await supabase
      .from('candidate_analysis')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (existingAnalysis) {
      return NextResponse.json({ success: true, analysis: existingAnalysis, cached: true });
    }

    // 2. Fetch Candidate Details
    const { data: candidate, error: candidateError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    // 3. AI Screening Core Logic (Updated Prompt)
    const prompt = `
Analyze this candidate profile for the role of ${candidate.role || 'Professional'}.

Candidate Profile:
- Name: ${candidate.parsed_name || candidate.name || 'Unknown'}
- Target Role: ${candidate.role || 'Unspecified'}
- Experience: ${candidate.parsed_experience || candidate.experience || 'Unspecified'}
- Skills: ${Array.isArray(candidate.parsed_skills) ? candidate.parsed_skills.join(', ') : 'Unspecified'}
- Resume Text (Deep Extract):
${(candidate.extracted_text || '').slice(0, 4000)}
- Resume File URL: ${candidate.resume_url || 'No file link'}

Return EXACTLY this JSON structure:
{
  "match_score": 0-100,
  "decision": "SHORTLISTED | REJECTED",
  "reason": "Detailed reason based on fit",
  "improvement": "Specific skills or areas to improve",
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "summary": "Brief professional summary"
}

RULES:
- Score >= 80 → SHORTLISTED
- Score < 80 → REJECTED
- Be critical and precise with the percentage.
`;

    const completion = await getGroq().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const aiOutput = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 4. Threshold Enforcement (Code-level safety)
    const score = parseInt(aiOutput.match_score) || 0;
    const finalDecision = score >= 80 ? 'SHORTLISTED' : 'REJECTED';

    // 5. Store AI Results — upsert to handle re-runs & constraint-safe decision values
    const safeDecision = finalDecision === 'SHORTLISTED' ? 'SHORTLISTED' : 'REJECTED';

    const analysisPayload = {
      candidate_id: candidateId,
      decision: safeDecision,
      reason: (aiOutput.reason || 'No specific reason provided.').slice(0, 500),
      improvement: (aiOutput.improvement || 'No improvement suggested.').slice(0, 500),
      match_score: score,
      matched_skills: Array.isArray(aiOutput.matched_skills) ? aiOutput.matched_skills : [],
      missing_skills: Array.isArray(aiOutput.missing_skills) ? aiOutput.missing_skills : [],
      details: {
        summary: aiOutput.summary || '',
        original_ai_decision: aiOutput.decision
      }
    };

    // Delete existing then insert (handles duplicate constraint + avoids onConflict issues)
    await supabase.from('candidate_analysis').delete().eq('candidate_id', candidateId);

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from('candidate_analysis')
      .insert([analysisPayload])
      .select()
      .single();

    if (insertError) {
      console.error('DB Insert Error:', insertError);
    }

    // 6. --- CEO CONTROLLED EXECUTION LOGIC ---
    // 1. All tasks start in 'waiting_for_ceo' state.
    // 2. NO AUTO-START. CEO must approve in dashboard.
    const initialStatus = 'waiting_for_ceo';

    const taskTitle = safeDecision === 'SHORTLISTED' 
      ? `Finalize Onboarding for ${candidate.parsed_name || candidate.name}`
      : `Send Rejection Notification to ${candidate.parsed_name || candidate.name}`;

    const taskSteps = safeDecision === 'SHORTLISTED'
      ? ["Verify Credentials", "Schedule Interview", "Prepare Contract"]
      : ["Draft Rejection", "Archive Record"];

    const { data: insertedTask, error: taskError } = await supabase
      .from('connected_tasks')
      .insert([{
        title: taskTitle,
        description: `${safeDecision} workflow for ${candidate.parsed_name || candidate.name}. Match Score: ${score}%`,
        department: 'HR',
        status: initialStatus,
        progress: 0,
        current_step: -1,
        steps: taskSteps,
        priority: safeDecision === 'SHORTLISTED' ? 'HIGH' : 'LOW',
        analysis: analysisPayload,
        application_id: candidateId
      }])
      .select()
      .single();

    if (taskError) throw taskError;

    // 8. Update Application Status
    await supabase
      .from('applications')
      .update({ status: safeDecision })
      .eq('id', candidateId);

    return NextResponse.json({ 
      success: true, 
      analysis: insertedAnalysis || analysisPayload, 
      status: initialStatus,
      message: 'HR Task queued and waiting for CEO approval.'
    });

  } catch (error: any) {
    console.error('Candidate Analysis API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
