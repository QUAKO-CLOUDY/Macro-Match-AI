"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Check,
  Flame,
  Sparkles,
  MapPin,
} from "lucide-react";
import { mockMeals } from "../data/mockData";
import type { UserProfile, Meal } from "../types";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

// Simple image wrapper
function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return <img src={src} alt={alt} className={className} />;
}

// --- MATCH ALGORITHM ---
function calculateMatchScore(meal: Meal, user: UserProfile): number {
  let score = 90;

  if (meal.calories > user.calorieTarget * 0.4) score -= 15;
  if (user.goal === "lose-fat" && meal.fats > 30) score -= 10;
  if (user.goal === "build-muscle" && meal.protein > 35) score += 5;
  if (user.dietaryType === "Keto" && meal.carbs < 15) score += 8;

  return Math.max(65, Math.min(99, score));
}

type Props = {
  userProfile: UserProfile;
  onMealSelect: (meal: Meal) => void;
  favoriteMeals: string[];
  onOpenAI?: () => void;
};

const filterOptions = [
  { id: "best", label: "Best Match", icon: Sparkles },
  { id: "protein", label: "Highest Protein", icon: Flame },
  { id: "nearby", label: "Closest to You", icon: MapPin },
];

export function HomeScreen({
  userProfile,
  onMealSelect,
  favoriteMeals = [],
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>("best");

  // mock streak for now
  const streakDays = 3;

  // score and sort meals
  const scoredMeals = mockMeals
    .map((meal) => ({
      ...meal,
      matchScore: calculateMatchScore(meal, userProfile),
    }))
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  const trendingMeals = scoredMeals.slice(0, 4);
  const reorderMeals = scoredMeals.slice(4, 10);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#020617] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* TOP BAR: MacroMatch + streak pill */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-[#020617]">
          <p className="text-xs text-sky-400 font-semibold tracking-wide">
            MacroMatch
          </p>

          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium
                       bg-slate-900 border border-cyan-500/50 text-cyan-200 shadow-sm
                       hover:border-cyan-400 hover:bg-slate-900/80 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{streakDays} day streak</span>
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="px-4 pt-4 pb-6">
          {/* TRENDING NEAR YOU */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-base font-semibold">
                Trending Near You
              </h2>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="px-3 py-1.5 rounded-full flex items-center gap-2 transition-all backdrop-blur-md hover:bg-white/20"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-xs text-zinc-400">Sort</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2 bg-gray-900 border-zinc-700 shadow-2xl"
                  align="end"
                  sideOffset={8}
                >
                  <div className="space-y-1">
                    {filterOptions.map((option) => {
                      const IconComponent = option.icon;
                      const isSelected = selectedFilter === option.id;

                      return (
                        <button
                          key={option.id}
                          onClick={() => setSelectedFilter(option.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "hover:bg-white/5 text-zinc-300 hover:text-white"
                          }`}
                        >
                          <IconComponent
                            className={`w-4 h-4 ${
                              isSelected ? "text-cyan-400" : "text-zinc-400"
                            }`}
                          />
                          <span className="text-sm flex-1 text-left">
                            {option.label}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              {trendingMeals.map((meal) => (
                <div
                  key={meal.id}
                  onClick={() => onMealSelect(meal)}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: "#020617", borderRadius: 18 }}
                >
                  <div className="flex items-stretch border border-slate-800/80">
                    <div className="w-24 h-24 m-2 rounded-2xl relative overflow-hidden flex-shrink-0 bg-slate-800">
                      <ImageWithFallback
                        src={meal.image}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 pr-4 py-3 flex flex-col justify-center">
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {meal.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mb-2">
                        {meal.restaurant}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-sky-400 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {meal.protein}g Protein
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-orange-400">
                          {meal.calories} cal
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK RE-ORDER */}
          <div className="mb-8">
            <h2 className="text-white text-base font-semibold mb-4">
              Quick Re-Order
            </h2>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {reorderMeals.map((meal) => (
                <div
                  key={meal.id}
                  onClick={() => onMealSelect(meal)}
                  className="flex-shrink-0 w-32 cursor-pointer"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-slate-800">
                    <ImageWithFallback
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  </div>
                  <p className="text-white text-sm text-center truncate">
                    {meal.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
