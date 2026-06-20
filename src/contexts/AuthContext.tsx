import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, hasSupabaseKeys, SUPABASE_TIMEOUT_MS, cleanStaleSupabaseSession } from '../lib/supabase';
import { Shield } from 'lucide-react';
import { createBillingProfile, createTrialSubscription, testBillingProfileUniquePhone, normalizePhone } from '../lib/subscriptionService';

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
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<any>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshProfile: () => Promise<void>;
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
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isAdminInDb, setIsAdminInDb] = useState<boolean>(false);

  function clearLocalAuthState() {
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsSuspendedUser(false);
    setIsAdminInDb(false);
    setIsAdminVerified(false);
    setLoading(false);

    try {
      sessionStorage.removeItem('hesba_cached_user');
      sessionStorage.removeItem('hesba_cached_profile');
      sessionStorage.removeItem('hesba_permissions_checked');
      sessionStorage.removeItem('hesba_calculator_permissions');
      sessionStorage.removeItem('hesba_is_admin');
      sessionStorage.removeItem('hesba_calculator_draft');
      localStorage.removeItem('hesba_calculator_draft');
      localStorage.removeItem('hasba_saved_results_local');
      localStorage.removeItem('hasba_saved_results_local_backup');
      sessionStorage.removeItem('hasba_saved_results_local');
      sessionStorage.removeItem('hasba_saved_results_local_backup');
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
        
        let isOwnerUser = false;
        try {
          const { data: adminCheck } = await supabase
            .from('admins')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();
          isOwnerUser = !!adminCheck;
        } catch {}
        
        // Block suspended/blocked users (except the protected super admin)
        if (profileData.is_blocked === true && !isOwnerUser) {
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
    if (!hasSupabaseKeys) return false;
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) {
        return true;
      }
    } catch (err) {
      console.warn("[AUTH_DEBUG] checkAdminStatus error:", err);
    }
    return false;
  }

  useEffect(() => {
    let active = true;

    if (!hasSupabaseKeys) {
      setLoading(false);
      setIsAdminInDb(false);
      return;
    }

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!active) return;
        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            sessionStorage.setItem('hesba_cached_user', JSON.stringify(session.user));
          } catch (e) {
            console.error(e);
          }
           const isAdminUser = await checkAdminStatus(session.user.id);
          if (active) {
            setIsAdminInDb(isAdminUser);
            setIsAdminVerified(true);
            try {
              sessionStorage.setItem('hesba_is_admin', isAdminUser ? 'true' : 'false');
            } catch {}
          }
          // Fetch profile asynchronously in background
          const uid = session.user.id;
          const uemail = session.user.email;
          const umeta = session.user.user_metadata;
          setTimeout(() => {
            fetchProfile(uid, uemail, umeta);
          }, 0);
        } else {
          if (active) {
            setIsAdminInDb(false);
            setIsAdminVerified(true);
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
        console.error("Auth initialization error:", err);
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
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            sessionStorage.setItem('hesba_cached_user', JSON.stringify(session.user));
          } catch (e) {
            console.error(e);
          }
           checkAdminStatus(session.user.id).then((isAdminUser) => {
            if (active) {
              setIsAdminInDb(isAdminUser);
              setIsAdminVerified(true);
              try {
                sessionStorage.setItem('hesba_is_admin', isAdminUser ? 'true' : 'false');
              } catch {}
            }
          });
          if (active) {
            setLoading(false);
          }
          // Fetch profile asynchronously in background
          const uid = session.user.id;
          const uemail = session.user.email;
          const umeta = session.user.user_metadata;
          setTimeout(() => {
            fetchProfile(uid, uemail, umeta);
          }, 0);
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

  const isAdmin = isAdminInDb && isAdminVerified;
  const isOwner = isAdmin;
  const isStaff = isAdmin;
  const isCustomer = !isAdmin;

  const canAccessDashboard = isAdmin;

  // For compatibility with legacy checks
  const legacyIsAdmin = isAdmin;
  const legacyIsManager = isAdmin;

  async function signInWithGoogle() {
    if (!hasSupabaseKeys) {
      throw new Error('إعداد اتصال قاعدة السحابية (Supabase) غير مكتمل. يرجى تهيئة متغيرات البيئة أولاً.');
    }
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      throw error;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    if (!hasSupabaseKeys) {
      setLoading(false);
      throw new Error('إعداد اتصال قاعدة السحابية (Supabase) غير مكتمل. يرجى تهيئة متغيرات البيئة أولاً.');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
      if (error) throw error;

      if (!data?.user) {
        throw new Error('فشل الحصول على بيانات المستخدم المعرفية');
      }

      setSession(data.session);
      setUser(data.user);

      // Check admin status on DB basis
      const adminStatus = await checkAdminStatus(data.user.id);
      setIsAdminInDb(adminStatus);

      // Run background task
      const currentUserId = data.user.id;
      const currentUserEmail = data.user.email;
      const currentUserMeta = data.user.user_metadata;
      setTimeout(async () => {
        try {
          // Upsert into app_users immediately upon successful login in the background
          await supabase
            .from('app_users')
            .upsert({
              id: currentUserId,
              email: currentUserEmail?.toLowerCase().trim() || emailLower,
              full_name: currentUserMeta?.full_name || '',
              phone: currentUserMeta?.phone || '',
              status: 'active',
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });
        } catch (err) {
          console.error('Failed async app_users upsert:', err);
        }

        try {
          await fetchProfile(currentUserId, currentUserEmail, currentUserMeta);
        } catch (err) {
          console.error('Failed async profile fetch:', err);
        }
      }, 0);

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

  async function signUpWithEmail(email: string, password: string, fullName: string, phone: string) {
    if (!hasSupabaseKeys) {
      throw new Error('إعداد اتصال قاعدة السحابية (Supabase) غير مكتمل. يرجى تهيئة متغيرات البيئة أولاً.');
    }

    // Normalize phone number to +9665xxxxxxxx format
    const normalizedPhone = normalizePhone(phone);

    // 1. Enforce unique phone check
    const isUnique = await testBillingProfileUniquePhone(normalizedPhone);
    if (!isUnique) {
      throw new Error('رقم الجوال مستخدم مسبقًا.');
    }

    // 2. Perform register
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { full_name: fullName, phone: normalizedPhone },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;

    if (data?.user) {
      try {
        // 3. Create app_users entry
        const { error: profileError } = await supabase
          .from('app_users')
          .upsert({
            id: data.user.id,
            email: data.user.email?.toLowerCase().trim() || email.toLowerCase().trim(),
            full_name: fullName || data.user.user_metadata?.full_name || '',
            phone: normalizedPhone,
            is_blocked: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Failed to create app_users profile:', profileError);
        }

        // 4. Create billing profile (phone locked inside)
        await createBillingProfile({
          user_id: data.user.id,
          phone_number: normalizedPhone,
          full_name: fullName,
          email: email
        });

        // 5. Seeding trial subscription (status: trialing)
        await createTrialSubscription(data.user.id);

      } catch (err: any) {
        console.error('Failed to run subscription profiles signup logic:', err);
        // Fallback cleanup
        try {
          await supabase.rpc('delete_current_user');
        } catch (delErr) {
          console.error('Failed user signup fallback cleanup:', delErr);
        }
        throw new Error(`فشل إعداد باقة الاشتراك: ${err.message || err}`);
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

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id, user.email, user.user_metadata);
    }
  }

  const compoundLoading = loading || (!!session?.user && !isAdminVerified);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading: compoundLoading,
      isOwner, isAdmin: legacyIsAdmin, isStaff, isCustomer, isManager: legacyIsManager,
      canAccessDashboard,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
      setUser, setProfile, refreshProfile
    }}>
      {isSuspendedUser && user && !isAdmin ? (
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
