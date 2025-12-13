"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Sparkles, Map } from "lucide-react";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/client";

type Props = {
  onComplete: () => void;
};

const TOTAL_STEPS = 3;

export function OnboardingFlow({ onComplete }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0); // Step 0 = Eat Anywhere, Step 1 = AI Menu Scraper, Step 2 = Location

  // Location state
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Progress dots component
  const ProgressDots = () => {
    return (
      <div className="flex gap-2 justify-center mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-12 rounded-full transition-all ${
              index === step
                ? index === 0
                  ? "bg-gradient-to-r from-teal-500 to-blue-500"
                  : index === 1
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : "bg-gradient-to-r from-green-500 to-emerald-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  // STEP 0: Eat Anywhere (First onboarding screen after account creation)
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
              <MapPin className="w-20 h-20 text-teal-500 relative" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">Eat Anywhere</h1>
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
          Whether you’re at a restaurant, in a new city, or eating out nearby, SeekEatz finds meals that fit your goals.
          </p>

          <ProgressDots />

          <div className="flex gap-3">
            <Button
              onClick={() => setStep(1)}
              className="h-14 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white shadow-lg shadow-teal-500/20 w-full text-lg"
            >
              Next
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: AI Menu Scraper
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse" />
              <Sparkles className="w-20 h-20 text-purple-500 relative" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">AI Menu Scraper</h1>
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
          Our AI scans restaurant menus and highlights the best meals for your calorie and macro goals.
          </p>

          <ProgressDots />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="h-14 rounded-full border-muted-foreground/20 text-foreground hover:bg-muted flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              className="h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/20 flex-[2] text-lg"
            >
              Next
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Location Permission (Last step before app access)
  const handleLocationRequest = async () => {
    setIsRequestingLocation(true);

    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Success - location granted
            console.log("Location granted:", position.coords);
            
            // Save location if needed (optional)
            // You can store lat/lng in Supabase or localStorage if needed
            
            // Complete onboarding and redirect
            await completeOnboarding();
          },
          async (error) => {
            // User denied or error occurred - still proceed
            console.log("Location denied or error:", error);
            
            // Complete onboarding anyway
            await completeOnboarding();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        // Geolocation not supported - proceed anyway
        console.log("Geolocation not supported");
        await completeOnboarding();
      }
    } catch (error) {
      console.error("Error requesting location:", error);
      // Still complete onboarding
      await completeOnboarding();
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleSkipLocation = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      // Verify user is still authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!user || userError) {
        console.error("User not authenticated after onboarding:", userError);
        // If somehow not authenticated, redirect to sign-in
        router.push("/auth/signin");
        return;
      }

      const now = Date.now();
      
      // Mark onboarding as complete in database
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            has_completed_onboarding: true,
            last_login: new Date(now).toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "id",
          });
      } catch (error) {
        console.warn("Could not update profile:", error);
      }

      // Set all localStorage flags to ensure app recognizes completion
      localStorage.setItem(`macroMatch_hasCompletedOnboarding_${user.id}`, "true");
      localStorage.setItem("macroMatch_completedOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
      localStorage.setItem("onboardingCompleted", "true");
      localStorage.setItem(`macroMatch_lastLogin_${user.id}`, now.toString());
      localStorage.setItem("macroMatch_lastLogin", now.toString());
      localStorage.removeItem("macroMatch_onboardingQuestionsComplete");
      
      // Clear any saved last screen so user always goes to chat first after onboarding
      localStorage.removeItem("seekeatz_current_screen");
      localStorage.removeItem("seekeatz_nav_history");

      // Wait a moment to ensure all state is saved
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify session one more time before redirecting
      const { data: { user: verifiedUser } } = await supabase.auth.getUser();
      
      if (!verifiedUser) {
        console.error("Session lost after onboarding completion");
        router.push("/auth/signin");
        return;
      }

      // Call onComplete callback
      onComplete();

      // Use window.location for a full page reload to ensure session is recognized
      // This ensures the app properly recognizes the authenticated state
      window.location.href = "/chat";
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Still try to redirect to chat - the app will handle auth check
      router.push("/chat");
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
              <Map className="w-20 h-20 text-green-500 relative" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">Use your location</h1>
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
          Let SeekEatz use your location to find nearby restaurants and recommend the best meals nearby.
          </p>

          <ProgressDots />

          <div className="space-y-3">
            <Button
              onClick={handleLocationRequest}
              disabled={isRequestingLocation}
              className="h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 w-full text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRequestingLocation ? "Requesting..." : "Allow Location"}
            </Button>

            <button
              onClick={handleSkipLocation}
              disabled={isRequestingLocation}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}