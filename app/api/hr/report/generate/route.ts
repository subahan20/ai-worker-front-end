import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API });

export async function POST(req: Request) {
  try {
    const { force } = await req.json().catch(() => ({ force: false }));

    // 1. Fetch candidates with full analysis
    let query = supabase
      .from('applications')
      .select('*, candidate_analysis!inner(*)')
      .order('created_at', { ascending: false });

    // If not forced, only include shortlisted candidates
    if (!force) {
      query = query.eq('candidate_analysis.decision', 'SHORTLISTED');
    }

    const { data: shortlisted, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!shortlisted || shortlisted.length === 0) {
      return NextResponse.json({ 
        success: true, 
        report: null,
        message: 'No shortlisted candidates available to report yet.' 
      });
    }

    // 2. Prepare data for AI — Extract rich details from candidate_analysis
    const candidateList = shortlisted
      .filter(c => c.candidate_analysis && c.candidate_analysis.length > 0)
      .map(c => {
        const analysis = c.candidate_analysis[0];
        const details = analysis.details || {};
        return {
          id: c.id,
          name: c.parsed_name || c.name,
          role: c.parsed_role || c.role,
          score: analysis.match_score || 0,
          reason: analysis.reason || 'No specific reason provided.',
          summary: details.summary || '',
          strengths: details.strengths || analysis.matched_skills || [],
          weaknesses: details.weaknesses || analysis.missing_skills || [],
          improvements: details.improvement_suggestions || [analysis.improvement].filter(Boolean)
        };
      });

    if (candidateList.length === 0) {
      return NextResponse.json({ 
        success: true, 
        report: null,
        message: 'Candidates found, but none have completed AI analysis yet.' 
      });
    }

    // 3. AI Prompt for CEO Email — Strategically summarize talent
    const prompt = `
Generate a professional HR Talent Intelligence update for the CEO.
The goal is to present the current top-tier candidates and a strategic hiring roadmap.

Shortlisted Candidates:
${JSON.stringify(candidateList, null, 2)}

Requirements:
1. Create a compelling, executive subject line.
2. Write a professional email body.
3. Include a "Strategic Summary" section for the CEO.
4. Highlight why these specific candidates were chosen.
5. Suggest immediate next steps for the board.

Return ONLY a JSON object:
{
  "subject": "Executive Talent Intelligence Update: [Key Insight]",
  "email_body": "Full professional email text...",
  "shortlisted_summary": "One paragraph summarizing the overall quality of current talent pool.",
  "strategic_roadmap": ["Step 1", "Step 2", "Step 3"]
}
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const aiOutput = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 4. Store the report with enriched metadata
    const { data: report, error: saveError } = await supabase
      .from('hr_reports')
      .insert([{
        subject: aiOutput.subject,
        email_body: aiOutput.email_body,
        shortlisted_candidates: candidateList,
        details: {
          summary: aiOutput.shortlisted_summary,
          roadmap: aiOutput.strategic_roadmap
        }
      }])
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ success: true, report });

  } catch (error: any) {
    console.error('HR Report API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('hr_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST204') {
        return NextResponse.json({ success: true, report: null });
      }
      throw error;
    }

    return NextResponse.json({ success: true, report: data || null });
  } catch (error: any) {
    console.error('HR Report GET Error:', error.message);
    return NextResponse.json({ success: true, report: null });
  }
}
