import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Sparkles,
  MessageSquare,
  HeartHandshake,
  Gift,
  Compass,
  Bell,
  Download,
  Laptop,
  LogOut,
} from "lucide-react";
import { logoutUser } from "@/lib/api";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstallApp: () => void;
  isInstallable: boolean;
}

export function MoreSheet({ open, onOpenChange, onInstallApp, isInstallable }: MoreSheetProps) {
  const menuItems = [
    {
      icon: Calendar,
      title: "Shared Calendar & Countdowns",
      desc: "Milestones, cycle events & live countdown cards",
      badge: "Events",
      to: "/app/calendar",
    },
    {
      icon: Sparkles,
      title: "Gratitude Jar",
      desc: "Daily slips of gratitude & random memory pull",
      badge: "Love",
      to: "/app/gratitude",
    },
    {
      icon: MessageSquare,
      title: "Daily Conversation Starter",
      desc: "Answer privately, revealed once both answer",
      badge: "Prompts",
      to: "/app/conversation",
    },
    {
      icon: HeartHandshake,
      title: "Weekly Check-in",
      desc: "Gentle ratings & one thing to nurture together",
      badge: "Rhythm",
      to: "/app/checkin",
    },
    {
      icon: Gift,
      title: "Surprise Planner",
      desc: "Secret vault visible to you only",
      badge: "Private",
      to: "/app/surprises",
    },
    {
      icon: Compass,
      title: "Date Jar",
      desc: "Add ideas & pick a spontaneous date at random",
      badge: "Adventures",
      to: "/app/datejar",
    },
    {
      icon: Bell,
      title: "Settings, Security & Data",
      desc: "Push alerts, biometrics, data export & quiet hours",
      badge: "Settings",
      to: "/app/settings",
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
            const content = (
              <div
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

            if (item.to) {
              return (
                <Link
                  key={item.title}
                  to={item.to}
                  onClick={() => onOpenChange(false)}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return <div key={item.title}>{content}</div>;
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

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              logoutUser();
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-left transition-colors hover:bg-red-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-red-400">Switch Profile / Log Out</h4>
                <p className="text-[11px] text-muted-foreground">Sign in as Aditi or Aman</p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-400">Log Out →</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
