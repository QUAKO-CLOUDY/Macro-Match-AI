"use client";

import { Home, Activity, Sparkles, Heart, Settings as SettingsIcon } from "lucide-react";

export type Screen = "home" | "log" | "chat" | "favorites" | "settings" | "search";

type Props = {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function Navigation({ currentScreen, onNavigate }: Props) {
  const isAIChatActive = currentScreen === "chat";

  return (
    <div className="flex items-end justify-around px-2 pb-3 pt-1 relative bg-gray-900 border-t border-gray-800">
      {/* Home */}
      <button
        onClick={() => onNavigate("home")}
        className="flex flex-col items-center gap-1 py-2 px-3 transition-all flex-1"
      >
        <div
          className={`p-2 rounded-xl ${
            currentScreen === "home" ? "bg-gray-800" : ""
          }`}
        >
          <Home
            className={`w-5 h-5 ${
              currentScreen === "home" ? "text-cyan-400" : "text-gray-500"
            }`}
          />
        </div>
        <span
          className={`text-[11px] ${
            currentScreen === "home" ? "text-cyan-400" : "text-gray-600"
          }`}
        >
          Home
        </span>
      </button>

      {/* Log */}
      <button
        onClick={() => onNavigate("log")}
        className="flex flex-col items-center gap-1 py-2 px-3 transition-all flex-1"
      >
        <div
          className={`p-2 rounded-xl ${
            currentScreen === "log" ? "bg-gray-800" : ""
          }`}
        >
          <Activity
            className={`w-5 h-5 ${
              currentScreen === "log" ? "text-green-400" : "text-gray-500"
            }`}
          />
        </div>
        <span
          className={`text-[11px] ${
            currentScreen === "log" ? "text-green-400" : "text-gray-600"
          }`}
        >
          Log
        </span>
      </button>

      {/* Center AI Chat FAB */}
      <div className="flex flex-col items-center -mt-6 flex-1">
        <button
          onClick={() => onNavigate("chat")}
          className="relative group mb-1"
        >
          {/* Cyan/blue glow layers */}
          <div
            className="absolute inset-0 rounded-full opacity-60 group-hover:opacity-80 transition-opacity"
            style={{
              background:
                "radial-gradient(circle, rgba(6,182,212,0.6) 0%, rgba(59,130,246,0.4) 50%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(1.6)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-70 group-hover:opacity-90 transition-opacity"
            style={{
              boxShadow:
                "0 0 30px 6px rgba(6,182,212,0.6), 0 0 60px 12px rgba(59,130,246,0.4)",
            }}
          />

          {/* Main FAB */}
          <div
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isAIChatActive ? "scale-110" : "scale-100"
            }`}
            style={{
              background:
                "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              boxShadow:
                "0 6px 24px rgba(6,182,212,0.5), 0 3px 12px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <Sparkles className="w-7 h-7 text-white" strokeWidth={2.5} />

            {/* Active ring pulse */}
            {isAIChatActive && (
              <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping" />
            )}
          </div>
        </button>
        <span
          className={`text-[11px] font-medium ${
            isAIChatActive ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          AI Chat
        </span>
      </div>

      {/* Favorites */}
      <button
        onClick={() => onNavigate("favorites")}
        className="flex flex-col items-center gap-1 py-2 px-3 transition-all flex-1"
      >
        <div
          className={`p-2 rounded-xl ${
            currentScreen === "favorites" ? "bg-gray-800" : ""
          }`}
        >
          <Heart
            className={`w-5 h-5 ${
              currentScreen === "favorites"
                ? "text-pink-400"
                : "text-gray-500"
            }`}
          />
        </div>
        <span
          className={`text-[11px] ${
            currentScreen === "favorites" ? "text-pink-400" : "text-gray-600"
          }`}
        >
          Favorites
        </span>
      </button>

      {/* Settings */}
      <button
        onClick={() => onNavigate("settings")}
        className="flex flex-col items-center gap-1 py-2 px-3 transition-all flex-1"
      >
        <div
          className={`p-2 rounded-xl ${
            currentScreen === "settings" ? "bg-gray-800" : ""
          }`}
        >
          <SettingsIcon
            className={`w-5 h-5 ${
              currentScreen === "settings"
                ? "text-gray-300"
                : "text-gray-500"
            }`}
          />
        </div>
        <span
          className={`text-[11px] ${
            currentScreen === "settings" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Settings
        </span>
      </button>
    </div>
  );
}
