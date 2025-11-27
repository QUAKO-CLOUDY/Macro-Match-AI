"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Flame,
  Zap,
  TrendingUp,
  Apple,
  Trash2,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CircularProgress } from "./CircularProgress";
import type { UserProfile, Meal } from "../types";

export type LoggedMeal = {
  id: string;
  meal: Meal;
  timestamp: string; // ISO
  date: string; // YYYY-MM-DD
};

type Props = {
  userProfile: UserProfile;
  loggedMeals: LoggedMeal[];
  onRemoveMeal: (id: string) => void;
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function calculateStreak(loggedDates: string[]): number {
  if (loggedDates.length === 0) return 0;

  const dateSet = new Set(loggedDates);
  let streak = 0;

  const cursor = new Date();
  // Normalize to local date string (YYYY-MM-DD)
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

type Recommendation = {
  icon: React.ComponentType<{ className?: string }>;
  color: "purple" | "cyan" | "green" | "amber";
  message: string;
};

export function LogScreen({ userProfile, loggedMeals, onRemoveMeal }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const loggedDates = Array.from(
    new Set(loggedMeals.map((log) => log.date))
  ).sort((a, b) => b.localeCompare(a)); // newest first

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const streak = calculateStreak(loggedDates);

  const selectedMeals = loggedMeals.filter(
    (log) => log.date === selectedDate
  );

  const totals = selectedMeals.reduce(
    (acc, log) => ({
      calories: acc.calories + log.meal.calories,
      protein: acc.protein + log.meal.protein,
      carbs: acc.carbs + log.meal.carbs,
      fats: acc.fats + log.meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const remaining = {
    calories: userProfile.calorieTarget - totals.calories,
    protein: userProfile.proteinTarget - totals.protein,
    carbs: userProfile.carbsTarget - totals.carbs,
    fats: userProfile.fatsTarget - totals.fats,
  };

  const isTodaySelected = selectedDate === todayStr;
  const selectedLabel = isTodaySelected ? "Today" : formatDate(selectedDate);

  // Meals section uses the *selected day* so it matches the rings
  const dayMeals = selectedMeals;

  const recommendations: Recommendation[] = useMemo(() => {
    const recs: Recommendation[] = [];

    if (dayMeals.length === 0) {
      recs.push({
        icon: Info,
        color: "purple",
        message: "Start logging your meals to track your progress.",
      });
      return recs;
    }

    if (remaining.calories < -100) {
      recs.push({
        icon: Flame,
        color: "amber",
        message:
          "You’re over your calorie goal for this day. Aim for lighter meals or higher protein next time.",
      });
    } else if (remaining.calories > 200) {
      recs.push({
        icon: Flame,
        color: "cyan",
        message:
          "You still have calories left. A balanced snack or meal can help you feel satisfied.",
      });
    }

    if (remaining.protein > 20) {
      recs.push({
        icon: Zap,
        color: "green",
        message:
          "Protein is a bit low for this day. Consider a higher-protein meal next time.",
      });
    }

    return recs;
  }, [dayMeals, remaining.calories, remaining.protein]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 text-white">
      {/* TOP SECTION – RINGS + MACROS */}
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white p-6 pb-4 relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 mb-1">Daily Tracking</p>
            <h1 className="text-white">Your Progress 📊</h1>
            <p className="text-xs text-gray-400 mt-1">
              Showing totals for <span className="text-cyan-400">{selectedLabel}</span>. Rings
              update based on the day you pick.
            </p>
          </div>

          {/* Calendar + Date Picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDatePickerOpen((v) => !v)}
              className="text-white hover:bg-white/10 rounded-full"
            >
              <Calendar className="w-5 h-5" />
            </Button>

            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-3 z-30">
                <p className="text-xs text-gray-400 mb-2">
                  View stats for:
                </p>

                <button
                  onClick={() => {
                    setSelectedDate(todayStr);
                    setIsDatePickerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                    isTodaySelected
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "hover:bg-gray-800 text-gray-200"
                  }`}
                >
                  Today
                  <span className="ml-1 text-[11px] text-gray-400">
                    ({formatDate(todayStr)})
                  </span>
                </button>

                {loggedDates.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {loggedDates.slice(0, 7).map((date) => (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setIsDatePickerOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedDate === date
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "hover:bg-gray-800 text-gray-200"
                        }`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-[11px] text-gray-500">
                  Rings, macros, and meals all reflect the day you choose.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="mb-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white">{streak} Day Streak! 🔥</p>
              <p className="text-orange-200">Keep it going!</p>
            </div>
          </div>
        )}

        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-6 relative">
          <div className="relative w-48 h-48 transition-all duration-300">
            {/* Calories - Outermost Ring - Pink/Purple */}
            <CircularProgress
              percentage={
                (totals.calories / userProfile.calorieTarget) * 100 || 0
              }
              colorStart="#ec4899"
              colorEnd="#d946ef"
              size={192}
              strokeWidth={14}
            />
            {/* Protein - Second Ring - Cyan/Blue */}
            <CircularProgress
              percentage={
                (totals.protein / userProfile.proteinTarget) * 100 || 0
              }
              colorStart="#06b6d4"
              colorEnd="#0ea5e9"
              size={164}
              strokeWidth={13}
            />
            {/* Carbs - Third Ring - Green */}
            <CircularProgress
              percentage={
                (totals.carbs / userProfile.carbsTarget) * 100 || 0
              }
              colorStart="#22c55e"
              colorEnd="#16a34a"
              size={138}
              strokeWidth={12}
            />
            {/* Fats - Innermost Ring - Amber/Orange */}
            <CircularProgress
              percentage={
                (totals.fats / userProfile.fatsTarget) * 100 || 0
              }
              colorStart="#f59e0b"
              colorEnd="#f97316"
              size={114}
              strokeWidth={11}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-gray-400">
                {remaining.calories >= 0 ? "Remaining" : "Over"}
              </p>
              <p className="text-white">
                {Math.abs(remaining.calories)}
              </p>
              <p className="text-gray-500">calories</p>
            </div>
          </div>
        </div>

        {/* Macro Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl p-3 border border-pink-500/30 text-center">
            <Flame className="w-4 h-4 text-pink-400 mx-auto mb-1" />
            <p className="text-white">{totals.calories}</p>
            <p className="text-pink-300/70">/{userProfile.calorieTarget}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-400/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-3 border border-cyan-400/30 text-center">
            <Zap className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-white">{totals.protein}g</p>
            <p className="text-cyan-300/70">
              /{userProfile.proteinTarget}g
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-3 border border-green-400/30 text-center">
            <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-white">{totals.carbs}g</p>
            <p className="text-green-300/70">
              /{userProfile.carbsTarget}g
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-3 border border-amber-400/30 text-center">
            <div className="w-4 h-4 rounded-full bg-amber-400 mx-auto mb-1" />
            <p className="text-white">{totals.fats}g</p>
            <p className="text-amber-300/70">
              /{userProfile.fatsTarget}g
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION – RECOMMENDATIONS, MEALS, HISTORY */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-950">
        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-white mb-3">Recommendations</p>
            <div className="space-y-2">
              {recommendations.map((rec, index) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={index}
                    className={`bg-gradient-to-br from-${rec.color}-500/10 to-${rec.color}-600/10 border border-${rec.color}-500/30 rounded-2xl p-4 flex items-start gap-3`}
                  >
                    <div
                      className={`w-8 h-8 bg-gradient-to-br from-${rec.color}-500 to-${rec.color}-600 rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-gray-300 flex-1">{rec.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Meals for selected day */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white">
              {isTodaySelected ? "Today's Meals" : `${selectedLabel} Meals`}
            </p>
            <Badge className="bg-gray-800 border-gray-700 text-gray-300">
              {dayMeals.length} {dayMeals.length === 1 ? "meal" : "meals"}
            </Badge>
          </div>

          {dayMeals.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
              <Apple className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No meals logged yet</p>
              <p className="text-gray-600">
                Start tracking from the home screen!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayMeals.map((log) => (
                <div
                  key={log.id}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-4 group hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex gap-3">
                    <img
                      src={log.meal.image}
                      alt={log.meal.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="text-white">{log.meal.name}</p>
                          <p className="text-gray-400">
                            {log.meal.restaurant}
                          </p>
                          <p className="text-gray-600">
                            {new Date(log.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveMeal(log.id)}
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="rounded-full bg-pink-500/20 text-pink-300 border-pink-500/30">
                          {log.meal.calories} cal
                        </Badge>
                        <Badge className="rounded-full bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          {log.meal.protein}g P
                        </Badge>
                        <Badge className="rounded-full bg-green-500/20 text-green-300 border-green-500/30">
                          {log.meal.carbs}g C
                        </Badge>
                        <Badge className="rounded-full bg-amber-500/20 text-amber-300 border-amber-500/30">
                          {log.meal.fats}g F
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {loggedDates.length > 0 && (
          <div>
            <p className="text-white mb-3">History</p>
            <div className="space-y-2">
              {loggedDates.slice(0, 7).map((date) => {
                const dateMeals = loggedMeals.filter(
                  (log) => log.date === date
                );
                const dateTotals = dateMeals.reduce(
                  (acc, log) => ({
                    calories: acc.calories + log.meal.calories,
                    protein: acc.protein + log.meal.protein,
                  }),
                  { calories: 0, protein: 0 }
                );
                const isExpanded = expandedDay === date;

                return (
                  <div
                    key={date}
                    className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedDay(isExpanded ? null : date)
                      }
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-white">{formatDate(date)}</p>
                          <p className="text-gray-400">
                            {dateMeals.length} meals logged
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-gray-400">
                            {dateTotals.calories} cal
                          </p>
                          <p className="text-gray-500">
                            {dateTotals.protein}g protein
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-700 p-4 space-y-2">
                        {dateMeals.map((log) => (
                          <div
                            key={log.id}
                            className="flex gap-3 p-2 rounded-xl hover:bg-gray-800/50"
                          >
                            <img
                              src={log.meal.image}
                              alt={log.meal.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white truncate">
                                {log.meal.name}
                              </p>
                              <p className="text-gray-500">
                                {log.meal.calories} cal •{" "}
                                {log.meal.protein}g protein
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
