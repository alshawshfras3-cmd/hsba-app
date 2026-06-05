import React, { useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { Lock, Mail, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';

export function AdminLoginPage() {
  const { navigate } = useLocation();
  const { signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const inputTrimmed = email.trim();
    let queryEmail = inputTrimmed.toLowerCase();

    // Check if input is a username (doesn't contain '@')
    if (!inputTrimmed.includes('@') && hasSupabaseKeys) {
      try {
        const { data: prof, error: profErr } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('username', inputTrimmed)
          .maybeSingle();

        if (prof?.email) {
          queryEmail = prof.email.trim().toLowerCase();
        }
      } catch (err) {
        console.error("Username lookup failed:", err);
      }
    }

    // Check pre-configured admin emails
    const isOwnerEmail = queryEmail === 'admin@hesba.com';

    if (!hasSupabaseKeys) {
      // Mock flow if no keys are set
      setTimeout(() => {
        setLoading(false);
        if (isOwnerEmail || queryEmail.includes('admin') || inputTrimmed === 'admin') {
          navigate('/admin/dashboard');
        } else {
          setErrorMsg('غير مصرح لك بدخول لوحة التحكم.');
        }
      }, 800);
      return;
    }

    try {
      // 1. Sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: queryEmail,
        password: password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('فشل الحصول على بيانات المستخدم بعد تسجيل الدخول.');
      }

      // 2. Read role from public.user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      const role = profile?.role || (isOwnerEmail ? 'admin' : 'user');

      if (role === 'admin') {
        // Successful login for administrator
        navigate('/admin/dashboard');
      } else {
        // Standard user not authorized to enter backend
        await supabase.auth.signOut();
        await signOut(); // Clear auth state
        setErrorMsg('غير مصرح لك بدخول لوحة التحكم.');
      }
    } catch (err: any) {
      console.error("Login failure:", err);
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('custom-claims') || msg.includes('invalid-claim')) {
        setErrorMsg('الاسم/البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setErrorMsg(msg || 'حدث خطأ أثناء محاولة الدخول، يرجى المحاولة لاحقاً.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        
        {/* Header Design */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto text-[#0057B8]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-sans font-black text-xl text-slate-950">لوحة تحكم معايير الحسبة</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              تسجيل الدخول خاص بمديري ومسؤولي المنصة فقط
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">اسم المستخدم أو البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hesba.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11 text-left"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0057B8] text-xs font-semibold rounded-xl focus:ring-1 focus:ring-[#0057B8] outline-none transition-all pr-11 text-left"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 px-4 bg-[#0057B8] hover:bg-[#004bb0] text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>تسجيل الدخول للوحة التحكم</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors"
          >
            العودة إلى الحاسبة العامة
          </button>
        </div>

      </div>
    </div>
  );
}
