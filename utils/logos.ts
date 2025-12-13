// Mapping for restaurant names that don't match logo filenames exactly
// This handles variations in how restaurant names are stored vs. logo filenames
const RESTAURANT_LOGO_MAP: Record<string, string> = {
  // Dunkin variations
  'dunkin\'': 'dunkin_donuts',
  'dunkin': 'dunkin_donuts',
  'dunkin donuts': 'dunkin_donuts',
  'dunkin\' donuts': 'dunkin_donuts',
  
  // Habit Burger variations
  'the habit burger grill': 'habit_burger',
  'habit burger grill': 'habit_burger',
  'habit burger': 'habit_burger',
  
  // In-N-Out variations
  'in-n-out burger': 'in_n_out',
  'in-n-out': 'in_n_out',
  'in n out burger': 'in_n_out',
  'in n out': 'in_n_out',
  
  // Chick-fil-A variations
  'chick-fil-a': 'chick_fil_a',
  'chick fil a': 'chick_fil_a',
  
  // Moe's variations
  'moe\'s southwest grill': 'moes_southwest_grill',
  'moes southwest grill': 'moes_southwest_grill',
  'moe\'s': 'moes_southwest_grill',
  
  // Raising Cane's variations
  'raising cane\'s': 'raising_canes',
  'raising canes': 'raising_canes',
  
  // Jersey Mike's variations
  'jersey mike\'s': 'jersey_mikes',
  'jersey mikes': 'jersey_mikes',
  
  // Jimmy John's variations
  'jimmy john\'s': 'jimmy_johns',
  'jimmy johns': 'jimmy_johns',
  
  // McDonald's variations
  'mcdonald\'s': 'mcdonalds',
  'mcdonalds': 'mcdonalds',
  
  // Culver's variations
  'culver\'s': 'culvers',
  'culvers': 'culvers',
  
  // Wendy's variations
  'wendy\'s': 'wendys',
  'wendys': 'wendys',
  
  // Zaxby's variations
  'zaxby\'s': 'zaxbys',
  'zaxbys': 'zaxbys',
  
  // Domino's variations
  'domino\'s': 'dominos',
  'dominos': 'dominos',
  
  // Salad and Go variations
  'salad and go': 'salad_and_go',
  'salad & go': 'salad_and_go',
  'saladandgo': 'salad_and_go',
  'salad_and_go': 'salad_and_go',
  
  // Just Salad variations
  'just salad': 'just_salad',
  'justsalad': 'just_salad',
  'just_salad': 'just_salad',
  
  // Whataburger variations
  'whataburger': 'whataburger-',
  'what a burger': 'whataburger-',
};
// utils/logos.ts
export const getLogo = (restaurantName: string | null | undefined) => {
  // 1. Handle missing data gracefully
  if (!restaurantName) return '/logos/default.png'; 

  // 2. Normalize the name for lookup
  const normalized = restaurantName
    .toLowerCase()
    .trim();

  // 3. Check if there's a mapping for this restaurant name
  if (RESTAURANT_LOGO_MAP[normalized]) {
    return `/logos/${RESTAURANT_LOGO_MAP[normalized]}.png`;
  }

  // 4. Fallback: Auto-generate slug from name
  // This handles "Taco Bell", "taco-bell", "Wendy's", "Chick-fil-A" automatically.
  const slug = normalized
    .replace(/'/g, '')           // Remove apostrophes
    .replace(/[^a-z0-9]/g, '_')  // Replace symbols/spaces with underscores
    .replace(/_+/g, '_');        // Remove double underscores

  return `/logos/${slug}.png`;
};

