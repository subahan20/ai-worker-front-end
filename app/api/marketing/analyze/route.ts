import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.GROQ_API,
});

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    // 1. Fetch reels for this user
    const { data: reels, error: reelError } = await supabase
      .from('marketing_reels')
      .select('*')
      .eq('username', username);

    if (reelError) throw reelError;
    if (!reels || reels.length === 0) {
      return NextResponse.json({ error: 'No reels found for analysis' }, { status: 404 });
    }

    // 2. Internally detect viral reels (Sorted by views)
    const viralReels = [...reels].sort((a, b) => b.views - a.views).slice(0, 2);

    // 3. Prepare AI Prompt
    const prompt = `
      You are an elite Instagram Marketing Strategist. Analyze these viral reels and generate a comprehensive growth report.
      
      USER: ${username}
      VIRAL REELS DATA: ${JSON.stringify(viralReels)}

      REQUIREMENTS:
      - Content must be professional, actionable, and 100% dynamic.
      - Identify the specific "hooks" used in the viral reels.
      - Generate 3 new content ideas with scripts and captions.
      - Suggest specific CTA (Call to Action) strategies.

      RETURN JSON STRUCTURE:
      {
        "viral_patterns": {
          "hook_analysis": "What makes their hooks work?",
          "engagement_style": "How do they interact with comments?",
          "visual_patterns": "Thumbnails, lighting, text-overlays."
        },
        "content_strategy": {
          "new_ideas": [
            {
              "title": "Idea Title",
              "script": "Detailed 60s script",
              "caption": "Viral-ready caption",
              "hook": "The opening line",
              "cta": "Specific CTA"
            }
          ]
        },
        "execution_summary": "Overall growth thesis for this account."
      }
    `;

    // 4. Generate AI Analysis via Groq
    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const analysisContent = JSON.parse(aiResponse.choices[0].message.content || '{}');

    // 5. Store AI Report in Database
    const { data: report, error: reportError } = await supabase
      .from('marketing_ai_reports')
      .insert({
        username,
        viral_reels: viralReels,
        viral_patterns: analysisContent.viral_patterns,
        content_strategy: analysisContent.content_strategy,
        raw_analysis: aiResponse.choices[0].message.content,
        execution_summary: analysisContent.execution_summary
      })
      .select()
      .single();

    if (reportError) throw reportError;

    return NextResponse.json({ 
      message: 'Analysis complete', 
      report 
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
