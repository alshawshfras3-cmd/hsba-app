import React, { useState } from 'react';
import { BankCalculationResult, ProductId } from '../../types';
import { 
  Building2, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, Clock, Percent, ListCollapse,
  Download, HelpCircle, Activity, Info, Users, ChevronDown, Award, Bookmark, Copy, Share2, MessageCircle,
  User, RotateCcw
} from 'lucide-react';
import { useAppState } from '../../context/AppContext';
import { saveCalculationResult, saveCalculationResultsGroup } from '../../lib/savedResultsService';
import { convertHijriToGregorian } from '../../lib/date-utils';

interface ResultsGridProps {
  results: BankCalculationResult[];
  productId: ProductId;
  onRestart: () => void;
  existingMonthlyObligations?: number;
  obligationRemainingMonths?: number;
  mainFinanceType?: 'real_estate' | 'personal_only' | 'real_estate_with_existing_personal';
  sectorId?: string;
  birthYear?: number | '';
  birthMonth?: number | '';
  birthDay?: number | '';
  birthCalendar?: 'gregorian' | 'hijri';
  appointmentYear?: number | '';
  appointmentMonth?: number | '';
  appointmentDay?: number | '';
  appointmentCalendar?: 'gregorian' | 'hijri';
  retirementAge?: number | '';
}

export default function ResultsGrid({ 
  results, 
  productId: rawProductId, 
  onRestart,
  existingMonthlyObligations = 0,
  obligationRemainingMonths = 0,
  mainFinanceType = 'real_estate',
  sectorId = 'gov_civil',
  birthYear = '',
  birthMonth = '',
  birthDay = '',
  birthCalendar = 'gregorian',
  appointmentYear = '',
  appointmentMonth = '',
  appointmentDay = '',
  appointmentCalendar = 'gregorian',
  retirementAge = ''
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

  const { user, userRole, userSubscriptions, setUserSubscriptions, banks } = useAppState();
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

  // Group Saved Results states
  const [showGroupSaveModal, setShowGroupSaveModal] = useState<boolean>(false);
  const [groupSaveTitle, setGroupSaveTitle] = useState<string>('حسبة عميل - مقارنة جميع البنوك');
  const [groupSaveCustomerName, setGroupSaveCustomerName] = useState<string>('');
  const [isGroupSaving, setIsGroupSaving] = useState<boolean>(false);
  const [groupSaveStatus, setGroupSaveStatus] = useState<'success' | 'error' | null>(null);
  const [groupSaveErrorText, setGroupSaveErrorText] = useState<string>('');

  const currentSub = userSubscriptions?.find(sub => sub.email === user?.email);
  const isSubscribed = true;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'refuse' } | null>(null);

  const cleanPensionSalaryText = (text: string): string => {
    return text.split('\n').filter(line => {
      const lowerLine = line.toLowerCase();
      if (
        line.includes('الراتب التقاعدي') || 
        lowerLine.includes('pension salary') || 
        lowerLine.includes('expected pension')
      ) {
        return false;
      }
      return true;
    }).join('\n');
  };

  const getCalculationCopyText = (offer: BankCalculationResult): string => {
    const isApp = offer.status === 'approved';
    const isWarn = offer.status === 'warning';
    const isRej = offer.status === 'rejected';

    const statusAr = isApp ? 'مقبول' : isWarn ? 'مقبول مبدئيًا' : 'مرفوض';

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
    if (productId !== 'real_estate_only' && mainFinanceType !== 'real_estate_with_existing_personal') {
      if (offer.supportsPersonal === false) {
        lines.push(`القرض الشخصي: غير متوفر لدى هذه الجهة`);
      } else {
        lines.push(`القرض الشخصي: ${formatNum(offer.personalAmount)} ريال`);
      }
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
      lines.push(`اعتزاز دفعة مستردة: ${formatNum(resolvedEtizaz)} ريال`);
      if (offer.etizazMonthlyInstallment && offer.etizazMonthlyInstallment > 0) {
        lines.push(`قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال (يبدأ بعد فترة سماح ${offer.etizazGraceMonths ?? 24} شهراً، ولمدة سداد ${offer.etizazTermMonths || 0} شهراً)`);
      }
    }

    if (offer.financeAmountAdjusted === true) {
      lines.push(`أقصى تمويل متاح: ${formatNum(offer.maxEligibleFinanceAmount || 0)} ريال`);
      lines.push(`مبلغ التمويل المطلوب: ${formatNum(offer.requestedFinanceAmount || 0)} ريال`);
    }

    lines.push(''); // empty line

    if (mainFinanceType === 'personal_only') {
      lines.push(`قسط التمويل الشخصي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
    } else if (productId === 'real_estate_with_new_personal') {
      lines.push(`القسط الشهري الإجمالي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
      lines.push(`├─ قسط العقاري: ${formatNum(offer.realEstateInstallmentOnly || 0)} ريال`);
      lines.push(`├─ قسط الشخصي: ${offer.supportsPersonal === false ? "غير متوفر لدى هذه الجهة (تم احتساب العقاري فقط)" : `${formatNum(offer.personalInstallmentAmount || 0)} ريال`}`);
      if (offer.etizazAmount && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment) {
        lines.push(`└─ قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال`);
      }
    } else {
      lines.push(`القسط الشهري الإجمالي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
      if (offer.etizazAmount && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment) {
        lines.push(`├─ قسط التمويل العقاري: ${formatNum(offer.realEstateInstallmentOnly || 0)} ريال`);
        lines.push(`└─ قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال`);
      }
    }

    if (offer.monthlyInstallmentAfterRetirement > 0) {
      lines.push(`القسط التقاعدي العقاري: ${formatNum(offer.monthlyInstallmentAfterRetirement)} ريال / شهر`);
    }

    lines.push(`هامش الربح السنوي: ${offer.annualMargin}%`);

    return lines.join('\n');
  };

  const handleCopyText = async (offer: BankCalculationResult, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal opening!

    const textToCopy = cleanPensionSalaryText(getCalculationCopyText(offer));

    try {
      await navigator.clipboard.writeText(textToCopy);
      setToast({ message: 'تم نسخ الحسبة بنجاح', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to copy calculation:', err);
    }
  };

  const getWhatsAppContactInfo = (bankId: string) => {
    const bankObj = banks?.find(b => b.id === bankId);
    const rawContact = bankObj?.employeeWhatsApp?.trim();
    if (!rawContact) return null;

    if (rawContact.startsWith('http://') || rawContact.startsWith('https://') || rawContact.includes('wa.me') || rawContact.includes('whatsapp.com')) {
      return { type: 'url' as const, value: rawContact };
    }

    const cleanNumber = rawContact.replace(/[\s+\-()]/g, '');
    if (/^\d+$/.test(cleanNumber)) {
      return { type: 'number' as const, value: cleanNumber };
    }

    return null;
  };

  const handleWhatsAppContact = (offer: BankCalculationResult, e: React.MouseEvent) => {
    e.stopPropagation();

    const contactInfo = getWhatsAppContactInfo(offer.bankId);
    if (!contactInfo) return;

    const message = `السلام عليكم، لدي استفسار عن نتيجة الحسبة التالية:\n\n${getCalculationCopyText(offer)}`;
    const encodedText = encodeURIComponent(message);

    let url = '';

    if (contactInfo.type === 'number') {
      url = `https://wa.me/${contactInfo.value}?text=${encodedText}`;
    } else if (contactInfo.type === 'url') {
      let baseUrl = contactInfo.value;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
      }
      try {
        const parsedUrl = new URL(baseUrl);
        parsedUrl.searchParams.set('text', message);
        url = parsedUrl.toString();
      } catch (err) {
        if (baseUrl.includes('?')) {
          url = `${baseUrl}&text=${encodedText}`;
        } else {
          url = `${baseUrl}?text=${encodedText}`;
        }
      }
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async (offer: BankCalculationResult, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal opening!

    const isApp = offer.status === 'approved';
    const isWarn = offer.status === 'warning';
    const isRej = offer.status === 'rejected';

    const statusAr = isApp ? 'مقبول' : isWarn ? 'مقبول مبدئيًا' : 'مرفوض';

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
    if (productId !== 'real_estate_only' && mainFinanceType !== 'real_estate_with_existing_personal') {
      if (offer.supportsPersonal === false) {
        lines.push(`القرض الشخصي: غير متوفر لدى هذه الجهة`);
      } else {
        lines.push(`القرض الشخصي: ${formatNum(offer.personalAmount)} ريال`);
      }
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
      lines.push(`اعتزاز دفعة مستردة: ${formatNum(resolvedEtizaz)} ريال`);
      if (offer.etizazMonthlyInstallment && offer.etizazMonthlyInstallment > 0) {
        lines.push(`قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال (يبدأ بعد فترة سماح ${offer.etizazGraceMonths ?? 24} شهراً، ولمدة سداد ${offer.etizazTermMonths || 0} شهراً)`);
      }
    }

    if (offer.financeAmountAdjusted === true) {
      lines.push(`أقصى تمويل متاح: ${formatNum(offer.maxEligibleFinanceAmount || 0)} ريال`);
      lines.push(`مبلغ التمويل المطلوب: ${formatNum(offer.requestedFinanceAmount || 0)} ريال`);
    }

    lines.push(''); // empty line

    if (mainFinanceType === 'personal_only') {
      lines.push(`قسط التمويل الشخصي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
    } else if (productId === 'real_estate_with_new_personal') {
      lines.push(`القسط الشهري الإجمالي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
      lines.push(`├─ قسط العقاري: ${formatNum(offer.realEstateInstallmentOnly || 0)} ريال`);
      lines.push(`├─ قسط الشخصي: ${offer.supportsPersonal === false ? "غير متوفر لدى هذه الجهة (تم احتساب العقاري فقط)" : `${formatNum(offer.personalInstallmentAmount || 0)} ريال`}`);
      if (offer.etizazAmount && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment) {
        lines.push(`└─ قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال`);
      }
    } else {
      lines.push(`القسط الشهري الإجمالي: ${formatNum(offer.monthlyInstallmentBeforeRetirement)} ريال`);
      if (offer.etizazAmount && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment) {
        lines.push(`├─ قسط التمويل العقاري: ${formatNum(offer.realEstateInstallmentOnly || 0)} ريال`);
        lines.push(`└─ قسط اعتزاز الشهري: ${formatNum(Math.round(offer.etizazMonthlyInstallment))} ريال`);
      }
    }

    if (offer.monthlyInstallmentAfterRetirement > 0) {
      lines.push(`القسط التقاعدي العقاري: ${formatNum(offer.monthlyInstallmentAfterRetirement)} ريال / شهر`);
    }

    lines.push(`هامش الربح السنوي: ${offer.annualMargin}%`);

    const textToShare = cleanPensionSalaryText(lines.join('\n'));
    const shareTitle = `تمويل حسبة - ${offer.bankName}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: textToShare,
          url: window.location.href
        });
        setToast({ message: 'تمت المشاركة بنجاح', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share error, using copy fallback:', err);
          fallbackShareCopy(textToShare);
        }
      }
    } else {
      fallbackShareCopy(textToShare);
    }
  };

  const fallbackShareCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: 'تم نسخ ملخص الحسبة للمشاركة لعدم دعم المتصفح للمشاركة المباشرة', type: 'success' });
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      console.error('Clipboard fallback failed:', err);
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

  const handleOpenGroupSaveModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
    
    if (!user) {
      setShowAuthRequiredAlert(true);
      return;
    }

    setGroupSaveTitle('حسبة عميل - مقارنة جميع البنوك');
    setGroupSaveCustomerName(user?.user_metadata?.full_name || '');
    setGroupSaveStatus(null);
    setGroupSaveErrorText('');
    setShowGroupSaveModal(true);
  };

  const executeSaveGroupResults = async () => {
    if (!user) return;
    if (!groupSaveCustomerName.trim()) {
      setGroupSaveStatus('error');
      setGroupSaveErrorText('يرجى إدخال اسم العميل.');
      return;
    }

    setIsGroupSaving(true);
    setGroupSaveStatus(null);

    const fTypeArabic = getFinanceTypeArabicName(mainFinanceType, productId);
    const sectorArabic = getSectorArabicName(sectorId);

    try {
      const res = await saveCalculationResultsGroup({
        userId: user.id,
        userEmail: user.email || '',
        results: results,
        title: groupSaveTitle || 'حسبة عميل - مقارنة جميع البنوك',
        customerName: groupSaveCustomerName,
        financeType: fTypeArabic,
        sector: sectorArabic,
        productId: productId,
        mainFinanceType: mainFinanceType,
        supportType: results[0]?.supportType || 'none',
        netSalary: results[0]?.netSalary || 0
      });

      if (res.success) {
        setGroupSaveStatus('success');
        setTimeout(() => {
          setShowGroupSaveModal(false);
          setGroupSaveStatus(null);
        }, 2200);
      } else {
        setGroupSaveStatus('error');
        setGroupSaveErrorText(res.error || 'حدث خطأ غير متوقع أثناء معالجة الطلب.');
      }
    } catch (err: any) {
      setGroupSaveStatus('error');
      setGroupSaveErrorText(err.message || 'فشل الاتصال وحفظ التقرير.');
    } finally {
      setIsGroupSaving(false);
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

  const summaryOffer = results.find(r => r.isEligible) || results[0];
  
  const sectorArabic = getSectorArabicName(sectorId);
  const financeTypeArabic = getFinanceTypeArabicName(mainFinanceType, productId);
  const netSalaryVal = summaryOffer?.netSalary || 0;
  const obligationsVal = existingMonthlyObligations || 0;

  const resolvedSupportAmount = summaryOffer ? (summaryOffer.housingSupportAmount 
    ?? (summaryOffer as any).supportAmount 
    ?? (summaryOffer as any).monthlySupport 
    ?? (summaryOffer as any).downPaymentSupport
    ?? (summaryOffer.diagnostics?.monthlySupport || summaryOffer.diagnostics?.downPaymentSupport)
    ?? 0) : 0;

  let resolvedSupportType = summaryOffer?.supportType || 'none';
  if (summaryOffer && (resolvedSupportType === 'none' || !summaryOffer.supportType)) {
    if ((summaryOffer as any).monthlySupport && (summaryOffer as any).monthlySupport > 0) {
      resolvedSupportType = 'monthly';
    } else if ((summaryOffer as any).downPaymentSupport && (summaryOffer as any).downPaymentSupport > 0) {
      resolvedSupportType = 'downpayment';
    } else if (summaryOffer.diagnostics?.monthlySupport && summaryOffer.diagnostics?.monthlySupport > 0) {
      resolvedSupportType = 'monthly';
    } else if (summaryOffer.diagnostics?.downPaymentSupport && summaryOffer.diagnostics?.downPaymentSupport > 0) {
      resolvedSupportType = 'downpayment';
    }
  }

  const currentYear = new Date().getFullYear();
  const hijriToGregLocal = (y: number, calendar: 'gregorian' | 'hijri'): number => {
    if (calendar === 'hijri') {
      try {
        return convertHijriToGregorian(y, 1, 1).year;
      } catch (e) {
        return y + 579;
      }
    }
    return y;
  };

  const computedAge = birthYear ? (currentYear - hijriToGregLocal(Number(birthYear), birthCalendar || 'gregorian')) : 0;
  const ageDisplay = computedAge ? `${computedAge} سنة` : 'غير محدد';
  
  const birthDateDisplay = birthYear && birthMonth 
    ? `${birthYear}/${String(birthMonth).padStart(2, '0')} (${birthCalendar === 'hijri' ? 'هـ' : 'م'})`
    : 'غير محدد';

  const appointmentDateDisplay = appointmentYear && appointmentMonth
    ? `${appointmentYear}/${String(appointmentMonth).padStart(2, '0')} (${appointmentCalendar === 'hijri' ? 'هـ' : 'م'})`
    : (sectorId === 'retired' ? 'متقاعد' : 'غير محدد');

  const retirementAgeDisplay = retirementAge ? `${retirementAge} سنة` : 'غير محدد';

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start" dir="rtl">
        
        {/* Right Sidebar on Desktop/Laptop/Tablet (RTL) - Summary Card */}
        <aside className="hidden lg:block w-[320px] shrink-0">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <User className="w-5 h-5 text-[#0057B8] dark:text-[#60A5FA]" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-sans">ملخص بياناتك</h3>
              </div>

              <div className="space-y-4">
                {/* العمر */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">العمر:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100">{ageDisplay}</span>
                </div>

                {/* تاريخ الميلاد */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">تاريخ الميلاد:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100">{birthDateDisplay}</span>
                </div>

                {/* تاريخ التعيين */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">تاريخ التعيين:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100">{appointmentDateDisplay}</span>
                </div>

                {/* المنتج */}
                <div className="flex justify-between items-start text-xs gap-4">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold shrink-0">المنتج:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100 text-left leading-tight">{financeTypeArabic || "غير محدد"}</span>
                </div>

                {/* الدعم */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">الدعم:</span>
                  <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA]">
                    {resolvedSupportAmount > 0 
                      ? `${Math.round(resolvedSupportAmount).toLocaleString('ar-SA')} ريال ${resolvedSupportType === 'monthly' ? '/ شهر' : '(دفعة)'}`
                      : "غير مدعوم"}
                  </span>
                </div>

                {/* عمر التقاعد */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">عمر التقاعد:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100">{retirementAgeDisplay}</span>
                </div>

                {/* القطاع */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">القطاع:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100">{sectorArabic || "غير محدد"}</span>
                </div>

                {/* صافي الراتب الشهري */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">صافي الراتب الشهري:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100 font-sans tabular-nums tracking-tight" dir="ltr">
                    {netSalaryVal > 0 ? `${Math.round(netSalaryVal).toLocaleString('ar-SA')} ريال` : "غير محدد"}
                  </span>
                </div>

                {/* الالتزامات الشهرية */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold">الالتزامات الشهرية:</span>
                  <span className="font-extrabold text-[#111827] dark:text-slate-100 font-sans tabular-nums tracking-tight" dir="ltr">
                    {obligationsVal > 0 ? `${Math.round(obligationsVal).toLocaleString('ar-SA')} ريال` : "0 ريال"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              <button
                onClick={onRestart}
                className="w-full py-2.5 rounded-xl border border-[#0057B8] hover:bg-[#EFF6FF] text-[#0057B8] font-extrabold text-xs cursor-pointer text-center transition-all duration-200 bg-white"
              >
                تعديل البيانات
              </button>
            </div>
          </div>
        </aside>

        {/* Left Column on Desktop (RTL) / Main Results Section on Mobile */}
        <main className="min-w-0 flex-1 w-full space-y-4">
          {/* Desktop/Tablet Header & Actions Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">نتائج الحسبة وعروض جهات التمويل</h2>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 sm:mt-1.5 font-sans leading-relaxed">تم حساب أفضل عروض وبدائل القروض من كافة البنوك النشطة بناءً على ضوابط ساما ومؤسسة التقاعد.</p>
            </div>
            
            {/* Desktop Action Row Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* "حفظ كل نتائج العميل" button - clearly visible */}
              <button
                id="save-all-results-btn"
                onClick={handleOpenGroupSaveModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0057B8] hover:bg-[#003B7A] text-white font-extrabold text-xs shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 cursor-pointer active:scale-98 transition-all"
              >
                <Bookmark className="w-4 h-4" />
                <span>حفظ كل نتائج العميل</span>
              </button>
            </div>
          </div>

          {/* Sorting Tabs Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2 justify-start">
              <span className="text-xs font-bold text-[#6B7280] dark:text-slate-400 ml-2">ترتيب النتائج:</span>
              <button
                onClick={() => setActiveSort('power')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeSort === 'power'
                    ? 'bg-[#0057B8] dark:bg-[#0057B8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                أعلى تمويل وقدرة شراء
              </button>
              <button
                onClick={() => setActiveSort('installment')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeSort === 'installment'
                    ? 'bg-[#0057B8] dark:bg-[#0057B8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                أقل قسط شهري
              </button>
              <button
                onClick={() => setActiveSort('margin')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeSort === 'margin'
                    ? 'bg-[#0057B8] dark:bg-[#0057B8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                أقل هامش فائدة
              </button>
              <button
                onClick={() => setActiveSort('term')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeSort === 'term'
                    ? 'bg-[#0057B8] dark:bg-[#0057B8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                أطول فترة سداد
              </button>
            </div>
          </div>

      {/* Bank Cards Grid with optional Subscription blurred state and relative wrapper */}
      <div className={`relative ${!isSubscribed ? 'min-h-[480px]' : ''}`}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ${!isSubscribed ? 'blur-md pointer-events-none select-none contrast-[0.80]' : ''}`}>
          {sortedResults.map((offer, index) => {
            const isApp = offer.status === 'approved';
            const isWarn = offer.status === 'warning';
            const isRej = offer.status === 'rejected';
            const isBestOffer = index === 0 && offer.isEligible;

            return (
              <div
                key={offer.bankId}
                onClick={() => setSelectedOffer(offer)}
                className={`bg-white dark:bg-[#111827] rounded-2xl border transition-all duration-300 p-4 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 ${
                  isBestOffer
                    ? 'border-[#0057B8] bg-gradient-to-tr from-[#0057B8]/[0.01] to-[#0057B8]/[0.03] dark:from-[#0057B8]/5 dark:to-[#0057B8]/10 ring-1 ring-[#0057B8]/20 dark:ring-[#0057B8]/30 shadow-premium hover:shadow-card-hover dark:shadow-none'
                    : offer.isEligible
                    ? 'border-[#E5E7EB] dark:border-slate-800 hover:border-[#0057B8]/80 dark:hover:border-[#0057B8]/85 hover:shadow-premium dark:shadow-none'
                    : 'border-rose-100 dark:border-red-950 bg-rose-50/10 dark:bg-rose-950/5'
                }`}
              >
                {/* Clean Header Area with Badges on Top and Bank Info underneath */}
                <div className="flex flex-col gap-2.5 mb-3">
                  {/* Badges Area (Top Row) */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap min-h-[26px]">
                    {/* Right side in RTL: Promo/Best Badge */}
                    <div className="flex items-center gap-1">
                      {isBestOffer && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#FFB000] text-[#0B1B34] border border-[#F59E0B] shadow-sm">
                          <span>⭐ أفضل خيار مرشح</span>
                        </span>
                      )}
                      {!isBestOffer && offer.bankId === 'alarabi' && offer.isEligible && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#FFB000] text-[#0B1B34] border border-[#F59E0B] shadow-sm">
                          <span>⭐ أفضل قسط شهري</span>
                        </span>
                      )}
                    </div>

                    {/* Left side in RTL: Eligibility Badge */}
                    <div>
                      {isApp && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857]">
                          <CheckCircle className="w-3.5 h-3.5 text-[#047857]" />
                          <span>مقبول</span>
                        </span>
                      )}
                      {isWarn && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#C2410C]" />
                          <span>مقبول مبدئيًا</span>
                        </span>
                      )}
                      {isRej && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-750 dark:text-red-450 border border-red-200 dark:border-red-900/40">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>مرفوض</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bank Identity Row */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${offer.logoColor} text-white flex items-center justify-center font-bold text-center text-xs p-1 select-none shadow-xs group-hover:scale-105 transition-transform shrink-0`}>
                      {offer.logoText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[#0B1B34] dark:text-white text-sm flex items-center gap-2 truncate">
                        <span>{offer.bankName}</span>
                      </h3>
                      <p className={`text-[10px] ${offer.isAgeLimitingFactor ? 'text-rose-600 dark:text-rose-450 font-bold animate-pulse' : 'text-[#6B7280] dark:text-slate-400'}`}>
                        {mainFinanceType === 'personal_only' 
                          ? 'مدة التمويل الشخصي: 5 سنوات (60 شهراً)' 
                          : `مدة التمويل العقاري: ${Math.floor(offer.termMonths / 12)} سنة ${Math.round(offer.termMonths % 12) > 0 ? `و ${Math.round(offer.termMonths % 12)} أشهر` : ''}`}
                      </p>
                    </div>
                  </div>

                  {offer.isAgeLimitingFactor && (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[8px] font-extrabold text-[#991B1B] dark:text-red-400 bg-red-100/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-1.5 py-0.5 rounded">
                        ⚠️ العمر يحدّ من مدة سداد التمويل
                      </span>
                    </div>
                  )}
                </div>

                {/* Main Numbers */}
                {offer.isEligible ? (
                  <div className="space-y-3 mb-4 flex-1 flex flex-col justify-between">
                    {/* Total budget (Always visible, prominent at the beginning) */}
                    <div className={`px-3.5 py-3 rounded-xl border transition-all ${
                      isBestOffer
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] dark:bg-blue-950/15 dark:border-blue-900/30'
                        : 'bg-slate-50 border-[#E5E7EB] dark:bg-[#0F172A]/40 dark:border-slate-800/60'
                    }`}>
                      <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">
                        {mainFinanceType === 'personal_only' 
                          ? 'مبلغ التمويل الشخصي المتاح' 
                          : mainFinanceType === 'real_estate_with_existing_personal'
                          ? 'مبلغ التمويل العقاري المتاح'
                          : offer.financeAmountAdjusted === true
                          ? 'إجمالي التمويل النهائي (المبلغ المطلوب)'
                          : 'إجمالي مبلغ التمويل المتكامل المتاح'}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-[#0057B8] dark:text-[#60A5FA] leading-none shrink-0 font-sans tabular-nums tracking-tight">
                          {Math.round(mainFinanceType === 'personal_only' 
                            ? offer.personalAmount 
                            : mainFinanceType === 'real_estate_with_existing_personal'
                            ? offer.realEstateAmount
                            : offer.totalPurchasingPower).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs font-bold text-[#6B7280] dark:text-slate-400">ريال سعودي</span>
                      </div>

                      {offer.financeAmountAdjusted === true && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <div>
                            <span className="block text-slate-450 dark:text-slate-500">أقصى تمويل متاح:</span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-350 font-sans tabular-nums tracking-tight">{Math.round(offer.maxEligibleFinanceAmount || 0).toLocaleString('ar-SA')} ريال</span>
                          </div>
                          <div>
                            <span className="block text-[#0057B8] dark:text-[#60A5FA]">مبلغ التمويل المطلوب:</span>
                            <span className="font-extrabold text-[#003B7A] dark:text-[#60A5FA] font-sans tabular-nums tracking-tight">{Math.round(offer.requestedFinanceAmount || 0).toLocaleString('ar-SA')} ريال</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile-only Accordion Selector */}
                    <div className="block sm:hidden">
                      <button
                        type="button"
                        onClick={(e) => toggleCardExpansion(offer.bankId, e)}
                        className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/50 dark:border-slate-800/60 text-[#0057B8] dark:text-[#60A5FA] text-xs font-bold hover:bg-slate-100/80 dark:hover:bg-slate-800 active:scale-98 transition-all cursor-pointer"
                      >
                        <span>{expandedCards[offer.bankId] ? 'إخفاء تفاصيل الحسبة والقسط' : 'عرض تفاصيل الحسبة ومؤشر الاقتطاع'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedCards[offer.bankId] ? 'rotate-180 text-[#0a4891] dark:text-[#60A5FA]' : 'text-[#0057B8] dark:text-[#60A5FA]'}`} />
                      </button>
                    </div>

                    {/* Collapsible Details Container */}
                    <div className={`${expandedCards[offer.bankId] ? 'block' : 'hidden'} sm:block space-y-3 animate-fade-in`}>
                      {/* Components Grid (2x2) */}
                      <div className="grid grid-cols-2 gap-2">
                        {mainFinanceType === 'personal_only' ? (
                          <>
                            {/* 1. قسط التمويل الشخصي */}
                            <div className="border border-[#BFDBFE] bg-[#EFF6FF] dark:border-blue-900/30 dark:bg-blue-950/15 rounded-xl p-2.5 col-span-2 flex justify-between items-center text-xs">
                              <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA]">قسط التمويل الشخصي:</span>
                              <span className="font-black text-[#0057B8] dark:text-[#60A5FA] font-sans tabular-nums tracking-tight">
                                {Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال / شهر
                              </span>
                            </div>

                            {/* 2. إجمالي الأرباح */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 col-span-2 flex justify-between items-center bg-slate-50/50 dark:bg-[#0F172A]/40 text-xs">
                              <span className="font-extrabold text-[#6B7280] dark:text-slate-400">إجمالي الأرباح:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-450 font-sans tabular-nums tracking-tight">
                                {Math.round(offer.personalProfitAmount !== undefined ? offer.personalProfitAmount : (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12))).toLocaleString('ar-SA')} ريال
                              </span>
                            </div>

                            {/* 3. إجمالي السداد */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 col-span-2 flex justify-between items-center bg-slate-50/50 dark:bg-[#0F172A]/40 text-xs">
                              <span className="font-extrabold text-[#6B7280] dark:text-slate-400">إجمالي السداد:</span>
                              <span className="font-bold text-[#0B1B34] dark:text-slate-100 font-sans tabular-nums tracking-tight">
                                {Math.round(offer.personalTotalRepayment !== undefined ? offer.personalTotalRepayment : (offer.personalAmount + (offer.personalAmount * (offer.annualMargin / 100) * (offer.termMonths / 12)))).toLocaleString('ar-SA')} ريال
                              </span>
                            </div>

                            {/* 4. نسبة الاستقطاع المعتمدة */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block mb-0.5 font-extrabold">نسبة الاستقطاع</span>
                              <span className="font-extrabold text-[#0B1B34] dark:text-white text-xs font-sans tabular-nums tracking-tight">{offer.dsrUsed}%</span>
                            </div>

                            {/* 5. نسبة الربح السنوية */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block mb-0.5 font-extrabold">هامش الربح</span>
                              <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA] text-xs font-sans tabular-nums tracking-tight">{offer.annualMargin}%</span>
                            </div>

                            {offer.personalDiagnostics?.source === 'fallback' && (
                              <div className="col-span-2 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-850 dark:text-amber-500">
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
                            {/* Box 1: التمويل العقاري */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">التمويل العقاري</span>
                              <span className="font-extrabold text-[#0B1B34] dark:text-white text-[11px] truncate font-sans tabular-nums tracking-tight">
                                {Math.round(offer.realEstateAmount).toLocaleString('ar-SA')} ريال
                              </span>
                            </div>

                            {/* Box 2: التمويل الشخصي أو الالتزامات القائمة */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                              {mainFinanceType === 'real_estate_with_existing_personal' ? (
                                <>
                                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">الالتزامات القائمة</span>
                                  <span className="font-extrabold text-rose-600 dark:text-rose-450 text-[11px] truncate font-sans tabular-nums tracking-tight">
                                    {Math.round(existingMonthlyObligations).toLocaleString('ar-SA')} ريال
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">التمويل الشخصي</span>
                                  <span className={offer.supportsPersonal === false ? "font-bold text-rose-600 dark:text-rose-450 text-[10px]" : "font-extrabold text-[#0B1B34] dark:text-white text-[11px] truncate font-sans tabular-nums tracking-tight"}>
                                    {offer.supportsPersonal === false ? "غير متوفر" : `${Math.round(offer.personalAmount).toLocaleString('ar-SA')} ريال`}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Box 3: هامش الربح */}
                            <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">هامش الربح</span>
                              <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA] text-[11px] font-sans tabular-nums tracking-tight">
                                {offer.annualMargin}%
                              </span>
                            </div>

                            {/* Box 4: الدعم السكني */}
                            {offer.housingSupportAmount > 0 ? (
                              <div className="border border-[#BFDBFE] bg-[#EFF6FF] dark:bg-blue-950/15 dark:border-blue-900/30 rounded-xl p-2.5 flex flex-col justify-between">
                                <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] font-extrabold block mb-0.5">الدعم السكني</span>
                                <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA] text-[11px] truncate font-sans tabular-nums tracking-tight">
                                  {Math.round(offer.housingSupportAmount).toLocaleString('ar-SA')} {offer.supportType === 'monthly' ? 'ريال / شهر' : 'ريال'}
                                </span>
                              </div>
                            ) : (
                              <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-[#0F172A]/40 flex flex-col justify-between">
                                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-extrabold block mb-0.5">الدعم السكني</span>
                                <span className="font-bold text-slate-450 dark:text-slate-500 text-[11px]">غير مدعوم</span>
                              </div>
                            )}

                            {/* Optional Etizaz Box (Full width when active) */}
                            {offer.etizazAmount !== undefined && offer.etizazAmount > 0 && (
                              <div className="col-span-2 bg-indigo-50/70 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-2.5 text-xs space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">اعتزاز دفعة مستردة:</span>
                                  <span className="font-black text-indigo-700 dark:text-indigo-400 font-sans tabular-nums tracking-tight">{Math.round(offer.etizazAmount).toLocaleString('ar-SA')} ريال</span>
                                </div>
                                {offer.etizazMonthlyInstallment !== undefined && offer.etizazMonthlyInstallment > 0 && (
                                  <div className="flex flex-col gap-1 text-[11px] text-indigo-600 dark:text-indigo-300 border-t border-indigo-100/50 dark:border-indigo-900/10 pt-1.5">
                                    <div className="flex justify-between items-center">
                                      <span>قسط سداد اعتزاز:</span>
                                      <span className="font-bold font-sans tabular-nums tracking-tight">{Math.round(offer.etizazMonthlyInstallment).toLocaleString('ar-SA')} ريال / شهر</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-indigo-500/80 dark:text-indigo-400/80">
                                      <span>فترة السماح / السداد:</span>
                                      <span>سماح {offer.etizazGraceMonths ?? 24} ش ⚡ سداد {offer.etizazTermMonths || 0} ش</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Installments Breakdown */}
                      <div className="pt-1.5 flex flex-col gap-1 text-sm">
                        {mainFinanceType === 'real_estate_with_existing_personal' || productId === 'real_estate_with_existing_personal' ? (
                          <div className="space-y-1.5 bg-slate-50/60 dark:bg-[#0F172A]/40 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-3 animate-fade-in">
                            <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                              <span className="font-extrabold text-[#0B1B34] dark:text-slate-300 text-xs">قسط المرحلة 1 مدمج:</span>
                              <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded text-xs font-sans tabular-nums tracking-tight">
                                {Math.round(offer.totalCustomerStage1 || 0).toLocaleString('ar-SA')} ريال
                              </span>
                            </div>
                            <div className="text-[10px] text-[#4B5563] dark:text-slate-400 space-y-1 pl-1">
                              <div className="flex justify-between items-center">
                                <span>├─ قسط العقاري:</span>
                                <span className="font-sans tabular-nums tracking-tight">{Math.round(offer.realEstateStage1 || 0).toLocaleString('ar-SA')} ريال</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>├─ قسط الالتزام الشهري:</span>
                                <span className="font-sans tabular-nums tracking-tight">{Math.round(offer.existingMonthlyObligations || 0).toLocaleString('ar-SA')} ريال</span>
                              </div>
                              {offer.etizazAmount !== undefined && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment !== undefined && offer.etizazMonthlyInstallment > 0 && (
                                <div className="flex justify-between items-center text-indigo-700 dark:text-indigo-400">
                                  <span>├─ قسط اعتزاز الشهري:</span>
                                  <span className="font-sans tabular-nums tracking-tight">{Math.round(offer.etizazMonthlyInstallment).toLocaleString('ar-SA')} ريال</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-slate-600 dark:text-slate-450 font-semibold">
                                <span>└─ مدة المرحلة الأولى:</span>
                                <span>{offer.stage1Months || 0} شهر</span>
                              </div>
                            </div>

                            {offer.stage2Months > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#E5E7EB] dark:border-slate-800 pt-1.5 text-[#0B1B34] dark:text-slate-300">
                                <span className="font-semibold text-[#4B5563] dark:text-slate-400">قسط المرحلة 2 (صافي):</span>
                                <span className="font-black text-[#0057B8] dark:text-[#60A5FA] font-sans tabular-nums tracking-tight">{Math.round(offer.realEstateStage2 || 0).toLocaleString('ar-SA')} ريال <span className="text-[9px] text-gray-450 dark:text-slate-500">({offer.stage2Months} ش)</span></span>
                              </div>
                            )}

                            {offer.stage3Months > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#BFDBFE] dark:border-slate-800 pt-1.5 text-[#0057B8] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E3A8A]/15 p-1.5 rounded-lg border border-[#BFDBFE] dark:border-[#3B82F6]/30">
                                <span className="font-semibold text-[#0057B8] dark:text-[#60A5FA]">قسط المرحلة 3 (تقاعد):</span>
                                <span className="font-bold font-sans tabular-nums tracking-tight text-[#003B7A] dark:text-[#60A5FA]">{Math.round(offer.realEstateStage3 || 0).toLocaleString('ar-SA')} ريال <span className="text-[9px] font-normal">({offer.stage3Months} ش)</span></span>
                              </div>
                            )}
                          </div>
                        ) : productId === 'real_estate_with_new_personal' ? (
                          <div className="space-y-1.5 bg-slate-50/60 dark:bg-[#0F172A]/40 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-3">
                            <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                              <span className="font-extrabold text-[#0B1B34] dark:text-slate-300 text-xs">القسط الشهري الإجمالي:</span>
                              <span className="font-black text-[#0057B8] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#1E3A8A]/20 px-2 py-0.5 rounded text-xs font-sans tabular-nums tracking-tight">
                                {Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال
                              </span>
                            </div>
                            <div className="text-[10px] text-[#4B5563] dark:text-slate-400 space-y-1 pl-1">
                              <div className="flex justify-between items-center">
                                <span>├─ قسط العقاري:</span>
                                <span className="font-sans tabular-nums tracking-tight">{Math.round(offer.realEstateInstallmentOnly || 0).toLocaleString('ar-SA')} ريال</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>├─ قسط الشخصي:</span>
                                <span className={offer.supportsPersonal === false ? "text-rose-600 dark:text-rose-450 font-bold" : "font-sans tabular-nums tracking-tight"}>
                                  {offer.supportsPersonal === false ? "غير متوفر" : `${Math.round(offer.personalInstallmentAmount || 0).toLocaleString('ar-SA')} ريال`}
                                </span>
                              </div>
                              {offer.etizazAmount !== undefined && offer.etizazAmount > 0 && offer.etizazMonthlyInstallment !== undefined && offer.etizazMonthlyInstallment > 0 && (
                                <div className="flex justify-between items-center text-indigo-700 dark:text-indigo-400 font-semibold">
                                  <span>└─ قسط اعتزاز الشهري:</span>
                                  <span className="font-sans tabular-nums tracking-tight">{Math.round(offer.etizazMonthlyInstallment).toLocaleString('ar-SA')} ريال</span>
                                </div>
                              )}
                            </div>

                            {offer.monthlyInstallmentAfterPersonal !== undefined && offer.monthlyInstallmentAfterPersonal > 0 && (
                              <div className="flex justify-between items-center text-xs border-t border-dashed border-[#E5E7EB] dark:border-slate-800 pt-1.5 text-[#0B1B34] dark:text-slate-300">
                                <span className="font-semibold text-[#4B5563] dark:text-slate-400">بعد انتهاء الشخصي:</span>
                                <span className="font-bold text-[#0B1B34] dark:text-white font-sans tabular-nums tracking-tight">{Math.round(offer.monthlyInstallmentAfterPersonal).toLocaleString('ar-SA')} ريال</span>
                              </div>
                            )}

                            {offer.monthlyInstallmentAfterRetirement > 0 && (
                              <div className="flex justify-between items-center text-xs text-[#0057B8] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E3A8A]/15 rounded-lg p-2 mt-1 border border-[#BFDBFE] dark:border-[#3B82F6]/30">
                                <span>القسط التقاعدي:</span>
                                <span className="font-bold font-sans tabular-nums tracking-tight text-[#003B7A] dark:text-[#60A5FA]">{Math.round(offer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال</span>
                              </div>
                            )}
                          </div>
                        ) : mainFinanceType === 'personal_only' ? null : (
                          <div className="space-y-1.5">
                            {/* Prominent Real Estate Monthly Installment Banner */}
                            <div className="bg-[#EFF6FF] border border-[#BFDBFE] dark:bg-blue-950/10 dark:border-blue-900/30 rounded-xl p-2.5 flex justify-between items-center text-xs">
                              <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA]">القسط العقاري الشهري:</span>
                              <span className="font-black text-[#0057B8] dark:text-[#60A5FA] font-sans tabular-nums tracking-tight">
                                {Math.round(offer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال / شهر
                              </span>
                            </div>

                            {offer.monthlyInstallmentAfterRetirement > 0 && (
                              <div className="flex justify-between items-center text-xs text-[#0057B8] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E3A8A]/15 rounded-lg p-2.5 border border-[#BFDBFE] dark:border-[#3B82F6]/30">
                                <span>القسط التقاعدي العقاري:</span>
                                <span className="font-bold font-sans tabular-nums tracking-tight text-[#003B7A] dark:text-[#60A5FA]">{Math.round(offer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال / شهر</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 rounded-xl p-4 my-6 text-sm text-red-700 dark:text-red-400 min-h-[140px] flex flex-col justify-center">
                    <div className="flex gap-2 items-start">
                      <XCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <h4 className="font-bold mb-1">بيانات غير مطابقة للقبول ائتمانياً</h4>
                        <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed">{offer.rejectionReason || 'العميل لا يستوفي قوانين الحد الأدنى للراتب أو مدة الخدمة المصرح بها لهذا البنك.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3 w-full">
                  {/* Row 1 */}
                  <button 
                    onClick={() => setSelectedOffer(offer)}
                    className="text-center py-2.5 rounded-xl bg-white border border-[#BFDBFE] dark:border-slate-750 text-[#0057B8] font-bold text-[11px] transition-all hover:bg-[#EFF6FF] cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 text-[#0057B8]" />
                    <span>التفاصيل والمخطط</span>
                  </button>
                  
                  <button 
                    onClick={(e) => handleSaveClick(offer, e)}
                    className="text-center py-2.5 rounded-xl bg-white border border-[#BFDBFE] dark:border-slate-750 text-[#0057B8] font-bold text-[11px] transition-all hover:bg-[#EFF6FF] cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Bookmark className="w-3.5 h-3.5 shrink-0 text-[#0057B8]" />
                    <span>حفظ النتيجة</span>
                  </button>

                  {/* Row 2 */}
                  <button 
                    onClick={(e) => handleCopyText(offer, e)}
                    className="text-center py-2.5 rounded-xl bg-white border border-[#BFDBFE] dark:border-slate-750 text-[#0057B8] font-bold text-[11px] transition-all hover:bg-[#EFF6FF] cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0 text-[#0057B8]" />
                    <span>نسخ الحسبة</span>
                  </button>

                  <button 
                    onClick={(e) => handleShare(offer, e)}
                    className="text-center py-2.5 rounded-xl bg-white border border-[#BFDBFE] dark:border-slate-750 text-[#0057B8] font-bold text-[11px] transition-all hover:bg-[#EFF6FF] cursor-pointer flex items-center justify-center gap-2 select-none"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0 text-[#0057B8]" />
                    <span>مشاركة الحسبة</span>
                  </button>

                  {/* Row 3 (Full width) */}
                  {getWhatsAppContactInfo(offer.bankId) && (
                    <button 
                      onClick={(e) => handleWhatsAppContact(offer, e)}
                      className="text-center py-3 rounded-xl bg-[#003B7A] hover:bg-[#002b5c] text-white font-black text-xs transition-all duration-200 shadow-lg shadow-blue-900/10 dark:shadow-none hover:shadow-xl cursor-pointer flex items-center justify-center gap-2 select-none col-span-2"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-white" />
                      <span>تواصل مع الموظف</span>
                    </button>
                  )}
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
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-8 md:pt-16 px-4 bg-gradient-to-b from-transparent via-[#F5F7FA]/75 to-[#F5F7FA]/95 dark:via-[#0B0F19]/75 dark:to-[#0B0F19]/95">
            <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center animate-slide-up sticky top-6 sm:top-12">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/20 text-[#0057B8] dark:text-[#60A5FA] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100/50 dark:border-blue-900/30">
                <Award className="w-7 h-7" />
              </div>
              
              <h3 className="text-lg font-black text-[#111827] dark:text-white mb-2 leading-tight text-center">
                اشترك للاطلاع على تفاصيل التمويل الكاملة
              </h3>
              
              <p className="text-xs text-[#4B5563] dark:text-slate-350 leading-relaxed mb-6 max-w-xs mx-auto text-center">
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
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0057B8] dark:bg-[#0057B8] text-white font-black text-xs hover:bg-[#004494] dark:hover:bg-[#004494] shadow-lg shadow-blue-100/50 dark:shadow-none transition-all cursor-pointer active:scale-98"
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
                  className="w-full py-3.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-slate-250 font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-98"
                >
                  جرّب مجاناً (تنشيط فوري للتجربة)
                </button>
              </div>
              
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-4 text-center">
                الحساب الذهبي يمنحك ولوجاً شاملاً وحسابات لامتناهية لـ 15 بنكاً ومؤسسة مالية.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Results Button on Mobile - Hidden per requirement */}
      <div className="hidden">
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

        </main>
      </div>
      {selectedOffer && (
        <div id="drawer-overlay" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-[#F5F7FA] dark:bg-[#0B0F19] h-full overflow-y-auto flex flex-col animate-slide-in shadow-2xl">
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
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-premium dark:shadow-none flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                <div className="text-right w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">إجمالي التمويل المتاح</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#0057B8] dark:text-[#60A5FA]">
                      {Math.round(selectedOffer.realEstateAmount + (selectedOffer.supportsPersonal !== false ? selectedOffer.personalAmount : 0)).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ريال سعودي</span>
                  </div>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                  <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs ${
                    selectedOffer.isEligible 
                      ? selectedOffer.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400'
                  }`}>
                    {selectedOffer.isEligible 
                      ? selectedOffer.status === 'warning'
                        ? 'مقبول مبدئيًا'
                        : 'مقبول' 
                      : 'مرفوض'}
                  </span>
                </div>
              </div>

              {/* Informational Message replacing technical personal/duration reduction diagnostics */}
              <div className="bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/70 dark:border-blue-900/30 p-4 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-400">
                <span className="text-sm leading-none">ℹ️</span>
                <p className="font-bold leading-relaxed mb-0 text-right w-full">
                  تم ضبط مدة التمويل تلقائيًا بما يتوافق مع عمر العميل وحدود الجهة التمويلية.
                </p>
              </div>

              {/* Detatils Grid */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-5">
                <h4 className="font-sans font-black text-sm text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#0057B8] dark:bg-[#60A5FA] rounded-full"></div>
                  <span>تفاصيل نتيجة الحسبة</span>
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 text-right font-semibold select-none">
                  {selectedOffer.financeAmountAdjusted === true && (
                    <div className="col-span-2 bg-[#EFF6FF] dark:bg-[#1E3A8A]/15 border border-[#BFDBFE] dark:border-[#3B82F6]/30 p-4 rounded-xl space-y-3 font-sans">
                      <div className="flex justify-between items-center border-b border-blue-100/30 dark:border-blue-900/10 pb-2">
                        <span className="text-xs font-bold text-[#0057B8] dark:text-[#60A5FA]">تعديل مبلغ التمويل المطلوب</span>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-[#0057B8] dark:text-[#60A5FA] px-2 py-0.5 rounded-md font-bold">معدل</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">أقصى تمويل متاح لدى هذه الجهة</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                            {Math.round(selectedOffer.maxEligibleFinanceAmount || 0).toLocaleString('ar-SA')} ريال
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">مبلغ التمويل المطلوب</span>
                          <span className="font-extrabold text-[#003B7A] dark:text-[#60A5FA] text-sm font-sans tabular-nums tracking-tight">
                            {Math.round(selectedOffer.requestedFinanceAmount || 0).toLocaleString('ar-SA')} ريال
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                        * تم احتساب القسط وهيكل التمويل على المبلغ المطلوب فقط مع بقاء الهامش والامتيازات الأخرى كما هي.
                      </p>
                    </div>
                  )}

                  {/* 1. التمويل العقاري */}
                  <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">التمويل العقاري</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {Math.round(selectedOffer.realEstateAmount).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 2. التمويل الشخصي */}
                  <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">التمويل الشخصي</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {selectedOffer.supportsPersonal === false 
                        ? 'غير متوفر لدى هذه الجهة' 
                        : `${Math.round(selectedOffer.personalAmount).toLocaleString('ar-SA')} ريال`}
                    </span>
                  </div>

                  {/* 3. الدعم السكني */}
                  <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 hover:bg-[#EFF6FF]/80 p-3.5 rounded-xl border border-[#BFDBFE] dark:border-[#3B82F6]/30 transition-all">
                    <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">الدعم السكني</span>
                    <span className="font-bold text-[#0057B8] dark:text-[#60A5FA] text-sm">
                      {Math.round(selectedOffer.housingSupportAmount).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 4. القسط الشهري */}
                  <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 hover:bg-[#EFF6FF]/80 p-3.5 rounded-xl border border-[#BFDBFE] dark:border-[#3B82F6]/30 transition-all">
                    <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">القسط الشهري الإجمالي</span>
                    <span className="font-bold text-[#0057B8] dark:text-[#60A5FA] text-sm">
                      {Math.round(selectedOffer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 5. قسط العقاري */}
                  <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">قسط التمويل العقاري</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {Math.round(selectedOffer.realEstateInstallmentOnly || (selectedOffer.monthlyInstallmentBeforeRetirement - (selectedOffer.personalInstallmentAmount || 0))).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>

                  {/* 6. قسط الشخصي */}
                  {(selectedOffer.supportsPersonal === false || (selectedOffer.personalAmount || 0) > 0) && (
                    <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">قسط التمويل الشخصي</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {selectedOffer.supportsPersonal === false 
                          ? 'غير متوفر لدى هذه الجهة (تم احتساب العقاري فقط)' 
                          : `${Math.round(selectedOffer.personalInstallmentAmount || 0).toLocaleString('ar-SA')} ريال`}
                      </span>
                    </div>
                  )}

                  {/* 7. القسط بعد انتهاء الشخصي */}
                  {selectedOffer.monthlyInstallmentAfterPersonal !== undefined && selectedOffer.monthlyInstallmentAfterPersonal > 0 && (
                    <div className="bg-[#0057B8]/5 dark:bg-[#1E3A8A]/10 hover:bg-[#0057B8]/10 dark:hover:bg-[#1E3A8A]/20 p-3.5 rounded-xl border border-[#0057B8]/10 dark:border-[#3B82F6]/30 transition-all">
                      <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">القسط بعد انتهاء الشخصي</span>
                      <span className="font-bold text-[#0057B8] dark:text-[#60A5FA] text-sm">
                        {Math.round(selectedOffer.monthlyInstallmentAfterPersonal).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* 8. نسبة الاستقطاع */}
                  {selectedOffer.personalDiagnostics?.dsr !== undefined ? (
                    <>
                      <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">نسبة الاستقطاع العقاري (DSR)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {selectedOffer.dsrUsed}%
                        </span>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">نسبة الاستقطاع الشخصي (DSR)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {selectedOffer.personalDiagnostics.dsr}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">نسبة الاستقطاع (DSR)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {selectedOffer.dsrUsed}%
                      </span>
                    </div>
                  )}

                  {/* 9. هامش الربح */}
                  <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">هامش الربح السنوي</span>
                    <span className="font-bold text-[#0057B8] dark:text-[#60A5FA] text-sm">
                      {selectedOffer.annualMargin}%
                    </span>
                  </div>

                  {/* 10. مدة التمويل */}
                  <div className="bg-slate-50/50 dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 p-3.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60 transition-all">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">مدة التمويل</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {selectedOffer.termMonths} شهراً <span className="text-[10px] text-slate-450 font-normal">({selectedOffer.termMonths / 12} سنة)</span>
                    </span>
                  </div>

                  {/* 11. تفاصيل التقدم للتقاعد */}
                  {selectedOffer.monthlyInstallmentAfterRetirement > 0 && (
                    <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/15 hover:bg-blue-50/50 dark:hover:bg-[#1E3A8A]/25 p-3.5 rounded-xl border border-[#BFDBFE] dark:border-[#3B82F6]/30 transition-all col-span-2">
                      <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">القسط التقاعدي اللاحق</span>
                      <span className="font-bold font-sans tabular-nums tracking-tight text-[#003B7A] dark:text-[#60A5FA] text-sm">
                        {Math.round(selectedOffer.monthlyInstallmentAfterRetirement).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* الراتب التقاعدي المتوقع */}
                  {selectedOffer.pensionSalary !== undefined && selectedOffer.pensionSalary > 0 && (
                    <div className="bg-blue-50/30 dark:bg-[#1E3A8A]/15 hover:bg-blue-50/50 dark:hover:bg-[#1E3A8A]/25 p-3.5 rounded-xl border border-[#BFDBFE] dark:border-[#3B82F6]/30 transition-all col-span-2">
                      <span className="text-[10px] text-[#0057B8] dark:text-[#60A5FA] block mb-1">الراتب التقاعدي المتوقع</span>
                      <span className="font-bold text-[#003B7A] dark:text-[#60A5FA] text-sm">
                        {Math.round(selectedOffer.pensionSalary).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {/* 12. الملاحظات المختصرة / سبب الرفض إن وجد */}
                  {!selectedOffer.isEligible && selectedOffer.rejectionReason && (
                    <div className="bg-rose-50 dark:bg-rose-950/15 hover:bg-rose-100/40 dark:hover:bg-[#ef4444]/10 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30 transition-all col-span-2 text-right">
                      <span className="text-[10px] text-rose-500 dark:text-rose-450 block mb-1">سبب الاستبعاد أو ملاحظات الأهلية</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 text-xs text-right block">
                        {selectedOffer.rejectionReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>



              {/* Footer notes */}
              <p className="text-[10px] text-[#9CA3AF] dark:text-slate-500 text-center leading-relaxed font-sans">
                هذه الحسبة مبدئية وتعتمد على الموديل الرياضي لـ "حسبة". تخضع المعايير لمراجعة لائحة السياسة الائتمانية الخاصة بكل جهة تمويلية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 💾 Save all customer results modal dialog */}
      {showGroupSaveModal && (
        <div id="save-group-result-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className="p-6 text-white text-right bg-gradient-to-r from-[#0057B8] to-[#003B7A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">حفظ كل نتائج العميل</h3>
                  <p className="text-[10px] text-white/80 mt-0.5">سيتم حفظ مقارنة البنوك كاملة في سجل واحد</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowGroupSaveModal(false); setGroupSaveStatus(null); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-right">
              {groupSaveStatus === 'success' ? (
                <div className="py-6 text-center space-y-4 animate-fade-in">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-sm text-gray-900 dark:text-white">تم حفظ مقارنة جميع البنوك بنجاح!</h4>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-2 font-sans leading-relaxed">
                      تم حفظ تقرير المقارنة الكاملة للعميل بنجاح. يمكنك عرض وتصفح كافة التفاصيل من صفحة <span className="font-bold text-[#0057B8] dark:text-[#60A5FA]">"نتائجي"</span> في أي وقت.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Form fields */}
                  <div className="space-y-3 font-medium">
                    <div className="space-y-1.5 text-right font-medium">
                      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">
                        اسم العميل <span className="text-rose-500">*</span> (مطلوب):
                      </label>
                      <input 
                        type="text"
                        value={groupSaveCustomerName}
                        onChange={(e) => setGroupSaveCustomerName(e.target.value)}
                        placeholder="مثال: أبو محمد الودعاني"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0057B8] focus:bg-white dark:focus:bg-[#0f172a] transition-all text-right"
                      />
                    </div>

                    <div className="space-y-1.5 text-right font-medium">
                      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">
                        عنوان الحسبة (اختياري):
                      </label>
                      <input 
                        type="text"
                        value={groupSaveTitle}
                        onChange={(e) => setGroupSaveTitle(e.target.value)}
                        placeholder="مثال: مقارنة جميع البنوك - فيلا الياسمين"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0057B8] focus:bg-white dark:focus:bg-[#0f172a] transition-all text-right"
                      />
                    </div>
                  </div>

                  {groupSaveStatus === 'error' && (
                    <div className="p-3 bg-red-50 dark:bg-red-955/15 text-red-800 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-2 leading-relaxed animate-fade-in text-right">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <span>{groupSaveErrorText}</span>
                    </div>
                  )}

                  {/* Buttons controls */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={executeSaveGroupResults}
                      disabled={isGroupSaving || !groupSaveCustomerName.trim()}
                      className="flex-1 py-3 bg-[#0057B8] hover:bg-[#003B7A] text-white text-xs font-black rounded-xl transition-all shadow-md hover:shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isGroupSaving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جاري الحفظ الآمن...</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>تأكيد حفظ المقارنة</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowGroupSaveModal(false)}
                      className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px]"
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

      {/* 💾 Save calculation settings modal dialog */}
      {saveOffer && (
        <div id="save-result-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            
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
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-sm text-gray-900 dark:text-white">تم حفظ نتيجة الحسبة المحاسبية المتكاملة!</h4>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-2 font-sans leading-relaxed">
                      تم تصنيف وحفظ التمويل بنجاح في ملفك الشخصي. يمكنك عرض ومقارنة كافة النتائج من صفحة <span className="font-bold text-[#0057B8] dark:text-[#60A5FA]">"نتائجي"</span> في أي وقت.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Informational Summary parameters preview */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl text-xs space-y-2 font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/80 pb-1.5 align-middle">
                      <span className="text-slate-400 dark:text-slate-500">البنك والمؤسسة:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{saveOffer.bankName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/80 pb-1.5">
                      <span className="text-slate-400 dark:text-slate-500">إجمالي حد التمويل:</span>
                      <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA]" dir="ltr">
                        {Math.round(mainFinanceType === 'personal_only' ? saveOffer.personalAmount : saveOffer.totalPurchasingPower).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">القسط والقنوات:</span>
                      <span className="font-extrabold text-[#0057B8] dark:text-[#60A5FA]" dir="ltr">
                        {Math.round(saveOffer.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال / شهر
                      </span>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 font-medium">
                    <div className="space-y-1.5 text-right font-medium">
                      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">عنوان أو مسمى الحسبة للتمييز:</label>
                      <input 
                        type="text"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        placeholder="مثال: فيلا الياسمين - خيار عقاري ممتاز"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#60A5FA] focus:bg-white dark:focus:bg-[#0f172a] transition-all text-right"
                      />
                    </div>

                    <div className="space-y-1.5 text-right font-medium">
                      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">اسم العميل (اختياري):</label>
                      <input 
                        type="text"
                        value={saveCustomerName}
                        onChange={(e) => setSaveCustomerName(e.target.value)}
                        placeholder="مثال: أبو محمد الودعاني"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0057B8] dark:focus:ring-[#60A5FA] focus:bg-white dark:focus:bg-[#0f172a] transition-all text-right"
                      />
                    </div>
                  </div>

                  {saveStatus === 'error' && (
                    <div className="p-3 bg-red-50 dark:bg-red-955/15 text-red-800 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-2 leading-relaxed animate-fade-in text-right">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <span>{saveErrorText}</span>
                    </div>
                  )}

                  {/* Buttons controls */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={executeSaveResult}
                      disabled={isSaving || !saveTitle.trim()}
                      className="flex-1 py-3 bg-[#0057B8] hover:bg-[#003B7A] text-white text-xs font-black rounded-xl transition-all shadow-md hover:shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
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
                      className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px]"
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
          <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-scale-up space-y-5 text-right">
            
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/30 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2 text-center col-span-2">
              <h3 className="font-sans font-black text-base text-gray-950 dark:text-white">سجّل الدخول لحفظ نتائجك</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-sans max-w-xs mx-auto">
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
                className="w-full py-3 bg-[#0057B8] dark:bg-[#0057B8] text-white text-xs font-extrabold rounded-xl transition-all shadow-md hover:shadow-blue-200 dark:hover:shadow-blue-950 cursor-pointer text-center"
              >
                تسجيل الدخول / إنشاء حساب جديد
              </button>
              
              <button
                onClick={() => setShowAuthRequiredAlert(false)}
                className="w-full py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-slate-200/50 dark:border-slate-800"
              >
                متابعة الحسبة كضيف
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Success Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-50 dark:bg-[#064e3b] border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100 shadow-xl rounded-2xl px-5 py-4 max-w-sm flex items-center justify-between gap-3 animate-slide-up" dir="rtl">
          <div className="flex items-center gap-2 text-right">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-sans">{toast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="font-extrabold text-[#6B7280] dark:text-slate-350 hover:text-[#111827] dark:hover:text-white text-md px-1 cursor-pointer select-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
