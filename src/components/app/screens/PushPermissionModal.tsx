import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Heart, Share, PlusSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  isIosDevice,
  isStandalonePwa,
  subscribeToPushNotifications,
  isPushNotificationSupported,
} from "@/lib/pushNotifications";

interface PushPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PushPermissionModal({
  open,
  onOpenChange,
  onSuccess,
}: PushPermissionModalProps) {
  const [loading, setLoading] = React.useState(false);
  const isIOS = isIosDevice();
  const isStandalone = isStandalonePwa();
  const isSupported = isPushNotificationSupported();

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await subscribeToPushNotifications();

      if (res.success) {
        toast.success("Notifications enabled! You'll never miss each other's moments ✨");
        localStorage.setItem("has_seen_push_prompt", "true");
        onOpenChange(false);
        onSuccess?.();
      } else if (res.status === "ios_home_screen_required") {
        toast.info("Add Our Space to your Home Screen first to enable notifications on iOS.");
      } else if (res.status === "denied") {
        toast.error("Notification permission was denied. You can enable it anytime in browser settings.");
        localStorage.setItem("has_seen_push_prompt", "true");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Could not enable notifications.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to subscribe.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("has_seen_push_prompt", "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962]/20 to-[#E07A5F]/20 text-accent mb-2">
            <Bell className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Stay Close, Anywhere ✨
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Get soft, caring alerts whenever your partner sends love, cheers your progress, or shares a thought.
          </DialogDescription>
        </DialogHeader>

        {/* Feature Highlights */}
        <div className="my-3 space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-foreground/90">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-[#E5A962] shrink-0" />
            <span>Instant "Thinking of you" pings and love notes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#E07A5F] shrink-0" />
            <span>Celebrations and cheers when daily goals are reached</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Gentle check-ins with full quiet hours control</span>
          </div>
        </div>

        {/* iOS Home Screen Notice if on iPhone/iPad in Safari */}
        {isIOS && !isStandalone && (
          <div className="rounded-2xl border border-[#E5A962]/30 bg-[#E5A962]/10 p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Share className="h-4 w-4 text-[#E5A962] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">iOS Notice: Add to Home Screen First</p>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Apple requires PWAs to be installed on your Home Screen for push notifications:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-muted-foreground pt-1 space-y-0.5">
                  <li>Tap Safari's <span className="font-semibold text-foreground">Share</span> button below</li>
                  <li>Select <span className="font-semibold text-foreground">"Add to Home Screen"</span></li>
                  <li>Open Our Space from your Home Screen to enable alerts</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {(!isIOS || isStandalone) && (
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading || !isSupported}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2.5 text-xs font-semibold text-[#0d0d12] shadow-md shadow-accent/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Enabling notifications..." : "Turn on Notifications"}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
