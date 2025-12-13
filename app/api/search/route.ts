import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getMealImageUrl } from '@/lib/image-utils';

export const dynamic = 'force-dynamic';

/**
 * Determines if a query implies a full meal (e.g., 'Lunch', 'Dinner', 'Bowl')
 */
function impliesFullMeal(query: string): boolean {
  const mealKeywords = ['lunch', 'dinner', 'breakfast', 'meal', 'bowl', 'entree', 'entrée'];
  const lowerQuery = query.toLowerCase();
  return mealKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Determines if a query specifically requests side dishes, toppings, or sauces
 */
function requestsSideItems(query: string): boolean {
  const sideKeywords = ['side', 'topping', 'sauce', 'dressing', 'condiment', 'add-on'];
  const lowerQuery = query.toLowerCase();
  return sideKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Filters and prioritizes results based on category relevance
 */
function applyCategoryFiltering(results: any[], query: string): any[] {
  if (!results || results.length === 0) return results;

  const isFullMealQuery = impliesFullMeal(query);
  const isSideItemQuery = requestsSideItems(query);

  // If user specifically asks for sides/toppings/sauces, return all results
  if (isSideItemQuery) {
    return results;
  }

  // If query implies a full meal, prioritize Entree and Signature Bowl
  if (isFullMealQuery) {
    const priorityCategories = ['Entree', 'Signature Bowl'];
    const excludedCategories = ['Side', 'Topping', 'Sauce'];

    // Separate items into priority and others
    const priorityItems: any[] = [];
    const otherItems: any[] = [];

    results.forEach(item => {
      const category = (item.category || '').toLowerCase();
      if (priorityCategories.some(priority => category.includes(priority.toLowerCase()))) {
        priorityItems.push(item);
      } else if (!excludedCategories.some(excluded => category.includes(excluded.toLowerCase()))) {
        // Include other categories that aren't explicitly excluded
        otherItems.push(item);
      }
      // Exclude Side/Topping/Sauce items
    });

    // Return priority items first, then others
    return [...priorityItems, ...otherItems];
  }

  // For other queries, return all results as-is
  return results;
}

/**
 * Uses OpenAI to select the best 3 matches from the provided list
 * with strict hallucination prevention
 */
async function llmRerank(
  openai: OpenAI,
  items: any[],
  userQuery: string
): Promise<any[]> {
  if (!items || items.length === 0) return [];
  if (items.length <= 3) return items;

  // Prepare item list for LLM with all necessary fields
  const itemList = items.slice(0, 10).map((item, index) => {
    // Check fats_g (database column) first, then other variations
    const fats = item.fats_g ?? item.fat_g ?? item.fats ?? item.fat ?? 0;
    return {
      index: index + 1,
      id: item.id,
      name: item.item_name || item.name,
      restaurant: item.restaurant_name,
      category: item.category,
      description: item.description || '',
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: fats, // Use normalized value
      dietary_tags: item.dietary_tags || item.tags || []
    };
  });

  const systemPrompt = `You are a meal recommendation assistant. Your task is to select the 3 best matching items from the provided list based on the user's query.

CRITICAL RULES:
1. You may ONLY recommend items that are present in the provided list below.
2. Do NOT invent or suggest items that are not in the list (e.g., do not suggest "Cauliflower rice" if it's not listed).
3. If the user misspells a word (e.g., "Chipolte" instead of "Chipotle"), infer their intent but ONLY map it to real items from the provided list.
4. Return your selection as a JSON object with a "selected_indices" field containing an array of indices (1-based) corresponding to the items you selected.
5. Order the indices by relevance (most relevant first).

Example response format: {"selected_indices": [2, 5, 8]}`;

  const userPrompt = `User Query: "${userQuery}"

Available Items:
${JSON.stringify(itemList, null, 2)}

Select the 3 best matching items by returning a JSON object with "selected_indices" containing an array of their indices (1-based). Only use indices from the list above.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more deterministic results
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.warn('LLM returned empty response, using first 3 items');
      return items.slice(0, 3);
    }

    // Parse the JSON response
    const parsed = JSON.parse(responseText);
    
    // Extract selected indices from the response
    let selectedIndices: number[] = [];
    if (parsed.selected_indices && Array.isArray(parsed.selected_indices)) {
      selectedIndices = parsed.selected_indices;
    } else if (parsed.selected && Array.isArray(parsed.selected)) {
      selectedIndices = parsed.selected;
    } else if (parsed.indices && Array.isArray(parsed.indices)) {
      selectedIndices = parsed.indices;
    } else if (Array.isArray(parsed)) {
      selectedIndices = parsed;
    }

    // Validate indices and map to items (convert from 1-based to 0-based)
    const validIndices = selectedIndices
      .filter((idx: any) => typeof idx === 'number' && idx >= 1 && idx <= itemList.length)
      .map((idx: number) => idx - 1);

    if (validIndices.length === 0) {
      console.warn('LLM returned invalid indices, using first 3 items');
      return items.slice(0, 3);
    }

    // Map back to original items (up to 3)
    const selectedItems = validIndices.slice(0, 3).map(idx => items[idx]).filter(Boolean);
    
    return selectedItems.length > 0 ? selectedItems : items.slice(0, 3);
  } catch (error: any) {
    console.error('LLM reranking error:', error.message);
    // Fallback to first 3 items if LLM fails
    return items.slice(0, 3);
  }
}

/**
 * Ensures all required fields (dietary_tags, description) are present in results
 * Also generates real food images for meals
 */
function enrichResults(results: any[]): any[] {
  return results.map(item => {
    const itemName = item.item_name || item.name || 'Unknown Item';
    const restaurantName = item.restaurant_name || 'Unknown Restaurant';
    
    // Generate real food image URL based on meal name and restaurant
    const imageUrl = getMealImageUrl(
      itemName,
      restaurantName,
      item.image_url
    );
    
    // Handle fats - check fats_g (database column) first, then other variations
    const fats = item.fats_g ?? item.fat_g ?? item.fats ?? item.fat ?? 
                 (item.nutrition_info?.fats_g) ?? 
                 (item.nutrition_info?.fat_g) ?? 
                 (item.nutrition_info?.fats) ?? 
                 (item.nutrition_info?.fat) ?? 0;

    return {
      ...item,
      description: item.description || '',
      dietary_tags: item.dietary_tags || item.tags || [],
      // Ensure all standard fields are present
      item_name: itemName,
      restaurant_name: restaurantName,
      category: item.category || '',
      calories: item.calories || 0,
      protein_g: item.protein_g || 0,
      carbs_g: item.carbs_g || 0,
      fat_g: typeof fats === 'number' ? fats : 0,
      fats_g: typeof fats === 'number' ? fats : 0, // Also include fats_g for consistency
      image_url: imageUrl, // Use generated real food image
      price: item.price || null
    };
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter results by radius if coordinates are available
 */
function filterByRadius(
  results: any[],
  radiusMiles: number | undefined,
  userLat?: number,
  userLon?: number
): { filtered: any[]; excludedCount: number; hasCoordinates: number } {
  if (!radiusMiles || !userLat || !userLon) {
    // No radius filtering - return all results
    return { filtered: results, excludedCount: 0, hasCoordinates: 0 };
  }

  let excludedCount = 0;
  let hasCoordinates = 0;
  const filtered = results.filter(item => {
    // Check if item has restaurant coordinates
    const itemLat = item.latitude || item.restaurant_latitude;
    const itemLon = item.longitude || item.restaurant_longitude;
    
    if (!itemLat || !itemLon) {
      // No coordinates - exclude from radius-filtered results
      excludedCount++;
      return false;
    }
    
    hasCoordinates++;
    const distance = calculateDistance(userLat, userLon, itemLat, itemLon);
    item.distance = distance; // Add distance to item for frontend use
    return distance <= radiusMiles;
  });

  return { filtered, excludedCount, hasCoordinates };
}

export async function POST(request: Request) {
  try {
    const { query, radius_miles, user_location } = await request.json();
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
    
    // Extract user location if provided
    const userLat = user_location?.latitude;
    const userLon = user_location?.longitude;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // For Search
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;     // For Caching (Write access)
    const openaiKey = process.env.OPENAI_API_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const adminDb = createClient(supabaseUrl, serviceKey); // Admin client to write to cache
    const openai = new OpenAI({ apiKey: openaiKey });

    // 1. CHECK CACHE FIRST (Save Money)
    const { data: cached } = await supabase
      .from('search_cache')
      .select('results_json')
      .eq('query_text', query.toLowerCase().trim())
      .single();

    if (cached && !radius_miles) {
      // Only use cache if not filtering by radius (radius filtering is location-specific)
      console.log(`⚡ Cache Hit for: "${query}"`);
      // Enrich cached results to ensure all fields are present
      return NextResponse.json(enrichResults(cached.results_json || []));
    }

    // 2. GENERATE EMBEDDING
    console.log(`🧠 Generating Embedding for: "${query}"`);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 3. SEARCH DATABASE (fetch top 10 for LLM reranking)
    const { data: rawResults, error } = await supabase.rpc('match_menu_items', {
      query_embedding: embedding,
      match_threshold: 0.0, // Keep at 0.0 to ensure results
      match_count: 10,
    });

    if (error) throw error;
    if (!rawResults || rawResults.length === 0) {
      return NextResponse.json([]);
    }

    // 4. APPLY CATEGORY FILTERING (Side Dish Filter)
    console.log(`🔍 Applying category filtering for: "${query}"`);
    let filteredResults = applyCategoryFiltering(rawResults, query);

    // 5. APPLY RADIUS FILTERING (if radius and user location provided)
    if (radius_miles && userLat && userLon) {
      console.log(`📍 Filtering by radius: ${radius_miles} miles`);
      const radiusFilter = filterByRadius(filteredResults, radius_miles, userLat, userLon);
      filteredResults = radiusFilter.filtered;
      console.log(`📍 Radius filter: ${radiusFilter.hasCoordinates} restaurants with coordinates, ${radiusFilter.excludedCount} excluded (no coordinates), ${filteredResults.length} within ${radius_miles} miles`);
    } else if (radius_miles) {
      console.log(`⚠️ Radius specified (${radius_miles} miles) but user location missing - skipping radius filter`);
    }

    // 6. LLM RERANKING/FILTERING (Hallucination Guard)
    console.log(`🤖 LLM reranking top ${filteredResults.length} results...`);
    const rerankedResults = await llmRerank(openai, filteredResults, query);

    // 7. ENRICH RESULTS (Ensure dietary_tags and description are present)
    const enrichedResults = enrichResults(rerankedResults);

    // 8. SAVE TO CACHE (only if not radius-filtered, to avoid caching location-specific results)
    if (enrichedResults.length > 0 && !radius_miles) {
      await adminDb.from('search_cache').insert({
        query_text: query.toLowerCase().trim(),
        results_json: enrichedResults
      });
    }

    // Log final results for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Search complete: ${enrichedResults.length} meals returned${radius_miles ? ` (radius: ${radius_miles} miles)` : ''}`);
    }

    return NextResponse.json(enrichedResults);

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}