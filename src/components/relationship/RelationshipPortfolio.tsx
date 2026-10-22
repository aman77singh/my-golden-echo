"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Menu,
  Music2,
  Pause,
  Play,
  ShieldAlert,
  Siren,
  SkipBack,
  SkipForward,
  Skull,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { relationshipContent as content } from "@/content/relationship";

export const requiredSections = ["timeline", "photos", "apologies", "thoughts", "music", "letter"];

const navItems = [
  { path: "/", id: "home", label: "Home / Us" },
  { path: "/timeline", id: "timeline", label: "Our Timeline" },
  { path: "/photos", id: "photos", label: "Photo Dump" },
  { path: "/apologies", id: "apologies", label: "My Apologies" },
  { path: "/thoughts", id: "thoughts", label: "Random Thoughts" },
  { path: "/music", id: "music", label: "Music" },
  { path: "/letter", id: "letter", label: "A Letter To You" },
  { path: "/secret", id: "bonus", label: "???" },
];

const stars = Array.from({ length: 54 }, (_, index) => ({
  x: (index * 37 + 11) % 100,
  y: (index * 61 + 7) % 100,
  r: 0.5 + ((index * 13) % 14) / 10,
  delay: (index % 9) * 0.37,
}));

function formatTogether(since: string) {
  const start = new Date(since);
  const now = new Date();
  const totalMs = Math.max(0, now.getTime() - start.getTime());
  const totalDays = Math.floor(totalMs / 86_400_000);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  anniversary.setMonth(start.getMonth() + months);
  const elapsedAfterMonths = Math.max(0, now.getTime() - anniversary.getTime());
  const days = Math.floor(elapsedAfterMonths / 86_400_000);
  const hours = Math.floor((totalMs / 3_600_000) % 24);
  const minutes = Math.floor((totalMs / 60_000) % 60);
  const seconds = Math.floor((totalMs / 1_000) % 60);
  return { years, months, days, hours, minutes, seconds, totalDays };
}

export function TimeTogether() {
  const [time, setTime] = useState(() => formatTogether(content.couple.togetherSince));
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const tick = () => {
      const next = formatTogether(content.couple.togetherSince);
      setTime(next);
      const key = `relationship-milestone-${next.totalDays}`;
      const isMilestone = next.totalDays > 0 && (next.totalDays % 100 === 0 || (next.months === 0 && next.days === 0));
      if (typeof window !== "undefined" && isMilestone && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "seen");
        setBurst(true);
        window.setTimeout(() => setBurst(false), 2600);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const units = [[time.years, "years"], [time.months, "months"], [time.days, "days"], [time.hours, "hours"], [time.minutes, "minutes"], [time.seconds, "seconds"]] as const;
  return (
    <div className="relative mt-8 sm:mt-10">
      <p className="mb-4 font-script text-xl text-accent">Together for</p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-x-7">
        {units.map(([value, label]) => (
          <div key={label} className="min-w-0">
            <strong className="block font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl md:text-4xl">{String(value).padStart(2, "0")}</strong>
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-sans">{label}</span>
          </div>
        ))}
      </div>
      <AnimatePresence>{burst && <FireflyBurst />}</AnimatePresence>
    </div>
  );
}

export function FireflyBurst() {
  return <motion.div className="pointer-events-none fixed inset-0 z-[90]" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
    {Array.from({ length: 34 }, (_, i) => <motion.i key={i} className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-glow" style={{ left: `${(i * 31) % 100}%`, top: "55%" }} animate={{ y: -200 - (i % 5) * 80, x: ((i % 7) - 3) * 45, opacity: [0, 1, 0], scale: [0, 1.8, 0] }} transition={{ duration: 1.5 + (i % 4) * .2, delay: (i % 6) * .06 }} />)}
  </motion.div>;
}

export function Constellation() {
  return null;
}

export function Intro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, reduceMotion ? 200 : 2400);
    return () => window.clearTimeout(timer);
  }, [onDone, reduceMotion]);
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-background" exit={{ opacity: 0 }} transition={{ duration: .6 }}>
      <Button variant="ghost" className="absolute right-5 top-5 text-muted-foreground font-sans text-xs uppercase tracking-widest" onClick={onDone}>Skip</Button>
      <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10 font-display text-5xl sm:text-7xl font-bold text-foreground">
        <motion.span initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .95 }}>
          {content.couple.firstName}
        </motion.span>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.35, 1], opacity: 1 }} transition={{ delay: .5, duration: .85 }}>
          <Heart className="h-12 w-12 sm:h-16 sm:w-16 fill-[#FF3B00] text-[#FF3B00] shadow-glow animate-pulse" />
        </motion.div>
        <motion.span initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .95 }}>
          {content.couple.secondName}
        </motion.span>
      </div>
    </motion.div>
  );
}

export function HeartCursor() {
  const [points, setPoints] = useState<Array<{ x: number; y: number; id: number }>>([]);

  useEffect(() => {
    let id = 0;
    let ticking = false;
    let lastX = 0;
    let lastY = 0;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastX = event.clientX;
      lastY = event.clientY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const next = { x: lastX, y: lastY, id: id++ };
          setPoints((current) => [...current.slice(-2), next]);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] hidden lg:block overflow-hidden" aria-hidden="true">
      {points.map((point, index) => (
        <span
          key={point.id}
          className="absolute text-accent text-xs select-none pointer-events-none transition-all duration-300 ease-out"
          style={{
            left: point.x - 6,
            top: point.y - 6,
            opacity: (index + 1) / (points.length + 1),
            transform: `scale(${0.6 + index * 0.2})`,
            willChange: "transform, opacity",
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

const butterflyConfigs = [
  { pathX: ["5%", "75%", "35%", "15%", "5%"], pathY: ["15%", "35%", "70%", "25%", "15%"], duration: 16, color: "#FBBF24" },
  { pathX: ["80%", "20%", "65%", "10%", "80%"], pathY: ["10%", "55%", "25%", "65%", "10%"], duration: 21, color: "#F472B6" },
  { pathX: ["12%", "60%", "82%", "25%", "12%"], pathY: ["70%", "15%", "60%", "80%", "70%"], duration: 18, color: "#FB7185" },
  { pathX: ["70%", "15%", "45%", "75%", "70%"], pathY: ["65%", "25%", "10%", "45%", "65%"], duration: 23, color: "#E879F9" },
  { pathX: ["40%", "80%", "10%", "55%", "40%"], pathY: ["10%", "60%", "35%", "80%", "10%"], duration: 19, color: "#38BDF8" },
  { pathX: ["30%", "85%", "20%", "70%", "30%"], pathY: ["50%", "20%", "75%", "30%", "50%"], duration: 22, color: "#FF4D6D" },
  { pathX: ["60%", "10%", "80%", "30%", "60%"], pathY: ["30%", "75%", "20%", "60%", "30%"], duration: 20, color: "#A855F7" },
];



function AnimatedButterfly({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative cursor-pointer focus:outline-none"
    >
      <motion.div
        animate={{
          y: [-6, 6, -6],
          rotateZ: [-5, 5, -5],
        }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="relative flex items-center justify-center [perspective:500px] select-none transition-transform group-hover:scale-125 will-change-transform"
      >
        <motion.div
          animate={{
            scaleX: [1, 0.3, 1, 0.3, 1],
            rotateY: [0, 50, 0, 50, 0],
          }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
          className="text-4xl sm:text-5xl [text-shadow:0_0_12px_rgba(251,191,36,0.7)]"
        >
          🦋
        </motion.div>
      </motion.div>
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-sans font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap backdrop-blur-md shadow-lg border border-amber-500/30 z-30">
        Catch me for a riddle! 🦋
      </span>
    </button>
  );
}

export function PasswordGate({ onUnlock, onClose }: { onUnlock: () => void; onClose?: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [scareStage, setScareStage] = useState<"idle" | "scare" | "prank">("idle");
  const [scareCount, setScareCount] = useState(60);
  // Butterfly Riddle Solver State
  const [selectedButterfly, setSelectedButterfly] = useState<(typeof butterflyHints)[number] | null>(null);
  const [butterflyInput, setButterflyInput] = useState("");
  const [butterflyError, setButterflyError] = useState(false);
  const [solvedButterflies, setSolvedButterflies] = useState<Set<number>>(() => new Set());
  const [justSolved, setJustSolved] = useState(false);

  // Puzzle State
  const [butterfliesUnlocked, setButterfliesUnlocked] = useState(false);
  const [showPuzzleModal, setShowPuzzleModal] = useState(false);
  const [puzzleInput, setPuzzleInput] = useState("");
  const [puzzleError, setPuzzleError] = useState(false);
  const [showHardHintModal, setShowHardHintModal] = useState(false);

  const security = content.security;
  const correctPasscode = (security?.password || "forever").toLowerCase().trim();
  const butterflyHints = security?.butterflyHints || [];

  const handleAbortScare = () => {
    setScareStage("prank");
    window.setTimeout(() => {
      setScareStage("idle");
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputClean = passcode.toLowerCase().trim();
    const normalized = inputClean.replace(/[^a-z0-9]/g, "");

    const isChronologicalMatch =
      normalized.indexOf("ghaziabad") !== -1 &&
      normalized.indexOf("sherlock") !== -1 &&
      (normalized.indexOf("index") !== -1 || normalized.indexOf("finger") !== -1) &&
      (normalized.indexOf("270826") !== -1 || normalized.indexOf("27082026") !== -1 || normalized.indexOf("2708") !== -1) &&
      normalized.indexOf("tokyo") !== -1;

    if (
      inputClean === correctPasscode ||
      inputClean === "aditi14" ||
      normalized === "aditi14" ||
      inputClean === "14/27" ||
      normalized === "1427" ||
      inputClean === "14-27" ||
      inputClean === "14 27" ||
      isChronologicalMatch ||
      inputClean === "forever" ||
      inputClean === "1604" ||
      inputClean === "aditi"
    ) {
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setScareStage("scare");

      let count = 60;
      setScareCount(60);
      const interval = window.setInterval(() => {
        count -= 1;
        if (count > 0) {
          setScareCount(count);
        } else {
          window.clearInterval(interval);
          setScareStage("prank");
          window.setTimeout(() => {
            setScareStage("idle");
          }, 3200);
        }
      }, 1000);

      window.setTimeout(() => setShaking(false), 700);
    }
  };

  const openButterflyRiddle = (butterfly: (typeof butterflyHints)[number]) => {
    setSelectedButterfly(butterfly);
    setButterflyInput("");
    setButterflyError(false);
    setJustSolved(false);
  };

  const handleButterflySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedButterfly) return;

    const inputClean = butterflyInput.trim().toLowerCase();
    const isCorrect = selectedButterfly.acceptedAnswers.some(
      (ans) => ans.toLowerCase().trim() === inputClean
    );

    if (isCorrect) {
      setButterflyError(false);
      setJustSolved(true);
      setSolvedButterflies((prev) => new Set(prev).add(selectedButterfly.id));
    } else {
      setButterflyError(true);
    }
  };

  const handlePuzzleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = puzzleInput.trim().toLowerCase();
    const expected = (security?.puzzleAnswer || "4").trim().toLowerCase();
    if (clean === expected || clean === "4th" || clean === "april 4" || clean === "april 4th" || clean === "04") {
      setPuzzleError(false);
      setShowPuzzleModal(false);
      setButterfliesUnlocked(true);
      setShowHardHintModal(true);
    } else {
      setPuzzleError(true);
    }
  };

  const handleNeedHintClick = () => {
    if (!butterfliesUnlocked) {
      setShowPuzzleModal(true);
    } else {
      setShowHardHintModal(true);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[120] flex min-h-dvh items-start justify-center overflow-y-auto overscroll-contain p-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl transition-colors duration-300 sm:items-center sm:p-4 ${
        scareStage === "scare" ? "bg-red-950/90" : "bg-background/95"
      }`}
    >
      <Constellation />

      {/* Flying Animated Butterflies (Only shown once unlocked via Riddle) */}
      {butterfliesUnlocked && scareStage === "idle" && (
        <div className="pointer-events-none fixed inset-0 z-[125] overflow-hidden" aria-hidden="false">
          {butterflyConfigs.map((cfg, idx) => {
            const hint = butterflyHints[idx % butterflyHints.length];
            if (!hint) return null;
            const startX = cfg.pathX[0] ?? "5%";
            const isSolved = solvedButterflies.has(hint.id);
            return (
              <motion.div
                key={idx}
                className="pointer-events-auto absolute"
                initial={{ left: startX, top: "100%" }}
                animate={{ left: cfg.pathX, top: cfg.pathY }}
                transition={{
                  top: { duration: 1.8, ease: "easeOut" },
                  left: { duration: cfg.duration, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <AnimatedButterfly
                  label={`${hint.title} ${isSolved ? "(Solved)" : ""}`}
                  onClick={() => openButterflyRiddle(hint)}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Memory Puzzle Question Modal */}
      <Dialog open={showPuzzleModal} onOpenChange={setShowPuzzleModal}>
        <DialogContent className="max-w-md border-accent/40 bg-background/95 p-6 backdrop-blur-2xl shadow-glow">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-3xl shadow-glow">
              🗝️
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              Memory Puzzle #1
            </DialogTitle>
            <p className="font-script text-3xl text-accent font-semibold">
              "{security?.puzzleQuestion || "The date of 1st Hi"}"
            </p>
            <p className="text-xs text-muted-foreground">
              Answer the memory question correctly to release the butterfly hints!
            </p>

            <form onSubmit={handlePuzzleSubmit} className="mt-4 space-y-4 text-left">
              <div>
                <input
                  type="text"
                  value={puzzleInput}
                  onChange={(e) => {
                    setPuzzleInput(e.target.value);
                    if (puzzleError) setPuzzleError(false);
                  }}
                  placeholder={("puzzlePlaceholder" in security && security.puzzlePlaceholder) ? (security.puzzlePlaceholder as string) : "Enter the date (e.g. 18)..."}
                  autoFocus
                  className={`w-full rounded-xl border bg-background/80 px-4 py-3.5 font-sans text-sm text-foreground outline-none transition-all ${
                    puzzleError ? "border-destructive ring-2 ring-destructive/20" : "border-border focus:border-accent focus:ring-2 focus:ring-accent/20"
                  }`}
                />
              </div>

              {puzzleError && (
                <p className="text-xs font-semibold text-destructive text-center">
                  Hmm, not quite! Think back to when that "Um hi?" message first landed... 💕
                </p>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl bg-accent py-3.5 font-sans text-sm font-semibold text-accent-foreground shadow-glow"
              >
                Release The Butterflies 🦋
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Hint Modal after releasing butterflies */}
      <Dialog open={showHardHintModal} onOpenChange={setShowHardHintModal}>
        <DialogContent className="max-w-md border-amber-500/40 bg-background/95 p-6 backdrop-blur-2xl shadow-glow">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-3xl shadow-glow animate-pulse">
              ✨
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              Butterflies Released! 🦋
            </DialogTitle>
            <DialogDescription className="font-script text-2xl sm:text-3xl leading-relaxed text-accent font-bold">
              "{security?.hardHint || "Deep within the fluttering wings of our memories lies the key to eternity... catch the floating butterflies to discover what lasts forever! 🦋✨"}"
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              Look around your screen! Tap on any floating butterfly to uncover hard riddles for the passcode.
            </p>
            <Button
              type="button"
              onClick={() => setShowHardHintModal(false)}
              className="mt-2 w-full rounded-xl bg-accent text-xs font-semibold text-accent-foreground shadow-glow"
            >
              Catch The Butterflies 🦋
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Butterfly Riddle Solver Modal */}
      <Dialog open={Boolean(selectedButterfly)} onOpenChange={(open) => !open && setSelectedButterfly(null)}>
        <DialogContent className="max-w-md border-amber-500/40 bg-background/95 p-6 backdrop-blur-2xl shadow-glow z-[200]">
          {selectedButterfly && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-3xl shadow-glow animate-bounce">
                🦋
              </div>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                {selectedButterfly.title}
              </DialogTitle>

              {'isNoteOnly' in selectedButterfly && selectedButterfly.isNoteOnly ? (
                <div className="space-y-4 py-2 animate-fadeIn text-center">
                  <div className="text-5xl animate-bounce">🥰 💖 ✨</div>
                  <DialogDescription className="font-script text-3xl sm:text-4xl leading-relaxed text-accent font-bold">
                    "{selectedButterfly.question}"
                  </DialogDescription>
                  <p className="text-xs text-muted-foreground">
                    No riddle here — just a special reminder of how much you mean to me! 💕
                  </p>
                  <Button
                    type="button"
                    onClick={() => setSelectedButterfly(null)}
                    className="w-full rounded-xl bg-accent py-3 font-sans text-xs font-semibold text-accent-foreground shadow-glow"
                  >
                    I Love You Too! 💖
                  </Button>
                </div>
              ) : justSolved ? (
                <div className="space-y-4 py-2 animate-fadeIn text-center">
                  <h4 className="font-display text-2xl font-bold text-accent">
                    Correct Answer!
                  </h4>
                  <p className="text-sm text-foreground/90 font-medium">
                    You solved the riddle & unlocked a passcode piece!
                  </p>
                  <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5 font-mono text-lg font-bold text-accent shadow-glow">
                    "{selectedButterfly.passcodePiece}"
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedButterfly(null)}
                    className="w-full rounded-xl bg-accent py-3 font-sans text-xs font-semibold text-accent-foreground shadow-glow"
                  >
                    Continue Catching Butterflies 🦋
                  </Button>
                </div>
              ) : (
                <>
                  <DialogDescription className="font-script text-2xl sm:text-3xl leading-relaxed text-accent font-bold">
                    "{selectedButterfly.question}"
                  </DialogDescription>
                  <p className="text-xs text-muted-foreground">
                    Answer the riddle correctly to reveal its secret passcode piece!
                  </p>
                  {'note' in selectedButterfly && selectedButterfly.note && (
                    <div className="mt-2 rounded-xl bg-accent/10 border border-accent/30 p-3 text-xs font-semibold text-accent text-center shadow-sm">
                      📌 {selectedButterfly.note}
                    </div>
                  )}

                  <form onSubmit={handleButterflySubmit} className="mt-4 space-y-4 text-left">
                    <div>
                      <input
                        type="text"
                        value={butterflyInput}
                        onChange={(e) => {
                          setButterflyInput(e.target.value);
                          if (butterflyError) setButterflyError(false);
                        }}
                        placeholder={
                          selectedButterfly && "placeholder" in selectedButterfly && selectedButterfly.placeholder
                            ? (selectedButterfly.placeholder as string)
                            : "Type your answer here..."
                        }
                        autoFocus
                        className={`w-full rounded-xl border bg-background/80 px-4 py-3.5 font-sans text-sm text-foreground outline-none transition-all ${
                          butterflyError
                            ? "border-destructive ring-2 ring-destructive/20"
                            : "border-border focus:border-accent focus:ring-2 focus:ring-accent/20"
                        }`}
                      />
                    </div>

                    {butterflyError && (
                      <p className="text-xs font-semibold text-destructive text-center">
                        Hmm, not quite! Think carefully about our sweet memory... 💕
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedButterfly(null)}
                        className="rounded-xl border-border text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl bg-accent px-5 py-2.5 font-sans text-xs font-semibold text-accent-foreground shadow-glow"
                      >
                        Submit Answer ✨
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scare Emergency Overlay */}
      <AnimatePresence>
        {scareStage === "scare" && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-black/95 p-6 text-center shadow-2xl"
          >
            <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none" />
            <motion.div
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-600/30 border-2 border-red-500 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)]"
            >
              <Skull className="h-14 w-14" />
            </motion.div>

            <h1 className="font-display text-4xl font-extrabold tracking-widest text-red-500 sm:text-6xl drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] uppercase animate-pulse">
              🚨 INTRUDER ALERT! 🚨
            </h1>
            <p className="mt-4 font-mono text-sm tracking-widest text-red-300 uppercase">
              UNAUTHORIZED ACCESS DETECTED. LOCATION LOGGED.
            </p>
            <p className="mt-2 font-mono text-xs text-red-400">
              FACIAL RECOGNITION MATCH: 0% (NOT AMAN OR ADITI)
            </p>

            <div className="mt-8 rounded-2xl border border-red-500/50 bg-red-950/60 px-8 py-5 shadow-glow">
              <span className="font-mono text-xs text-red-400 uppercase tracking-widest block">Self-Destruct Countdown</span>
              <strong className="font-mono text-6xl font-black text-red-500 block mt-2 tracking-wider">
                {formatTimer(scareCount)}
              </strong>
            </div>

            <Button
              type="button"
              onClick={handleAbortScare}
              className="mt-8 rounded-full border border-red-500/40 bg-red-900/30 px-6 py-2.5 font-mono text-xs text-red-300 uppercase tracking-wider hover:bg-red-800/50 transition-all"
            >
              Abort Sequence / Retry Passcode ✋
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playful Prank Reveal Overlay */}
      <AnimatePresence>
        {scareStage === "prank" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-background/95 p-6 text-center"
          >
            <span className="text-7xl mb-4 animate-bounce">😜</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Haha! Just kidding!
            </h2>
            <p className="mt-3 max-w-md text-sm font-sans text-muted-foreground leading-relaxed">
              No self-destructs here... but this page is locked!
            </p>
            <p className="mt-2 font-script text-2xl text-accent font-bold">
              Ask Aman for the password! 😉💕
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={shaking ? { x: [-16, 16, -12, 12, -6, 6, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10 my-auto w-full max-w-md shrink-0 rounded-2xl border border-border/80 bg-card/95 p-5 text-center shadow-panel backdrop-blur-xl sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 shadow-glow sm:mb-6 sm:h-16 sm:w-16">
          <LockKeyhole className="h-7 w-7 animate-pulse text-accent sm:h-8 sm:w-8" />
        </div>

        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
          It's Locked! 🔒
        </h2>
        <p className="mt-2 font-script text-xl font-bold text-accent sm:text-3xl">
          Ask Aman for password 💕
        </p>
        <p className="mt-3 text-xs font-sans leading-relaxed text-muted-foreground sm:mt-4">
          This keepsake chapter is protected. Ask Aman for the secret password to unlock all chapters!
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(false);
              }}
              placeholder={security?.passcodePlaceholder || "Enter password..."}
              className={`w-full rounded-xl border bg-background/80 px-4 py-3 pr-11 font-sans text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 sm:py-3.5 sm:text-sm ${
                error
                  ? "border-destructive ring-2 ring-destructive/20"
                  : "border-border focus:border-accent focus:ring-2 focus:ring-accent/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-destructive"
            >
              It's locked! Ask Aman for the password! 🔐
            </motion.p>
          )}

          <Button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-accent py-3 font-sans text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:opacity-90 active:scale-[0.99] sm:py-3.5"
          >
            Unlock Keepsake 🗝️
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleNeedHintClick}
            className="min-h-11 w-full whitespace-normal rounded-xl border border-accent/40 bg-accent/10 py-3 font-sans text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/20"
          >
            <span>{butterfliesUnlocked ? "Catch Floating Butterflies 🦋✨" : "Need a Hint? Release Butterfly Riddles 🦋✨"}</span>
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 border-t border-border/50 pt-4 text-center sm:mt-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-xs text-muted-foreground hover:text-accent underline transition-colors"
            >
              ← Back to Home / Us
            </button>
          )}
          <a
            href="/app"
            className="font-sans text-xs font-semibold text-accent hover:underline transition-colors flex items-center gap-1.5"
          >
            <span>Going to Our Couple Phone App? Open App 📱 ↗</span>
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Sidebar({
  activePath,
  visited,
  unlocked,
  authenticated = false,
  onNavigate,
  onLock,
  onHomeClick,
}: {
  activePath: string;
  visited: Set<string>;
  unlocked: boolean;
  authenticated?: boolean;
  onNavigate?: () => void;
  onLock?: () => void;
  onHomeClick?: () => void;
}) {
  return (
    <nav aria-label="Story sections" className="flex flex-col gap-1">
      {navItems.map((item, index) => {
        const isHome = item.id === "home";
        const displayLabel = !authenticated && !isHome ? "????" : item.label;
        const isBonusLocked = item.id === "bonus" && !unlocked;
        const isItemLocked = !authenticated ? !isHome : isBonusLocked;
        const isActive = activePath === item.path;

        const className = `group flex items-center justify-start gap-3 border-l px-4 py-3 text-left text-sm transition-colors ${
          isActive
            ? "border-accent bg-accent/15 text-accent font-semibold"
            : isItemLocked
            ? "border-border/40 text-muted-foreground/60 hover:border-accent/40 hover:bg-accent/5 hover:text-foreground"
            : "border-border/50 text-muted-foreground hover:border-accent/50 hover:bg-accent/5 hover:text-foreground"
        } ${item.id === "bonus" && unlocked ? "animate-shimmer" : ""}`;

        if (authenticated && isBonusLocked) {
          return (
            <div key={item.id} className="group flex items-center justify-start gap-3 border-l px-4 py-3 text-left text-sm pointer-events-none border-border/40 text-muted-foreground/40">
              <span className="w-5 font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="flex-1 font-sans font-medium">{item.label}</span>
              <LockKeyhole className="h-3.5 w-3.5" />
            </div>
          );
        }

        return (
          <Link
            key={item.id}
            to={item.path}
            onClick={() => {
              if (isHome && onHomeClick) onHomeClick();
              if (onNavigate) onNavigate();
            }}
            className={className}
          >
            <span className="w-5 font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <span className="flex-1 font-sans font-medium">{displayLabel}</span>
            {isItemLocked ? (
              <LockKeyhole className="h-3.5 w-3.5 text-accent/70" />
            ) : visited.has(item.id) && item.id !== "bonus" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            ) : null}
          </Link>
        );
      })}

      {/* Link to Phone App */}
      <a
        href="/app"
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-2.5 flex items-center justify-between rounded-xl border border-accent/40 bg-gradient-to-r from-[#E5A962]/15 via-[#E07A5F]/15 to-[#E5A962]/15 px-3.5 py-2.5 text-left text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/25 hover:border-accent active:scale-98"
      >
        <span className="flex items-center gap-2 font-sans font-medium text-foreground">
          <span>Our Phone App 📱</span>
        </span>
        <span className="font-mono text-[10px] text-accent font-bold">OPEN ↗</span>
      </a>

      {!authenticated && (
        <Link
          to="/timeline"
          onClick={() => {
            if (onNavigate) onNavigate();
          }}
          className="group mt-2 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-left text-xs font-semibold text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 active:scale-98"
        >
          <span className="flex items-center gap-2 font-sans font-medium">
            <span>Butterfly Riddles 🦋✨</span>
          </span>
          <span className="font-mono text-[10px] text-accent font-bold">SOLVE →</span>
        </Link>
      )}

      {onLock && (
        <button
          type="button"
          onClick={onLock}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-border/40 px-4 py-2 text-xs text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <span className="font-sans font-medium">Lock My Keepsake</span>
          <LockKeyhole className="h-3.5 w-3.5" />
        </button>
      )}
    </nav>
  );
}

export function SectionHeading({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: string; copy?: string }) {
  return <motion.header initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }} className="mb-14 max-w-2xl">
    <div className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-accent"><span>{number}</span><span className="h-px w-12 bg-accent/50" /><span>{eyebrow}</span></div>
    <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">{title}</h2>
    {copy && <p className="mt-5 max-w-xl leading-7 text-muted-foreground font-sans">{copy}</p>}
  </motion.header>;
}

export function HomeView() {
  const navigate = useNavigate();
  return <section id="home" className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 pb-24 pt-28 sm:px-10 sm:py-24 lg:px-16 xl:px-24">
    <Constellation />
    <div className="absolute left-5 top-4 z-20 hidden h-14 items-center lg:left-16 lg:flex xl:left-24">
      <p className="text-[11px] font-bold uppercase tracking-[.28em] text-accent">
        RELATIONSHIP PORTFOLIO — OUR DIGITAL KEEPSAKE
      </p>
    </div>
    <div className="relative z-10 mx-auto grid w-full max-w-6xl min-w-0 items-center gap-8 sm:gap-12 lg:grid-cols-[1.1fr_.9fr]">
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
        <h1 className="font-display text-5xl font-bold leading-[.92] tracking-tight text-foreground sm:text-7xl xl:text-8xl">
          {content.couple.firstName}
          <span className="inline-block text-accent font-serif font-bold">&nbsp;&amp;&nbsp;</span>
          <span className="mt-1.5 block text-5xl font-serif font-bold italic text-accent sm:text-7xl xl:text-8xl">{content.couple.secondName}.</span>
        </h1>
        <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground font-serif italic border-l-2 border-accent/50 pl-4 py-1">
          "{content.couple.tagline}"
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-900/10 bg-[#D8EEDC] px-4 py-2 text-xs font-semibold text-[#0D7A46] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#0D7A46] animate-pulse" />
            <span>{content.couple.firstName} &amp; {content.couple.secondName} · Writing Our Forever</span>
          </div>

          <a
            href="/app"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-gradient-to-r from-[#E5A962]/20 to-[#E07A5F]/20 px-4 py-2 text-xs font-semibold text-accent shadow-md backdrop-blur-md transition-all hover:border-accent hover:bg-accent/30 hover:scale-105 active:scale-95"
          >
            <span>Our Phone App 📱</span>
            <span className="text-[10px] font-mono opacity-80 group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>

          <button
            type="button"
            onClick={() => navigate({ to: "/timeline" })}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-900 shadow-md backdrop-blur-md transition-all hover:border-amber-400 hover:bg-amber-500/25 hover:scale-105 active:scale-95"
          >
            <span>Butterfly Riddles 🦋✨</span>
          </button>
        </div>
        <TimeTogether />
      </motion.div>
      <motion.figure initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .15, duration: 1 }} className="relative mx-auto w-full max-w-md rounded-[2px] shadow-photo">
        <div className="absolute -inset-3 rounded-[2px] border border-accent/40 shadow-vinyl pointer-events-none z-10" />
        <video
          src={content.couple.heroVideo}
          autoPlay
          loop
          muted
          playsInline
          className="relative aspect-[4/5] w-full rounded-[2px] object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
        <figcaption className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between gap-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 px-4 py-3 text-white shadow-2xl transition-all">
          <span className="font-display italic text-lg sm:text-xl font-medium tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            The view I keep choosing
          </span>
          <span className="flex items-center justify-center rounded-full bg-accent/20 p-1.5 backdrop-blur-sm border border-accent/40">
            <Heart className="h-4 w-4 fill-[#FF3B00] text-[#FF3B00] animate-pulse drop-shadow-[0_0_8px_rgba(255,59,0,0.8)]" />
          </span>
        </figcaption>
      </motion.figure>
    </div>
    <Button variant="ghost" onClick={() => navigate({ to: "/timeline" })} className="absolute bottom-7 left-1/2 flex h-auto -translate-x-1/2 flex-col gap-2 text-muted-foreground lg:left-[calc(50%+8rem)]">
      <span className="text-[9px] uppercase tracking-[.25em] font-semibold">Begin our story</span>
      <ArrowDown className="animate-bounce" />
    </Button>
  </section>;
}

export function TimelineView() {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<(typeof content.timeline)[number] | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });

  return (
    <section ref={ref} className="section-shell bg-surface relative overflow-hidden py-16 sm:py-24">
      <SectionHeading
        number="02"
        eyebrow="Our timeline"
        title="Every chapter left a mark."
        copy="Not a perfect story. A true one — which is better."
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* Central Vertical Line for Desktop & Left Line for Mobile */}
        <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-border/60 md:left-1/2 md:-translate-x-1/2" />

        {/* Animated Glowing Progress Line */}
        <motion.div
          className="absolute top-0 left-6 w-0.5 origin-top bg-gradient-to-b from-accent via-accent to-accent/60 shadow-[0_0_12px_rgba(255,59,0,0.5)] md:left-1/2 md:-translate-x-1/2"
          style={{ scaleY: scrollYProgress, height: "100%" }}
        />

        <div className="space-y-12 sm:space-y-16">
          {content.timeline.map((item, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 2) * 0.08 }}
                className={`relative flex items-center ${
                  isEven ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                {/* Timeline Node Icon (Centered on line) */}
                <div className="absolute left-6 -translate-x-1/2 md:left-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-background shadow-glow transition-transform duration-300 hover:scale-125">
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                </div>

                {/* Content Card Container */}
                <div className="ml-12 w-full md:ml-0 md:w-1/2 md:px-8">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="group w-full rounded-2xl border border-border/80 bg-card/90 p-6 sm:p-7 text-left shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-glow cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[11px] font-sans font-bold uppercase tracking-wider text-accent">
                        {item.date}
                      </span>
                      {"image" in item && item.image && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                          📷 Screenshot
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground group-hover:text-accent transition-colors duration-200 flex items-center justify-between gap-3">
                      <span>{item.title}</span>
                      <span className="text-sm text-accent opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        ↗
                      </span>
                    </h3>

                    {item.text && (
                      <p className="mt-3 line-clamp-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {item.text}
                      </p>
                    )}

                    <div className="mt-5 flex items-center text-xs font-semibold text-accent/80 group-hover:text-accent group-hover:underline">
                      <span>Read chapter &amp; memory details</span>
                    </div>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg border-border/80 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-xl rounded-2xl shadow-glow z-[200]">
          {selectedItem && (
            <div className="space-y-5">
              <div>
                <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider text-accent mb-2">
                  {selectedItem.date}
                </span>
                <DialogTitle className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                  {selectedItem.title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed text-foreground/90 font-sans">
                {selectedItem.text}
              </DialogDescription>
              {"image" in selectedItem && selectedItem.image && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    📷 Original Conversation Screenshot
                  </p>
                  <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-accent/20 bg-black/5 p-2 shadow-inner">
                    <img
                      src={selectedItem.image as string}
                      alt={selectedItem.title}
                      className="w-full rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function PhotosView() {
  const [selected, setSelected] = useState<(typeof content.photos)[number] | null>(null);
  return <section className="section-shell">
    <SectionHeading number="03" eyebrow="Photo dump" title="Proof we were here." copy="Twenty little windows into the same unfolding story." />
    <div className="columns-2 gap-3 md:columns-3 xl:columns-4">{content.photos.map((photo, i) => <motion.button type="button" key={`${photo.caption}-${i}`} aria-label={`Open photo: ${photo.caption}`} onClick={() => setSelected(photo)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * .06 }} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-sm bg-muted text-left" style={{ aspectRatio: i % 5 === 0 ? "3 / 4" : i % 3 === 0 ? "1 / 1" : "4 / 5" }}>
      <img src={photo.src} alt={photo.caption} loading="lazy" width={1280} height={1536} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: photo.position }} />
      <span className="absolute inset-x-0 bottom-0 bg-gallery-fade px-3 pb-3 pt-10 text-xs leading-5 font-semibold text-foreground opacity-0 transition-opacity group-hover:opacity-100">{photo.caption}</span>
    </motion.button>)}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent className="max-w-4xl border-border bg-surface/95 p-2 backdrop-blur-xl">
        <DialogTitle className="sr-only">Memory photograph</DialogTitle>
        <DialogDescription className="sr-only">Expanded photo with caption</DialogDescription>
        {selected && <figure><img src={selected.src} alt={selected.caption} width={1280} height={1536} className="max-h-[78vh] w-full object-contain" /><figcaption className="p-4 text-center font-display text-lg font-semibold text-foreground">{selected.caption}</figcaption></figure>}
      </DialogContent>
    </Dialog>
  </section>;
}

function ScratchNote({ text, index }: { text: string; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(ratio, ratio); ctx.fillStyle = "#e5dad5"; ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#d4c5c0"; ctx.lineWidth = 2;
    for (let y = 18; y < rect.height; y += 14) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(rect.width - 12, y + ((y / 14) % 2 ? 4 : -3)); ctx.stroke(); }
    ctx.font = "italic 16px serif"; ctx.fillStyle = "#8a746d"; ctx.textAlign = "center"; ctx.fillText("scratch to uncover", rect.width / 2, rect.height / 2);
  }, []);
  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas || revealed) return;
    const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext("2d"); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1; ctx.save(); ctx.scale(ratio, ratio); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(clientX - rect.left, clientY - rect.top, 28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  return <motion.article initial={{ opacity: 0, rotate: index % 2 ? 2 : -2 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative min-h-56 rounded-sm bg-paper p-7 text-paper-foreground shadow-note">
    <span className="font-script text-2xl opacity-45">I owe you this one.</span>
    <p className="mt-8 font-script text-2xl leading-relaxed">{text}</p>
    {!revealed && <canvas ref={canvasRef} role="button" aria-label="Scratch to reveal apology" tabIndex={0} className="absolute inset-0 h-full w-full touch-none rounded-sm cursor-crosshair" onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e.clientX, e.clientY); }} onPointerMove={(e) => drawing.current && scratch(e.clientX, e.clientY)} onPointerUp={() => { drawing.current = false; window.setTimeout(() => setRevealed(true), 500); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setRevealed(true); }} />}
  </motion.article>;
}

export function ApologiesView() {
  return <section className="section-shell bg-surface">
    <SectionHeading number="04" eyebrow="My apologies" title="Some words deserve to be uncovered slowly." />
    <div className="grid gap-6 md:grid-cols-2">{content.apologies.map((text, i) => <ScratchNote key={text} text={text} index={i} />)}</div>
  </section>;
}

export function ThoughtsView() {
  const rotations = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-1"];
  const doodles = ["☾", "♡", "✦", "☕", "∞"];
  return <section className="section-shell overflow-hidden">
    <SectionHeading number="05" eyebrow="Random thoughts" title="Things I never want to forget." />
    <div className="grid gap-7 md:grid-cols-6">{content.thoughts.map((thought, i) => <motion.article key={thought} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ rotate: 0, y: -6 }} viewport={{ once: true }} className={`relative rounded-sm border border-border bg-card p-7 shadow-photo ${rotations[i]} ${i === 0 || i === 3 ? "md:col-span-4" : "md:col-span-2"}`}>
      <span className="absolute -right-2 -top-5 font-script text-4xl text-accent/70">{doodles[i]}</span>
      <p className="font-display text-xl leading-8 font-semibold text-foreground">“{thought}”</p>
      <span className="mt-6 block text-[9px] uppercase tracking-[.28em] font-sans text-muted-foreground">Note {String(i + 1).padStart(2, "0")}</span>
    </motion.article>)}</div>
  </section>;
}

export function MusicPlayer({ activeTrack, playing, setPlaying, selectTrack }: { activeTrack: number; playing: boolean; setPlaying: (value: boolean) => void; selectTrack: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const track = content.spotify.tracks[activeTrack] ?? content.spotify.tracks[0];
  useEffect(() => {
    if (!content.spotify.clientId || !content.spotify.accessToken) return;
    const script = document.createElement("script"); script.src = "https://sdk.scdn.co/spotify-player.js"; script.async = true; document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);
  const step = (amount: number) => selectTrack((activeTrack + amount + content.spotify.tracks.length) % content.spotify.tracks.length);
  return <>
    <div className="fixed right-3 top-3 z-40 flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/90 p-1 pr-2 shadow-panel backdrop-blur-xl sm:right-7 sm:top-7 sm:gap-3 sm:p-1.5 sm:pr-4">
      <Button size="icon" variant="ghost" aria-label="Open playlist" onClick={() => setOpen(true)} className="relative h-10 w-10 overflow-visible rounded-full p-0 sm:h-12 sm:w-12">
        <span className={`vinyl ${playing ? "animate-spin-vinyl" : ""}`}><img src={track.art} alt="" width={48} height={48} className="h-full w-full rounded-full object-cover opacity-65" /></span>
        {playing && ["♪", "♫"].map((note, i) => <motion.span key={note} className="absolute text-xs text-accent" animate={{ x: [0, i ? 15 : -12], y: [0, -34], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * .9 }}>{note}</motion.span>)}
      </Button>
      <button className="hidden min-w-0 text-left sm:block" onClick={() => setOpen(true)}>
        <span className="block font-bold text-[10px] uppercase tracking-wider text-accent">Now playing</span>
        <span className="block max-w-32 truncate text-xs font-semibold text-foreground">{track.title}</span>
      </button>
      <Button size="icon" variant="ghost" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="rounded-full">{playing ? <Pause /> : <Play />}</Button>
      <button onClick={() => setOpen(true)} className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition-opacity">
        <span>Playlist</span>
        <span className="text-[10px]">↗</span>
      </button>
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="border-border bg-surface/95 p-0 backdrop-blur-2xl">
        <div className="p-7">
          <SheetTitle className="font-display text-3xl font-bold">Our playlist</SheetTitle>
          <SheetDescription className="mt-1 font-script text-lg text-accent">Songs that sound like us</SheetDescription>
        </div>
        <div className="px-4">{content.spotify.tracks.map((item, i) => <Button key={item.title} variant="ghost" onClick={() => { selectTrack(i); setPlaying(true); }} className={`h-auto w-full justify-start rounded-sm p-3 ${activeTrack === i ? "bg-accent/10" : ""}`}><img src={item.art} alt="" width={56} height={56} className="h-14 w-14 rounded-sm object-cover" /><span className="min-w-0 text-left"><strong className="block truncate font-display text-base font-semibold">{item.title}</strong><small className="block truncate text-muted-foreground">{item.artist}</small></span>{item.isOurSong && <Heart className="ml-auto fill-accent text-accent" />}</Button>)}</div>
        <div className="mt-7 border-t border-border p-7">
          <div className="flex justify-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Previous track" onClick={() => step(-1)}><SkipBack /></Button>
            <Button size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="h-11 w-11 rounded-full">{playing ? <Pause /> : <Play />}</Button>
            <Button variant="ghost" size="icon" aria-label="Next track" onClick={() => step(1)}><SkipForward /></Button>
          </div>
          {content.spotify.playlistId ? <iframe className="mt-6 h-20 w-full rounded-sm" title="Spotify playlist" src={`https://open.spotify.com/embed/playlist/${content.spotify.playlistId}?utm_source=generator&theme=0`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /> : <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Add your Spotify playlist ID in the content file to play it here.</p>}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}

export function MusicView({ activeTrack }: { activeTrack: number }) {
  const track = content.spotify.tracks[activeTrack] ?? content.spotify.tracks[0];
  return <section className="section-shell bg-surface">
    <SectionHeading number="06" eyebrow="Our soundtrack" title="Some memories begin with a song." />
    <div className="grid items-center gap-10 md:grid-cols-[.8fr_1.2fr]">
      <div className="relative mx-auto aspect-square w-full max-w-sm rounded-full bg-vinyl shadow-vinyl">
        <div className="absolute inset-[8%] overflow-hidden rounded-full border border-border">
          <img src={track.art} alt={`Album art for ${track.title}`} width={1280} height={1536} loading="lazy" className="h-full w-full object-cover opacity-70" />
        </div>
        <div className="absolute inset-[44%] rounded-full bg-background shadow-inner" />
      </div>
      <div>
        <p className="font-script text-2xl text-accent">Playing in our heads</p>
        <h3 className="mt-2 font-display text-4xl font-bold text-foreground">{track.title}</h3>
        <p className="mt-3 text-muted-foreground font-sans">{track.artist}</p>
        <div className="mt-8 h-px overflow-hidden bg-border">
          <motion.div className="h-full bg-accent" animate={{ width: ["0%", "100%"] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} />
        </div>
      </div>
    </div>
  </section>;
}

export function LetterView() {
  const today = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
  return <section className="section-shell flex min-h-screen items-center">
    <div className="mx-auto max-w-3xl py-20">
      <SectionHeading number="07" eyebrow="A letter to you" title="For all the things I mean, even when I forget to say them." />
      <div className="space-y-8">{content.letter.map((line, i) => <motion.p key={line} initial={{ opacity: 0, y: 20, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: .9, delay: i * .15 }} className={`${i === 0 || i === content.letter.length - 1 ? "font-script text-3xl text-accent font-semibold" : "font-display text-xl leading-9 text-foreground/90 md:text-2xl md:leading-10 font-semibold"}`}>{line}</motion.p>)}</div>
      <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-16 border-t border-border pt-8">
        <p className="font-display text-3xl font-bold text-foreground">{content.couple.firstName} &amp; {content.couple.secondName}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[.28em] font-sans text-muted-foreground">{today}</p>
        <motion.div className="mt-8 inline-flex items-center gap-3 text-accent" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: .9, repeat: Infinity }}>
          <Heart className="fill-accent" />
          <span className="font-script text-lg">always, still</span>
        </motion.div>
      </motion.footer>
    </div>
  </section>;
}

export function SecretView() {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, new Date(content.bonus.date).getTime() - Date.now());
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor(ms / 3_600_000) % 24;
      const minutes = Math.floor(ms / 60_000) % 60;
      const seconds = Math.floor(ms / 1_000) % 60;
      setRemaining(`${days} days · ${hours} hours · ${minutes} minutes · ${seconds} seconds`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <section className="section-shell min-h-screen bg-surface">
    <div className="mx-auto max-w-4xl text-center">
      <Sparkles className="mx-auto mb-6 h-8 w-8 text-accent" />
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.32em] text-accent">One last thing</p>
      <h2 className="font-display text-4xl font-bold leading-tight text-foreground md:text-7xl">{content.bonus.message}</h2>
      <figure className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-sm border border-accent/30 shadow-vinyl">
        <img src={content.bonus.image} alt="A final memory together" width={1280} height={1536} loading="lazy" className="aspect-[16/10] w-full object-cover" />
      </figure>
      <p className="mt-8 font-script text-2xl text-accent">Until our next anniversary</p>
      <p className="mt-2 text-sm uppercase tracking-[.18em] font-sans font-semibold text-muted-foreground">{remaining}</p>
    </div>
  </section>;
}

export function RelationshipPortfolio() {
  return <HomeView />;
}
