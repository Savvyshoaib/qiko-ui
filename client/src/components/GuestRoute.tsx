import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type GuestRouteProps = {
  children: ReactNode;
  /** Logged-in users are sent here instead of seeing the guest page */
  redirectTo?: string;
};

/**
 * Guest-only shell: if a session token exists (Redux / localStorage), redirect away.
 * Use on /login so authenticated users land on the app dashboard.
 */
function GuestRoute({ children, redirectTo = "/app" }: GuestRouteProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) setLocation(redirectTo);
  }, [isAuthenticated, loading, redirectTo, setLocation]);

  if (loading || isAuthenticated) return null;
  return <>{children}</>;
}

export default GuestRoute;