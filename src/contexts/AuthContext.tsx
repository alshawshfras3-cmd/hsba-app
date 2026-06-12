import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, hasSupabaseKeys, SUPABASE_TIMEOUT_MS, cleanStaleSupabaseSession } from '../lib/supabase';
import { Shield } from 'lucide-react';

export type UserRole = 'admin' | 'user';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_blocked?: boolean;
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
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<any>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const getCachedProfile = (): UserProfile | null => {
    try {
      const cached = sessionStorage.getItem('hesba_cached_profile');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const getCachedUser = (): User | null => {
    try {
      const cached = sessionStorage.getItem('hesba_cached_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const isCheckedInSession = () => {
    try {
      return sessionStorage.getItem('hesba_permissions_checked') === 'true' ||
             sessionStorage.getItem('hesba_calculator_permissions') === 'true';
    } catch {
      return false;
    }
  };

  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedProfile());
  const [loading, setLoading] = useState(() => !isCheckedInSession());
  const [isSuspendedUser, setIsSuspendedUser] = useState(false);
  const [isAdminInDb, setIsAdminInDb] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('hesba_is_admin') === 'true';
    } catch { return false; }
  });

  function clearLocalAuthState() {
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsSuspendedUser(false);
    setIsAdminInDb(false);
    setLoading(false);

    try {
      sessionStorage.removeItem('hesba_cached_user');
      sessionStorage.removeItem('hesba_cached_profile');
      sessionStorage.removeItem('hesba_permissions_checked');
      sessionStorage.removeItem('hesba_calculator_permissions');
      sessionStorage.removeItem('hesba_is_admin');
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchProfile(userId: string, email?: string, userMetadata?: any) {
    if (!hasSupabaseKeys) return;
    try {
      // Try app_users first, fallback to user_profiles
      let profileData = null;
      let foundInAppUsers = false;
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          profileData = data;
          foundInAppUsers = true;
        }
      } catch (e) {
        console.warn("Could not load from app_users", e);
      }

      if (!profileData) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (!error && data) {
            profileData = data;
          }
        } catch (e) {
          console.warn("Could not load from user_profiles fallback", e);
        }
      }

      // If not found in app_users, perform a self-healing upsert instantly to synchronize
      if (!foundInAppUsers) {
        try {
          const emailValue = email?.toLowerCase().trim() || profileData?.email?.toLowerCase().trim() || '';
          const fullNameDesc = profileData?.full_name || profileData?.username || userMetadata?.full_name || userMetadata?.username || '';
          const phoneValue = profileData?.phone || userMetadata?.phone || '';

          const { data: upsertedData, error: upsertErr } = await supabase
            .from('app_users')
            .upsert({
              id: userId,
              email: emailValue,
              full_name: fullNameDesc,
              phone: phoneValue,
              status: 'active',
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            .select()
            .maybeSingle();

          if (!upsertErr && upsertedData) {
            profileData = upsertedData;
          }
        } catch (createErr) {
          console.error("Auto-creation of app_users failed inside fetchProfile:", createErr);
        }
      }

      if (profileData) {
        const lowercaseEmail = (email || profileData.email || '').toLowerCase().trim();
        const isOwnerEmail = lowercaseEmail === 'admin@hesba.com';
        
        // Block suspended/blocked users (except the protected super admin)
        if (profileData.is_blocked === true && !isOwnerEmail) {
          setIsSuspendedUser(true);
          const profObj: UserProfile = {
            id: profileData.id,
            email: lowercaseEmail,
            full_name: profileData.full_name || profileData.username || null,
            avatar_url: null,
            role: 'user',
            is_blocked: true
          };
          setProfile(profObj);
          try {
            sessionStorage.setItem('hesba_cached_profile', JSON.stringify(profObj));
            sessionStorage.setItem('hesba_permissions_checked', 'true');
            sessionStorage.setItem('hesba_calculator_permissions', 'true');
          } catch (e) {
            console.error(e);
          }
          setLoading(false);
          return;
        } else {
          setIsSuspendedUser(false);
        }

        const targetRole: UserRole = 'user';
        
        const profObj: UserProfile = {
          id: profileData.id,
          email: lowercaseEmail,
          full_name: profileData.full_name || profileData.username || null,
          avatar_url: null,
          role: targetRole,
          is_blocked: profileData.is_blocked === true
        };
        setProfile(profObj);
        try {
          sessionStorage.setItem('hesba_cached_profile', JSON.stringify(profObj));
          sessionStorage.setItem('hesba_permissions_checked', 'true');
          sessionStorage.setItem('hesba_calculator_permissions', 'true');
        } catch (e) {
          console.error(e);
        }
      } else {
        throw new Error("Profile not found in either app_users or user_profiles");
      }
    } catch (err) {
      console.warn("Could not fetch profile, falling back to basic details:", err);
      const lowercaseEmail = (email || '').toLowerCase().trim();
      const isOwnerEmail = lowercaseEmail === 'admin@hesba.com';
      
      setIsSuspendedUser(false);

      const profObj: UserProfile = {
        id: userId,
        email: email || '',
        full_name: userMetadata?.full_name || userMetadata?.username || null,
        avatar_url: userMetadata?.avatar_url || null,
        role: 'user',
        is_blocked: false
      };
      setProfile(profObj);
      try {
        sessionStorage.setItem('hesba_cached_profile', JSON.stringify(profObj));
        sessionStorage.setItem('hesba_permissions_checked', 'true');
        sessionStorage.setItem('hesba_calculator_permissions', 'true');
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function checkAdminStatus(userId: string): Promise<boolean> {
    console.log("[AUTH_DEBUG] checkAdminStatus bypassed.");
    return false;
  }

  useEffect(() => {
    let active = true;

    if (!hasSupabaseKeys) {
      setLoading(false);
      const cachedUser = getCachedUser();
      if (cachedUser) {
        const isOwner = cachedUser.email?.toLowerCase().trim() === 'admin@hesba.com';
        setIsAdminInDb(isOwner);
      }
      return;
    }

    async function initializeAuth() {
      try {
        console.log("[AUTH_DEBUG] initializeAuth: Calling getSession...");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        console.log("[AUTH_DEBUG] initializeAuth: getSession success, session user:", session?.user?.id || 'none');
        if (!active) return;
        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            sessionStorage.setItem('hesba_cached_user', JSON.stringify(session.user));
          } catch (e) {
            console.error(e);
          }
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
          const isAdminUser = session.user.app_metadata?.role === 'admin' || isOwnerEmail(session.user.email);
          console.log("[AUTH_DEBUG] initializeAuth: setting isAdminInDb on app_metadata basis:", isAdminUser);
          if (active) {
            setIsAdminInDb(isAdminUser);
            try {
              sessionStorage.setItem('hesba_is_admin', isAdminUser ? 'true' : 'false');
            } catch {}
          }
        } else {
          if (active) {
            console.log("[AUTH_DEBUG] initializeAuth: No user session found, setting isAdminInDb false");
            setIsAdminInDb(false);
            try { sessionStorage.removeItem('hesba_is_admin'); } catch {}
          }
        }

        try {
          sessionStorage.setItem('hesba_permissions_checked', 'true');
          sessionStorage.setItem('hesba_calculator_permissions', 'true');
        } catch (e) {
          console.error(e);
        }
      } catch (err) {
        console.error("[AUTH_DEBUG] Error getting session on mount:", err);
        const errMsg = String(err?.message || '').toLowerCase();
        if (errMsg.includes('refresh token') || errMsg.includes('refresh_token') || errMsg.includes('not found') || errMsg.includes('invalid')) {
          cleanStaleSupabaseSession();
          if (active) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsAdminInDb(false);
          }
          try {
            sessionStorage.removeItem('hesba_cached_user');
            sessionStorage.removeItem('hesba_cached_profile');
            sessionStorage.removeItem('hesba_permissions_checked');
            sessionStorage.removeItem('hesba_calculator_permissions');
            sessionStorage.removeItem('hesba_is_admin');
          } catch (e) {
            console.error(e);
          }
        }
      } finally {
        if (active) {
          console.log("[AUTH_DEBUG] initializeAuth completed, setting loading=false");
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH_DEBUG] onAuthStateChange event received:", event, "session user ID:", session?.user?.id || 'none');
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // There is async work — set loading=true to block Guard
          setLoading(true);
          try {
            sessionStorage.setItem('hesba_cached_user', JSON.stringify(session.user));
          } catch (e) {
            console.error(e);
          }
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
          const isAdminUser = session.user.app_metadata?.role === 'admin' || isOwnerEmail(session.user.email);
          console.log("[AUTH_DEBUG] onAuthStateChange: setting isAdminInDb on app_metadata basis:", isAdminUser);
          if (active) {
            setIsAdminInDb(isAdminUser);
            try {
              sessionStorage.setItem('hesba_is_admin', isAdminUser ? 'true' : 'false');
            } catch {}
          }
          if (active) {
            setLoading(false);
          }
        } else {
          clearLocalAuthState();
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isOwnerEmail = (email?: string) => {
    const e = email?.toLowerCase().trim();
    return e === 'admin@hesba.com';
  };

  const isAdmin = user?.app_metadata?.role === 'admin' || isOwnerEmail(user?.email);
  const isOwner = isAdmin;
  const isStaff = isAdmin;
  const isCustomer = !isAdmin;

  const canAccessDashboard = isAdmin;

  // For compatibility with legacy checks
  const legacyIsAdmin = isAdmin;
  const legacyIsManager = isAdmin;

  async function signInWithGoogle() {
    if (!hasSupabaseKeys) {
      // Mock OAuth Flow for Preview
      const mockEmail = 'admin@hesba.com';
      setUser({
        id: 'mock_google_user',
        email: mockEmail,
        user_metadata: {
          full_name: 'مدير المنصة',
        }
      } as any);
      setProfile({
        id: 'mock_google_user',
        email: mockEmail,
        full_name: 'مدير المنصة',
        avatar_url: null,
        role: 'user',
        is_blocked: false
      });
      setIsAdminInDb(true);
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  }

  async function signInWithEmail(email: string, password: string) {
    setLoading(true);
    const emailLower = email.trim().toLowerCase();
    const isOwnerFlg = isOwnerEmail(emailLower);

    if (!hasSupabaseKeys) {
      // Mock email password for Preview
      const mockUser = {
        id: 'mock_email_user',
        email: emailLower,
        user_metadata: {
          full_name: isOwnerFlg ? 'مدير المنصة' : emailLower.split('@')[0],
        }
      } as any;
      setUser(mockUser);
      setProfile({
        id: 'mock_email_user',
        email: emailLower,
        full_name: isOwnerFlg ? 'مدير المنصة' : emailLower.split('@')[0],
        avatar_url: null,
        role: 'user',
        is_blocked: false
      });
      setIsAdminInDb(isOwnerFlg);
      setIsSuspendedUser(false);
      setLoading(false);
      try {
        sessionStorage.setItem('hesba_permissions_checked', 'true');
        sessionStorage.setItem('hesba_calculator_permissions', 'true');
        sessionStorage.setItem('hesba_is_admin', isOwnerFlg ? 'true' : 'false');
      } catch {}

      return {
        user: mockUser,
        isAdmin: isOwnerFlg
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
      if (error) throw error;

      if (!data?.user) {
        throw new Error('فشل الحصول على بيانات المستخدم المعرفية');
      }

      setSession(data.session);
      setUser(data.user);

      // Upsert into app_users immediately upon successful login!
      try {
        await supabase
          .from('app_users')
          .upsert({
            id: data.user.id,
            email: data.user.email?.toLowerCase().trim() || emailLower,
            full_name: data.user.user_metadata?.full_name || '',
            phone: data.user.user_metadata?.phone || '',
            status: 'active',
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
      } catch (err) {
        console.error('Failed to run sign in profile sync logic:', err);
      }

      // Fetch profile
      await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);

      // Check admin status on app_metadata or email basis
      const adminStatus = data.user.app_metadata?.role === 'admin' || isOwnerEmail(data.user.email);
      setIsAdminInDb(adminStatus);

      // Fetch their profile and check status immediately across both tables
      let isBlocked = false;
      try {
        const { data: prof, error: profErr } = await supabase
          .from('app_users')
          .select('is_blocked')
          .eq('id', data.user.id)
          .maybeSingle();
        if (!profErr && prof) {
          isBlocked = prof.is_blocked === true;
        } else {
          // Try user_profiles
          const { data: profLegacy, error: profLegacyErr } = await supabase
            .from('user_profiles')
            .select('is_blocked, role')
            .eq('id', data.user.id)
            .maybeSingle();
          if (!profLegacyErr && profLegacy) {
            isBlocked = profLegacy.is_blocked === true || profLegacy.role === 'suspended';
          }
        }
      } catch (err) {
        console.warn("Could not check suspension status from DB", err);
      }
        
      if (isBlocked && !isOwnerFlg) {
        setIsSuspendedUser(true);
        setLoading(false);
        await signOut();
        throw new Error("تم إيقاف هذا الحساب بواسطة الإدارة");
      }

      try {
        sessionStorage.setItem('hesba_permissions_checked', 'true');
        sessionStorage.setItem('hesba_calculator_permissions', 'true');
        sessionStorage.setItem('hesba_is_admin', adminStatus ? 'true' : 'false');
      } catch {}

      setLoading(false);
      return {
        user: data.user,
        isAdmin: adminStatus
      };
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }

  async function signUpWithEmail(email: string, password: string, fullName: string) {
    if (!hasSupabaseKeys) {
      const emailLower = email.trim().toLowerCase();
      const isOwner = isOwnerEmail(emailLower);
      const mockUser = {
        id: 'mock_email_user',
        email: emailLower,
        user_metadata: {
          full_name: fullName,
        }
      } as any;
      setUser(mockUser);
      setProfile({
        id: 'mock_email_user',
        email: emailLower,
        full_name: fullName,
        avatar_url: null,
        role: 'user',
        is_blocked: false
      });
      setIsAdminInDb(isOwner);
      return { user: mockUser, session: { access_token: 'mock_token' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;

    if (data?.user) {
      try {
        const { error: profileError } = await supabase
          .from('app_users')
          .upsert({
            id: data.user.id,
            email: data.user.email?.toLowerCase().trim() || email.toLowerCase().trim(),
            full_name: fullName || data.user.user_metadata?.full_name || '',
            phone: data.user.user_metadata?.phone || '',
            status: 'active',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Failed to create app_users profile:', profileError);
        }
      } catch (err) {
        console.error('Failed to run profile upsert logic after sign up:', err);
      }
    }
    return data;
  }

  async function signOut() {
    clearLocalAuthState();

    if (hasSupabaseKeys) {
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('signOut timeout')), 4000)
          )
        ]);
      } catch (authErr) {
        console.warn('Supabase signOut failed/timed out, local state already cleared:', authErr);
      }
    }

    clearLocalAuthState();
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isOwner, isAdmin: legacyIsAdmin, isStaff, isCustomer, isManager: legacyIsManager,
      canAccessDashboard,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
      setUser, setProfile
    }}>
      {isSuspendedUser && user && !isOwnerEmail(user.email) ? (
        <div className="fixed inset-0 bg-[#F8FAFC] z-[99999] flex items-center justify-center p-6 select-none" dir="rtl">
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 animate-pulse">
              <Shield className="w-8 h-8 animate-bounce block mx-auto text-red-500 mt-3.5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-sans font-black text-lg text-gray-950">تم إيقاف الحساب</h2>
              <p className="text-sm font-bold text-red-600 leading-relaxed font-sans">
                تم إيقاف هذا الحساب بواسطة الإدارة
              </p>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                إذا كنت ترى أن هذا الإجراء تم بالخطأ، يرجى مراجعة إدارة منصة حسبة العقارية لتفعيل الحساب.
              </p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                setIsSuspendedUser(false);
              }}
              className="w-full py-3 bg-[#0057B8] text-white hover:bg-[#004bb0] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
