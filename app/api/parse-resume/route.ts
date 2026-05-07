import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import Groq from 'groq-sdk';
import { supabase } from '@/src/lib/supabase';

// FORCE NODEJS RUNTIME (Required for pdf-parse/mammoth)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API || '' });

export async function POST(req: Request) {
  const reqId = Math.random().toString(36).substring(7);
  console.log(`[Parser:${reqId}] Starting autonomous extraction...`);

  try {
    const { resumeUrl, applicationId } = await req.json();

    if (!resumeUrl || !applicationId) {
      return NextResponse.json({ error: 'resumeUrl and applicationId are required' }, { status: 400 });
    }

    // 1. Validate File Type BEFORE downloading
    const urlClean = resumeUrl.split('?')[0];
    const fileExt = urlClean.split('.').pop()?.toLowerCase();
    
    const supportedTypes = ['pdf', 'docx', 'doc'];
    if (!supportedTypes.includes(fileExt || '')) {
      console.warn(`[Parser:${reqId}] Rejected unsupported file type: ${fileExt}`);
      return NextResponse.json({ 
        error: `Unsupported file type (.${fileExt}). Please upload a PDF or Word document (.docx/.doc). Images, videos, and zip files are not supported.` 
      }, { status: 400 });
    }

    // 2. Download file
    let buffer: Buffer;
    try {
      const response = await fetch(resumeUrl);
      if (!response.ok) throw new Error(`Status ${response.status}: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log(`[Parser:${reqId}] Downloaded ${buffer.length} bytes. Magic Number: ${buffer.slice(0, 4).toString()}`);
      
      // VALIDATION: Check if it's actually a PDF if fileExt is pdf
      if (fileExt === 'pdf' && buffer.slice(0, 4).toString() !== '%PDF') {
        throw new Error('File signature mismatch. The file is not a valid PDF document despite the .pdf extension.');
      }
    } catch (err: any) {
      console.error(`[Parser:${reqId}] Download/Validation Error:`, err);
      return NextResponse.json({ error: `File verification failed: ${err.message}` }, { status: 500 });
    }

    // 3. Extract Text based on type
    let extractedText = '';
    try {
      if (fileExt === 'pdf') {
        console.log(`[Parser:${reqId}] Processing PDF with PDFParse class...`);
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text;
        // Cleanup
        await parser.destroy();
      } else {
        console.log(`[Parser:${reqId}] Processing DOCX/DOC with mammoth...`);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
    } catch (err: any) {
      console.error(`[Parser:${reqId}] Extraction Library Error:`, err);
      return NextResponse.json({ 
        error: `Extraction Engine Failure: ${err.message}. This often happens with password-protected or extremely complex PDF layouts.` 
      }, { status: 500 });
    }


    if (!extractedText || extractedText.trim().length < 5) {
      console.warn(`[Parser:${reqId}] Extraction yielded empty string`);
      return NextResponse.json({ error: 'The document appears to contain no readable text. It might be an image-only scan or encrypted.' }, { status: 500 });
    }


    console.log(`[Parser:${reqId}] Extracted ${extractedText.length} chars. Triggering Groq AI...`);

    // 4. AI Deep Extraction
    try {
      const prompt = `Extract details from this resume. Return ONLY JSON. Fields: name, email, phone, role, experience_years, skills, education, companies, projects. \n\nText:\n${extractedText.slice(0, 10000)}`;

      const completion = await getGroq().chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      const parsedData = JSON.parse(completion.choices[0]?.message?.content || '{}');
      console.log(`[Parser:${reqId}] AI Analysis Complete for: ${parsedData.name || 'Unknown'}`);
      
      // 5. Atomic Update to Supabase
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          parsed_name: parsedData.name,
          parsed_email: parsedData.email,
          parsed_phone: parsedData.phone,
          parsed_role: parsedData.role,
          parsed_experience: String(parsedData.experience_years || ''),
          parsed_skills: parsedData.skills,
          parsed_education: parsedData.education,
          parsed_companies: parsedData.companies,
          parsed_projects: parsedData.projects,
          extracted_text: extractedText,
          name: parsedData.name || 'Extracted Profile',
          email: parsedData.email || 'extracted@talent.ai'
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 6. Trigger Strategic Analysis (Async Fire-and-Forget)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      fetch(`${appUrl}/api/hr/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: applicationId })
      }).catch(() => {});

      return NextResponse.json({ success: true, data: parsedData });

    } catch (err: any) {
      console.error(`[Parser:${reqId}] AI/DB Finalization Error:`, err);
      return NextResponse.json({ error: `Autonomous Intelligence Error: ${err.message}` }, { status: 500 });
    }

  } catch (globalErr: any) {
    console.error(`[Parser:${reqId}] Global System Error:`, globalErr);
    return NextResponse.json({ error: `Autonomous Pipeline Failure: ${globalErr.message}` }, { status: 500 });
  }
}



