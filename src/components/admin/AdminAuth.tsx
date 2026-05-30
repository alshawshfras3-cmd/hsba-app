import React, { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { supabase, hasSupabaseKeys } from '../../lib/supabase';
import { Mail, Lock, User, ShieldAlert, AlertCircle, Loader2, Sparkles, AlertTriangle } from 'lucide-react';

export default function AdminAuth() {
  const { user, setUser } = useAppState();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const translateError = (err: any) => {
    const msg = err?.message || '';
    if (msg.includes('Invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }
    if (msg.includes('already registered')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل';
    }
    if (msg.includes('Password should be at least')) {
      return 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل';
    }
    return msg || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!hasSupabaseKeys) {
      setTimeout(() => {
        setLoading(false);
        setUser({
          id: `local_${Date.now()}`,
          email: email.trim().toLowerCase(),
          user_metadata: {
            username: username.trim() || email.split('@')[0],
          }
        });
      }, 500);
      return;
    }

    try {
      if (isSignUp) {
        // Sign up logic
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;
        setSuccessMsg('تم إنشاء الحساب بنجاح! إذا كانت هناك حاجة لتفعيل بريدك، يرجى مراجعة صندوق الوارد.');
        setIsSignUp(false);
      } else {
        // Sign in logic
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        setSuccessMsg('تم تسجيل الدخول بنجاح!');
      }
    } catch (err: any) {
      setErrorMsg(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);

    if (!hasSupabaseKeys) {
      setTimeout(() => {
        setGoogleLoading(false);
        setUser({
          id: 'mock_google_id',
          email: 'alshawshfras3@gmail.com',
          user_metadata: {
            username: 'فراس الشاوش (مسؤول)'
          }
        });
      }, 500);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(translateError(err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#F1F5F9] border border-gray-100 rounded-full flex items-center justify-center mx-auto text-[#0057B8]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-xl text-[#111827]">نظام الدخول الموحد للإدارة</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              الوصول للوحة التحكم مقيد لمدراء ومصممي معايير حسبة العقارية
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {!hasSupabaseKeys && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex gap-2 text-amber-900 text-xs font-bold leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p>قشرة قاعدة البيانات (Supabase) غير مفعلة</p>
                <p className="font-normal text-[10px] text-amber-700 leading-normal">
                  للانتقال للوضع السحابي الدائم، يرجى تزويد متغيرات البيئة <code className="font-mono text-xs font-bold bg-amber-100 rounded px-1">VITE_SUPABASE_URL</code> و <code className="font-mono text-xs font-bold bg-amber-100 rounded px-1">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUser({
                  id: 'offline_admin',
                  email: 'alshawshfras3@gmail.com',
                  user_metadata: {
                    username: 'فراس الشاوش (مدير النظام)'
                  }
                });
              }}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الدخول الفوري بصفة مسؤول (وضع المعاينة المحلي)</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-4 rounded-xl border border-emerald-100 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-sans text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>الدخول بواسطة حساب Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100"></div>
          <span className="text-xs text-gray-400 font-semibold select-none">أو عبر البريد</span>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 block">الاسم بالكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسمك الكريم"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11"
                />
                <User className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 block">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11 text-left"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 block">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11 text-left"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0057B8] hover:bg-[#004bb0] text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <span>إنشاء حساب جديد</span>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>

        {/* Bottom Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-xs text-[#0057B8] hover:underline font-bold"
          >
            {isSignUp ? 'هل لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
          </button>
        </div>

      </div>
    </div>
  );
}
