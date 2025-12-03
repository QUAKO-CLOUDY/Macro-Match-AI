"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, Minus, Flame, Zap, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import type { UserProfile, Meal } from "../types";

type Props = {
  userProfile: UserProfile;
  onMealSelect: (meal: Meal) => void;
};

type Message = {
  id: string;
  type: "user" | "ai";
  content: string;
  meals?: Meal[];
  timestamp: Date;
};

const quickPrompts = [
  "🍽️ Lunch under 600 calories",
  "💪 High protein breakfast",
  "🥑 Low carb dinner",
  "🌱 Vegan options",
];

const macroAdjustments = [
  { label: "More Protein", icon: Plus },
  { label: "Less Carbs", icon: Minus },
  { label: "Less Fat", icon: Minus },
  { label: "Higher Cal", icon: Plus },
];

export function AIChat({ userProfile, onMealSelect }: Props) {
  const userName = userProfile?.name || "Friend";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Your personal meal finder is online. Tell me your calories, macros, or cravings and I’ll do the rest.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert API result to Meal type
  const convertToMeal = (item: any): Meal => {
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
  };

  const searchMeals = async (query: string): Promise<Meal[]> => {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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
      return normalizedResults.map(convertToMeal);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  };

  const generateAIResponse = async (
    userMessage: string
  ): Promise<{ content: string; meals?: Meal[] }> => {
    // Use the search API to find real meals
    const meals = await searchMeals(userMessage);

    const content =
      meals.length > 0
        ? `I found ${meals.length} great option${
            meals.length !== 1 ? "s" : ""
          } for you! Tap any meal to see full details.`
        : "I couldn't find exact matches in the database. Try searching with different keywords or check back later as we add more meals.";

    return { content, meals };
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

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
      const { content, meals } = await generateAIResponse(messageText);
      
      // Remove loading message and add real response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: (Date.now() + 2).toString(),
            type: "ai" as const,
            content,
            meals,
            timestamp: new Date(),
          },
        ];
      });
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
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Sparkles className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">AI Meal Assistant</h1>
            <p className="text-cyan-100 text-sm">
              Scanning menus for your perfect meal, {userName}.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white ml-auto shadow-lg shadow-teal-500/30"
                    : "bg-gradient-to-br from-card to-muted border border-border text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className="text-[10px] mt-1 text-foreground/60">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* AI Meal Suggestions */}
            {message.meals && message.meals.length > 0 && (
              <div className="mt-3 space-y-3 pl-4">
                {message.meals.map((meal) => {
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
                      className={`text-foreground rounded-2xl border p-4 cursor-pointer hover:border-cyan-500/60 transition-all hover:shadow-lg hover:shadow-cyan-500/20 group ${
                        isGrocery
                          ? 'bg-card/80 border-green-500/30'
                          : 'bg-card/80 border-border'
                      }`}
                    >
                      {/* Grocery Badge */}
                      {isGrocery && (
                        <div className="mb-2 -mt-1">
                          <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Buy & Assemble
                          </span>
                        </div>
                      )}
                      <div className="flex gap-3">
                        {meal.image && meal.image !== '/placeholder-food.jpg' ? (
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="size-20 rounded-xl object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="size-20 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            Food
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-sm group-hover:text-cyan-300 transition-colors">
                              {meal.name}
                            </p>
                            <span 
                              className="text-xs text-muted-foreground whitespace-nowrap"
                              title="Price varies by location"
                            >
                              {formatPrice()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <p className="text-muted-foreground text-xs">
                              {meal.restaurant}
                            </p>
                            {hasVariableAvailability && (
                              <div 
                                className="group/alert relative"
                                title="Availability depends on store location"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                                {/* Tooltip for desktop */}
                                <div className="hidden group-hover/alert:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card text-xs text-card-foreground rounded whitespace-nowrap z-10 border border-border">
                                  Availability depends on store location
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-card"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full bg-pink-500/10 text-pink-300 border-pink-500/30 px-2 py-0 h-5 text-[10px]"
                            >
                              <Flame className="size-3 mr-1" />
                              {meal.calories} cal
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-full bg-cyan-500/10 text-cyan-300 border-cyan-500/30 px-2 py-0 h-5 text-[10px]"
                            >
                              <Zap className="size-3 mr-1" />
                              {meal.protein}g pro
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 bg-background border-t border-border">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="rounded-full h-7 text-xs whitespace-nowrap bg-muted border-border text-foreground hover:border-cyan-500 hover:text-cyan-300 hover:bg-card transition-all"
              onClick={() => handleSendMessage(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>

      {/* Macro adjustments */}
      <div className="px-4 py-2 bg-background border-t border-border">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {macroAdjustments.map((adjustment, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="rounded-full h-7 text-xs whitespace-nowrap bg-muted border-border text-foreground hover:border-cyan-500 hover:text-cyan-300 hover:bg-card transition-all"
              onClick={() =>
                handleSendMessage(
                  `Show me meals with ${adjustment.label.toLowerCase()}`
                )
              }
            >
              <adjustment.icon className="size-3 mr-1" />
              {adjustment.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-r from-cyan-900/20 via-background to-blue-900/20 border-t border-border">
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
