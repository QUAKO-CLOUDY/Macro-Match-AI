import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// TypeScript interfaces for menu items
interface MacroMap {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MenuItem {
  id: string;
  restaurant_name: string;
  name: string;
  category: string;
  macros: MacroMap;
  image_url: string | null;
}

/**
 * Step 1: Query Classifier - Extracts and normalizes restaurant name from user query
 * Uses LLM with temperature 0 for strict classification
 */
async function extractRestaurantName(userQuery: string): Promise<string | null> {
  const classificationPrompt = `You are a query classifier. Your job is to extract the Restaurant Name from the user's query and normalize it to the standard US spelling.

Input: 'High protein at Chipolte' -> Output: 'Chipotle'

Input: 'Mac donalds burger' -> Output: 'McDonald's'

Input: 'Healthy lunch nearby' -> Output: 'NULL'

Return ONLY the raw string of the restaurant name. No JSON, no sentence.`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: classificationPrompt,
      prompt: userQuery,
      temperature: 0, // Strict classification
      maxTokens: 50,
    });

    const extractedName = result.text.trim();
    
    // Check if the result is "NULL" or empty
    if (extractedName.toUpperCase() === 'NULL' || !extractedName) {
      return null;
    }

    return extractedName;
  } catch (error) {
    console.error('Restaurant name extraction error:', error);
    return null;
  }
}

/**
 * Queries Supabase for menu items by restaurant name
 */
async function fetchMenuItems(restaurantName: string): Promise<MenuItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, restaurant_name, name, category, macros, image_url')
    .ilike('restaurant_name', `%${restaurantName}%`)
    .limit(50);

  if (error) {
    console.error('Supabase query error:', error);
    throw error;
  }

  return (data || []) as MenuItem[];
}

/**
 * Constructs the system prompt with the 12-point logic rules
 */
function buildSystemPrompt(menuItems: MenuItem[]): string {
  const itemsJson = JSON.stringify(menuItems, null, 2);

  return `You are MacroScout, a nutrition assistant for a search-first nutrition app. You have access to a specific list of menu items provided in the context below.

**CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:**

1. **Source of Truth:** You have access to a specific list of menu items provided in the context. You must NEVER hallucinate items. If it's not in the JSON context, it doesn't exist. Do not suggest items that are not explicitly listed.

2. **Context Awareness:** The user might give constraints like "Under 600 cals" or "High Protein." Filter your recommendations based on these math constraints. Only recommend items that actually meet the stated criteria.

3. **Component Logic:** If the menu data contains items with category "Component" (like Chipotle Rice/Beans), you are allowed to combine them to suggest a full meal/bowl. Do not suggest a bowl if you don't have the components. Only combine components that are actually present in the context.

4. **Safety & Transparency:**
   - If pricing is NULL, do not mention price.
   - Do not give medical advice.
   - If a macro is NULL, warn the user explicitly (e.g., "Note: This item's protein information is not available").

5. **Output Format:**
   - Give 3-5 distinct recommendations.
   - For each recommendation, explain WHY in 1 short sentence (e.g., "This has the best protein-to-calorie ratio").
   - Bold the **Item Name** and **Protein Amount** using markdown formatting.

6. **No "Scanning":** If the user asks to scan a menu, tell them that feature is coming soon and to search the database instead.

7. **Accuracy:** Always verify that the items you recommend exist in the provided context. Double-check names, categories, and macros before suggesting.

8. **Macro Calculations:** When combining components, calculate the total macros by summing the individual component macros. Make sure your math is correct.

9. **Category Awareness:** Pay attention to item categories. Don't suggest a "Side" as a main meal unless the user specifically asks for it.

10. **User Intent:** If the user asks for something specific (e.g., "low carb", "high protein", "vegetarian"), only recommend items that actually meet those criteria based on the data provided.

11. **Transparency:** If you cannot find items matching the user's request, be honest. Say "I don't have items matching that criteria in the database" rather than making something up.

12. **Professional Tone:** Be helpful, friendly, and informative, but always prioritize accuracy over being overly enthusiastic.

**Menu Items Context (JSON):**
${itemsJson}

Remember: You can ONLY recommend items from the JSON above. Never invent or suggest items that don't exist in this data.`;
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages array required', { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];
    const userMessage = latestMessage?.content || '';

    if (!userMessage) {
      return new Response('User message content required', { status: 400 });
    }

    // Step 0: Enforce 25-search daily limit (BEFORE any OpenAI calls)
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query daily_usage table for this user
    const { data: usageData, error: usageError } = await supabase
      .from('daily_usage')
      .select('search_count, last_search_date')
      .eq('user_id', user.id)
      .single();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format in UTC
    let searchCount = 0;
    let shouldReset = false;

    // Handle different error cases
    if (usageError) {
      if (usageError.code === 'PGRST116') {
        // No record found - user is new, start with 0
        searchCount = 0;
      } else {
        // Other database error - log but allow request to continue (fail open)
        console.error('Error fetching daily usage:', usageError);
        searchCount = 0;
      }
    } else if (usageData) {
      searchCount = usageData.search_count || 0;
      const lastSearchDate = usageData.last_search_date || today;

      // Reset logic: If last_search_date is strictly less than today's date (UTC)
      if (lastSearchDate < today) {
        searchCount = 0;
        shouldReset = true;
      }
    }

    // Limit logic: If search_count >= 25, return error 429 (BEFORE any processing)
    if (searchCount >= 25) {
      return new Response(
        JSON.stringify({ error: 'Daily search limit reached. Please try again tomorrow.' }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Increment search_count by 1
    const newSearchCount = searchCount + 1;

    // Update or insert daily_usage record (fire and forget - don't block request)
    supabase
      .from('daily_usage')
      .upsert({
        user_id: user.id,
        search_count: newSearchCount,
        last_search_date: today,
      }, {
        onConflict: 'user_id',
      })
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('Error updating daily usage:', updateError);
        }
      })
      .catch((err) => {
        console.error('Unexpected error updating daily usage:', err);
      });

    // Step 1: Query Classifier - Extract restaurant name using LLM
    const extractedRestaurantName = await extractRestaurantName(userMessage);
    console.log(`Extracted restaurant name: ${extractedRestaurantName || 'NULL'}`);

    // Step 2: The Retrieval
    let menuItems: MenuItem[] = [];
    let systemPrompt: string;

    if (extractedRestaurantName) {
      // Use the extracted name for Supabase query
      menuItems = await fetchMenuItems(extractedRestaurantName);

      if (menuItems.length === 0) {
        // Fallback: No items found for this restaurant
        systemPrompt = `You are MacroScout. The user asked about "${extractedRestaurantName}", but you don't have menu data for that restaurant yet. Apologize politely and suggest they try searching for a restaurant you do have data for, or ask a general nutrition question.`;
      } else {
        // Build system prompt with menu items
        systemPrompt = buildSystemPrompt(menuItems);
      }
    } else {
      // Output was "NULL" - skip database query, proceed to general AI response
      systemPrompt = `You are MacroScout, a nutrition assistant for a search-first nutrition app. The user's query doesn't mention a specific restaurant. Answer helpfully about nutrition and meal planning, but note that you specialize in restaurant menu item recommendations. If they're asking about a specific restaurant, ask them to mention the restaurant name.`;
    }

    // Step 3: The Final Response
    // Pass the original user message AND the retrieved database items to the final chat generation
    // The final LLM will handle any other typos (like "hgh prtien") naturally
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

