// Stateful AI Smart Assistant Service (مساعد حسبة الذكي)
// Manages Conversation patterns, multi-turn state transitions, security, and integration with the Hesba Finance Engine.

import { searchKnowledgeBase, KNOWLEDGE_BASE } from './assistantKnowledge';
import { checkAssistantGuard } from './assistantGuard';
import { 
  runAssistantCalculation, 
  validateAssistantInput, 
  AssistantCalculationInput,
  AssistantVisibleResult,
  mapToAssistantVisibleResults
} from './assistantCalculationAdapter';
import { SectorId, ProductId, SupportType, TermMode } from '../types';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  // Let's add rendering capabilities for enriched elements (e.g. results tables, confirmation buttons)
  richContent?: {
    type: 'buttons' | 'results' | 'data_summary' | 'whatsapp_approval';
    buttons?: { id: string; label: string; action: string }[];
    results?: any[];
    summaryData?: any;
    whatsappData?: any;
  };
}

export interface Suggestion {
  id: string;
  label: string;
  question: string;
}

export interface AssistantConfig {
  mode: 'customer' | 'admin';
  title: string;
  greeting: string;
  disclaimer: string;
  suggestions: Suggestion[];
}

export const CUSTOMER_CONFIG: AssistantConfig = {
  mode: 'customer',
  title: 'مساعد حسبة الذكي',
  greeting: 'مرحباً بك! أنا مساعدك التمويلي الذكي في منصة حسبة. كيف يمكنني مساعدتك في فهم نتائج الحسبة أو التخطيط لتمويلك اليوم؟',
  disclaimer: KNOWLEDGE_BASE.legalDisclaimer,
  suggestions: [
    { id: 'calculate_my_finance', label: '📊 احسب تمويلي الآن', question: 'احسب تمويلي الآن' },
    { id: 'dsr_info', label: '📉 شرح نسبة الاستقطاع DSR', question: 'ما هي نسبة الاستقطاع DSR؟' },
    { id: 'support_diff', label: '🏠 أنواع الدعم السكني', question: 'ما هو الفرق بين الدعم الشهري ودعم الدفعة المسبقة؟' },
    { id: 'etizaz_info', label: '🎖️ باقة دعم اعتزاز عسكري', question: 'ما هو دعم اعتزاز للعسكريين؟' },
    { id: 'bank_differences', label: '🏦 لماذا تختلف البنوك؟', question: 'لماذا تختلف مبالغ التمويل وعروض البنوك؟' },
    { id: 'retirement_age', label: '📅 أثر قرب التقاعد السني', question: 'ما هو أثر قرب التقاعد على التمويل؟' },
    { id: 'personal_missing', label: '💳 التمويل الشخصي المدمج', question: 'كيف يعمل التمويل الشخصي المدمج مع العقاري؟' },
    { id: 'estimation_nature', label: '⚠️ هل النتائج نهائية؟', question: 'هل أرقام الحاسبة نهائية ومضمونة للتعاقد؟' }
  ]
};

export const ADMIN_CONFIG: AssistantConfig = {
  mode: 'admin',
  title: 'دليل الإدارة ومساعد القواعد',
  greeting: 'أهلاً بك يا مدير النظام! أنا هنا لمساعدتك في فهم معايير البنوك والخصائص التمويلية المتقدمة.',
  disclaimer: 'تنبيه: هذا المساعد للإرشاد وقراءة المفاهيم فقط. أي تعديل أو حفظ للإعدادات يجب أن يتم يدويًا من قبلك.',
  suggestions: [
    { id: 'margins_explain', label: '📈 آلية هوامش الربح', question: 'شرح آلية عمل إعدادات هامش الربح؟' },
    { id: 'table_types', label: '🔗 جدول موحد مقابل جدولين', question: 'ما الفرق بين جدول موحد وجدولين بتحويل وبدون تحويل الراتب؟' },
    { id: 'salary_categories', label: '💼 وعاء وفئات الرواتب', question: 'كيف تؤثر فئات الرواتب المعتمدة على الأهلية السنوية؟' }
  ]
};

export interface AssistantState {
  conversationMode: 'idle' | 'explaining' | 'collecting_data' | 'ready_to_calculate' | 'showing_results' | 'whatsapp_approval';
  currentAskField: keyof AssistantCalculationInput | 'confirm_calc' | 'whatsapp_confirm';
  inputs: AssistantCalculationInput;
  results?: any[];
  selectedBankForContact?: any;
  bestOptionCriteria?: 'highest_amount' | 'lowest_installment' | 'lowest_margin' | 'shortest_term' | 'salary_bank' | 'supported_result';
  pendingResultQuestion?: string;
}

export const INITIAL_ASSISTANT_STATE: AssistantState = {
  conversationMode: 'idle',
  currentAskField: 'sectorId',
  inputs: {
    sectorId: undefined,
    productId: 'real_estate_with_new_personal', // default
    militarySubType: undefined,
    rankId: undefined,
    birthYear: undefined,
    birthMonth: undefined,
    birthDay: undefined,
    birthCalendar: 'gregorian', // default
    appointmentYear: undefined,
    appointmentMonth: undefined,
    appointmentDay: undefined,
    appointmentCalendar: 'gregorian',
    salaryMode: 'direct',
    directNetSalary: undefined,
    basicSalary: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    obligations: 0,
    supportType: 'none',
    selectedBankId: 'all',
    salaryBankId: null,
    termMode: 'max',
    manualTermYears: undefined
  },
  results: undefined,
  selectedBankForContact: undefined,
  bestOptionCriteria: 'highest_amount',
  pendingResultQuestion: undefined
};

// Simple Arabic normalization
function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[أإآأ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Detects bank IDs from normalized Arabic text.
 */
function detectBankName(normText: string): string | null {
  if (normText.includes('الاهلي') || normText.includes('الأهلي')) {
    return 'alahli';
  }
  if (normText.includes('الراجحي')) {
    return 'rajhi';
  }
  if (normText.includes('البلاد')) {
    return 'albilad';
  }
  if (normText.includes('الانماء') || normText.includes('الإنماء')) {
    return 'alinma';
  }
  if (normText.includes('الفرنسي')) {
    return 'fransi';
  }
  if (normText.includes('العربي')) {
    return 'alarabi';
  }
  if (normText.includes('بدايه') || normText.includes('بداية')) {
    return 'bidaya';
  }
  return null;
}

function bankArName(bankId: string): string {
  const names: { [key: string]: string } = {
    alahli: 'البنك الأهلي',
    rajhi: 'مصرف الراجحي',
    alinma: 'مصرف الإنماء',
    fransi: 'البنك السعودي الفرنسي',
    bidaya: 'شركة بداية',
    albilad: 'بنك البلاد',
    alarabi: 'البنك العربي'
  };
  return names[bankId] || bankId;
}

/**
 * Formats a safe percentage:
 * - If value is between 0 and 1 only, multiply by 100.
 * - If value is greater than 1, show as is.
 * - Does not display trailing decimals if it is a whole number.
 */
function formatSafePercent(val: number): string {
  let percentageValue = val;
  if (val > 0 && val <= 1) {
    percentageValue = val * 100;
  }
  if (percentageValue % 1 === 0) {
    return percentageValue.toString() + "%";
  } else {
    return percentageValue.toFixed(2) + "%";
  }
}

function answerForBank(res: AssistantVisibleResult, norm: string): { response: string } {
  const formatMoney = (val: number) => {
    return Math.round(val).toLocaleString('ar-SA') + " ريال";
  };

  const hasInstallment = norm.includes('قسط') || norm.includes('القسط') || norm.includes('الاقساط') || norm.includes('قسطي');
  const hasFinance = norm.includes('تمويل') || norm.includes('التمويل') || norm.includes('يعطيني') || norm.includes('يعطينى') || norm.includes('القدره') || norm.includes('القدرة');
  const hasSupport = norm.includes('دعم') || norm.includes('الدعم');
  const hasEtizaz = norm.includes('اعتزاز');
  const hasMargin = norm.includes('هامش') || norm.includes('فائده') || norm.includes('فائدة') || norm.includes('ربح') || norm.includes('المرابحه') || norm.includes('المرابحة');
  const hasTerm = norm.includes('مده') || norm.includes('مدة') || norm.includes('سنوات') || norm.includes('سنه') || norm.includes('سنة') || norm.includes('اعوام') || norm.includes('أعوام');
  const hasDsr = norm.includes('استقطاع') || norm.includes('الاستقطاع') || norm.includes('dsr');
  const hasEligibility = norm.includes('قبول') || norm.includes('مقبول') || norm.includes('قبلني') || norm.includes('قبولي') || norm.includes('مؤهل') || norm.includes('اهليه') || norm.includes('اهلية') || norm.includes('رفض') || norm.includes('الرفض');

  // 1. Rejection Reason / Eligibility / Acceptance Checks
  if (hasEligibility) {
    if (norm.includes('لماذا تم رفض') || norm.includes('سبب الرفض') || norm.includes('اسباب الرفض') || norm.includes('رفضني') || norm.includes('الرفض') || norm.includes('لماذا رفض')) {
      if (res.rejectionReason) {
        return {
          response: `سبب عدم الأهلية الموضح لـ **${res.bankName}** هو: ${res.rejectionReason}`
        };
      } else if (res.eligible) {
        return {
          response: `أنت مقبول مبدئيًا لدى **${res.bankName}** بحسب بيانات الحسبة الحالية، والقرار النهائي يعود إلى الجهة التمويلية.`
        };
      } else {
        return {
          response: `طلبك غير مؤهل لدى **${res.bankName}** لعدم مطابقة سياسات الائتمان المقررة لدى الجهة.`
        };
      }
    }

    if (res.eligible) {
      return {
        response: `أنت مقبول مبدئيًا لدى **${res.bankName}** بحسب بيانات الحسبة الحالية، والقرار النهائي يعود إلى الجهة التمويلية.`
      };
    } else {
      return {
        response: `للأسف، أنت **غير مؤهل** حالياً لدى **${res.bankName}**. السبب: ${res.rejectionReason || 'عدم مطابقة سياسات الأهلية وعمل الإستقطاع.'}`
      };
    }
  }

  // 2. Installment after Personal (Specialized Installment check first)
  if (hasInstallment && (norm.includes('بعد انتهاء') || norm.includes('بعد الشخصي') || norm.includes('بعد انتهاء الشخصي'))) {
    if (res.installmentAfterPersonal !== undefined && res.installmentAfterPersonal !== null && res.installmentAfterPersonal > 0) {
      return {
        response: `القسط الشهري بعد انتهاء التمويل الشخصي لدى **${res.bankName}** سينخفض إلى **${formatMoney(res.installmentAfterPersonal)}**.`
      };
    } else {
      return {
        response: `القسط الشهري بعد انتهاء التمويل الشخصي لدى **${res.bankName}**: هذه القيمة غير متاحة في النتيجة الحالية.`
      };
    }
  }

  // 3. Etizaz Amount (explicit)
  if (hasEtizaz) {
    if (res.etizazAmount > 0) {
      return {
        response: `مبلغ دعم اعتزاز المخصص للعسكريين في نتيجة **${res.bankName}** هو **${formatMoney(res.etizazAmount)}** مستقل عن الدعم السكني.`
      };
    } else {
      return {
        response: `دعم اعتزاز في نتيجة **${res.bankName}** يساوي صفر (إما غير مفعل لعدم تنشيط الخيار أو لعدم استيفاء الشروط).`
      };
    }
  }

  // 4. Support type or amount query
  // Support Type
  if (hasSupport && (norm.includes('نوع') || norm.includes('باقه') || norm.includes('باقة') || norm.includes('شهري ام') || norm.includes('شهري او'))) {
    if (res.supportType === 'monthly' && res.supportAmount > 0) {
      let msg = `نوع الدعم السكني المطبق في نتيجة **${res.bankName}** هو **دعم شهري ثابت** بقيمة **${formatMoney(res.supportAmount)}** شهريًا.`;
      if (res.etizazAmount > 0) {
        msg += `\n\nدعم اعتزاز الظاهر في النتيجة: **${formatMoney(res.etizazAmount)}** ريال.`;
      }
      return { response: msg };
    } else if (res.supportType === 'downpayment' && res.supportAmount > 0) {
      let msg = `نوع الدعم السكني المطبق في نتيجة **${res.bankName}** هو **باقة دعم الدفعة المقدمة** بقيمة **${formatMoney(res.supportAmount)}**.`;
      if (res.etizazAmount > 0) {
        msg += `\n\nدعم اعتزاز الظاهر في النتيجة: **${formatMoney(res.etizazAmount)}** ريال.`;
      }
      return { response: msg };
    } else {
      let msg = `نوع الدعم في نتيجة **${res.bankName}** غير محدد أو لا توجد باقة دعم سكني مطبقة حالياً.`;
      if (res.etizazAmount > 0) {
        msg += `\n\nدعم اعتزاز الظاهر في النتيجة: **${formatMoney(res.etizazAmount)}** ريال.`;
      }
      return { response: msg };
    }
  }

  // Support Amount
  if (hasSupport) {
    let responseText = "";
    if (res.supportAmount > 0) {
      if (res.supportType === 'monthly') {
        responseText = `مبلغ الدعم السكني الشهري في نتيجة **${res.bankName}** هو **${formatMoney(res.supportAmount)}** شهريًا.`;
      } else if (res.supportType === 'downpayment') {
        responseText = `مبلغ دعم الدفعة المقدمة في نتيجة **${res.bankName}** هو **${formatMoney(res.supportAmount)}**.`;
      } else {
        responseText = `نتيجة **${res.bankName}** محسوبة بدون دعم سكني.`;
      }
    } else {
      responseText = `نتيجة **${res.bankName}** محسوبة بدون دعم سكني.`;
    }

    if (res.etizazAmount > 0) {
      responseText += `\n\nدعم اعتزاز الظاهر في النتيجة: **${formatMoney(res.etizazAmount)}** ريال.`;
    }

    return { response: responseText };
  }

  // 5. Personal Finance capacity
  if (hasFinance && (norm.includes('شخصي') || norm.includes('الشخصي'))) {
    if (res.personalFinance > 0) {
      return {
        response: `مبلغ التمويل الشخصي المدمج في نتيجة **${res.bankName}** هو **${formatMoney(res.personalFinance)}**.`
      };
    } else {
      return {
        response: `لا يوجد تمويل شخصي مدمج في نتيجة **${res.bankName}** (التمويل عقاري فقط).`
      };
    }
  }

  // 6. Real Estate Finance capacity
  if (hasFinance && (norm.includes('عقاري') || norm.includes('عقار') || norm.includes('العقاري') || norm.includes('العقار'))) {
    return {
      response: `مبلغ التمويل العقاري لدى **${res.bankName}** هو **${formatMoney(res.realEstateFinance)}**.`
    };
  }

  // 7. General Finance capacity
  if (hasFinance) {
    return {
      response: `إجمالي التمويل المتاح لدى **${res.bankName}** هو **${formatMoney(res.totalFinance)}**.`
    };
  }

  // 8. Real Estate Installment only
  if (hasInstallment && (norm.includes('عقاري') || norm.includes('عقار') || norm.includes('العقاري') || norm.includes('العقار'))) {
    return {
      response: `القسط العقاري المخصص في نتيجة **${res.bankName}** هو **${formatMoney(res.realEstateInstallment)}**.`
    };
  }

  // 9. Personal Installment only
  if (hasInstallment && (norm.includes('شخصي') || norm.includes('الشخصي'))) {
    if (res.personalInstallment > 0) {
      return {
        response: `القسط الشخصي المخصص في نتيجة **${res.bankName}** هو **${formatMoney(res.personalInstallment)}**.`
      };
    } else {
      return {
        response: `لا ينطبق قسط مخصص للتمويل الشخصي في نتيجة **${res.bankName}**.`
      };
    }
  }

  // 10. General Installment
  if (hasInstallment) {
    return {
      response: `القسط الشهري المترتب لدى **${res.bankName}** هو **${formatMoney(res.monthlyInstallment)}**.`
    };
  }

  // 11. Term / Duration
  if (hasTerm) {
    const years = Math.floor(res.termMonths / 12);
    const months = res.termMonths % 12;
    let durationStr = '';
    if (years > 0 && months > 0) {
      durationStr = `${years} سنة و${months} أشهر`;
    } else if (years > 0) {
      durationStr = `${years} سنة`;
    } else {
      durationStr = `${months} أشهر`;
    }
    return {
      response: `مدة التمويل لدى **${res.bankName}** هي **${durationStr}** (ما يعادل **${res.termMonths} شهراً**).`
    };
  }

  // 12. Annual Margin
  if (hasMargin) {
    return {
      response: `هامش الربح السنوي المطبق لدى **${res.bankName}** هو **${formatSafePercent(res.annualMargin)}**.`
    };
  }

  // 13. DSR Percentage
  if (hasDsr) {
    return {
      response: `نسبة الاستقطاع المالي (DSR) المحسوبة لدى **${res.bankName}** هي **${formatSafePercent(res.dsrPercentage)}**.`
    };
  }

  // Fallback for that bank
  const y = Math.floor(res.termMonths / 12);
  const m = res.termMonths % 12;
  const termStr = y > 0 && m > 0 ? `${y} سنة و${m} أشهر` : (y > 0 ? `${y} سنة` : `${m} أشهر`);
  return {
    response: `إليك بطاقة نتيجة **${res.bankName}** الحالية المتوفرة:\n\n` +
      `• تمويل كلي متاح: **${formatMoney(res.totalFinance)}**\n` +
      `• قسط شهري: **${formatMoney(res.monthlyInstallment)}**\n` +
      `• مدة التمويل: **${termStr}**\n` +
      `• هامش الربح: **${formatSafePercent(res.annualMargin)}**\n` +
      `• الدعم السكني: **${formatMoney(res.supportAmount)}** (باقة: ${res.supportType === 'monthly' ? 'شهري ثابت' : res.supportType === 'downpayment' ? 'دفعة مقدمة' : 'بدون دعم'})`
  };
}

function handleComparisonQuery(activeResults: AssistantVisibleResult[], norm: string): { response: string } {
  const formatMoney = (val: number) => {
    return Math.round(val).toLocaleString('ar-SA') + " ريال";
  };

  const eligibleBanks = activeResults.filter(r => r.eligible);

  // Requirement 6: "عند عدم وجود أي بنك مؤهل: لا تعرض أعلى تمويل أو أقل قسط. قل: لا توجد نتائج مؤهلة حاليًا لإجراء هذه المقارنة."
  if (eligibleBanks.length === 0) {
    return {
      response: "لا توجد نتائج مؤهلة حاليًا لإجراء هذه المقارنة."
    };
  }

  const pool = eligibleBanks;

  // 1. Walkthrough / Explanation of Results
  if (norm.includes('اشرح نتيجتي') || norm.includes('اشرح النتائج') || norm.includes('شرح نتائج') || norm.includes('تفاصيل نتيجتي') || norm.includes('شرح نتيجتي')) {
    const lines = eligibleBanks.map(r => {
      const y = Math.floor(r.termMonths / 12);
      const m = r.termMonths % 12;
      const termStr = y > 0 && m > 0 ? `${y} سنة و${m} أشهر` : (y > 0 ? `${y} سنة` : `${m} أشهر`);
      return `* **${r.bankName}**: تمويل بقيمة **${formatMoney(r.totalFinance)}** بقسط شهري **${formatMoney(r.monthlyInstallment)}** لمدة **${termStr}** (هامش ${formatSafePercent(r.annualMargin)}).`;
    });

    const highest = [...pool].sort((a, b) => b.totalFinance - a.totalFinance)[0];
    const lowestInst = [...pool].sort((a, b) => a.monthlyInstallment - b.monthlyInstallment)[0];

    return {
      response: `أهلاً بك! لقد قمت بقراءة نتائج الحسبة الحالية لك، وإليك تفصيلاً مقارناً للبنوك المؤهل لديها:\n\n` +
        `${lines.join('\n')}\n\n` +
        `💡 **توصيات سريعة لمساعدتك في القرار**:\n` +
        `- **أعلى تمويل متاح**: حصلت عليه لدى **${highest.bankName}** بمبلغ قدره **${formatMoney(highest.totalFinance)}**.\n` +
        `- **أقل قسط شهري (التزام)**: تم احتسابه لدى **${lowestInst.bankName}** بقيمة **${formatMoney(lowestInst.monthlyInstallment)}**.\n\n` +
        `يسعدني اختيار أي جهة أو طرح أي استفسار آخر تريده!`
    };
  }

  // 2. Highest Finance
  if (norm.includes('اعلي تمويل') || norm.includes('اعلى تمويل') || norm.includes('اكبر تمويل') || norm.includes('افضل تمويل') || norm.includes('تمويلا') || norm.includes('تمويلاً')) {
    const sorted = [...pool].sort((a, b) => b.totalFinance - a.totalFinance);
    const best = sorted[0];
    return {
      response: `أعلى تمويل في نتائجك هو لدى **${best.bankName}** بمبلغ **${formatMoney(best.totalFinance)}**.`
    };
  }

  // 3. Lowest Installment
  if (norm.includes('اقل قسط') || norm.includes('أقل قسط') || norm.includes('ادني قسط') || norm.includes('ادنى قسط') || norm.includes('قسطه اقل') || norm.includes('قسطه أقل') || norm.includes('قسطا') || norm.includes('قسطاً')) {
    const sorted = [...pool].sort((a, b) => a.monthlyInstallment - b.monthlyInstallment);
    const best = sorted[0];
    return {
      response: `أقل قسط شهري في نتائجك هو لدى **${best.bankName}** بقيمة **${formatMoney(best.monthlyInstallment)}**.`
    };
  }

  // 4. Lowest Margin
  if (norm.includes('اقل هامش') || norm.includes('أقل هامش') || norm.includes('افضل هامش') || norm.includes('أفضل هامش') || norm.includes('افضل نسبة') || norm.includes('افضل نسبه') || norm.includes('هامشه اقل') || norm.includes('هامشه أقل')) {
    const sorted = [...pool].sort((a, b) => a.annualMargin - b.annualMargin);
    const best = sorted[0];
    return {
      response: `الجهة التمويلية صاحبة هامش الربح الأقل في نتائجك هي **${best.bankName}** بهامش يبلغ **${formatSafePercent(best.annualMargin)}**.`
    };
  }

  // 5. Longest Term
  if (norm.includes('اطول مدة') || norm.includes('اطول مده') || norm.includes('أطول مدة') || norm.includes('اطول سنوات')) {
    const sorted = [...pool].sort((a, b) => b.termMonths - a.termMonths);
    const best = sorted[0];
    const y = Math.floor(best.termMonths / 12);
    const m = best.termMonths % 12;
    const termStr = y > 0 && m > 0 ? `${y} سنة و${m} أشهر` : (y > 0 ? `${y} سنة` : `${m} أشهر`);
    return {
      response: `أطول مدة تمويل متوفرة في نتائجك الحالية هي لدى **${best.bankName}** بمدة تبلغ **${termStr}** (ما يعادل **${best.termMonths} شهراً**).`
    };
  }

  return {
    response: "أنا مساعدك التمويلي الذكي. لقد قمت بقراءة نتائجك الحالية لمساعدتك في فهم مفاصل الحسبة المقارنة."
  };
}

export function tryAnswerResultInquiry(
  messageText: string,
  rawResults: any[] | null | undefined,
  originalMessageText: string
): { response: string; richContent?: any } | null {
  const norm = normalizeArabic(messageText);

  // 1. Identify if this is a global comparison/summary query
  const isComparisonQuery = 
    norm.includes('اعلي تمويل') || norm.includes('اعلى تمويل') || norm.includes('اكبر تمويل') || norm.includes('افضل تمويل') || norm.includes('تمويلا') || norm.includes('تمويلاً') ||
    norm.includes('اقل قسط') || norm.includes('أقل قسط') || norm.includes('ادني قسط') || norm.includes('ادنى قسط') || norm.includes('القسط الاقل') || norm.includes('قسطه اقل') || norm.includes('قسطه أقل') || norm.includes('قسطا') || norm.includes('قسطاً') ||
    norm.includes('اقل هامش') || norm.includes('أقل هامش') || norm.includes('افضل هامش') || norm.includes('أفضل هامش') || norm.includes('افضل نسبة') || norm.includes('افضل نسبه') || norm.includes('هامشه اقل') || norm.includes('هامشه أقل') ||
    norm.includes('اطول مدة') || norm.includes('اطول مده') || norm.includes('أطول مدة') || norm.includes('اطول سنوات') ||
    norm.includes('اشرح نتيجتي') || norm.includes('اشرح النتائج') || norm.includes('شرح نتائج') || norm.includes('تفاصيل نتيجتي') || norm.includes('شرح نتيجتي');

  // Expanded isValueSeeking as requested
  const isValueSeeking = 
    norm.includes('كم') || 
    norm.includes('ماهو') || 
    norm.includes('ما هو') || 
    norm.includes('ماهي') || 
    norm.includes('ما هي') || 
    norm.includes('وش') || 
    norm.includes('ايش') || 
    norm.includes('أعطني') || 
    norm.includes('اعطني') || 
    norm.includes('اعطنى') ||
    norm.includes('مبلغ') ||
    norm.includes('قيمة') ||
    norm.includes('قيمه') ||
    norm.includes('قدر') ||
    norm.includes('ابي اعرف') ||
    norm.includes('أبي اعرف');

  const hasResultNoun = 
    norm.includes('قسط') || 
    norm.includes('القسط') || 
    norm.includes('تمويل') || 
    norm.includes('التمويل') || 
    norm.includes('دعم') || 
    norm.includes('الدعم') || 
    norm.includes('هامش') || 
    norm.includes('الهامش') || 
    norm.includes('فائدة') || 
    norm.includes('فائده') || 
    norm.includes('نسبة') || 
    norm.includes('نسبه') || 
    norm.includes('مدة') || 
    norm.includes('مده') || 
    norm.includes('شهر') || 
    norm.includes('سنوات') || 
    norm.includes('سنه') || 
    norm.includes('سنة') ||
    norm.includes('استقطاع') ||
    norm.includes('الاستقطاع') ||
    norm.includes('dsr');

  const isAmtQuery = isValueSeeking && hasResultNoun;
  const isRejectionQuery = (norm.includes('لماذا') || norm.includes('ليه') || norm.includes('ليش') || norm.includes('سبب')) && (norm.includes('رفض') || norm.includes('الرفض') || norm.includes('لم اقبل') || norm.includes('ما قبلني') || norm.includes('عدم الاهلية') || norm.includes('عدم الاهليه') || norm.includes('عدم القبول'));
  const isGeneralExplain = norm.includes('معنى') || norm.includes('معني') || norm.includes('مفهوم') || norm.includes('تعريف') || norm.includes('الفرق') || norm.includes('كيف يعمل') || norm.includes('كيف يتم') || norm.includes('ما الفرق') || norm.includes('كيف تؤثر') || norm.includes('كيف توثر');

  const hasSupportAndBank = (norm.includes('دعم') || norm.includes('الدعم')) && detectBankName(norm) !== null;
  const hasResultNounAndBank = hasResultNoun && detectBankName(norm) !== null;
  const hasBankWithActiveResults = detectBankName(norm) !== null;

  const isBankSpecificQuery = (isAmtQuery || isRejectionQuery || hasSupportAndBank || hasResultNounAndBank || hasBankWithActiveResults) && !isGeneralExplain;

  if (!isComparisonQuery && !isBankSpecificQuery) {
    return null; // Let it fall through to KB Questions!
  }

  // 2. Map raw results to AssistantVisibleResult
  const activeResults = mapToAssistantVisibleResults(rawResults);

  // 3. If there are no current results:
  if (activeResults.length === 0) {
    const isNumberRequest = norm.includes('كم') || norm.includes('مبلغ') || norm.includes('قيمة') || norm.includes('قيمه') || norm.includes('قد ايش') || norm.includes('نسبه') || norm.includes('نسبة') || norm.includes('دعم') || norm.includes('قسط') || norm.includes('تمويل');

    if (isGeneralExplain && !isNumberRequest) {
      return null; // Let it fall through to KNOWLEDGE_BASE!
    }

    if (isNumberRequest) {
      return {
        response: "لا أستطيع تحديد المبلغ بدون إجراء حسبة أو وجود نتيجة حالية."
      };
    }

    return {
      response: "لا توجد نتيجة حسبة حالية لمساعدتك في فهمها. يمكنك البدء بإدخال بياناتك لحساب تمويلك."
    };
  }

  // 4. Try to identify a specific bank in the query
  const bankId = detectBankName(norm);

  if (bankId) {
    const res = activeResults.find(r => r.bankId === bankId);
    if (!res) {
      const arabName = bankArName(bankId);
      return {
        response: `عذراً، الجهة التمويلية (${arabName}) ليست من ضمن نتائج حساباتك الحالية المتوفرة.`
      };
    }
    return answerForBank(res, norm);
  }

  // No specific bank is named.
  // 5. Check if it's a global comparison question
  if (isComparisonQuery) {
    return handleComparisonQuery(activeResults, norm);
  }

  // 6. It's a bank-specific question, but no bank was specified.
  if (activeResults.length === 1) {
    return answerForBank(activeResults[0], norm);
  }

  // Rule: If there are multiple banks, ask "أي بنك تقصد؟" and provide buttons.
  return {
    response: "أي بنك تقصد؟",
    richContent: {
      type: 'buttons',
      buttons: activeResults.map(r => ({
        id: `ask_${r.bankId}`,
        label: r.bankName,
        action: `${originalMessageText} لدى ${r.bankName}`
      }))
    }
  };
}

/**
 * Convert Arabic/Hindi digits (٠١٢٣٤٥٦٧٨٩) to standard English/Latin digits (0123456789)
 */
function convertArabicDigits(str: string): string {
  const hindiNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = str || '';
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(hindiNums[i], 'g'), englishNums[i]);
  }
  return result;
}

/**
 * Standardizes Arabic numbers, removing commas and normalizing 'الف' text multipliers (e.g. 12 الف -> 12000)
 */
function normalizeNumbersInArabicText(text: string): string {
  let res = convertArabicDigits(text);
  
  // Remove commas (like 12,500 or ١٢،٥٠٠) inside digits to compile complete number values
  res = res.replace(/(\d)[,،](\d)/g, '$1$2');

  // Convert "ألف" or "الف" following numbers to proper multipliers
  res = res.replace(/(\d+(?:\.\d+)?)\s*(?:الف|ألف)/g, (match, p1) => {
    const val = parseFloat(p1);
    return Math.round(val * 1000).toString();
  });
  
  return res;
}

/**
 * Extracts values from an Arabic sentence using regular expressions and keywords
 */
export function parseFieldsFromMessage(text: string, currentInputs: AssistantCalculationInput): AssistantCalculationInput {
  const normalizedText = normalizeNumbersInArabicText(text);
  const norm = normalizeArabic(normalizedText);
  const updated = { ...currentInputs };

  // 1. Sector parsing
  if (norm.includes('عسكري') || norm.includes('جيش') || norm.includes('وزاره الدفاع') || norm.includes('وزارة الدفاع') || norm.includes('داخليه') || norm.includes('داخلية') || norm.includes('امن') || norm.includes('أمن')) {
    updated.sectorId = 'military';
  } else if (norm.includes('متقاعد') || norm.includes('تقاعد')) {
    updated.sectorId = 'retired';
  } else if (norm.includes('مدني') || norm.includes('حكومي') || norm.includes('وزاره') || norm.includes('وزارة') || norm.includes('شبه حكومي') || norm.includes('هيئه') || norm.includes('هيئة')) {
    updated.sectorId = 'gov_civil';
  } else if (norm.includes('خاص') || norm.includes('اهلي') || norm.includes('أهلي') || norm.includes('غير معتمد') || norm.includes('شركات') || norm.includes('سابك') || norm.includes('ارامكو') || norm.includes('شركه') || norm.includes('شركة')) {
    updated.sectorId = 'companies';
  }

  // 2. Military Ranks and subtype
  const ranksList = [
    { id: 'jundi', keywords: ['جندي', 'جندى'], scope: 'military_individual' },
    { id: 'areef', keywords: ['عريف'], scope: 'military_individual' },
    { id: 'wakeel_raqeeb', keywords: ['وكيل رقيب', 'وكيل'], scope: 'military_individual' },
    { id: 'raqeeb', keywords: ['رقيب'], scope: 'military_individual' },
    { id: 'rayees_ruqaba', keywords: ['رئيس رقباء', 'رئيس'], scope: 'military_individual' },
    { id: 'mulazim', keywords: ['ملازم'], scope: 'military_officer' },
    { id: 'naqeeb', keywords: ['نقيب'], scope: 'military_officer' },
    { id: 'raid', keywords: ['رائد'], scope: 'military_officer' },
    { id: 'muqaddam', keywords: ['مقدم'], scope: 'military_officer' },
    { id: 'aqeed', keywords: ['عقيد'], scope: 'military_officer' },
    { id: 'ameed', keywords: ['عميد'], scope: 'military_officer' },
    { id: 'liwa', keywords: ['لواء'], scope: 'military_officer' }
  ];

  for (const rank of ranksList) {
    if (rank.keywords.some(kw => norm.includes(kw))) {
      updated.rankId = rank.id;
      updated.sectorId = 'military';
      updated.militarySubType = rank.scope as 'military_officer' | 'military_individual';
      break;
    }
  }

  // 3. Calendar types
  if (norm.includes('هجري') || norm.includes('الهجري')) {
    updated.birthCalendar = 'hijri';
    updated.appointmentCalendar = 'hijri';
  } else if (norm.includes('ميلادي') || norm.includes('الميلادي')) {
    updated.birthCalendar = 'gregorian';
    updated.appointmentCalendar = 'gregorian';
  }

  // 4. Extract Salaries (صافي, راتب, رواتب, الصافي)
  const salaryRegexes = [
    /(?:راتب|الراتب|صافي|الصافي|الاساسي|الدخل|دخل|رواتبي|راتبي|استلم|رواتب)\s*(?:هو|يبغ|يساوي|=|\:|بقيمه|بقيمة)?\s*(\d{4,6})/g,
    /(\d{4,6})\s*(?:ريال)\s*(?:صافي|راتب)/g,
    /(?:صافي|الصافي)\s*(?:راتبي|الراتب|الدخل)?\s*(?:هو|يبلغ|يبغ|يساوي|=|\:)?\s*(\d{4,6})/g
  ];

  let extractedSalaries: number[] = [];
  for (const reg of salaryRegexes) {
    let match;
    while ((match = reg.exec(norm)) !== null) {
      const parsedVal = parseInt(match[1], 10);
      if (parsedVal >= 2000 && parsedVal <= 250000) {
        extractedSalaries.push(parsedVal);
      }
    }
  }

  if (extractedSalaries.length > 0) {
    updated.directNetSalary = extractedSalaries[0];
    updated.salaryMode = 'direct';
  }

  // 5. Extract Obligations (التزام, قسط, ديون, قرض, قائم)
  const obligationRegexes = [
    /(?:التزام|التزامات|التزاماتي|قسط|قسطي|اقساط|اقساطي|سمه|قرض|ديون|قروض|قائم)\s*(?:هو|يبلغ|شهري|عقد|=|\:)?\s*(\d{1,5})/g,
    /(\d{1,5})\s*(?:ريال)?\s*(?:التزام|قسط|قرض)/g
  ];

  let extractedObligations: number[] = [];
  for (const reg of obligationRegexes) {
    let matchOb;
    while ((matchOb = reg.exec(norm)) !== null) {
      const val = parseInt(matchOb[1], 10);
      if (val >= 0 && val < 50000 && val !== updated.directNetSalary) {
        extractedObligations.push(val);
      }
    }
  }

  if (extractedObligations.length > 0) {
    updated.obligations = extractedObligations[0];
  }

  // 6. Dates (birth/appointment)
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})|(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g;
  const foundDates: { day: number; month: number; year: number }[] = [];
  let matchDate;
  while ((matchDate = dateRegex.exec(norm)) !== null) {
    if (matchDate[3]) {
      foundDates.push({
        day: parseInt(matchDate[1], 10),
        month: parseInt(matchDate[2], 10),
        year: parseInt(matchDate[3], 10)
      });
    } else if (matchDate[4]) {
      foundDates.push({
        day: parseInt(matchDate[6], 10),
        month: parseInt(matchDate[5], 10),
        year: parseInt(matchDate[4], 10)
      });
    }
  }

  if (foundDates.length > 0) {
    foundDates.sort((a, b) => a.year - b.year);
    if (foundDates.length === 1) {
      const year = foundDates[0].year;
      if (year < 2012 || year < 1433) {
        updated.birthYear = year;
        updated.birthMonth = foundDates[0].month;
        updated.birthDay = foundDates[0].day;
      } else {
        updated.appointmentYear = year;
        updated.appointmentMonth = foundDates[0].month;
        updated.appointmentDay = foundDates[0].day;
      }
    } else {
      updated.birthYear = foundDates[0].year;
      updated.birthMonth = foundDates[0].month;
      updated.birthDay = foundDates[0].day;

      updated.appointmentYear = foundDates[1].year;
      updated.appointmentMonth = foundDates[1].month;
      updated.appointmentDay = foundDates[1].day;
    }
  }

  // 6b. Age extraction: "عمري 33" -> birthYear = 2026 - 33 = 1993
  const ageRegex = /(?:عمري|عمر|السن|سني)\s*(?:هو|يبلغ|يبغ|بحدود)?\s*(\d{2})/g;
  let matchAge = ageRegex.exec(norm);
  if (matchAge && !updated.birthYear) {
    const age = parseInt(matchAge[1], 10);
    if (age >= 18 && age <= 85) {
      updated.birthYear = 2026 - age;
      updated.birthMonth = 1;
      updated.birthDay = 1;
    }
  }

  // 6c. Employment Year extraction: "توظفت عام 2017" or "تعينت سنة 2015"
  const recruitmentRegex = /(?:توظفت|تعينت|التعيين|تعييني|توظيفي|الخدمه|الخدمة|الخدمه|باشرت)\s*(?:عام|سنه|سنة|في)?\s*(\d{4})/g;
  let matchRecruit = recruitmentRegex.exec(norm);
  if (matchRecruit && !updated.appointmentYear) {
    const rYear = parseInt(matchRecruit[1], 10);
    if (rYear > 1350 && rYear < 2028) {
      updated.appointmentYear = rYear;
      updated.appointmentMonth = 1;
      updated.appointmentDay = 1;
    }
  }

  // 6d. Service duration extraction: "خدمتي 10 سنوات" or "مدة الخدمة 10 سنين"
  const serviceRegex = /(?:خدمه|خدمتي|الخدمة|الخدمه)\s*(\d{1,2})\s*(?:سنه|سنة|اعوام|سنوات|سنين)/g;
  let matchService = serviceRegex.exec(norm);
  if (matchService && !updated.appointmentYear) {
    const sYears = parseInt(matchService[1], 10);
    if (sYears > 0 && sYears < 50) {
      updated.appointmentYear = 2026 - sYears;
      updated.appointmentMonth = 1;
      updated.appointmentDay = 1;
    }
  }

  // Adjust dates calendars
  if (updated.birthYear) {
    if (updated.birthYear > 1350 && updated.birthYear < 1450) {
      updated.birthCalendar = 'hijri';
    } else if (updated.birthYear > 1940 && updated.birthYear < 2015) {
      updated.birthCalendar = 'gregorian';
    }
  }
  if (updated.appointmentYear) {
    if (updated.appointmentYear > 1350 && updated.appointmentYear < 1450) {
      updated.appointmentCalendar = 'hijri';
    } else if (updated.appointmentYear > 1940 && updated.appointmentYear < 2030) {
      updated.appointmentCalendar = 'gregorian';
    }
  }

  // 7. Support types parsing
  if (norm.includes('دعم شهري') || norm.includes('شهري') || norm.includes('الدعم الشهري')) {
    updated.supportType = 'monthly';
  } else if (norm.includes('باقه') || norm.includes('دفعه') || norm.includes('مسبق') || norm.includes('دفعه مسبقه') || norm.includes('دفعة مسبقة') || norm.includes('باقة') || norm.includes('150 الف') || norm.includes('100 الف')) {
    updated.supportType = 'downpayment';
  } else if (norm.includes('بدون دعم') || norm.includes('غير مستحق') || norm.includes('لا استحق') || norm.includes('بدون') || norm.includes('غياب الدعم')) {
    updated.supportType = 'none';
  }

  // 8. Product types
  if (norm.includes('شخصي فقط') || norm.includes('تمويل شخصي فقط') || (norm.includes('شخصي') && !norm.includes('عقاري'))) {
    updated.productId = 'personal_only';
  } else if (norm.includes('عقاري فقط') || norm.includes('عقار مالي فقط') || (norm.includes('عقاري') && !norm.includes('شخصي')) || norm.includes('بيت') || norm.includes('شراء عقار')) {
    updated.productId = 'real_estate_only';
  } else if (norm.includes('عقاري وشخصي') || norm.includes('تمويلين') || norm.includes('دمج') || norm.includes('مدمج') || norm.includes('الشخصي المدمج') || norm.includes('مع الشخصي')) {
    updated.productId = 'real_estate_with_new_personal';
  }

  // 9. Back context fallback of context numbers
  // Parse any free numbers of salary and obligation that weren't captured by explicit regexes
  const allNums = norm.match(/\b\d+\b/g);
  if (allNums) {
    const cleanNumbers = allNums.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    // Let's identify unused numbers
    for (const num of cleanNumbers) {
      // If it's a valid year or age, skip or use
      if (num > 1350 && num < 2028) continue;
      if (num > 18 && num <= 85 && (norm.includes('عمر') || norm.includes('سني'))) continue;

      if (num >= 2000 && num <= 250000) {
        if (!updated.directNetSalary) {
          updated.directNetSalary = num;
          updated.salaryMode = 'direct';
        }
      } else if (num > 0 && num < 30000) {
        if (updated.directNetSalary && updated.directNetSalary !== num && !updated.obligations) {
          updated.obligations = num;
        }
      }
    }
  }

  // 10. Bank preference
  const bankSearchMap: { [key: string]: string } = {
    alahli: 'alahli', ahli: 'alahli', اهلي: 'alahli', الأهلي: 'alahli',
    rajhi: 'rajhi', راجحي: 'rajhi', الراجحي: 'rajhi',
    alinma: 'alinma', انماء: 'alinma', الإنماء: 'alinma',
    fransi: 'fransi', فرنسي: 'fransi', الفرنسي: 'fransi',
    bidaya: 'bidaya', بداية: 'bidaya', البداية: 'bidaya',
    albilad: 'albilad', بلاد: 'albilad', البلاد: 'albilad',
    alarabi: 'alarabi', عربي: 'alarabi', العربي: 'alarabi'
  };

  for (const key of Object.keys(bankSearchMap)) {
    if (norm.includes(key)) {
      updated.selectedBankId = bankSearchMap[key];
      break;
    }
  }

  return updated;
}

/**
 * Main State transition engine that responds to users, handles guards, parses data, and does the calculation adapter.
 */
export function handleAssistantTurn(
  messageText: string,
  state: AssistantState,
  context: any
): { response: string; newState: AssistantState; richContent?: any } {
  
  const norm = normalizeArabic(messageText);

  // 1. طلبات كشف النظام والقواعد والمعادلات (First Priority)
  if (
    norm.includes('قواعد الاستقطاع') || 
    norm.includes('القواعد الداخلية') || 
    norm.includes('قوانين البنك') || 
    norm.includes('قوانين الاستقطاع') || 
    norm.includes('كشف النظام') ||
    norm.includes('معادلات البنك') ||
    norm.includes('معادلة البنك') ||
    norm.includes('إعدادات النظام') ||
    norm.includes('عدادات النظام') ||
    norm.includes('سورس كود') ||
    norm.includes('كود المشروع') ||
    norm.includes('تفاصيل النظام الداخلية')
  ) {
    return {
      response: "لا أستطيع عرض القواعد أو الإعدادات الداخلية للنظام، لكن يمكنني شرح نسبة الاستقطاع الظاهرة في نتيجتك ومعناها.",
      newState: state
    };
  }

  // Check standard Security Guard
  const guardResult = checkAssistantGuard(messageText);
  if (guardResult.isBlocked) {
    return {
      response: "لا أستطيع عرض القواعد أو الإعدادات الداخلية للنظام، لكن يمكنني شرح نسبة الاستقطاع الظاهرة في نتيجتك ومعناها.",
      newState: state
    };
  }

  // 2, 3 & 4. Check for Knowledge base or Result inquiry with prioritisation
  if (state.conversationMode !== 'collecting_data' && state.conversationMode !== 'ready_to_calculate') {
    let queriedText = messageText;
    let hasPending = false;
    if (state.pendingResultQuestion) {
      const bankId = detectBankName(norm);
      if (bankId) {
        queriedText = `${state.pendingResultQuestion} لدى ${messageText}`;
        hasPending = true;
      }
    }

    const isPotentialResultQuery = 
      norm.includes('كم') || 
      norm.includes('مبلغ') || 
      norm.includes('قيمة') || 
      norm.includes('قيمه') || 
      norm.includes('الدعم') || 
      norm.includes('دعم') || 
      norm.includes('الاستقطاع') || 
      norm.includes('القسط') || 
      norm.includes('التمويل') || 
      norm.includes('الهامش') || 
      norm.includes('المدة') || 
      norm.includes('مدة') || 
      norm.includes('مده') || 
      norm.includes('رفضني') || 
      norm.includes('سبب الرفض') ||
      !!state.pendingResultQuestion ||
      (detectBankName(norm) !== null && state.conversationMode === 'showing_results');

    if (isPotentialResultQuery) {
      // Prioritise tryAnswerResultInquiry
      const resultInquiry = tryAnswerResultInquiry(queriedText, context?.results, queriedText);
      if (resultInquiry) {
        const isAnyBankAsk = resultInquiry.response === "أي بنك تقصد؟";
        return {
          response: resultInquiry.response,
          newState: {
            ...state,
            conversationMode: 'explaining',
            pendingResultQuestion: isAnyBankAsk ? (hasPending ? state.pendingResultQuestion : messageText) : undefined
          },
          richContent: resultInquiry.richContent
        };
      }

      // Fallback to Knowledge Base
      const kbResponse = searchKnowledgeBase(messageText);
      if (kbResponse) {
        return {
          response: kbResponse,
          newState: {
            ...state,
            conversationMode: 'explaining',
            pendingResultQuestion: undefined
          }
        };
      }
    } else {
      // Prioritise Knowledge Base
      const kbResponse = searchKnowledgeBase(messageText);
      if (kbResponse) {
        return {
          response: kbResponse,
          newState: {
            ...state,
            conversationMode: 'explaining',
            pendingResultQuestion: undefined
          }
        };
      }

      // Fallback to Result Inquiry
      const resultInquiry = tryAnswerResultInquiry(queriedText, context?.results, queriedText);
      if (resultInquiry) {
        const isAnyBankAsk = resultInquiry.response === "أي بنك تقصد؟";
        return {
          response: resultInquiry.response,
          newState: {
            ...state,
            conversationMode: 'explaining',
            pendingResultQuestion: isAnyBankAsk ? (hasPending ? state.pendingResultQuestion : messageText) : undefined
          },
          richContent: resultInquiry.richContent
        };
      }
    }
  }

  // Helper to detect incomplete estimation queries
  const isEstimationInquiry = (msg: string): boolean => {
    const normalised = normalizeArabic(normalizeNumbersInArabicText(msg));
    
    // Explicit starting requests should always override estimation inquiries
    const isExplicitStart = 
      normalised.includes('ابدأ حسبة') || 
      normalised.includes('ابدء حسبه') || 
      normalised.includes('بدء الحسبة') || 
      normalised.includes('بدء حسبة') || 
      normalised.includes('خلنا نحسب') || 
      normalised.includes('أبغى أحسب') || 
      normalised.includes('أبى أحسب') || 
      normalised.includes('ابي احسب') || 
      normalised.includes('ابغى احسب') || 
      normalised.includes('اريد ان احسب') ||
      normalised.includes('احسب تمويلي') ||
      normalised.includes('احسب لي') ||
      normalised.includes('كيف احسب') ||
      normalised.includes('طريقة الحسبة');

    if (isExplicitStart) {
      return false;
    }

    const keywords = [
      'كم يعطوني', 'كم يعطيني', 'كم اطلع', 'كم أطلع', 'كم اقدر', 'كم أقدر',
      'كم استحق', 'كم أستحق', 'كم المسموح', 'كم مسموح', 'كم يطلع', 'كم التمويل',
      'كم القرض', 'كم الحد', 'كم يعطي', 'إذا راتبي', 'اذا راتبي', 'لو راتبي',
      'الراجحي كم', 'كم الراجحي'
    ];

    const hasKeywords = keywords.some(kw => normalised.includes(kw));
    const hasSalaryWithQuestion = normalised.includes('راتب') && (normalised.includes('كم') || normalised.includes('لو') || normalised.includes('اذا') || normalised.includes('إذا'));
    const hasSupportWithQuestion = normalised.includes('مدعوم') && (normalised.includes('كم') || normalised.includes('لو') || normalised.includes('اذا') || normalised.includes('إذا'));

    return hasKeywords || hasSalaryWithQuestion || hasSupportWithQuestion;
  };

  // If we are not currently collecting data or displaying results/whatsapp approval, check if the user is providing initiating data to start calculation
  if (state.conversationMode !== 'collecting_data' && state.conversationMode !== 'ready_to_calculate' && state.conversationMode !== 'showing_results' && state.conversationMode !== 'whatsapp_approval') {
    const parsed = parseFieldsFromMessage(messageText, state.inputs);
    
    // Check if it is classified as an incomplete estimation inquiry
    if (isEstimationInquiry(messageText)) {
      // 1. نوع التمويل (productId)
      if (!parsed.productId) {
        let resp = "أقدر أحسب لك، لكن الراتب وحده لا يكفي. أحتاج نوع التمويل والقطاع والعمر أو تاريخ الميلاد وتاريخ التعيين والالتزامات. نبدأ بنوع التمويل: عقاري، شخصي، أو عقاري مع شخصي؟";
        if (parsed.directNetSalary && parsed.supportType) {
          resp = "أقدر أحسبها لك، لكن الراتب والدعم وحدهم لا يكفون لتحديد مبلغ التمويل. أحتاج أولًا نوع التمويل المطلوب: عقاري، شخصي، أو عقاري مع شخصي؟";
        } else if (norm.includes('الراجحي') || norm.includes('البنك')) {
          resp = "أقدر أحسب التمويل المتاح لك لدى البنك بدقة، لكن أحتاج بعض البيانات أولاً. نبدأ بنوع التمويل المطلوب: عقاري، شخصي، أو عقاري مع شخصي؟";
          if (norm.includes('الراجحي')) {
            resp = "أقدر أحسب لك الراجحي لكن أحتاج بياناتك أولاً. نبدأ بنوع التمويل المطلوب: عقاري، شخصي، أو عقاري مع شخصي؟";
          }
        }
        return {
          response: resp,
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'productId'
          },
          richContent: {
            type: 'buttons',
            buttons: [
              { id: 'real_estate_only', label: '🏠 تمويل عقاري فقط', action: 'تمويل عقاري فقط' },
              { id: 'personal_only', label: '💼 تمويل شخصي فقط', action: 'تمويل شخصي فقط' },
              { id: 'real_estate_with_new_personal', label: '🔄 عقاري وشخصي مدمج', action: 'عقاري وشخصي مدمج' }
            ]
          }
        };
      }

      // 2. القطاع (sectorId)
      if (!parsed.sectorId) {
        const prodLabel = parsed.productId === 'personal_only' ? 'الشخصي' : 'العقاري';
        return {
          response: `أقدر أحسب لك التمويل ${prodLabel}، لكن الراتب وحده لا يكفي. أحتاج القطاع أولًا: حكومي، عسكري، خاص، شبه حكومي، أو متقاعد؟`,
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'sectorId'
          },
          richContent: {
            type: 'buttons',
            buttons: [
              { id: 'gov_civil', label: '💼 مدني حكومي', action: 'مدني حكومي' },
              { id: 'military', label: '🎖️ عسكري', action: 'عسكري' },
              { id: 'companies_private', label: '🏢 قطاع خاص', action: 'قطاع خاص' },
              { id: 'retired', label: '📅 متقاعد', action: 'متقاعد' }
            ]
          }
        };
      }

      // 3. الراتب (directNetSalary)
      if (!parsed.directNetSalary) {
        return {
          response: "أقدر أحسبها لك بدقة، لكن أحتاج معرفة صافي راتبك الشهري المستلم أولاً لتحديد المعايير المالية. كم يبلغ صافي راتبك؟",
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'directNetSalary'
          }
        };
      }

      // 4. الالتزامات (obligations)
      if (parsed.obligations === undefined) {
        return {
          response: "أدخلت بيانات هامة! للحساب بدقة، هل لديك أي قروض أو التزامات شهرية قائمة حالياً؟ (اكتب مبلغ القسط الشهري بالريال، أو اكتب لا يوجد).",
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'obligations'
          }
        };
      }

      // 5. العمر أو تاريخ الميلاد (birthYear)
      if (!parsed.birthYear) {
        return {
          response: "أحتاج تاريخ ميلادك الكامل (اليوم/الشهر/السنة) لنتمكن من معرفة مدة السداد المسموح بها حسب سن التقاعد لدى البنوك.",
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'birthYear'
          }
        };
      }

      // 6. تاريخ التعيين أو مدة الخدمة (appointmentYear)
      if (parsed.sectorId !== 'retired' && !parsed.appointmentYear) {
        return {
          response: "يرجى تزويدي بتاريخ التعيين أو مباشرة العمل باليوم والشهر والسنة بدقة لحساب مدة خدمتك لتفادي موانع التمويل المألوفة.",
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'appointmentYear'
          }
        };
      }

      // 7. الدعم (supportType)
      if (!parsed.supportType) {
        return {
          response: "بقي خطوة أخيرة؛ ما هو برنامج الدعم السكني الذي تفضله لإضافته وتأثيره على الحسبة؟",
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: 'supportType'
          },
          richContent: {
            type: 'buttons',
            buttons: [
              { id: 'monthly_support', label: '🏠 دعم شهري ثابت', action: 'دعم شهري ثابت' },
              { id: 'lump_sum_support', label: '💰 باقة دفعة مسبقة (100ألف/150ألف)', action: 'دعم دفعة مسبقة' },
              { id: 'no_support', label: '❌ بدون دعم سكني', action: 'بدون دعم' }
            ]
          }
        };
      }
    }

    // Did they provide any new fields? (Standard processing)
    const hasNewData = 
      parsed.sectorId !== undefined || 
      parsed.directNetSalary !== undefined || 
      parsed.birthYear !== undefined ||
      parsed.obligations !== undefined ||
      parsed.productId !== undefined ||
      parsed.appointmentYear !== undefined ||
      parsed.rankId !== undefined ||
      parsed.supportType !== undefined;
    if (hasNewData) {
      const missing = getMissingFields(parsed);
      if (missing.length === 0) {
        const validation = validateAssistantInput(parsed);
        if (validation.isValid) {
          const salaryText = (parsed.salaryMode === 'details')
            ? `الأساسي: ${parsed.basicSalary}، السكن: ${parsed.housingAllowance}`
            : `${parsed.directNetSalary?.toLocaleString('ar-SA')} ريال`;

          const summary = `**📋 مراجعة وتأكيد بيانات التمويل:**\n\n` +
            `• قطاع العمل: ${parsed.sectorId === 'military' ? `عسكري (${ranksListFindAr(parsed.rankId)})` : parsed.sectorId === 'gov_civil' ? 'مدني حكومي' : parsed.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}\n` +
            `• تاريخ الميلاد: ${parsed.birthDay}/${parsed.birthMonth}/${parsed.birthYear} (${parsed.birthCalendar === 'hijri' ? 'هجري' : 'ميلادي'})\n` +
            (parsed.sectorId !== 'retired' ? `• تاريخ التعيين: ${parsed.appointmentDay}/${parsed.appointmentMonth}/${parsed.appointmentYear}\n` : '') +
            `• صافي الدخل: ${salaryText}\n` +
            `• الالتزامات لسمة: ${(parsed.obligations ?? 0).toLocaleString('ar-SA')} ريال شهرياً\n` +
            `• برنامج الدعم: ${parsed.supportType === 'monthly' ? 'دعم شهري ثابت' : parsed.supportType === 'downpayment' ? 'دعم دفعة مسبقة' : 'بدون دعم'}\n\n` +
            `**هل ترغب في إجراء الحسبة وبدء مقارنة عروض البنوك بهذه البيانات؟**`;

          return {
            response: `أهلاً بك؛ قمت بتلقي البيانات التمويلية المدخلة وبدء الحسبة فوراً:\n\n${summary}`,
            newState: {
              ...state,
              inputs: parsed,
              conversationMode: 'ready_to_calculate',
              currentAskField: 'confirm_calc'
            },
            richContent: {
              type: 'data_summary',
              summaryData: parsed,
              buttons: [
                { id: 'calc_start', label: '🚀 نعم، قارن واحسب فوراً', action: 'نعم، ابدأ الحسبة' },
                { id: 'calc_edit', label: '✏️ تعديل الراتب والالتزامات', action: 'تعديل البيانات' }
              ]
            }
          };
        }
      } else {
        const firstMissing = missing[0];
        const promptObj = getPromptForMissingField(firstMissing, parsed);
        
        let parsedProgressText = "";
        if (parsed.sectorId) {
          parsedProgressText += `قطاع العمل: ${parsed.sectorId === 'military' ? 'عسكري' : parsed.sectorId === 'gov_civil' ? 'مدني حكومي' : parsed.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}. `;
        }
        if (parsed.directNetSalary) {
          parsedProgressText += `صافي الراتب: ${parsed.directNetSalary.toLocaleString('ar-SA')} ريال. `;
        }
        if (parsed.obligations !== undefined) {
          parsedProgressText += `الالتزامات: ${parsed.obligations.toLocaleString('ar-SA')} ريال. `;
        }
        if (parsed.productId) {
          parsedProgressText += `المنتج: ${parsed.productId === 'personal_only' ? 'تمويل شخصي فقط' : 'تمويل عقاري'}. `;
        }
        
        const responseWithProgress = `أهلاً بك! لقد استوعبت المدخلات التالية وبدأت حسبتك المالية بمساعد حسبة الذكي للتمويل:\n- **${parsedProgressText}**\n\n${promptObj.response}`;
        return {
          response: responseWithProgress,
          newState: {
            ...state,
            inputs: parsed,
            conversationMode: 'collecting_data',
            currentAskField: firstMissing
          },
          richContent: promptObj.richContent
        };
      }
    }
  }

  // 5. بدء الحسبة والتواصل (Fifth Priority)
  if (norm.includes('احسب تمويلي') || norm.includes('الحاسبه') || norm.includes('ابدء حسبه') || norm.includes('بدء الحسبة')) {
    const startedState: AssistantState = {
      ...INITIAL_ASSISTANT_STATE,
      conversationMode: 'collecting_data',
      currentAskField: 'sectorId'
    };
    return {
      response: "حسناً! سأقوم بمساعدتك خطوة بخطوة لجمع البيانات وإجراء الحسبة المالية الأكثر ملاءمة لك بدقة.\n\n**الخطوة الأولى:** ما هو قطاع عملك المعتمد حالياً؟\n- عسكري 🎖️\n- مدني حكومي 💼\n- قطاع خاص 🏢\n- شركات معتمدة (مثل أرامكو، سابك) 🏭\n- متقاعد 📅",
      newState: startedState,
      richContent: {
        type: 'buttons',
        buttons: [
          { id: 'gov_civil', label: '💼 مدني حكومي', action: 'مدني حكومي' },
          { id: 'military', label: '🎖️ عسكري', action: 'عسكري' },
          { id: 'companies_private', label: '🏢 قطاع خاص', action: 'قطاع خاص' },
          { id: 'retired', label: '📅 متقاعد', action: 'متقاعد' }
        ]
      }
    };
  }

  // 4. Action: WhatsApp Redirect triggered by user button click in results
  if (state.conversationMode === 'showing_results' && (norm.includes('اتصال') || norm.includes('موظف') || norm.includes('واتساب') || norm.startsWith('contact_'))) {
    const chosenBankId = norm.replace('contact_', '').trim();
    const chosenResult = state.results?.find(r => r.bankId === chosenBankId) || state.results?.[0];
    
    if (chosenResult) {
      const fullBank = context.banks.find((b: any) => b.id === chosenResult.bankId);
      const whatsNumber = fullBank?.employeeWhatsApp?.trim();

      if (!whatsNumber) {
        return {
          response: "لا يوجد رقم موظف متاح لهذا البنك حاليًا.",
          newState: state
        };
      }

      const summaryTextFormatted = `تفاصيل الحسبة المبدئية لحسبة العميل:\n` +
        `• جهة التمويل: ${chosenResult.bankName}\n` +
        `• قطاع العمل: ${state.inputs.sectorId === 'military' ? 'عسكري' : state.inputs.sectorId === 'gov_civil' ? 'مدني حكومي' : state.inputs.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}\n` +
        `• إجمالي التمويل المتاح: ${chosenResult.totalPurchasingPower.toLocaleString('ar-SA')} ريال\n` +
        `• القسط الشهري: ${chosenResult.monthlyInstallment.toLocaleString('ar-SA')} ريال\n` +
        `• مدة التمويل: ${chosenResult.termYears} سنة (${chosenResult.termMonths} شهر)\n` +
        `• دعم سكني: ${chosenResult.supportAmount.toLocaleString('ar-SA')} ريال (باقة: ${chosenResult.supportType === 'monthly' ? 'شهري ثابت' : chosenResult.supportType === 'downpayment' ? 'دفعة مسبقة' : 'بدون دعم'})`;

      return {
        response: `سأقوم بإنشاء رابط اتصال واتساب مباشر ومحمي لخدمة العملاء الخاصة بـ **${chosenResult.bankName}**.\n\nإليك ملخص البيانات التي سيتم إرسالها بموافقتك:\n\n${summaryTextFormatted}\n\nهل تؤكد رغبتك بالاتصال بالموظف الآن؟`,
        newState: {
          ...state,
          conversationMode: 'whatsapp_approval',
          currentAskField: 'whatsapp_confirm',
          selectedBankForContact: chosenResult
        },
        richContent: {
          type: 'whatsapp_approval',
          whatsappData: {
            bankId: chosenResult.bankId,
            bankName: chosenResult.bankName,
            whatsNumber,
            messageText: summaryTextFormatted
          },
          buttons: [
            { id: 'whats_send', label: '✅ نعم، افتح واتساب الآن', action: 'نعم، افتح واتساب الآن' },
            { id: 'whats_cancel', label: '❌ إلغاء واتصال جهة أخرى', action: 'إلغاء' }
          ]
        }
      };
    }
  }

  // WhatsApp confirm button click
  if (state.conversationMode === 'whatsapp_approval' && state.currentAskField === 'whatsapp_confirm') {
    if (norm.includes('نعم') || norm.includes('تاكيد') || norm.includes('ارسل') || norm.includes('افتتح') || norm.includes('whats_send')) {
      const chosenResult = state.selectedBankForContact;
      if (chosenResult) {
        const fullBank = context.banks.find((b: any) => b.id === chosenResult.bankId);
        const whatsNumber = fullBank?.employeeWhatsApp?.trim();

        if (!whatsNumber) {
          return {
            response: "لا يوجد رقم موظف متاح لهذا البنك حاليًا.",
            newState: { ...state, conversationMode: 'showing_results', currentAskField: 'confirm_calc' }
          };
        }
        
        const textToUrl = encodeURIComponent(`السلام عليكم، حسبة مالية من تطبيق حسبة:\n\n• جهة التمويل: ${chosenResult.bankName}\n• التمويل الإجمالي: ${chosenResult.totalPurchasingPower.toLocaleString('ar-SA')} ريال\n• القسط: ${chosenResult.monthlyInstallment.toLocaleString('ar-SA')} ريال\n• دعم: ${chosenResult.supportAmount.toLocaleString('ar-SA')} ريال`);
        const targetUrl = `https://api.whatsapp.com/send?phone=${whatsNumber.replace('+', '')}&text=${textToUrl}`;
        
        return {
          response: `تم إعداد الحزمة بنجاح! يمكنك النقر فوق الرابط المباشر أدناه لفتح المحادثة الآمنة مع منسق الخدمات:\n\n🔗 [انقر هنا لإرسال الحسبة بالواتساب](${targetUrl})`,
          newState: { ...state, conversationMode: 'showing_results', currentAskField: 'confirm_calc' }
        };
      }
    } else {
      return {
        response: "حسناً، تم إلغاء الاتصال. كيف يمكنني مساعدتك في تعديل خيارات التمويل أو الحسبة؟",
        newState: { ...state, conversationMode: 'showing_results', currentAskField: 'confirm_calc' }
      };
    }
  }

  // 5. Handling Scenario Modifications ("تعديل الحسبة", "احسب بدون دعم", "تغيير الراتب")
  if (state.conversationMode === 'showing_results' && (norm.includes('تعديل') || norm.includes('احسب بدون') || norm.includes('تغيير') || norm.includes('تغير') || norm.includes('بدون دعم') || norm.includes('بشخصي فقط') || norm.includes('عقاري فقط'))) {
    let textModifiedResponse = "";
    const updatedInputs = { ...state.inputs };

    if (norm.includes('بدون دعم') || norm.includes('احسب بدون دعم')) {
      updatedInputs.supportType = 'none';
      textModifiedResponse += "• تم خيار: إلغاء الدعم السكني.\n";
    } else if (norm.includes('دعم شهري')) {
      updatedInputs.supportType = 'monthly';
      textModifiedResponse += "• تم تعديل نوع الدعم إلى: دعم شهري ثابت.\n";
    } else if (norm.includes('دفعه مسبقه') || norm.includes('باقه دعم') || norm.includes('دفعة مسبقة')) {
      updatedInputs.supportType = 'downpayment';
      textModifiedResponse += "• تم تعديل نوع الدعم إلى: دعم الدفعة المسبقة.\n";
    }

    if (norm.includes('شخصي فقط')) {
      updatedInputs.productId = 'personal_only';
      textModifiedResponse += "• تم تعديل المنتج المطلوب إلى: التمويل الشخصي فقط.\n";
    } else if (norm.includes('عقاري فقط')) {
      updatedInputs.productId = 'real_estate_only';
      textModifiedResponse += "• تم تعديل المنتج المطلوب إلى: التمويل العقاري فقط.\n";
    } else if (norm.includes('عقاري وشخصي') || norm.includes('مدمج')) {
      updatedInputs.productId = 'real_estate_with_new_personal';
      textModifiedResponse += "• تم تعديل المنتج المطلوب إلى: التمويل العقاري والشخصي المدمج.\n";
    }

    const newSalaryCheck = parseFieldsFromMessage(messageText, updatedInputs);
    if (newSalaryCheck.directNetSalary !== state.inputs.directNetSalary) {
      updatedInputs.directNetSalary = newSalaryCheck.directNetSalary;
      textModifiedResponse += `• تم تحديث صافي الراتب إلى: ${updatedInputs.directNetSalary?.toLocaleString('ar-SA')} ريال.\n`;
    }

    if (newSalaryCheck.obligations !== state.inputs.obligations) {
      updatedInputs.obligations = newSalaryCheck.obligations;
      textModifiedResponse += `• تم تحديث الالتزامات الشهرية إلى: ${updatedInputs.obligations?.toLocaleString('ar-SA')} ريال.\n`;
    }

    if (textModifiedResponse) {
      const validation = validateAssistantInput(updatedInputs);
      if (validation.isValid) {
        const computationOutput = runAssistantCalculation(updatedInputs, context);
        return {
          response: `رائع! قمت بتعديل سيناريو الحسبة بناءً على طلبك:\n${textModifiedResponse}\nإليك عروض التمويل المحدثة المستخرجة مباشرة من محرك الحسبة المعتمدة:`,
          newState: {
            ...state,
            conversationMode: 'showing_results',
            inputs: updatedInputs,
            results: computationOutput
          },
          richContent: {
            type: 'results', 
            results: computationOutput
          }
        };
      } else {
        return {
          response: `تعذر تحديث الحسبة للموانع الائتمانية المنطقية التالية:\n${validation.errors.join('\n')}\nكيف تريد تعديل مدخلاتك الحالية؟`,
          newState: state
        };
      }
    }
  }

  // 6. Stateful Gradual Data Collection (Step-by-step Wizard flow inside Assistant)
  if (state.conversationMode === 'collecting_data') {
    let parsedInputs = parseFieldsFromMessage(messageText, state.inputs);
    
    // Check missing fields
    const missing = getMissingFields(parsedInputs);
    
    if (missing.length === 0) {
      // Validate inputs
      const validation = validateAssistantInput(parsedInputs);
      if (validation.isValid) {
        const salaryText = (parsedInputs.salaryMode === 'details')
          ? `الأساسي: ${parsedInputs.basicSalary}، السكن: ${parsedInputs.housingAllowance}`
          : `${parsedInputs.directNetSalary?.toLocaleString('ar-SA')} ريال`;

        const summary = `**📋 مراجعة وتأكيد بيانات التمويل:**\n\n` +
          `• قطاع العمل: ${parsedInputs.sectorId === 'military' ? `عسكري (${ranksListFindAr(parsedInputs.rankId)})` : parsedInputs.sectorId === 'gov_civil' ? 'مدني حكومي' : parsedInputs.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}\n` +
          `• تاريخ الميلاد: ${parsedInputs.birthDay}/${parsedInputs.birthMonth}/${parsedInputs.birthYear} (${parsedInputs.birthCalendar === 'hijri' ? 'هجري' : 'ميلادي'})\n` +
          (parsedInputs.sectorId !== 'retired' ? `• تاريخ التعيين: ${parsedInputs.appointmentDay}/${parsedInputs.appointmentMonth}/${parsedInputs.appointmentYear}\n` : '') +
          `• صافي الدخل: ${salaryText}\n` +
          `• الالتزامات لسمة: ${(parsedInputs.obligations ?? 0).toLocaleString('ar-SA')} ريال شهرياً\n` +
          `• برنامج الدعم: ${parsedInputs.supportType === 'monthly' ? 'دعم شهري ثابت' : parsedInputs.supportType === 'downpayment' ? 'دعم دفعة مسبقة' : 'بدون دعم'}\n\n` +
          `**هل ترغب في إجراء الحسبة وبدء مقارنة عروض البنوك بهذه البيانات؟**`;

        return {
          response: summary,
          newState: {
            ...state,
            inputs: parsedInputs,
            conversationMode: 'ready_to_calculate',
            currentAskField: 'confirm_calc'
          },
          richContent: {
            type: 'data_summary',
            summaryData: parsedInputs,
            buttons: [
              { id: 'calc_start', label: '🚀 نعم، قارن واحسب فوراً', action: 'نعم، ابدأ الحسبة' },
              { id: 'calc_edit', label: '✏️ تعديل الراتب والالتزامات', action: 'تعديل البيانات' }
            ]
          }
        };
      } else {
        return {
          response: `عذراً، تبين وجود تضارب يمنع الحسبة منطقياً:\n\n${validation.errors.join('\n')}\n\nيرجى إعادة كتابة صافي راتبك الشهري الصحيح لتجاوز هذا المانع.`,
          newState: {
            ...state,
            inputs: parsedInputs,
            currentAskField: 'directNetSalary'
          }
        };
      }
    } else {
      const askedField = state.currentAskField;
      if (askedField === 'obligations' && (norm.includes('لا يوجد') || norm.includes('صفر') || norm.includes('ما عندي') || norm.includes('بدون') || norm === '0' || norm.includes('لا') || norm.includes('كلا'))) {
        parsedInputs.obligations = 0;
      }
      
      const nextMissing = getMissingFields(parsedInputs);
      if (nextMissing.length === 0) {
        const validation = validateAssistantInput(parsedInputs);
        if (validation.isValid) {
          const salaryText = (parsedInputs.salaryMode === 'details')
            ? `الأساسي: ${parsedInputs.basicSalary}، السكن: ${parsedInputs.housingAllowance}`
            : `${parsedInputs.directNetSalary?.toLocaleString('ar-SA')} ريال`;

          const summary = `**📋 مراجعة وتأكيد بيانات التمويل:**\n\n` +
            `• قطاع العمل: ${parsedInputs.sectorId === 'military' ? `عسكري (${ranksListFindAr(parsedInputs.rankId)})` : parsedInputs.sectorId === 'gov_civil' ? 'مدني حكومي' : parsedInputs.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}\n` +
            `• تاريخ الميلاد: ${parsedInputs.birthDay}/${parsedInputs.birthMonth}/${parsedInputs.birthYear} (${parsedInputs.birthCalendar === 'hijri' ? 'هجري' : 'ميلادي'})\n` +
            (parsedInputs.sectorId !== 'retired' ? `• تاريخ التعيين: ${parsedInputs.appointmentDay}/${parsedInputs.appointmentMonth}/${parsedInputs.appointmentYear}\n` : '') +
            `• صافي الدخل: ${salaryText}\n` +
            `• الالتزامات لسمة: ${(parsedInputs.obligations ?? 0).toLocaleString('ar-SA')} ريال شهرياً\n` +
            `• برنامج الدعم: ${parsedInputs.supportType === 'monthly' ? 'دعم شهري ثابت' : parsedInputs.supportType === 'downpayment' ? 'دعم دفعة مسبقة' : 'بدون دعم'}\n\n` +
            `**هل ترغب في إجراء الحسبة وبدء مقارنة عروض البنوك بهذه البيانات؟**`;

          return {
            response: summary,
            newState: {
              ...state,
              inputs: parsedInputs,
              conversationMode: 'ready_to_calculate',
              currentAskField: 'confirm_calc'
            },
            richContent: {
              type: 'data_summary',
              summaryData: parsedInputs,
              buttons: [
                { id: 'calc_start', label: '🚀 نعم، قارن واحسب فوراً', action: 'نعم، ابدأ الحسبة' },
                { id: 'calc_edit', label: '✏️ تعديل الراتب والالتزامات', action: 'تعديل البيانات' }
              ]
            }
          };
        } else {
          return {
            response: `عذراً، تبين وجود تضارب يمنع الحسبة منطقياً:\n\n${validation.errors.join('\n')}\n\nيرجى إعادة كتابة صافي راتبك الشهري الصحيح لتجاوز هذا المانع.`,
            newState: {
              ...state,
              inputs: parsedInputs,
              currentAskField: 'directNetSalary'
            }
          };
        }
      }
      
      const firstMissing = nextMissing[0];
      const promptObj = getPromptForMissingField(firstMissing, parsedInputs);
      
      let responseWithProgress = promptObj.response;
      let parsedProgressText = "";
      if (parsedInputs.sectorId && parsedInputs.sectorId !== state.inputs.sectorId) {
        parsedProgressText += `جهة العمل: ${parsedInputs.sectorId === 'military' ? 'عسكري' : parsedInputs.sectorId === 'gov_civil' ? 'مدني حكومي' : parsedInputs.sectorId === 'retired' ? 'متقاعد' : 'قطاع خاص'}. `;
      }
      if (parsedInputs.directNetSalary && parsedInputs.directNetSalary !== state.inputs.directNetSalary) {
        parsedProgressText += `صافي الراتب: ${parsedInputs.directNetSalary.toLocaleString('ar-SA')} ريال. `;
      }
      if (parsedInputs.obligations !== undefined && parsedInputs.obligations !== state.inputs.obligations) {
        parsedProgressText += `الالتزامات: ${parsedInputs.obligations.toLocaleString('ar-SA')} ريال. `;
      }
      if (parsedInputs.productId !== state.inputs.productId) {
        parsedProgressText += `المنتج: ${parsedInputs.productId === 'personal_only' ? 'تمويل شخصي فقط' : 'تمويل عقاري'}. `;
      }
      
      if (parsedProgressText) {
        responseWithProgress = `فهمت البيانات التالية: **${parsedProgressText}**\n\n${promptObj.response}`;
      }

      return {
        response: responseWithProgress,
        newState: {
          ...state,
          inputs: parsedInputs,
          currentAskField: firstMissing
        },
        richContent: promptObj.richContent
      };
    }
  }

  // 7. Transition: Ready to calculate -> Execution
  if (state.conversationMode === 'ready_to_calculate') {
    if (norm.includes('نعم') || norm.includes('احسب') || norm.includes('ابدا') || norm.includes('قارن') || norm.includes('calc_start')) {
      const runRes = runAssistantCalculation(state.inputs, context);
      
      return {
        response: `تم إرسال كافة معطياتك بأمان إلى محرك حسبة.\nإليك نتائج المقارنة الفورية وتحليل عروض الجهات المؤهلة بناءً على سياساتها المحدثة:`,
        newState: {
          ...state,
          conversationMode: 'showing_results',
          results: runRes
        },
        richContent: {
          type: 'results',
          results: runRes
        }
      };
    } else {
      return {
        response: "حسناً، تم إلغاء تشغيل الحسبة. يمكنك كتابة 'احسب تمويلي' في أي وقت لإعادة تعبئة البيانات التمويلية.",
        newState: INITIAL_ASSISTANT_STATE
      };
    }
  }

  // Fallback response for unhandled scenarios
  return {
    response: "لا أملك معلومة مؤكدة من النظام حول هذه النقطة. يمكنك التواصل مع الموظف للحصول على توضيح أدق.",
    newState: state
  };
}

function ranksListFindAr(rankId?: string): string {
  if (!rankId) return '';
  const ranksMap: { [key: string]: string } = {
    jundi: 'جندي / جندي أول',
    areef: 'عريف',
    wakeel_raqeeb: 'وكيل رقيب',
    raqeeb: 'رقيب / رقيب أول',
    rayees_ruqaba: 'رئيس رقباء',
    mulazim: 'ملازم',
    naqeeb: 'نقيب',
    raid: 'رائد',
    muqaddam: 'مقدم',
    aqeed: 'عقيد',
    ameed: 'عميد',
    liwa: 'لواء'
  };
  return ranksMap[rankId] || rankId;
}

function getMissingFields(inputs: AssistantCalculationInput): (keyof AssistantCalculationInput)[] {
  const missing: (keyof AssistantCalculationInput)[] = [];
  
  if (!inputs.sectorId) {
    missing.push('sectorId');
  }
  if (inputs.sectorId === 'military' && !inputs.rankId) {
    missing.push('rankId');
  }
  if (!inputs.birthYear) {
    missing.push('birthYear');
  }
  if (inputs.sectorId !== 'retired' && !inputs.appointmentYear) {
    missing.push('appointmentYear');
  }
  if (!inputs.directNetSalary) {
    missing.push('directNetSalary');
  }
  if (inputs.obligations === undefined) {
    missing.push('obligations');
  }
  if (!inputs.supportType) {
    missing.push('supportType');
  }
  
  return missing;
}

function getPromptForMissingField(field: keyof AssistantCalculationInput, inputs: AssistantCalculationInput): { response: string; richContent?: any } {
  switch (field) {
    case 'sectorId':
      return {
        response: "ما هو قطاع عملك المعتمد حالياً لتطبيق معايير البنوك بدقة؟\n- مدني حكومي 💼\n- عسكري 🎖️\n- قطاع خاص 🏢\n- شركات كبرى (أرامكو، سابك، إلخ) 🏭\n- متقاعد 📅",
        richContent: {
          type: 'buttons',
          buttons: [
            { id: 'gov_civil', label: '💼 مدني حكومي', action: 'مدني حكومي' },
            { id: 'military', label: '🎖️ عسكري', action: 'عسكري' },
            { id: 'companies_private', label: '🏢 قطاع خاص', action: 'قطاع خاص' },
            { id: 'retired', label: '📅 متقاعد', action: 'متقاعد' }
          ]
        }
      };
    case 'rankId':
      return {
        response: "يرجى تحديد رتبتك العسكرية الحالية لتحديد حد التقاعد وخطة الأقساط الأنسب لقطاع الدفاع والأمن (مثال: جندي، عريف، رقيب، عميد...)",
      };
    case 'birthYear':
      return {
        response: "تاريخ ميلادك بالكامل (اليوم/الشهر/السنة) أمر حاسم لمعرفة عمرك الأقصى للتسديد لدى البنوك المختلفة. فضلاً اكتبه على النحو التالي (مثلاً: 15/06/1991 ميلادي أو 20/08/1411 هجري).",
      };
    case 'appointmentYear':
      return {
        response: "تاريخ مباشرتك العمل أو التعيين باليوم والشهر والسنة (مثال: 05/01/2018 ميلادي) لحساب مدة الخدمة المحتسبة وصافي المستحقات.",
      };
    case 'directNetSalary':
      return {
        response: "كم يبلغ صافي راتبك الشهري الفعلي الذي يتم إيداعه في حسابك البنكي بعد خصم التأمينات أو التقاعد؟ (مثلاً: 14200 ريال)",
      };
    case 'obligations':
      return {
        response: "هل لديك حالياً أي التزامات وقروض قائمة أو أقساط مسجلة على حسابك؟ (فضلاً اكتب قيمة القسط الشهري بالريال، أو اكتب 'لا يوجد' أو '0' إذا لم تكن هناك أي التزامات).",
      };
    case 'supportType':
      return {
        response: "ما هو برنامج الدعم السكني الذي تفضله أو ترغب بالاستحقاق منه؟\n- دعم شهري ثابت (يغطي أرباح التمويل دورياً) 🏠\n- باقة الدفعة المسبقة (دعم مالي فوري دفعة مقطوعة لخفض الدفعة الأولى) 💰\n- بدون دعم (تمويل عقاري تمويلي مجرد) ❌",
        richContent: {
          type: 'buttons',
          buttons: [
            { id: 'monthly_support', label: '🏠 دعم شهري ثابت', action: 'دعم شهري ثابت' },
            { id: 'lump_sum_support', label: '💰 باقة دفعة مسبقة (100ألف/150ألف)', action: 'دعم دفعة مسبقة' },
            { id: 'no_support', label: '❌ بدون دعم سكني', action: 'بدون دعم' }
          ]
        }
      };
    default:
      return {
        response: "يرجى تزويدي بالبيانات المطلوبة لخدمتك في الحسبة بدقة.",
      };
  }
}
