"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, Minus, Flame, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { mockMeals } from "../data/mockData";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (
    userMessage: string
  ): { content: string; meals?: Meal[] } => {
    const lowerMessage = userMessage.toLowerCase();
    let filteredMeals = [...mockMeals];

    if (lowerMessage.includes("under 600") || lowerMessage.includes("low calorie")) {
      filteredMeals = filteredMeals.filter((m) => m.calories < 600);
    }
    if (lowerMessage.includes("high protein")) {
      filteredMeals = filteredMeals.filter((m) => m.protein > 30);
    }
    if (lowerMessage.includes("low carb") || lowerMessage.includes("keto")) {
      filteredMeals = filteredMeals.filter((m) => m.carbs < 20);
    }
    if (lowerMessage.includes("vegan")) {
      filteredMeals = filteredMeals.filter((m) =>
        m.name.toLowerCase().includes("vegan")
      );
    }

    const content =
      filteredMeals.length > 0
        ? `I found ${filteredMeals.length} great option${
            filteredMeals.length !== 1 ? "s" : ""
          } for you! Tap any meal to see full details.`
        : "I couldn't find exact matches, but here are some popular choices:";

    return { content, meals: filteredMeals };
  };

  const handleSendMessage = (text?: string) => {
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

    setTimeout(() => {
      const { content, meals } = generateAIResponse(messageText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content,
        meals,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 800);
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-950 text-white">
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
                    : "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-white"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className="text-[10px] mt-1 text-white/60">
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
                {message.meals.map((meal) => (
                  <div
                    key={meal.id}
                    onClick={() => onMealSelect(meal)}
                    className="bg-slate-900/80 text-white rounded-2xl border border-slate-700 p-4 cursor-pointer hover:border-cyan-500/60 transition-all hover:shadow-lg hover:shadow-cyan-500/20 group"
                  >
                    <div className="flex gap-3">
                      <img
                        src={meal.image}
                        alt={meal.name}
                        className="size-20 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1 group-hover:text-cyan-300 transition-colors">
                          {meal.name}
                        </p>
                        <p className="text-slate-400 text-xs mb-2">
                          {meal.restaurant}
                        </p>
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
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="rounded-full h-7 text-xs whitespace-nowrap bg-slate-800 border-slate-600 text-slate-100 hover:border-cyan-500 hover:text-cyan-300 hover:bg-slate-900 transition-all"
              onClick={() => handleSendMessage(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>

      {/* Macro adjustments */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {macroAdjustments.map((adjustment, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="rounded-full h-7 text-xs whitespace-nowrap bg-slate-800 border-slate-600 text-slate-100 hover:border-cyan-500 hover:text-cyan-300 hover:bg-slate-900 transition-all"
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
      <div className="p-4 bg-gradient-to-r from-cyan-900 via-slate-950 to-blue-900 border-t border-slate-800">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AI to find meals, macros, or cravings..."
              className="rounded-full pr-10 py-5 bg-slate-900/90 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceInput}
              className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 ${
                isListening
                  ? "bg-pink-500/20 text-pink-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Mic className="size-4" />
            </Button>
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="rounded-full size-10 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/40 shrink-0 disabled:opacity-50"
          >
            <Send className="size-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
