import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

export function DisclaimerPage() {
  const location = useLocation();

  const handleBack = () => {
    location.navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right selection:bg-blue-100 animate-fade-in" dir="rtl">
      {/* Header and Back Button */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-black text-2xl text-gray-900 dark:text-white">إخلاء المسؤولية</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">آخر تحديث: يونيو 2026</p>
          </div>
        </div>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للحسبة</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-premium space-y-8">
        
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/55 dark:border-amber-800/40 p-5 rounded-2xl flex flex-col sm:flex-row gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-sans font-extrabold text-[#9A3412] dark:text-amber-500 text-sm">بيان إشعار توضيحي هام للعموم:</h4>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed font-bold">
              توضّح منصة "حسبة" لجميع روادها ومستخدميها أنها عبارة عن أداة تقنية مستقلة للاحتساب والتوجيه والتعليم المالي الذاتي، ولا تقدّم منتجات ائتمانية بصفة مباشرة.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">1. حسبة ليست جهة تمويلية أو بنكاً</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            يجب الإدراك والعلم بشكل تام أن <span className="font-black text-[#0057B8]">منصة حسبة ليست بنكاً تجارياً، وليست جهة تمويلية أو مرخصة لتقديم خدمات الإقراض مباشرة</span>، وليست وسيطاً ائتمانياً معتمداً ومخولاً بصناعة عروض ملزمة نيابة عن البنوك والمؤسسات المالية المسجلة.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">2. الأرقام تقديرية وتتأثر بالمتغيرات وقت الحساب</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            تعتمد نتائج الحسبة (كتكلفة التمويل الإجمالية، الأقساط الشهرية المقدرة، الحدود القصوى للتمويل العقاري أو الشخصي، أو نسبة الاستقطاع الشهري) على البيانات والمعطيات التي يقوم المستخدم بإدخالها بنفسه، وعلى القواعد والمعايير المتوفرة حالياً في نظام المنصة أثناء وقت الحساب. قد تختلف النتائج الفعلية بعدة أشكال نظراً لتغيّر الفوائد وهوامش الجدولة لدى البنوك والجهات التمويلية في عروضها الرسمية النهائية.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">3. القرار المالي يقع تحت وطأة مسؤولية العميل الفردية</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            لا تتحمل "حسبة" بأي شكل من الأشكال (سواءً كان إدارتها أو مطوروها أو شركائها) أي مسؤولية قانونية أو مالية أو تعويضية عن أي خسائر، أو قرارات استثمارية، أو التزامات تعاقدية مادية يتخذها العميل أو يبرمها بناءً على المعلومات والنتائج التقديرية المعروضة في الحاسبة فقط. يرجى دائماً مراجعة البنك أو مستشارك المالي المعتمد قبل التوقيع على أي التزامات تمويلية.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">4. الموافقة والقرار النهائي</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            إن عملية الحصول على التمويل والموافقة النهائية تخضع بالكامل للسياسات الائتمانية والتقييمات الذاتية والضمانات التي يطلبها كل بنك أو جهة تمويلية، وبما ينطبق مع أنظمة البنك المركزي السعودي SAMA. النتائج الحسابية في هذه المنصة لا تعني أبداً استحقاق العميل التلقائي للتمويل.
          </p>
        </div>

      </div>
    </div>
  );
}
