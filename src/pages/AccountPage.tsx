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
  Info
} from "lucide-react";

export function AccountPage() {
  const { user, userRole, signOut, userSubscriptions } = useAppState();
  const { profile } = useAuth();
  const location = useLocation();

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleVibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  const handleSignOut = () => {
    handleVibrate();
    signOut();
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    handleVibrate();
    setResetLoading(true);
    setResetMessage(null);

    try {
      if (hasSupabaseKeys) {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${window.location.origin}/`
        });
        if (error) throw error;
        setResetMessage({
          type: 'success',
          text: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى مراجعة صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها).'
        });
      } else {
        // Mock success when Supabase is not connected
        await new Promise(resolve => setTimeout(resolve, 800));
        setResetMessage({
          type: 'success',
          text: 'محاكاة: تم إرسال رابط مخصص لتغيير كلمة المرور إلى بريدك الإلكتروني بنجاح!'
        });
      }
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setResetMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء محاولة إرسال رابط إعادة التعيين. يرجى المحاولة لاحقاً.'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const currentSub = userSubscriptions?.find(sub => sub.email === user?.email);
  const planName = currentSub?.plan === 'enterprise' ? 'مؤسسي متميز (Enterprise)' : (currentSub?.plan === 'premium' ? 'حساب ذهبي متكامل (Premium)' : 'اشتراك قياسي مجاني (Standard)');

  // Format account creation date
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

  const hasAdminAccess = userRole === 'admin' || userRole === 'manager';
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.username || 'مستشار حسبة';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-right select-none animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="mb-8 space-y-2">
        <h1 className="font-sans font-black text-2xl text-gray-950 tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-[#0057B8]" />
          <span>إعدادات الملف الشخصي والحساب</span>
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed font-medium">
          إدارة الصلاحيات، تحديث الحماية، ومطابقة التراخيص المعتمدة لمنصة حسبة الذكية.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Right Area: Informations Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="font-sans font-bold text-sm text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>بطاقة بيانات العضوية والاشتراك</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Profile Name */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">الاسم الحالي في النظام:</span>
                <span className="text-sm font-extrabold text-gray-800">{fullName}</span>
              </div>

              {/* Email Address */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">البريد الإلكتروني المالي:</span>
                <span className="text-sm font-extrabold text-gray-800 font-mono" dir="ltr">{user?.email || 'guest@hesba.sa'}</span>
              </div>

              {/* Package Plan */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">نوع الباقة والمزايا:</span>
                <span className="text-sm font-extrabold text-[#0057B8] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#0ea5a4]" />
                  <span>{planName}</span>
                </span>
              </div>

              {/* Compliance / Connection status */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">حالة الحساب المزامنة:</span>
                <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>نشط ومتصل بالثريد الآمن</span>
                </span>
              </div>

              {/* Date Created */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1 md:col-span-2">
                <span className="text-[10px] text-gray-400 font-bold block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>تاريخ إنشاء الحساب وتوثيقه:</span>
                </span>
                <span className="text-sm font-extrabold text-gray-700">{getCreationDate()}</span>
              </div>

            </div>
          </div>

          {/* Security & Action Form details */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0057B8]" />
                <span>أمان الحساب وتغيير البيانات</span>
              </h3>
              <p className="text-[11px] text-gray-400 font-medium mt-1 leading-relaxed">
                يمكنك إعادة تعيين كلمة المرور أو تحديث تفاصيل الحساب بشكل آمن من هنا.
              </p>
            </div>

            {/* Change Password Interface */}
            <div className="border border-slate-100 rounded-2xl p-4 md:p-5 space-y-4 bg-slate-50/50">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800">إجراء إعادة تعيين كلمة المرور</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  عند النقر على الزر أدناه، سيقوم النظام بتوليد رابط مشفر وإرساله فورياً إلى بريدك الإلكتروني لتعيين كلمة مرور جديدة بكل أمان.
                </p>
              </div>

              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-blue-200 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {resetLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>إرسال رابط تغيير كلمة المرور</span>
                  </>
                )}
              </button>

              {resetMessage && (
                <div className={`p-4 rounded-xl text-xs font-medium leading-relaxed flex items-start gap-2.5 animate-fade-in ${
                  resetMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  {resetMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{resetMessage.text}</span>
                </div>
              )}
            </div>

            {/* Blocked Email Change Warning as requested */}
            <div className="border border-slate-100 rounded-2xl p-4 md:p-5 space-y-3 bg-slate-50/50 opacity-90">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>تحديث البريد الإلكتروني الأساسي</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  لا يمكن تعديل البريد الإلكتروني المرتبط بالاشتراك والتراخيص دون مراجعة مسبقة لضمان دقة العمليات وحيازة التراخيص.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="px-5 py-2.5 bg-slate-200 border border-slate-300 text-slate-400 text-[11px] font-extrabold rounded-xl cursor-not-allowed select-none"
                >
                  تغيير البريد الإلكتروني
                </button>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/60">
                  تغيير البريد الإلكتروني سيكون متاحًا قريبًا للتحكم الذاتي
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Left Area: Desktop System Navigation Actions Menu */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-sans font-extrabold text-xs text-gray-400 uppercase tracking-wider mb-2">
              لوحة التحكم والتنقل السريع:
            </h3>

            {/* Go back to Calculator */}
            <button
              onClick={() => { handleVibrate(); location.navigate('/'); }}
              className="w-full p-4 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all flex items-center justify-between group cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 text-[#0057B8] rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">حاسبة السكن والتمويل</h4>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">الرجوع لحساب التمويل العقاري</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:-translate-x-1" />
            </button>

            {/* Go to Admin Dashboard if permitted */}
            {hasAdminAccess ? (
              <button
                onClick={() => { handleVibrate(); location.navigate('/admin'); }}
                className="w-full p-4 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition-all flex items-center justify-between group cursor-pointer text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">لوحة الإشراف المالي</h4>
                    <p className="text-[10px] text-slate-400 leading-none mt-1">إعداد المقاييس وهوامش البنوك</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:-translate-x-1" />
              </button>
            ) : null}

            {/* Informational guide */}
            <div className="bg-blue-50/40 border border-blue-100/50 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-extrabold text-blue-900 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>ملاحظة أمان ائتماني:</span>
              </span>
              <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                تطابق المنصة آلياً عمليات الحساب مع اشتراطات البنك المركزي (SAMA). يرجى الحفاظ على معلومات حسابك سرية بالكامل.
              </p>
            </div>

            {/* Sign Out Action Button */}
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>تسجيل الخروج الآمن</span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
