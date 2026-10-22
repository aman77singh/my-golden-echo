import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Lock, Fingerprint, Delete } from "lucide-react";
import {
  isLockEnabled,
  getStoredPin,
  isBiometricEnabled,
  authenticateBiometric,
} from "@/lib/security";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";

export function PrivacyLockOverlay({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = React.useState<boolean>(() => isLockEnabled());
  const [enteredPin, setEnteredPin] = React.useState<string>("");
  const [errorShake, setErrorShake] = React.useState<boolean>(false);

  const biometricActive = isBiometricEnabled();
  const storedPin = getStoredPin();

  // Try biometric unlock automatically on mount if enabled
  React.useEffect(() => {
    if (isLocked && biometricActive) {
      authenticateBiometric().then((success) => {
        if (success) {
          triggerHaptic("success");
          setIsLocked(false);
        }
      });
    }
  }, [isLocked, biometricActive]);

  const handleDigit = (digit: string) => {
    triggerHaptic("selection");
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);

      if (nextPin.length === 4) {
        if (nextPin === storedPin) {
          triggerHaptic("success");
          setIsLocked(false);
          setEnteredPin("");
        } else {
          triggerHaptic("warning");
          setErrorShake(true);
          setTimeout(() => {
            setErrorShake(false);
            setEnteredPin("");
          }, 500);
          toast.error("Incorrect passcode.");
        }
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic("light");
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleBiometricClick = async () => {
    triggerHaptic("selection");
    const success = await authenticateBiometric();
    if (success) {
      triggerHaptic("success");
      setIsLocked(false);
    } else {
      toast.error("Biometric verification failed.");
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0d0d12]/98 p-6 backdrop-blur-3xl text-foreground select-none">
      {/* Top Branding */}
      <div className="flex flex-col items-center gap-2 pt-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-[#0d0d12] shadow-lg shadow-accent/30">
          <Heart className="h-6 w-6 fill-current" />
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Our Space
        </h1>
        <p className="text-xs text-muted-foreground">Sanctuary Locked</p>
      </div>

      {/* PIN Dots */}
      <motion.div
        animate={errorShake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 my-6"
      >
        {[0, 1, 2, 3].map((index) => {
          const filled = enteredPin.length > index;
          return (
            <div
              key={index}
              className={`h-4 w-4 rounded-full border-2 transition-all ${
                filled
                  ? "border-accent bg-accent shadow-sm shadow-accent/50 scale-110"
                  : "border-white/20 bg-white/5"
              }`}
            />
          );
        })}
      </motion.div>

      {/* Keypad */}
      <div className="w-full max-w-xs space-y-3 pb-8">
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-16 w-full items-center justify-center rounded-2xl border border-white/5 bg-white/[0.04] text-xl font-medium text-foreground transition-all hover:bg-white/10 active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Biometric Icon */}
          <div className="flex items-center justify-center">
            {biometricActive ? (
              <button
                type="button"
                onClick={handleBiometricClick}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent transition-transform active:scale-90"
                aria-label="Unlock with biometrics"
              >
                <Fingerprint className="h-7 w-7" />
              </button>
            ) : null}
          </div>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="flex h-16 w-full items-center justify-center rounded-2xl border border-white/5 bg-white/[0.04] text-xl font-medium text-foreground transition-all hover:bg-white/10 active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <div className="flex items-center justify-center">
            {enteredPin.length > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.04] text-muted-foreground transition-transform active:scale-90"
                aria-label="Delete last digit"
              >
                <Delete className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
