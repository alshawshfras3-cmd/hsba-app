import React, { useState } from 'react';
import { supabase, hasSupabaseKeys } from '../../../lib/supabase';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function SecuritySection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Visual & input controls checks
    if (newPassword.length < 6) {
      setErrorMsg('يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      setLoading(false);
      return;
    }

    if (!hasSupabaseKeys) {
      // Mock update password in local preview
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg('تم تحديث كلمة المرور الإدارية بنجاح في بيئة المعاينة (Offline Mock State).');
        setNewPassword('');
        setConfirmPassword('');
      }, 1000);
      return;
    }

    try {
      // Direct call as requested: supabase.auth.updateUser()
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMsg('تم تغيير وتحديث كلمة المرور الخاصة بحسابك الإداري بنجاح 🔒');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password reset failure:', err);
      setErrorMsg(err?.message || 'فشل تحديث كلمة المرور، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm font-sans space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#0057B8]" />
          <span>إعدادات الأمان وحماية الدخول</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          تحديث كلمة مرور المشرف الحالي وحماية لوحة المراقبة العقارية
        </p>
      </div>

      <div className="border-t border-slate-100 pt-6 max-w-md">
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-4 rounded-xl border border-emerald-100 flex items-center gap-2.5 mb-5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-800 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] font-bold text-slate-700 block">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              placeholder="أدخل كلمة المرور الجديدة (6 خانات على الأقل)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0057B8] focus:bg-white text-xs font-bold rounded-xl outline-none transition-all text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-[11px] font-bold text-slate-700 block font-sans">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              placeholder="إعادة كتابة كلمة المرور للتأكيد"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0057B8] focus:bg-white text-xs font-bold rounded-xl outline-none transition-all text-left"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 h-11 bg-[#0057B8] hover:bg-[#004bb0] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none shadow-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>حفظ كلمة المرور الجديدة</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
