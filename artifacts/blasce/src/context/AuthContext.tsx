import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (displayName?: string, password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("blasce_token");
    const userJson = localStorage.getItem("blasce_user");
    if (token && userJson) {
      try {
        setState({ user: JSON.parse(userJson), token, isLoading: false });
      } catch {
        setState({ user: null, token: null, isLoading: false });
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const persist = (token: string, user: AuthUser) => {
    localStorage.setItem("blasce_token", token);
    localStorage.setItem("blasce_user", JSON.stringify(user));
    setState({ user, token, isLoading: false });
  };

  const signup = useCallback(async (displayName: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Sign up failed");
    persist(data.token, { id: data.id, email: data.email, displayName: data.displayName, createdAt: data.createdAt });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    persist(data.token, { id: data.id, email: data.email, displayName: data.displayName, createdAt: data.createdAt });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("blasce_token");
    localStorage.removeItem("blasce_user");
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const updateUserProfile = useCallback(async (displayName?: string, password?: string) => {
    const token = localStorage.getItem("blasce_token");
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update profile");
    persist(data.token, { id: data.id, email: data.email, displayName: data.displayName, createdAt: data.createdAt });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signup, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
