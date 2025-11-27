'use client';

import { useState, useEffect } from 'react';
import { Navigation, type Screen } from './Navigation';
import { HomeScreen } from './HomeScreen';
import { LogScreen } from './LogScreen';
import { Favorites } from './Favorites';
import { Settings } from './Settings';
import { AIChat } from './AIChat';
import { MealDetail } from './MealDetail';
import { SearchScreen } from './SearchScreen';
import type { UserProfile, Meal } from '../types';
import type { LoggedMeal } from './LogScreen';

type View = 'main' | 'meal-detail';

export function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentView, setCurrentView] = useState<View>('main');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [favoriteMeals, setFavoriteMeals] = useState<string[]>([]);
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);

  // Load user profile from localStorage or use defaults
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse userProfile:', e);
        }
      }
    }
    // Default profile
    return {
      goal: 'maintain',
      dietaryType: 'None',
      allergens: [],
      calorieTarget: 2200,
      proteinTarget: 150,
      carbsTarget: 200,
      fatsTarget: 70,
      name: 'Alex',
    };
  });

  // Save user profile to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setCurrentView('main');
    setSelectedMeal(null);
  };

  const handleMealSelect = (meal: Meal) => {
    setSelectedMeal(meal);
    setCurrentView('meal-detail');
  };

  const handleBack = () => {
    if (currentView === 'meal-detail') {
      setCurrentView('main');
      setSelectedMeal(null);
    } else if (currentScreen === 'search') {
      handleNavigate('home');
    }
  };

  const handleToggleFavorite = (mealId: string) => {
    setFavoriteMeals((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleLogMeal = (meal: Meal) => {
    const loggedMeal: LoggedMeal = {
      id: `log-${Date.now()}-${Math.random()}`,
      meal,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };
    setLoggedMeals((prev) => [...prev, loggedMeal]);
    setCurrentView('main');
    setSelectedMeal(null);
    handleNavigate('log');
  };

  const handleRemoveMeal = (id: string) => {
    setLoggedMeals((prev) => prev.filter((meal) => meal.id !== id));
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  // Show meal detail if a meal is selected
  if (currentView === 'meal-detail' && selectedMeal) {
    return (
      <div className="flex flex-col h-screen bg-[#020617]">
        <MealDetail
          meal={selectedMeal}
          isFavorite={favoriteMeals.includes(selectedMeal.id)}
          onToggleFavorite={() => handleToggleFavorite(selectedMeal.id)}
          onBack={handleBack}
          onLogMeal={() => handleLogMeal(selectedMeal)}
        />
      </div>
    );
  }

  // Show search screen (full screen, no navigation)
  if (currentScreen === 'search') {
    return (
      <div className="flex flex-col h-screen bg-slate-950">
        <SearchScreen
          onMealSelect={handleMealSelect}
          onBack={handleBack}
        />
      </div>
    );
  }

  // Main app with navigation
  return (
    <div className="flex flex-col h-screen bg-[#020617] overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {currentScreen === 'home' && (
          <HomeScreen
            userProfile={userProfile}
            onMealSelect={handleMealSelect}
            favoriteMeals={favoriteMeals}
            onSearch={() => handleNavigate('search')}
          />
        )}
        {currentScreen === 'log' && (
          <LogScreen
            userProfile={userProfile}
            loggedMeals={loggedMeals}
            onRemoveMeal={handleRemoveMeal}
          />
        )}
        {currentScreen === 'chat' && (
          <AIChat
            userProfile={userProfile}
            onMealSelect={handleMealSelect}
          />
        )}
        {currentScreen === 'favorites' && (
          <Favorites
            favoriteMeals={favoriteMeals}
            onMealSelect={handleMealSelect}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        {currentScreen === 'settings' && (
          <Settings
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </div>
      
      <Navigation
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

