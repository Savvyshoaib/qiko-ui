import { getLoginUrl } from "@/const";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth, initFromStorage } from "@/store/slices/authSlice";
import { logoutAvatar } from "@/lib/avatarApi";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type User = {
  id: string;
  email: string;
  name?: string;
  [key: string]: unknown;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  const dispatch = useAppDispatch();
  const { token, userInfo } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Derive user from Redux userInfo
  const user: User | null = userInfo
    ? {
        id: userInfo.id ?? "",
        email: userInfo.email ?? "",
        name: userInfo.name ?? userInfo.user_name,
        ...userInfo,
      }
    : null;

  // ---------------------------
  // Init from localStorage on mount (e.g. page refresh)
  // ---------------------------
  const fetchMe = useCallback(async () => {
    setLoading(true);
    dispatch(initFromStorage());
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // ---------------------------
  // Logout (/auth/logout)
  // ---------------------------
  const logout = useCallback(async () => {
    try {
      setLogoutLoading(true);
      await logoutAvatar();
    } catch {
      // Continue with local logout even if API fails
    } finally {
      dispatch(clearAuth());
      localStorage.removeItem("user-info");
      setLogoutLoading(false);
    }
  }, [dispatch]);

  // ---------------------------
  // Derived Auth State
  // ---------------------------
  const state = useMemo(() => ({
    user,
    loading: loading || logoutLoading,
    error,
    isAuthenticated: Boolean(token),
  }), [user, token, loading, logoutLoading, error]);

  // ---------------------------
  // Redirect if unauthenticated
  // ---------------------------
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;

    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state]);

  // ---------------------------
  // Return Hook API
  // ---------------------------
  return {
    ...state,
    refresh: fetchMe,
    logout,
  };
}
