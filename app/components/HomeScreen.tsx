"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { MealCard } from "./MealCard";
import type { UserProfile, Meal } from "../types";
import { getMealImageUrl } from "@/lib/image-utils";
import { useSessionActivity } from "../hooks/useSessionActivity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type MacroType = "calories" | "protein" | "carbs" | "fats";

type MacroConfig = {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
};

const MACRO_CONFIG: Record<MacroType, MacroConfig> = {
  calories: { label: "Calories", min: 500, max: 2500, step: 50 },
  protein: { label: "Protein", unit: "g", min: 0, max: 100, step: 5 },
  carbs: { label: "Carbs", unit: "g", min: 0, max: 100, step: 10 },
  fats: { label: "Fats", unit: "g", min: 0, max: 100, step: 5 },
};

const CUISINES = [
  { id: "mexican", label: "Mexican", icon: "🌮" },
  { id: "american", label: "American", icon: "🍔" },
  { id: "sushi", label: "Sushi", icon: "🍣" },
  { id: "mediterranean", label: "Mediterranean", icon: "🥙" },
  { id: "greek", label: "Greek", icon: "🫒" },
  { id: "chinese", label: "Chinese", icon: "🥟" },
  { id: "indian", label: "Indian", icon: "🍛" },
  { id: "italian", label: "Italian", icon: "🍝" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

type Props = {
  userProfile: UserProfile;
  onMealSelect: (meal: Meal) => void;
  favoriteMeals: string[];
  onSearch?: () => void;
  onNavigateToChat?: (message?: string) => void;
  onToggleFavorite?: (mealId: string, meal?: Meal) => void;
};

export function HomeScreen({ userProfile, onMealSelect, favoriteMeals = [], onToggleFavorite }: Props) {
  const { updateActivity } = useSessionActivity();
  
  // Extract first name from user profile
  const getUserFirstName = () => {
    const name = userProfile?.full_name || "";
    if (!name) return "Friend";
    const firstName = name.trim().split(/\s+/)[0];
    return firstName || name;
  };

  const userName = getUserFirstName();
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_selected_cuisine');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [macro, setMacro] = useState<MacroType>("calories");
  
  // Initialize with user profile targets, or defaults
  const [macroValues, setMacroValues] = useState<Record<MacroType, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_macro_values');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved macro values:', e);
        }
      }
    }
    return {
      calories: userProfile?.target_calories || 2000,
      protein: userProfile?.target_protein_g || 150,
      carbs: userProfile?.target_carbs_g || 200,
      fats: userProfile?.target_fats_g || 70,
    };
  });

  // Load persisted meals and search state
  const [recommendedMeals, setRecommendedMeals] = useState<Meal[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_recommended_meals');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved meals:', e);
        }
      }
    }
    return [];
  });
  
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_has_searched');
      return saved === 'true';
    }
    return false;
  });
  const mealsSectionRef = useRef<HTMLDivElement>(null);
  
  // Track last search parameters to detect changes
  const [lastSearchParams, setLastSearchParams] = useState<{
    macroValues: Record<MacroType, number>;
    selectedCuisine: string | null;
    distance?: number;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_last_search_params');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse last search params:', e);
        }
      }
    }
    return null;
  });

  // Session-level distance override (temporary, not persisted to profile)
  const [homeDistanceOverride, setHomeDistanceOverride] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('seekeatz_home_distance_override');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse home distance override:', e);
        }
      }
    }
    return null;
  });

  // Get active distance: Home override if set, otherwise Settings default, otherwise 1 mile
  const activeDistance = homeDistanceOverride ?? userProfile.search_distance_miles ?? 1;

  const config = MACRO_CONFIG[macro];
  const currentValue = macroValues[macro];

  const handleMacroChange = (nextMacro: MacroType) => {
    setMacro(nextMacro);
  };

  const handleValueChange = (newValue: number) => {
    setMacroValues((prev) => {
      const updated = { ...prev, [macro]: newValue };
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('seekeatz_macro_values', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Persist selected cuisine
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seekeatz_selected_cuisine', JSON.stringify(selectedCuisine));
    }
  }, [selectedCuisine]);

  // Clear meals when macro values, cuisine, or distance change (but only if we have meals and params have changed)
  useEffect(() => {
    // Only run if we have both last search params and current meals
    if (lastSearchParams && recommendedMeals.length > 0) {
      const macroValuesChanged = 
        lastSearchParams.macroValues.calories !== macroValues.calories ||
        lastSearchParams.macroValues.protein !== macroValues.protein ||
        lastSearchParams.macroValues.carbs !== macroValues.carbs ||
        lastSearchParams.macroValues.fats !== macroValues.fats;
      
      const cuisineChanged = lastSearchParams.selectedCuisine !== selectedCuisine;
      const distanceChanged = lastSearchParams.distance !== activeDistance;
      
      if (macroValuesChanged || cuisineChanged || distanceChanged) {
        // Clear meals when macros, cuisine, or distance change
        setRecommendedMeals([]);
        setHasSearched(false);
        setLastSearchParams(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('seekeatz_recommended_meals');
          localStorage.removeItem('seekeatz_has_searched');
          localStorage.removeItem('seekeatz_last_search_params');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroValues.calories, macroValues.protein, macroValues.carbs, macroValues.fats, selectedCuisine, activeDistance]);

  // Convert API result to Meal type
  const convertToMeal = (item: any): Meal => {
    const category = item.category === 'Grocery' || item.category === 'Hot Bar' 
      ? 'grocery' as const 
      : 'restaurant' as const;

    const mealName = item.item_name || item.name || 'Unknown Item';
    const restaurantName = item.restaurant_name || 'Unknown Restaurant';
    
    // Use getMealImageUrl to ensure we always have a real food image
    const imageUrl = getMealImageUrl(
      mealName,
      restaurantName,
      item.image_url || item.image
    );

    // Handle fats - check fats_g (database column) first, then other variations
    const fats = item.fats_g ?? item.fat_g ?? item.fats ?? item.fat ?? 
                 (item.nutrition_info?.fats_g) ?? 
                 (item.nutrition_info?.fat_g) ?? 
                 (item.nutrition_info?.fats) ?? 
                 (item.nutrition_info?.fat) ?? 0;

    return {
      id: item.id || `meal-${Date.now()}-${Math.random()}`,
      name: mealName,
      restaurant: restaurantName,
      calories: item.calories || 0,
      protein: item.protein_g || 0,
      carbs: item.carbs_g || 0,
      fats: typeof fats === 'number' ? fats : 0,
      image: imageUrl,
      price: item.price || null,
      description: item.description || '',
      category: category,
      dietary_tags: item.dietary_tags || item.tags || [],
      rating: item.rating || undefined,
      distance: item.distance || undefined,
    };
  };

  // Check if a meal matches the selected cuisine
  const mealMatchesCuisine = (meal: Meal, cuisineId: string | null): boolean => {
    if (!cuisineId) return true; // No filter if no cuisine selected
    
    const cuisine = CUISINES.find(c => c.id === cuisineId);
    if (!cuisine) return true;
    
    const cuisineLabel = cuisine.label.toLowerCase();
    const mealText = `${meal.name} ${meal.restaurant} ${meal.description || ''} ${(meal.dietary_tags || []).join(' ')}`.toLowerCase();
    
    // Check if cuisine name appears in meal text
    return mealText.includes(cuisineLabel.toLowerCase());
  };

  // Filter meals based on user profile (diet_type and dietary_options)
  const filterMealsByProfile = (meals: Meal[], profile: UserProfile): Meal[] => {
    if (!meals || meals.length === 0) return meals;
    
    let filtered = [...meals];
    
    // Filter by diet_type
    if (profile.diet_type) {
      const dietType = profile.diet_type.toLowerCase();
      const mealTags = (meal: Meal) => (meal.dietary_tags || []).map(tag => tag.toLowerCase());
      
      if (dietType === 'vegan') {
        filtered = filtered.filter(meal => {
          const tags = mealTags(meal);
          return tags.includes('vegan') || tags.includes('plant-based');
        });
      } else if (dietType === 'vegetarian') {
        filtered = filtered.filter(meal => {
          const tags = mealTags(meal);
          const mealText = `${meal.name} ${meal.description || ''}`.toLowerCase();
          // Exclude meat, poultry, fish, seafood
          const hasMeat = mealText.includes('chicken') || mealText.includes('beef') || mealText.includes('pork') || 
                         mealText.includes('turkey') || mealText.includes('fish') || mealText.includes('salmon') ||
                         mealText.includes('tuna') || mealText.includes('shrimp') || mealText.includes('seafood');
          return tags.includes('vegetarian') || (!hasMeat && (tags.includes('vegan') || tags.includes('plant-based')));
        });
      } else if (dietType === 'keto' || dietType === 'ketogenic') {
        filtered = filtered.filter(meal => {
          // Keto: low carb (typically <20g net carbs)
          return meal.carbs < 25; // Approximate threshold
        });
      } else if (dietType === 'low_carb' || dietType === 'low carb' || dietType === 'low-carb') {
        filtered = filtered.filter(meal => {
          // Low carb: prioritize lower carb options
          return meal.carbs < 50; // Approximate threshold
        });
      }
    }
    
    // Filter by dietary_options (hard constraints for allergens)
    if (profile.dietary_options && profile.dietary_options.length > 0) {
      const normalizedOptions = profile.dietary_options.map(opt => opt.toLowerCase().replace(/[-\s]+/g, '_'));
      const mealTags = (meal: Meal) => (meal.dietary_tags || []).map(tag => tag.toLowerCase().replace(/[-\s]+/g, '_'));
      
      // Hard constraints: exclude items with allergens
      if (normalizedOptions.includes('gluten_free')) {
        filtered = filtered.filter(meal => {
          const tags = mealTags(meal);
          return tags.includes('gluten_free') || tags.includes('gluten-free');
        });
      }
      
      if (normalizedOptions.includes('dairy_free')) {
        filtered = filtered.filter(meal => {
          const tags = mealTags(meal);
          return tags.includes('dairy_free') || tags.includes('dairy-free');
        });
      }
      
      // Note: For other allergens (nut, soy, egg, shellfish), we'd need allergen data in the meal object
      // For now, we rely on dietary_tags matching
    }
    
    // If no meals match after filtering, return original list (let AI reasoning handle it)
    return filtered.length > 0 ? filtered : meals;
  };

  // Get user location (if available)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Request user location on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error.message);
          // Don't show error to user - radius filtering just won't work
        }
      );
    }
  }, []);

  const searchMeals = async (query: string, distance?: number, append = false): Promise<Meal[]> => {
    try {
      // Log search parameters for debugging (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Search: query="${query}", radius=${distance} miles, hasLocation=${!!userLocation}`);
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          radius_miles: distance,
          user_location: userLocation
        }),
      });
      
      const data = await res.json();
      
      // Normalize API response to always be an array
      let normalizedResults: any[] = [];
      
      if (Array.isArray(data)) {
        normalizedResults = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalizedResults = data.results;
      }
      
      // Convert to Meal type
      const meals = normalizedResults.map(convertToMeal);
      
      // Filter to only full meals (exclude sides/ingredients)
      const fullMeals = meals.filter((meal: Meal) => {
        // Exclude very low calorie items (likely single ingredients)
        if (meal.calories < 150) return false;
        return true;
      });
      
      return fullMeals;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  };

  const handleFindMeals = async () => {
    updateActivity(); // Update activity on button click
    setIsLoadingMeals(true);
    setHasSearched(true);
    
    // Build query based on all macro values, cuisine, and profile settings
    const cuisinePart = selectedCuisine 
      ? ` ${CUISINES.find(c => c.id === selectedCuisine)?.label.toLowerCase()}` 
      : "";
    
    // Add diet type to query if set
    const dietPart = userProfile.diet_type && userProfile.diet_type.toLowerCase() !== 'regular'
      ? ` ${userProfile.diet_type.toLowerCase()}`
      : "";
    
    // Add dietary options to query (high protein, etc.)
    const dietaryPart = userProfile.dietary_options && userProfile.dietary_options.length > 0
      ? userProfile.dietary_options
          .filter(opt => {
            const normalized = opt.toLowerCase().replace(/[-\s]+/g, '_');
            return normalized === 'high_protein' || normalized === 'high-protein';
          })
          .map(opt => opt.toLowerCase())
          .join(' ')
      : "";
    
    const query = `${macroValues.calories} calories ${macroValues.protein}g protein ${macroValues.carbs}g carbs ${macroValues.fats}g fats${cuisinePart}${dietPart}${dietaryPart ? ' ' + dietaryPart : ''}`.trim();
    
    const meals = await searchMeals(query, activeDistance);
    
    // Filter meals by selected cuisine if one is selected
    let filteredMeals = selectedCuisine 
      ? meals.filter(meal => mealMatchesCuisine(meal, selectedCuisine))
      : meals;
    
    // Apply profile-based filtering
    filteredMeals = filterMealsByProfile(filteredMeals, userProfile);
    
    // Take first 3 meals
    const newMeals = filteredMeals.slice(0, 3);
    setRecommendedMeals(newMeals);
    
    // Save search parameters and results
    const searchParams = {
      macroValues: { ...macroValues },
      selectedCuisine,
      distance: activeDistance,
    };
    setLastSearchParams(searchParams);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('seekeatz_recommended_meals', JSON.stringify(newMeals));
      localStorage.setItem('seekeatz_has_searched', 'true');
      localStorage.setItem('seekeatz_last_search_params', JSON.stringify(searchParams));
    }
    
    setIsLoadingMeals(false);
    
    // Scroll to meals section after a short delay to ensure it's rendered
    setTimeout(() => {
      mealsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFindMoreMeals = async () => {
    updateActivity(); // Update activity on button click
    setIsLoadingMeals(true);
    
    // Build query based on all macro values, cuisine, and profile settings
    const cuisinePart = selectedCuisine 
      ? ` ${CUISINES.find(c => c.id === selectedCuisine)?.label.toLowerCase()}` 
      : "";
    
    // Add diet type to query if set
    const dietPart = userProfile.diet_type && userProfile.diet_type.toLowerCase() !== 'regular'
      ? ` ${userProfile.diet_type.toLowerCase()}`
      : "";
    
    // Add dietary options to query (high protein, etc.)
    const dietaryPart = userProfile.dietary_options && userProfile.dietary_options.length > 0
      ? userProfile.dietary_options
          .filter(opt => {
            const normalized = opt.toLowerCase().replace(/[-\s]+/g, '_');
            return normalized === 'high_protein' || normalized === 'high-protein';
          })
          .map(opt => opt.toLowerCase())
          .join(' ')
      : "";
    
    const query = `${macroValues.calories} calories ${macroValues.protein}g protein ${macroValues.carbs}g carbs ${macroValues.fats}g fats${cuisinePart}${dietPart}${dietaryPart ? ' ' + dietaryPart : ''}`.trim();
    
    const meals = await searchMeals(query, activeDistance);
    
    // Filter meals by selected cuisine if one is selected
    let filteredMeals = selectedCuisine 
      ? meals.filter(meal => mealMatchesCuisine(meal, selectedCuisine))
      : meals;
    
    // Apply profile-based filtering
    filteredMeals = filterMealsByProfile(filteredMeals, userProfile);
    
    // Get existing meal IDs to avoid duplicates
    const existingIds = new Set(recommendedMeals.map(m => m.id));
    
    // Filter out duplicates - fetch up to 15 results to have better chance of getting 3 unique ones
    const uniqueMeals = filteredMeals.filter(m => !existingIds.has(m.id));
    
    // Shuffle and take 3 new meals for variety
    const shuffled = [...uniqueMeals].sort(() => Math.random() - 0.5);
    const newMeals = shuffled.slice(0, 3);
    
    if (newMeals.length > 0) {
      // Append new meals to existing list
      setRecommendedMeals(prev => [...prev, ...newMeals]);
    }
    
    setIsLoadingMeals(false);
  };

  return (
    <div 
      className="w-full bg-background text-foreground px-4 pt-3 sm:pt-6 pb-safe flex flex-col"
      style={{ paddingBottom: `calc(8rem + env(safe-area-inset-bottom, 0px))` }}
    >
      {/* Top greeting & distance selector */}
      <header className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-muted-foreground">{getGreeting()},</span>
          <span className="text-lg sm:text-xl font-semibold">
            <span
              className="bg-gradient-to-r from-[#4DDDF9] to-[#3A8BFF] bg-clip-text text-transparent"
              aria-label={userName}
            >
              {userName}
            </span>
          </span>
        </div>
        <Select
          value={activeDistance.toString()}
          onValueChange={(value) => {
            const distance = Number(value);
            setHomeDistanceOverride(distance);
            // Persist to sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('seekeatz_home_distance_override', JSON.stringify(distance));
            }
            // Clear meals and refresh if we have existing results
            // IMPORTANT: DO NOT set seekeatz_pending_chat_message or trigger any chat messages here.
            // Radius changes should only update state and refresh meal results - never post to chat.
            if (hasSearched && recommendedMeals.length > 0) {
              setRecommendedMeals([]);
              setHasSearched(false);
              setLastSearchParams(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('seekeatz_recommended_meals');
                localStorage.removeItem('seekeatz_has_searched');
                localStorage.removeItem('seekeatz_last_search_params');
              }
            }
          }}
        >
          <SelectTrigger className="h-7 w-auto min-w-[50px] sm:h-7 sm:min-w-[55px] px-1 sm:px-1.5 rounded-full border-border bg-muted/50 hover:bg-muted text-[10px] font-medium gap-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <SelectValue className="text-[10px]">{activeDistance} mi</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 5, 10, 15, 20].map((distance) => (
              <SelectItem key={distance} value={distance.toString()}>
                {distance} {distance === 1 ? 'mile' : 'miles'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* Cuisine row */}
      <section className="mb-4 sm:mb-5">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
          {CUISINES.map((cuisine) => {
            const isActive = cuisine.id === selectedCuisine;
            return (
              <button
                key={cuisine.id}
                onClick={() => {
                  // Toggle: if already selected, deselect; otherwise select
                  const newCuisine = isActive ? null : cuisine.id;
                  setSelectedCuisine(newCuisine);
                  // Persist immediately
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('seekeatz_selected_cuisine', JSON.stringify(newCuisine));
                  }
                }}
                className={`flex flex-col items-center flex-shrink-0 transition-transform ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              >
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center border border-border shadow-sm transition-all overflow-hidden ${
                    isActive
                      ? "bg-primary/10 shadow-[0_0_12px_rgba(72,149,239,0.6)] ring-2 ring-[#4DDDF9]/50"
                      : "bg-muted/50"
                  }`}
                >
                  <span className="text-xl sm:text-2xl leading-none">{cuisine.icon}</span>
                </div>
                <span
                  className={`mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] tracking-wide ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {cuisine.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center">
        {/* Plate */}
        <PlateSelector
          macro={macro}
          value={currentValue}
          config={config}
        />

        {/* Macro tabs */}
        <div className="mt-6 sm:mt-8 flex gap-4 sm:gap-5 flex-wrap justify-center">
          {(["calories", "protein", "carbs", "fats"] as MacroType[]).map(
            (type) => {
              const isActive = macro === type;
              return (
                <button
                  key={type}
                  onClick={() => handleMacroChange(type)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#3A8BFF] to-[#4DDDF9] text-white shadow-lg shadow-[#3A8BFF]/40"
                      : "bg-muted text-foreground border border-border hover:bg-muted/80"
                  }`}
                >
                  {MACRO_CONFIG[type].label}
                </button>
              );
            }
          )}
        </div>

        {/* Ruler slider – always visible */}
        <div className="mt-2 sm:mt-3 w-full max-w-md">
          <RulerSlider
            min={config.min}
            max={config.max}
            step={config.step}
            value={currentValue}
            onChange={handleValueChange}
          />
        </div>

        {/* CTA */}
        <button 
          onClick={handleFindMeals}
          disabled={isLoadingMeals}
          className="mt-3 sm:mt-4 w-full max-w-md h-11 sm:h-12 rounded-2xl bg-gradient-to-r from-[#3A8BFF] to-[#4DDDF9] text-sm sm:text-[15px] font-medium shadow-lg shadow-[#3A8BFF]/40 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-[#3A8BFF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingMeals ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              Finding Meals...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              Find Meals That Match This
            </>
          )}
        </button>
      </main>

      {/* Recommended Meals Section */}
      {hasSearched && (
        <section ref={mealsSectionRef} className="w-full mt-6 sm:mt-8 mb-24">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 px-4 text-foreground">
            Recommended Meals
          </h2>
          
          {isLoadingMeals && recommendedMeals.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4DDDF9]" />
            </div>
          ) : recommendedMeals.length > 0 ? (
            <>
              <div className="space-y-3 sm:space-y-4 px-4">
                {recommendedMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    isFavorite={favoriteMeals.includes(meal.id)}
                    onClick={() => onMealSelect(meal)}
                    onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(meal.id, meal) : undefined}
                  />
                ))}
              </div>
              
              {/* Find More Meals Button */}
              <div className="mt-6 px-4 pb-24" style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px))` }}>
                <button
                  onClick={handleFindMoreMeals}
                  disabled={isLoadingMeals}
                  className="w-full max-w-md mx-auto h-12 sm:h-14 rounded-2xl bg-muted border border-border text-sm sm:text-[15px] font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMeals ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Finding More Meals...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                      Find More Meals
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 px-4 pb-24" style={{ paddingBottom: `calc(3rem + env(safe-area-inset-bottom, 0px))` }}>
              <p className="text-muted-foreground">
                No meals found within {activeDistance} {activeDistance === 1 ? 'mile' : 'miles'}. Try adjusting your distance or macros.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

type PlateSelectorProps = {
  macro: MacroType;
  value: number;
  config: MacroConfig;
};

function PlateSelector({ macro, value, config }: PlateSelectorProps) {
  return (
    <div className="mt-0 sm:mt-1">
      <div className="relative h-40 w-40 sm:h-52 sm:w-52 mx-auto flex items-center justify-center">
        {/* Outer plate rim with depth */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-[#F5F5F5] to-[#E5E7EB] shadow-[0_25px_60px_rgba(15,23,42,0.7),0_8px_16px_rgba(0,0,0,0.15)] border-2 border-white/80" />
        
        {/* Plate rim highlight */}
        <div className="absolute inset-0 rounded-full border-[3px] border-white/60" />
        
        {/* Inner concave with depth */}
        <div className="absolute inset-4 sm:inset-6 rounded-full bg-gradient-to-br from-[#FAFAFA] via-[#F5F5F5] to-[#E5E7EB] shadow-[inset_0_8px_20px_rgba(0,0,0,0.15),inset_0_-4px_10px_rgba(255,255,255,0.8)]" />
        
        {/* Inner rim */}
        <div className="absolute inset-4 sm:inset-6 rounded-full border border-white/40" />
        
        {/* Subtle inner shadow for depth */}
        <div className="absolute inset-6 sm:inset-8 rounded-full bg-gradient-to-b from-transparent via-transparent to-[rgba(0,0,0,0.03)]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5 font-medium">
            {config.label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-900 drop-shadow-sm">
              {value}
            </span>
            {config.unit && (
              <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-700 font-medium">{config.unit}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type RulerSliderProps = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
};

function RulerSlider({ min, max, step, value, onChange }: RulerSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<HTMLDivElement[]>([]);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transformUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const values = useMemo(() => {
    const arr: number[] = [];
    for (let v = min; v <= max; v += step) {
      arr.push(v);
    }
    return arr;
  }, [min, max, step]);

  // Update transforms only when needed (debounced, not continuous)
  const updateTransforms = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerCenter = container.clientWidth / 2;
    const scrollLeft = container.scrollLeft;
    
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const distanceFromCenter = (scrollLeft + containerCenter) - elCenter;
      
      // Normalize distance based on container width for curved effect
      const normalizedDistance = distanceFromCenter / (container.clientWidth * 0.5);
      const clampedDistance = Math.max(-1, Math.min(1, normalizedDistance));
      
      // Calculate properties for curved scale effect
      const absDist = Math.abs(clampedDistance);
      const scale = 0.5 + (1 - absDist) * 1.0; // Reduced to 1.0 max to prevent overlap
      const rotationY = clampedDistance * 35;
      const translateZ = (1 - absDist) * 60;
      const translateY = -absDist * absDist * 12;
      const opacity = 0.35 + (1 - absDist) * 0.65;
      
      // Apply transforms - use CSS transitions for smooth updates
      el.style.transform = `perspective(1000px) rotateY(${rotationY}deg) scale(${scale}) translateZ(${translateZ}px) translateY(${translateY}px)`;
      el.style.opacity = opacity.toString();
    });
  };

  // Debounced transform update - only runs when scroll position changes significantly
  const scheduleTransformUpdate = () => {
    if (transformUpdateTimeoutRef.current) {
      clearTimeout(transformUpdateTimeoutRef.current);
    }
    
    // Update immediately for responsive feel, but throttle rapid updates
    updateTransforms();
    
    transformUpdateTimeoutRef.current = setTimeout(() => {
      updateTransforms();
    }, 16); // ~60fps throttle
  };

  // scroll to current value on mount / macro change (only if not user scrolling)
  useEffect(() => {
    if (isUserScrollingRef.current || isProgrammaticScrollRef.current) return;
    
    const idx = values.indexOf(value);
    if (idx === -1) return;
    const container = containerRef.current;
    const el = itemRefs.current[idx];
    if (!container || !el) return;
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (!container || !el) return;
      isProgrammaticScrollRef.current = true;
      const containerCenter = container.clientWidth / 2;
      const target = el.offsetLeft + el.offsetWidth / 2 - containerCenter;
      // Use auto behavior for instant scroll, then let CSS snap handle it
      container.scrollTo({ left: target, behavior: "auto" });
      
      // Update transforms after scroll
      requestAnimationFrame(() => {
        updateTransforms();
      });
      
      // Reset flag after scroll completes
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    });
  }, [value, values]);

  // Initial transform update on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Wait for layout to settle
    requestAnimationFrame(() => {
      updateTransforms();
    });
  }, [values]);

  const findClosestValue = () => {
    const container = containerRef.current;
    if (!container) return null;
    const centerX = container.scrollLeft + container.clientWidth / 2;

    let closestIdx = 0;
    let closestDist = Infinity;

    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    return { idx: closestIdx, value: values[closestIdx] };
  };

  // Only called when scroll ends - no manual snapping during scroll
  const handleScrollEnd = () => {
    if (isProgrammaticScrollRef.current) return;
    
    // Update transforms one final time
    updateTransforms();
    
    // Find closest value and snap instantly (no animation delay)
    const closest = findClosestValue();
    if (!closest) return;
    
    const container = containerRef.current;
    const el = itemRefs.current[closest.idx];
    if (!container || !el) return;
    
    // Explicitly align the needle with the integer
    const containerCenter = container.clientWidth / 2;
    const target = el.offsetLeft + el.offsetWidth / 2 - containerCenter;
    
    // Instantly snap to exact position (no smooth animation)
    container.scrollTo({ left: target, behavior: 'auto' });
    
    // Update value immediately
    if (closest.value !== value) {
      onChange(closest.value);
    }
    
    // Update transforms after instant snap
    updateTransforms();
  };

  const handleScroll = () => {
    // Mark that user is actively scrolling
    if (!isUserScrollingRef.current) {
      isUserScrollingRef.current = true;
      setIsScrolling(true);
    }
    
    // Update transforms during scroll (throttled)
    scheduleTransformUpdate();
    
    // Clear any pending scroll end handler
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }
    
    // Only update value when scroll ends (debounced) - NOT during scroll
    scrollEndTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      setIsScrolling(false);
      handleScrollEnd();
    }, 15); // 15ms delay to detect scroll end, then instant snap
  };

  const handleClick = (idx: number) => {
    const container = containerRef.current;
    const el = itemRefs.current[idx];
    if (!container || !el) return;
    
    isProgrammaticScrollRef.current = true;
    const containerCenter = container.clientWidth / 2;
    const target = el.offsetLeft + el.offsetWidth / 2 - containerCenter;
    // Use auto for instant scroll, CSS snap will handle positioning
    container.scrollTo({ left: target, behavior: "auto" });
    onChange(values[idx]);
    
    // Update transforms after scroll
    requestAnimationFrame(() => {
      updateTransforms();
    });
    
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      if (transformUpdateTimeoutRef.current) {
        clearTimeout(transformUpdateTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div className="relative overflow-hidden" style={{ minHeight: '120px', height: '120px', paddingBottom: '8px' }}> {/* Fixed height to prevent layout shifts, padding for arrow */}
      {/* Curved background arc - old-time scale effect */}
      <div 
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[300%] h-24 sm:h-32 rounded-full border-2 border-[#4DDDF9]/25 opacity-40 z-0" 
        style={{ 
          transform: 'perspective(500px) rotateX(65deg) scaleY(0.25)',
          transformOrigin: 'center top',
          background: 'radial-gradient(ellipse at center, rgba(77, 221, 249, 0.1) 0%, transparent 70%)',
        }} 
      />
      
      {/* Additional depth arc */}
      <div 
        className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-[250%] h-20 sm:h-28 rounded-full border border-[#4DDDF9]/15 opacity-30 z-0" 
        style={{ 
          transform: 'perspective(600px) rotateX(70deg) scaleY(0.2)',
          transformOrigin: 'center top',
        }} 
      />

      {/* Fixed center arrow indicator - points up to show selected number */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        {/* Arrow point - clean design without shading */}
        <div 
          style={{
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderBottom: '11px solid #4DDDF9',
          }}
        />
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-x-auto no-scrollbar px-4 sm:px-6 py-6 sm:py-8"
        style={{ 
          perspective: '800px',
          transformStyle: 'preserve-3d',
          scrollSnapType: 'x mandatory', // Enable CSS scroll snap
          scrollBehavior: 'auto', // Use auto for native momentum (smooth causes issues)
          WebkitOverflowScrolling: 'touch', // Momentum scrolling on iOS
          overscrollBehavior: 'contain', // Prevent scroll chaining
          // Prevent layout shifts
          contain: 'layout style paint',
        }}
      >
        <div 
          className="relative flex gap-5 sm:gap-6 items-center"
          style={{
            transformStyle: 'preserve-3d',
            minWidth: 'max-content', // Ensure proper width calculation
            height: '100%', // Fixed height to prevent shifts
            paddingRight: '50%', // Add padding to allow last item to scroll to center
            paddingLeft: '50%', // Add padding to allow first item to scroll to center
          }}
        >
          {values.map((val, idx) => {
            const isActive = val === value;
            
            return (
              <div
                key={val}
                ref={(el) => {
                  if (el) itemRefs.current[idx] = el;
                }}
                className="flex flex-col items-center cursor-pointer select-none"
                onClick={() => handleClick(idx)}
                style={{ 
                  scrollSnapAlign: 'center', // CSS scroll snap
                  scrollSnapStop: 'normal', // Allow momentum scrolling (changed from 'always')
                  willChange: 'transform', // Optimize for transforms
                  // Increased width and spacing to prevent overlap
                  minWidth: '52px',
                  width: '52px', // Increased from 48px for better spacing
                  flexShrink: 0,
                  height: '100%', // Fixed height
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Smooth transitions for transforms (not during active scroll)
                  transition: isScrolling ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                }}
              >
                {/* tick with enhanced glow when active - use transform only, no height changes */}
                <div
                  className="w-[2px] rounded-full mb-2 sm:mb-3 relative dark:bg-white/30 bg-foreground/30"
                  style={{
                    height: '12px', // Fixed height to prevent layout shifts
                    transform: isActive ? 'scaleY(2.5)' : 'scaleY(1)', // Use transform, not height
                    backgroundColor: isActive ? '#4DDDF9' : undefined,
                    boxShadow: isActive ? '0 0 12px rgba(77,221,249,1)' : 'none',
                    willChange: 'transform',
                    transition: isScrolling ? 'none' : 'transform 0.2s ease-out, background-color 0.2s ease-out, box-shadow 0.2s ease-out',
                  }}
                />
                {/* number with enhanced styling - fixed size to prevent layout shifts */}
                <span
                  className={`font-bold ${isActive ? 'text-[#4DDDF9]' : 'text-muted-foreground'}`}
                  style={{
                    fontSize: isActive ? '1.1rem' : '0.75rem', // Further reduced from 1.25rem to prevent overlap
                    textShadow: isActive 
                      ? '0 0 20px rgba(77, 221, 249, 0.8), 0 2px 8px rgba(0, 0, 0, 0.3)' 
                      : 'none',
                    willChange: 'font-size, color',
                    lineHeight: '1.2', // Fixed line height
                    minHeight: '1.1rem', // Reduced to match smaller font
                    display: 'inline-block', // Prevent layout shifts
                    transition: isScrolling ? 'none' : 'font-size 0.2s ease-out, color 0.2s ease-out, text-shadow 0.2s ease-out',
                  }}
                >
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
