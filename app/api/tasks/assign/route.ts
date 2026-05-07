import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API });

const SYSTEM_PROMPT = `You are an AI task router for a company. Analyze the task description and return a JSON object with exactly these fields:
- "department": one of "HR", "Sales", "Marketing", "Engineering", "Operations"
- "task_title": a concise 4-8 word title for the task
- "priority": one of "Low", "Medium", "High"

Department routing rules:
- HR → hiring, interviews, candidates, onboarding, recruitment, payroll, employee
- Sales → leads, outreach, deals, clients, pipeline, revenue, prospects, CRM
- Marketing → content, social media, campaigns, ads, brand, SEO, email newsletter
- Engineering → development, bugs, features, code, API, database, deployment, infrastructure
- Operations → logistics, process, support, workflow, vendor, supply chain, facilities

Respond ONLY with valid JSON, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API) {
      // Fallback: keyword-based routing when Groq key is missing
      const desc = description.toLowerCase();
      let department = 'Operations';
      let priority: 'Low' | 'Medium' | 'High' = 'Medium';

      if (/hir|recruit|interview|candidat|onboard|payroll|employee/i.test(desc)) department = 'HR';
      else if (/lead|outreach|deal|client|pipeline|revenue|prospect|crm|sales/i.test(desc)) department = 'Sales';
      else if (/content|social|campaign|ad|brand|seo|newsletter|marketing/i.test(desc)) department = 'Marketing';
      else if (/bug|feature|code|api|database|deploy|infrastructure|develop/i.test(desc)) department = 'Engineering';

      if (/urgent|critical|asap|immediately/i.test(desc)) priority = 'High';
      else if (/low|minor|whenever/i.test(desc)) priority = 'Low';

      const words = description.trim().split(' ').slice(0, 7).join(' ');
      return NextResponse.json({
        department,
        task_title: words.charAt(0).toUpperCase() + words.slice(1),
        priority,
      });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: description },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('[AI Task Assign]', error.message);
    return NextResponse.json({ error: error.message || 'AI assignment failed' }, { status: 500 });
  }
}
