"use client";

import { Star, Heart, Flame, Zap, TrendingUp, AlertCircle } from "lucide-react";
import type { Meal } from "../types"; // Use shared types

type Props = {
  meal: Meal;
  isFavorite: boolean;
  onClick: () => void;
  showMatchScore?: boolean;
};

export function MealCard({ meal, isFavorite, onClick }: Props) {
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
      onClick={onClick}
      className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden hover:border-cyan-500/50 hover:scale-[1.02] group relative ${
        isGrocery
          ? 'border-2 border-green-500/30'
          : 'border border-gray-700/50'
      }`}
    >
      <div className="relative h-40">
        <img
          src={meal.image || "https://placehold.co/600x400/1a1a1a/ffffff?text=No+Image"}
          alt={meal.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
        
        {/* --- 3. THE MATCH BADGE --- */}
        {meal.matchScore && (
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-in fade-in zoom-in">
              <span>{meal.matchScore}% Match</span>
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md rounded-full p-2 border border-gray-700 z-10">
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? "fill-pink-500 text-pink-500" : "text-gray-400"
            }`}
          />
        </div>

        {/* Grocery Badge */}
        {isGrocery && (
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              <span className="text-white text-[10px] font-medium">Buy & Assemble</span>
            </div>
          </div>
        )}

        {(meal.rating || meal.price) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
            {meal.rating && (
              <div className="bg-cyan-500/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-white fill-white" />
                <span className="text-white text-xs font-bold">{meal.rating}</span>
              </div>
            )}
            {(meal.price || meal.price === 0) && (
              <div 
                className="bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-1 border border-gray-700"
                title="Price varies by location"
              >
                <span className="text-white text-xs">{formatPrice()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-white mb-1 font-semibold truncate pr-2">{meal.name}</h3>
            <div className="flex items-center gap-1.5">
              <p className="text-gray-400 text-sm truncate">{meal.restaurant}</p>
              {hasVariableAvailability && (
                <div 
                  className="group/alert relative flex-shrink-0"
                  title="Availability depends on store location"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                  {/* Tooltip for desktop */}
                  <div className="hidden group-hover/alert:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-xs text-slate-200 rounded whitespace-nowrap z-10 border border-slate-700">
                    Availability depends on store location
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}
            </div>
            {meal.distance && (
              <p className="text-gray-500 mt-1 text-xs">{meal.distance} miles away</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-2 text-center border border-pink-500/30">
            <div className="flex items-center justify-center mb-1">
              <Flame className="w-3 h-3 text-pink-400" />
            </div>
            <p className="text-white font-bold">{meal.calories}</p>
            <p className="text-pink-300/70 text-[10px]">cal</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl p-2 text-center border border-cyan-400/30">
            <div className="flex items-center justify-center mb-1">
              <Zap className="w-3 h-3 text-cyan-400" />
            </div>
            <p className="text-white font-bold">{meal.protein}g</p>
            <p className="text-cyan-300/70 text-[10px]">pro</p>
          </div>
          <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-xl p-2 text-center border border-green-400/30">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
            </div>
            <p className="text-white font-bold">{meal.carbs}g</p>
            <p className="text-green-300/70 text-[10px]">carb</p>
          </div>
          <div className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-xl p-2 text-center border border-amber-400/30">
            <div className="flex items-center justify-center mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
            </div>
            <p className="text-white font-bold">{meal.fats}g</p> 
            <p className="text-amber-300/70 text-[10px]">fat</p>
          </div>
        </div>
      </div>
    </div>
  );
}