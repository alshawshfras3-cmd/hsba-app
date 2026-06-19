import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { Mail, Lock, User, ShieldCheck, Sparkles, AlertCircle, Loader2, AlertTriangle, Building2, TrendingUp, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Check if we came back from a recovery/reset password email
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isRecovery = urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
    
    if (isRecovery) {
      setMode('reset_password');
      setSuccessMsg('معلومات الاستيقان آمنة وصالحة. يرجى إدخال كلمة مرور جديدة وتأكيدها بالأسفل للتحقق.');
    }
  }, []);

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
    setSuccessMsg('');
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
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('الرجاء كتابة البريد الإلكتروني وكلمة المرور');
        return;
      }
      setLoadingAction(true);
      try {
        await signInWithEmail(email.trim(), password);
      } catch (e: any) {
        setErrorMsg(translateError(e));
      } finally {
        setLoadingAction(false);
      }
    } else if (mode === 'signup') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('الرجاء كتابة البريد الإلكتروني وكلمة المرور');
        return;
      }
      if (!fullName.trim()) {
        setErrorMsg('الرجاء كتابة الاسم الكامل لتسجيل العضوية');
        return;
      }
      if (!acceptedTerms) {
        setErrorMsg('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية قبل إنشاء الحساب.');
        return;
      }
      setLoadingAction(true);
      try {
        const data = await signUpWithEmail(email.trim(), password, fullName.trim());
        if (hasSupabaseKeys && (!data || !data.session)) {
          setSuccessMsg('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب قبل تسجيل الدخول.');
        } else {
          setSuccessMsg('تم إنشاء العضوية وتأكيد الحساب بنجاح!');
        }
      } catch (e: any) {
        setErrorMsg(translateError(e));
      } finally {
        setLoadingAction(false);
      }
    } else if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('الرجاء إدخال البريد الإلكتروني لإرسال الرابط.');
        return;
      }
      setLoadingAction(true);
      try {
        if (!hasSupabaseKeys) {
          setSuccessMsg('محاكاة: تم إرسال رابط استعادة كلمة المرور لبريدك بنجاح (المعاينة بلا قاعدة بيانات).');
        } else {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/login?type=recovery`,
          });
          if (error) throw error;
          setSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى مراجعة البريد الوارد أو غير الهام (Spam).');
        }
      } catch (e: any) {
        setErrorMsg(translateError(e));
      } finally {
        setLoadingAction(false);
      }
    } else if (mode === 'reset_password') {
      if (!password || !confirmPassword) {
        setErrorMsg('يرجى كتابة كلمة المرور المحدثة وتكرارها للمطابقة.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل كقاعدة أمان أساسية.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('كلمتا المرور غير متطابقتين، يرجى إعادة التأكيد.');
        return;
      }
      setLoadingAction(true);
      try {
        if (!hasSupabaseKeys) {
          setSuccessMsg('تمت محاكاة تحديث كلمة المرور بنجاح!');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        } else {
          const { error } = await supabase.auth.updateUser({ password: password });
          if (error) throw error;
          setSuccessMsg('تم تحديث كلمة المرور بنجاح! يمكنك الآن الدخول بكلمة المرور الجديدة.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } catch (e: any) {
        setErrorMsg(translateError(e));
      } finally {
        setLoadingAction(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col md:flex-row transition-colors duration-200" dir="rtl">
      
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
        <div className="text-[10px] text-white/55 relative z-10 font-mono">
          © {new Date().getFullYear()} منصة حسبة العقارية. جميع الحقوق محفوظة.
        </div>

      </div>

      {/* Left Column: Form with White Card on clean bg */}
      <div className="flex-1 bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-6 md:p-12 transition-colors duration-200">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 w-full max-w-md space-y-6">
          
          {/* Logo element for mobile view */}
          <div className="md:hidden text-center space-y-2">
            <div className="w-12 h-12 bg-[#EEF2F6] dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-slate-800 rounded-full flex items-center justify-center mx-auto text-[#0057B8] dark:text-[#0ea5a4]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-sans font-bold text-xl text-[#111827] dark:text-white">منصة حسبة العقارية</h2>
          </div>

          <div className="space-y-1.5 md:text-right text-center">
            <h2 className="font-sans font-black text-2xl text-[#111827] dark:text-white hidden md:block">
              {mode === 'login' && 'تسجيل الدخول'}
              {mode === 'signup' && 'إنشاء حساب جديد'}
              {mode === 'forgot' && 'استعادة كلمة المرور'}
              {mode === 'reset_password' && 'إعادة تعيين كلمة المرور'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 font-medium leading-relaxed">
              {mode === 'login' && 'ادخل إلى حسابك لمتابعة حساباتك ونتائجك المحفوظة.'}
              {mode === 'signup' && 'سجل بريدك الإلكتروني هنا للالتحاق بمستخدمي حسبة المعتمدين'}
              {mode === 'forgot' && 'أدخل بريدك الإلكتروني بالأسفل لنرسل لك رابطاً مشفراً لتعيير الباسورد'}
              {mode === 'reset_password' && 'يرجى كتابة وتأكيد كلمة مرورك الجديدة لمتابعة الدخول الآمن'}
            </p>
          </div>

          {/* OFFLINE/BYPASS NOTICE - Only show for login mode */}
          {!hasSupabaseKeys && mode === 'login' && (
            <div className="bg-red-50/70 dark:bg-red-955/15 border border-red-200 dark:border-red-950/30 p-4 rounded-xl">
              <div className="flex gap-2 text-red-900 dark:text-red-400 text-xs font-bold leading-relaxed text-right">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p>تنبيه: بوابة الخدمات غير متوفرة حالياً</p>
                  <p className="font-normal text-[10px] text-red-700 dark:text-red-300 leading-normal">
                    بوابة قاعدة البيانات (Supabase) غير مهيأة بعد. يرجى تهيئة متغيرات البيئة <code className="font-mono text-[10px] font-bold bg-red-100/80 dark:bg-red-950/45 rounded px-1 text-red-800 dark:text-red-350">VITE_SUPABASE_URL</code> و <code className="font-mono text-[10px] font-bold bg-red-100/80 dark:bg-red-950/45 rounded px-1 text-red-800 dark:text-red-350">VITE_SUPABASE_ANON_KEY</code> للتواصل مع الخادم والمتابعة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-955/15 text-red-700 dark:text-red-400 text-xs font-bold p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* EMAIL FORM */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-gray-600 dark:text-slate-300 block">الاسم بالكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="الرجاء كتابة اسمك الكريم"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#0ea5a4] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] outline-none transition-all pr-11 text-right text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-slate-500"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {mode !== 'reset_password' && (
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-gray-600 dark:text-slate-300 block">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#0ea5a4] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] outline-none transition-all pr-11 text-left text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-slate-500"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset_password') && (
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-gray-600 dark:text-slate-300 block">
                  {mode === 'reset_password' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#0ea5a4] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] outline-none transition-all pr-11 text-left text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-slate-500"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {mode === 'reset_password' && (
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-gray-600 dark:text-slate-300 block">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#0ea5a4] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] outline-none transition-all pr-11 text-left text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-slate-500"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD DESKTOP ONLY LINK */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-[11px] text-[#0057B8] dark:text-[#0ea5a4] font-bold hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-2 pt-1 text-right">
                <input
                  id="accept-terms-checkbox"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0057B8] dark:text-[#0ea5a4] focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] border-gray-300 dark:border-slate-700 mt-0.5 cursor-pointer"
                />
                <label htmlFor="accept-terms-checkbox" className="text-[11.5px] text-gray-500 dark:text-slate-400 font-bold leading-relaxed cursor-pointer select-none">
                  أوافق على{' '}
                  <a href="/terms" target="_blank" className="text-[#0057B8] dark:text-[#0ea5a4] text-[11.5px] font-black hover:underline" onClick={e => { e.stopPropagation(); }}>شروط الاستخدام</a>
                  {' '}و{' '}
                  <a href="/privacy" target="_blank" className="text-[#0057B8] dark:text-[#0ea5a4] text-[11.5px] font-black hover:underline" onClick={e => { e.stopPropagation(); }}>سياسة الخصوصية</a>
                  ، وأقر بأن نتائج حسبة تقديرية وإرشادية فقط ولا تُعد موافقة تمويلية أو عرضًا ملزمًا من أي بنك أو جهة تمويلية.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingAction}
              className="w-full bg-[#0057B8] hover:bg-[#004bb0] dark:bg-[#0057B8] dark:hover:bg-[#004bb0] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loadingAction ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : mode === 'login' ? (
                <span>تسجيل الدخول</span>
              ) : mode === 'signup' ? (
                <span>إنشاء حساب جديد</span>
              ) : mode === 'forgot' ? (
                <span>أرسل رابط استعادة المرور</span>
              ) : (
                <span>تحديث واعتماد كلمة المرور</span>
              )}
            </button>
          </form>

          {/* SWITCH MODE / FOOTER */}
          <p className="text-center text-xs text-gray-500 dark:text-slate-400 font-medium">
            {mode === 'login' && (
              <>
                ليس لديك حساب؟{' '}
                <button type="button" onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }} className="text-[#0057B8] dark:text-[#0ea5a4] font-bold hover:underline cursor-pointer">
                  إنشاء حساب
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                لديك حساب؟{' '}
                <button type="button" onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }} className="text-[#0057B8] dark:text-[#0ea5a4] font-bold hover:underline cursor-pointer">
                  تسجيل الدخول
                </button>
              </>
            )}
            {(mode === 'forgot' || mode === 'reset_password') && (
              <button type="button" onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }} className="text-[#0057B8] dark:text-[#0ea5a4] font-bold hover:underline cursor-pointer">
                العودة لصفحة تسجيل الدخول
              </button>
            )}
          </p>

          {/* Legal Quick Links bottom of form */}
          <div className="text-center text-[11px] text-gray-400 dark:text-slate-500 font-bold pt-3.5 border-t border-gray-100 dark:border-slate-800 flex justify-center gap-3 select-none">
            <a href="/terms" target="_blank" className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline">شروط الاستخدام</a>
            <span>•</span>
            <a href="/privacy" target="_blank" className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline">سياسة الخصوصية</a>
            <span>•</span>
            <a href="/disclaimer" target="_blank" className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline">إخلاء المسؤولية</a>
          </div>

        </div>
      </div>
    </div>
  );
}
