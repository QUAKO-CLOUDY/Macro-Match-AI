"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { OnboardingFlow } from "../components/OnboardingFlow";

export default function OnboardingPage() {
  const router = useRouter();

  // Safety check: If user has already completed onboarding, redirect to chat
  // In development, skip this check to allow testing onboarding flow
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // In development, always allow onboarding (don't redirect)
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        return;
      }

      // Check localStorage flag first (fastest check)
      if (typeof window !== "undefined") {
        const onboardingCompleted = localStorage.getItem("onboardingCompleted") === "true";
        if (!isDev && onboardingCompleted) {
          router.replace("/chat");
          return;
        }
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if onboarding is already complete in Supabase
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("has_completed_onboarding")
            .eq("id", user.id)
            .single();

          if (!isDev && profile?.has_completed_onboarding) {
            // Already completed - redirect to AI chatbot
            router.replace("/chat");
            return;
          }
        } catch (error) {
          // Profile might not exist yet, or table might not exist
          // Check localStorage as fallback
          if (typeof window !== "undefined") {
            const localStorageFlag = localStorage.getItem(`macroMatch_hasCompletedOnboarding_${user.id}`);
            if (!isDev && localStorageFlag === "true") {
              // Completed according to localStorage - redirect to AI chatbot
              router.replace("/chat");
              return;
            }
          }
        }
      }
    };

    checkOnboardingStatus();
  }, [router]);

  const handleComplete = () => {
    // OnboardingFlow handles completion and redirect internally
    // This is just a placeholder callback
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingFlow onComplete={handleComplete} />
    </div>
  );
}

