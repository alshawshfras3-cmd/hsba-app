import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../contexts/AuthContext';

export function PrivacyPage() {
  const location = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    location.navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right selection:bg-blue-100 animate-fade-in" dir="rtl">
      {/* Header and Back Button */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-black text-2xl text-gray-900 dark:text-white">سياسة الخصوصية</h1>
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
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">1. التزامنا بحماية الخصوصية</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            تعتبر خصوصية بياناتك وحمايتها من أهم أولوياتنا في منصة حسبة. نحن ملتزمون التزامًا تامًا بالحفاظ على سرية المعلومات الشخصية والبيانات المالية التي تشاركها معنا، ونحرص على توفير بيئة استخدام آمنة وموثوقة تتوافق مع نظام حماية البيانات الشخصية الصادر في المملكة العربية السعودية.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">2. البيانات والمعلومات التي نقوم بجمعها</h2>
          <p className="text-sm text-gray-600 dark:text-[#CBD5E1] leading-relaxed font-medium">
            لأغراض تقديم خدمة حسابات التمويل العقاري بدقة، نقوم بمعالجة أو حفظ البيانات التي تقوم بإدخالها في الحاسبة بملء إرادتك، والتي تشمل:
          </p>
          <ul className="space-y-3 pr-2 font-medium">
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">البيانات المالية: مثل قيمة الراتب الشهري الإجمالي والأساسي، القطاع الوظيفي (مدني، شبه حكومي، شركات، عسكري، متقاعد)، والالتزامات المالية أو القروض القائمة حالياً.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">البيانات الشخصية: مثل العمر أو تاريخ الميلاد، والبريد الإلكتروني، والاسم الكامل للمستخدم المعتمد لغرض إدارة العضوية.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">تفضيلات التمويل والدعم: مثل البنك المفضل، ونوع الدعم السكني المستهدف أو استحقاق إشعارات اعتزاز.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">3. استخدام ومعالجة البيانات</h2>
          <p className="text-sm text-gray-600 dark:text-[#CBD5E1] leading-relaxed font-medium">
            يقتصر استخدام البيانات المدخلة في منصة حسبة على الأغراض التالية فقط:
          </p>
          <ul className="space-y-3 pr-2 font-medium">
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">إجراء الحسابات الرياضية الدقيقة للتمويل العقاري والشخصي ومطابقتها مع هوامش البنوك المسجلة.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">تخزين وحفظ نتائج "حسباتك" السابقة لتمكينك من مراجعتها وتعديلها ومشاركتها في لوحة حسابك لاحقاً.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">تطوير منصة الحسبة وتحسين دقة خوارزميات محركات الفحص المالي والعمل الميداني.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">4. سرية البيانات (عدم بيع البيانات)</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            نحن نلتزم التزامًا قطعيًا ومطلقًا بأن <strong className="text-emerald-600">منصة حسبة لا تقوم ببيع أو تأجير أو مشاركة أو تداول أي من بياناتك الشخصية والمالية</strong> مع أي جهات خارجية أو أطراف ثالثة لأغراض دعائية أو إعلانية تجارية دون موافقة صريحة منك.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">5. الشراكات والخدمات التقنية وسيرفر الحفظ</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
            تعتمد المنصة على خدمات تقنية سحابية عالمية آمنة (مثل Supabase) لإدارة قواعد البيانات والتحقق من حسابات المستخدمين. يتم نقل جميع البيانات وتخزينها عبر خوادم آمنة ومشفرة بالكامل لحماية حساباتك وتجربة استخدامك من أي اختراقات أو وصول غير مصرح به.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">6. حقوق المستخدم ومسؤولياته</h2>
          <p className="text-sm text-gray-600 dark:text-[#CBD5E1] leading-relaxed font-medium">
            تنص سياسة حماية الخصومة على الالتزامات الائتمانية والشفافية التالية:
          </p>
          <ul className="space-y-3 pr-2 font-medium">
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">التحكم بالبيانات: يحق للمستخدم في أي وقت طلب استبقاء أو تعديل البيانات المالية أو حذف حسابه وبياناته المسجلة والمسودة بالكامل من قواعد بياناتنا السحابية.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-slate-200">مسؤولية الصدق: المستخدم مسؤول تماماً عن عدم إدخال أي بيانات غير صحيحة أو تخص شخصاً آخر للاستعلام دون الحصول على إذن وتصريح مسبق وموثق منه.</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
