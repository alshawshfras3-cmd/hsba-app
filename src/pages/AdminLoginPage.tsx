import React, { useState } from 'react';
import { useLocation } from '../hooks/useLocation';
import { Lock, Mail, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AdminLoginPage() {
  const { navigate } = useLocation();
  const { signInWithEmail, signOut, canAccessDashboard, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && canAccessDashboard) {
      navigate('/admin/dashboard');
    }
  }, [canAccessDashboard, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Perform general sign in (handles both mock path and real supabase path)
      const result = await signInWithEmail(cleanEmail, password);

      if (!result?.isAdmin) {
        setErrorMsg('غير مصرح لك بدخول لوحة التحكم (البريد ليس مسجلاً كمشرف)');
        await signOut();
        return;
      }

      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Admin login error:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('Invalid login credentials') || errMsg.includes('Email or password') || errMsg.includes('غير صحيحة')) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setErrorMsg(errMsg || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
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
          <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
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
        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-amber-500 outline-none transition-all pr-11 text-right"
                dir="rtl"
                autoComplete="off"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-amber-500 outline-none transition-all pr-11 text-right"
                dir="rtl"
                autoComplete="new-password"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
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
