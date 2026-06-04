import React from "react";
import { ShieldCheck, Award, Heart, Mail, Phone, Users, CheckCircle2 } from "lucide-react";

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right selection:bg-blue-100 select-none animate-fade-in" dir="rtl">
      
      {/* Hero section */}
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-[#0057B8]/10 text-[#0057B8] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="font-sans font-black text-3xl text-gray-900 tracking-tight">عن منصة حسبة الذكية</h1>
        <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
          حسبة هي منصة تقنية مالية (Fintech) رائدة، مخصصة لمساعدة المواطنين والمقيمين بالمملكة العربية السعودية في اتخاذ قرارات التمويل العقاري والشخصي الأذكى بمطابقة تامة مع أنظمة البنوك ومؤسسات الملاءة الائتمانية.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        
        {/* Card 1: Our vision */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-gray-900">رؤيتنا المنهجية</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            الريادة في تحسين الوعي الائتماني والتمويلي، وتوفير تجربة برمجية حديثة تمنح المقترض السعودي الشفافية الكاملة والمطابقة اللحظية بين لوائح التمويل بالبنوك المختلفة (كـ الراجحي والأهلي) وواقع حساباته ومدخراته الخاصة.
          </p>
        </div>

        {/* Card 2: Value focus */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-gray-900">المطابقة المعتمدة</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            نحن ملتزمون بالمطابقة المستمرة مع تعديلات البنك المركزي السعودي (SAMA) وأنظمة احتساب الراتب التقاعدي المعتمدة محلياً لتفادي أي فروقات في الاحتساب الفعلي. حساباتنا تضمن للعميل تقديرات دقيقة بنسبة تزيد عن 99.8% مقارنة بأنظمة البنوك الرسمية.
          </p>
        </div>

      </div>

      {/* Checklist section */}
      <div className="bg-[#0057B8]/5 border border-[#0057B8]/10 rounded-2xl p-6 md:p-8 space-y-6 mb-12">
        <h3 className="font-sans font-bold text-lg text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0057B8]" />
          <span>لماذا يثق بنا مستخدمو المنصة والعملاء؟</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-[#0EA5A4] shrink-0" />
            <span className="text-xs font-bold text-gray-700">تحديث فوري لهوامش ومقاييس البنوك</span>
          </div>
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-[#0EA5A4] shrink-0" />
            <span className="text-xs font-bold text-gray-700">محاكاة متكاملة لقواعد معاشات التقاعد</span>
          </div>
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-[#0EA5A4] shrink-0" />
            <span className="text-xs font-bold text-gray-700">متوافق بالكامل مع ضوابط الشريعة الإسلامية</span>
          </div>
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-[#0EA5A4] shrink-0" />
            <span className="text-xs font-bold text-gray-700">دعم متقدم لجميع الباقات والعسكريين والمتقاعدين</span>
          </div>
        </div>
      </div>

      {/* Technical Contacts details bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-right">
          <h4 className="font-sans font-bold text-lg">هل تحتاج لمساعدة تقنية أو استشارة تمويلية؟</h4>
          <p className="text-xs text-slate-400">فريق الدعم الفني متواجد على مدار الساعة لخدمتكم والإجابة على استفساراتكم.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          <a
            href="mailto:support@hesba.sa"
            className="flex items-center gap-2.5 px-5 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            <Mail className="w-4 h-4 text-[#0EA5A4]" />
            <span className="font-mono">support@hesba.sa</span>
          </a>
          <a
            href="tel:+966506612761"
            className="flex items-center justify-center gap-2.5 px-5 py-3 bg-[#0057B8] hover:bg-[#004bb0] rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Phone className="w-4 h-4" />
            <span className="font-mono" dir="ltr">+966 50 661 2761</span>
          </a>
        </div>
      </div>

    </div>
  );
}
