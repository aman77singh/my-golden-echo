/**
 * Haptic feedback utility using Web Vibration API where supported.
 * Falls back silently on unsupported devices/browsers.
 */

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "selection";

export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    switch (type) {
      case "light":
      case "selection":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(35);
        break;
      case "success":
        navigator.vibrate([15, 40, 20]);
        break;
      case "warning":
        navigator.vibrate([30, 50, 30]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Ignore any browser vibration permission errors
  }
}
