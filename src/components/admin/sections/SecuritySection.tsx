import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle, Mail, User } from 'lucide-react';
import { getAdminCredentials, updateAdminCredentials } from '../../../lib/adminCredentials';

export function SecuritySection() {
  // Inputs
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/Loading per section
  const [emailLoading, setEmailLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loaded database values
  const [currentDbUsername, setCurrentDbUsername] = useState<string>('');
  const [currentDbEmail, setCurrentDbEmail] = useState<string>('');

  const loadLatestDetails = async () => {
    try {
      const creds = await getAdminCredentials();
      setCurrentDbUsername(creds.admin_username);
      setCurrentDbEmail(creds.admin_email);
    } catch (err) {
      console.error("Error loading latest admin credentials:", err);
    }
  };

  useEffect(() => {
    loadLatestDetails();
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed.includes('@')) {
      setErrorMsg('البريد الإلكتروني المدخل غير صالح.');
      setEmailLoading(false);
      return;
    }

    try {
      await updateAdminCredentials({ admin_email: emailTrimmed });
      setCurrentDbEmail(emailTrimmed);
      setSuccessMsg('تم تحديث البريد الإلكتروني للمسؤول بنجاح ✉️');
      setNewEmail('');
    } catch (err: any) {
      console.error('Email update failure:', err);
      setErrorMsg(err?.message || 'فشلت عملية تحديث البريد الإلكتروني.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const usernameTrimmed = newUsername.trim();
    if (usernameTrimmed.length < 3) {
      setErrorMsg('يجب ألا يقل اسم المستخدم عن 3 أحرف.');
      setUsernameLoading(false);
      return;
    }

    try {
      await updateAdminCredentials({ admin_username: usernameTrimmed });
      setCurrentDbUsername(usernameTrimmed);
      setSuccessMsg('تم تحديث اسم المستخدم بنجاح 👤');
      setNewUsername('');
    } catch (err: any) {
      console.error('Username update failure:', err);
      setErrorMsg(err?.message || 'فشلت عملية تحديث اسم المستخدم.');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      setPasswordLoading(false);
      return;
    }

    try {
      await updateAdminCredentials({ admin_password: newPassword });
      setSuccessMsg('تم تغيير وتحديث كلمة المرور للمسؤول بنجاح 🔒');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update failure:', err);
      setErrorMsg(err?.message || 'فشلت عملية تحديث كلمة المرور.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm font-sans space-y-8 text-right" dir="rtl">
      
      {/* Header Info */}
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600" />
          <span>إعدادات الأمان وحماية الدخول</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          تحديث البريد الإلكتروني، اسم المستخدم، أو كلمة المرور للمشرف لتأمين لوحة التحكم بشكل مستقل
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-4 rounded-xl border border-emerald-100 flex items-center gap-2.5 max-w-2xl">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-800 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5 max-w-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of Individual Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
        
        {/* SECTION 1: CHANGE USERNAME */}
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-200/60">
            <User className="w-4.5 h-4.5 text-amber-600" />
            <h3 className="text-xs font-bold">تغيير اسم المستخدم</h3>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">اسم المستخدم الحالي:</span>
            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-150 px-2.5 py-1 rounded-lg inline-block font-mono">
              {currentDbUsername || 'admin'}
            </span>
          </div>

          <form onSubmit={handleUpdateUsername} className="space-y-3.5 pt-1">
            <div className="space-y-1 text-right">
              <label className="text-[10px] font-bold text-slate-600 block">اسم المستخدم الجديد</label>
              <input
                type="text"
                required
                placeholder="اسم المستخدم الجديد"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 text-xs font-bold rounded-xl outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={usernameLoading}
              className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none shadow-xs cursor-pointer disabled:opacity-60"
            >
              {usernameLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>تحديث اسم المستخدم</span>
              )}
            </button>
          </form>
        </div>

        {/* SECTION 2: CHANGE EMAIL */}
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-200/60">
            <Mail className="w-4.5 h-4.5 text-amber-600" />
            <h3 className="text-xs font-bold">تغيير البريد الإلكتروني</h3>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">البريد الإلكتروني الحالي:</span>
            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-150 px-2.5 py-1 rounded-lg inline-block font-mono">
              {currentDbEmail || 'admin@hesba.com'}
            </span>
          </div>

          <form onSubmit={handleUpdateEmail} className="space-y-3.5 pt-1">
            <div className="space-y-1 text-right">
              <label className="text-[10px] font-bold text-slate-600 block">البريد الإلكتروني الجديد</label>
              <input
                type="email"
                required
                placeholder="البريد الإلكتروني الجديد"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 text-xs font-bold rounded-xl outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none shadow-xs cursor-pointer disabled:opacity-60"
            >
              {emailLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>تحديث البريد الإلكتروني</span>
              )}
            </button>
          </form>
        </div>

        {/* SECTION 3: CHANGE PASSWORD */}
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-200/60">
            <Lock className="w-4.5 h-4.5 text-amber-600" />
            <h3 className="text-xs font-bold">تغيير كلمة المرور</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div className="space-y-1 text-right">
              <label className="text-[10px] font-bold text-slate-600 block">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                placeholder="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 text-xs font-bold rounded-xl outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1 text-right">
              <label className="text-[10px] font-bold text-slate-600 block">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 text-xs font-bold rounded-xl outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none shadow-xs cursor-pointer disabled:opacity-60"
            >
              {passwordLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>حفظ كلمة المرور</span>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
