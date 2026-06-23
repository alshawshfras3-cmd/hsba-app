import { DiagnosticResult, CalculationStatus, ProductAcceptance, SectorId, ProductId, SupportType } from '../../types';

export function runDiagnostics(params: {
  bankName: string;
  acceptance: ProductAcceptance | undefined;
  sectorId: SectorId;
  productId: ProductId;
  supportType: SupportType;
  netSalary: number;
  currentAgeYears: number;
  serviceMonths: number;
  termMonths: number;
  originalMaxTerm: number;
  termReductionReason?: string;
  isDirectSalary: boolean;
  pensionRatioReduced?: boolean;
  maxAgeAtApplication?: number | null;
  applicationAgeYears?: number;
}): DiagnosticResult {
  const {
    bankName,
    acceptance,
    sectorId,
    productId,
    supportType,
    netSalary,
    currentAgeYears,
    serviceMonths,
    termMonths,
    originalMaxTerm,
    termReductionReason,
    isDirectSalary,
    pensionRatioReduced,
    maxAgeAtApplication,
    applicationAgeYears
  } = params;

  const messages: string[] = [];
  const calculationSteps: string[] = [];
  let status: CalculationStatus = 'approved';

  // Step 1: Check baseline legal age
  calculationSteps.push('الخطوة 1: التحقق من السن القانوني للعميل.');
  if (currentAgeYears < 18) {
    status = 'rejected';
    messages.push('عذرًا، التمويل غير متاح لمن هم دون سن 18 عامًا.');
    return { status, messages, calculationSteps };
  }

  // Step 2: Check product acceptance record
  calculationSteps.push('الخطوة 2: فحص معايير القبول والاشتراطات الخاصة بالجهة التمويلية.');
  if (!acceptance || !acceptance.isActive) {
    status = 'rejected';
    messages.push(`جهة التمويل (${bankName}) لا تقدم هذا المنتج حاليًا أو لم يتم تفعيل القاعدة.`);
    return { status, messages, calculationSteps };
  }

  // Step 3: Check sector restrictions
  if (!acceptance.allowedSectors.includes(sectorId)) {
    status = 'rejected';
    const sectorDisplayAr: Record<string, string> = {
      gov_civil: 'مدني حكومي',
      military: 'عسكري',
      semi_gov: 'شبه حكومي',
      companies: 'موظف شركات',
      retired: 'متقاعد'
    };
    const sectorName = sectorDisplayAr[sectorId as string] || sectorId;
    messages.push(`تم رفض الطلب: القطاع المستهدف (${sectorName}) غير مقبول لدى ${bankName} لهذا المنتج.`);
  }

  // Step 4: Check minimum salary
  if (netSalary < acceptance.minSalary) {
    status = 'rejected';
    messages.push(`تم رفض الطلب: صافي الراتب (${netSalary.toLocaleString('ar-SA')} ريال) أقل من الحد الأدنى للقبول لدى ${bankName} والمقدر بـ ${acceptance.minSalary.toLocaleString('ar-SA')} ريال.`);
  }

  // Step 5: Check age limits
  if (currentAgeYears < acceptance.minAge) {
    status = 'rejected';
    messages.push(`تم رفض الطلب: عمر العميل (${currentAgeYears} سنة) أقل من الحد الأدنى المقبول لدى ${bankName} والبالغ ${acceptance.minAge} سنة.`);
  }

  // Step 5.6: Check max age at application/start of finance
  if (maxAgeAtApplication !== undefined && maxAgeAtApplication !== null && applicationAgeYears !== undefined) {
    if (applicationAgeYears > maxAgeAtApplication) {
      status = 'rejected';
      messages.push('تجاوز العميل أقصى عمر مسموح عند بداية التمويل لدى هذه الجهة.');
    }
  }

  // Step 5.5: Check support type eligibility
  const normProductId = (productId === 'personal' || productId === 'personal_only') ? 'personal_only' : productId;
  if (normProductId !== 'personal_only') {
    if (supportType === 'none' && !acceptance.allowUnsupported) {
      status = 'rejected';
      messages.push(`تم رفض الطلب: هذا المنتج لا يقبل العملاء بدون دعم سكني لدى ${bankName}.`);
    } else if (supportType === 'monthly' && !acceptance.allowMonthlySupport) {
      status = 'rejected';
      messages.push(`تم رفض الطلب: الدعم السكني الشهري غير متاح لهذا المنتج لدى ${bankName}.`);
    } else if (supportType === 'downpayment' && !acceptance.allowDownpaymentSupport) {
      status = 'rejected';
      messages.push(`تم رفض الطلب: دعم الدفعة المباشرة غير متاح لهذا المنتج لدى ${bankName}.`);
    }
  }

  // Step 6: Check minimum service months (not applicable to retired)
  if (sectorId !== 'retired' && serviceMonths < acceptance.minServiceMonths) {
    status = 'rejected';
    messages.push(`تم رفض الطلب: مدة الخدمة الحالية (${serviceMonths} شهر) أقل من الحد الأدنى المشترط البالغ ${acceptance.minServiceMonths} شهر.`);
  }

  // Step 7: Evaluate warnings and adjustments
  if (status !== 'rejected') {
    calculationSteps.push('الخطوة 3: تحليل المدة وضوابط الاستقطاع والتدرج.');
    
    if (termReductionReason) {
      status = 'warning';
      messages.push(termReductionReason);
    }

    if (pensionRatioReduced) {
      status = 'warning';
      messages.push('ملاحظة: تم تخفيض التمويل نظراً لانتقال العميل إلى الراتب التقاعدي الأقل في النصف الثاني من التمويل.');
    }

    if (supportType === 'downpayment') {
      messages.push('تم تفعيل دعم الدفعة المباشرة (المنحة): أُضيفت القيمة لصافي القدرة الشرائية دون تضمينها في أصل القرض العقاري لعدم فرض فوائد تراكمية.');
    }

    if (isDirectSalary) {
      messages.push('إشعار: تم استخدام الراتب الصافي المدخل مباشرةً بناءً على رغبتك.');
    } else {
      messages.push('تم حساب صافي الراتب والخصومات التقاعدية (تأمين طبي / ساند / مصلحة المعاشات) تلقائيًا.');
    }

    if (status === 'approved') {
      messages.push(`تم قبول العميل مبدئيًا لدى ${bankName} لتلبية كافة اشتراطات الدخل، العمر، والخدمة.`);
    }
  } else {
    calculationSteps.push('النتيجة النهائية: العميل غير مؤهل لعدم استيفاء بعض شروط القبول.');
  }

  return {
    status,
    messages,
    calculationSteps
  };
}
