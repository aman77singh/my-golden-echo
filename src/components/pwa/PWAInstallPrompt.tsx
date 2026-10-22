import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share2, PlusSquare, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface PWAInstallPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showIOSPrompt: boolean;
  setShowIOSPrompt: (show: boolean) => void;
  onInstall: () => void;
}

export function PWAInstallPrompt({
  isInstallable,
  isInstalled,
  isIOS,
  showIOSPrompt,
  setShowIOSPrompt,
  onInstall,
}: PWAInstallPromptProps) {
  const [dismissed, setDismissed] = React.useState(false);

  // If already installed or dismissed banner, don't show floating banner
  const showBanner = isInstallable && !isInstalled && !dismissed && !isIOS;

  return (
    <>
      {/* Floating Android / Desktop PWA Install Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-accent/30 bg-[#16161f]/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-[#0d0d12] shadow-md shadow-accent/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-sm font-bold text-foreground">Install Our Space</h4>
                <p className="text-xs text-muted-foreground">Add to Home Screen for fullscreen & offline access</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onInstall}
                  className="rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-3.5 py-2 text-xs font-semibold text-[#0d0d12] shadow-md transition-transform active:scale-95"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instruction Sheet / Dialog */}
      <Dialog open={showIOSPrompt} onOpenChange={setShowIOSPrompt}>
        <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-[#0d0d12] shadow-lg shadow-accent/25">
              <Download className="h-7 w-7" />
            </div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight">
              Install Our Space on iOS
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Follow these simple steps in Safari to add Our Space as a standalone app on your home screen:
            </DialogDescription>

            <div className="mt-6 w-full space-y-3.5 text-left text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-xs font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    Located in Safari's bottom toolbar (<Share2 className="inline h-3.5 w-3.5 text-accent" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-xs font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Select "Add to Home Screen"</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    Scroll down and tap <PlusSquare className="inline h-3.5 w-3.5 text-accent" /> <strong className="text-foreground">Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-xs font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Tap "Add" in top-right</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our Space will appear on your home screen like a native app.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSPrompt(false)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2.5 text-sm font-semibold text-[#0d0d12] shadow-md transition-transform active:scale-98"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
