import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

// Initialize Groq with the key from .env
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API || '' });

export async function POST(req: Request) {
  try {
    const { formData } = await req.json();
    const { profileLink, businessType, targetAudience, description } = formData;

    if (!profileLink || !businessType || !targetAudience || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Store the initial business plan in Supabase
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .insert([{
        department: 'Sales',
        profile_link: profileLink,
        business_type: businessType,
        target_audience: targetAudience,
        description: description
      }])
      .select()
      .single();

    if (planError) throw planError;
    const planId = planData.id;

    // 2. Call Groq AI to generate insights and leads
    const prompt = `
      You are a high-level Sales Strategy Agent. Analyze this business profile:
      
      - Profile Link: ${profileLink}
      - Business Type: ${businessType}
      - Target Audience: ${targetAudience}
      - Description: ${description}

      Task: Generate a strategic business analysis and a list of qualified leads.
      
      You MUST return ONLY a valid JSON object with the following structure:
      {
        "overview": "Detailed business analysis summary",
        "target_customers": "Who specifically to target and why",
        "strategy": "Step-by-step sales engagement roadmap",
        "leads": [
          {
            "name": "Potential Customer/Company Name",
            "platform": "Instagram | LinkedIn | Website",
            "profile_link": "Link to profile",
            "reason": "Specific strategic reason why this is a high-value lead"
          }
        ]
      }
    `;

    const completion = await getGroq().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const aiData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 3. Store the strategic insights
    const { error: insightError } = await supabase
      .from('sales_insights')
      .insert([{
        plan_id: planId,
        overview: aiData.overview,
        target_customers: aiData.target_customers,
        strategy: aiData.strategy
      }]);

    if (insightError) throw insightError;

    // 4. Store the dynamically generated leads
    if (aiData.leads && aiData.leads.length > 0) {
      const leadsToInsert = aiData.leads.map((l: any) => ({
        plan_id: planId,
        name: l.name,
        platform: l.platform,
        profile_link: l.profile_link,
        reason: l.reason,
        status: 'New'
      }));

      const { error: leadsError } = await supabase
        .from('sales_leads')
        .insert(leadsToInsert);

      if (leadsError) throw leadsError;
    }

    // --- CEO CONTROLLED EXECUTION LOGIC ---
    // 1. All tasks start in 'waiting_for_ceo' state.
    // 2. NO AUTO-START. CEO must approve in dashboard.
    const initialStatus = 'waiting_for_ceo';

    // 2. Insert task with calculated status
    const { data: insertedTask, error: insertError } = await supabase
      .from('connected_tasks')
      .insert([{
        title: `Sales Lead Generation: ${businessType}`,
        description: `Targeting: ${targetAudience}. Strategy: ${aiData.overview.slice(0, 100)}...`,
        department: 'Sales',
        status: initialStatus,
        progress: 0,
        steps: [
          "Validate target leads",
          "Enrich lead contact info",
          "Draft personalized outreach",
          "Queue for Sales sequence"
        ],
        priority: 'MEDIUM',
        analysis: aiData
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      planId, 
      status: initialStatus,
      message: 'Sales Task queued and waiting for CEO approval.'
    });

  } catch (error: any) {
    console.error('Sales AI Agent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
