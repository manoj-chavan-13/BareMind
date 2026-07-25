import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  is_verified: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;        // lives in memory ONLY — never persisted to localStorage
  isAuthenticated: boolean;
  isVerified: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,                 // no localStorage on startup — /auth/refresh will silently restore
  isAuthenticated: false,
  isVerified: false,
  isLoading: true,             // true until the silent refresh attempt completes
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isVerified = action.payload.user.is_verified ?? false;
      state.isLoading = false;
      // NOTE: token is NOT saved to localStorage — it lives in Redux memory only
    },
    setToken: (state, action: PayloadAction<string>) => {
      // Used by silent refresh — update access token without re-fetching user
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isVerified = false;
      state.isLoading = false;
      // No localStorage.removeItem needed — token was never stored there
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isVerified = action.payload.is_verified ?? false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, setToken, logout, setUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
