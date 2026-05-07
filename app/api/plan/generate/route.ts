import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API });

export async function POST(req: Request) {
  try {
    const { department, formData } = await req.json();

    if (!department || !formData) {
      return NextResponse.json({ error: 'Department and Form Data required' }, { status: 400 });
    }

    let departmentPrompt = '';

    switch (department) {
      case 'HR':
        departmentPrompt = `
          Analyze the candidate's details. You must act as an Expert HR Director.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "decision": "Shortlisted | Rejected",
              "reason": "Clear professional reason",
              "improvement": "One specific piece of feedback for the candidate",
              "next_step": "Schedule Interview | Keep in Talent Pool",
              "summary": "Executive summary for the CEO",
              "pros": ["Strength 1", "Strength 2"],
              "cons": ["Weakness 1", "Weakness 2"]
            },
            "tasks": [
              {"title": "Schedule HR Interview", "priority": "High", "description": "Automated recruitment workflow trigger", "steps": ["Check calendar", "Send invite"]}
            ]
          }
        `;
        break;
      case 'Marketing':
        departmentPrompt = `
          Analyze the marketing profile. You must act as a Viral Growth Hacker.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "overview": "Analysis of the brand/profile performance",
              "insights": "Patterns identified from successful posts",
              "new_content_ideas": ["Idea 1", "Idea 2", "Idea 3"]
            },
            "top_posts": [
              {
                "link": "https://example.com/post/1",
                "platform": "Instagram",
                "reason": "Why this specific format works"
              }
            ],
            "tasks": [
              {"title": "Draft Viral Scripts", "priority": "Medium", "description": "Based on the new content ideas", "steps": ["Write Hook", "Write Value", "Write CTA"]}
            ]
          }
        `;
        break;
      case 'Sales':
        departmentPrompt = `
          Analyze the business and market. You must act as a Lead Generation Specialist.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "market_summary": "High-level market landscape analysis",
              "target_customers": "Detailed ideal customer profile",
              "outreach_strategy": "The exact script or method to contact these leads"
            },
            "leads": [
              {
                "name": "Target Company/Profile Name",
                "platform": "Instagram | LinkedIn",
                "profile_link": "https://example.com/profile",
                "reason": "Strategic fit for the product"
              }
            ],
            "tasks": [
              {"title": "Cold Outreach Sequence", "priority": "High", "description": "Execute the first contact phase", "steps": ["Send initial DM", "Follow up in 48h"]}
            ]
          }
        `;
        break;
      case 'Operations':
        departmentPrompt = `
          Analyze the workflow/process. You must act as an Operations Consultant.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "summary": "Operational health overview",
              "inefficiencies": ["Inefficiency 1", "Inefficiency 2"],
              "improvements": ["Improvement 1", "Improvement 2"],
              "execution_steps": ["Step 1", "Step 2"]
            },
            "tasks": [
              {"title": "Implement Workflow Automation", "priority": "Medium", "description": "Fixing the identified bottlenecks", "steps": ["Select tool", "Setup triggers"]}
            ]
          }
        `;
        break;
      case 'Finance':
        departmentPrompt = `
          Analyze financial data. You must act as a CFO.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "summary": "Financial health overview",
              "score": 85,
              "highlights": ["Metric 1 is strong", "Metric 2 needs work"],
              "recommendations": ["Optimize burn", "Increase runway"]
            },
            "tasks": [
              {"title": "Audit Monthly Burn", "priority": "High", "description": "Identify cost-cutting opportunities", "steps": ["Export bank statement", "Categorize SaaS", "Cancel unused"]}
            ]
          }
        `;
        break;
      case 'Developer':
      case 'Engineering':
        departmentPrompt = `
          Analyze the technical architecture. You must act as a CTO.
          Input: ${JSON.stringify(formData)}

          Required JSON Output Structure:
          {
            "analysis": {
              "architecture_overview": "Technical health and architecture summary",
              "tech_stack": ["React", "Supabase", "Groq"],
              "scalability_plan": "How to scale this system for 10x traffic",
              "vulnerabilities": ["Critical issue 1", "Security risk 2"]
            },
            "tasks": [
              {"title": "Refactor Core Orchestrator", "priority": "High", "description": "Improve agent communication latency", "steps": ["Identify bottlenecks", "Implement caching", "Verify latency"]}
            ]
          }
        `;
        break;
    }

    const prompt = `
      You are the AI Chief Operating Officer. Analyze this ${department} request.
      
      ${departmentPrompt}
      
      REQUEST DETAILS:
      ${JSON.stringify(formData, null, 2)}
      
      CRITICAL: Return ONLY valid JSON in the specific schema defined for the department above. 
      Ensure "tasks" array contains actionable items for our AI workers.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsedResult = JSON.parse(content);
    const tasks = parsedResult.tasks || [];
    const analysis = parsedResult.analysis || null;

    // --- CEO CONTROLLED EXECUTION LOGIC ---
    // 1. All tasks start in 'waiting_for_ceo' state.
    // 2. NO AUTO-START. CEO must approve in dashboard.
    const initialStatus = 'waiting_for_ceo';

    // 3. Insert only the primary task
    const t = tasks[0] || { title: `Strategic Audit: ${department}`, priority: 'Medium', description: 'AI generated analysis', steps: ['Analyze', 'Report'] };
    
    const { data: insertedTask, error: insertError } = await supabase
      .from('connected_tasks')
      .insert([{
        title: t.title,
        department: department,
        steps: t.steps || ['Analyze', 'Report'],
        current_step: -1,
        status: initialStatus,
        progress: 0,
        priority: (t.priority || 'Medium').toUpperCase(),
        description: t.description || `AI Generated ${department} Analysis Task`,
        analysis: analysis,
        application_id: formData.candidateId || null
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Store specialized results
    if (department === 'Sales' && parsedResult.leads) {
      const { data: planData } = await supabase.from('plans').insert([{ department: 'Sales', business_type: formData.businessType, target_audience: formData.targetAudience, description: formData.description }]).select().single();
      if (planData) {
        await supabase.from('sales_insights').insert([{ plan_id: planData.id, overview: analysis.market_summary, target_customers: analysis.target_customers, strategy: analysis.outreach_strategy }]);
        const leads = parsedResult.leads.map((l: any) => ({ plan_id: planData.id, name: l.name, platform: l.platform, profile_link: l.profile_link, reason: l.reason, status: 'New' }));
        await supabase.from('sales_leads').insert(leads);
      }
    }

    return NextResponse.json({ 
      success: true, 
      status: initialStatus,
      message: 'Strategic Plan generated and waiting for CEO approval.'
    });

  } catch (error: any) {
    console.error('Plan Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
