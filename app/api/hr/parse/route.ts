import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';
import * as pdf from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// CRITICAL: Disable worker for Node.js to prevent "Cannot find module 'pdf.worker.mjs'"
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API || '' });

export async function POST(req: Request) {
  console.log('--- STARTING RESUME PARSE REQUEST ---');
  try {
    const body = await req.json();
    console.log('Request Body:', body);
    const { resumeUrl, applicationId, role: targetRole } = body;

    if (!resumeUrl || !applicationId) {
      console.error('Missing required fields:', { resumeUrl, applicationId });
      return NextResponse.json({ error: 'resumeUrl and applicationId are required' }, { status: 400 });
    }

    console.log('Downloading resume from:', resumeUrl);
    // 1. Download the PDF from Supabase Storage
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to download resume from storage: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Download complete, buffer size:', buffer.length);

    console.log('Starting PDF extraction...');
    // 2. Extract Text using standard pdf-parse function
    let resumeText = '';
    try {
      const pdfParser = (pdf as any).default || pdf;
      const textResult = await pdfParser(buffer);
      resumeText = textResult.text;
      console.log('Extraction complete, text length:', resumeText.length);
    } catch (extractErr: any) {
      console.error('PDF Extraction Error:', extractErr);
      throw new Error(`PDF Extraction failed: ${extractErr.message}`);
    }

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from the resume PDF.');
    }

    // 3. AI Extraction Prompt
    const prompt = `
Extract candidate information from this resume text. 
Use your intelligence to map details to the requested JSON structure even if the formatting is complex.

Resume Text:
"""
${resumeText}
"""

Return ONLY a valid JSON object in this exact structure:
{
  "name": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "role": "Current or targeted job title",
  "experience_years": "Total years of experience (e.g. '8 Years')",
  "skills": ["Skill 1", "Skill 2"],
  "education": [
    { "degree": "Degree Name", "school": "University Name", "year": "Year" }
  ],
  "companies": ["Company A", "Company B"],
  "projects": [
    { "name": "Project Name", "description": "Brief summary" }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "summary": "Professional one-sentence summary based on resume"
}
`;

    const completion = await getGroq().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const parsedData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 4. Update Application in Supabase with parsed data
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        extracted_text: resumeText,
        parsed_name: parsedData.name || 'Unknown Candidate',
        parsed_email: parsedData.email || '',
        parsed_phone: parsedData.phone || '',
        parsed_role: targetRole || parsedData.role || 'Unspecified Role',
        parsed_experience: parsedData.experience_years || 'Unknown',
        parsed_skills: parsedData.skills || [],
        parsed_education: parsedData.education || [],
        parsed_companies: parsedData.companies || [],
        parsed_projects: parsedData.projects || [],
        parsed_certifications: parsedData.certifications || [],
        // Update legacy fields for compatibility
        name: parsedData.name || 'Unknown Candidate',
        email: parsedData.email || '',
        role: targetRole || parsedData.role || 'Unspecified Role',
        experience: parsedData.experience_years || '0'
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // 5. Trigger HR Analysis automatically after parsing
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      // Use internal fetch or background trigger
      await fetch(`${baseUrl}/api/hr/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: applicationId })
      });
    } catch (err) {
      console.warn('Auto-analysis trigger failed after parsing:', err);
    }

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('Resume Parsing Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
