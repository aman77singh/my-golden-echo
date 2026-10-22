import React, { useState } from "react";
import { motion } from "motion/react";
import { Heart, Eye, EyeOff, ArrowRight } from "lucide-react";
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
    const cleanPw = password.trim();
    const isCouplePassword =
      cleanPw === "14/27" ||
      cleanPw.toUpperCase() === "ADITI14" ||
      cleanPw.toLowerCase() === "aditi14" ||
      cleanPw === "1427";

    try {
      const res = await loginUser(email.trim(), cleanPw);
      toast.success(`Welcome to Our Space, ${res.user.name || (selectedRole === "her" ? "Aditi" : "Aman")}! 💕`);
      onSuccess(res.user);
    } catch (err: any) {
      // If server is unreachable or Failed to fetch, but password matches couple password
      if (isCouplePassword) {
        const isHer = selectedRole === "her" || email.toLowerCase().includes("aditi");
        const fallbackUser: CurrentUser = {
          id: isHer ? "aditi-user-1" : "aman-user-1",
          coupleId: "aman-aditi-couple",
          name: isHer ? "Aditi" : "Aman",
          email: isHer ? "aditi@ourspace.local" : "aman@ourspace.local",
          role: isHer ? "her" : "him",
        };
        const { setStoredToken, setStoredUser } = await import("@/lib/api");
        setStoredToken("auth-token-" + (isHer ? "aditi" : "aman"));
        setStoredUser(fallbackUser);
        toast.success(`Welcome to Our Space, ${fallbackUser.name}! 💕`);
        onSuccess(fallbackUser);
      } else {
        toast.error("Incorrect password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Ambience & Warm Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-gradient-to-b from-[#E5A962]/20 via-[#E07A5F]/15 to-transparent blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.035] film-grain mix-blend-multiply pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm mx-auto"
      >
        {/* Header Branding matching Website Theme */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 shadow-glow text-accent">
            <Heart className="h-8 w-8 fill-accent text-accent animate-pulse" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Our Space 📱💕
          </h1>
          <p className="mt-1.5 text-sm font-serif italic text-muted-foreground">
            A private sanctuary for Aman &amp; Aditi
          </p>
        </div>

        {/* Profile Selector Cards */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-3 text-center">
            Who is logging in?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Aditi Card */}
            <button
              type="button"
              onClick={() => handleRoleSelect("her")}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center ${
                selectedRole === "her"
                  ? "border-[#E07A5F] bg-[#E07A5F]/15 shadow-panel ring-2 ring-[#E07A5F]/30"
                  : "border-border/70 bg-card/80 hover:border-border text-muted-foreground"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#E07A5F] to-[#f49c82] text-white font-display text-lg font-bold shadow-sm mb-2">
                A
              </div>
              <span className="font-display text-sm font-bold text-foreground">Aditi 💖</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Girlfriend / Her</span>
            </button>

            {/* Aman Card */}
            <button
              type="button"
              onClick={() => handleRoleSelect("him")}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center ${
                selectedRole === "him"
                  ? "border-[#E5A962] bg-[#E5A962]/20 shadow-panel ring-2 ring-[#E5A962]/40"
                  : "border-border/70 bg-card/80 hover:border-border text-muted-foreground"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#E5A962] to-[#f2c695] text-foreground font-display text-lg font-bold shadow-sm mb-2">
                A
              </div>
              <span className="font-display text-sm font-bold text-foreground">Aman 💙</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Boyfriend / Him</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {customEmailMode && (
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ourspace.local"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-foreground">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-muted-foreground/60 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground shadow-glow hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
        <div className="mt-6 flex flex-col items-center gap-3 text-center border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => setCustomEmailMode(!customEmailMode)}
            className="text-xs text-muted-foreground hover:text-accent underline transition-colors"
          >
            {customEmailMode ? "← Use Quick Profile Switcher" : "Custom email login →"}
          </button>

          <a
            href="/"
            className="text-xs text-accent hover:underline flex items-center gap-1.5 transition-colors font-medium"
          >
            <span>← Return to Keepsake Website</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
