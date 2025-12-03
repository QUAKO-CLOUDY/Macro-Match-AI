"use client";

import React, { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";

import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";

type Errors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type OnboardingCreateAccountStepProps = {
  onComplete: (data: { email: string; password: string }) => void;
  isSubmitting?: boolean;
};

export function OnboardingCreateAccountStep({
  onComplete,
  isSubmitting = false,
}: OnboardingCreateAccountStepProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = () => {
    const newErrors: Errors = {};

    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = () => {
    if (!validate()) return;
    onComplete({ email, password });
  };

  const handleConfirmKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleComplete();
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        {/* AI Badge */}
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl mb-6 shadow-lg shadow-cyan-500/50"
        >
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
        </motion.div>

        <h1
          className="text-4xl mb-4 leading-tight tracking-tight text-white"
          style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
        >
          Almost there!
        </h1>

        <p className="text-gray-400 text-lg">
          Create your account to start finding meals that match your goals.
        </p>
      </motion.div>

      {/* Auth Form Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl"
      >
        <div className="space-y-5">
          {/* Email Input */}
          <div>
            <Label className="text-gray-300 mb-2 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`h-14 pl-12 rounded-2xl bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-sm mt-2">{errors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <Label className="text-gray-300 mb-2 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`h-14 pl-12 pr-12 rounded-2xl bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 ${
                  errors.password ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-2">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <Label className="text-gray-300 mb-2 block">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }}
                onKeyDown={handleConfirmKeyDown}
                className={`h-14 pl-12 pr-12 rounded-2xl bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-2">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleComplete}
          disabled={isSubmitting}
          className="h-14 rounded-full w-full mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            boxShadow:
              "0 8px 24px rgba(6, 182, 212, 0.4), 0 4px 12px rgba(59, 130, 246, 0.3)",
          }}
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
          {!isSubmitting && <ChevronRight className="ml-2 w-5 h-5" />}
        </Button>

        {/* Privacy Notice */}
        <p className="text-gray-500 text-xs text-center mt-6 leading-relaxed">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy. Your data is encrypted and secure.
        </p>
      </motion.div>

      {/* Progress Dots */}
      <div className="flex gap-2 justify-center mt-8">
        <div className="h-2 w-2 bg-gray-700 rounded-full" />
        <div className="h-2 w-2 bg-gray-700 rounded-full" />
        <div className="h-2 w-2 bg-gray-700 rounded-full" />
        <div className="h-2 w-2 bg-gray-700 rounded-full" />
        <div className="h-2 w-2 bg-gray-700 rounded-full" />
        <div className="h-2 w-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" />
      </div>
    </div>
  );
}
