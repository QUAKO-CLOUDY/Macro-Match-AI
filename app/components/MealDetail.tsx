"use client";

import { useState } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Zap, 
  TrendingUp, 
  Plus, 
  Heart, 
  Share, 
  ShieldCheck,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import type { Meal } from '../types'; 
import { mockMeals } from '../data/mockData';

// --- TYPES ---
type Props = {
  meal: Meal;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  onLogMeal: () => void;
};

type SwapOption = {
  id: string;
  label: string;
  protein?: number;
  carbs?: number;
  fats?: number;
  calories: number;
};

// --- CONSTANTS ---
const SWAP_OPTIONS: SwapOption[] = [
  { id: 'protein', label: 'Add Extra Protein', protein: 15, calories: 75 },
  { id: 'carbs', label: 'Reduce Carbs', carbs: -20, calories: -80 },
  { id: 'fats', label: 'Add Healthy Fats', fats: 10, calories: 90 },
  { id: 'double', label: 'Double Protein', protein: 42, calories: 168 },
];

// --- HELPER LOGIC ---
function generateWhyText(meal: Meal): string {
  if (meal.protein > 35 && meal.calories < 600) return "High protein & low calorie cut-friendly option.";
  if (meal.carbs < 20) return "Low-carb option that fits your macro goals.";
  if (meal.calories > 800) return "High energy meal for intense training days.";
  return "Balanced macro profile with clean ingredients.";
}

function generateSwaps(meal: Meal): string[] {
  if ((meal as any).aiSwaps && (meal as any).aiSwaps.length > 0) return (meal as any).aiSwaps;
  const swaps = [];
  if (meal.carbs > 40) swaps.push("Swap rice for cauliflower rice to save 150 cal");
  if (meal.fats > 20) swaps.push("Ask for sauce on the side to reduce fat by 10g");
  if (meal.protein < 30) swaps.push("Double protein for +35g protein & 150 cal");
  if (swaps.length === 0) swaps.push("Remove cheese to save 80 calories");
  return swaps;
}

function generateTags(meal: Meal): string[] {
  const tags = [];
  if (meal.protein > 30) tags.push("High Protein");
  if (meal.carbs < 25) tags.push("Low Carb");
  if (meal.calories < 550) tags.push("Low Calorie");
  if (meal.fats > 20 && meal.carbs < 20) tags.push("Keto-Friendly");
  if (tags.length === 0) tags.push("Balanced");
  tags.push("Clean Ingredients");
  return tags;
}

export function MealDetail({ meal, isFavorite, onToggleFavorite, onBack, onLogMeal }: Props) {
  const [expandIngredients, setExpandIngredients] = useState(false);
  
  // Modal States
  const [showLogModal, setShowLogModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  
  // Customization State
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([]);
  
  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [manualPro, setManualPro] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');

  if (!meal) return null;

  // Mock Data / Logic
  const rating = (meal as any).rating || 4.8;
  const distance = (meal as any).distance || "0.8 mi";
  const prepTime = "12 min";
  const similarMeals = mockMeals.filter(m => m.id !== meal.id).slice(0, 3);
  const whyText = generateWhyText(meal);
  const aiSwaps = generateSwaps(meal);
  const tags = generateTags(meal);
  
  const allIngredients = meal.ingredients || ["Grilled Chicken", "Quinoa", "Kale", "Lemon Vinaigrette", "Cherry Tomatoes"];
  const visibleIngredients = expandIngredients ? allIngredients : allIngredients.slice(0, 3);

  const totalMacros = meal.protein + (meal.carbs || 0) + (meal.fats || 0);
  const pPercent = Math.round((meal.protein / totalMacros) * 100);
  const cPercent = Math.round(((meal.carbs || 0) / totalMacros) * 100);
  const fPercent = Math.round(((meal.fats || 0) / totalMacros) * 100);
  
  const calsRemaining = 850; 
  const calsAfter = calsRemaining - meal.calories;

  // --- HANDLERS ---
  const toggleSwap = (id: string) => {
    setSelectedSwaps(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmLog = () => {
    onLogMeal(); // In a real app, this would pass the modified meal data
    setShowLogModal(false);
    setSelectedSwaps([]);
  };

  const handleManualSubmit = () => {
    // Just close for now, logically would pass data to parent
    setShowManualModal(false);
    setManualName(''); setManualCals(''); setManualPro(''); setManualCarbs(''); setManualFats('');
  };
  
  const handleOrderOnline = () => {
    window.open("https://www.ubereats.com", "_blank");
  };

  const isManualValid = manualName && manualCals;

  return (
    <div className="h-full w-full bg-[#020617] text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-48"> 
        
        {/* HEADER IMAGE */}
        <div className="relative h-64 w-full shrink-0">
          <img 
            src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'} 
            alt={meal.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/60">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex gap-3">
              <button onClick={onToggleFavorite} className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center border ${isFavorite ? 'bg-pink-500/20 text-pink-500 border-pink-500/50' : 'bg-black/40 text-white border-white/10'}`}>
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10">
                <Share className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="px-5 -mt-6 relative z-10 space-y-6">
          
          {/* TITLE & INFO */}
          <div>
            <div className="flex items-start justify-between">
              <h1 className="text-white text-2xl font-bold flex-1 leading-tight">{meal.name}</h1>
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg ml-2 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 text-[10px] font-semibold">93% Match</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-1 italic">"{whyText}"</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-300">
               <span className="font-semibold text-white">{meal.restaurant}</span>
               <span className="w-1 h-1 rounded-full bg-slate-600"></span>
               <div className="flex items-center gap-1">
                 <MapPin className="w-3 h-3 text-slate-500" />
                 {distance} away
               </div>
               <span className="w-1 h-1 rounded-full bg-slate-600"></span>
               <div className="flex items-center gap-1">
                 <Clock className="w-3 h-3 text-slate-500" />
                 {prepTime} pickup
               </div>
            </div>
          </div>

          {/* TAGS */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span key={i} className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium tracking-wide">
                {tag}
              </span>
            ))}
          </div>

          {/* MACROS CARD */}
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-sm font-semibold">Nutritional Information</p>
              <Info className="w-4 h-4 text-slate-600" />
            </div>

            {/* Calories - Purple/Pink Gradient (Moved here) */}
            <div className="mb-5">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-3 text-center w-full">
                <Flame className="w-4 h-4 text-pink-400 mx-auto mb-1.5" />
                <p className="text-white text-xl font-bold leading-none mb-0.5">{meal.calories}</p>
                <p className="text-pink-300/60 text-[10px] font-medium uppercase">Calories</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/50">
               <div className="text-center">
                 <div className="h-1 w-full bg-slate-800 rounded-full mb-2 overflow-hidden">
                   <div style={{ width: `${cPercent}%` }} className="h-full bg-emerald-500 rounded-full"></div>
                 </div>
                 <p className="text-emerald-400 font-bold text-sm">{meal.carbs || 35}g</p>
                 <p className="text-slate-500 text-[10px]">Carbs ({cPercent}%)</p>
               </div>
               <div className="text-center">
                 <div className="h-1 w-full bg-slate-800 rounded-full mb-2 overflow-hidden">
                   <div style={{ width: `${fPercent}%` }} className="h-full bg-amber-500 rounded-full"></div>
                 </div>
                 <p className="text-amber-400 font-bold text-sm">{meal.fats || 12}g</p>
                 <p className="text-slate-500 text-[10px]">Fats ({fPercent}%)</p>
               </div>
               <div className="text-center">
                 <div className="h-1 w-full bg-slate-800 rounded-full mb-2 overflow-hidden">
                   <div style={{ width: `${pPercent}%` }} className="h-full bg-cyan-500 rounded-full"></div>
                 </div>
                 <p className="text-cyan-400 font-bold text-sm">{meal.protein}g</p>
                 <p className="text-slate-500 text-[10px]">Protein ({pPercent}%)</p>
               </div>
            </div>
          </div>

          {/* IMPACT PREVIEW */}
          <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80">
            <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Impact on Today</h3>
            <div className="flex items-center justify-between text-sm">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                     <TrendingUp className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white">Calories Remaining</p>
                    <p className="text-slate-500 text-xs">If you eat this</p>
                  </div>
               </div>
               <div className="text-right">
                 <p className={`font-bold ${calsAfter < 0 ? 'text-red-400' : 'text-white'}`}>
                    {calsAfter} cal
                 </p>
                 <p className="text-slate-500 text-xs">
                    {calsAfter < 0 ? 'Over budget' : 'Left for today'}
                 </p>
               </div>
            </div>
          </div>

          {/* AI SUGGESTED SWAPS - Changed to Indigo/Blue theme */}
          <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-white font-medium">AI-Suggested Swaps</p>
              </div>
              <div className="space-y-2">
                {aiSwaps.map((swap, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/30 rounded-2xl p-4"
                  >
                    <p className="text-gray-300 text-sm leading-snug">{swap}</p>
                  </div>
                ))}
              </div>
          </div>

          {/* INGREDIENTS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-semibold">Ingredients</p>
              <button onClick={() => setExpandIngredients(!expandIngredients)} className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300">
                {expandIngredients ? "Show Less" : "See All"}
                {expandIngredients ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 transition-all">
              {visibleIngredients.map((ingredient, index) => (
                <span key={index} className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-medium">
                  {ingredient}
                </span>
              ))}
              {!expandIngredients && allIngredients.length > 3 && (
                <span onClick={() => setExpandIngredients(true)} className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium cursor-pointer hover:bg-slate-700">
                  + {allIngredients.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* SIMILAR OPTIONS */}
          <div className="mb-6">
            <p className="text-white text-sm font-semibold mb-3">Similar Options</p>
            <div className="space-y-3">
              {similarMeals.map(similar => (
                <div key={similar.id} className="flex gap-3 bg-[#0f172a] border border-slate-800 rounded-2xl p-2.5 cursor-pointer hover:border-cyan-500/30 transition-all">
                  <img src={similar.image} alt={similar.name} className="w-16 h-16 rounded-xl object-cover bg-slate-800" />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-white text-sm font-medium truncate">{similar.name}</p>
                    <p className="text-slate-500 text-xs truncate mb-1">{similar.restaurant}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{similar.calories} cal</span>
                      <span className="text-slate-600 text-[10px]">•</span>
                      <span className="text-slate-400 text-[10px]">{similar.protein}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-12"></div>
        </div>
      </div>

      {/* --- STICKY BOTTOM ACTIONS --- */}
      <div className="absolute bottom-0 left-0 w-full p-5 pt-4 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-20 backdrop-blur-[2px]">
        <div className="space-y-3 max-w-md mx-auto">
          <button 
            onClick={() => setShowLogModal(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020617] font-bold text-sm py-3.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Log to Daily Tracker
          </button>
          
          <button 
            onClick={() => setShowManualModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-full shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Meal Manually
          </button>

          <button 
            onClick={handleOrderOnline}
            className="w-full rounded-full bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 font-medium text-sm py-3.5 flex items-center justify-center gap-2 transition-colors"
          >
            Order Online
            <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
          </button>
        </div>
      </div>

      {/* --- LOG MODAL (CUSTOMIZE) --- */}
      {showLogModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-t border-gray-700 rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Customize Your Meal</h2>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">Did you make any of these AI-suggested swaps?</p>

            <div className="space-y-2 mb-6">
              {SWAP_OPTIONS.map(swap => {
                const isSelected = selectedSwaps.includes(swap.id);
                return (
                  <button
                    key={swap.id}
                    onClick={() => toggleSwap(swap.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-gray-600'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{swap.label}</p>
                        <p className="text-gray-400 text-xs">
                          {swap.protein ? `+${swap.protein}g protein • ` : ''}
                          {swap.calories > 0 ? '+' : ''}{swap.calories} cal
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Live Macro Preview */}
            {selectedSwaps.length > 0 && (
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4 mb-6">
                <p className="text-purple-300 text-xs mb-2 uppercase font-bold">Updated Macros</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-white font-bold">{meal.calories + selectedSwaps.reduce((sum, id) => sum + (SWAP_OPTIONS.find(s => s.id === id)?.calories || 0), 0)}</p>
                    <p className="text-gray-400 text-[10px]">cal</p>
                  </div>
                  <div>
                    <p className="text-white font-bold">{meal.protein + selectedSwaps.reduce((sum, id) => sum + (SWAP_OPTIONS.find(s => s.id === id)?.protein || 0), 0)}g</p>
                    <p className="text-gray-400 text-[10px]">pro</p>
                  </div>
                  <div>
                    <p className="text-white font-bold">{meal.carbs + selectedSwaps.reduce((sum, id) => sum + (SWAP_OPTIONS.find(s => s.id === id)?.carbs || 0), 0)}g</p>
                    <p className="text-gray-400 text-[10px]">carbs</p>
                  </div>
                  <div>
                    <p className="text-white font-bold">{meal.fats + selectedSwaps.reduce((sum, id) => sum + (SWAP_OPTIONS.find(s => s.id === id)?.fats || 0), 0)}g</p>
                    <p className="text-gray-400 text-[10px]">fats</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowLogModal(false)} className="flex-1 h-12 rounded-full bg-gray-800 border border-gray-700 text-white font-medium hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleConfirmLog} className="flex-1 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-lg shadow-green-500/30 flex items-center justify-center">
                <Plus className="mr-2 w-5 h-5" />
                Log Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL ADD MODAL --- */}
      {showManualModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-t border-gray-700 rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">Add Meal Manually</h2>
              <button onClick={() => setShowManualModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-xs mb-1.5 block ml-1">Meal Name</label>
                <input 
                  value={manualName} 
                  onChange={e => setManualName(e.target.value)} 
                  placeholder="e.g. Grilled Chicken Salad"
                  className="w-full h-12 rounded-xl bg-gray-900/50 border border-gray-700 text-white px-4 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs mb-1.5 block ml-1">Calories</label>
                <input 
                  type="number" 
                  value={manualCals} 
                  onChange={e => setManualCals(e.target.value)} 
                  placeholder="500"
                  className="w-full h-12 rounded-xl bg-gray-900/50 border border-gray-700 text-white px-4 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-300 text-xs mb-1.5 block ml-1">Protein (g)</label>
                  <input type="number" value={manualPro} onChange={e => setManualPro(e.target.value)} placeholder="30" className="w-full h-12 rounded-xl bg-gray-900/50 border border-gray-700 text-white px-3 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-gray-300 text-xs mb-1.5 block ml-1">Carbs (g)</label>
                  <input type="number" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} placeholder="40" className="w-full h-12 rounded-xl bg-gray-900/50 border border-gray-700 text-white px-3 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-gray-300 text-xs mb-1.5 block ml-1">Fats (g)</label>
                  <input type="number" value={manualFats} onChange={e => setManualFats(e.target.value)} placeholder="15" className="w-full h-12 rounded-xl bg-gray-900/50 border border-gray-700 text-white px-3 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowManualModal(false)} className="flex-1 h-12 rounded-full bg-gray-800 border border-gray-700 text-white font-medium hover:bg-gray-700">
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit} 
                disabled={!isManualValid}
                className={`flex-1 h-12 rounded-full font-medium shadow-lg flex items-center justify-center transition-all ${isManualValid ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              >
                <Check className="mr-2 w-5 h-5" />
                Add Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Style */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}