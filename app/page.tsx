'use client';

import { useState, useEffect } from 'react';
import { MainApp } from './components/MainApp';
import { SimplifiedOnboarding } from './components/SimplifiedOnboarding';
import type { UserProfile } from './types';

export default function Home() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hasCompletedOnboarding');
      const profile = localStorage.getItem('userProfile');
      
      if (saved === 'true' && profile) {
        try {
          setUserProfile(JSON.parse(profile));
          setHasCompletedOnboarding(true);
        } catch (e) {
          console.error('Failed to parse userProfile:', e);
          setHasCompletedOnboarding(false);
        }
      } else {
        setHasCompletedOnboarding(false);
      }
    }
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setHasCompletedOnboarding(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasCompletedOnboarding', 'true');
      localStorage.setItem('userProfile', JSON.stringify(profile));
    }
  };

  // Show loading state while checking onboarding
  if (hasCompletedOnboarding === null) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-cyan-400 text-lg">Loading...</div>
      </div>
    );
  }

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <SimplifiedOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Show main app
  return <MainApp />;
}