import React from 'react';
import { ArrowRight, FileText, CheckCircle } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../contexts/AuthContext';

export function TermsPage() {
  const location = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    // If we can, return to the calculator or the previous page
    location.navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right selection:bg-blue-100 animate-fade-in" dir="rtl">
      {/* Header and Back Button */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#0057B8]/10 text-[#0057B8] rounded-xl flex items-center justify-center shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-black text-2xl text-gray-900 dark:text-white">شروط الاستخدام</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">آخر تحديث: يونيو 2026</p>
          </div>
        </div>
        {user && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للحسبة</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-premium space-y-8">
        
        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">1. قبول الشروط والبنود</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            مرحباً بك في منصة حسبة العقارية ("حسبة"). إن استخدامك لهذا الموقع الإلكتروني وتطبيقاته والخدمات المرتبطة به يعني قبولك الكامل وغير المشروط لهذه الشروط والأحكام. إذا كنت لا توافق على أي بند من هذه الشروط، يرجى التوقف عن استخدام الموقع فوراً.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">2. طبيعة الخدمة والنتائج التقديرية</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            تعتبر منصة حسبة تطبيقًا إرشاديًا ورياضيًا مستقلًا. يرجى الانتباه والتقيد بالبنود القانونية التالية:
          </p>
          <ul className="space-y-3.5 pr-2">
            <li className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-[#0057B8] shrink-0 mt-0.5" />
              <span className="font-bold text-gray-700 dark:text-slate-200 leading-relaxed">
                حسبة تقدم نتائج وحسابات تقديرية وتوجيهية فقط، ولا يمكن اعتبارها موافقة نهائية أو عرضًا تمويليًا رسميًا أو التزامًا تعاقديًا ملزمًا من أي بنك أو جهة تمويلية.
              </span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-[#0057B8] shrink-0 mt-0.5" />
              <span className="font-bold text-gray-700 dark:text-slate-200 leading-relaxed">
                البنوك والمؤسسات التمويلية قد تغير شروطها وهوامش الربح السنوية والحدود الدنيا للأجور والضوابط الائتمانية في أي وقت دون إشعار مسبق؛ وبالتالي قد تختلف الحسبة النهائية من البنك عن الأرقام المعروضة هنا.
              </span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-[#0057B8] shrink-0 mt-0.5" />
              <span className="font-bold text-gray-700 dark:text-slate-200 leading-relaxed">
                لا تضمن "حسبة" بأي شكل من الأشكال قبول طلبك الفعلي التمويلي لدى أي جهة مالية أو الحصول على الدعم السكني، حيث تخضع جميع المعاملات للقرارات والموافقات الائتمانية الخاصة بكل بنك والجهات المانحة للدعم كصندوق التنمية العقارية وسكني.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">3. مسؤولية العميل والمستخدم</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            المستخدم مسؤول مسؤولية تامة وحصرية عن صحة ودقة البيانات والمعلومات المدخلة في نماذج الحساب (مثل الراتب، تاريخ الميلاد، اسم جهة العمل، الالتزامات الشهرية القائمة، ونوع الدعم السكني المستحق). تقع أي خلافات في الحساب بسبب أخطاء أو إدخال بيانات غير صحيحة على عاتق المستخدم وحده.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">4. حقوق الملكية الفكرية</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            جميع المواد البرمجية، الخوارزميات الحسابية، الشفرات، التصاميم، النصوص والرموز البرمجية الخاصة بمنصة حسبة هي ملكية فكرية محمية بموجب أنظمة حماية حقوق المؤلف المعمول بها في المملكة العربية السعودية والقوانين الدولية. يمنع منعا باتا نسخها أو إعادة إنتاجها أو استخدامها في أعمال تجارية أخرى دون إذن كتابي مسبق.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">5. التعديل على الشروط والخدمات</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            تحتفظ المنصة بالحق الكامل في تعديل شروط الاستخدام هذه، أو ميزات الحاسبة، أو الرسوم والسياسات في أي وقت. يعتبر استمرار استخدامك للموقع بعد إجراء أي تعديلات قبولًا ضمنيًا لهذه التعديلات الجديدة.
          </p>
        </div>

      </div>
    </div>
  );
}
