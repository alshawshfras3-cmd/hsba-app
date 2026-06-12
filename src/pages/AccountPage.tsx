import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { supabase, hasSupabaseKeys } from "../lib/supabase";
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Mail, 
  Shield, 
  Award, 
  Calendar, 
  KeyRound, 
  Settings, 
  Calculator, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Trash2,
  Lock
} from "lucide-react";

export function AccountPage() {
  const { user, signOut, userSubscriptions } = useAppState();
  const { profile, canAccessDashboard } = useAuth();
  const location = useLocation();

  // Profile states
  const [fullNameInput, setFullNameInput] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password update states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');



  // Admin access derived from AuthContext — no independent DB query needed
  const hasAdminAccess = canAccessDashboard;

  const handleVibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  React.useEffect(() => {
    async function checkAndCreateProfile() {
      if (!hasSupabaseKeys || !user) return;
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error || !data) {
          console.log("No profile in app_users, creating automatically for user:", user.email);
          await supabase
            .from('app_users')
            .upsert({
              id: user.id,
              email: user.email?.toLowerCase().trim() || '',
              full_name: user?.user_metadata?.full_name || '',
              phone: user?.user_metadata?.phone || '',
              status: 'active',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        }
      } catch (err) {
        console.error("Error auto-checking user profile in AccountPage:", err);
      }
    }
    checkAndCreateProfile();
  }, [user]);



  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      setProfileMessage({ type: 'error', text: 'يرجى إدخال اسم كامل صحيح.' });
      return;
    }
    handleVibrate();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      if (hasSupabaseKeys && user) {
        // Upsert app_users to create record if it doesn't exist
        const { error } = await supabase
          .from('app_users')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullNameInput.trim(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (error) throw error;
        
        // Also update auth metadata
        await supabase.auth.updateUser({
          data: { full_name: fullNameInput.trim() }
        });

        setProfileMessage({ type: 'success', text: 'تم تحديث الاسم الكامل بنجاح ومزامنته سحابياً!' });
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        setProfileMessage({ type: 'success', text: 'محاكاة: تم تحديث اسم الملف الشخصي بنجاح (المعاينة بلا قاعدة بيانات)' });
      }
    } catch (err: any) {
      console.error(err);
      setProfileMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ الاسم المكتوب.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: 'يرجى إدخال كلمة مرور جديدة.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'يجب ألا تقل كلمة المرور المحدثة عن 6 أحرف كمتطلب أمان.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'كلمتا المرور غير متطابقتين، يرجى إعادة التحقق.' });
      return;
    }

    handleVibrate();
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      if (hasSupabaseKeys) {
        const { error } = await Promise.race([
          supabase.auth.updateUser({ password: newPassword }),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('انتهت مهلة تحديث كلمة المرور، حاول مرة أخرى')), 8000)
          )
        ]);
        if (error) throw error;
        setPasswordMessage({ type: 'success', text: 'تم تحديث كلمة المرور الجديدة بنجاح فوري!' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        setPasswordMessage({ type: 'success', text: 'محاكاة: تم تحديث الباسورد بنجاح في النسخة المحلية!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء محاولة تحديث الرقم السري.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSelfDelete = async () => {
    if (!user?.email) return;
    if (confirmDeleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('البريد الإلكتروني الذي أدخلته غير متطابق مع بريدك المسجل.');
      return;
    }

    handleVibrate();
    setDeleteLoading(true);
    setDeleteError('');

    try {
      if (hasSupabaseKeys) {
        const { error } = await supabase.rpc('delete_current_user');
        if (error) {
          const errMsg = error.message || '';
          const isMissingRpc = 
            error.code === 'PGRST202' || 
            errMsg.includes('does not exist') || 
            errMsg.includes('could not find the function');
          
          if (isMissingRpc) {
            throw new Error("يجب تطبيق migration delete_current_user في Supabase");
          }
          throw error;
        }
        
        await signOut();
        window.location.href = '/';
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await signOut();
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'فشل حذف الحساب. يرجى التواصل مع الدعم الفني للمنصة.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCreationDate = () => {
    if (!user?.created_at) return 'غير متوفر';
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString("ar-SA", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'غير متوفر';
    }
  };

  const displayFullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.username || 'مستخدم حسبة';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-right select-none animate-fade-in text-[#1E293B] dark:text-slate-100 min-h-screen transition-colors duration-200" dir="rtl">
      
      {/* Header Title */}
      <div className="mb-8 space-y-2 border-b border-gray-100 dark:border-slate-800 pb-5">
        <h1 className="font-sans font-black text-3xl text-gray-950 dark:text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0057B8] dark:bg-[#0EA5A4] text-white rounded-2xl flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span>ملفي الشخصي وإعدادات الحساب</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
          تحكم في بياناتك الشخصية، والمظهر الملائم لعينيك، والأمان الهيكلي لمنصة البنك المركزي المعتمدة.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Columns (2/3 Width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Edit Profile Info Panel */}
          <div className="bg-white dark:bg-[#0F172A] border border-gray-150/70 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
            <h3 className="font-sans font-bold text-base text-gray-950 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>تفاصيل الهوية والصلاحيات</span>
            </h3>

            {/* Static Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold block">البريد الإلكتروني المعتمد:</span>
                <span className="text-sm font-extrabold text-gray-800 dark:text-slate-200 font-mono" dir="ltr">{user?.email || 'guest@hesba.sa'}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold block">حالة تفعيل الحساب:</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-sans">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span>معتمد ومفعّل بالكامل</span>
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-1 col-span-2">
                <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold block">تاريخ الانتساب السحابي:</span>
                <span className="text-xs font-extrabold text-gray-700 dark:text-slate-300 font-mono">{getCreationDate()}</span>
              </div>
            </div>

            {/* Editable Name Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 block">تعديل الاسم الكامل في الشهادات والتقارير</label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={e => setFullNameInput(e.target.value)}
                  placeholder="أدخل الاسم الرباعي الرسمي"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0057B8] text-xs font-semibold rounded-xl text-gray-800 dark:text-slate-100 outline-none transition-all focus:ring-1 focus:ring-[#0057B8]"
                />
                <p className="text-[10px] text-gray-400 leading-normal">يجب كتابة الاسم الكامل مطابقاً لبطاقة الهوية الوطنية أو شهادة التمويل العقاري.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? 'جاري الحفظ والرفع...' : 'حفظ الاسم الكامل المحدث'}
                </button>
              </div>

              {profileMessage && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                  profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileMessage.text}</span>
                </div>
              )}
            </form>

          </div>

          {/* Edit Password Panel */}
          <div className="bg-white dark:bg-[#0F172A] border border-gray-150/70 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
            <h3 className="font-sans font-bold text-base text-gray-950 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#0057B8] dark:text-[#0EA5A4]" />
              <span>تحديث وحماية كلمة المرور الفورية</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                لتحديث الباسورد الخاص بك، قم بكتابة الرمز الجديد مباشرة في المربعين المخصصين بالأسفل.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">تكرار كلمة المرور للمطابقة</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'جاري تعميد السيرفر...' : 'تحديث كلمة المرور آلياً'}
              </button>

              {passwordMessage && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                  passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordMessage.text}</span>
                </div>
              )}
            </form>
          </div>




        </div>

        {/* Dashboard Right Column Action Panel */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-[#0F172A] border border-gray-150/70 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
            <h3 className="font-sans font-extrabold text-xs text-gray-400 uppercase tracking-wider">
              التنقل المالي السريع:
            </h3>

            {/* Link back to Main Calculator */}
            <button
              onClick={() => { handleVibrate(); location.navigate('/'); }}
              className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 transition-all flex items-center justify-between group cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-slate-850 text-[#0057B8] dark:text-[#0EA5A4] rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">شاشة حاسبة التمويل</h4>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">الرجوع لتلقي مدخلات العملاء</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:-translate-x-1" />
            </button>

            {/* Admin Controls Link */}
            {hasAdminAccess ? (
              <button
                onClick={() => {
                  handleVibrate();
                  location.navigate('/admin');
                }}
                className="w-full p-4 hover:bg-indigo-50/50 dark:hover:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 transition-all flex items-center justify-between group cursor-pointer text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-[#1e1b4b] text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">التحكم بالإشراف المالي</h4>
                    <p className="text-[10px] text-slate-400 leading-none mt-1">تعديل هوامش وقواعد الحسبة</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>
            ) : null}

            {/* Static informative compliance tip */}
            <div className="bg-sky-50/50 dark:bg-slate-900 border border-sky-100 dark:border-slate-850 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-bold text-sky-900 dark:text-sky-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>الامتثال لمعايير SAMA:</span>
              </span>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                تحرص حسبة العقارية على مطابقة آخر تعاميم التمويل العقاري والرهن واللوائح الائتمانية المنظمة لرفع دقة النسب المعروضة.
              </p>
            </div>

            {/* Logout Trigger button */}
            <button
              onClick={() => { handleVibrate(); signOut(); }}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج آمن</span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
