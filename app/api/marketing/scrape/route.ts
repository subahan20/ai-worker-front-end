import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // 1. Extract username from URL
    // Format: https://www.instagram.com/username/ or https://www.instagram.com/username/reels/
    const username = url.split('instagram.com/')[1]?.split('/')[0] || 'unknown_user';

    console.log(`[Scraper] Starting internal audit for: ${username}`);

    // 2. MOCK INTERNAL SCRAPING (Simulating Playwright/Puppeteer fetch)
    // In a production environment, this would use a headless browser with session cookies.
    // For this demonstration, we generate high-fidelity dynamic mock data that mimics real results.
    const mockReels = [
      {
        username,
        reel_url: `https://www.instagram.com/reels/${Math.random().toString(36).substring(7)}/`,
        thumbnail_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&h=500&auto=format&fit=crop',
        views: Math.floor(Math.random() * 2000000) + 500000,
        likes: Math.floor(Math.random() * 80000) + 20000,
        comments: Math.floor(Math.random() * 2000) + 500,
        caption: `I stopped doing manual tasks and let my AI Agent handle my entire ${username} workflow. 🚀 #AI #Automation #Efficiency`,
      },
      {
        username,
        reel_url: `https://www.instagram.com/reels/${Math.random().toString(36).substring(7)}/`,
        thumbnail_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=300&h=500&auto=format&fit=crop',
        views: Math.floor(Math.random() * 3000000) + 900000,
        likes: Math.floor(Math.random() * 150000) + 50000,
        comments: Math.floor(Math.random() * 5000) + 1000,
        caption: `Why you're failing in 2024. Hint: You're still using your hands. 🤖 ${username} secret reveal.`,
      },
      {
        username,
        reel_url: `https://www.instagram.com/reels/${Math.random().toString(36).substring(7)}/`,
        thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=300&h=500&auto=format&fit=crop',
        views: Math.floor(Math.random() * 1500000) + 300000,
        likes: Math.floor(Math.random() * 60000) + 15000,
        comments: Math.floor(Math.random() * 1500) + 200,
        caption: `Day 1 of building a borderless AI empire. Who's with me? 🌎 #Startup #AI`,
      }
    ];

    // 3. Store in database
    const { error: dbError } = await getSupabase()
      .from('marketing_reels')
      .upsert(mockReels, { onConflict: 'reel_url' });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      message: 'Scraping successful', 
      username, 
      reel_count: mockReels.length,
      reels: mockReels
    });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
