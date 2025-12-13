import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getMealImageUrl } from '@/lib/image-utils';
import type { Meal, UserProfile } from '@/app/types';

export const dynamic = 'force-dynamic';

// Type definitions
interface IntentExtraction {
  restaurant_name: string | null;
  semantic_query: string;
  hard_constraints: {
    max_calories?: number;
    min_calories?: number;
    max_protein?: number;
    min_protein?: number;
    max_carbs?: number;
    min_carbs?: number;
    max_fats?: number;
    min_fats?: number;
    diet?: string;
    dietary_tags?: string[];
  };
}

interface MenuItem {
  id: string;
  name?: string;
  item_name?: string;
  restaurant_name: string;
  category?: string;
  macros?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  };
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  image_url?: string | null;
  dietary_tags?: string[] | null;
  description?: string;
}

interface LLMResponse {
  content: string;
  selected_item_ids: string[];
}

/**
 * Step A: Intent & Constraint Extraction
 * Uses gpt-4o-mini to analyze user message and extract restaurant name, semantic query, and constraints
 */
async function extractIntentAndConstraints(
  openai: OpenAI,
  messages: Array<{ role: string; content: string }>,
  userProfile: UserProfile
): Promise<IntentExtraction> {
  const latestMessage = messages[messages.length - 1]?.content || '';
  const conversationHistory = messages
    .slice(-5)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are an intent extraction system. Analyze the user's message and conversation history to extract:
1. Restaurant Name: Normalize common typos (e.g., "Chipolte" -> "Chipotle", "Mac donalds" -> "McDonald's"). Return null if no restaurant is mentioned.
2. Semantic Query: The core search intent (e.g., "high protein chicken", "low carb lunch", "vegan options").
3. Hard Constraints: Extract numeric constraints and dietary requirements.

User Profile:
- Diet Type: ${userProfile.diet_type || 'Regular'}
- Calorie Target: ${userProfile.target_calories || 'N/A'}
- Protein Target: ${userProfile.target_protein_g || 'N/A'}
- Carbs Target: ${userProfile.target_carbs_g || 'N/A'}
- Fats Target: ${userProfile.target_fats_g || 'N/A'}
- Dietary Options: ${userProfile.dietary_options?.join(', ') || 'None'}

Return a JSON object with this exact structure:
{
  "restaurant_name": "RestaurantName" or null,
  "semantic_query": "description of what they're looking for",
  "hard_constraints": {
    "max_calories": number or null,
    "min_calories": number or null,
    "max_protein": number or null,
    "min_protein": number or null,
    "max_carbs": number or null,
    "min_carbs": number or null,
    "max_fats": number or null,
    "min_fats": number or null,
    "diet": "Vegan" | "Vegetarian" | "Keto" | "Low Carb" | null,
    "dietary_tags": ["tag1", "tag2"] or null
  }
}`;

  const userPrompt = `Conversation History:
${conversationHistory}

Latest User Message: "${latestMessage}"

Extract the intent and constraints.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from intent extraction');
    }

    const extracted = JSON.parse(responseText) as IntentExtraction;
    
    // Apply user profile defaults to constraints if not specified
    if (userProfile.diet_type && !extracted.hard_constraints.diet) {
      extracted.hard_constraints.diet = userProfile.diet_type;
    }

    return extracted;
  } catch (error: any) {
    console.error('Intent extraction error:', error);
      // Fallback: return basic extraction
      return {
        restaurant_name: null,
        semantic_query: latestMessage,
        hard_constraints: {
          diet: userProfile.diet_type || null,
        }
      };
  }
}

/**
 * Step B: Data Retrieval from Supabase
 * Fetches menu items based on restaurant name or semantic query
 */
async function retrieveMenuItems(
  supabase: ReturnType<typeof createClient>,
  intent: IntentExtraction,
  openai?: OpenAI
): Promise<MenuItem[]> {
  try {
    if (intent.restaurant_name) {
      // Scenario 1: Specific Restaurant
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, item_name, restaurant_name, category, macros, calories, protein_g, carbs_g, fat_g, image_url, dietary_tags, description')
        .ilike('restaurant_name', `%${intent.restaurant_name}%`)
        .limit(50);

      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }

      return (data || []) as MenuItem[];
    } else {
      // Scenario 2: General Query - Try vector search first, fallback to text search
      if (openai) {
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: intent.semantic_query,
          });
          const embedding = embeddingResponse.data[0].embedding;

          const { data: vectorResults, error: vectorError } = await supabase.rpc('match_menu_items', {
            query_embedding: embedding,
            match_threshold: 0.0,
            match_count: 20,
          });

          if (!vectorError && vectorResults && vectorResults.length > 0) {
            return vectorResults as MenuItem[];
          }
        } catch (vectorError) {
          console.log('Vector search not available, falling back to text search');
        }
      }

      // Fallback to text search
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, item_name, restaurant_name, category, macros, calories, protein_g, carbs_g, fat_g, image_url, dietary_tags, description')
        .or(`name.ilike.%${intent.semantic_query}%,item_name.ilike.%${intent.semantic_query}%,description.ilike.%${intent.semantic_query}%`)
        .limit(20);

      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }

      return (data || []) as MenuItem[];
    }
  } catch (error: any) {
    console.error('Data retrieval error:', error);
    return [];
  }
}

/**
 * Converts Supabase menu item to Meal type
 */
function convertToMeal(item: MenuItem): Meal {
  // Determine category
  const category = item.category === 'Grocery' || item.category === 'Hot Bar' 
    ? 'grocery' as const 
    : 'restaurant' as const;

  const mealName = item.item_name || item.name || 'Unknown Item';
  const restaurantName = item.restaurant_name || 'Unknown Restaurant';

  // Handle macros - check multiple possible structures
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;

  if (item.macros) {
    calories = item.macros.calories ?? 0;
    protein = item.macros.protein ?? 0;
    carbs = item.macros.carbs ?? 0;
    fats = item.macros.fat ?? item.macros.fats ?? 0;
  } else {
    calories = item.calories ?? 0;
    protein = item.protein_g ?? 0;
    carbs = item.carbs_g ?? 0;
    // Check fats_g (database column) first, then other variations
    fats = item.fats_g ?? item.fat_g ?? item.fats ?? item.fat ?? 0;
  }

  // Use getMealImageUrl to ensure we always have a real food image
  const imageUrl = getMealImageUrl(
    mealName,
    restaurantName,
    item.image_url || null
  );

  return {
    id: item.id,
    name: mealName,
    restaurant: restaurantName,
    calories,
    protein,
    carbs,
    fats,
    image: imageUrl,
    price: undefined, // Not available in menu_items
    description: item.description || '',
    category,
    dietary_tags: item.dietary_tags || [],
  };
}

/**
 * Generates strict dietary preference rules based on user profile
 * These rules are injected into system prompts to enforce dietary restrictions
 */
function generateDietaryRules(userProfile: UserProfile): string {
  const rules: string[] = [];
  
  // Generate rules for diet type (normalize to lowercase for comparison)
  if (userProfile.diet_type) {
    const dietType = userProfile.diet_type.toLowerCase();
    if (dietType === 'vegan') {
      rules.push('USER IS VEGAN. ABSOLUTE REQUIREMENT: ONLY suggest plant-based foods.');
      rules.push('DO NOT show ANY items containing: meat, poultry, fish, seafood, eggs, dairy, honey, or any animal-derived ingredients.');
      rules.push('ONLY suggest items that are 100% plant-based. If an item contains ANY animal products, DISCARD it immediately.');
      rules.push('If no vegan items are available, clearly explain this and suggest the best plant-forward options available.');
    } else if (dietType === 'vegetarian') {
      rules.push('USER IS VEGETARIAN. DO NOT suggest items containing: meat, poultry, fish, or seafood.');
      rules.push('Eggs and dairy are acceptable. Fish and seafood are NOT acceptable.');
      rules.push('If no vegetarian items match perfectly, clearly note any limitations and suggest the closest alternatives.');
    } else if (dietType === 'pescatarian') {
      rules.push('USER IS PESCATARIAN. DO NOT suggest items containing: meat or poultry.');
      rules.push('Fish and seafood are acceptable. Meat and poultry are NOT acceptable.');
    } else if (dietType === 'keto' || dietType === 'ketogenic') {
      rules.push('USER IS ON KETO DIET. ABSOLUTE REQUIREMENT: ONLY suggest items that are low-carb and high-fat.');
      rules.push('DO NOT show items with more than 20g net carbs per serving unless specifically requested.');
      rules.push('PRIORITIZE items high in healthy fats and protein. Carbs should be minimal.');
      rules.push('If no strict keto items are available, clearly explain and suggest the lowest-carb options available.');
    } else if (dietType === 'low_carb' || dietType === 'low carb' || dietType === 'low-carb') {
      rules.push('USER FOLLOWS A LOW-CARB DIET. PRIORITIZE items with minimal carbohydrates.');
      rules.push('Avoid high-carb items unless specifically requested by the user.');
      rules.push('Rank items by carb content (lowest first).');
    } else if (dietType && dietType !== 'regular') {
      // Handle custom diet types (from "Other" input)
      const displayType = userProfile.diet_type; // Use original casing for display
      rules.push(`USER FOLLOWS A ${displayType.toUpperCase()} DIET. Respect this dietary preference when recommending meals.`);
      rules.push(`DO NOT suggest items that violate ${displayType} dietary principles.`);
      rules.push('If no items perfectly match this diet type, clearly explain the limitations and suggest the closest alternatives.');
    }
  }
  
  // Rules based on dietary options
  if (userProfile.dietary_options && userProfile.dietary_options.length > 0) {
    const dietaryOptions = userProfile.dietary_options;
    
    // Map dietary_options to rules (support both formats: "gluten_free" and "Gluten-free")
    const normalizedOptions = dietaryOptions.map(opt => opt.toLowerCase().replace(/[-\s]+/g, '_'));
    
    if (normalizedOptions.includes('gluten_free')) {
      rules.push('USER REQUIRES GLUTEN-FREE. DO NOT suggest items containing: wheat, barley, rye, or any gluten-containing ingredients. If menu allergen data is missing, clearly state that gluten-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('dairy_free')) {
      rules.push('USER REQUIRES DAIRY-FREE. DO NOT suggest items containing: milk, cheese, butter, yogurt, or any dairy products. If menu allergen data is missing, clearly state that dairy-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('nut_free') || normalizedOptions.includes('peanut_free')) {
      rules.push('USER HAS NUT ALLERGY. DO NOT suggest items containing: peanuts, tree nuts, or any nut-based ingredients. If menu allergen data is missing, clearly state that nut-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('soy_free')) {
      rules.push('USER REQUIRES SOY-FREE. DO NOT suggest items containing: soy, soybeans, tofu, tempeh, or any soy-based ingredients. If menu allergen data is missing, clearly state that soy-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('egg_free')) {
      rules.push('USER HAS EGG ALLERGY. DO NOT suggest items containing: eggs or egg-based ingredients. If menu allergen data is missing, clearly state that egg-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('shellfish_free')) {
      rules.push('USER HAS SHELLFISH ALLERGY. DO NOT suggest items containing: shrimp, crab, lobster, or any shellfish. If menu allergen data is missing, clearly state that shellfish-free cannot be guaranteed.');
    }
    
    if (normalizedOptions.includes('high_protein')) {
      rules.push('USER PREFERS HIGH PROTEIN. PRIORITIZE items with significant protein content (preferably 20g+ per serving). Rank higher-protein meals first.');
    }
    
    if (normalizedOptions.includes('low_sugar')) {
      rules.push('USER PREFERS LOW SUGAR. Avoid desserts or obvious sugary items when possible. Rank lower-sugar options first.');
    }
  }
  
  if (rules.length === 0) {
    return '';
  }
  
  return `\n\n**CRITICAL DIETARY RESTRICTIONS - MUST BE FOLLOWED STRICTLY:**\n${rules.map((rule, idx) => `${idx + 1}. ${rule}`).join('\n')}\n\nThese rules are ABSOLUTE. If an item violates ANY of these restrictions, you MUST discard it and NOT recommend it to the user.`;
}

/**
 * Detects if the user's query is appropriate for meal recommendations
 * Returns false ONLY if the query is clearly asking for general nutrition advice/education
 * Defaults to true (try meal recommendations) for ambiguous queries
 */
async function isMealRecommendationAppropriate(
  openai: OpenAI,
  messages: Array<{ role: string; content: string }>,
  intent: IntentExtraction
): Promise<boolean> {
  const latestMessage = messages[messages.length - 1]?.content || '';
  
  // If restaurant name is mentioned, definitely try meal recommendations
  if (intent.restaurant_name) {
    return true;
  }

  // Check for clear non-meal question patterns (general nutrition questions)
  const nonMealPatterns = [
    'how much', 'how many', 'what is', 'what are', 'why are', 'why is',
    'explain', 'tell me about', 'what does', 'what do', 'should i',
    'can you explain', 'what\'s the difference', 'how do i', 'how does',
    'what should', 'is it', 'are they', 'does it', 'do they'
  ];
  
  const lowerMessage = latestMessage.toLowerCase();
  const isGeneralQuestion = nonMealPatterns.some(pattern => lowerMessage.startsWith(pattern));
  
  // If it's clearly a general nutrition question, skip meal recommendations
  if (isGeneralQuestion) {
    // But check if it also asks for specific meals (e.g., "how much protein in chicken?")
    const mealKeywords = ['find', 'show', 'recommend', 'suggest', 'meal', 'food', 'restaurant', 'dish', 'item'];
    const alsoAsksForMeals = mealKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!alsoAsksForMeals) {
      return false; // It's a general question, not asking for meal cards
    }
  }

  // Default to true - try meal recommendations for everything else
  // This includes queries like "lunch under 600 calories", "high protein", "vegan options", etc.
  return true;
}

/**
 * Generates a conversational text response when meal recommendations aren't appropriate
 */
async function generateConversationalResponse(
  openai: OpenAI,
  messages: Array<{ role: string; content: string }>,
  userProfile: UserProfile
): Promise<string> {
  const dietaryRules = generateDietaryRules(userProfile);
  
  const systemPrompt = `You are MacroScout, a friendly and knowledgeable nutrition assistant for a meal tracking app. 
${dietaryRules}

Your role is to:
- Provide helpful, accurate nutrition information
- Answer questions about macros, calories, and nutrition
- Give general nutrition advice and tips
- Be conversational, friendly, and supportive
- Keep responses concise (2-4 sentences typically, but can be longer if needed for complex topics)

User Profile:
- Diet Type: ${userProfile.diet_type || 'Regular'}
- Calorie Target: ${userProfile.target_calories || 'N/A'}
- Protein Target: ${userProfile.target_protein_g || 'N/A'}
- Carbs Target: ${userProfile.target_carbs_g || 'N/A'}
- Fats Target: ${userProfile.target_fats_g || 'N/A'}

Remember: You're part of a meal tracking app, so you can reference that context when relevant.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0]?.message?.content || "I'm here to help with your nutrition questions!";
  } catch (error: any) {
    console.error('Error generating conversational response:', error);
    return "I'm here to help with your nutrition questions! Feel free to ask me about macros, calories, or meal planning.";
  }
}

/**
 * Step C: Filtering & Reasoning
 * Uses LLM to filter items based on constraints and select top 3-5 items
 */
async function filterAndReason(
  openai: OpenAI,
  items: MenuItem[],
  intent: IntentExtraction,
  userProfile: UserProfile
): Promise<LLMResponse> {
  if (!items || items.length === 0) {
    return {
      content: "I couldn't find any items matching your request. Try searching with different keywords or check back later as we add more meals.",
      selected_item_ids: []
    };
  }

  // Prepare item list for LLM
  const itemList = items.map((item) => {
    const mealName = item.item_name || item.name || 'Unknown Item';
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    if (item.macros) {
      calories = item.macros.calories ?? 0;
      protein = item.macros.protein ?? 0;
      carbs = item.macros.carbs ?? 0;
      fats = item.macros.fat ?? item.macros.fats ?? 0;
    } else {
      calories = item.calories ?? 0;
      protein = item.protein_g ?? 0;
      carbs = item.carbs_g ?? 0;
      // Check fats_g (database column) first, then other variations
      fats = item.fats_g ?? item.fat_g ?? item.fats ?? item.fat ?? 0;
    }

    return {
      id: item.id,
      name: mealName,
      restaurant: item.restaurant_name,
      category: item.category || '',
      calories,
      protein,
      carbs,
      fats,
      dietary_tags: item.dietary_tags || []
    };
  });

  const constraints = intent.hard_constraints;
  const constraintsText = [
    constraints.max_calories ? `Max calories: ${constraints.max_calories}` : null,
    constraints.min_calories ? `Min calories: ${constraints.min_calories}` : null,
    constraints.min_protein ? `Min protein: ${constraints.min_protein}g` : null,
    constraints.max_carbs ? `Max carbs: ${constraints.max_carbs}g` : null,
    constraints.min_carbs ? `Min carbs: ${constraints.min_carbs}g` : null,
    constraints.max_fats ? `Max fats: ${constraints.max_fats}g` : null,
    constraints.min_fats ? `Min fats: ${constraints.min_fats}g` : null,
    constraints.diet ? `Diet: ${constraints.diet}` : null,
    constraints.dietary_tags?.length ? `Dietary tags: ${constraints.dietary_tags.join(', ')}` : null,
  ].filter(Boolean).join(', ');

  const dietaryRules = generateDietaryRules(userProfile);
  
  const systemPrompt = `You are a meal recommendation assistant. Your task is to:
1. STRICTLY filter items that violate hard constraints (e.g., if user says "Vegan", discard all meat items).
2. Rank and select the top 3-5 items that best fit the user's goal (e.g., highest protein/calorie ratio).
3. Generate a friendly, short response explaining why these items were chosen.
4. NEVER hallucinate items. Only return items present in the provided list.
${dietaryRules}
CRITICAL RULES:
- You may ONLY recommend items that are present in the provided list below.
- Do NOT invent or suggest items that are not in the list.
- If an item violates a hard constraint OR any dietary restriction listed above, you MUST discard it immediately.
- Return your response as a JSON object with:
  - "content": A friendly explanation (2-3 sentences) of why these items were chosen
  - "selected_item_ids": Array of item IDs (strings) from the list below, ordered by relevance

Example response format:
{
  "content": "I found 3 great options for you! These items have high protein and fit your calorie goal.",
  "selected_item_ids": ["item-id-1", "item-id-2", "item-id-3"]
}`;

  const userPrompt = `User Query: "${intent.semantic_query}"
User Profile:
- Diet Type: ${userProfile.diet_type || 'Regular'}
- Calorie Target: ${userProfile.target_calories || 'N/A'}
- Protein Target: ${userProfile.target_protein_g || 'N/A'}

Hard Constraints: ${constraintsText || 'None specified'}

Available Items:
${JSON.stringify(itemList, null, 2)}

Filter items based on constraints, rank by relevance, and select the top 3-5 items. Return JSON with "content" and "selected_item_ids".`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from filtering LLM');
    }

    const parsed = JSON.parse(responseText) as LLMResponse;
    
    // Validate that all selected IDs exist in the items list
    const validIds = parsed.selected_item_ids.filter(id => 
      items.some(item => item.id === id)
    );

    return {
      content: parsed.content || `I found ${validIds.length} great option${validIds.length !== 1 ? 's' : ''} for you!`,
      selected_item_ids: validIds.slice(0, 5) // Limit to 5 items
    };
  } catch (error: any) {
    console.error('Filtering and reasoning error:', error);
    // Fallback: return first 3 items with generic message
    return {
      content: `I found ${Math.min(3, items.length)} option${items.length !== 1 ? 's' : ''} for you! Tap any meal to see full details.`,
      selected_item_ids: items.slice(0, 3).map(item => item.id)
    };
  }
}

/**
 * Main POST handler
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, userProfile, location, mealHistory } = body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile is required' },
        { status: 400 }
      );
    }

    // Initialize clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!openaiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Step A: Intent & Constraint Extraction
    console.log('Step A: Extracting intent and constraints...');
    const intent = await extractIntentAndConstraints(openai, messages, userProfile);
    console.log('Extracted intent:', JSON.stringify(intent, null, 2));

    // Check if meal recommendations are appropriate for this query
    console.log('Checking if meal recommendations are appropriate...');
    const isMealQuery = await isMealRecommendationAppropriate(openai, messages, intent);
    console.log(`Is meal query: ${isMealQuery}`);

    if (!isMealQuery) {
      // Generate conversational response instead of meal recommendations
      console.log('Generating conversational response...');
      const conversationalContent = await generateConversationalResponse(openai, messages, userProfile);
      return NextResponse.json({
        content: conversationalContent,
        meals: [] // Empty meals array means no meal cards should be shown
      });
    }

    // Step B: Data Retrieval
    console.log('Step B: Retrieving menu items from Supabase...');
    const menuItems = await retrieveMenuItems(supabase, intent, openai);
    console.log(`Retrieved ${menuItems.length} items`);

    // If no items found, generate a helpful conversational response
    if (menuItems.length === 0) {
      console.log('No items found, generating conversational fallback...');
      const conversationalContent = await generateConversationalResponse(openai, messages, userProfile);
      return NextResponse.json({
        content: conversationalContent,
        meals: [] // Empty meals array means no meal cards should be shown
      });
    }

    // Step C: Filtering & Reasoning
    console.log('Step C: Filtering and reasoning with LLM...');
    const llmResponse = await filterAndReason(openai, menuItems, intent, userProfile);
    console.log(`Selected ${llmResponse.selected_item_ids.length} items`);

    // Convert selected items to Meal type
    let selectedItems = menuItems.filter(item => 
      llmResponse.selected_item_ids.includes(item.id)
    );
    
    // If no items were selected after filtering, but we have items, show top 3 as fallback
    if (selectedItems.length === 0 && menuItems.length > 0) {
      console.log('No items selected after filtering, showing top 3 items as fallback...');
      selectedItems = menuItems.slice(0, 3);
    }

    // If still no items, generate conversational response
    if (selectedItems.length === 0) {
      console.log('No items available, generating conversational fallback...');
      const conversationalContent = await generateConversationalResponse(openai, messages, userProfile);
      return NextResponse.json({
        content: conversationalContent,
        meals: [] // Empty meals array means no meal cards should be shown
      });
    }

    const meals = selectedItems.map(convertToMeal);

    // Return response matching expected structure
    return NextResponse.json({
      content: llmResponse.content || `I found ${meals.length} great option${meals.length !== 1 ? 's' : ''} for you! Tap any meal to see full details.`,
      meals: meals
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        content: "Sorry, I encountered an error while searching. Please try again.",
        meals: []
      },
      { status: 500 }
    );
  }
}
