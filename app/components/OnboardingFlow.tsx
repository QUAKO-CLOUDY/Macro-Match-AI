"use client";

import { useState } from "react";
import {
  ChevronRight,
  Check,
  AlertCircle,
  TrendingDown,
  Dumbbell,
  Scale,
  Activity,
  X,
  Plus,
  User,
  Zap,
  HelpCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { UserProfile } from "../types";

type Props = {
  onComplete: (profile: UserProfile) => void;
};

// --- DATA DEFINITIONS ---

const nutritionGoals = [
  {
    id: "lose-weight",
    label: "Lose Weight",
    icon: TrendingDown,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    id: "build-muscle",
    label: "Build Muscle",
    icon: Dumbbell,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    id: "stay-healthy",
    label: "Stay Healthy",
    icon: Scale,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    id: "athletic-performance",
    label: "Athletic Performance",
    icon: Activity,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
];

const dietaryPreferences = [
  { id: "high-protein", label: "High Protein", icon: "💪" },
  { id: "low-carb", label: "Low Carb", icon: "🥑" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { id: "gluten-free", label: "Gluten Free", icon: "🌾" },
  { id: "dairy-free", label: "Dairy Free", icon: "🥛" },
  { id: "paleo", label: "Paleo", icon: "🥩" },
  { id: "keto", label: "Keto", icon: "🥓" },
  // Pescatarian will be rendered separately so we can control position
];

// Allergy options – last one is Other (no peanuts)
const allergyOptions: { name: string; emoji: string; isOther?: boolean }[] = [
  { name: "Nuts", emoji: "🥜" },
  { name: "Shellfish", emoji: "🦐" },
  { name: "Soy", emoji: "🫘" },
  { name: "Dairy", emoji: "🥛" },
  { name: "Eggs", emoji: "🥚" },
  { name: "Sesame", emoji: "🌰" },
  { name: "Gluten", emoji: "🌾" },
  { name: "Other", emoji: "➕", isOther: true },
];

const activityLevels = [
  {
    id: "sedentary",
    label: "Sedentary",
    description: "Spend most of your day sitting. Minimal movement.",
  },
  {
    id: "lightly-active",
    label: "Lightly Active",
    description: "Some walking or light movement. Typically 3,000–6,000 steps/day.",
  },
  {
    id: "moderately-active",
    label: "Moderately Active",
    description:
      "Regular movement or partial standing job. Around 7,000–10,000 steps/day.",
  },
  {
    id: "very-active",
    label: "Very Active",
    description:
      "On your feet most of the day or highly active lifestyle. 10,000+ steps/day.",
  },
];

const activityOptions = [
  { id: "strength", label: "Strength Training", emoji: "🏋️" },
  { id: "cardio", label: "Cardio / Running", emoji: "🏃" },
  { id: "hiit", label: "HIIT / CrossFit", emoji: "🔥" },
  { id: "sports", label: "Sports / Active", emoji: "⚽" },
  { id: "yoga", label: "Yoga / Pilates", emoji: "🧘" },
  { id: "light", label: "Light Activity", emoji: "🚶" },
];

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(1);

  // State
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState<string>("");
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [sex, setSex] = useState<"" | "male" | "female" | "other">("");

  // "Other" popup shared between allergies + dietary preferences
  const [otherPopupContext, setOtherPopupContext] = useState<"allergy" | "diet" | null>(
    null
  );
  const showOtherPopup = otherPopupContext !== null;
  const [otherText, setOtherText] = useState("");

  // Profile Data
  const [age, setAge] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Macros card expand/collapse
  const [macrosOpen, setMacrosOpen] = useState(false);

  // --- Handlers ---

  const toggleGoal = (goalId: string) => setSelectedGoals([goalId]);

  const togglePreference = (prefId: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    );
  };

  const toggleAllergen = (allergen: string) => {
    setAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const toggleActivityType = (activityId: string) => {
    setActivityTypes((prev) =>
      prev.includes(activityId) ? prev.filter((a) => a !== activityId) : [...prev, activityId]
    );
  };

  const handleAddOther = () => {
    const value = otherText.trim();
    if (!value || !otherPopupContext) return;

    if (otherPopupContext === "allergy") {
      toggleAllergen(value);
    } else if (otherPopupContext === "diet") {
      setSelectedPreferences((prev) => (prev.includes(value) ? prev : [...prev, value]));
    }

    setOtherText("");
    setOtherPopupContext(null);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let primaryGoal: "lose-fat" | "maintain" | "build-muscle" = "maintain";
    if (selectedGoals.includes("lose-weight")) primaryGoal = "lose-fat";
    else if (selectedGoals.includes("build-muscle")) primaryGoal = "build-muscle";

    const weightNum = parseInt(weight) || 150;
    const weightInKg = weightNum * 0.453592;

    let calories = Math.round(weightNum * 14);
    if (primaryGoal === "lose-fat") calories = Math.round(weightNum * 12);
    if (primaryGoal === "build-muscle") calories = Math.round(weightNum * 16);

    const protein = Math.round(weightInKg * 2.2);
    const carbs = Math.round((calories * 0.4) / 4);
    const fats = Math.round((calories * 0.3) / 9);

    const profile: UserProfile = {
      goal: primaryGoal,
      dietaryType: selectedPreferences.includes("keto") ? "Keto" : "Balanced",
      allergens,
      calorieTarget: calories,
      proteinTarget: protein,
      carbsTarget: carbs,
      fatsTarget: fats,
      nutritionGoals: selectedGoals,
      dietaryPreferences: selectedPreferences,
      activityLevel,
      preferredCuisines: [],
      preferredMealTypes: [],
      eatingStyles: [],
      trainingStyle: "hybrid",
      // you can add height/age/sex into UserProfile later if you want
    };

    onComplete(profile);
  };

  // Validation
  const canProceedStep1 = selectedGoals.length > 0;
  const canProceedStepStats = age && weight && heightFeet;

  // Shared Progress Bar Component (6 steps)
  const ProgressBar = ({
    currentStep,
    colorClass,
  }: {
    currentStep: number;
    colorClass: string;
  }) => (
    <div className="flex gap-2 justify-center mb-6 mt-auto">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentStep
              ? `w-8 ${colorClass} shadow-lg`
              : i < currentStep
              ? "w-8 bg-gray-700"
              : "w-8 bg-gray-800"
          }`}
        />
      ))}
    </div>
  );

  // Shared "Other" popup renderer
  const renderOtherPopup = () => {
    if (!showOtherPopup) return null;
    const isAllergy = otherPopupContext === "allergy";
    const gradient =
      otherPopupContext === "allergy"
        ? "from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
        : "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700";
    const barGradient =
      otherPopupContext === "allergy"
        ? "from-orange-500 to-red-600"
        : "from-green-500 to-emerald-600";

    return (
      <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-xs bg-[#1A1F2E] border border-gray-700 p-5 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-white font-medium mb-1">
            Specify your {isAllergy ? "allergy" : "preference"}
          </h3>
          <div className={`h-1 w-8 bg-gradient-to-r ${barGradient} rounded-full mb-4`} />

          <Input
            autoFocus
            placeholder={
              isAllergy ? "e.g., Avocado, Corn, etc." : "e.g., Pescatarian, Low-sugar, etc."
            }
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            className={`bg-[#0B0F19] border-gray-700 text-white h-12 rounded-xl mb-4 focus-visible:ring-2 focus-visible:ring-offset-0 ${
              isAllergy ? "focus-visible:ring-orange-500" : "focus-visible:ring-green-500"
            }`}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOtherPopupContext(null);
                setOtherText("");
              }}
              className="flex-1 rounded-xl border-gray-700 bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddOther}
              disabled={!otherText.trim()}
              className={`flex-1 rounded-xl bg-gradient-to-r ${gradient} text-white disabled:opacity-50`}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // --- STEP 1: GOAL ---
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center p-6 overflow-x-hidden">
        <div className="mt-6 mb-6 relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
          <div className="relative w-16 h-16 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-10 h-10 border-4 border-white/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          What's your main goal?
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          This helps us find meals that match your needs.
        </p>

        <div className="w-full max-w-md grid grid-cols-2 gap-4">
          {nutritionGoals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            const Icon = goal.icon;
            return (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`relative p-6 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 aspect-square border ${
                  isSelected
                    ? "bg-gray-800/80 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    : "bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900"
                }`}
              >
                <div className={`p-3 rounded-xl ${goal.bg}`}>
                  <Icon className={`w-8 h-8 ${goal.color}`} />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-gray-400"
                  }`}
                >
                  {goal.label}
                </span>
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
        <ProgressBar currentStep={1} colorClass="bg-cyan-500" />

        <div className="w-full max-w-md pb-6">
          <Button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="w-full h-14 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 shadow-lg shadow-teal-500/20 text-lg font-semibold text-white disabled:opacity-50"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // --- STEP 2: DIETARY PREFERENCES ---
  if (step === 2) {
    // Build array with pescatarian + placeholder for grid; other button is separate bottom-right cell.
    const prefsWithPesc = [
      ...dietaryPreferences.slice(0, 3),
      { id: "pescatarian", label: "Pescatarian", icon: "🐟" },
      ...dietaryPreferences.slice(3),
    ];

    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center p-6 relative overflow-x-hidden">
        {renderOtherPopup()}

        <div className="mt-6 mb-6 relative">
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Any dietary preferences?
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Select all that apply. We'll filter meals for you.
        </p>

        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          {prefsWithPesc.map((pref) => {
            const isSelected = selectedPreferences.includes(pref.id);
            return (
              <button
                key={pref.id}
                onClick={() => togglePreference(pref.id)}
                className={`relative h-14 rounded-2xl transition-all duration-300 border ${
                  isSelected
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 border-transparent shadow-lg shadow-green-500/20 scale-[1.02]"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-green-500/50"
                }`}
              >
                <div className="flex items-center justify-between px-4 h-full">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{pref.icon}</span>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {pref.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* OTHER button bottom-right */}
          <button
            onClick={() => setOtherPopupContext("diet")}
            className={`relative h-14 rounded-2xl transition-all duration-300 border ${
              otherPopupContext === "diet"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 border-transparent shadow-lg shadow-green-500/20 scale-[1.02]"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-green-500/50"
            }`}
          >
            <div className="flex items-center justify-center gap-2 px-4 h-full">
              <div className="bg-white/10 p-1 rounded-md">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">Other</span>
            </div>
          </button>
        </div>

        <div className="flex-1" />
        <ProgressBar currentStep={2} colorClass="bg-green-500" />

        <div className="w-full max-w-md flex gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="h-14 rounded-full flex-1 border-gray-800 bg-transparent text-gray-400 hover:bg-gray-900 hover:text-white"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep(3)}
            className="h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 flex-[2] text-lg font-semibold shadow-lg shadow-green-500/20 text-white"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
        <p className="text-gray-500 text-xs mb-2">Optional – skip if none apply</p>
      </div>
    );
  }

  // --- STEP 3: ALLERGIES ---
  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center p-6 relative overflow-x-hidden">
        {renderOtherPopup()}

        <div className="mt-6 mb-6 relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <X className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Any Allergies?
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">We'll keep you safe.</p>

        {allergens.length > 0 && (
          <div className="w-full max-w-md flex flex-wrap gap-2 mb-4 justify-center">
            {allergens.map((allergen) => (
              <div
                key={allergen}
                className="bg-orange-500/10 border border-orange-500/30 text-orange-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 animate-in fade-in zoom-in"
              >
                {allergen}
                <button onClick={() => toggleAllergen(allergen)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-md grid grid-cols-2 gap-3 overflow-y-auto overflow-x-hidden pb-2 max-h-[45vh]">
          {allergyOptions.map((option) => {
            if (option.isOther) {
              const isSelected = otherPopupContext === "allergy";
              return (
                <button
                  key="other-allergy"
                  onClick={() => setOtherPopupContext("allergy")}
                  className={`relative h-14 rounded-2xl transition-all duration-300 border ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-500 to-red-600 border-transparent shadow-lg shadow-orange-500/20 scale-[1.02]"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-orange-500/50"
                  } flex items-center justify-center`}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1 rounded-md transition-colors">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm">Other</span>
                  </div>
                </button>
              );
            }

            const isSelected = allergens.includes(option.name);
            return (
              <button
                key={option.name}
                onClick={() => toggleAllergen(option.name)}
                className={`relative h-14 rounded-2xl transition-all duration-300 border ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-500 to-red-600 border-transparent shadow-lg shadow-orange-500/20 scale-[1.02]"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-orange-500/50"
                }`}
              >
                <div className="flex items-center justify-between px-4 h-full">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{option.emoji}</span>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {option.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-red-600" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
        <ProgressBar currentStep={3} colorClass="bg-orange-500" />

        <div className="w-full max-w-md flex gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => setStep(2)}
            className="h-14 rounded-full flex-1 border-gray-800 bg-transparent text-gray-400 hover:bg-gray-900 hover:text-white"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep(4)}
            className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex-[2] text-lg font-semibold shadow-lg shadow-orange-500/20 text-white"
          >
            Continue
          </Button>
        </div>
        <p className="text-gray-500 text-xs mb-2">Optional – skip if none apply</p>
      </div>
    );
  }

  // --- STEP 4: ACTIVITY TYPES (Figma-style) ---
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl mb-4 shadow-lg shadow-purple-500/50">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white mb-2 text-lg font-semibold">
              How do you stay active?
            </h1>
            <p className="text-gray-400 text-sm">
              Select all activities you do regularly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {activityOptions.map((activity) => {
              const isSelected = activityTypes.includes(activity.id);
              return (
                <button
                  key={activity.id}
                  onClick={() => toggleActivityType(activity.id)}
                  className={`relative h-16 rounded-2xl transition-all border ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 scale-[1.02] border-transparent"
                      : "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 h-full">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activity.emoji}</span>
                      <span className={isSelected ? "text-white" : "text-gray-300"}>
                        {activity.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-purple-500" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 justify-center mb-6">
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full" />
            <div className="h-2 w-16 bg-gray-800 rounded-full" />
          </div>

          <div className="flex gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="h-14 rounded-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(5)}
              className="h-14 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg shadow-purple-500/30 flex-[2]"
            >
              Continue
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <p className="text-center text-gray-500 text-xs">
            Optional – helps us calculate your needs
          </p>
        </div>
      </div>
    );
  }

  // --- STEP 5: ACTIVITY LEVEL ---
  if (step === 5) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center p-6 overflow-x-hidden">
        <div className="mt-6 mb-6 relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Activity Level
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Accurate calories depend on this.
        </p>

        <div className="w-full max-w-md space-y-3">
          {activityLevels.map((level) => {
            const isSelected = activityLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setActivityLevel(level.id)}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "bg-gray-900 border-gray-700 hover:border-gray-600"
                }`}
              >
                <div
                  className={`font-medium mb-1 ${
                    isSelected ? "text-white" : "text-gray-300"
                  }`}
                >
                  {level.label}
                </div>
                <div className="text-xs text-gray-300">{level.description}</div>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
        <ProgressBar currentStep={5} colorClass="bg-blue-500" />

        <div className="w-full max-w-md flex gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => setStep(4)}
            className="h-14 rounded-full flex-1 border-gray-800 bg-transparent text-gray-400 hover:bg-gray-900 hover:text-white"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep(6)}
            disabled={!activityLevel}
            className="h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex-[2] text-lg font-semibold shadow-lg shadow-blue-500/20 text-white disabled:opacity-50"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // --- STEP 6: STATS ("Tell us about yourself") ---
  if (step === 6) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl mb-4 shadow-lg shadow-pink-500/40">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white mb-2 text-lg font-semibold">
              Tell us about yourself
            </h1>
            <p className="text-gray-400 text-sm">
              This helps us calculate your personalized macros.
            </p>
          </div>

          {/* “What are macros?” expandable card */}
          <button
            type="button"
            onClick={() => setMacrosOpen((prev) => !prev)}
            className="w-full mb-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 px-4 py-3 flex flex-col text-left transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-indigo-300" />
                </div>
                <span className="text-sm text-gray-200 font-medium">
                  What are macros?
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  macrosOpen ? "rotate-90" : ""
                }`}
              />
            </div>

            {macrosOpen && (
              <div className="mt-3 text-xs text-gray-200 space-y-2">
                <p>
                  Macros (macronutrients) are the three main nutrients your body needs:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <span className="font-semibold">Protein</span> – builds and repairs
                    muscle, organs, skin, hair, and enzymes.
                  </li>
                  <li>
                    <span className="font-semibold">Carbs</span> – provide energy for
                    workouts and daily life.
                  </li>
                  <li>
                    <span className="font-semibold">Fat</span> – supports hormones and
                    brain function.
                  </li>
                </ul>
                <p>
                  We&apos;ll use your info to find meals that match your ideal macro
                  balance.
                </p>
              </div>
            )}
          </button>

          {/* Form fields */}
          <div className="space-y-5 mb-6">
            {/* Height */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block ml-1">
                Height
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  placeholder="Feet"
                  className="h-12 bg-gray-900 border-gray-700 text-white rounded-xl focus:border-pink-500 focus:ring-pink-500/20 placeholder:text-gray-600"
                />
                <Input
                  type="number"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  placeholder="Inches"
                  className="h-12 bg-gray-900 border-gray-700 text-white rounded-xl focus:border-pink-500 focus:ring-pink-500/20 placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block ml-1">
                Weight (lbs)
              </label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="150"
                className="h-12 bg-gray-900 border-gray-700 text-white rounded-xl focus:border-pink-500 focus:ring-pink-500/20 placeholder:text-gray-600"
              />
            </div>

            {/* Age */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block ml-1">
                Age
              </label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                className="h-12 bg-gray-900 border-gray-700 text-white rounded-xl focus:border-pink-500 focus:ring-pink-500/20 placeholder:text-gray-600"
              />
            </div>

            {/* Sex selector */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block ml-1">
                Sex (optional)
              </label>
              <div className="flex gap-3">
                {[
                  { id: "male" as const, label: "Male" },
                  { id: "female" as const, label: "Female" },
                  { id: "other" as const, label: "Other" },
                ].map((option) => {
                  const isSelected = sex === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSex(option.id)}
                      className={`flex-1 h-10 rounded-full border text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-pink-500 to-rose-600 border-transparent text-white"
                          : "bg-gray-900 border-gray-700 text-gray-300 hover:border-pink-500/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="flex gap-2 justify-center mb-6">
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gray-700 rounded-full" />
            <div className="h-2 w-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => setStep(5)}
              className="h-14 rounded-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleFinish}
              disabled={!canProceedStepStats || isSubmitting}
              className="h-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/30 flex-[2] text-lg font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Complete Setup"}
              {!isSubmitting && <ChevronRight className="ml-2 w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
