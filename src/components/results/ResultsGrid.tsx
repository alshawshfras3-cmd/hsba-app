import React, { useState } from 'react';
import { BankCalculationResult, ProductId } from '../../types';
import { 
  Building2, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, Clock, Percent, ListCollapse,
  Download, HelpCircle, Activity, Info, Users, ChevronDown, Award, Bookmark, Copy
} from 'lucide-react';
import { useAppState } from '../../context/AppContext';
import { saveCalculationResult } from '../../lib/savedResultsService';

interface ResultsGridProps {
  results: BankCalculationResult[];
  productId: ProductId;
  onRestart: () => void;
  existingMonthlyObligations?: number;
  obligationRemainingMonths?: number;
  mainFinanceType?: 'real_estate' | 'personal_only' | 'real_estate_with_existing_personal';
  sectorId?: string;
}

export default function ResultsGrid({ 
  results, 
  productId: rawProductId, 
  onRestart,
  existingMonthlyObligations = 0,
  obligationRemainingMonths = 0,
  mainFinanceType = 'real_estate',
  sectorId = 'gov_civil'
}: ResultsGridProps) {
  // Normalize legacy aliases for display-only compatibility
  const productId = (rawProductId === 'both' as any)
    ? 'real_estate_with_new_personal'
    : (rawProductId === 'real_estate' as any)
    ? 'real_estate_only'
    : (rawProductId === 'real_estate_with_personal_existing' as any)
    ? 'real_estate_with_existing_personal'
    : (rawProductId === 'personal' as any)
    ? 'personal_only'
    : rawProductId;

  const { user, userRole, userSubscriptions, setUserSubscriptions } = useAppState();
  const [activeSort, setActiveSort] = useState<'power' | 'installment' | 'margin' | 'term'>('power');
  const [selectedOffer, setSelectedOffer] = useState<BankCalculationResult | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Saved Results states
  const [saveOffer, setSaveOffer] = useState<BankCalculationResult | null>(null);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [saveCustomerName, setSaveCustomerName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [saveErrorText, setSaveErrorText] = useState<string>('');
  const [showAuthRequiredAlert, setShowAuthRequiredAlert] = useState<boolean>(false);

  const currentSub = userSubscriptions?.find(sub => sub.email === user?.email);
  const isSubscribed = true;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'refuse' } | null>(null);

  const handleCopyText = async (offer: BankCalculationResult, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal opening!

    const isApp = offer.status === 'approved';
    const isWarn = offer.status === 'warning';
    const isRej = offer.status === 'rejected';

    const statusAr = isApp ? 'مقبول' : isWarn ? 'مقبول بتحفظ' : 'غير مقبول';

    const termText = mainFinanceType === 'personal_only' 
      ? 'مدة التمويل الشخصي: 5 سنوات (60 شهراً)' 
      : `مدة التمويل العقاري: ${Math.floor(offer.termMonths / 12)} سنة${Math.round(offer.termMonths % 12) > 0 ? ` و ${Math.round(offer.termMonths % 12)} أشهر` : ''}`;

    const formatNum = (num: number) => Math.round(num).toLocaleString('en-US');

    const totalAmount = mainFinanceType === 'personal_only' 
      ? offer.personalAmount 
      : mainFinanceType === 'real_estate_with_existing_personal'
      ? offer.realEstateAmount
      : offer.totalPurchasingPower;

    let lines: string[] = [];

    lines.push(`البنك: ${offer.bankName}`);
    lines.push(`الحالة: ${statusAr}`);
    lines.push(termText);
    lines.push(''); // empty line

    lines.push(`إجمالي التمويل المتاح: ${formatNum(totalAmount)} ريال`);

    if (productId !== 'personal_only') {
      lines.push(`القرض العقاري: ${formatNum(offer.realEstateAmount)} ريال`);
    }
    if (productId !== 'real_estate_only' && mainFinanceType !== 'real_estate_with_existing_personal' && offer.supportsPersonal !== false) {
      lines.push(`القرض الشخصي: ${formatNum(offer.personalAmount)} ريال`);
    }

    // --- الدعم بعد مبالغ التمويل وقبل الأقساط ---
    const resolvedSupportAmount = offer.housingSupportAmount 
      ?? (offer as any).supportAmount 
      ?? (offer as any).monthlySupport 
      ?? (offer as any).downPaymentSupport
      ?? (offer.diagnostics?.monthlySupport || offer.diagnostics?.downPaymentSupport)
      ?? 0;

    let resolvedSupportType = offer.supportType || 'none';
    if (resolvedSupportType === 'none' || !offer.supportType) {
      if ((offer as any).monthlySupport && (offer as any).monthlySupport > 0) {
        resolvedSupportType = 'monthly';
      } else if ((offer as any).downPaymentSupport && (offer as any).downPaymentSupport > 0) {
        resolvedSupportType = 'downpayment';
      } else if (offer.diagnostics?.monthlySupport && offer.diagnostics?.monthlySupport > 0) {
        resolvedSupportType = 'monthly';
      } else if (offer.diagnostics?.downPaymentSupport && offer.diagnostics?.downPaymentSupport > 0) {
        resolvedSupportType = 'downpayment';
      }
    }

    if (resolvedSupportAmount > 0) {
      if (resolvedSupportType === 'monthly') {
        lines.push(`الدعم السكني الشهري: ${formatNum(resolvedSupportAmount)} ريال شهريًا`);
      } else {
        lines.push(`دعم الدفعة المقدمة: ${formatNum(resolvedSupportAmount)} ريال`);
      }
    } else {
      lines.push(`الدعم السكني: غير مدعوم`);
    }

    const resolvedEtizaz = offer.etizazAmount ?? (offer as any).etizazAmount ?? 0;
    if (resolvedEtizaz > 0) {
      lines.push(`دعم اعتزاز: ${formatNum(resolvedEtizaz)} ريال`);
    }

    lines.push(''); // empty line

    if (mainFinanceType === 'personal_only') {
      lines.push(`قسط التمويل الشخصي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
    } else if (productId === 'real_estate_with_new_personal') {
      lines.push(`القسط الشهري الإجمالي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
      lines.push(`├─ قسط العقاري: ${formatNum(offer.realEstateInstallmentOnly || 0)} ريال`);
      lines.push(`└─ قسط الشخصي: ${offer.supportsPersonal === false ? "غير متوفر" : `${formatNum(offer.personalInstallmentAmount || 0)} ريال`}`);
    } else {
      lines.push(`قسط التمويل العقاري: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
    }

    if (offer.monthlyInstallmentAfterRetirement > 0) {
      lines.push(`القسط التقاعدي العقاري: ${formatNum(offer.monthlyInstallmentAfterRetirement)} ريال / شهر`);
    }

    lines.push(`هامش الربح السنوي: ${offer.annualMargin}%`);

    const textToCopy = lines.join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setToast({ message: 'تم نسخ الحسبة بنجاح', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to copy calculation:', err);
    }
  };

  const toggleCardExpansion = (bankId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal opening!
    setExpandedCards(prev => ({
      ...prev,
      [bankId]: !prev[bankId]
    }));
  };

  const getSectorArabicName = (secId?: string) => {
    switch (secId) {
      case 'gov_civil': return 'حكومي مدني';
      case 'military': return 'عسكري';
      case 'military_officer': return 'عسكري (ضابط)';
      case 'military_individual': return 'عسكري (أفراد)';
      case 'semi_gov': return 'شبه حكومي';
      case 'companies': return 'موظف شركات';
      case 'retired': return 'متقاعد';
      default: return secId || 'قطاع غير محدد';
    }
  };

  const getFinanceTypeArabicName = (type?: string, prodId?: string) => {
    if (prodId === 'personal' || prodId === 'personal_only') return 'تمويل شخصي فقط';
    if (prodId === 'real_estate' || prodId === 'real_estate_only') return 'تمويل عقاري فقط';
    if (prodId === 'both' || prodId === 'real_estate_with_new_personal') return 'تمويل عقاري وشخصي متكامل';
    if (prodId === 'real_estate_with_existing_personal' || prodId === 'real_estate_with_personal_existing') return 'تمويل عقاري مع التزام قائم';
    
    switch (type) {
      case 'personal_only': return 'تمويل شخصي فقط';
      case 'real_estate': return 'تمويل عقاري';
      case 'real_estate_with_existing_personal': return 'تمويل عقاري بوجود التزام شخصي قائم';
      default: return 'تمويل سكني متكامل';
    }
  };

  const handleSaveClick = (offer: BankCalculationResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
    
    if (!user) {
      setShowAuthRequiredAlert(true);
      return;
    }

    setSaveOffer(offer);
    setSaveTitle(`تقرير حسبة ${offer.bankName} - ${getFinanceTypeArabicName(mainFinanceType, productId)}`);
    setSaveCustomerName(user?.user_metadata?.full_name || '');
    setSaveStatus(null);
    setSaveErrorText('');
  };

  const executeSaveResult = async () => {
    if (!saveOffer || !user) return;
    setIsSaving(true);
    setSaveStatus(null);

    const fTypeArabic = getFinanceTypeArabicName(mainFinanceType, productId);
    const sectorArabic = getSectorArabicName(sectorId);

    try {
      const res = await saveCalculationResult({
        userId: user.id,
        userEmail: user.email || '',
        offer: saveOffer,
        title: saveTitle || `تقرير حسبة ${saveOffer.bankName}`,
        customerName: saveCustomerName,
        financeType: fTypeArabic,
        sector: sectorArabic
      });

      if (res.success) {
        setSaveStatus('success');
        // Clear inputs after short delay or keep to display feedback
        setTimeout(() => {
          setSaveOffer(null);
          setSaveStatus(null);
        }, 2200);
      } else {
        setSaveStatus('error');
        setSaveErrorText(res.error || 'حدث خطأ غير متوقع أثناء معالجة الطلب.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorText(err.message || 'فشل الاتصال وحفظ التقرير.');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply sorting
  const sortedResults = [...results].sort((a, b) => {
    // Keep ineligible at the bottom
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    if (!a.isEligible && !b.isEligible) return 0;

    switch (activeSort) {
      case 'power':
        if (mainFinanceType === 'personal_only') {
          return b.personalAmount - a.personalAmount;
        }
        return b.totalPurchasingPower - a.totalPurchasingPower;
      case 'installment':
        return a.monthlyInstallmentBeforeRetirement - b.monthlyInstallmentBeforeRetirement;
      case 'margin':
        return a.annualMargin - b.annualMargin;
      case 'term':
        return b.termMonths - a.termMonths;
      default:
        return b.totalPurchasingPower - a.totalPurchasingPower;
    }
  });

  return (
    <div className="w-full">
      {/* Header and Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">نتائج الحسبة وعروض جهات التمويل</h2>
          <p className="text-sm text-[#6B7280]">تم حساب أفضل عروض وبدائل القروض من كافة البنوك النشطة بناءً على ضوابط ساما ومؤسسة التقاعد.</p>
        </div>
        <button
          onClick={onRestart}
          className="self-start text-sm underline text-[#0057B8] font-medium hover:text-[#0a4891] cursor-pointer"
        >
          إعادة تعبئة البيانات
        </button>
      </div>

      {/* Sorting Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 justify-start">
        <span className="text-xs font-bold text-[#6B7280] ml-2">ترتيب النتائج:</span>
        <button
          onClick={() => setActiveSort('power')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'power'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أعلى تمويل وقدرة شراء
        </button>
        <button
          onClick={() => setActiveSort('installment')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'installment'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أقل قسط شهري
        </button>
        <button
          onClick={() => setActiveSort('margin')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'margin'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أقل هامش فائدة
        </button>
        <button
          onClick={() => setActiveSort('term')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSort === 'term'
              ? 'bg-[#0057B8] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          أطول فترة سداد
        </button>
      </div>

      {/* Bank Cards Grid with optional Subscription blurred state and relative wrapper */}
      <div className={`relative ${!isSubscribed ? 'min-h-[480px]' : ''}`}>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!isSubscribed ? 'blur-md pointer-events-none select-none contrast-[0.80]' : ''}`}>
          {sortedResults.map((offer, index) => {
            const isApp = offer.status === 'approved';
            const isWarn = offer.status === 'warning';
            const isRej = offer.status === 'rejected';
            const isBestOffer = index === 0 && offer.isEligible;

            return (
              <div
                key={offer.bankId}
                onClick={() => setSelectedOffer(offer)}
                className={`bg-white rounded-3xl border transition-all duration-300 p-6 relative flex flex-col justify-between cursor-pointer group hover:-translate-y-1 ${
                  isBestOffer
                    ? 'border-[#0057B8] bg-gradient-to-tr from-[#0057B8]/[0.01] to-[#0057B8]/[0.03] ring-1 ring-[#0057B8]/20 shadow-premium hover:shadow-card-hover'
                    : offer.isEligible
                    ? 'border-slate-250/70 hover:border-[#0057B8]/80 hover:shadow-premium'
                    : 'border-rose-100 bg-rose-50/10'
                }`}
              >
                {/* Outstanding Best Offer Badge */}
                {isBestOffer && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-l from-amber-500 to-yellow-500 text-white shadow-xs">
                    <span>⭐ أفضل خيار مرشح</span>
                  </div>
                )}

                {/* Badge */}
                <div className={`absolute top-4 ${isBestOffer ? 'left-4' : 'left-4'}`}>
                  {isApp && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>مقبول</span>
                    </span>
                  )}
                  {isWarn && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>مقبول بتحفظ</span>
                    </span>
                  )}
                  {isRej && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>غير مقبول</span>
                    </span>
                  )}
                </div>

                {/* Bank Logo / Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${offer.logoColor} text-white flex items-center justify-center font-bold text-center text-sm p-1 select-none shadow-xs group-hover:scale-105 transition-transform`}>
                    {offer.logoText}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#111827] text-lg flex items-center gap-2">
                      <span>{offer.bankName}</span>
                    </h3>
                    <p className={`text-xs ${offer.isAgeLimitingFactor ? 'text-rose-600 font-bold animate-pulse' : 'text-[#6B7280]'}`}>
                      {mainFinanceType === 'personal_only' 
                        ? 'مدة التمويل الشخصي: 5 سنوات (60 شهراً)' 
                        : `مدة التمويل العقاري: ${Math.floor(offer.termMonths / 12)} سنة ${Math.round(offer.termMonths % 12) > 0 ? `و ${Math.round(offer.termMonths % 12)} أشهر` : ''}`}
                    </p>
                    {offer.isAgeLimitingFactor && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold text-[#991B1B] bg-red-100/50 border border-red-200 px-2 py-0.5 rounded-md">
                        ⚠️ العمر يحدّ من مدة سداد التمويل
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Numbers */}
                {offer.isEligible ? (
                  <div className="space-y-4 mb-6 flex-1 flex flex-col justify-between">
                    {/* Total budget (Always visible, prominent at the beginning) */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/30 px-4 py-4 md:py-3.5 rounded-xl border border-slate-200/50">
                      <span className="text-[11px] text-[#6B7280] font-extrabold block mb-1">
                        {mainFinanceType === 'personal_only' 
                          ? 'مبلغ التمويل الشخصي المتاح' 
                          : mainFinanceType === 'real_estate_with_existing_personal'
                          ? 'مبلغ التمويل العقاري المتاح'
                          : 'إجمالي مبلغ التمويل المتكامل المتاح'}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-[#0057B8] leading-none shrink-0">
                          {Math.round(mainFinanceType === 'personal_only' 
                            ? offer.personalAmount 
                            : mainFinanceType === 'real_estate_with_existing_personal'
                            ? offer.realEstateAmount
                            : offer.totalPurchasingPower).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs font-bold text-[#6B7280]">ريال سعودي</span>
                      </div>
                    </div>

                    {/* Mobile-only Accordion Selector */}
                    <div className="block sm:hidden">
                      <button
                        type="button"
                        onClick={(e) => toggleCardExpansion(offer.bankId, e)}
                        className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/50 text-[#0057B8] text-xs font-bold hover:bg-slate-100/80 active:scale-98 transition-all cursor-pointer"
                      >
                        <span>{expandedCards[offer.bankId] ? 'إخفاء تفاصيل الحسبة والقسط' : 'عرض تفاصيل الحسبة ومؤشر الاقتطاع'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedCards[offer.bankId] ? 'rotate-180 text-[#0a4891]' : 'text-[#0057B8]'}`} />
                      </button>
                    </div>

                    {/* Collapsible Details Container */}
                    <div className={`${expandedCards[offer.bankId] ? 'block' : 'hidden'} sm:block space-y-4 animate-fade-in`}>
                      {/* Components */}
                      <div className="grid grid-cols-2 gap-4">
                        {mainFinanceType === 'personal_only' ? (
                          <>
                            {/* 2. قسط التمويل الشخصي */}
                            <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-3 col-span-2 flex justify-between items-center">
                              <span className="text-xs font-semibold text-[#065F46]">قسط التمويل الشخصي:</span>
                              <span className="font-bold text-emerald-600">
                                {Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال / شهر
                              </span>
                            </div>

                            {/* 3. إجمالي الأرباح */}
                            <div className="border border-[#E5E7EB] rounded-xl p-3 col-span-2 flex justify-between items-center bg-gray-50/50">
                              <span className="text-xs font-semibold text-[#6B7280]">إجمالي الأرباح:</span>
                              <span className="font-bold text-rose-600">
                                {Math.round(offer.personalProfitAmount !== undefined ? offer.personalProfitAmount : (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12))).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال
                              </span>
                            </div>

                            {/* 4. إجمالي السداد */}
                            <div className="border border-[#E5E7EB] rounded-xl p-3 col-span-2 flex justify-between items-center bg-gray-50/50">
                              <span className="text-xs font-semibold text-[#6B7280]">إجمالي السداد:</span>
                              <span className="font-bold text-slate-800">
                                {Math.round(offer.personalTotalRepayment !== undefined ? offer.personalTotalRepayment : (offer.personalAmount + (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12)))).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال
                              </span>
                            </div>

                            {/* 5. نسبة الاستقطاع المعتمدة */}
                            <div className="border border-[#E5E7EB] rounded-xl p-3">
                              <span className="text-xs text-[#6B7280] block mb-0.5">نسبة الاستقطاع المعتمدة</span>
                              <span className="font-bold text-[#111827]">{offer.dsrUsed}%</span>
                            </div>

                            {/* 6. نسبة الربح السنوية */}
                            <div className="border border-[#E5E7EB] rounded-xl p-3">
                              <span className="text-xs text-[#6B7280] block mb-0.5">نسبة الربح السنوية</span>
                              <span className="font-bold text-[#0057B8]">{offer.annualMargin}%</span>
                            </div>

                            {/* 7. مدة التمويل */}
                            <div className="border border-[#E5E7EB] rounded-xl p-3 border-dashed">
                              <span className="text-xs text-[#6B7280] block mb-0.5">مدة التمويل</span>
                              <span className="font-bold text-[#111827]">{offer.termMonths} شهراً</span>
                            </div>

                            {offer.personalDiagnostics?.source === 'fallback' && (
                              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                                <span className="font-bold text-sm leading-none mt-0.5">⚠️</span>
                                <div>
                                  <span className="font-bold block mb-0.5">تنبيه النظام:</span>
                                  <span>تم استخدام قاعدة افتراضية لعدم وجود قاعدة مفعلة لهذا البنك.</span>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {productId !== 'personal_only' && (
                              <div className="border border-[#E5E7EB] rounded-xl p-3">
                                <span className="text-xs text-[#6B7280] block mb-0.5">القرض العقاري</span>
                                <span className="font-bold text-[#111827]">{Math.round(offer.realEstateAmount).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                            )}
                            {productId !== 'real_estate_only' && mainFinanceType !== 'real_estate_with_existing_personal' && (
                              <div className="border border-[#E5E7EB] rounded-xl p-3">
                                <span className="text-xs text-[#6B7280] block mb-0.5">القرض الشخصي</span>
                                <span className={offer.supportsPersonal === false ? "font-bold text-rose-600 text-xs" : "font-bold text-[#111827]"}>
                                  {offer.supportsPersonal === false ? "غير متوفر لدى هذه الجهة" : `${Math.round(offer.personalAmount).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال`}
                                </span>
                              </div>
                            )}
                            {mainFinanceType === 'real_estate_with_existing_personal' && (
                              <div className="border border-[#E5E7EB] rounded-xl p-3">
                                <span className="text-xs text-[#6B7280] block mb-0.5">التزامات قائمة</span>
                                <span className="font-bold text-rose-600">{Math.round(existingMonthlyObligations).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                            )}
                            {offer.housingSupportAmount > 0 && (
                              <div className="col-span-2 bg-[#E6F4F4]/40 border border-[#0EA5A4]/20 rounded-xl p-3 flex justify-between items-center text-xs">
                                <span className="text-[#0ea5a4] font-bold">{offer.supportType === 'monthly' ? 'الدعم السكني الشهري:' : 'دعم الدفعة المباشرة:'}</span>
                                <span className="font-bold text-[#0EA5A4]">{Math.round(offer.housingSupportAmount).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال{offer.supportType === 'monthly' ? ' / شهر' : ''}</span>
                              </div>
                            )}
                            {offer.etizazAmount !== undefined && offer.etizazAmount > 0 && (
                              <div className="col-span-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center text-xs">
                                <span className="text-indigo-700 font-bold">دعم اعتزاز غير مسترد:</span>
                                <span className="font-bold text-indigo-700">{Math.round(offer.etizazAmount).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Installments */}
                      <div className="pt-2 flex flex-col gap-1 text-sm">
                        {mainFinanceType === 'real_estate_with_existing_personal' || productId === 'real_estate_with_existing_personal' ? (
                          <div className="space-y-1.5 bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-3 animate-fade-in">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#374151]">قسط المرحلة 1 مدمج:</span>
                              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                {Math.round(offer.totalCustomerStage1 || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال
                              </span>
                            </div>
                            <div className="text-[11px] text-[#4B5563] pl-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span>├─ قسط العقاري:</span>
                                <span>{Math.round(offer.realEstateStage1 || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>├─ قسط الالتزام الشهري:</span>
                                <span>{Math.round(offer.existingMonthlyObligations || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-700 font-medium">
                                <span>└─ مدة المرحلة الأولى:</span>
                                <span>{offer.stage1Months || 0} شهر</span>
                              </div>
                            </div>

                            {offer.stage2Months > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#E5E7EB] pt-1.5 text-[#1F2937]">
                                <span className="font-medium text-[#4B5563]">قسط المرحلة 2 (صافي):</span>
                                <span className="font-bold text-emerald-600">{Math.round(offer.realEstateStage2 || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال <span className="text-[10px] text-gray-400">({offer.stage2Months} ش)</span></span>
                              </div>
                            )}

                            {offer.stage3Months > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#E5E7EB] pt-1.5 text-[#1F2937] bg-amber-50/50 p-1.5 rounded-lg">
                                <span className="font-medium text-amber-800">قسط المرحلة 3 (تقاعد):</span>
                                <span className="font-bold text-amber-800">{Math.round(offer.realEstateStage3 || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال <span className="text-[10px]">({offer.stage3Months} ش)</span></span>
                              </div>
                            )}
                          </div>
                        ) : productId === 'real_estate_with_new_personal' ? (
                          <div className="space-y-1.5 bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#374151]">القسط الشهري الإجمالي:</span>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                {Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs pl-2 text-[#4B5563]">
                              <span>├─ قسط العقاري:</span>
                              <span>{Math.round(offer.realEstateInstallmentOnly || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                            </div>
                            <div className="flex justify-between items-center text-xs pl-2 text-[#4B5563]">
                              <span>└─ قسط الشخصي:</span>
                              <span>{offer.supportsPersonal === false ? "غير متوفر" : `${Math.round(offer.personalInstallmentAmount || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال`}</span>
                            </div>
                            {offer.monthlyInstallmentAfterPersonal !== undefined && offer.monthlyInstallmentAfterPersonal > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#E5E7EB] pt-1.5 text-[#1F2937]">
                                <span className="font-medium text-[#4B5563]">بعد انتهاء الشخصي:</span>
                                <span className="font-semibold">{Math.round(offer.monthlyInstallmentAfterPersonal).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                            )}
                            {offer.monthlyInstallmentAfterRetirement > 0 && (
                              <div className="flex justify-between items-center text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-1 border border-amber-100">
                                <span>القسط التقاعدي:</span>
                                <span className="font-bold">{Math.round(offer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                              </div>
                            )}
                          </div>
                        ) : mainFinanceType === 'personal_only' ? null : (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[#6B7280]">قسط التمويل العقاري:</span>
                              <span className="font-bold text-emerald-600">{Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                            </div>
                            {offer.monthlyInstallmentAfterRetirement > 0 && (
                              <div className="flex justify-between items-center text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 mt-1 border border-amber-100">
                                <span>القسط التقاعدي العقاري:</span>
                                <span className="font-bold">{Math.round(offer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال / شهر</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs mt-1">
                              <span className="text-[#6B7280]">هامش الربح السنوي العقاري:</span>
                              <span className="font-bold text-[#111827]">{offer.annualMargin}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 my-6 text-sm text-red-700 min-h-[140px] flex flex-col justify-center">
                    <div className="flex gap-2 items-start">
                      <XCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-bold mb-1">بيانات غير مطابقة للقبول ائتمانياً</h4>
                        <p className="text-xs text-red-600/90 leading-relaxed">{offer.rejectionReason || 'العميل لا يستوفي قوانين الحد الأدنى للراتب أو مدة الخدمة المصرح بها لهذا البنك.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 w-full">
                  <button 
                    onClick={() => setSelectedOffer(offer)}
                    className="flex-1 text-center py-2.5 rounded-xl border border-[#0057B8]/20 text-[#0057B8] font-bold text-[11px] transition-all hover:bg-[#0057B8]/10 cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>التفاصيل والمخطط</span>
                  </button>
                  
                  <button 
                    onClick={(e) => handleSaveClick(offer, e)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-600 border border-emerald-100 text-emerald-700 hover:text-white font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Bookmark className="w-3.5 h-3.5 shrink-0" />
                    <span>حفظ النتيجة</span>
                  </button>

                  <button 
                    onClick={(e) => handleCopyText(offer, e)}
                    className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-[11px] transition-all hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>نسخ الحسبة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* النتائج المعروضة تقديرية بناء على البيانات المدخلة وقواعد النظام */}
        <div className="mt-8 bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200/55 dark:border-amber-900/30 rounded-2xl p-5 flex items-start gap-3.5 select-none" dir="rtl">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-sans font-black text-amber-800 dark:text-amber-500 text-xs text-right">ملاحظة تنظيمية هامة:</h5>
            <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed font-bold text-right mb-0">
              النتائج المعروضة تقديرية بناءً على البيانات المدخلة وقواعد النظام، ولا تعتبر موافقة نهائية أو التزامًا بمنح التمويل. القرار النهائي يخضع للبنك أو الجهة التمويلية.
            </p>
          </div>
        </div>

        {/* Subscription Gate Overlay */}
        {!isSubscribed && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-8 md:pt-16 px-4 bg-gradient-to-b from-transparent via-[#F5F7FA]/75 to-[#F5F7FA]/95">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-center animate-slide-up sticky top-6 sm:top-12">
              <div className="w-14 h-14 bg-blue-50 text-[#0057B8] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100/50">
                <Award className="w-7 h-7" />
              </div>
              
              <h3 className="text-lg font-black text-[#111827] mb-2 leading-tight text-center">
                اشترك للاطلاع على تفاصيل التمويل الكاملة
              </h3>
              
              <p className="text-xs text-[#4B5563] leading-relaxed mb-6 max-w-xs mx-auto text-center">
                تصفح مقارنات دقيقة، حواف التقاعد الذكية للدعم السكني، مخططات السداد والربحية ومؤشرات محرك الـ Finance Engine في حساب ذهبي متكامل.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(12);
                    }
                    alert("ميزة الاشتراك ستتوفر قريباً للعموم عبر بوابات الدفع الرسمية.");
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0057B8] text-white font-black text-xs hover:bg-[#004494] shadow-lg shadow-blue-100 transition-all cursor-pointer active:scale-98"
                >
                  اشترك الآن
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(12);
                    }
                    const updated = userSubscriptions.map(sub => {
                      if (sub.email === user?.email) {
                        return { ...sub, plan: 'premium' as const };
                      }
                      return sub;
                    });
                    const found = userSubscriptions.some(sub => sub.email === user?.email);
                    if (found) {
                      setUserSubscriptions(updated);
                    } else {
                      const newSub = {
                        id: Math.random().toString(),
                        username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم تجريبي',
                        email: user?.email || 'demo@example.com',
                        role: 'user' as const,
                        plan: 'premium' as const,
                        calculationsCount: 1,
                        expiryDate: '2027-12-31',
                        isActive: true
                      };
                      setUserSubscriptions([...userSubscriptions, newSub]);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer active:scale-98"
                >
                  جرّب مجاناً (تنشيط فوري للتجربة)
                </button>
              </div>
              
              <p className="text-[10px] text-gray-400 mt-4 text-center">
                الحساب الذهبي يمنحك ولوجاً شاملاً وحسابات لامتناهية لـ 15 بنكاً ومؤسسة مالية.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Results Button on Mobile */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 sm:hidden flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => {
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(12);
            }
            window.print();
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-[#0057B8] hover:bg-[#004494] text-white font-black text-xs shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>حفظ ومشاركة النتيجة الحالية</span>
        </button>
      </div>
      {selectedOffer && (
        <div id="drawer-overlay" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-[#F5F7FA] h-full overflow-y-auto flex flex-col animate-slide-in shadow-2xl">
            {/* Drawer Header */}
            <div className={`p-6 text-white bg-gradient-to-r ${selectedOffer.logoColor} sticky top-0 z-10 flex justify-between items-center h-24`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">
                  {selectedOffer.logoText}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedOffer.bankName}</h3>
                  <p className="text-xs text-white/85">ملخص النتيجة</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* Overall Summary Stat */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-right w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي التمويل المتاح</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#0057B8]">
                      {Math.round(selectedOffer.realEstateAmount + (selectedOffer.supportsPersonal !== false ? selectedOffer.personalAmount : 0)).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-bold text-slate-500">ريال سعودي</span>
                  </div>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                  <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs ${
                    selectedOffer.isEligible 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}>
                    {selectedOffer.isEligible ? 'مؤهل ومطابق مبدئياً' : 'غير مطابق للاشتراطات'}
                  </span>
                </div>
              </div>

              {/* Informational Message replacing technical personal/duration reduction diagnostics */}
              <div className="bg-blue-50/40 border border-blue-100/70 p-4 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
                <span className="text-sm leading-none">ℹ️</span>
                <p className="font-bold leading-relaxed mb-0 text-right w-full">
                  تم ضبط مدة التمويل تلقائيًا بما يتوافق مع عمر العميل وحدود الجهة التمويلية.
                </p>
              </div>

              {/* Detatils Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <h4 className="font-sans font-black text-sm text-[#111827] pb-2 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#0057B8] rounded-full"></div>
                  <span>تفاصيل نتيجة الحسبة</span>
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 text-right font-semibold select-none">
                  {/* 1. التمويل العقاري */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">التمويل العقاري</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {Math.round(selectedOffer.realEstateAmount).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 2. التمويل الشخصي */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">التمويل الشخصي</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {selectedOffer.supportsPersonal === false 
                        ? 'غير متوفر' 
                        : `${Math.round(selectedOffer.personalAmount).toLocaleString('ar-SA')} ريال`}
                    </span>
                  </div>

                  {/* 3. الدعم السكني */}
                  <div className="bg-[#0EA5A4]/5 hover:bg-[#0EA5A4]/10 p-3.5 rounded-xl border border-[#0EA5A4]/10 transition-all">
                    <span className="text-[10px] text-[#0EA5A4] block mb-1">الدعم السكني</span>
                    <span className="font-bold text-[#0EA5A4] text-sm">
                      {Math.round(selectedOffer.housingSupportAmount).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 4. القسط الشهري */}
                  <div className="bg-emerald-50/40 hover:bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100/70 transition-all">
                    <span className="text-[10px] text-emerald-600 block mb-1">القسط الشهري الإجمالي</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {Math.round(selectedOffer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 5. قسط العقاري */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">قسط التمويل العقاري</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {Math.round(selectedOffer.realEstateInstallmentOnly || (selectedOffer.monthlyInstallmentBeforeRetirement - (selectedOffer.personalInstallmentAmount || 0))).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 6. قسط الشخصي */}
                  {selectedOffer.supportsPersonal !== false && (selectedOffer.personalAmount || 0) > 0 && (
                    <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                      <span className="text-[10px] text-slate-400 block mb-1">قسط التمويل الشخصي</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {Math.round(selectedOffer.personalInstallmentAmount || 0).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* 7. القسط بعد انتهاء الشخصي */}
                  {selectedOffer.monthlyInstallmentAfterPersonal !== undefined && selectedOffer.monthlyInstallmentAfterPersonal > 0 && (
                    <div className="bg-[#0057B8]/5 hover:bg-[#0057B8]/10 p-3.5 rounded-xl border border-[#0057B8]/10 transition-all">
                      <span className="text-[10px] text-[#0057B8] block mb-1">القسط بعد انتهاء الشخصي</span>
                      <span className="font-bold text-[#0057B8] text-sm">
                        {Math.round(selectedOffer.monthlyInstallmentAfterPersonal).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* 8. نسبة الاستقطاع */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">نسبة الاستقطاع (DSR)</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {selectedOffer.dsrUsed}%
                    </span>
                  </div>

                  {/* 9. هامش الربح */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">هامش الربح السنوي</span>
                    <span className="font-bold text-[#0057B8] text-sm">
                      {selectedOffer.annualMargin}%
                    </span>
                  </div>

                  {/* 10. مدة التمويل */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100/80 transition-all">
                    <span className="text-[10px] text-slate-400 block mb-1">مدة التمويل</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {selectedOffer.termMonths} شهراً <span className="text-[10px] text-slate-400 font-normal">({selectedOffer.termMonths / 12} سنة)</span>
                    </span>
                  </div>

                  {/* 11. تفاصيل التقدم للتقاعد */}
                  {selectedOffer.monthlyInstallmentAfterRetirement > 0 && (
                    <div className="bg-amber-50/50 hover:bg-amber-50 p-3.5 rounded-xl border border-amber-100/70 transition-all col-span-2">
                      <span className="text-[10px] text-amber-600 block mb-1">القسط التقاعدي اللاحق</span>
                      <span className="font-bold text-amber-700 text-sm">
                        {Math.round(selectedOffer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* 12. الملاحظات المختصرة / سبب الرفض إن وجد */}
                  {!selectedOffer.isEligible && selectedOffer.rejectionReason && (
                    <div className="bg-rose-50 hover:bg-rose-100/40 p-3.5 rounded-xl border border-rose-100 transition-all col-span-2 text-right">
                      <span className="text-[10px] text-rose-500 block mb-1">سبب الاستبعاد أو ملاحظات الأهلية</span>
                      <span className="font-bold text-rose-700 text-xs">
                        {selectedOffer.rejectionReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis of Diagnostic Trace */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <h4 className="font-black text-sm text-[#111827] flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-[#0057B8]" />
                  <span>مؤشرات الملاءمة</span>
                </h4>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 bg-emerald-50/50 text-emerald-800 border border-emerald-100/80">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="text-right">تم حساب صافي الراتب والخصومات التقاعدية تلقائيًا.</span>
                  </div>
                  {selectedOffer.isEligible ? (
                    <div className="p-3.5 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 bg-emerald-50/50 text-emerald-800 border border-emerald-100/80">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#0057B8]" />
                      <span className="text-right">تم قبول العميل مبدئيًا لدى {selectedOffer.bankName} لتلبية اشتراطات الدخل، العمر، والخدمة والضوابط الائتمانية.</span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 bg-rose-50/50 text-rose-800 border border-rose-100/80">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <span className="text-right">نأمل مراجعة دقة البيانات لعدم تلبية بعض الضوابط التمويلية المحددة لدى الجهة.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer notes */}
              <p className="text-[10px] text-[#9CA3AF] text-center leading-relaxed font-sans">
                هذه الحسبة مبدئية وتعتمد على الموديل الرياضي لـ "حسبة". تخضع المعايير لمراجعة لائحة السياسة الائتمانية الخاصة بكل جهة تمويلية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 💾 Save calculation settings modal dialog */}
      {saveOffer && (
        <div id="save-result-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className={`p-6 text-white text-right bg-gradient-to-r ${saveOffer.logoColor} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">
                  {saveOffer.logoText}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">حفظ نتيجة الحسبة الحالية</h3>
                  <p className="text-[10px] text-white/80 mt-0.5">سيتم إضافة هذه البيانات لملف نتائجك للرجوع لها لاحقاً</p>
                </div>
              </div>
              <button 
                onClick={() => { setSaveOffer(null); setSaveStatus(null); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-right">
              {saveStatus === 'success' ? (
                <div className="py-6 text-center space-y-4 animate-fade-in">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-sm text-gray-900">تم حفظ نتيجة الحسبة المحاسبية المتكاملة!</h4>
                    <p className="text-xs text-gray-400 mt-2 font-sans leading-relaxed">
                      تم تصنيف وحفظ التمويل بنجاح في ملفك الشخصي. يمكنك عرض ومقارنة كافة النتائج من صفحة <span className="font-bold text-[#0057B8]">"نتائجي"</span> في أي وقت.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Informational Summary parameters preview */}
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs space-y-2 font-medium text-slate-700">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1.5 align-middle">
                      <span className="text-slate-400">البنك والمؤسسة:</span>
                      <span className="font-extrabold text-slate-900">{saveOffer.bankName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                      <span className="text-slate-400">إجمالي حد التمويل:</span>
                      <span className="font-extrabold text-[#0057B8]" dir="ltr">
                        {Math.round(mainFinanceType === 'personal_only' ? saveOffer.personalAmount : saveOffer.totalPurchasingPower).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">القسط والقنوات:</span>
                      <span className="font-extrabold text-emerald-600" dir="ltr">
                        {Math.round(saveOffer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال / شهر
                      </span>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 font-medium">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[11px] font-extrabold text-slate-500 block">عنوان أو مسمى الحسبة للتمييز:</label>
                      <input 
                        type="text"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        placeholder="مثال: فيلا الياسمين - خيار عقاري ممتاز"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0057B8] focus:bg-white transition-all text-right"
                      />
                    </div>

                    <div className="space-y-1.5 text-right">
                      <label className="text-[11px] font-extrabold text-slate-500 block">اسم العميل (اختياري):</label>
                      <input 
                        type="text"
                        value={saveCustomerName}
                        onChange={(e) => setSaveCustomerName(e.target.value)}
                        placeholder="مثال: أبو محمد الودعاني"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0057B8] focus:bg-white transition-all text-right"
                      />
                    </div>
                  </div>

                  {saveStatus === 'error' && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-100 flex items-start gap-2 leading-relaxed animate-fade-in text-right">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{saveErrorText}</span>
                    </div>
                  )}

                  {/* Buttons controls */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={executeSaveResult}
                      disabled={isSaving || !saveTitle.trim()}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md hover:shadow-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جاري الحفظ الآمن...</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>تأكيد حفظ النتيجة</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSaveOffer(null)}
                      className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px]"
                    >
                      إلغاء
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ⚠️ Auth Required dialog modal */}
      {showAuthRequiredAlert && (
        <div id="auth-required-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-scale-up space-y-5 text-right">
            
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2 text-center">
              <h3 className="font-sans font-black text-base text-gray-950">سجّل الدخول لحفظ نتائجك</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans max-w-xs mx-auto">
                إن ميزة "نتائجي المحفوظة" مخصصة بملكية مشفرة وآمنة لكل مستخدم. يرجى تسجيل الدخول إلى منصة "حسبة" لحفظ وقراءة تقاريرك التمويلية في أي وقت.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAuthRequiredAlert(false);
                  window.history.pushState(null, "", "/login");
                  window.dispatchEvent(new Event("popstate"));
                }}
                className="w-full py-3 bg-[#0057B8] text-white text-xs font-extrabold rounded-xl transition-all shadow-md hover:shadow-blue-200 cursor-pointer text-center"
              >
                تسجيل الدخول / إنشاء حساب جديد
              </button>
              
              <button
                onClick={() => setShowAuthRequiredAlert(false)}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-slate-200/50"
              >
                متابعة الحسبة كضيف
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Success Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xl rounded-2xl px-5 py-4 max-w-sm flex items-center justify-between gap-3 animate-slide-up" dir="rtl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold font-sans">{toast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="font-extrabold text-[#6B7280] hover:text-[#111827] text-md px-1 cursor-pointer select-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
