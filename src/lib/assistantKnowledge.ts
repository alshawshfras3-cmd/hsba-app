// Assistant Knowledge Base and Intent Matching Engine (مساعد حسبة الذكي)
// Contains purified conceptual explanations, FAQs, legal disclaimers, and clear category routing.
// This file does not hardcode any specific system rates, rules, or amounts.

export interface FAQItem {
  id: string;
  category: string;
  keywords: string[][]; // Groupings of keywords where at least one word from each sub-array or specific matching triggers the intent
  reply: string;
}

export const KNOWLEDGE_BASE_SECTIONS = {
  support: {
    title: "الدعم السكني",
    description: "شروط وآلية الدعم السكني (الشهري والسابقة)"
  },
  etizaz: {
    title: "دعم اعتزاز",
    description: "باقة الدعم المخصصة للعسكريين"
  },
  products: {
    title: "المنتجات التمويلية",
    description: "الفرق بين المنتجات والحلول السكنية"
  },
  dsr: {
    title: "نسبة الاستقطاع (DSR)",
    description: "قواعد واشتراطات نسبة الاستقطاع المالي"
  },
  margin: {
    title: "هامش الربح",
    description: "مفهوم الهامش واختلافاته وتأثيره"
  },
  term: {
    title: "مدة التمويل وتناقصها",
    description: "أثر العمر واقتراب سن التقاعد على التمويل"
  },
  obligations: {
    title: "الالتزامات والقروض الحالية",
    description: "كيف تؤثر الالتزامات والديون وسجل سمة على الحسبة"
  },
  bankEligibility: {
    title: "أهلية واختلاف البنوك",
    description: "لماذا تختلف النتائج والقبول من جهة لأخرى"
  },
  estimatedResults: {
    title: "النتائج التقديرية والموافقة المبدئية",
    description: "طبيعة نتائج الحاسبة وموثوقيتها القانونية"
  },
  privacy: {
    title: "الخصوصية والأمان",
    description: "سرية البيانات الشخصية وحمايتها"
  },
  employee: {
    title: "التواصل مع الموظف",
    description: "آلية الاتصال المباشر بمندوبي البنوك"
  }
};

export const KNOWLEDGE_BASE_FAQS: FAQItem[] = [
  // 1. الدعم السكني
  {
    id: "how_support_calculated",
    category: "support",
    keywords: [
      ["كيف", "طريقه", "اليه", "طريقة", "آلية"],
      ["يتم", "ينحسب", "يعطوني", "منح", "تحتسب", "مخصص", "حساب", "احسب"],
      ["دعم", "الدعم", "السكني"]
    ],
    reply: "يعتمد الدعم المستخدم في الحسبة على نوع الدعم المحدد وبيانات العميل وإعدادات النظام المعتمدة. لا يمكن تحديد المبلغ دون وجود نتيجة حسبة، والاعتماد النهائي يعود إلى الجهة المختصة."
  },
  {
    id: "support_difference",
    category: "support",
    keywords: [
      ["فرق", "الفرق", "وش", "شو", "ايش"],
      ["شهري", "الشهري", "الاقساط", "قسط"],
      ["دفعه", "دفعة", "مسبقه", "مسبقة", "مقدمة", "مقدمه", "مقطوع", "باقه", "باقة"]
    ],
    reply: "الفرق يكمن في آلية الاستلام والأثر التمويلي:\n- **الدعم الشهري**: دعم مالي غير مسترد يودع شهرياً في حساب العميل للمساهمة في سداد أرباح التمويل العقاري وتقليل قسطك الشهري التقديري.\n- **دعم الدفعة المقدمة (الباقة)**: مبلغ دعم يتم صرفه دفعة واحدة في بداية العقد لتخفيض أصل التمويل أو سداد الدفعة الأولى مما يقلل القسط الإجمالي الإجمالي اللاحق.\nيرجى الاعتماد حصراً على مبلغ الدعم الظاهر في حسابك الحالي ببيانات النتيجة للتحقق من أهليتك وقيمة دعمك."
  },
  {
    id: "support_added_to_finance",
    category: "support",
    keywords: [
      ["هل", "ممكن"],
      ["يضاف", "يزيد", "تضاف", "تزيد"],
      ["دعم", "الدعم"],
      ["تمويل", "التمويل", "مبلغ"]
    ],
    reply: "لا، الدعم السكني لا يضاف مباشرة كقوة شرائية تزيد مبلغ التمويل الأساسي الممنوح من البنك؛ بل ترحّل مبالغه لتقليل تكلفة القسط الشهري الفعلي (في المسار الشهري) أو دعم الدفعة الأولى (في مسار الدفعة المقدمة)."
  },
  {
    id: "support_reduces_install",
    category: "support",
    keywords: [
      ["هل", "كيف"],
      ["يقلل", "يخفض", "ينزل", "ينقص", "تاثير"],
      ["دعم", "الدعم"],
      ["قسط", "القسط", "الاقساط"]
    ],
    reply: "نعم، يساهم الدعم السكني بشكل مباشر في خفض الأعباء المالية وقيمة القسط الفعلي المترتب عليك، إما عن طريق خفض صافي القسط الشهري أو من خلال تخفيض أصل مبلغ التمويل المطلوب سداده."
  },
  {
    id: "support_why_varies",
    category: "support",
    keywords: [
      ["لماذا", "ليه", "ليش", "سبب"],
      ["يختلف", "تفاوت", "تغير", "تغيرت"],
      ["دعم", "الدعم"],
      ["عميل", "عميل لاخر", "الناس", "شخص"]
    ],
    reply: "يختلف مبلغ وهيكل الدعم السكني من عميل لآخر نظراً لاختلاف معايير الاستحقاق الشخصية والائتمانية المعتمدة من الجهات المانحة دون وجود مبالغ ثابتة مطلقة."
  },

  // 2. دعم اعتزاز
  {
    id: "etizaz_military_worth",
    category: "etizaz",
    keywords: [
      ["هل", "مين", "من"],
      ["كل", "جميع", "اي"],
      ["عسكري", "العسكريين", "عسكريين", "الضباط", "الافراد"],
      ["يستحق", "ياخذ", "يشمل", "اعتزاز", "الدعم"]
    ],
    reply: "لا، دعم اعتزاز لا يُطبق تلقائيًا على كل عميل عسكري. يعتمد ظهوره على بيانات العميل واختياره وشروط النظام المعتمدة، ويظهر مبلغه فقط عند وجوده في نتيجة الحسبة."
  },
  {
    id: "etizaz_meaning",
    category: "etizaz",
    keywords: [
      ["ما", "وش", "ايش", "معني", "معنى", "تعريف"],
      ["اعتزاز", "الاعتزاز", "البرنامج"]
    ],
    reply: "اعتزاز خيار دعم مخصص للفئات العسكرية المؤهلة وفق شروط النظام. لا يُطبق تلقائيًا على جميع العسكريين، ويظهر أثره ومبلغه عند احتسابه ضمن النتيجة."
  },

  // 3. المنتجات التمويلية
  {
    id: "product_real_estate_vs_mixed",
    category: "products",
    keywords: [
      ["فرق", "الفرق", "وش", "ايش"],
      ["عقاري", "العقاري"],
      ["شخصي", "الشخصي", "المدمج", "معا", "سوية", "سوية"]
    ],
    reply: "التمويل العقاري مع التمويل الشخصي الجديد يجمع بين حلي التمويل (الشخصي والعقاري) في طلب مدمج واحد لرفع القدرة الشرائية الكلية وتوفير أكبر تمويل ممكن. أما التمويل العقاري فقط فهو منتج تمويل سكني مستقل تماماً ولا يشمل أي مبالغ شخصية إضافية."
  },
  {
    id: "product_personal_new_vs_existing",
    category: "products",
    keywords: [
      ["فرق", "الفرق", "وش", "ايش"],
      ["شخصي", "الشخصي"],
      ["جديد", "الجديد"],
      ["قائم", "القائم", "الحالي", "قرض"]
    ],
    reply: "التمويل الشخصي الجديد يمثل سيولة إضافية تُمنح ضمن سيناريو الحسبة الحالية لزيادة القدرة الشرائية للعقار. أما الشخصي القائم (الالتزامات الحالية) فهو دين مستمر مسجل في سجلك الائتماني حالياً ويستقطع قسطه الفعلي من راتبك، مما يؤثر على قدرتك على الاقتراض العقاري الجديد."
  }].concat([
  // 4. نسبة الاستقطاع DSR
  {
    id: "dsr_meaning",
    category: "dsr",
    keywords: [
      ["ما", "وش", "ايش", "معني", "معنى", "مفهوم", "تعريف", "آلية"],
      ["استقطاع", "الاستقطاع", "dsr", "دي اس ار", "خصم", "النسبة"]
    ],
    reply: "نسبة الاستقطاع توضح مقدار الدخل الذي يمكن تخصيصه للأقساط. النسبة الفعلية المستخدمة تظهر في نتيجة الحسبة بحسب بيانات العميل والمنتج وإعدادات الجهة التمويلية"
  },

  // 5. هامش الربح
  {
    id: "margin_meaning",
    category: "margin",
    keywords: [
      ["ما", "وش", "ايش", "معني", "معنى", "مفهوم", "تعريف"],
      ["هامش", "الهامش", "فائدة", "الفائدة", "فائده", "الفائده", "المرابحة", "المرابحه", "ربح", "الربح"]
    ],
    reply: "هامش الربح هو النسبة السنوية أو العائد المستخدم في تسعير التمويل واحتساب تكلفة الأرباح، ويؤثر مباشرة على قيمة القسط ومبلغ التمويل الإجمالي. لا يعني دائمًا أن أقل هامش هو الخيار الفضيل والمطلق؛ بل يجب مقارنة النتيجة ككل من حيث: مبلغ التمويل المتاح، القسط الشهري، مدة السداد المتاحة، إجمالي المبالغ، وأهلية البنك."
  },

  // 6. مدة التمويل والسن عند التقاعد
  {
    id: "term_proximity_to_retirement",
    category: "term",
    keywords: [
      ["لماذا", "ليه", "ليش", "سبب", "قصر", "قصيرة", "قصيره"],
      ["تقل", "انخفضت", "قرب", "اقتراب", "التقاعد", "تقاعد", "السن", "عمر", "العمر", "المدة", "المده", "سنوات"]
    ],
    reply: "تحدد مدة التمويل الأقصى بناءً على تاريخ التقاعد المتوقع (السن القانوني المحدد للمدنيين أو رتب العسكريين). تُبنى هذه الجدولة بهدف ضمان سداد المبالغ العقارية بالكامل قبل تراجع الدخل عند التقاعد لتجنيب العميل أقساطاً مفرطة تفوق المعاش التقاعدي المقرر له."
  },

  // 7. الالتزامات والقروض
  {
    id: "obligations_on_finance",
    category: "obligations",
    keywords: [
      ["كيف", "هل", "تاثير", "تأثير"],
      ["التزامات", "قسط", "القسط", "الالتزامات", "قرض", "القرض", "ديون", "سمه", "سمة", "اقساط", "أقساط"],
      ["تمويل", "التمويل", "القدرة", "الأهلية", "الاهلية"]
    ],
    reply: "نعم، الالتزامات والأقساط الحالية تقلل عادةً القدرة المتاحة للقسط الجديد، وقد تؤثر على مبلغ التمويل أو القبول. لمعرفة الأثر الفعلي يجب إعادة الحسبة بعد إدخال الالتزام."
  },
  {
    id: "obligations_delete_increase_finance",
    category: "obligations",
    keywords: [
      ["حذف", "تسديد", "اغلاق", "إغلاق", "الغاء", "إلغاء", "اسقاط", "إسقاط"],
      ["قرض", "قسط", "التزام", "الالتزام", "القرض"],
      ["يزيد", "يرفع", "يكبر", "يؤثر", "تاثير", "التمويل", "تمويلي"]
    ],
    reply: "غالباً ما يؤدي انخفاض الالتزامات أو إغلاقها إلى زيادة القدرة التمويلية للعميل مباشرة لتوفر جزء أكبر من الراتب للاستقطاع. ومع ذلك، لا يقوم المساعد بحساب هذه الأرقام بنفسه؛ بل يجب عليك تعديل قيمة الالتزامات في بيانات الحسبة الأساسية وإعادة تشغيل الحسبة لتحديث النتائج وقراءة مبالغ التمويل الدقيقة."
  },

  // 8. أهلية البنوك وتفاوتها
  {
    id: "bank_eligibility_and_differences",
    category: "bankEligibility",
    keywords: [
      ["لماذا", "ليه", "ليش", "سبب", "تختلف", "يختلف", "تباين", "تفاوت"],
      ["البنوك", "بنك", "عرض", "العروض", "الاهلي", "الراجحي", "الرياض", "البلاد", "الانماء", "جهة", "النتيجة", "النتائج"]
    ],
    reply: "تختلف النتائج والقبول من بنك لآخر نتيجة تباين سياسات الائتمان الداخلية لكل بنك، مثل الحد الأدنى للراتب المستهدف لديهم، تقييمهم وبدلات قطاع العمل، هوامش الربح السنوية المتنافسة، مدة التمويل القصوى، وقبول السن عند نهاية التمويل، بالإضافة لكون الراتب محولاً لديهم أم لا."
  },

  // 9. النتائج التقديرية والقبول المبدئي
  {
    id: "is_estimation_final",
    category: "estimatedResults",
    keywords: [
      ["هل", "النتيجة", "نتيجة", "الحسبة", "ارقام", "الأرقام", "موافقة", "موافقه", "نهائية", "نهائيه", "اكيد", "أكيد", "مضمون", "مضمونة", "يوافق"]
    ],
    reply: "لا. نتيجة حسبة تقديرية ومبدئية للمقارنة، والقرار النهائي يعود إلى البنك أو الجهة التمويلية بعد مراجعة الطلب."
  },

  // 10. الخصوصية والأمان
  {
    id: "privacy_and_security",
    category: "privacy",
    keywords: [
      ["خصوصية", "امان", "الأمان", "سرية", "مدى أمان", "بياناتي", "البيانات", "محمية", "محميه"]
    ],
    reply: "تلتزم منصة حسبة بأعلى معايير الخصوصية والأمن الائتماني. البيانات الشخصية والمصرفية التي تدخلها تُعالج آلياً فقط لتقديم حسابات محاكاة التمويل التقديرية، ولا تجري مشاركتها أو معالجتها دون موافقتك الصريحة."
  },

  // 11. التواصل مع الموظف
  {
    id: "how_to_contact_employee",
    category: "employee",
    keywords: [
      ["كيف", "اريد", "ابي", "طريقة", "كيفية", "تواصل", "اتصال", "تكلم", "احكي", "الموظف", "مندوب", "مندوبين", "موظف", "واتساب", "اتصل", "ارسال", "أرسل"]
    ],
    reply: "يمكنك التواصل مع الموظف مباشرة من خلال النقر على زر 'اتصال بالمندوب' المتوفر بجانب عروض النتائج المؤهل لديها. سيقوم المساعد فوراً بتوليد وتجهيز بطاقة اتصال ورابط واتساب مباشر لخدمة العملاء للتلك الجهة التمويلية المحددة لمناقشة طلبك وتفاصيله."
  }
] as FAQItem[]);

// Help Normalize input specifically for exact Arabized matching
export function normalizeSentence(text: string): string {
  if (!text) return "";
  let norm = text.toLowerCase();

  // 1. Unified Alifs
  norm = norm.replace(/[أإآٱ]/g, "ا");

  // 2. Unified Teh Marbuta and Heh
  norm = norm.replace(/ة/g, "ه");

  // 3. Unified Alef Maksura and Yeh
  norm = norm.replace(/ى/g, "ي");

  // 4. Remove Arabic diacritics
  norm = norm.replace(/[\u064B-\u065F]/g, "");

  // 5. Dialect substitutions for matching (like ايش, وش, ليه, ليش -> لماذا / كيف / سبب)
  // We keep words in the input for keyword extraction but we can clean spelling errors.
  norm = norm.replace(/\s+/g, " ");

  return norm.trim();
}

export function safeTokenize(text: string): string[] {
  const norm = normalizeSentence(text);
  const clean = norm.replace(/[؟?!.,،:;\-_()'"\[\]]/g, ' ');
  return clean.split(/\s+/).filter(Boolean);
}

function matchKeyword(queryText: string, queryTokens: string[], keyword: string): boolean {
  const normKeyword = normalizeSentence(keyword);
  const keywordTokens = normKeyword.split(/\s+/).filter(Boolean);

  if (keywordTokens.length === 0) return false;

  if (keywordTokens.length === 1) {
    const word = keywordTokens[0];
    if (word.length <= 3) {
      // Must be an exact full word match in the query tokens
      return queryTokens.includes(word);
    } else {
      // For longer words, we can check if it exists in the tokens or the raw string
      return queryTokens.includes(word) || queryText.includes(word);
    }
  } else {
    // Multi-word phrase matching
    return queryText.includes(normKeyword);
  }
}

/**
 * Searches the cleaned, purified knowledge base or matches queries with friendly conceptual, non-technical answers.
 * Implements a very flexible intent matcher where keywords groupings are checked.
 */
export function searchKnowledgeBase(query: string): string | null {
  const norm = normalizeSentence(query);
  const tokens = safeTokenize(query);

  // 1. Precise match check for is_estimation_final (الموافقة النهائية)
  // Ensure it only triggers on clear finality questions, not standard result inquiries.
  const isFinalAsk = 
    (norm.includes('هل') && (norm.includes('نهائي') || norm.includes('نهائيه') || norm.includes('اكيد') || norm.includes('مضمون') || norm.includes('موافقه') || norm.includes('موافقة') || norm.includes('يوافق'))) ||
    norm.includes('قبول نهائي') || 
    norm.includes('النتيجه نهائيه') || 
    norm.includes('النتيجة نهائية') || 
    norm.includes('التمويل مضمون') || 
    norm.includes('تمويل مضمون') || 
    norm.includes('مضمونه') ||
    norm.includes('مضمونة');

  const hasFinalExclusion = 
    norm.includes('مبلغ الدعم') || 
    norm.includes('كم الدعم') || 
    norm.includes('قيمة الدعم') || 
    norm.includes('قيمه الدعم') || 
    norm.includes('دعم الاهلي') || 
    norm.includes('دعم الراجحي') ||
    norm.includes('الاقساط') ||
    (norm.includes('كم') && (norm.includes('دعم') || norm.includes('قسط') || norm.includes('تمويل'))) ||
    norm.includes('كم قسط') ||
    norm.includes('كم تمويل');

  if (isFinalAsk && !hasFinalExclusion) {
    return "لا. نتيجة حسبة تقديرية ومبدئية للمقارنة، والقرار النهائي يعود إلى البنك أو الجهة التمويلية بعد مراجعة الطلب.";
  }

  // Check the robust match groups
  for (const faq of KNOWLEDGE_BASE_FAQS) {
    // We skip the generic check for is_estimation_final because we handle it above with higher precision
    if (faq.id === "is_estimation_final") {
      continue;
    }

    let allGroupsMatch = true;

    for (const group of faq.keywords) {
      const groupHasMatch = group.some(word => {
        return matchKeyword(norm, tokens, word);
      });
      if (!groupHasMatch) {
        allGroupsMatch = false;
        break;
      }
    }

    if (allGroupsMatch) {
      return faq.reply;
    }
  }

  // Fallback for sub-terms in KNOWLEDGE_BASE_SECTIONS or simple keyword check
  // Try matching any single term in case of very short queries, using exact full word tokens
  if (tokens.includes("اعتزاز")) {
    return KNOWLEDGE_BASE_FAQS.find(faq => faq.id === "etizaz_meaning")?.reply || null;
  }
  if (tokens.includes("استقطاع") || tokens.includes("dsr") || tokens.includes("دي اس ار") || tokens.includes("الاستقطاع")) {
    return KNOWLEDGE_BASE_FAQS.find(faq => faq.id === "dsr_meaning")?.reply || null;
  }
  if (tokens.includes("هامش") || tokens.includes("فائده") || tokens.includes("فائدة") || tokens.includes("المرابحه") || tokens.includes("المرابحة") || tokens.includes("الهامش")) {
    return KNOWLEDGE_BASE_FAQS.find(faq => faq.id === "margin_meaning")?.reply || null;
  }
  if (tokens.includes("تقاعد") || tokens.includes("التقاعد")) {
    return KNOWLEDGE_BASE_FAQS.find(faq => faq.id === "term_proximity_to_retirement")?.reply || null;
  }
  if (tokens.includes("التزام") || tokens.includes("ملتزم") || tokens.includes("قرض") || tokens.includes("اقساط") || tokens.includes("الالتزامات")) {
    return KNOWLEDGE_BASE_FAQS.find(faq => faq.id === "obligations_on_finance")?.reply || null;
  }

  return null;
}

export const KNOWLEDGE_BASE = {
  legalDisclaimer: "تنبيه: كافة مبالغ ونسب الحسبة الموضحة تقديرية بناءً على المدخلات، للحصول على عرض رسمي نهائي يرجى التواصل مع الجهة التمويلية المحددة."
};

