import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, X, ExternalLink } from "lucide-react";

export function MobileBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if dismissed in this session
    if (sessionStorage.getItem("dismissed-mobile-app-banner")) {
      return;
    }

    // Detect mobile device
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isSmallScreen = window.innerWidth < 768;

    if (isMobileUA || isSmallScreen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("dismissed-mobile-app-banner", "true");
  };

  const handleOpenApp = () => {
    window.open("/app", "_blank", "noopener,noreferrer");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-r from-[#1b1a26]/95 via-[#23202e]/95 to-[#1b1a26]/95 border-b border-accent/30 px-4 py-2.5 shadow-xl backdrop-blur-xl"
        aria-label="Phone App banner"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Smartphone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Browsing on your phone?
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Experience our private mobile app "Our Space"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenApp}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-3.5 py-1.5 text-xs font-semibold text-[#0d0d12] shadow-sm transition-transform active:scale-95"
            >
              <span>Open Phone App</span>
              <ExternalLink className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
