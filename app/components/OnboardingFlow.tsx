"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Sparkles, Mail, Lock, Eye, EyeOff, Map } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SeekEatzLogo } from "./MacroMatchLogo";
import { createClient } from "@/utils/supabase/client";

type Props = {
  onComplete: () => void;
};

const TOTAL_STEPS = 5;

export function OnboardingFlow({ onComplete }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);

  // Auth state (Step 3)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignInMode, setIsSignInMode] = useState(false);

  // Location state (Step 4)
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
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                  : index === 1
                  ? "bg-gradient-to-r from-teal-500 to-blue-500"
                  : index === 2
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : index === 3
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                  : "bg-gradient-to-r from-green-500 to-emerald-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  // STEP 0: Welcome Screen
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
              <SeekEatzLogo size={120} className="relative" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">Welcome to SeekEatz</h1>
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
            Scan menus, find better meals, and get smart suggestions in seconds.
          </p>

          <ProgressDots />

          <Button
            onClick={() => setStep(1)}
            className="h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20 w-full text-lg"
          >
            Get Started
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // STEP 1: Eat Anywhere
  if (step === 1) {
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
            Whether you're at a restaurant, grocery store, or food court, SeekEatz finds meals that fit your goals.
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
              className="h-14 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white shadow-lg shadow-teal-500/20 flex-[2] text-lg"
            >
              Next
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: AI Menu Scraper
  if (step === 2) {
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
            Our AI scans restaurant menus and grocery stores to find meals that match your exact calorie and macro needs.
          </p>

          <ProgressDots />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="h-14 rounded-full border-muted-foreground/20 text-foreground hover:bg-muted flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
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

  // STEP 3: Auth Screen (Create Account / Sign In)
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!isSignInMode && password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignInMode) {
        // Sign in flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setAuthError(signInError.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Update lastLogin
          const now = Date.now();
          try {
            await supabase
              .from("profiles")
              .upsert({
                id: data.user.id,
                last_login: new Date(now).toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "id",
              });
          } catch (error) {
            console.warn("Could not update profile:", error);
          }

          localStorage.setItem(`macroMatch_lastLogin_${data.user.id}`, now.toString());
          localStorage.setItem("macroMatch_lastLogin", now.toString());

          // Proceed to location step
          setStep(4);
          setIsLoading(false);
          return;
        }
      } else {
        // Sign up flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setIsLoading(false);
          const errorMessage = signUpError.message.toLowerCase();
          if (
            errorMessage.includes("already registered") ||
            errorMessage.includes("user already exists") ||
            errorMessage.includes("email address is already registered") ||
            errorMessage.includes("already been registered")
          ) {
            setAuthError("An account with this email already exists. Please sign in instead.");
            return;
          }
          setAuthError(signUpError.message);
          return;
        }

        if (signUpData.user) {
          const now = Date.now();
          
          // Mark onboarding questions as complete
          localStorage.setItem("macroMatch_onboardingQuestionsComplete", "true");

          // Save initial profile
          try {
            await supabase
              .from("profiles")
              .upsert({
                id: signUpData.user.id,
                has_completed_onboarding: false, // Will be true after location step
                last_login: new Date(now).toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "id",
              });
          } catch (error) {
            console.warn("Could not save profile:", error);
          }

          localStorage.setItem(`macroMatch_lastLogin_${signUpData.user.id}`, now.toString());
          localStorage.setItem("macroMatch_lastLogin", now.toString());

          // Proceed to location step
          setStep(4);
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || "Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Almost there!</h1>
            <p className="text-muted-foreground">
              Create your account to save favorites and sync your meals.
            </p>
          </div>

          <ProgressDots />

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <Label className="text-foreground mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 pl-12 rounded-2xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignInMode ? "Enter your password" : "Minimum 8 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20"
                  autoComplete={isSignInMode ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isSignInMode && (
              <div>
                <Label className="text-foreground mb-2 block">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {authError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                <div className="mb-2">{authError}</div>
                {(authError.includes("already exists") || authError.includes("already registered")) && (
                  <button
                    type="button"
                    onClick={() => setIsSignInMode(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-medium underline mt-2"
                  >
                    Sign in instead →
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="h-14 rounded-full border-muted-foreground/20 text-foreground hover:bg-muted flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 flex-[2] text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? isSignInMode
                    ? "Signing in..."
                    : "Creating Account..."
                  : isSignInMode
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </div>
          </form>

          <p className="text-muted-foreground text-sm text-center mt-6">
            {isSignInMode ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignInMode(false);
                    setAuthError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignInMode(true);
                    setAuthError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // STEP 4: Location Permission
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const now = Date.now();
        
        // Mark onboarding as complete
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

        // Set localStorage flags
        localStorage.setItem(`macroMatch_hasCompletedOnboarding_${user.id}`, "true");
        localStorage.setItem("macroMatch_completedOnboarding", "true");
        localStorage.setItem("hasCompletedOnboarding", "true");
        localStorage.setItem(`macroMatch_lastLogin_${user.id}`, now.toString());
        localStorage.setItem("macroMatch_lastLogin", now.toString());
        localStorage.removeItem("macroMatch_onboardingQuestionsComplete");
      }

      // Set general onboarding completed flag
      localStorage.setItem("onboardingCompleted", "true");

      // Small delay to ensure state is saved
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Redirect to chat
      onComplete();
      router.push("/chat");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Still try to redirect
      router.push("/chat");
    }
  };

  if (step === 4) {
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
            Let SeekEatz use your location to find nearby restaurants and grocery options.
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