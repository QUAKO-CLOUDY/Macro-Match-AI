'use client';

import { useState } from 'react';
import { Search, Flame, ChevronRight, Sparkles, X, AlertCircle } from 'lucide-react';
import type { Meal } from '../types';

type Props = {
  onMealSelect: (meal: Meal) => void;
  onBack?: () => void;
};

// Convert API result to Meal type
function convertToMeal(item: any): Meal {
  // Determine category from item data
  const category = item.category === 'Grocery' || item.category === 'Hot Bar' 
    ? 'grocery' as const 
    : 'restaurant' as const;

  return {
    id: item.id || `meal-${Date.now()}-${Math.random()}`,
    name: item.item_name || item.name || 'Unknown Item',
    restaurant: item.restaurant_name || 'Unknown Restaurant',
    calories: item.calories || 0,
    protein: item.protein_g || 0,
    carbs: item.carbs_g || 0,
    fats: item.fat_g || 0,
    image: item.image_url || '/placeholder-food.jpg',
    price: item.price || null, // Keep null for proper handling
    description: item.description || '',
    category: category,
    dietary_tags: item.dietary_tags || item.tags || [],
  };
}

export function SearchScreen({ onMealSelect, onBack }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      const data = await res.json();
      console.log("Search API response:", data);
      
      // Normalize API response to always be an array
      let normalizedResults: any[] = [];
      
      if (Array.isArray(data)) {
        normalizedResults = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalizedResults = data.results;
      }
      
      // Convert to Meal type
      const meals = normalizedResults.map(convertToMeal);
      setResults(meals);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setIsSearchOpen(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex justify-between items-center">
        {onBack ? (
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div />
        )}
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          SeekEatz
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
            Search
          </span>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-md mx-auto w-full space-y-6 pb-24">
        
        {/* Welcome / Empty State */}
        {!hasSearched && (
          <div className="text-center mt-20 opacity-60">
            <Sparkles className="w-12 h-12 mx-auto text-cyan-500 mb-4 animate-pulse" />
            <h2 className="text-lg font-medium text-foreground">Ready to fuel?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Search for high-protein meals, specific restaurants, or dietary preferences.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
             ))}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          {results.map((meal) => {
            // Check for variable availability
            const hasVariableAvailability = meal.dietary_tags?.some(
              (tag: string) => tag === 'Location Varies' || tag === 'Seasonal'
            ) || false;

            // Check if it's a grocery/hot bar item
            const isGrocery = meal.category === 'grocery' || 
                            meal.category === 'Grocery' || 
                            meal.category === 'Hot Bar';

            // Format price with safety checks
            const formatPrice = () => {
              if (!meal.price || meal.price === 0) {
                return 'Market Price';
              }
              return `~$${meal.price.toFixed(2)}`;
            };

            return (
              <div
                key={meal.id}
                onClick={() => onMealSelect(meal)}
                className={`bg-card rounded-xl overflow-hidden shadow-sm hover:border-cyan-500/50 transition-colors cursor-pointer ${
                  isGrocery 
                    ? 'border-2 border-green-500/30' 
                    : 'border border-border'
                }`}
              >
                {/* Grocery Badge */}
                {isGrocery && (
                  <div className="bg-green-500/20 border-b border-green-500/30 px-3 py-1.5">
                    <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      Buy & Assemble
                    </span>
                  </div>
                )}

                <div className="flex">
                  {/* Image Placeholder */}
                  <div className="w-24 h-24 bg-muted flex-shrink-0 relative">
                    {meal.image && meal.image !== '/placeholder-food.jpg' ? (
                      <img 
                        src={meal.image} 
                        alt={meal.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                        Food
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-3 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-card-foreground truncate pr-2">{meal.name}</h3>
                      <span 
                        className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                        title="Price varies by location"
                      >
                        {formatPrice()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground">{meal.restaurant}</p>
                      {hasVariableAvailability && (
                        <div 
                          className="group relative"
                          title="Availability depends on store location"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                          {/* Tooltip for desktop */}
                          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card text-xs text-card-foreground rounded whitespace-nowrap z-10 border border-border">
                            Availability depends on store location
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-card"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Macros Badge */}
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <div className="flex items-center text-orange-400 font-medium bg-orange-400/10 px-2 py-0.5 rounded">
                        <Flame className="w-3 h-3 mr-1" />
                        {meal.protein}g Pro
                      </div>
                      <span className="text-muted-foreground">{meal.calories} cal</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasSearched && !loading && results.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="mb-2">No meals found matching that description.</p>
              <p className="text-sm text-muted-foreground/70">Try a different search term.</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Bar (Fixed at bottom) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
        <form onSubmit={handleSearch} className="max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-2 shadow-2xl flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meals, restaurants, or preferences..."
                className="w-full bg-muted border-none rounded-xl py-3 pl-4 pr-12 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cyan-500 outline-none"
                onFocus={() => setIsSearchOpen(true)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white rounded-lg px-3 py-2 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

