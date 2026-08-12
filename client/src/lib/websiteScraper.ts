import { appFetch } from "@/data/appFetch";
/**
 * Website text scraper (homepage only).
 * Fetches HTML via CORS proxies, parses and cleans to plain text for API payload.
 */

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const JUNK_PATTERNS = [
  /^(var|const|let)\s+/i,
  /^function\s*\(/i,
  /^window\./i,
  /^document\./i,
  /^jQuery\(/i,
  /^\$\(/,
  /^@import\s+/i,
  /^\/\/#\s*sourceURL/i,
  /^#\s*sourceURL/i,
  /^\/\*!/,
  /^\{.*\}$/,
  /^\[.*\]$/,
  /[{};]{2,}/,
  /wp-json|elementor|uicore|emoji|nonce|ajaxurl|prefetch/i,
  /^home\s+about\s+services\s+contact$/i,
];

function isLikelyCodeOrJunk(line: string): boolean {
  if (!line) return true;
  if (line.length < 2) return true;
  return JUNK_PATTERNS.some((pattern) => pattern.test(line));
}

function cleanupParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const raw of paragraphs) {
    const line = normalizeWhitespace(raw);
    if (isLikelyCodeOrJunk(line)) continue;

    const key = line.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    clean.push(line);
  }

  return clean;
}

/**
 * Parse HTML and extract clean text from headings, paragraphs, list items.
 */
export function cleanWebsiteText(html: string): string {
  if (typeof DOMParser === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  if (!doc.body) return "";

  const body = doc.body.cloneNode(true) as HTMLElement;

  body
    .querySelectorAll(
      "script, style, noscript, template, svg, canvas, iframe, form, button, input, select, option, textarea, label, header, footer, nav"
    )
    .forEach((el) => el.remove());

  const blockNodes = body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li");
  let paragraphs = Array.from(blockNodes).map((el) => el.textContent || "");

  if (!paragraphs.length) {
    paragraphs = (body.innerText || "").split(/\r?\n/);
  }

  return cleanupParagraphs(paragraphs).join("\n\n");
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) =>
    `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`,
];

/**
 * Fetch HTML for a URL using CORS proxies.
 */
export async function fetchWebsiteHTML(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const toProxyUrl of CORS_PROXIES) {
    try {
      const endpoint = toProxyUrl(url);
      const res = await appFetch(endpoint);

      if (!res.ok) {
        throw new Error(`Proxy failed (${res.status})`);
      }

      const text = await res.text();
      if (!text?.trim()) {
        throw new Error("Empty response");
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `Scraping failed for ${url}. ${lastError?.message ?? "All proxy attempts failed."}`
  );
}

/**
 * Scrape a website URL (homepage): fetch HTML and return cleaned text for API payload.
 */
export async function scrapeWebsite(url: string): Promise<string> {
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const html = await fetchWebsiteHTML(normalizedUrl);
  const cleaned = cleanWebsiteText(html);
  return cleaned || "No clean text found.";
}
