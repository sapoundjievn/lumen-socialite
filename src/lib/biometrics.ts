/**
 * Device biometrics / platform authenticator via WebAuthn
 * Fingerprint, Face ID, Touch ID, Windows Hello when the device supports it.
 * Binds this browser/device to the signed-in Supabase session (same device unlock).
 */

const DB = "lumen_bio_v1";
const STORE = "sessions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export function biometricsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
}

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!biometricsSupported()) return false;
    if (
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
    ) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function randomChallenge(): ArrayBuffer {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return a.buffer;
}

/** Call after successful password login to enable fingerprint / Face ID / Windows Hello on this device */
export async function enableBiometricLogin(opts: {
  userId: string;
  email: string;
  access_token: string;
  refresh_token: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!(await platformAuthenticatorAvailable())) {
      return { ok: false, error: "This device has no fingerprint / Face ID / Windows Hello" };
    }
    const challenge = randomChallenge();
    const userIdBytes = new TextEncoder().encode(opts.userId);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Lumen · Socialite", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: opts.email,
          displayName: opts.email,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return { ok: false, error: "Biometric setup cancelled" };

    const rawId = bufToB64(cred.rawId);
    await idbSet("bio", {
      credentialId: rawId,
      userId: opts.userId,
      email: opts.email,
      access_token: opts.access_token,
      refresh_token: opts.refresh_token,
      enabledAt: Date.now(),
    });
    localStorage.setItem("lumen_bio_enabled", "1");
    localStorage.setItem("lumen_bio_email", opts.email);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not enable biometrics" };
  }
}

/** Unlock saved session with fingerprint / Face ID / Windows Hello */
export async function loginWithBiometrics(): Promise<{
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  email?: string;
  error?: string;
}> {
  try {
    if (!(await platformAuthenticatorAvailable())) {
      return { ok: false, error: "Biometrics not available on this device" };
    }
    const saved = await idbGet<{
      credentialId: string;
      access_token: string;
      refresh_token: string;
      email: string;
    }>("bio");
    if (!saved?.refresh_token) {
      return {
        ok: false,
        error: "Enable biometrics once after password sign-in (same device)",
      };
    }

    const challenge = randomChallenge();
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
      },
    });

    if (!assertion) return { ok: false, error: "Biometric cancelled" };

    return {
      ok: true,
      access_token: saved.access_token,
      refresh_token: saved.refresh_token,
      email: saved.email,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Biometric login failed" };
  }
}

export function hasBiometricEnrollment(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("lumen_bio_enabled") === "1";
}
