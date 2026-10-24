import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Moon,
  Clock,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Lock,
  Fingerprint,
  Download,
  Trash2,
  Key,
  Eye,
  Heart,
  User as UserIcon,
  LogOut,
  Camera,
  X,
} from "lucide-react";
import { logoutUser, setStoredUser } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiClient, getStoredUser } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  isIosDevice,
  isStandalonePwa,
} from "@/lib/pushNotifications";
import {
  isLockEnabled,
  setLockEnabled,
  getStoredPin,
  setStoredPin,
  isBiometricsSupported,
  isBiometricEnabled,
  registerBiometric,
  setBiometricEnabled,
} from "@/lib/security";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { INotificationPrefs, IQuietHours, IRemindersConfig, IUser } from "@/types/shared";
import { compressImage, uploadImage } from "@/lib/mediaUpload";

interface PrefsResponse {
  timezone: string;
  notificationPrefs: INotificationPrefs;
  quietHours: IQuietHours;
  reminders: IRemindersConfig;
}

interface SettingsScreenProps {
  onBack?: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const queryClient = useQueryClient();
  const [isPushActive, setIsPushActive] = React.useState<boolean>(false);
  const [pushLoading, setPushLoading] = React.useState<boolean>(false);

  // Security Lock states
  const [appLockActive, setAppLockActive] = React.useState(isLockEnabled());
  const [pinModalOpen, setPinModalOpen] = React.useState(false);
  const [pinValue, setPinValue] = React.useState("");
  const [biometricsAvailable, setBiometricsAvailable] = React.useState(false);
  const [biometricActive, setBiometricActive] = React.useState(isBiometricEnabled());
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [avatarLoading, setAvatarLoading] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const isIOS = isIosDevice();
  const isStandalone = isStandalonePwa();
  const currentUser = getStoredUser();

  // Check browser push and biometrics
  React.useEffect(() => {
    getCurrentPushSubscription().then((sub) => {
      setIsPushActive(!!sub);
    });
    isBiometricsSupported().then((supported) => {
      setBiometricsAvailable(supported);
    });
  }, []);

  // Fetch current user notification preferences
  const { data: prefs } = useQuery<PrefsResponse>({
    queryKey: ["notificationPrefs"],
    queryFn: async () => {
      const res = await apiClient.get<PrefsResponse>("/push/prefs");
      return res.data;
    },
  });

  // Fetch user profile
  const { data: userProfile } = useQuery<IUser>({
    queryKey: ["myProfile"],
    queryFn: async () => {
      const res = await apiClient.get<IUser>("/me");
      return res.data;
    },
  });

  // Mutation to update preferences
  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<PrefsResponse>) => {
      const res = await apiClient.patch<PrefsResponse>("/push/prefs", updated);
      return res.data;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["notificationPrefs"], newData);
      triggerHaptic("success");
      toast.success("Preferences saved ✨");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update preferences.");
    },
  });

  // Privacy shareCycle toggle mutation
  const privacyMutation = useMutation({
    mutationFn: async (shareCycle: boolean) => {
      const res = await apiClient.patch("/me/privacy", { shareCycle });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      triggerHaptic("success");
      toast.success("Privacy preferences updated ✨");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update privacy.");
    },
  });

  const handleTogglePush = async () => {
    setPushLoading(true);
    triggerHaptic("selection");
    try {
      if (isPushActive) {
        await unsubscribeFromPushNotifications();
        setIsPushActive(false);
        toast.info("Notifications turned off on this device.");
      } else {
        const res = await subscribeToPushNotifications();
        if (res.success) {
          setIsPushActive(true);
          toast.success("Push notifications enabled ✨");
        } else if (res.status === "ios_home_screen_required") {
          toast.info("Add Our Space to your Home Screen first to enable alerts on iOS.");
        } else {
          toast.error(res.error || "Failed to subscribe.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error updating push subscription.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    try {
      triggerHaptic("selection");
      const { data } = await apiClient.post<{
        result: {
          sent: number;
          failed?: number;
          skipped?: string;
          simulated?: boolean;
        };
      }>("/push/test", {});
      const result = data.result;

      if (result.simulated) {
        toast.warning("Push was simulated. The server's VAPID keys are not configured.");
      } else if (result.sent > 0 && !result.failed) {
        toast.success("Push sent to your device. Check Notification Center.");
      } else if (result.failed) {
        toast.error("The push service could not deliver the test alert. Please try again.");
      } else if (result.skipped === "no_subscriptions") {
        toast.error("This account has no registered device. Enable push on this iPhone first.");
      } else if (result.skipped === "vapid_not_configured") {
        toast.error("Push notifications are not configured on the server.");
      } else {
        toast.error(`Test push was not sent (${result.skipped || "unknown reason"}).`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test push.");
    }
  };

  const updateCategory = (key: keyof INotificationPrefs, val: boolean) => {
    if (!prefs) return;
    triggerHaptic("selection");
    updateMutation.mutate({
      notificationPrefs: {
        ...prefs.notificationPrefs,
        [key]: val,
      },
    });
  };

  const updateQuietHours = (field: keyof IQuietHours, val: any) => {
    if (!prefs) return;
    triggerHaptic("selection");
    updateMutation.mutate({
      quietHours: {
        ...prefs.quietHours,
        [field]: val,
      },
    });
  };

  const updateReminders = (field: keyof IRemindersConfig, val: any) => {
    if (!prefs) return;
    triggerHaptic("selection");
    updateMutation.mutate({
      reminders: {
        ...prefs.reminders,
        [field]: val,
      },
    });
  };

  const handleLockToggle = (checked: boolean) => {
    triggerHaptic("selection");
    if (checked && !getStoredPin()) {
      setPinModalOpen(true);
    } else {
      setLockEnabled(checked);
      setAppLockActive(checked);
      toast.success(checked ? "Sanctuary Lock enabled 🔒" : "App Lock disabled");
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue.length !== 4) {
      toast.error("PIN must be 4 digits.");
      return;
    }
    setStoredPin(pinValue);
    setLockEnabled(true);
    setAppLockActive(true);
    setPinModalOpen(false);
    setPinValue("");
    triggerHaptic("success");
    toast.success("Security PIN configured successfully 🔒");
  };

  const handleSetupBiometrics = async () => {
    try {
      triggerHaptic("selection");
      const success = await registerBiometric(currentUser?.name || "User");
      if (success) {
        setBiometricActive(true);
        setLockEnabled(true);
        setAppLockActive(true);
        triggerHaptic("success");
        toast.success("Biometrics (Face ID / Touch ID) enabled! ✨");
      }
    } catch (err: any) {
      toast.error(err?.message || "Biometrics setup failed.");
    }
  };

  const handleExportData = async () => {
    try {
      triggerHaptic("selection");
      const res = await apiClient.get<any>("/me/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `our-space-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      triggerHaptic("success");
      toast.success("Couple archive downloaded ✨");
    } catch (err: any) {
      toast.error(err?.message || "Export failed.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      triggerHaptic("heavy");
      await apiClient.delete("/me");
      toast.success("Account and data deleted.");
      localStorage.clear();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete account.");
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for your profile photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image smaller than 10 MB.");
      return;
    }

    setAvatarLoading(true);
    try {
      const compressedImage = await compressImage(file, 512, 0.78);
      const avatarUrl = await uploadImage(compressedImage);
      const response = await apiClient.patch<{ user: { avatarUrl?: string } }>("/me/avatar", { avatarUrl });
      const updatedAvatarUrl = response.data.user.avatarUrl;
      queryClient.setQueryData<IUser>(["myProfile"], (old) =>
        old ? { ...old, avatarUrl: updatedAvatarUrl } : old
      );
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      if (currentUser) {
        setStoredUser({ ...currentUser, avatarUrl: updatedAvatarUrl });
      }
      triggerHaptic("success");
      toast.success("Profile photo saved ✨");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save your profile photo.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    try {
      const response = await apiClient.patch<{ user: { avatarUrl?: string } }>("/me/avatar", { avatarUrl: "" });
      const updatedAvatarUrl = response.data.user.avatarUrl;
      queryClient.setQueryData<IUser>(["myProfile"], (old) =>
        old ? { ...old, avatarUrl: updatedAvatarUrl } : old
      );
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      if (currentUser) {
        setStoredUser({ ...currentUser, avatarUrl: updatedAvatarUrl });
      }
      triggerHaptic("success");
      toast.success("Profile photo removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove your profile photo.");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/70 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Settings & Privacy
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Notifications, biometrics & data control
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                aria-label={userProfile?.avatarUrl ? "Change profile photo" : "Add profile photo"}
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-white font-bold text-base shadow-sm disabled:opacity-60"
              >
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  currentUser?.name?.[0] || "U"
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-accent text-white">
                {avatarLoading ? <span className="text-[9px]">…</span> : <Camera className="h-3 w-3" />}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground">
                  {userProfile?.name || currentUser?.name || "Partner"}
                </h3>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-bold text-accent uppercase">
                  {userProfile?.role || currentUser?.role || "partner"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {userProfile?.email || currentUser?.email || "ourspace.local"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="text-[10px] font-semibold text-accent disabled:opacity-60"
                >
                  {avatarLoading ? "Saving photo…" : userProfile?.avatarUrl ? "Change photo" : "Add photo"}
                </button>
                {userProfile?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarLoading}
                    className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground disabled:opacity-60"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & App Lock (WebAuthn Biometrics & PIN) */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#E5A962]" />
            <div>
              <h3 className="text-xs font-semibold text-foreground">Privacy Lock</h3>
              <p className="text-[10px] text-muted-foreground">
                Lock sanctuary behind PIN or Face ID / Touch ID
              </p>
            </div>
          </div>
          <Switch checked={appLockActive} onCheckedChange={handleLockToggle} />
        </div>

        {appLockActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-2 border-t border-border/60 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">4-Digit Passcode</span>
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-card"
              >
                <Key className="h-3 w-3 text-accent" />
                <span>{getStoredPin() ? "Change PIN" : "Set PIN"}</span>
              </button>
            </div>

            {biometricsAvailable && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-foreground">Biometrics (Face ID / Fingerprint)</span>
                <button
                  type="button"
                  onClick={handleSetupBiometrics}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    biometricActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
                  }`}
                >
                  <Fingerprint className="h-3.5 w-3.5" />
                  <span>{biometricActive ? "Enabled" : "Enable"}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Privacy Toggles */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#E07A5F]" />
          <div>
            <h3 className="text-xs font-semibold text-foreground">Cycle Privacy</h3>
            <p className="text-[10px] text-muted-foreground">
              Cycle data is shared automatically. You can turn this off anytime.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="text-xs text-foreground">Share Cycle Data</span>
          <Switch
            checked={userProfile?.shareCycle ?? false}
            onCheckedChange={(checked) => privacyMutation.mutate(checked)}
          />
        </div>
      </div>

      {/* Web Push Status */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                isPushActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {isPushActive ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">
                {isPushActive ? "Web Push Active" : "Web Push Inactive"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isPushActive
                  ? "This device is registered to receive alerts"
                  : "Enable push to receive love pings and updates"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              isPushActive
                ? "border border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
                : "bg-gradient-to-r from-[#E5A962] to-[#E07A5F] text-white shadow-sm shadow-accent/20"
            }`}
          >
            {pushLoading ? "Updating..." : isPushActive ? "Disable" : "Enable"}
          </button>
        </div>

        {isPushActive && (
          <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
            <button
              type="button"
              onClick={handleTestPush}
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              <Send className="h-3 w-3" />
              Send Test Alert
            </button>
          </div>
        )}

        {isIOS && !isStandalone && (
          <p className="mt-3 text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
            iPhone Notice: Tap Safari Share → "Add to Home Screen" to enable notifications on iOS.
          </p>
        )}
      </div>

      {/* Notification Categories */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notification Types
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Chat & Love Notes</p>
              <p className="text-[10px] text-muted-foreground">Messages, photos, voice notes & pings</p>
            </div>
            <Switch
              checked={prefs?.notificationPrefs?.messages ?? true}
              onCheckedChange={(checked) => updateCategory("messages", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Daily Progress & Cheers</p>
              <p className="text-[10px] text-muted-foreground">When partner logs progress or cheers</p>
            </div>
            <Switch
              checked={prefs?.notificationPrefs?.progress ?? true}
              onCheckedChange={(checked) => updateCategory("progress", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Thoughts & Insecurities</p>
              <p className="text-[10px] text-muted-foreground">Shared vulnerabilities & gentle responses</p>
            </div>
            <Switch
              checked={prefs?.notificationPrefs?.thoughts ?? true}
              onCheckedChange={(checked) => updateCategory("thoughts", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Cycle & Comfort Alerts</p>
              <p className="text-[10px] text-muted-foreground">2-day period warnings and care tips</p>
            </div>
            <Switch
              checked={prefs?.notificationPrefs?.cycle ?? true}
              onCheckedChange={(checked) => updateCategory("cycle", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Gentle Reminders</p>
              <p className="text-[10px] text-muted-foreground">Evening progress check-ins and Sunday wrap</p>
            </div>
            <Switch
              checked={prefs?.notificationPrefs?.reminders ?? true}
              onCheckedChange={(checked) => updateCategory("reminders", checked)}
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-[#E5A962]" />
            <div>
              <h3 className="text-xs font-semibold text-foreground">Quiet Hours</h3>
              <p className="text-[10px] text-muted-foreground">
                Silence non-urgent notifications during sleep
              </p>
            </div>
          </div>
          <Switch
            checked={prefs?.quietHours?.enabled ?? false}
            onCheckedChange={(checked) => updateQuietHours("enabled", checked)}
          />
        </div>

        {prefs?.quietHours?.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-2 gap-3 pt-2"
          >
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Start Time</label>
              <input
                type="time"
                value={prefs?.quietHours?.start || "22:00"}
                onChange={(e) => updateQuietHours("start", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">End Time</label>
              <input
                type="time"
                value={prefs?.quietHours?.end || "08:00"}
                onChange={(e) => updateQuietHours("end", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Scheduled Reminders & Timezone */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#E07A5F]" />
          <div>
            <h3 className="text-xs font-semibold text-foreground">Evening Reminder Time</h3>
            <p className="text-[10px] text-muted-foreground">
              Nudge if you haven't posted daily progress
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-foreground">Reminder Hour</span>
          <select
            value={prefs?.reminders?.eveningProgressHour ?? 20}
            onChange={(e) => updateReminders("eveningProgressHour", Number(e.target.value))}
            className="rounded-xl border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <option key={i} value={i} className="bg-card text-foreground">
                {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>Timezone</span>
          </div>
          <span className="text-xs font-mono text-accent">
            {prefs?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"}
          </span>
        </div>
      </div>

      {/* Data Export & Account Deletion */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data & Privacy Freedom
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleExportData}
            className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 text-left transition-colors hover:border-border/80"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-medium text-foreground">Download Archive (JSON)</p>
                <p className="text-[10px] text-muted-foreground">
                  Export complete records of moods, messages, thoughts & photos
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-accent">Export →</span>
          </button>

          <button
            type="button"
            onClick={logoutUser}
            className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/80 p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/10"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-medium text-foreground">Switch Profile / Log Out</p>
                <p className="text-[10px] text-muted-foreground">
                  Switch between Aditi and Aman accounts
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-accent">Switch →</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left transition-colors hover:bg-red-500/10"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-xs font-medium text-red-400">Delete Account & Data</p>
                <p className="text-[10px] text-muted-foreground">
                  Permanently wipe account and personal subscriptions
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-400">Delete →</span>
          </button>
        </div>
      </div>

      {/* PIN Setup Dialog */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="border-border/70 bg-card/95 text-foreground backdrop-blur-2xl sm:max-w-md shadow-panel">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Set 4-Digit Passcode 🔒
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-serif italic">
              Enter a 4-digit PIN to lock your sanctuary.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 pt-2">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center tracking-[1em] text-2xl font-mono rounded-xl border border-border/70 bg-background/60 py-3 text-foreground focus:border-accent focus:outline-none"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pinValue.length !== 4}
                className="rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition-all disabled:opacity-40"
              >
                Save PIN
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-red-500/30 bg-card/95 text-foreground backdrop-blur-2xl sm:max-w-md shadow-panel">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-red-400">
              Delete Account & Records?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action is irreversible. All your personal data and push subscriptions will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-xl border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="rounded-xl bg-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-red-500/20 hover:bg-red-600 transition-colors"
            >
              Confirm Deletion
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
