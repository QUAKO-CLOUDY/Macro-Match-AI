"use client";


import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  ChevronDown,
  Check,
  Image as ImageIcon,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { mockMeals } from "../data/mockData";
import type { UserProfile, Meal } from "../types";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

// --- CONSTANTS & CONFIG ---

const QUICK_FILTERS = [
  "High Protein",
  "Low Calorie",
  "Under 500 Cal",
  "High Fiber",
  "Low Carb",
  "Fast Pickup",
  "Nearby",
];

const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const SORT_OPTIONS = ["Best Match", "Highest Protein", "Lowest Calories", "Closest Distance", "Price"];

// Ring Chart Config
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// --- UTILITY FUNCTIONS ---

function calculateMatchScore(meal: Meal, user: UserProfile): number {
  let score = 90;
  // Fallbacks in case mock data is missing fields
  const mCalories = meal.calories || 0;
  const mFats = meal.fats || 0;
  const mProtein = meal.protein || 0;
  const mCarbs = meal.carbs || 0;

  if (mCalories > user.calorieTarget * 0.4) score -= 15;
  if (user.goal === "lose-fat" && mFats > 30) score -= 10;
  if (user.goal === "build-muscle" && mProtein > 35) score += 5;
  if (user.dietaryType === "Keto" && mCarbs < 15) score += 8;
  return Math.max(65, Math.min(99, score));
}

function generateMicroDescription(meal: Meal): string {
  const parts = [];
  if (meal.protein && meal.protein > 30) parts.push("High Protein");
  else if (meal.protein && meal.protein > 20) parts.push("Good Protein");

  if (meal.carbs && meal.carbs < 20) parts.push("Low Carb");
  if (meal.calories < 500) parts.push("Low Cal");

  if (!parts.includes("Low Cal")) {
    parts.push(`${meal.calories} Cal`);
  }
  if (parts.length === 0) return `${meal.calories} Cal · Balanced`;

  return parts.join(" · ");
}

// --- SUB-COMPONENTS (For Cleaner Code) ---

const ImageWithFallback = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

const MacroRing = ({ percentage }: { percentage: number }) => {
  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(percentage, 100) / 100);
  
  return (
    <div className="relative">
      <svg className="w-10 h-10 -rotate-90">
        <circle cx="20" cy="20" r={RADIUS} stroke="rgba(75, 85, 99, 0.3)" strokeWidth="3" fill="none" />
        <circle
          cx="20" cy="20" r={RADIUS}
          stroke="url(#gradient)" strokeWidth="3" fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

// Top Pick Card (Large)
const LargeMealCard = ({ meal, onSelect }: { meal: Meal & { microDescription: string }; onSelect: () => void }) => (
  <div
    onClick={onSelect}
    className="w-full bg-card rounded-[24px] overflow-hidden border border-border/80 shadow-xl cursor-pointer group hover:border-cyan-500/30 transition-all"
  >
    <div className="relative h-64 overflow-hidden">
      <ImageWithFallback
        src={meal.image}
        alt={meal.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
      <button
        onClick={(e) => { e.stopPropagation(); /* Swap Logic */ }}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
      >
        <RefreshCw className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] font-bold text-cyan-100">Smart Swap</span>
      </button>
    </div>

    <div className="p-4 pt-2">
      <div className="mb-2">
        <h3 className="text-card-foreground text-lg font-bold leading-tight">{meal.name}</h3>
        <div className="flex flex-col mt-1">
          <p className="text-card-foreground/80 text-xs font-medium">{meal.restaurant}</p>
          <p className="text-muted-foreground text-[11px] mt-0.5">{meal.microDescription}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
        <span className="text-card-foreground font-bold text-sm">{meal.calories} Cal</span>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-blue-400 flex items-center gap-1">{meal.protein}g P</span>
          <span className="text-emerald-400 flex items-center gap-1">{meal.carbs || 35}g C</span>
          <span className="text-amber-400 flex items-center gap-1">{meal.fats || 12}g F</span>
        </div>
      </div>
    </div>
  </div>
);

// More Options Card (Small)
const CompactMealRow = ({ meal, onSelect }: { meal: Meal & { microDescription: string }; onSelect: () => void }) => (
  <div
    onClick={onSelect}
    className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:border-border transition-all cursor-pointer"
  >
    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
      <ImageWithFallback src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-card-foreground text-sm font-medium truncate">{meal.name}</h3>
      <div className="flex flex-col">
        <p className="text-muted-foreground text-xs truncate">{meal.restaurant}</p>
        <p className="text-muted-foreground/70 text-[10px] truncate">{meal.microDescription}</p>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

type Props = {
  userProfile: UserProfile;
  onMealSelect: (meal: Meal) => void;
  favoriteMeals: string[];
  onSearch?: () => void;
};

export function HomeScreen({ userProfile, onMealSelect, onSearch }: Props) {
  const [greeting, setGreeting] = useState("Good Morning");
  const [selectedMealTime, setSelectedMealTime] = useState("Lunch");
  const [selectedSort, setSelectedSort] = useState("Best Match");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const userName = userProfile.name || "Alex";
  const caloriesRemaining = 420;
  const progressPercentage = 65;

  useEffect(() => {
    // Set greeting and default meal time based on clock
    const hour = new Date().getHours();
    
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    if (hour < 11) setSelectedMealTime("Breakfast");
    else if (hour < 16) setSelectedMealTime("Lunch");
    else setSelectedMealTime("Dinner");
  }, []);

  // Memoized Scoring & Sorting to prevent lag on re-renders
  const { topPicks, moreOptions } = useMemo(() => {
    const scored = mockMeals
      .map((meal) => ({
        ...meal,
        matchScore: calculateMatchScore(meal, userProfile),
        microDescription: generateMicroDescription(meal),
      }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return {
      topPicks: scored.slice(0, 3),
      moreOptions: scored.slice(3, 10),
    };
  }, [userProfile]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background overflow-hidden font-sans">
      
      {/* --- TOP BAR --- */}
      <div className="flex items-center justify-between px-4 py-4 bg-background z-10 shrink-0">
        <div className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          SeekEatz
        </div>

        <div className="flex items-center gap-3">
          {onSearch && (
            <button
              onClick={onSearch}
              className="p-2 rounded-full bg-muted/50 hover:bg-muted border border-border text-cyan-400 transition-colors"
              title="Search meals"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Calories Remaining</div>
            <div className="text-sm font-semibold text-foreground">{caloriesRemaining.toLocaleString()}</div>
          </div>
          <MacroRing percentage={progressPercentage} />
        </div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        
        {/* HEADER: GREETING & CONTROLS */}
        <div className="mb-5 mt-2 flex flex-col gap-3">
          <h1 className="text-foreground text-xl font-semibold">
            {greeting}, <span className="text-cyan-400">{userName}</span>
          </h1>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs font-medium">Here are your recommended meals</p>

            <div className="flex items-center gap-2">
              {/* SORT BUTTON */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-transparent border border-slate-800 text-[11px] text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Sort</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 bg-popover border-border shadow-xl" align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedSort(opt)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between ${
                        selectedSort === opt ? "bg-cyan-500/20 text-cyan-400" : "text-popover-foreground hover:bg-accent"
                      }`}
                    >
                      {opt}
                      {selectedSort === opt && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* MEAL TIME SELECTOR */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-foreground hover:bg-muted transition-colors">
                    {selectedMealTime}
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1 bg-popover border-border shadow-xl" align="end">
                  {MEAL_TIMES.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedMealTime(time)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between ${
                        selectedMealTime === time ? "bg-cyan-500/20 text-cyan-400" : "text-popover-foreground hover:bg-accent"
                      }`}
                    >
                      {time}
                      {selectedMealTime === time && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* QUICK FILTERS (Horizontal Scroll) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(isActive ? null : filter)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all backdrop-blur-sm border
                  ${isActive 
                    ? "bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]" 
                    : "bg-muted/60 border-border/50 text-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* SECTION: MEALS PICKED FOR YOU */}
        <h2 className="text-foreground text-sm font-semibold mb-4 pl-1 tracking-wide">
          Meals Picked for You
        </h2>

        <div className="space-y-6 mb-10">
          {topPicks.map((meal) => (
            <LargeMealCard key={meal.id} meal={meal} onSelect={() => onMealSelect(meal)} />
          ))}
        </div>

        {/* SECTION: MORE OPTIONS */}
        <div className="mb-5 flex items-center gap-4">
          <div className="h-[1px] bg-gradient-to-r from-border to-transparent w-full"></div>
        </div>

        <div className="space-y-3 pb-4">
          {moreOptions.map((meal) => (
            <CompactMealRow key={meal.id} meal={meal} onSelect={() => onMealSelect(meal)} />
          ))}
        </div>

        {/* LOAD MORE ACTION */}
        <button className="w-full py-3.5 mt-2 mb-8 rounded-xl bg-card border border-border text-muted-foreground text-xs font-medium hover:bg-muted hover:text-foreground transition-all active:scale-[0.98]">
          Load More Meals
        </button>

      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}