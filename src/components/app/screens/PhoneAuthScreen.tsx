import React, { useState } from "react";
import { motion } from "motion/react";
import { Heart, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { loginUser, type CurrentUser } from "@/lib/api";
import { toast } from "sonner";

interface PhoneAuthScreenProps {
  onSuccess: (user: CurrentUser) => void;
}

export function PhoneAuthScreen({ onSuccess }: PhoneAuthScreenProps) {
  const [selectedRole, setSelectedRole] = useState<"her" | "him">("her");
  const [email, setEmail] = useState("aditi@ourspace.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customEmailMode, setCustomEmailMode] = useState(false);

  const handleRoleSelect = (role: "her" | "him") => {
    setSelectedRole(role);
    if (!customEmailMode) {
      setEmail(role === "her" ? "aditi@ourspace.local" : "aman@ourspace.local");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(email.trim(), password.trim());
      toast.success(
        `Welcome to Our Space, ${res.user.name || (selectedRole === "her" ? "Aditi" : "Aman")}! 💕`,
      );
      onSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        toast.error("Couldn't connect to Our Space. Check your connection and try again.");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background px-4 py-8 font-sans text-foreground sm:px-6">
      {/* Background Ambience & Warm Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#E5A962]/20 via-[#E07A5F]/15 to-transparent blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.035] film-grain mix-blend-multiply pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto w-full max-w-md"
      >
        {/* Header Branding matching Website Theme */}
        <div className="mb-7 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.4rem] border border-accent/40 bg-accent/10 text-accent shadow-glow">
            <Heart className="h-8 w-8 fill-accent text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Our Space
          </h1>
          <p className="mt-2 text-sm font-serif italic text-muted-foreground">
            A private sanctuary for Aman &amp; Aditi
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-4 shadow-panel backdrop-blur-sm sm:p-6">
          {/* Profile Selector Cards */}
          <fieldset className="mb-5">
            <legend className="mb-3 w-full text-center text-xs font-bold uppercase tracking-[0.12em] text-accent">
              Who is logging in?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {/* Aditi Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect("her")}
                aria-pressed={selectedRole === "her"}
                className={`relative flex min-h-36 flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  selectedRole === "her"
                    ? "border-[#E07A5F] bg-[#E07A5F]/10 shadow-sm ring-2 ring-[#E07A5F]/25"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:border-[#E07A5F]/50 hover:bg-[#E07A5F]/5"
                }`}
              >
                {selectedRole === "her" && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#C9563E] text-white">
                    <Check aria-hidden="true" className="h-3 w-3" />
                  </span>
                )}
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#E07A5F] to-[#f49c82] font-display text-lg font-bold text-white shadow-sm">
                  A
                </div>
                <span className="font-display text-sm font-bold text-foreground">Aditi 💖</span>
                <span className="mt-1 text-xs text-muted-foreground">Girlfriend</span>
              </button>

              {/* Aman Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect("him")}
                aria-pressed={selectedRole === "him"}
                className={`relative flex min-h-36 flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  selectedRole === "him"
                    ? "border-[#D69A4B] bg-[#E5A962]/15 shadow-sm ring-2 ring-[#D69A4B]/30"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:border-[#D69A4B]/60 hover:bg-[#E5A962]/5"
                }`}
              >
                {selectedRole === "him" && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#A56C22] text-white">
                    <Check aria-hidden="true" className="h-3 w-3" />
                  </span>
                )}
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#E5A962] to-[#f2c695] font-display text-lg font-bold text-foreground shadow-sm">
                  A
                </div>
                <span className="font-display text-sm font-bold text-foreground">Aman 💙</span>
                <span className="mt-1 text-xs text-muted-foreground">Boyfriend</span>
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
              Signing in as{" "}
              <span className="font-semibold text-foreground">
                {selectedRole === "her" ? "Aditi" : "Aman"}
              </span>
            </p>
          </fieldset>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {customEmailMode && (
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-semibold text-foreground"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ourspace.local"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/80 focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm text-foreground shadow-sm outline-none transition-shadow placeholder:text-muted-foreground/80 focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              aria-live="polite"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Entering Sanctuary...</span>
                </span>
              ) : (
                <>
                  <span>Enter Our Space as {selectedRole === "her" ? "Aditi" : "Aman"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer toggles */}
          <div className="mt-5 flex flex-col items-center gap-3 border-t border-border/60 pt-4 text-center">
            <button
              type="button"
              onClick={() => setCustomEmailMode(!customEmailMode)}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {customEmailMode ? "← Use Quick Profile Switcher" : "Custom email login →"}
            </button>

            <a
              href="/"
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>← Return to Keepsake Website</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
