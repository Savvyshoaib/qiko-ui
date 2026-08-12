import { cn } from "@/lib/utils";

export type FormatDisplayDateOptions = {
  /** Shown when value is missing or not parseable. */
  fallback?: string;
  /** Passed to `Intl` / `Date` formatting (default `en-US` → e.g. `May 5, 2:04 PM`). */
  locale?: string;
};

/**
 * Formats an ISO-8601 instant (e.g. `2026-05-05T08:47:39.000000Z`) for UI display
 * in local time as `May 5, 2:04 PM`.
 */
export function formatDisplayDate(
  value: string | null | undefined,
  options?: FormatDisplayDateOptions
): string {
  const { fallback = "—", locale = "en-US" } = options ?? {};
  if (value == null || String(value).trim() === "") return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;

  const datePart = d.toLocaleDateString(locale, { month: "long", day: "numeric" });
  const timePart = d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

export type DisplayDateProps = {
  value: string | null | undefined;
  fallback?: string;
  locale?: string;
  /** Optional label before the formatted date (e.g. `Created: `). */
  prefix?: string;
  className?: string;
};

/**
 * Renders a formatted date from API ISO strings in local time.
 */
export function DisplayDate({
  value,
  fallback,
  locale,
  prefix,
  className,
}: DisplayDateProps) {
  const formatted = formatDisplayDate(value, { fallback, locale });
  return (
    <span className={cn(className)}>
      {prefix}
      {formatted}
    </span>
  );
}
