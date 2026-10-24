import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  MessageCircle,
  Flame,
  CalendarHeart,
  Sparkles,
  MoreHorizontal,
  Bell,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { MoreSheet } from "@/components/app/screens/MoreSheet";
import { PushPermissionModal } from "@/components/app/screens/PushPermissionModal";
import { Toaster } from "@/components/ui/sonner";
import { getAuthenticatedUser, type CurrentUser } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { PhoneAuthScreen } from "@/components/app/screens/PhoneAuthScreen";
import { PrivacyLockOverlay } from "@/components/app/PrivacyLockOverlay";

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const pathname = location.pathname;
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [pushPromptOpen, setPushPromptOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(() => getAuthenticatedUser());
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [currentUser?.avatarUrl]);

  React.useEffect(() => {
    document.body.classList.add("app-theme");
    return () => document.body.classList.remove("app-theme");
  }, []);

  React.useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getAuthenticatedUser());
    };
    window.addEventListener("our_space_auth_changed", handleAuthChange);
    return () => {
      window.removeEventListener("our_space_auth_changed", handleAuthChange);
    };
  }, []);

  React.useEffect(() => {
    if (currentUser) {
      connectSocket(queryClient);

      // Check if user has not yet seen the notification prompt
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default" &&
        !localStorage.getItem("has_seen_push_prompt")
      ) {
        const timer = setTimeout(() => {
          setPushPromptOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [queryClient, currentUser]);

  const {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSPrompt,
    setShowIOSPrompt,
    promptInstall,
  } = usePWAInstall();

  const tabs = [
    { to: "/app", label: "Home", icon: Home, exact: true },
    { to: "/app/chat", label: "Chat", icon: MessageCircle },
    { to: "/app/progress", label: "Progress", icon: Flame },
    { to: "/app/cycle", label: "Cycle", icon: CalendarHeart },
    { to: "/app/thoughts", label: "Thoughts", icon: Sparkles },
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PhoneAuthScreen
          onSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-accent/30 selection:text-accent">
      {/* Background Ambience & Warm Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[300px] bg-gradient-to-b from-[#E5A962]/20 via-[#E07A5F]/10 to-transparent blur-[80px]" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[300px] h-[240px] bg-gradient-to-t from-accent/10 to-transparent blur-[70px]" />
        <div className="absolute inset-0 opacity-[0.035] film-grain mix-blend-multiply pointer-events-none" />
      </div>

      {/* Mobile Shell Wrapper */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Top Header */}
        <header className="app-safe-header sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background px-4 shadow-xs">
          <Link to="/app" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-xs font-bold text-white shadow-sm shadow-accent/30">
              {currentUser.avatarUrl && !avatarLoadFailed ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                currentUser.name?.trim().charAt(0).toUpperCase() || "?"
              )}
            </span>
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Our Space
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-border/80 bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-accent flex items-center gap-1 shadow-xs">
              <span>{currentUser.name || (currentUser.role === "her" ? "Aditi" : "Aman")}</span>
              <span>{currentUser.role === "her" ? "💖" : "💙"}</span>
            </span>

            <Link
              to="/app/settings"
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card/80 transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground active:scale-95 shadow-xs ${
                pathname === "/app/settings" ? "text-accent border-accent/40 bg-accent/10" : "text-muted-foreground"
              }`}
              aria-label="Notifications and Settings"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card/80 text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground active:scale-95 shadow-xs"
              aria-label="Open More Menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Tab Page Content with Fade + Slide Transition */}
        <main className="flex-1 px-4 pt-4">
          <PrivacyLockOverlay>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="min-h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </PrivacyLockOverlay>
        </main>

        {/* Bottom Tab Bar */}
        <nav
          aria-label="App Navigation"
          className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md border-t border-border/80 bg-card/95 px-3 py-2 backdrop-blur-2xl shadow-panel"
        >
          <div className="flex items-center justify-between">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? pathname === tab.to
                : pathname.startsWith(tab.to);

              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
                    isActive ? "text-accent font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                      isActive ? "bg-accent/15 text-accent" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 transition-transform group-active:scale-90" />
                    {isActive && (
                      <motion.span
                        layoutId="activeTabBadge"
                        className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className="mt-1 text-[10px] tracking-tight">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* PWA Prompts & Dialogs */}
      <PWAInstallPrompt
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        showIOSPrompt={showIOSPrompt}
        setShowIOSPrompt={setShowIOSPrompt}
        onInstall={promptInstall}
      />

      {/* More Features Menu */}
      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        onInstallApp={promptInstall}
        isInstallable={isInstallable}
      />

      {/* Push Notifications First-Time Permission Prompt */}
      <PushPermissionModal
        open={pushPromptOpen}
        onOpenChange={setPushPromptOpen}
      />

      {/* Global Notifications */}
      <Toaster richColors position="top-center" />
    </div>
  );
}
