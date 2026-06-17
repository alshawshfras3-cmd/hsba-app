import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { navigate } = useLocation();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'success_google' | 'success_email' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let mounted = true;

    const completeAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const oauthError =
          params.get('error_description') ??
          params.get('error');

        if (oauthError) {
          throw new Error(oauthError);
        }

        const code = params.get('code');

        console.log('Auth callback started', {
          hasCode: Boolean(code),
          origin: window.location.origin,
        });

        let session = null;

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
          session = data.session;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            throw error;
          }
          session = data.session;
        }

        if (!session?.user) {
          throw new Error('No authenticated session was created');
        }

        // Determine if this is a Google OAuth login or an Email confirmation
        const userObj = session.user;
        const isGoogle = userObj.app_metadata?.provider === 'google' || 
                         userObj.identities?.some((id: any) => id.provider === 'google');

        // Attempt app_users synchronization
        try {
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

        if (isGoogle) {
          setStatus('success_google');
          navigate('/');
        } else {
          // Sign out so they can log in fresh as requested, but keep them on success page for 2 seconds
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('Sign out during verification flow failed:', signOutError);
          }
          setStatus('success_email');
        }
      } catch (error: any) {
        console.error('Auth callback failed:', error);

        if (!mounted) return;

        setStatus('error');
        setErrorMessage(
          'رابط التحقق غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.'
        );
      }
    };

    void completeAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Handle automatic redirect for email confirmation
  useEffect(() => {
    if (status === 'success_email') {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 font-sans p-6 text-center" dir="rtl">
      <div className="bg-white dark:bg-[#151D30] border border-slate-100 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-[#0057B8] dark:text-[#0EA5A4] animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">جاري معالجة الطلب...</h1>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold leading-relaxed">
                يتم مراجعة رابط المصادقة وتهيئة الحساب لبيئة آمنة للمستخدمين.
              </p>
            </div>
          </>
        )}

        {status === 'success_google' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-[#0057B8] dark:text-[#0EA5A4] animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">تم التحقق بنجاح!</h1>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold leading-relaxed">
                جاري توجيهك إلى الخدمة...
              </p>
            </div>
          </>
        )}

        {status === 'success_email' && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 dark:text-emerald-400 animate-bounce" />
            </div>
            <div className="space-y-3">
              <h1 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">تم تأكيد بريدك الإلكتروني بنجاح.</h1>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 leading-relaxed">
                يمكنك الآن الدخول إلى حسابك واستخدام حسبة.
              </p>
              <p className="text-[10px] text-gray-400 dark:text-slate-400">
                سيتم تحويلك تلقائياً خلال ثانيتين...
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-bold transition-all shadow-md cursor-pointer mt-4"
            >
              الانتقال إلى تسجيل الدخول
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-3">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">تعذر إكمال العملية</h1>
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
