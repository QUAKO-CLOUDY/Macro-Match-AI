import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Prevent caching so we always get fresh results
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log("----------------------------------------------------------------");
  console.log("🔍 API STARTED: /api/search");

  try {
    // 1. Validate Environment Variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (!openaiKey) missing.push("OPENAI_API_KEY");
      
      console.error("❌ CRITICAL: Missing Environment Variables:", missing);
      throw new Error(`Missing Keys: ${missing.join(", ")}`);
    }

    // 2. Parse Body
    let query;
    try {
      const body = await request.json();
      query = body.query;
    } catch (e) {
      throw new Error("Failed to parse request body. Is it valid JSON?");
    }

    if (!query) throw new Error("Query is required in body");
    console.log(`👤 User asking for: "${query}"`);

    // 3. Initialize OpenAI
    const openai = new OpenAI({ apiKey: openaiKey });

    // 4. Generate Embedding
    console.log("🧠 contacting OpenAI...");
    let embedding;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (openaiError: any) {
      console.error("❌ OpenAI Error:", openaiError);
      throw new Error(`OpenAI Failed: ${openaiError.message}`);
    }

    // 5. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 6. Call Database
    console.log("🗄️ Calling Supabase RPC...");
    const { data: results, error: dbError } = await supabase.rpc('match_menu_items', {
      query_embedding: embedding,
      match_threshold: 0.0, // Force everything to match
      match_count: 10,
    });

    if (dbError) {
      console.error("❌ Supabase Database Error:", dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    console.log(`✅ Success! Found ${results?.length || 0} items.`);
    return NextResponse.json(results || []);

  } catch (error: any) {
    console.error("💥 CRASH REPORT:", error.message);
    // Return the specific error to the frontend so you can see it
    return NextResponse.json(
      { error: error.message || "Unknown Server Error" }, 
      { status: 500 }
    );
  }
}