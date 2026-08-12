/** Shared overview field validators for create/edit (real-time + submit). */

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Practical email check — empty is allowed (optional field).
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return ok ? null : "Enter a valid email address";
}

export function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "Enter a valid URL (include https://)";
  }
}

export function validateCurrency(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z]{3}$/.test(trimmed)) {
    return "Use a 3-letter currency code (e.g. GBP)";
  }
  return null;
}

export function validateExtractionConfidence(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return "Confidence must be between 0 and 100";
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Allow digits, spaces, +, -, (), and extension dots — 7+ digits present.
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Enter a valid phone number";
  }
  if (!/^[+\d][\d\s().-]*$/.test(trimmed)) {
    return "Enter a valid phone number";
  }
  return null;
}

export type OverviewFieldErrors = {
  contactEmail?: string;
  contactPhone?: string;
  linkUrl?: string;
  currency?: string;
  extractionConfidence?: string;
};

export function getOverviewFieldErrors(overview: {
  contactEmail: string;
  contactPhone: string;
  linkUrl: string;
  currency: string;
  extractionConfidence: string;
}): OverviewFieldErrors {
  const errors: OverviewFieldErrors = {};
  const email = validateEmail(overview.contactEmail);
  const phone = validatePhone(overview.contactPhone);
  const url = validateUrl(overview.linkUrl);
  const currency = validateCurrency(overview.currency);
  const confidence = validateExtractionConfidence(overview.extractionConfidence);
  if (email) errors.contactEmail = email;
  if (phone) errors.contactPhone = phone;
  if (url) errors.linkUrl = url;
  if (currency) errors.currency = currency;
  if (confidence) errors.extractionConfidence = confidence;
  return errors;
}

export function firstOverviewFieldError(errors: OverviewFieldErrors): string | null {
  return (
    errors.contactEmail ??
    errors.contactPhone ??
    errors.linkUrl ??
    errors.currency ??
    errors.extractionConfidence ??
    null
  );
}
