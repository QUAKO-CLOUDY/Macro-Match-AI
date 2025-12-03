import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing environment variables. Check .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// Helper function to capitalize restaurant name from filename
function getRestaurantName(filename: string): string {
  const nameWithoutExt = filename.replace(/\.json$/i, '');
  // Capitalize first letter of each word
  return nameWithoutExt
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get or create restaurant
async function getOrCreateRestaurant(restaurantName: string): Promise<string> {
  // Check if restaurant exists
  const { data: existing, error: searchError } = await supabase
    .from('restaurants')
    .select('id')
    .ilike('name', restaurantName)
    .maybeSingle();

  if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
    console.error(`Error searching for restaurant ${restaurantName}:`, searchError);
    throw searchError;
  }

  if (existing) {
    console.log(`  Found existing restaurant: ${restaurantName} (ID: ${existing.id})`);
    return existing.id;
  }

  // Create new restaurant
  const { data: newRestaurant, error: createError } = await supabase
    .from('restaurants')
    .insert({ name: restaurantName })
    .select('id')
    .single();

  if (createError || !newRestaurant) {
    console.error(`Error creating restaurant ${restaurantName}:`, createError);
    throw createError || new Error('Failed to create restaurant');
  }

  console.log(`  Created new restaurant: ${restaurantName} (ID: ${newRestaurant.id})`);
  return newRestaurant.id;
}

// Generate embedding for an item
async function generateEmbedding(itemName: string, description: string): Promise<number[]> {
  const textToEmbed = `${itemName}: ${description || ''}`;
  
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    });

    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embedding for ${itemName}:`, error);
    throw error;
  }
}

// Process a single JSON file
async function processFile(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  const restaurantName = getRestaurantName(filename);

  console.log(`\n📄 Processing ${filename}...`);
  console.log(`   Restaurant: ${restaurantName}`);

  // Read and parse JSON file
  let items: any[];
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    items = JSON.parse(fileContent);
    
    if (!Array.isArray(items)) {
      console.error(`  ❌ Error: ${filename} does not contain a JSON array`);
      return;
    }
  } catch (error) {
    console.error(`  ❌ Error reading/parsing ${filename}:`, error);
    return;
  }

  console.log(`   Found ${items.length} items to import`);

  // Get or create restaurant
  let restaurantId: string;
  try {
    restaurantId = await getOrCreateRestaurant(restaurantName);
  } catch (error) {
    console.error(`  ❌ Failed to get/create restaurant:`, error);
    return;
  }

  // Process each item
  let importedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      // Generate embedding
      const embedding = await generateEmbedding(
        item.item_name || item.name || '',
        item.description || ''
      );

      // Add delay between OpenAI calls (except for the last item)
      if (i < items.length - 1) {
        await delay(200);
      }

      // Map JSON fields to database columns
      const menuItemData: any = {
        restaurant_id: restaurantId,
        embedding: embedding,
        item_name: item.item_name || item.name || null,
        description: item.description || null,
        category: item.category || null,
        price: item.price !== undefined ? item.price : null,
        calories: item.calories !== undefined ? item.calories : null,
        protein_g: item.protein_g !== undefined ? item.protein_g : null,
        carbs_g: item.carbs_g !== undefined ? item.carbs_g : null,
        fats_g: item.fats_g !== undefined ? item.fats_g : null,
        dietary_tags: item.dietary_tags || null,
      };

      // Insert into database
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(menuItemData);

      if (insertError) {
        console.error(`  ⚠️  Error inserting item "${item.item_name || item.name}":`, insertError.message);
        errorCount++;
      } else {
        importedCount++;
        if ((importedCount + errorCount) % 10 === 0) {
          console.log(`  ✓ Imported ${importedCount} items...`);
        }
      }
    } catch (error: any) {
      console.error(`  ⚠️  Error processing item "${item.item_name || item.name}":`, error.message);
      errorCount++;
    }
  }

  console.log(`  ✅ Completed ${filename}: Imported ${importedCount} items, ${errorCount} errors`);
}

// Main function
async function bulkImport() {
  console.log('🚀 Starting bulk import...\n');

  // Get the scripts directory (where this file is located)
  const scriptsDir = path.resolve(process.cwd(), 'scripts');
  const dataDir = path.join(scriptsDir, 'data');
  
  // Check if data directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Get all JSON files
  const files = fs.readdirSync(dataDir)
    .filter(file => file.toLowerCase().endsWith('.json'))
    .map(file => path.join(dataDir, file));

  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${dataDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} JSON file(s) to process\n`);

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  console.log('\n✨ Bulk import completed!');
}

// Run the script
bulkImport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

