/**
 * Laravel Decrypt Utility (Frontend)
 * Supports Laravel AES-256-CBC encryption format:
 * base64(JSON({ iv, value, mac }))
 */

/* =========================
   🔧 Helpers
========================= */

/**
 * Normalize APP_KEY
 * Supports both:
 *  - base64:xxxx
 *  - xxxx
 */
function normalizeKey(key: string): string {
  return key.startsWith("base64:") ? key.slice(7) : key;
}

/**
 * Base64 → Uint8Array (supports URL-safe)
 */
function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Parse Laravel payload
 */
function parsePayload(encrypted: string): {
  iv: string;
  value: string;
  mac: string;
} {
  try {
    const decoded = atob(encrypted.replace(/-/g, "+").replace(/_/g, "/"));
    const json = JSON.parse(decoded);

    if (!json?.iv || !json?.value || !json?.mac) {
      console.log("Invalid payload", json);
      // throw new Error("Invalid payload");
    }

    return json;
  } catch {
    console.log("Invalid Laravel encrypted string");
    // throw new Error("Invalid Laravel encrypted string");
  }
}

/**
 * HMAC SHA256 → HEX
 */
async function hmacSha256Hex(
  message: Uint8Array,
  keyBytes: Uint8Array
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, message);

  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time compare (security)
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/* =========================
   🔐 Core Decrypt Function
========================= */

/**
 * Decrypt Laravel encrypted string
 *
 * @param encrypted - base64 encoded payload
 * @param keyBase64 - Laravel APP_KEY (with or without "base64:")
 */
export async function decryptLaravel(
  encrypted: string,
  keyBase64: string
): Promise<string> {

  // ✅ Normalize key
  const cleanKey = normalizeKey(keyBase64);
  const keyBytes = base64ToBytes(cleanKey);

  if (keyBytes.length !== 32) {
    throw new Error("Invalid key length (must be 32 bytes)");
  }

  // ✅ Parse payload
  const payload = parsePayload(encrypted);
  if(!payload) {
    return encrypted;
  }

  const ivBytes = base64ToBytes(payload.iv);
  const valueBytes = base64ToBytes(payload.value);

  // ✅ Verify MAC (Laravel logic)
  const macMessage = new TextEncoder().encode(
    payload.iv + payload.value
  );

  const expectedMac = await hmacSha256Hex(macMessage, keyBytes);

  if (!safeCompare(expectedMac, payload.mac.toLowerCase())) {
    throw new Error("Decrypt failed: invalid MAC");
  }

  // ✅ AES-256-CBC decrypt
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivBytes },
      cryptoKey,
      valueBytes
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Decryption failed (bad key or corrupted data)");
  }
}

/* =========================
   📦 VAPI Credentials
========================= */

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

export async function decryptVapiCredentials(
  data: EncryptedVapiCredentials,
  keyBase64: string
): Promise<DecryptedVapiCredentials> {

  const [vapi_public_key, vapi_api_key, vapi_assistant_id] =
    await Promise.all([
      data.vapi_public_key
        ? decryptLaravel(data.vapi_public_key, keyBase64)
        : Promise.resolve(""),

      data.vapi_api_key
        ? decryptLaravel(data.vapi_api_key, keyBase64)
        : Promise.resolve(""),

      data.vapi_assistant_id
        ? decryptLaravel(data.vapi_assistant_id, keyBase64)
        : Promise.resolve(""),
    ]);

  return {
    vapi_public_key,
    vapi_api_key,
    vapi_assistant_id,
  };
}

/* =========================
   📅 Calendly Credentials
========================= */

export interface EncryptedCalendlyCredentials {
  calendly_token?: string | null;
}

export interface DecryptedCalendlyCredentials {
  calendly_token: string;
}

export async function decryptCalendlyCredentials(
  data: EncryptedCalendlyCredentials,
  keyBase64: string
): Promise<DecryptedCalendlyCredentials> {

  const calendly_token = data.calendly_token
    ? await decryptLaravel(data.calendly_token, keyBase64)
    : "";

  return { calendly_token };
}

/* =========================
   Slack Credentials
========================= */

export interface EncryptedSlackCredentials {
  slack_token?: string | null;
}

export interface DecryptedSlackCredentials {
  slack_token: string;
}

export async function decryptSlackCredentials(
  data: EncryptedSlackCredentials,
  keyBase64: string
): Promise<DecryptedSlackCredentials> {
  const slack_token = data.slack_token
    ? await decryptLaravel(data.slack_token, keyBase64)
    : "";

  return { slack_token };
}

/* =========================
   ClickUp Credentials
========================= */

export interface EncryptedClickUpCredentials {
  clickup_token?: string | null;
  clickup_list_id?: string | null;
  clickup_team_id?: string | null;
}

export interface DecryptedClickUpCredentials {
  clickup_token: string;
  clickup_list_id: string;
  clickup_team_id: string;
}

export async function decryptClickUpCredentials(
  data: EncryptedClickUpCredentials,
  keyBase64: string
): Promise<DecryptedClickUpCredentials> {
  const clickup_token = data.clickup_token
    ? await decryptLaravel(data.clickup_token, keyBase64)
    : "";

  return {
    clickup_token,
    clickup_list_id: data.clickup_list_id?.trim() ?? "",
    clickup_team_id: data.clickup_team_id?.trim() ?? "",
  };
}