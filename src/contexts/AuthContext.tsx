import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, hasSupabaseKeys } from '../lib/supabase';

export type UserRole = 'owner' | 'admin' | 'staff' | 'customer' | 'user' | 'manager';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isManager: boolean;
  canAccessDashboard: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, email?: string, userMetadata?: any) {
    if (!hasSupabaseKeys) return;
    try {
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout load profile")), 1500)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      if (result && !result.error && result.data) {
        setProfile(result.data as UserProfile);
      } else {
        throw new Error(result?.error?.message || "Profile not loaded");
      }
    } catch (err) {
      console.warn("Could not fetch profile, falling back to basic details", err);
      const isOwnerEmail = (email || '').toLowerCase() === 'alshawshfras@gmail.com' || (email || '').toLowerCase() === 'alshawshfras3@gmail.com';
      setProfile({
        id: userId,
        email: email || '',
        full_name: userMetadata?.full_name || userMetadata?.username || null,
        avatar_url: userMetadata?.avatar_url || null,
        role: isOwnerEmail ? 'owner' : 'customer'
      });
    }
  }

  useEffect(() => {
    let active = true;

    // Safety timeout: If loading takes more than 3 seconds due to any network issues, force-disable it
    const safetyTimer = setTimeout(() => {
      if (active) {
        console.warn("Auth initialization safety timer triggered. Forcing loading=false");
        setLoading(false);
      }
    }, 3000);

    if (!hasSupabaseKeys) {
      setLoading(false);
      clearTimeout(safetyTimer);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error getting session on mount:", err);
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isOwnerEmail = (email?: string) => {
    const e = email?.toLowerCase().trim();
    return e === 'alshawshfras@gmail.com' || e === 'alshawshfras3@gmail.com';
  };

  const isOwner = profile?.role === 'owner' || isOwnerEmail(user?.email);
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff' || profile?.role === 'manager';
  const isCustomer = profile?.role === 'customer' || profile?.role === 'user' || (!isOwner && !isAdmin && !isStaff);

  const canAccessDashboard = isOwner || isAdmin || isStaff;

  // For compatibility with any legacy code that expects legacyIsAdmin or legacyIsManager checks
  const legacyIsAdmin = isOwner || isAdmin;
  const legacyIsManager = isStaff;

  async function signInWithGoogle() {
    if (!hasSupabaseKeys) {
      // Mock OAuth Flow for Preview
      const mockEmail = 'alshawshfras3@gmail.com';
      setUser({
        id: 'mock_google_user',
        email: mockEmail,
        user_metadata: {
          full_name: 'فراس الشاوش (مالك المنصة)',
        }
      } as any);
      setProfile({
        id: 'mock_google_user',
        email: mockEmail,
        full_name: 'فراس الشاوش (مالك المنصة)',
        avatar_url: null,
        role: 'owner'
      });
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  }

  async function signInWithEmail(email: string, password: string) {
    if (!hasSupabaseKeys) {
      // Mock email password for Preview
      const emailLower = email.trim().toLowerCase();
      const isOwner = emailLower === 'alshawshfras@gmail.com' || emailLower === 'alshawshfras3@gmail.com';
      setUser({
        id: 'mock_email_user',
        email: emailLower,
        user_metadata: {
          full_name: isOwner ? 'فراس الشاوش (مالك المنصة)' : emailLower.split('@')[0],
        }
      } as any);
      setProfile({
        id: 'mock_email_user',
        email: emailLower,
        full_name: isOwner ? 'فراس الشاوش (مالك المنصة)' : emailLower.split('@')[0],
        avatar_url: null,
        role: isOwner ? 'owner' : 'customer'
      });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpWithEmail(email: string, password: string, fullName: string) {
    if (!hasSupabaseKeys) {
      const emailLower = email.trim().toLowerCase();
      const isOwner = emailLower === 'alshawshfras@gmail.com' || emailLower === 'alshawshfras3@gmail.com';
      setUser({
        id: 'mock_email_user',
        email: emailLower,
        user_metadata: {
          full_name: fullName,
        }
      } as any);
      setProfile({
        id: 'mock_email_user',
        email: emailLower,
        full_name: fullName,
        avatar_url: null,
        role: isOwner ? 'owner' : 'customer'
      });
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  }

  async function signOut() {
    if (hasSupabaseKeys) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isOwner, isAdmin: legacyIsAdmin, isStaff, isCustomer, isManager: legacyIsManager,
      canAccessDashboard,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
      setUser, setProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
