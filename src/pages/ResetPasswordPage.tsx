import React, { useEffect, useState } from "react";
import { supabase, hasSupabaseKeys } from "../lib/supabase";
import { Lock, CheckCircle2, AlertCircle, Loader2, Sparkles, KeyRound } from "lucide-react";
import { useLocation } from "../hooks/useLocation";

export default function ResetPasswordPage() {
  const { navigate } = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Extract access_token & other parameters from the hash URL parameter
    const hash = window.location.hash;
    if (!hash) {
      // Also try location search in case it was passed differently
      const urlParams = new URLSearchParams(window.location.search);
      const isRecovery = urlParams.get("type") === "recovery";
      if (!isRecovery) {
        console.warn("No recovery context or hash payload found");
      }
      return;
    }

    const params = new URLSearchParams(hash.replace("#", "?"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token") || "";

    if (access_token) {
      supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token,
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to restore reset session:", error);
          setErrorMsg("حدث خطأ أثناء تحميل جلسة استعادة كلمة المرور، يرجى طلب رابط جديد.");
        }
      });
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password.trim()) {
      setErrorMsg("يرجى كتابة كلمة المرور الجديدة.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("يجب أن تكون كلمة المرور من 6 أحرف أو أرقام على الأقل لضمان الأمان.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("كلمتا المرور غير متطابقتين، يرجى إعادة التأكد.");
      return;
    }

    setLoading(true);

    try {
      if (!hasSupabaseKeys) {
        setSuccessMsg("تمت محاكاة تحديث كلمة المرور بنجاح (وضع المعاينة الفوري)!");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || "فشلت عملية تحديث كلمة المرور.");
      } else {
        setSuccessMsg("تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setErrorMsg("حدث خطأ غير متوقع أثناء المعالجة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans" dir="rtl">
      
      {/* Right Column details */}
      <div className="md:w-[50%] lg:w-[55%] bg-gradient-to-br from-[#002B49] via-[#0057B8] to-[#0EA5A4] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden shrink-0 select-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-128 h-128 bg-[#0EA5A4]/25 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/15 shadow-sm text-white">
            <KeyRound className="w-6 h-6 text-[#10B981]" />
          </div>
          <span className="font-sans font-black text-lg tracking-wide">حسبة</span>
        </div>

        <div className="my-auto py-12 md:py-0 space-y-6 max-w-xl relative z-10 text-right">
          <div className="inline-flex items-center gap-2 bg-[#10B981]/20 border border-[#10B981]/35 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 shadow-sm leading-none">
            <Sparkles className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
            <span>نظام الحماية والأمان الذكي</span>
          </div>

          <div className="space-y-4">
            <h1 className="font-sans font-black text-3xl md:text-5xl leading-tight tracking-tight">
              تحديث كود المروق الآمن
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-slate-100/90 leading-relaxed font-semibold">
              يقوم نظام الاستيقان الآمن بالاتصال السحابي المشفر بالتحقق من هويتك وتعيين كلمة مرور جديدة دون وسيط لحماية حساب ممتلكاتك الحسابية أو معايير البنوك الخاصة بك.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-white/50 relative z-10 font-mono">
          © {new Date().getFullYear()} منصة حسبة العقارية. جميع الحقوق محفوظة لوزارة التجارة.
        </div>
      </div>

      {/* Left Column reset form */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center p-6 md:p-12">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
          
          <div className="text-right space-y-2">
            <h2 className="font-sans font-black text-2xl text-[#111827]">
              إعادة تعيين كلمة المرور
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              يرجى إدخال كلمة المرور الجديدة وتكرارها للمطابقة من أجل الدخول إلى حسابك.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-xl flex gap-2 w-full text-right" dir="rtl">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-950 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl space-y-3 text-right" dir="rtl">
              <div className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs font-black text-emerald-950 leading-relaxed">{successMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all block text-center"
              >
                الذهاب لتسجيل الدخول 🔑
              </button>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleUpdate} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-700 block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ادخل كلمة المرور الجديدة هنا"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-amber-500 outline-none transition-all pr-11 text-right font-mono"
                    dir="rtl"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-700 block">تأكيد كلمة المرور</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="كرر كلمة المرور الجديدة للتأكيد"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-amber-500 outline-none transition-all pr-11 text-right font-mono"
                    dir="rtl"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0057B8] hover:bg-[#002B49] text-white py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none shadow-md mt-6 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تعيين وتحديث البيانات...</span>
                  </>
                ) : (
                  <span>تحديث كلمة المرور وحفظها 🔒</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-[11px] text-[#0057B8] hover:underline font-bold transition-all cursor-pointer"
            >
              العودة إلى تسجيل الدخول
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
