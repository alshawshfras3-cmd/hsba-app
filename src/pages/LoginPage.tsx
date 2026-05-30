import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseKeys } from '../lib/supabase';
import { Mail, Lock, User, ShieldCheck, Sparkles, AlertCircle, Loader2, AlertTriangle, Building2, TrendingUp, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const translateError = (err: any) => {
    const msg = err?.message || err || '';
    if (msg.includes('Invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }
    if (msg.includes('already registered')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل كعضو';
    }
    if (msg.includes('Password should be at least')) {
      return 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل لشروط الأمان';
    }
    return msg || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  };

  async function handleGoogle() {
    setLoadingAction(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setErrorMsg(translateError(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('الرجاء كتابة البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoadingAction(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else {
        if (!fullName.trim()) {
          setErrorMsg('الرجاء كتابة الاسم الكامل لتسجيل العضوية');
          setLoadingAction(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, fullName.trim());
      }
    } catch (e: any) {
      setErrorMsg(translateError(e));
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row" dir="rtl">
      
      {/* Right Column: Hero description from screenshot without 'مجاني/مجاناً' */}
      <div className="md:w-[50%] lg:w-[55%] bg-gradient-to-br from-[#002B49] via-[#0057B8] to-[#0EA5A4] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Subtle blur decoration glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-128 h-128 bg-[#0EA5A4]/25 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Logo/Identity */}
        <div className="flex items-center gap-3 relative z-10 select-none">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/15 shadow-sm text-white">
            <ShieldCheck className="w-6 h-6 text-[#10B981]" />
          </div>
          <span className="font-sans font-black text-lg tracking-wide">حسبة</span>
        </div>

        {/* Text Content */}
        <div className="my-auto py-12 md:py-0 space-y-8 max-w-xl relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#10B981]/20 border border-[#10B981]/35 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 shadow-sm leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>حاسبة التمويل الأدق في السوق</span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="font-sans font-black text-3xl md:text-5xl leading-tight tracking-tight drop-shadow-sm">
              احسب تمويلك العقاري
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-slate-100/90 leading-relaxed font-medium">
              قارن بين أفضل عروض البنوك السعودية واحصل على أقل نسبة تمويل عقاري للمواطنين والمقيمين. تم تطويرها بواسطة خبراء بخبرة أكثر من 15 عاماً.
            </p>
          </div>

          {/* Value Props Widgets */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl transition-all hover:bg-white/10">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="text-xs font-bold whitespace-nowrap">حساب دقيق</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl transition-all hover:bg-white/10">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold whitespace-nowrap font-sans">أفضل النسب</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl transition-all hover:bg-white/10">
              <Building2 className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold whitespace-nowrap font-sans">جميع البنوك</span>
            </div>
          </div>

        </div>

        {/* Footer in the column */}
        <div className="text-[10px] text-white/50 relative z-10 font-mono">
          © {new Date().getFullYear()} منصة حسبة العقارية. جميع الحقوق محفوظة.
        </div>

      </div>

      {/* Left Column: Form with White Card on clean bg */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center p-6 md:p-12">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden p-8 w-full max-w-md space-y-6">
          
          {/* Logo element for mobile view */}
          <div className="md:hidden text-center space-y-2">
            <div className="w-12 h-12 bg-[#EEF2F6] border border-[#E2E8F0] rounded-full flex items-center justify-center mx-auto text-[#0057B8]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-sans font-bold text-xl text-[#111827]">منصة حسبة العقارية</h2>
          </div>

          <div className="space-y-1.5 md:text-right text-center">
            <h2 className="font-sans font-black text-2xl text-[#111827] hidden md:block">تسجيل الدخول</h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">يرجى تسجيل الدخول للوصول إلى لوحة حاسبة التمويل الحصرية للمسؤولين</p>
          </div>

          {/* OFFLINE/BYPASS NOTICE */}
          {!hasSupabaseKeys && (
            <div className="bg-amber-50/70 border border-amber-200/85 p-4 rounded-xl space-y-3">
              <div className="flex gap-2 text-amber-900 text-xs font-bold leading-relaxed-custom">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p>قشرة قاعدة البيانات (Supabase) غير مفعلة</p>
                  <p className="font-normal text-[10px] text-amber-700 leading-normal">
                    يرجى تزويد متغيرات البيئة <code className="font-mono text-[10px] font-bold bg-amber-100/80 rounded px-1">VITE_SUPABASE_URL</code> و <code className="font-mono text-[10px] font-bold bg-amber-100/80 rounded px-1">VITE_SUPABASE_ANON_KEY</code> لتفعيل تخزين سحابي حقيقي.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setLoadingAction(true);
                  try {
                    await signInWithEmail('alshawshfras3@gmail.com', 'bypass');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoadingAction(false);
                  }
                }}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>الدخول الفوري كمسؤول (alshawshfras3@gmail.com)</span>
              </button>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* GOOGLE SIGN IN */}
          <button
            onClick={handleGoogle}
            disabled={loading || loadingAction}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-sans text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loadingAction ? (
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
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>تسجيل دخول فوري بواسطة حساب Google</span>
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider select-none">أو عبر الحساب الإلكتروني</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* EMAIL FORM */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">الاسم بالكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="الرجاء كتابة اسمك الكريم"
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
                  onChange={e => setEmail(e.target.value)}
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
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11 text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingAction}
              className="w-full bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loadingAction ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : mode === 'login' ? (
                <span>تسجيل الدخول</span>
              ) : (
                <span>إنشاء حساب عضوية جديد</span>
              )}
            </button>
          </form>

          {/* SWITCH MODE */}
          <p className="text-center text-xs text-gray-500 font-medium">
            {mode === 'login' ? (
              <>
                ليس لديك حساب؟{' '}
                <button type="button" onClick={() => { setMode('signup'); setErrorMsg(''); }} className="text-[#0057B8] font-bold hover:underline cursor-pointer">
                  إنشاء حساب جديد
                </button>
              </>
            ) : (
              <>
                لديك حساب بالفعل؟{' '}
                <button type="button" onClick={() => { setMode('login'); setErrorMsg(''); }} className="text-[#0057B8] font-bold hover:underline cursor-pointer">
                  سجل الدخول هنا
                </button>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
}
