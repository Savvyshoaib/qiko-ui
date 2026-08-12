import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CurrentSubscription } from '@/lib/avatarApi';
import { clearCrossSiteLoggedInCookie, setCrossSiteLoggedInCookie } from '@/lib/crossSiteAuthCookie';

const TOKEN_KEY = 'qiko_session_token';
const USER_INFO_KEY = 'qiko_user_info';
const SUBSCRIPTION_KEY = 'qiko_subscription';
const CALENDLY_TOKEN_KEY = 'qiko_calendly_token';

export interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
  user_name?: string;
  team_member_role?: string;
  [key: string]: unknown;
}

interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
  subscription: CurrentSubscription | null;
  calendlyToken: string | null;
}

function withViewerPermission(userInfo: UserInfo | null): UserInfo | null {
  if (!userInfo) return null;
  return {
    ...userInfo,
    // team_member_role: 'editor',
  };
}

function loadFromStorage(): AuthState {
  if (typeof window === 'undefined') {
    return { token: null, userInfo: null, subscription: null, calendlyToken: null };
  }
  const token = localStorage.getItem(TOKEN_KEY);
  const userInfoRaw = localStorage.getItem(USER_INFO_KEY);
  let userInfo: UserInfo | null = null;
  if (userInfoRaw) {
    try {
      userInfo = withViewerPermission(JSON.parse(userInfoRaw) as UserInfo);
    } catch {
      // ignore parse error
    }
  }
  let subscription: CurrentSubscription | null = null;
  try {
    const subRaw = localStorage.getItem(SUBSCRIPTION_KEY);
    if (subRaw) {
      const parsed = JSON.parse(subRaw) as CurrentSubscription;
      if (parsed && typeof parsed === 'object') subscription = parsed;
    }
  } catch {
    // ignore parse error
  }
  const calendlyToken = localStorage.getItem(CALENDLY_TOKEN_KEY);
  return { token, userInfo, subscription, calendlyToken };
}

const initialState: AuthState = loadFromStorage();

function persistToStorage(token: string | null, userInfo: UserInfo | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    setCrossSiteLoggedInCookie();
  } else {
    localStorage.removeItem(TOKEN_KEY);
    clearCrossSiteLoggedInCookie();
  }
  // If token is being cleared (logout), also clear cached user info.
  if (!token) {
    localStorage.removeItem(USER_INFO_KEY);
    return;
  }

  // If userInfo is provided but qiko_user_info already exists, do not overwrite it.
  // This prevents flows like "create avatar while already logged in" from clobbering user info.
  if (userInfo) {
    const existingUserInfo = localStorage.getItem(USER_INFO_KEY);
    if (!existingUserInfo) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    }
  }
}

function persistUserInfo(userInfo: UserInfo | null) {
  if (typeof window === "undefined") return;
  if (userInfo) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  } else {
    localStorage.removeItem(USER_INFO_KEY);
  }
}

function persistCalendlyToken(value: string | null) {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem(CALENDLY_TOKEN_KEY, value);
  } else {
    localStorage.removeItem(CALENDLY_TOKEN_KEY);
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ token: string; userInfo: UserInfo | null }>) => {
      const wasAuthenticated = Boolean(state.token);
      state.token = action.payload.token;
      const userInfo = withViewerPermission(action.payload.userInfo);

      // Only update redux userInfo when transitioning from logged-out -> logged-in.
      if (!wasAuthenticated) {
        state.userInfo = userInfo;
      }
      persistToStorage(action.payload.token, userInfo);
    },
    setSubscription: (state, action: PayloadAction<CurrentSubscription | null>) => {
      state.subscription = action.payload;
      if (typeof window !== 'undefined') {
        if (action.payload) {
          try {
            localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(action.payload));
          } catch {
            // ignore quota etc.
          }
        } else {
          localStorage.removeItem(SUBSCRIPTION_KEY);
        }
      }
    },
    setCalendlyToken: (state, action: PayloadAction<string | null>) => {
      state.calendlyToken = action.payload;
      persistCalendlyToken(action.payload);
    },
    setUserInfo: (state, action: PayloadAction<UserInfo | null>) => {
      state.userInfo = withViewerPermission(action.payload);
      persistUserInfo(state.userInfo);
    },
    /**
     * Public/public-chat pages only need to store caller identity.
     * We reuse `auth.userInfo` storage, but keep a dedicated action name.
     */
    setChatUserInfo: (state, action: PayloadAction<UserInfo | null>) => {
      state.userInfo = withViewerPermission(action.payload);
      persistUserInfo(state.userInfo);
    },
    clearAuth: (state) => {
      state.token = null;
      state.userInfo = null;
      state.subscription = null;
      state.calendlyToken = null;
      persistToStorage(null, null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SUBSCRIPTION_KEY);
        localStorage.removeItem(CALENDLY_TOKEN_KEY);
      }
    },
    initFromStorage: (state) => {
      const stored = loadFromStorage();
      state.token = stored.token;
      state.userInfo = withViewerPermission(stored.userInfo);
      state.subscription = stored.subscription;
      state.calendlyToken = stored.calendlyToken;
      if (typeof window !== 'undefined') {
        if (stored.token) {
          setCrossSiteLoggedInCookie();
        } else {
          clearCrossSiteLoggedInCookie();
        }
      }
    },
  },
});

export const {
  setAuth,
  setSubscription,
  setCalendlyToken,
  setUserInfo,
  setChatUserInfo,
  clearAuth,
  initFromStorage,
} = authSlice.actions;
export default authSlice.reducer;
