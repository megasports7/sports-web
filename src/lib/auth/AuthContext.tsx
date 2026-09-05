'use client';

/**
 * Client-side auth context — mirrors sports-mobile-main/src/context/
 * AuthContext.tsx's shape (state machine, role-mismatch handling, the
 * deliberately generic "Invalid credentials" on role mismatch so a wrong
 * role and a wrong password look identical). This is UX/display state only;
 * it drives nav and page content, it does not gate anything — that's
 * src/proxy.ts (session + role redirect) and RLS (the real boundary).
 *
 * No SecureStore equivalent needed: @supabase/ssr's browser client persists
 * the session in cookies on its own.
 */
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { createClient } from '../supabase/client';
import { authApi } from '../api/auth.api';
import type { User, UserRole } from '../types';

interface AuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  user: User | null;
}

type AuthAction =
  | { type: 'SIGN_IN'; user: User }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_LOADING'; isLoading: boolean };

const initialState: AuthState = { isLoading: true, isSignedIn: false, user: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGN_IN':
      return { isLoading: false, isSignedIn: true, user: action.user };
    case 'SIGN_OUT':
      return { isLoading: false, isSignedIn: false, user: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, role: UserRole) => Promise<void>;
  signUp: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const supabase = useMemo(() => createClient(), []);

  // Same guard as mobile: signIn/signUp below drive their own
  // role-check-then-dispatch flow, so the listener shouldn't double-handle
  // that transition -- it still owns bootstrap, background refresh, and a
  // sign-out triggered elsewhere (e.g. a revoked refresh token).
  const manualFlowRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate(hasSession: boolean) {
      if (!hasSession) {
        if (mounted) dispatch({ type: 'SIGN_OUT' });
        return;
      }
      const res = await authApi.me();
      if (!mounted) return;
      if (res.success && res.data) {
        dispatch({ type: 'SIGN_IN', user: res.data });
      } else {
        dispatch({ type: 'SIGN_OUT' });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) hydrate(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (manualFlowRef.current) return;
      hydrate(!!session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,

      signIn: async (email, password, role) => {
        dispatch({ type: 'SET_LOADING', isLoading: true });
        manualFlowRef.current = true;
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data?.session || !data.user) {
            throw error || new Error('Login failed');
          }

          const meRes = await authApi.me();
          if (!meRes.success || !meRes.data) {
            await supabase.auth.signOut();
            throw new Error(meRes.message || 'Could not load your profile');
          }
          // Deliberately generic on mismatch -- matches mobile's own
          // behavior, avoids revealing the email exists under another role.
          if (meRes.data.role !== role) {
            await supabase.auth.signOut();
            throw new Error('Invalid credentials');
          }

          dispatch({ type: 'SIGN_IN', user: meRes.data });
        } catch (err) {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          throw err instanceof Error ? err : new Error('Login failed');
        } finally {
          manualFlowRef.current = false;
        }
      },

      signUp: async ({ name, email, password, role }) => {
        dispatch({ type: 'SET_LOADING', isLoading: true });
        manualFlowRef.current = true;
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, role } },
          });
          if (error) throw error;
          if (!data.session || !data.user) {
            throw new Error('Signup succeeded but no session was returned');
          }

          const meRes = await authApi.me();
          const user: User = meRes.success && meRes.data ? meRes.data : { id: 0, name, email, role };
          dispatch({ type: 'SIGN_IN', user });
        } catch (err) {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          throw err instanceof Error ? err : new Error('Registration failed');
        } finally {
          manualFlowRef.current = false;
        }
      },

      signOut: async () => {
        manualFlowRef.current = true;
        try {
          await supabase.auth.signOut();
        } finally {
          manualFlowRef.current = false;
        }
        dispatch({ type: 'SIGN_OUT' });
      },
    }),
    [state, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
