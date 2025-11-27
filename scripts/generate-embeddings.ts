import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE_KEY if RLS blocks you
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function generateEmbeddings() {
  console.log('🔮 Starting embedding generation...');

  // 1. Get items with missing embeddings
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, item_name, description')
    .is('embedding', null)
    .limit(50); // Process 50 at a time to be safe

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  if (!items || items.length === 0) {
    console.log('✅ All items already have embeddings!');
    return;
  }

  console.log(`Found ${items.length} items to process.`);

  // 2. Loop through and generate vectors
  for (const item of items) {
    const textToEmbed = `${item.item_name}: ${item.description || ''}`;
    
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // 3. Update Supabase
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ embedding })
        .eq('id', item.id);

      if (updateError) console.error(`Failed to update ${item.item_name}:`, updateError);
      else console.log(`✨ Embedded: ${item.item_name}`);
      
    } catch (err) {
      console.error(`Failed to embed ${item.item_name}:`, err);
    }
  }
}

generateEmbeddings();