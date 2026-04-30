const ALGO = "AES-GCM";
const KEY_LENGTH = 256;

async function getDerivedKey(): Promise<CryptoKey> {
  // Derive a stable key from the browser fingerprint + a fixed salt
  const raw = new TextEncoder().encode(
    navigator.userAgent + "hc-ai-playground-secret-v1"
  );
  const baseKey = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("hc-salt-v1"), iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Combine iv + ciphertext, encode as base64
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(ciphertext: string): Promise<string> {
  if (!ciphertext) return "";
  try {
    const key = await getDerivedKey();
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
}
