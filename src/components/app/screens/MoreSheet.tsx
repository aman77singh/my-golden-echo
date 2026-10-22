import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  Target,
  StickyNote,
  Calendar,
  Download,
  Laptop,
  LogOut,
  Sparkles,
  Bell,
  X,
} from "lucide-react";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstallApp: () => void;
  isInstallable: boolean;
}

export function MoreSheet({ open, onOpenChange, onInstallApp, isInstallable }: MoreSheetProps) {
  const menuItems = [
    {
      icon: Heart,
      title: "Mood Tracker & Vibe History",
      desc: "Daily energy and emotional check-in history",
      badge: "Vibe",
    },
    {
      icon: Target,
      title: "Shared Goals & Bucket List",
      desc: "Dreams, trips, and milestones we are saving for",
      badge: "Goals",
    },
    {
      icon: StickyNote,
      title: "Love Notes & Sticky Box",
      desc: "Sweet surprises left for each other anytime",
      badge: "Notes",
    },
    {
      icon: Calendar,
      title: "Anniversary & Special Dates",
      desc: "Upcoming dates, countdowns & reminders",
      badge: "Dates",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-base font-bold text-foreground">
                More Features
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Our Space Couple Toolkit
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-3 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-accent/40 hover:bg-accent/5 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions & Utilities */}
        <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
          {isInstallable && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onInstallApp();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-accent/40 bg-gradient-to-r from-[#E5A962]/10 to-[#E07A5F]/10 p-3 text-left transition-colors hover:bg-accent/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-accent">Install Our Space App</h4>
                  <p className="text-[11px] text-muted-foreground">Add to Home Screen for fullscreen</p>
                </div>
              </div>
              <span className="text-xs font-bold text-accent">Install →</span>
            </button>
          )}

          <a
            href="/"
            className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
                <Laptop className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Open Keepsake Website</h4>
                <p className="text-[11px] text-muted-foreground">Return to the cinematic portfolio</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Visit →</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
