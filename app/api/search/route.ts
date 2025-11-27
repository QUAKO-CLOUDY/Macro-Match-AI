import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Force dynamic so it doesn't cache old results
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(`🔎 Searching for: "${query}"`);

    // 1. Initialize Supabase & OpenAI
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const openaiKey = process.env.OPENAI_API_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!openaiKey) {
      console.error('Missing OpenAI API key');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 2. Generate Embedding for the user's search text
    let embedding: number[];
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error('OpenAI Embedding Error:', error);
      return NextResponse.json({ error: 'Failed to generate search embedding' }, { status: 500 });
    }

    // 3. Try RPC function first (vector similarity search)
    let results: any[] | null = null;
    let rpcError: any = null;

    try {
      const { data: rpcResults, error: rpcErr } = await supabase.rpc('match_menu_items', {
        query_embedding: embedding,
        match_threshold: 0.0, 
        match_count: 10,
      });

      if (rpcErr) {
        console.warn('RPC function error (will try fallback):', rpcErr);
        rpcError = rpcErr;
      } else {
        results = rpcResults;
        console.log(`✅ RPC found ${results?.length || 0} matches.`);
      }
    } catch (err) {
      console.warn('RPC function may not exist (will try fallback):', err);
      rpcError = err;
    }

    // 4. Fallback: Direct database query if RPC fails or returns no results
    if (!results || results.length === 0) {
      console.log('🔄 Trying fallback query...');
      
      // First, check if we have any menu items at all
      const { data: allItems, error: countError } = await supabase
        .from('menu_items')
        .select('id')
        .limit(1);

      if (countError) {
        console.error('Database connection error:', countError);
        return NextResponse.json({ 
          error: `Database error: ${countError.message}`,
          details: 'Check if menu_items table exists and is accessible'
        }, { status: 500 });
      }

      if (!allItems || allItems.length === 0) {
        console.log('⚠️ No menu items found in database');
        return NextResponse.json([]);
      }

      // Try different field name variations based on what we've seen in the codebase
      // The generate-embeddings script uses 'item_name', but other routes use 'name'
      // Also handle nutrition_info as a separate table/relationship
      const { data: textSearchResults, error: textError } = await supabase
        .from('menu_items')
        .select(`
          id,
          item_name,
          name,
          description,
          price,
          protein_g,
          calories,
          restaurant_id,
          restaurants:restaurant_id (
            name,
            restaurant_name
          ),
          nutrition_info (
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .or(`item_name.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (textError) {
        console.error('Text search error:', textError);
        // Try a simpler query
        const { data: simpleResults, error: simpleError } = await supabase
          .from('menu_items')
          .select('*')
          .limit(10);

        if (simpleError) {
          console.error('Simple query also failed:', simpleError);
          return NextResponse.json({ 
            error: `Query failed: ${simpleError.message}`,
            hint: 'Check database schema and field names'
          }, { status: 500 });
        }

        // Map results to expected format
        // Handle nutrition_info as both a nested object and a relationship
        results = (simpleResults || []).map((item: any) => {
          const nutrition = item.nutrition_info;
          const nutritionData = Array.isArray(nutrition) ? nutrition[0] : nutrition;
          
          return {
            id: item.id,
            item_name: item.item_name || item.name || 'Unknown Item',
            restaurant_name: item.restaurant_name || item.restaurants?.name || item.restaurants?.restaurant_name || 'Unknown Restaurant',
            price: item.price || 0,
            protein_g: item.protein_g || nutritionData?.protein_g || 0,
            calories: item.calories || nutritionData?.calories || 0,
            description: item.description || '',
          };
        });
      } else {
        // Map text search results to expected format
        // Handle nutrition_info as both a nested object and a relationship
        results = (textSearchResults || []).map((item: any) => {
          const nutrition = item.nutrition_info;
          const nutritionData = Array.isArray(nutrition) ? nutrition[0] : nutrition;
          
          return {
            id: item.id,
            item_name: item.item_name || item.name || 'Unknown Item',
            restaurant_name: item.restaurants?.name || item.restaurants?.restaurant_name || item.restaurant_name || 'Unknown Restaurant',
            price: item.price || 0,
            protein_g: item.protein_g || nutritionData?.protein_g || 0,
            calories: item.calories || nutritionData?.calories || 0,
            description: item.description || '',
          };
        });
      }

      console.log(`✅ Fallback found ${results?.length || 0} matches.`);
    } else {
      // Map RPC results to expected format (in case field names differ)
      results = results.map((item: any) => ({
        id: item.id,
        item_name: item.item_name || item.name || 'Unknown Item',
        restaurant_name: item.restaurant_name || item.restaurant?.name || 'Unknown Restaurant',
        price: item.price || 0,
        protein_g: item.protein_g || 0,
        calories: item.calories || 0,
        description: item.description || '',
      }));
    }

    console.log(`✅ Returning ${results?.length || 0} results`);
    return NextResponse.json(results || []);

  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}