import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const { navigate } = useLocation();
  const startedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let mounted = true;

    const completeGoogleLogin = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const oauthError =
          params.get('error_description') ??
          params.get('error');

        if (oauthError) {
          throw new Error(oauthError);
        }

        const code = params.get('code');

        console.log('OAuth callback started', {
          hasCode: Boolean(code),
          origin: window.location.origin,
        });

        let session = null;

        if (code) {
          const {
            data,
            error,
          } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          session = data.session;
        } else {
          const {
            data,
            error,
          } = await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          session = data.session;
        }

        if (!session?.user) {
          throw new Error('No authenticated session was created');
        }

        // Attempt app_users synchronization if needed (independently, so failure doesn't block login)
        try {
          const userObj = session.user;
          const emailValue = userObj.email?.toLowerCase().trim() || '';
          const fullName = userObj.user_metadata?.full_name ?? userObj.user_metadata?.name ?? '';
          const avatarUrl = userObj.user_metadata?.avatar_url ?? userObj.user_metadata?.picture ?? null;

          await supabase
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
            });
          
          console.log('[AuthCallbackPage] Synchronized user profile successfully');
        } catch (syncError) {
          console.error('User profile sync failed:', syncError);
        }

        if (!mounted) return;

        navigate('/');
      } catch (error) {
        console.error('Google OAuth callback failed:', error);

        if (!mounted) return;

        setErrorMessage(
          'تعذر إكمال تسجيل الدخول باستخدام Google. حاول مرة أخرى.'
        );
      }
    };

    void completeGoogleLogin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 font-sans p-6 text-center" dir="rtl">
      <div className="bg-white dark:bg-[#151D30] border border-slate-100 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-6">
        {!errorMessage ? (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-[#0057B8] dark:text-[#0EA5A4] animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">جاري إكمال تسجيل الدخول...</h1>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold leading-relaxed">
                يتم التحقق من حساب Google وتهيئة الجلسة لبيئة آمنة للمستخدمين.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-3">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">تعذر تسجيل الدخول</h1>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-[#0057B8] hover:bg-[#004bb0] py-3 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              العودة إلى تسجيل الدخول
            </button>
          </>
        )}
      </div>
    </div>
  );
}
