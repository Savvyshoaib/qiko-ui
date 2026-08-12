/**
 * Decrypt Laravel-encrypted strings in the browser (React/frontend).
 * Matches Laravel's Encrypter: AES-256-CBC, payload = base64(JSON({ iv, value, mac })).
 *
 * React usage:
 *   import { decryptVapiCredentials } from "@/lib/laravelDecrypt";
 *
 *   const key = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string; // base64 part (after "base64:" in APP_KEY)
 *   const res = await fetch(`/avatar/agent/${agentId}/vapi-credentials`, { headers: { Authorization: `Bearer ${token}` } });
 *   const { data } = await res.json();
 *   const keys = await decryptVapiCredentials(data, key);
 *   // keys.vapi_public_key, keys.vapi_api_key, keys.vapi_assistant_id
 *
 * Security: Prefer a dedicated frontend decryption key; avoid exposing APP_KEY in production.
 */

/**
 * Decode base64 to Uint8Array (URL-safe or standard).
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Parse Laravel encrypted payload: base64 -> JSON -> { iv, value, mac }.
 */
function parsePayload(encrypted: string): { iv: string; value: string; mac: string } {
  const decoded = atob(encrypted.replace(/-/g, "+").replace(/_/g, "/"));
  console.log(">> encrypted", encrypted);
  console.log("<< decoded", decoded);
  const json = JSON?.parse(decoded);
  if (!json.iv || !json.value || !json.mac) throw new Error("Invalid Laravel payload");
  return json;
}

/**
 * HMAC-SHA256 (message and key as Uint8Array), return hex.
 */
async function hmacSha256Hex(message: Uint8Array, keyBytes: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, message);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decrypt one Laravel-encrypted string.
 * @param encrypted - Full encrypted string (base64 from API).
 * @param keyBase64 - Decryption key as base64 (e.g. APP_KEY without "base64:" prefix).
 */
export async function decryptLaravel(encrypted: string, keyBase64: string): Promise<string> {
  const keyString = keyBase64.replace(/^base64:/, "");
  const keyBytes = base64ToBytes(keyString);
  // if (keyBytes.length !== 32) throw new Error("Key must be 32 bytes (base64 decoded)");

  const payload = parsePayload(encrypted);
  const ivBytes = base64ToBytes(payload.iv);
  const valueBytes = base64ToBytes(payload.value);

  // MAC: Laravel uses HMAC-SHA256( iv_base64 + value_base64, key )
  const macMessage = new TextEncoder().encode(payload.iv + payload.value);
  const expectedMac = await hmacSha256Hex(macMessage, keyBytes);
  const macLower = payload.mac.toLowerCase();
  if (expectedMac.toLowerCase() !== macLower) throw new Error("Decrypt failed: invalid MAC");

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv: ivBytes }, cryptoKey, valueBytes);

  return new TextDecoder().decode(decrypted);
}

export interface EncryptedVapiCredentials {
  vapi_public_key?: string | null;
  vapi_api_key?: string | null;
  vapi_assistant_id?: string | null;
}

export interface DecryptedVapiCredentials {
  vapi_public_key: string;
  vapi_api_key: string;
  vapi_assistant_id: string;
}

/**
 * Decrypt all VAPI credential fields from API response.
 * @param data - { vapi_public_key, vapi_api_key, vapi_assistant_id } (encrypted strings).
 * @param keyBase64 - Decryption key (base64).
 */
export async function decryptVapiCredentials(
  data: EncryptedVapiCredentials,
  keyBase64: string,
): Promise<DecryptedVapiCredentials> {
  const [vapi_public_key, vapi_api_key, vapi_assistant_id] = await Promise.all([
    data.vapi_public_key ? decryptLaravel(data.vapi_public_key, keyBase64) : Promise.resolve(""),
    data.vapi_api_key ? decryptLaravel(data.vapi_api_key, keyBase64) : Promise.resolve(""),
    data.vapi_assistant_id ? decryptLaravel(data.vapi_assistant_id, keyBase64) : Promise.resolve(""),
  ]);

  return { vapi_public_key, vapi_api_key, vapi_assistant_id };
}

export interface EncryptedCalendlyCredentials {
  calendly_token?: string | null;
}

export interface DecryptedCalendlyCredentials {
  calendly_token: string;
}

/**
 * Decrypt Calendly-related credentials from API/userInfo response.
 * @param data - { calendly_token } (encrypted string).
 * @param keyBase64 - Decryption key (base64).
 */
export async function decryptCalendlyCredentials(
  data: EncryptedCalendlyCredentials,
  keyBase64: string,
): Promise<DecryptedCalendlyCredentials> {
  const calendly_token = data.calendly_token
    ? await decryptLaravel(data.calendly_token, keyBase64)
    : "";

  return { calendly_token };
}

