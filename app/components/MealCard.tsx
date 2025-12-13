"use client";

import { Star, Heart, Flame, Zap, TrendingUp, AlertCircle } from "lucide-react";
import type { Meal } from "../types"; // Use shared types
import { getLogo } from "@/utils/logos";

type Props = {
  meal: Meal;
  isFavorite: boolean;
  onClick: () => void;
  showMatchScore?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean; // For chat view - smaller, more compact layout
};

export function MealCard({ meal, isFavorite, onClick, onToggleFavorite, compact = false }: Props) {
  // Extract restaurant name (handle both restaurant_name from Supabase and restaurant from Meal type)
  const restaurantName = (meal as any).restaurant_name || meal.restaurant || "Unknown";
  
  // Check for variable availability
  const hasVariableAvailability = meal.dietary_tags?.some(
    (tag: string) => tag === 'Location Varies' || tag === 'Seasonal'
  ) || false;

  // Check if it's a grocery/hot bar item
  const category = meal.category as string | undefined;
  const isGrocery = category === 'grocery' || 
                  category === 'Grocery' || 
                  category === 'Hot Bar';

  // Add this line to see what's happening in your browser console
  console.log(`Restaurant: "${restaurantName}" turns into Path: "${getLogo(restaurantName)}"`);

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br from-card to-muted dark:from-gray-900 dark:to-gray-800 ${compact ? 'rounded-2xl sm:rounded-3xl' : 'rounded-3xl'} shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden hover:border-cyan-500/50 ${compact ? '' : 'hover:scale-[1.02]'} group relative ${
        compact 
          ? 'max-w-[90%] mx-auto sm:max-w-md' 
          : 'w-full'
      } ${
        isGrocery
          ? 'border-2 border-green-500/30'
          : 'border border-border'
      }`}
    >
      {/* Image Container - Reduced height aspect ratio with padding for full subject visibility */}
      <div 
        className={`relative w-full overflow-hidden ${compact ? 'rounded-t-2xl sm:rounded-t-3xl' : 'rounded-t-3xl'} bg-gradient-to-br from-muted to-muted/50`}
        style={{
          aspectRatio: '16 / 9',
          padding: compact ? '12px' : '16px'
        }}
      >
        {/* Meal Image - Fully visible with padding */}
        {meal.image && meal.image !== '/placeholder-food.jpg' && meal.image !== '' ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={meal.image} 
              alt={meal.name}
              className="w-full h-full object-contain object-center"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onError={(e) => {
                // Fallback to default.png if meal image fails
                e.currentTarget.src = '/logos/default.png';
                e.currentTarget.onerror = null;
              }}
            />
          </div>
        ) : (
          /* Fallback to default.png if no meal image */
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src="/logos/default.png" 
              alt="Default meal"
              className="w-full h-full object-contain object-center"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              onError={(e) => {
                // Final fallback - hide image if default.png also fails
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background dark:from-gray-950 via-background/20 dark:via-gray-950/20 to-transparent pointer-events-none" />
        
        {/* --- 3. THE MATCH BADGE --- */}
        {meal.matchScore && (
          <div className={`absolute ${compact ? 'top-2 left-2 sm:top-3 sm:left-3' : 'top-3 left-3'} z-10`}>
            <div className={`bg-emerald-500 text-white ${compact ? 'text-[8px] sm:text-[9px] md:text-[10px]' : 'text-[10px]'} font-bold ${compact ? 'px-1.5 py-0.5 sm:px-2 sm:py-1' : 'px-2 py-1'} rounded-full shadow-lg flex items-center gap-1 animate-in fade-in zoom-in`}>
              <span>{meal.matchScore}% Match</span>
            </div>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 bg-background/80 dark:bg-gray-900/80 backdrop-blur-md rounded-full ${compact ? 'p-1.5 sm:p-2' : 'p-2'} border border-border z-10 hover:bg-muted/90 dark:hover:bg-gray-800/90 transition-colors`}
        >
          <Heart
            className={`${compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' : 'w-5 h-5'} transition-colors ${
              isFavorite ? "fill-pink-500 text-pink-500" : "text-muted-foreground"
            }`}
          />
        </button>

        {/* Grocery Badge */}
        {isGrocery && (
          <div className={`absolute ${compact ? 'top-2 left-2 sm:top-3 sm:left-3' : 'top-3 left-3'} z-10`}>
            <div className={`bg-green-500/90 backdrop-blur-sm rounded-full ${compact ? 'px-1.5 py-0.5 sm:px-2 sm:py-1' : 'px-2 py-1'} flex items-center gap-1`}>
              <span className={`${compact ? 'w-1 h-1 sm:w-1.5 sm:h-1.5' : 'w-1.5 h-1.5'} bg-white rounded-full`}></span>
              <span className={`text-white ${compact ? 'text-[8px] sm:text-[9px] md:text-[10px]' : 'text-[10px]'} font-medium`}>Buy & Assemble</span>
            </div>
          </div>
        )}

        {meal.rating && (
          <div className={`absolute ${compact ? 'bottom-2 left-2 sm:bottom-3 sm:left-3' : 'bottom-3 left-3'} flex items-center ${compact ? 'gap-1 sm:gap-2' : 'gap-2'} z-10`}>
            <div className={`bg-cyan-500/90 backdrop-blur-sm rounded-full ${compact ? 'px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1' : 'px-3 py-1'} flex items-center gap-1`}>
              <Star className={`${compact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-white fill-white`} />
              <span className={`text-white ${compact ? 'text-[9px] sm:text-[10px] md:text-xs' : 'text-xs'} font-bold`}>{meal.rating}</span>
            </div>
          </div>
        )}
      </div>

      <div className={`${compact ? 'p-2 sm:p-3 md:p-4' : 'p-4'}`}>
        <div className={`flex items-start justify-between ${compact ? 'mb-2 sm:mb-3' : 'mb-3'}`}>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className={`text-foreground ${compact ? 'mb-0.5 text-sm sm:text-base mb-1' : 'mb-1'} font-semibold ${compact ? 'line-clamp-2 break-words' : 'line-clamp-2 break-words'}`}>{meal.name}</h3>
            <div className="flex items-center gap-1.5 min-w-0">
              <p className={`text-muted-foreground ${compact ? 'text-[10px] sm:text-xs md:text-sm' : 'text-sm'} truncate`}>{meal.restaurant}</p>
              {hasVariableAvailability && (
                <div 
                  className="group/alert relative flex-shrink-0"
                  title="Availability depends on store location"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                  {/* Tooltip for desktop */}
                  <div className="hidden group-hover/alert:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-xs text-popover-foreground rounded whitespace-nowrap z-10 border border-border">
                    Availability depends on store location
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
                  </div>
                </div>
              )}
            </div>
            {meal.distance !== undefined && meal.distance !== null && (
              <p className={`text-muted-foreground mt-1 ${compact ? 'text-[9px] sm:text-xs' : 'text-xs'}`}>{meal.distance.toFixed(1)} miles away</p>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-4 ${compact ? 'gap-1 sm:gap-1.5 md:gap-2' : 'gap-2'} ${compact ? 'text-[9px] sm:text-[10px] md:text-xs' : 'text-xs'}`}>
          <div className={`bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg ${compact ? 'p-1 sm:p-1.5 md:p-2' : 'p-2'} text-center border border-pink-500/30`}>
            <div className={`flex items-center justify-center ${compact ? 'mb-0.5 sm:mb-1' : 'mb-1'}`}>
              <Flame className={`${compact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-pink-400`} />
            </div>
            <p className={`text-foreground font-bold ${compact ? 'text-[10px] sm:text-xs' : ''}`}>{meal.calories}</p>
            <p className={`text-pink-600 dark:text-pink-300/70 ${compact ? 'text-[7px] sm:text-[8px] md:text-[10px]' : 'text-[10px]'}`}>cal</p>
          </div>
          <div className={`bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-lg ${compact ? 'p-1 sm:p-1.5 md:p-2' : 'p-2'} text-center border border-cyan-400/30`}>
            <div className={`flex items-center justify-center ${compact ? 'mb-0.5 sm:mb-1' : 'mb-1'}`}>
              <Zap className={`${compact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-cyan-400`} />
            </div>
            <p className={`text-foreground font-bold ${compact ? 'text-[10px] sm:text-xs' : ''}`}>{meal.protein}g</p>
            <p className={`text-cyan-600 dark:text-cyan-300/70 ${compact ? 'text-[7px] sm:text-[8px] md:text-[10px]' : 'text-[10px]'}`}>pro</p>
          </div>
          <div className={`bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-lg ${compact ? 'p-1 sm:p-1.5 md:p-2' : 'p-2'} text-center border border-green-400/30`}>
            <div className={`flex items-center justify-center ${compact ? 'mb-0.5 sm:mb-1' : 'mb-1'}`}>
              <TrendingUp className={`${compact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-green-400`} />
            </div>
            <p className={`text-foreground font-bold ${compact ? 'text-[10px] sm:text-xs' : ''}`}>{meal.carbs}g</p>
            <p className={`text-green-600 dark:text-green-300/70 ${compact ? 'text-[7px] sm:text-[8px] md:text-[10px]' : 'text-[10px]'}`}>carb</p>
          </div>
          <div className={`bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-lg ${compact ? 'p-1 sm:p-1.5 md:p-2' : 'p-2'} text-center border border-amber-400/30`}>
            <div className={`flex items-center justify-center ${compact ? 'mb-0.5 sm:mb-1' : 'mb-1'}`}>
              <div className={`${compact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} rounded-full bg-amber-400`} />
            </div>
            <p className={`text-foreground font-bold ${compact ? 'text-[10px] sm:text-xs' : ''}`}>{meal.fats}g</p> 
            <p className={`text-amber-300/70 ${compact ? 'text-[7px] sm:text-[8px] md:text-[10px]' : 'text-[10px]'}`}>fat</p>
          </div>
        </div>
      </div>
    </div>
  );
}