import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home page - redirects directly to dashboard
 * No authentication required
 */
export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Go to onboarding flow for new users
    // TODO: Check if user has completed onboarding, if so go to dashboard
    setLocation("/onboarding");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
