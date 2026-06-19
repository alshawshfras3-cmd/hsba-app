import React from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { useLocation } from '../../hooks/useLocation';
import { 
  Lock, 
  ChevronRight, 
  Crown, 
  ShieldAlert, 
  Clock, 
  Sparkles, 
  MessageCircle, 
  RefreshCw 
} from 'lucide-react';

interface SubscriptionGateProps {
  children: React.ReactNode;
  /** If true, renders a centered blocking page instead of a page overlay */
  fullPage?: boolean;
}

export function SubscriptionGate({ children, fullPage = false }: SubscriptionGateProps) {
  const { navigate } = useLocation();
  const { 
    loading, 
    canCalculate, 
    lockReason, 
    usedToday, 
    dailyLimit, 
    daysRemaining, 
    refresh 
  } = useSubscriptionStatus();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-400 font-bold mt-4">جاري فحص حالة اشتراكك العقاري...</span>
      </div>
    );
  }

  // If they are allowed to calculate, let them slide!
  if (canCalculate) {
    return <>{children}</>;
  }

  // Render Premium Block Screens
  const getBlockMeta = () => {
    switch (lockReason) {
      case 'expired_trial':
        return {
          title: 'انتهت الفترة التجريبية لحسابك',
          desc: 'لقد انقضت فترة التجربة المجانية الممنوحة. يرجى المبادرة بالاشتراك في إحدى باقات حسبة المعتمدة لمواصلة مقارنة وعرض العمليات الائتمانية والتمويلية لعملائك.',
          icon: <Clock className="w-10 h-10 text-rose-500 animate-pulse" />,
          buttonText: 'تفعيل واشتراك الآن',
          badgeText: 'انتهاء فترة التجربة'
        };
      case 'daily_limit_reached':
        return {
          title: `وصلت إلى الحد اليومي الأقصى للعمليات (${dailyLimit} عملية)`,
          desc: `لقد استنفدت حد العمليات المجاني أو المخصص لليوم (${usedToday} من أصل ${dailyLimit}). لتجنب تعطل مقارناتك، يمكنك الانتظار لمطلع الغد أو الترقية فوراً لباقة حسبة العقارية اللانهاية.`,
          icon: <ShieldAlert className="w-10 h-10 text-amber-500" />,
          buttonText: 'ترقية وحسابات غير محدودة',
          badgeText: 'الحد اليومي المستهلك'
        };
      case 'cancelled':
        return {
          title: 'تم إيقاف الاشتراك المالي لشريك حسبة',
          desc: 'نحيطكم علماً بأن باقة المزايا العقارية المسجلة لحسابكم قد تم إلغاؤها بناء على طلبات الإدارة أو لم تنته تسويتها الفوترية التلقائية. يرجى الاستعلام ومراجعة الاشتراك.',
          icon: <Lock className="w-10 h-10 text-gray-500" />,
          buttonText: 'مراجعة خيارات الاشتراك',
          badgeText: 'باقة ملغاة'
        };
      case 'no_subscription':
      default:
        return {
          title: 'يتطلب حسابك تسجيل باقة نشطة',
          desc: 'عذراً، لم نتمكن من العثور على أي باقة اشتراك سارية مرتبطة بهويتك الفوترية. يرجى تفعيل فترة التجربة المجانية الفورية للاستفادة التامة من حاسبة حسبة الذكية.',
          icon: <Lock className="w-10 h-10 text-indigo-500" />,
          buttonText: 'تنشيط الباقة التجريبية مجاناً',
          badgeText: 'لا يوجد خطة اشتراك'
        };
    }
  };

  const meta = getBlockMeta();

  const handleAction = () => {
    navigate('/subscription');
  };

  const currentLayoutClass = fullPage 
    ? "min-h-[85vh] flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B0F19]" 
    : "w-full max-w-4xl mx-auto p-4 my-8";

  return (
    <div className={currentLayoutClass} dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl shadow-xl p-8 sm:p-12 text-center max-w-xl mx-auto relative overflow-hidden select-none">
        {/* Subtle Decorative elements */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-sky-500/5 rounded-full blur-2xl -ml-12 -mb-12"></div>

        {/* Badge status */}
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-450 text-[10px] font-extrabold rounded-lg mb-6">
          <Crown className="w-3.5 h-3.5" />
          <span>{meta.badgeText}</span>
        </span>

        {/* Custom Lock Icons container */}
        <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-inner mb-6">
          {meta.icon}
        </div>

        {/* Lock Headings */}
        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-normal tracking-tight mb-3">
          {meta.title}
        </h2>

        {/* Descriptions */}
        <p className="text-xs sm:text-[13px] text-gray-500 dark:text-slate-400 font-semibold leading-relaxed mb-8">
          {meta.desc}
        </p>

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <button 
            onClick={handleAction}
            className="px-6 py-3 bg-[#0057B8] text-white hover:bg-[#00479b] dark:bg-[#0ea5a4] dark:hover:bg-[#0c8e8d] font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{meta.buttonText}</span>
          </button>

          <button 
            onClick={() => {
              window.open('https://wa.me/966506612761?text=مرحباً،%20أواجه%20مشكلة%20في%20حدود%20العمليات%20التمويلية%20وتشغيل%20حاسبة%20حسبة%20الذكية.', '_blank');
            }}
            className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل الدعم الفوري</span>
          </button>
        </div>

        {/* Internal notice */}
        <div className="border-t border-gray-100 dark:border-slate-800 mt-8 pt-5 text-[10px] text-gray-450 dark:text-slate-500 font-sans leading-normal">
          * لمعاينة باقات الاشتراك، تعديل الهوية الفوترية، أو الاستقطاعات، يرجى الولوج إلى قسم <span onClick={handleAction} className="text-indigo-500 cursor-pointer underline font-bold">باقات الاشتراك</span>.
        </div>
      </div>
    </div>
  );
}
