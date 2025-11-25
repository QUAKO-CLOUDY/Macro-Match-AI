'use client';

import { useState } from 'react';

import { WelcomeScreenV2 } from './components/WelcomeScreenV2';
import { MicroOnboarding } from './components/MicroOnboarding';
import { OnboardingFlow } from './components/OnboardingFlow';
import { HomeScreen } from './components/HomeScreen';
import { MealDetail } from './components/MealDetail';
import { AIChat } from './components/AIChat';
import { Favorites } from './components/Favorites';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';
import { ThemeProvider } from './contexts/ThemeContext';

import type { UserProfile, Meal } from './types';

type Screen = 'home' | 'log' | 'chat' | 'favorites' | 'settings';

// Simple placeholder Log screen for the bottom “Log” tab
function LogScreen() {
  return (
    <div className="flex-1 flex flex-col h-full w-full bg-gray-950 overflow-hidden">
      <div className="px-6 pt-6 pb-10">
        <h1 className="text-white text-lg font-semibold mb-2">Daily Log</h1>
        <p className="text-gray-400 text-sm">
          This is a placeholder for your log screen. We’ll wire in your Figma
          design here next.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showMicroOnboarding, setShowMicroOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [favoriteMeals, setFavoriteMeals] = useState<string[]>([]);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setHasCompletedOnboarding(true);
    // Go straight to AI Chat after onboarding
    setCurrentScreen('chat');
  };

  const toggleFavorite = (mealId: string) => {
    setFavoriteMeals(prev =>
      prev.includes(mealId)
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    );
  };

  const logMeal = (meal: Meal) => {
    // Placeholder – you can hook this to Supabase later
    console.log('Logged meal:', meal);
  };

  // -------- FULL-SCREEN STATES (welcome / onboarding / detail) --------

  if (showWelcome) {
    return (
      <WelcomeScreenV2
        onGetStarted={() => {
          setShowWelcome(false);
          setShowMicroOnboarding(true);
        }}
      />
    );
  }

  if (showMicroOnboarding) {
    return <MicroOnboarding onComplete={() => setShowMicroOnboarding(false)} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (selectedMeal) {
    return (
      <MealDetail
        meal={selectedMeal}
        isFavorite={favoriteMeals.includes(selectedMeal.id)}
        onToggleFavorite={() => toggleFavorite(selectedMeal.id)}
        onBack={() => setSelectedMeal(null)}
        onLogMeal={() => {
          logMeal(selectedMeal);
          setSelectedMeal(null);
        }}
      />
    );
  }

  // -------- MAIN APP LAYOUT --------

  return (
    <ThemeProvider>
      <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scrollbar-hide w-full max-w-md mx-auto bg-gray-950 border-x border-gray-900">
          {/* HOME */}
          {userProfile && currentScreen === 'home' && (
            <HomeScreen
              userProfile={userProfile}
              onMealSelect={setSelectedMeal}
              favoriteMeals={favoriteMeals}
            />
          )}

          {/* LOG (placeholder for now) */}
          {userProfile && currentScreen === 'log' && <LogScreen />}

          {/* AI CHAT */}
          {userProfile && currentScreen === 'chat' && (
            <AIChat userProfile={userProfile} onMealSelect={setSelectedMeal} />
          )}

          {/* FAVORITES */}
          {currentScreen === 'favorites' && (
            <Favorites
              favoriteMeals={favoriteMeals}
              onMealSelect={setSelectedMeal}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* SETTINGS */}
          {userProfile && currentScreen === 'settings' && (
            <Settings userProfile={userProfile} onUpdateProfile={setUserProfile} />
          )}
        </div>

        {/* BOTTOM NAV */}
        <div className="w-full max-w-md mx-auto bg-gray-900 border-t border-gray-800 z-50">
          <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        </div>
      </div>
    </ThemeProvider>
  );
}
