import React, { useState, useEffect } from 'react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { getSubscriptionPlans } from '../lib/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  FileText, 
  Coins, 
  CreditCard, 
  HelpCircle, 
  ArrowLeft, 
  Mail, 
  User, 
  Crown,
  Lock,
  MessageCircle,
  Clock,
  Infinity as InfinityIcon,
  RotateCcw
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

export const ACTIVATION_WHATSAPP_NUMBER = '966506612761';

export function SubscriptionPage() {
  const { navigate } = useLocation();
  const { user } = useAuth();
  const { subscriptionSettings } = useAppState();
  const { 
    loading, 
    subscription, 
    billingProfile, 
    isTrialing, 
    isActive, 
    isExpired, 
    isCancelled,
    daysRemaining, 
    dailyLimit, 
    usedToday, 
    remainingToday, 
    refresh 
  } = useSubscriptionStatus();

  // Normalizing phone for display as local format
  const displayPhone = billingProfile?.phone_number || '—';

  const [refreshing, setRefreshing] = useState(false);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    async function loadPlans() {
      try {
        const list = await getSubscriptionPlans();
        if (list && list.length > 0) {
          setDbPlans(list);
        }
      } catch (err) {
        console.error('Error loading plans in subscription page:', err);
      }
    }
    loadPlans();
  }, []);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleActivateViaWhatsapp = (plan: any) => {
    const rawNumber = subscriptionSettings?.activationWhatsappNumber || ACTIVATION_WHATSAPP_NUMBER;
    const normalizedNumber = rawNumber.replace(/\D/g, '');

    const userEmail = user?.email || 'غير مسجل دخول';

    const messageText = `السلام عليكم، أريد تفعيل باقة في حسبة.
اسم الباقة: ${plan.name}
كود الباقة: ${plan.code}
السعر: ${plan.price_sar || plan.price} ريال
المدة: ${plan.duration_days || plan.duration} يوم
البريد المسجل: ${userEmail}`;

    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const plansList = dbPlans
    .filter(plan => plan.is_active)
    .map(plan => {
      const price_sar = plan.price_sar || 0;
      const duration_days = plan.duration_days || 30;
      const is_free_plan = plan.is_free_plan || price_sar === 0;

      let durationText = `${duration_days} يوم`;
      if (duration_days === 30) durationText = '30 يوماً';
      if (duration_days === 180 || duration_days === 182) durationText = '6 أشهر';
      
      const limitText = plan.daily_calculation_limit 
        ? `${plan.daily_calculation_limit} عمليات / يومياً` 
        : 'عمليات غير محدودة';

      let featuresList: string[] = [];
      if (Array.isArray(plan.features)) {
        featuresList = plan.features;
      } else if (typeof plan.features === 'string') {
        try {
          featuresList = JSON.parse(plan.features);
        } catch {
          featuresList = [];
        }
      }
      
      if (!featuresList || featuresList.length === 0) {
        featuresList = is_free_plan 
          ? [
              'ولوج كامل إلى حاسبة حسبة المتقدمة',
              'مقارنة 5 جهات تمويلية أساسية',
              'تتبع مؤشر الدعم السكني للمستفيدين',
              'حسبة نسبة الاستقطاع الدقيقة DSR'
            ]
          : [
              'عدد لا نهائي من العمليات الحسابية',
              'فتح كافة جهات التمويل والبنوك المعتمدة',
              'حسابات الدعم السكني الفوري والمؤجل',
              'صلاحيات الوصول إلى حاسبة التقاعد العسكري والمدني',
              'دعم فني خاص وإصدار تقارير مخصصة للعملاء'
            ];
      }

      // Determine colors & dynamic attributes from DB
      const cardColor = plan.card_color || 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900';
      const badgeColor = plan.badge_color || 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
      const badgeText = plan.badge_text || '';

      return {
        code: plan.code,
        name: plan.name,
        description: plan.description || '',
        price_sar,
        price: is_free_plan ? 'مجاني' : `${price_sar} ريال`,
        period: is_free_plan ? 'لمرة واحدة' : (duration_days <= 30 ? 'شهرياً' : 'دوري الكلفة'),
        duration: durationText,
        duration_days,
        limit: limitText,
        features: featuresList,
        is_free_plan,
        color: cardColor,
        tagColor: badgeColor,
        badgeText,
        daily_calculation_limit: plan.daily_calculation_limit,
        saved_results_limit: plan.saved_results_limit
      };
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-right font-sans" dir="rtl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 scale-x-[-1]" />
            <span>العودة إلى الحاسبة التمويلية</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Crown className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">إدارة وباقات الاشتراك للشركاء</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-1">
                تصفح الباقات، تحكم في هويتك الفوترية، واكتسب أقصى كفاءة لحساب حسبة.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleRefreshStatus}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>تحديث حالة الاشتراك المالي</span>
        </button>
      </div>

      {/* CURRENT STATUS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* SUBSCRIPTION SUMMARY CARD */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h3 className="text-xs font-extrabold text-gray-400 dark:text-slate-400 block mb-4">تفاصيل الاشتراك الحالي</h3>
          
          {loading ? (
            <div className="h-28 flex items-center justify-center">
              <span className="text-xs text-gray-400 dark:text-slate-400">جاري الاستعلام...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white block">
                    {subscription?.plan?.name || 'مستخدم عادي'}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold block mt-0.5">
                    الرمز التعريفي للباقة: {subscription?.plan?.code || 'guest'}
                  </span>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isTrialing ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                    isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                    isExpired ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' :
                    isCancelled ? 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' :
                    'bg-slate-50 text-slate-400 dark:bg-slate-850 dark:text-slate-500'
                  }`}>
                    {isTrialing ? 'فترة تجربة' :
                     isActive ? 'نشط مفعل' :
                     isExpired ? 'منتهي الصلاحية' :
                     isCancelled ? 'ملغي' :
                     'غير متاح'}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-105/80 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400">
                  <span>تاريخ الانتهاء المالي:</span>
                  <span className="text-gray-900 dark:text-white font-mono font-bold">
                    {subscription?.ends_at ? new Date(subscription.ends_at).toLocaleDateString('ar-SA') : 'منتهي / غير نشط'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 mt-2">
                  <span>الأيام المتبقية:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{daysRemaining} يوم</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DAILY USAGE METER */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h3 className="text-xs font-extrabold text-gray-400 dark:text-slate-400 block mb-4">مقياس استعلام الحاسبة (اليوم)</h3>
          
          {loading ? (
            <div className="h-28 flex items-center justify-center">
              <span className="text-xs text-gray-400 dark:text-slate-400">جاري الاستعلام...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-bold">إجمالي عمليات اليوم</span>
                  <div className="font-mono text-gray-900 dark:text-white">
                    <span className="text-xl font-extrabold">{usedToday}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 font-bold mx-1">من أصل</span>
                    <span className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400">
                      {dailyLimit === null ? '∞' : dailyLimit}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full @theme/transition rounded-full ${
                      dailyLimit === null ? 'bg-emerald-500 w-full' :
                      (usedToday / dailyLimit) >= 0.9 ? 'bg-red-500' :
                      (usedToday / dailyLimit) >= 0.7 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${dailyLimit === null ? 100 : Math.min(100, (usedToday / dailyLimit) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-t border-gray-105/80 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400">
                  <span>العمليات المتاحة اليوم:</span>
                  <span className="text-gray-900 dark:text-white font-bold flex items-center gap-1 text-[11px]">
                    {dailyLimit === null ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <InfinityIcon className="w-4 h-4" />
                        <span>مفتوح بالكامل</span>
                      </span>
                    ) : (
                      <span>{remainingToday} عملية</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BILLING IDENTIFICATION PROFILE */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h3 className="text-xs font-extrabold text-gray-400 dark:text-slate-400 block mb-4">الهوية الفوترية والتحقق</h3>
          
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-slate-400 font-semibold">رقم جوال التحقق:</span>
                <span className="text-gray-900 dark:text-white font-mono font-bold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span dir="ltr">{displayPhone}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-slate-400 font-semibold">تعديل الهاتف:</span>
                <span className="text-xs text-blue-600 dark:text-[#38BDF8] font-bold flex items-center gap-1 select-none">
                  <span>قابل للتعديل</span>
                </span>
              </div>
            </div>

            <div className="border-t border-gray-105/80 dark:border-slate-800 pt-3">
              <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-normal font-sans">
                * يُستخدم رقم الجوال لمنع تكرار الحسابات المجانية، ويمكنك تحديثه من إعدادات الحساب بشرط عدم استخدامه في حساب آخر.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* PLANS & PRICING GRIDS */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">خطط ومستويات اشتراكات حسبة</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-1 max-w-lg mx-auto">
          اختر الباقة الأنسب واستمتع بكافة الخواص التمويلية دون قيود
        </p>
      </div>

      {plansList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center my-8">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">لا توجد باقات متاحة حاليًا.</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-2">تواصل مع الإدارة لتفعيل الاشتراك.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plansList.map((p) => {
            const isSelected = subscription?.plan?.code === p.code && !isExpired;
            return (
              <div 
                key={p.code}
                className={`flex flex-col justify-between p-6 sm:p-8 rounded-3xl border text-right transition-all duration-300 relative ${p.color} ${
                  isSelected ? 'scale-102 ring-2 ring-indigo-500/20' : 'hover:translate-y-[-4px]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 left-4 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 font-extrabold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 z-10 select-none">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>باقة حسابك الحالية</span>
                  </div>
                )}

                <div>
                  {p.badgeText && (
                    <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-extrabold mb-4 ${p.tagColor}`}>
                      {p.badgeText}
                    </span>
                  )}
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white block mb-1">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-gray-400 dark:text-slate-400 mb-3 leading-relaxed">{p.description}</p>
                  )}
                  
                  <div className="flex items-baseline gap-1 mt-3 mb-4">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      {p.is_free_plan || p.price_sar === 0 ? 'مجاني' : `${p.price_sar} ريال`}
                    </span>
                    {p.price_sar > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">/ لمرة واحدة</span>
                    )}
                  </div>

                  <div className="py-2.5 px-3.5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl text-[11px] font-bold text-slate-600 dark:text-slate-300 flex flex-col gap-1.5 mb-6">
                    <div className="flex items-center justify-between">
                      <span>المدة:</span>
                      <span>{p.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>حد الحسبات اليومي (daily_calculation_limit):</span>
                      <span>{p.daily_calculation_limit ? `${p.daily_calculation_limit} حسبة / يومياً` : 'غير محدود'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>حد النتائج المحفوظة (saved_results_limit):</span>
                      <span>{p.saved_results_limit !== null && p.saved_results_limit !== undefined ? `${p.saved_results_limit} نتيجة` : 'غير محدود'}</span>
                    </div>
                    {p.is_free_plan && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>النوع:</span>
                        <span>باقة مجانية محدودة للاستخدام الأساسي</span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 block pb-1 border-b border-gray-100 dark:border-slate-800">تتضمن الباقة:</span>
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-gray-650 dark:text-slate-350">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  {isSelected ? (
                    <button 
                      disabled
                      className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950/30 text-xs font-extrabold rounded-2xl cursor-default text-center select-none"
                    >
                      باقة حسابك النشطة بالفعل
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleActivateViaWhatsapp(p)}
                      className="w-full py-3 bg-[#0057B8] text-white hover:bg-[#00479b] dark:bg-[#0ea5a4] dark:hover:bg-[#0c8e8d] text-xs font-extrabold rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 font-sans"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>طلب التفعيل عبر واتساب</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER NOTICE / FUTURE PAYMENTS INFORMATION */}
      <div className="bg-indigo-50/30 dark:bg-slate-900 p-6 rounded-3xl border border-indigo-100/40 dark:border-slate-810 flex flex-col md:flex-row items-center gap-5 justify-between">
        <div className="flex gap-4 items-start">
          <span className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-indigo-500 shrink-0 shadow-sm">
            <Coins className="w-5 h-5" />
          </span>
          <div className="text-right">
            <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">خطط التفعيل والتحصيل الإلكتروني المباشر</h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold leading-relaxed mt-1">
              الدفع الإلكتروني المباشر لتنشيط الباقات العقارية قيد التطوير والتكامل حاليًا. لتفعيل اشتراكك الحالي وتنشيط صلاحية حسابك، يرجى النقر على زر <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">"طلب التفعيل عبر واتساب"</span> المسجل على بطاقة الباقة أعلاه للتواصل المباشر مع خدمة العملاء وتلقي كود التفعيل الفوري.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
