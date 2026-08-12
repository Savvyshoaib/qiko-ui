import { decryptCalendlyCredentials } from "@/lib/laravelDecrypt";

/**
 * Returns a usable Calendly token.
 * - If `VITE_LARAVEL_DECRYPT_KEY` is present, tries to decrypt Laravel-encrypted payloads.
 * - If decryption fails or no key is set, returns the trimmed original value.
 */
export async function resolveDecryptedCalendlyToken(value: string): Promise<string> {
  const encrypted = value?.trim();
  if (!encrypted) return "";

  const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
  if (!decryptKey) return encrypted;

  try {
    const res = await decryptCalendlyCredentials({ calendly_token: encrypted }, decryptKey);
    return res.calendly_token || encrypted;
  } catch (err) {
    console.error("[Calendly] Failed to decrypt calendly_token:", err);
    return encrypted;
  }
}

