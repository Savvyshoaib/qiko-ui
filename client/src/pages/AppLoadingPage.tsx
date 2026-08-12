import { useEffect } from "react";
import { BRAND_WEBSITE_URL } from "@/constants/brand";

function isSamePageAsLanding(currentHref: string, landingUrl: string): boolean {
  try {
    const current = new URL(currentHref);
    const target = new URL(landingUrl, currentHref);
    const norm = (p: string) => p.replace(/\/+$/, "") || "/";
    return current.origin === target.origin && norm(current.pathname) === norm(target.pathname);
  } catch {
    return false;
  }
}

export default function AppLoadingPage() {
  const landingPageUrl = import.meta.env.VITE_LANDING_PAGE_URL || BRAND_WEBSITE_URL;

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      if (!landingPageUrl) return;
      if (isSamePageAsLanding(window.location.href, landingPageUrl)) {
        return
      };
      window.location.href = landingPageUrl;
    }, 500);

    return () => window.clearTimeout(redirectTimer);
  }, [landingPageUrl]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050810] text-white">
       
    </div>
  );
}
