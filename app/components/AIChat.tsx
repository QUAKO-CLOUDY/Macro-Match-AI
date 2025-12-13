"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, Minus, Heart } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MealCard } from "./MealCard";
import type { UserProfile, Meal } from "../types";
import { getMealImageUrl } from "@/lib/image-utils";
import { useSessionActivity } from "../hooks/useSessionActivity";

type Props = {
  userProfile: UserProfile;
  onMealSelect: (meal: Meal) => void;
  favoriteMeals?: string[];
  onToggleFavorite?: (mealId: string, meal?: Meal) => void;
};

type Message = {
  id: string;
  type: "user" | "ai";
  content: string;
  meals?: Meal[];
  timestamp: Date;
  suggestRadiusExpansion?: boolean;
  currentRadius?: number;
  nextRadius?: number;
};

// Generate quick prompts based on user profile
const getQuickPrompts = (userProfile: UserProfile): string[] => {
  const prompts: string[] = [];
  
  // Always include calorie-based prompt if target exists
  if (userProfile.target_calories) {
    const mealCalTarget = Math.round(userProfile.target_calories * 0.3); // ~30% of daily
    prompts.push(`🍽️ Lunch under ${mealCalTarget} calories`);
  } else {
    prompts.push("🍽️ Lunch under 600 calories");
  }
  
  // High protein prompt - always useful
  prompts.push("💪 High protein breakfast");
  
  // Diet-type specific prompts
  if (userProfile.diet_type) {
    const dietType = userProfile.diet_type.toLowerCase();
    if (dietType === 'vegan') {
      prompts.push("🌱 Vegan options");
    } else if (dietType === 'vegetarian') {
      prompts.push("🥗 Vegetarian meals");
    } else if (dietType === 'keto' || dietType === 'ketogenic') {
      prompts.push("🥑 Keto-friendly meals");
    } else if (dietType === 'low_carb' || dietType === 'low carb' || dietType === 'low-carb') {
      prompts.push("🥑 Low carb dinner");
    }
  } else {
    prompts.push("🥑 Low carb dinner");
  }
  
  // Dietary options prompts
  if (userProfile.dietary_options && userProfile.dietary_options.length > 0) {
    const normalizedOptions = userProfile.dietary_options.map(opt => opt.toLowerCase().replace(/[-\s]+/g, '_'));
    if (normalizedOptions.includes('high_protein')) {
      // Already have high protein, maybe add another variation
      if (!prompts.some(p => p.includes('protein'))) {
        prompts.push("💪 High protein meals");
      }
    }
  }
  
  // Ensure we always have at least 4 prompts
  while (prompts.length < 4) {
    prompts.push("🍽️ Find me a meal");
  }
  
  return prompts.slice(0, 4);
};

const macroAdjustments = [
  { label: "More Protein", icon: Plus },
  { label: "Less Carbs", icon: Minus },
  { label: "Less Fat", icon: Minus },
  { label: "Higher Cal", icon: Plus },
];

export function AIChat({ userProfile, onMealSelect, favoriteMeals = [], onToggleFavorite }: Props) {
  const userName = userProfile?.full_name || "Friend";
  const { updateActivity } = useSessionActivity();
  
  // Session-level distance override (temporary, not persisted to profile)
  const [chatDistanceOverride, setChatDistanceOverride] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('seekeatz_chat_distance_override');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse chat distance override:', e);
        }
      }
    }
    return null;
  });

  // Get active distance: Chat override if set, otherwise Settings default, otherwise 1 mile
  const activeDistance = chatDistanceOverride ?? userProfile.search_distance_miles ?? 1;

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

  // Radius expansion steps
  const RADIUS_STEPS = [1, 2, 5, 10, 15, 20];
  const MAX_RADIUS = 20;

  // Get next radius step
  const getNextRadius = (current: number): number | null => {
    const currentIndex = RADIUS_STEPS.indexOf(current);
    if (currentIndex === -1 || currentIndex === RADIUS_STEPS.length - 1) {
      return null; // Already at max
    }
    return RADIUS_STEPS[currentIndex + 1];
  };

  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      }
    }
    return [
      {
        id: "1",
        type: "ai" as const,
        content:
          "Your personal meal finder is online. Tell me your calories, macros, or cravings and I'll do the rest.",
        timestamp: new Date(),
      },
    ];
  });
  
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize visible meal counts from persisted messages (default to 5 for each message with meals)
  const [visibleMealCounts, setVisibleMealCounts] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seekeatz_chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const counts: Record<string, number> = {};
          parsed.forEach((msg: any) => {
            if (msg.meals && Array.isArray(msg.meals) && msg.meals.length > 5) {
              counts[msg.id] = 5; // Default to 5 for persisted messages too
            }
          });
          return counts;
        } catch (e) {
          // Ignore parse errors, will default to empty
        }
      }
    }
    return {};
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for pending chat message from quick chat buttons on home screen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingMessage = localStorage.getItem('seekeatz_pending_chat_message');
      if (pendingMessage) {
        localStorage.removeItem('seekeatz_pending_chat_message');
        // Small delay to ensure component is fully mounted and handleSendMessage is available
        const timer = setTimeout(() => {
          handleSendMessage(pendingMessage);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      // Only persist if not the initial empty message
      if (messages.length > 1 || messages[0].id !== "1") {
        localStorage.setItem('seekeatz_chat_messages', JSON.stringify(messages));
      }
    }
  }, [messages]);

  // Convert API result to Meal type
  const convertToMeal = (item: any): Meal => {
    // Determine category from item data
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
      price: item.price || null, // Keep null for proper handling
      description: item.description || '',
      category: category,
      dietary_tags: item.dietary_tags || item.tags || [],
      rating: item.rating || undefined,
      distance: item.distance || undefined,
    };
  };

  const searchMeals = async (query: string, returnRawItems = false): Promise<Meal[] | { meals: Meal[], rawItems: any[] }> => {
    try {
      // Log search parameters for debugging (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 AI Chat Search: query="${query}", radius=${activeDistance} miles, hasLocation=${!!userLocation}`);
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          radius_miles: activeDistance,
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
      
      // Return both if raw items are needed for filtering
      if (returnRawItems) {
        return { meals, rawItems: normalizedResults };
      }
      
      return meals;
    } catch (error) {
      console.error('Search failed:', error);
      return returnRawItems ? { meals: [], rawItems: [] } : [];
    }
  };

  // Helper to check if a meal is a full meal (not a single ingredient/item)
  const isFullMeal = (meal: Meal, item?: any): boolean => {
    // Check if category indicates a full meal
    if (item?.category) {
      const category = item.category.toLowerCase();
      // Signature Bowls are always full meals
      if (category.includes('signature') || category.includes('bowl')) {
        return true;
      }
      // Exclude single items: Protein, Base, Topping, Dressing, Side, Ingredient
      const singleItemCategories = ['protein', 'base', 'topping', 'dressing', 'side', 'ingredient'];
      if (singleItemCategories.some(cat => category.includes(cat))) {
        return false;
      }
    }
    
    // If calories are very low (< 150), it's likely a single ingredient/side
    if (meal.calories < 150) {
      return false;
    }
    
    // Default to true if we can't determine
    return true;
  };

  const generateAIResponse = async (
    userMessage: string,
    conversationHistory: Message[],
    useRadius?: number
  ): Promise<{ content: string; meals?: Meal[]; suggestRadiusExpansion?: boolean; currentRadius?: number; nextRadius?: number }> => {
    const searchRadius = useRadius ?? activeDistance;
    
    try {
      // Prepare messages array for API
      const apiMessages = conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add the current user message
      apiMessages.push({
        role: 'user',
        content: userMessage
      });

      // Call the new structured reasoning API
      const res = await fetch('/api/chat/reasoning/structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          userProfile: {
            diet_type: userProfile.diet_type,
            dietary_options: userProfile.dietary_options || [],
            target_calories: userProfile.target_calories,
            target_protein_g: userProfile.target_protein_g,
            target_carbs_g: userProfile.target_carbs_g,
            target_fats_g: userProfile.target_fats_g,
            search_distance_miles: searchRadius,
          },
          location: undefined, // Can be added later if needed
          mealHistory: undefined, // Can be added later if needed
          radius_miles: searchRadius, // Pass distance for filtering
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      // Check if we got zero meals and should suggest radius expansion
      const meals = data.meals && data.meals.length > 0 ? data.meals : undefined;
      const hasNoMeals = !meals || meals.length === 0;
      const nextRadius = getNextRadius(searchRadius);

      // If no meals found and we can expand radius, suggest expansion
      if (hasNoMeals && nextRadius && searchRadius < MAX_RADIUS) {
        return {
          content: `I couldn't find meals within ${searchRadius} ${searchRadius === 1 ? 'mile' : 'miles'}. Would you like me to expand the search radius to ${nextRadius} miles?`,
          meals: undefined,
          suggestRadiusExpansion: true,
          currentRadius: searchRadius,
          nextRadius: nextRadius
        };
      }

      // Return the response - meals will be empty array if it's a text-only response
      return {
        content: data.content || "I'm here to help!",
        meals: meals
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback to old search method if new API fails
      return {
        content: "Sorry, I encountered an error. Please try again.",
        meals: undefined
      };
    }
  };

  // Check if user message indicates consent to expand radius
  const isRadiusExpansionConsent = (message: string): boolean => {
    const lower = message.toLowerCase().trim();
    const consentKeywords = ['yes', 'ok', 'okay', 'expand', 'look farther', 'increase radius', 'sure', 'go ahead', 'try', 'do it'];
    return consentKeywords.some(keyword => lower.includes(keyword));
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    updateActivity(); // Update activity on chat message

    // Check if this is a response to a radius expansion suggestion
    const lastMessage = messages[messages.length - 1];
    const isExpandingRadius = lastMessage?.suggestRadiusExpansion && isRadiusExpansionConsent(messageText);
    let searchRadius = activeDistance;

    if (isExpandingRadius && lastMessage.nextRadius) {
      // User consented to expand radius - update session override
      const newRadius = lastMessage.nextRadius;
      setChatDistanceOverride(newRadius);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('seekeatz_chat_distance_override', JSON.stringify(newRadius));
      }
      searchRadius = newRadius;
      console.log(`📍 Expanding search radius to ${newRadius} miles (user consented)`);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Add a loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      type: "ai",
      content: "Searching for meals...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await generateAIResponse(messageText, messages, searchRadius);
      const { content, meals, suggestRadiusExpansion, currentRadius, nextRadius } = response;
      
      // Remove loading message and add real response
      const newMessageId = (Date.now() + 2).toString();
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: newMessageId,
            type: "ai" as const,
            content,
            meals, // Will be undefined if no meals (text-only response)
            timestamp: new Date(),
            suggestRadiusExpansion,
            currentRadius,
            nextRadius,
          },
        ];
      });
      
      // Initialize visible count for this message to 5 (or total if less)
      // Only if meals exist (not a text-only response)
      if (meals && meals.length > 0) {
        setVisibleMealCounts((prev) => ({
          ...prev,
          [newMessageId]: Math.min(5, meals.length),
        }));
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Remove loading message and add error response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: (Date.now() + 2).toString(),
            type: "ai" as const,
            content: "Sorry, I encountered an error while searching. Please try again.",
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    setIsListening((prev) => !prev);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 dark:from-cyan-600 dark:via-blue-600 dark:to-indigo-700 text-white p-5 shadow-lg shadow-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Sparkles className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">AI Meal Assistant</h1>
            <p className="text-cyan-100 text-sm">
              The easiest way to seek great eatz.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-4 pb-6 pb-safe space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[65%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white ml-auto shadow-lg shadow-teal-500/30"
                    : "bg-gradient-to-br from-card to-muted border border-border text-foreground"
                }`}
              >
                {message.type === "ai" ? (
                  <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-foreground">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
                <p className="text-[10px] mt-1 text-foreground/60">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* AI Meal Suggestions - Compact inline style */}
            {message.meals && message.meals.length > 0 && (() => {
              // Default to 5 for new messages, or use saved count
              const defaultCount = message.meals.length > 5 ? 5 : message.meals.length;
              const visibleCount = visibleMealCounts[message.id] ?? defaultCount;
              const visibleMeals = message.meals.slice(0, visibleCount);
              const hasMore = message.meals.length > visibleCount;
              
              return (
              <div className="mt-2 space-y-1.5">
                {visibleMeals.map((meal) => (
                  <div
                    key={meal.id}
                    onClick={() => {
                      updateActivity(); // Update activity on meal selection
                      onMealSelect(meal);
                    }}
                    className="group flex items-center gap-2 p-2 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-cyan-500/50 transition-all cursor-pointer"
                  >
                    {/* Small thumbnail */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={meal.image && meal.image !== '/placeholder-food.jpg' && meal.image !== '' ? meal.image : '/logos/default.png'}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/logos/default.png';
                          e.currentTarget.onerror = null;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    </div>
                    
                    {/* Meal info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-foreground truncate">{meal.name}</h4>
                        {favoriteMeals.includes(meal.id) && (
                          <Heart className="w-3 h-3 fill-pink-500 text-pink-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{meal.restaurant}</span>
                      </div>
                    </div>
                    
                    {/* Quick macro indicators */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="flex flex-col items-center px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                        <span className="text-[9px] font-bold text-pink-600 dark:text-pink-400">{meal.calories}</span>
                        <span className="text-[7px] text-pink-600/70 dark:text-pink-400/70">cal</span>
                      </div>
                      <div className="flex flex-col items-center px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">{meal.protein}g</span>
                        <span className="text-[7px] text-cyan-600/70 dark:text-cyan-400/70">pro</span>
                      </div>
                      <div className="flex flex-col items-center px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                        <span className="text-[9px] font-bold text-green-600 dark:text-green-400">{meal.carbs}g</span>
                        <span className="text-[7px] text-green-600/70 dark:text-green-400/70">carb</span>
                      </div>
                      <div className="flex flex-col items-center px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">{meal.fats}g</span>
                        <span className="text-[7px] text-amber-600/70 dark:text-amber-400/70">fat</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVisibleMealCounts((prev) => ({
                          ...prev,
                          [message.id]: message.meals!.length,
                        }));
                      }}
                      className="rounded-full px-4 py-1.5 h-auto text-xs bg-muted/50 border-border text-foreground hover:border-cyan-500 hover:text-cyan-500 hover:bg-card transition-all"
                    >
                      Load more ({message.meals!.length - visibleCount} more)
                    </Button>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts & Macro adjustments - Combined and compact */}
      <div className="px-3 py-1.5 bg-background border-t border-border">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {getQuickPrompts(userProfile).map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="rounded-full h-6 text-[10px] whitespace-nowrap bg-muted border-border text-foreground hover:border-cyan-500 hover:text-cyan-300 hover:bg-card transition-all px-2.5 shrink-0"
              onClick={() => {
                updateActivity(); // Update activity on quick prompt click
                handleSendMessage(prompt);
              }}
            >
              {prompt}
            </Button>
          ))}
          {macroAdjustments.map((adjustment, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="rounded-full h-6 text-[10px] whitespace-nowrap bg-muted border-border text-foreground hover:border-cyan-500 hover:text-cyan-300 hover:bg-card transition-all px-2.5 shrink-0"
              onClick={() => {
                updateActivity(); // Update activity on macro adjustment click
                handleSendMessage(
                  `Show me meals with ${adjustment.label.toLowerCase()}`
                );
              }}
            >
              <adjustment.icon className="size-2.5 mr-1" />
              {adjustment.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 pb-safe bg-gradient-to-r from-cyan-900/10 dark:from-cyan-900/20 via-background to-blue-900/10 dark:to-blue-900/20 border-t border-border" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px) + 80px)` }}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AI to find meals, macros, or cravings..."
              className="rounded-full pr-10 py-5 bg-muted/90 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceInput}
              className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 ${
                isListening
                  ? "bg-pink-500/20 text-pink-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="size-4" />
            </Button>
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="rounded-full size-10 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/40 shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="size-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
