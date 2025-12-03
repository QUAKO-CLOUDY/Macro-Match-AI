"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Returning user - update lastLogin and go directly to app
        const now = Date.now();
        
        // Check if there's a pending onboarding profile (from completing onboarding before signing in)
        const pendingProfile = typeof window !== 'undefined' 
          ? localStorage.getItem("pendingOnboardingProfile")
          : null;
        
        let profile = null;
        if (pendingProfile) {
          try {
            profile = JSON.parse(pendingProfile);
            localStorage.removeItem("pendingOnboardingProfile");
          } catch (e) {
            console.warn("Failed to parse pending onboarding profile:", e);
          }
        }
        
        // Update lastLogin and save profile if exists
        try {
          await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              last_login: new Date(now).toISOString(),
              has_completed_onboarding: profile ? true : undefined,
              user_profile: profile || undefined,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "id",
            });
        } catch (error) {
          console.warn("Could not update profile in profiles table:", error);
        }

        // Update localStorage
        localStorage.setItem(`macroMatch_lastLogin_${data.user.id}`, now.toString());
        localStorage.setItem("macroMatch_lastLogin", now.toString());
        
        if (profile) {
          localStorage.setItem(`macroMatch_hasCompletedOnboarding_${data.user.id}`, "true");
          localStorage.setItem("hasCompletedOnboarding", "true");
          localStorage.setItem("userProfile", JSON.stringify(profile));
          // Clear the questions-complete flag since onboarding is now fully complete
          localStorage.removeItem("macroMatch_onboardingQuestionsComplete");
        }

        // Go directly to AI chatbot (skip onboarding for returning users)
        router.push("/chat");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue to SeekEatz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-gray-300 mb-2 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 pl-12 rounded-2xl bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 pl-12 pr-12 rounded-2xl bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-14 rounded-full w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-gray-500 text-sm text-center mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => router.push("/auth/signup")}
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

