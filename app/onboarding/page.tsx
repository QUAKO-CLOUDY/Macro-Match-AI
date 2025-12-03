"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { OnboardingFlow } from "../components/OnboardingFlow";
import type { UserProfile } from "../types";

export default function OnboardingPage() {
  const router = useRouter();

  // Safety check: If user has already completed onboarding or questions, redirect appropriately
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if onboarding is already complete
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("has_completed_onboarding")
            .eq("id", user.id)
            .single();

          if (profile?.has_completed_onboarding) {
            // Already completed - redirect to AI chatbot
            router.replace("/chat");
            return;
          }
        } catch (error) {
          // Profile might not exist yet, or table might not exist
          // Check localStorage as fallback
          const localStorageFlag = localStorage.getItem(`macroMatch_hasCompletedOnboarding_${user.id}`);
          if (localStorageFlag === "true") {
            // Completed according to localStorage - redirect to AI chatbot
            router.replace("/chat");
            return;
          }
        }
      } else {
        // Not authenticated - check if questions are already complete
        const questionsComplete = localStorage.getItem("macroMatch_onboardingQuestionsComplete") === "true";
        if (questionsComplete) {
          // Questions are complete but no account - redirect to signup
          router.replace("/auth/signup");
          return;
        }
      }
    };

    checkOnboardingStatus();
  }, [router]);

  const handleComplete = async (profile: UserProfile) => {
    // This will be handled by OnboardingFlow which sets the completion flag
    // and redirects to /home
  };

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <OnboardingFlow onComplete={handleComplete} />
    </div>
  );
}

