import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API });

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    // 1. Fetch application details
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error(`Failed to fetch application: ${fetchError?.message}`);
    }

    // 2. Call Groq API to generate Evaluation & Tasks
    const prompt = `
Analyze this job application and provide two outputs:
1. A detailed candidate evaluation.
2. A list of relevant departmental tasks (HR, Sales, Operations, Marketing) to process this candidate.

Candidate Name: ${application.name}
Role Applied: ${application.role}
Department Applied: ${application.department}
Experience: ${application.experience} years
Expected Package: ${application.package}

Return ONLY valid JSON in this exact structure:
{
  "evaluation": {
    "ats_score": number (0-100),
    "status": "SHORTLISTED" | "REJECTED",
    "reasons": "String of reasons if rejected, or strengths if shortlisted",
    "strengths": ["list", "of", "strengths"],
    "improvement_plan": "Specific advice for growth",
    "interview_schedule": "Suggested time/format if shortlisted",
    "final_summary": "One paragraph comprehensive summary"
  },
  "tasks": [
    {
      "title": "Actionable task title",
      "priority": "HIGH" | "MED" | "LOW",
      "description": "One-sentence impact description",
      "department": "HR" | "Sales" | "Operations" | "Marketing",
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const aiOutput = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 3. Update application with evaluation
    if (aiOutput.evaluation) {
      await supabase
        .from('applications')
        .update({ evaluation: aiOutput.evaluation })
        .eq('id', applicationId);
    }

    // 4. --- CEO CONTROLLED EXECUTION LOGIC ---
    // 1. All tasks start in 'waiting_for_ceo' state.
    // 2. NO AUTO-START. CEO must approve in dashboard.
    const initialStatus = 'waiting_for_ceo';
    const targetDept = application.department || 'Operations';

    // Insert ONLY ONE task into database
    if (aiOutput.tasks && Array.isArray(aiOutput.tasks)) {
      const t = aiOutput.tasks[0];
      const { data: insertedTask, error: insertError } = await supabase
        .from('connected_tasks')
        .insert([{
          application_id: applicationId,
          title: t.title || `Review Application: ${application.name}`,
          priority: t.priority || 'HIGH',
          description: t.description || 'Processing application...',
          department: targetDept,
          steps: t.steps || ['Review details', 'Schedule interview', 'Make decision'],
          current_step: -1,
          status: initialStatus,
          progress: 0
        }])
        .select()
        .single();

      if (insertError) throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      evaluation: aiOutput.evaluation,
      status: initialStatus,
      message: 'Evaluation generated and waiting for CEO approval.'
    });

    return NextResponse.json({ success: true, evaluation: aiOutput.evaluation });

  } catch (error: any) {
    console.error('Process error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
