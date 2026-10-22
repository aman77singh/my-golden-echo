/**
 * Security, WebAuthn Passkeys & PIN Privacy Lock helper for Our Space
 */

const PIN_KEY = "our_space_pin";
const BIOMETRIC_ENABLED_KEY = "our_space_biometric_enabled";
const LOCK_ENABLED_KEY = "our_space_lock_enabled";
const CREDENTIAL_ID_KEY = "our_space_webauthn_credential_id";

export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LOCK_ENABLED_KEY) === "true";
}

export function setLockEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCK_ENABLED_KEY, enabled ? "true" : "false");
}

export function getStoredPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_KEY);
}

export function setStoredPin(pin: string | null): void {
  if (typeof window === "undefined") return;
  if (pin) {
    localStorage.setItem(PIN_KEY, pin);
  } else {
    localStorage.removeItem(PIN_KEY);
  }
}

export function isBiometricEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

export function setBiometricEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
}

/**
 * Register WebAuthn platform authenticator (Face ID / Touch ID / Fingerprint)
 */
export async function registerBiometric(userName: string): Promise<boolean> {
  if (!(await isBiometricsSupported())) {
    throw new Error("Biometric authentication is not supported on this device.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Our Space",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential;

    if (credential && credential.id) {
      localStorage.setItem(CREDENTIAL_ID_KEY, credential.id);
      setBiometricEnabled(true);
      return true;
    }
    return false;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric setup was cancelled or permission denied.");
    }
    throw new Error(err.message || "Failed to configure biometric lock.");
  }
}

/**
 * Authenticate using WebAuthn platform biometric
 */
export async function authenticateBiometric(): Promise<boolean> {
  if (!(await isBiometricsSupported())) return false;

  const credentialId = localStorage.getItem(CREDENTIAL_ID_KEY);
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        allowCredentials: credentialId
          ? [
              {
                id: Uint8Array.from(window.atob(credentialId.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
                  c.charCodeAt(0)
                ),
                type: "public-key",
              },
            ]
          : [],
      },
    });

    return !!assertion;
  } catch {
    return false;
  }
}
