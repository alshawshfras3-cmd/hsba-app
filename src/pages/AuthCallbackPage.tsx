import React, { useEffect, useState } from 'react';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { navigate } = useLocation();
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const completeAuthentication = async () => {
      try {
        console.log('[AuthCallbackPage] Completing Google OAuth authentication...');
        
        // Retrieve session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !session) {
          console.error('[AuthCallbackPage] OAuth session error or missing session:', error);
          setErrorMsg('تعذر تسجيل الدخول باستخدام Google. تحقق من إعدادات الحساب وحاول مرة أخرى.');
          
          setTimeout(() => {
            if (mounted) {
              navigate('/login?error=google_auth_failed');
            }
          }, 3000);
          return;
        }

        console.log('[AuthCallbackPage] Session retrieved successfully for user:', session.user.id);

        // Attempt app_users synchronization if needed
        try {
          const userObj = session.user;
          const emailValue = userObj.email?.toLowerCase().trim() || '';
          const fullName = userObj.user_metadata?.full_name ?? userObj.user_metadata?.name ?? '';
          const avatarUrl = userObj.user_metadata?.avatar_url ?? userObj.user_metadata?.picture ?? null;

          // Attempt upsert in background
          void supabase
            .from('app_users')
            .upsert({
              id: userObj.id,
              email: emailValue,
              full_name: fullName,
              avatar_url: avatarUrl,
              status: 'active',
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            .then(({ error: upsertErr }) => {
              if (upsertErr) {
                console.warn('[AuthCallbackPage] Background user sync failed (benign):', upsertErr);
              } else {
                console.log('[AuthCallbackPage] Background user sync succeeded');
              }
            });
        } catch (syncErr) {
          console.warn('[AuthCallbackPage] Sync exception swallowed:', syncErr);
        }

        // Redirect to homepage
        navigate('/');
      } catch (err: any) {
        console.error('[AuthCallbackPage] OAuth callback failed with exception:', err);
        if (mounted) {
          setErrorMsg('تعذر تسجيل الدخول باستخدام Google. تحقق من إعدادات الحساب وحاول مرة أخرى.');
          setTimeout(() => {
            if (mounted) {
              navigate('/login?error=google_auth_failed');
            }
          }, 3000);
        }
      }
    };

    void completeAuthentication();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 font-sans p-6 text-center" dir="rtl">
      <div className="bg-white dark:bg-[#151D30] border border-slate-100 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-[#0057B8] dark:text-[#0EA5A4] animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">جاري إكمال تسجيل الدخول...</h2>
          <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold leading-relaxed">
            {errorMsg ? (
              <span className="text-rose-600 dark:text-rose-400">⚠️ {errorMsg}</span>
            ) : (
              'يتم التحقق من حساب Google وتهيئة الجلسة لبيئة آمنة للمستخدمين العاديين.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
