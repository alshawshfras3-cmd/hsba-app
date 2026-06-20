// Security and prompt-injection guard layer for the Intelligent Hesba Assistant (مساعد حسبة الذكي)
// Blocks unauthorized requests for source code, internal rules, configurations, system prompts, API keys, or database access.

export interface GuardReviewResult {
  isBlocked: boolean;
  rejectMessage: string;
}

/**
 * Checks query string against known security violations, injection attempts, and internal detail requests.
 */
export function checkAssistantGuard(query: string): GuardReviewResult {
  const norm = query.toLowerCase().trim();
  
  // Expanded keywords targeting instructions bypass, code / DB disclosure, calculations, settings leakage, and fabrication attempts
  const suspiciousKeywords = [
    // System promts & Instructions
    "system prompt",
    "systemprompt",
    "sys prompt",
    "توجيهات النظام",
    "تعليمات النظام",
    "التعليمات السابقة",
    "تجاهل التعليمات",
    "تجاهل تعليمات",
    "ignore instructions",
    "ignore previous",
    "bypass instructions",
    "override system",
    "you are now",
    "أنت الآن",
    "مثل دور",
    "roleplay",
    "pretend to be",
    "developer mode",
    "وضع المطور",
    
    // Code / logic / formulas disclosure
    "كود المشروع",
    "سورس كود",
    "source code",
    "source_code",
    "كيف مبرمج",
    "كود المساعد",
    "كود الصفحة",
    "معادلات البنك",
    "معادلة البنك",
    "معادلات الاحتساب",
    "طرق الحساب الرياضية",
    "طريقة بناء المحرك",
    "طريقه بناء المحرك",
    "محرك الحسبة",
    "finance-engine",
    "finance_engine",
    "معادلة",
    "معادلات",
    "الكود",
    
    // Config / database keys
    "إعدادات الهوامش",
    "اعدادات الهوامش",
    "margin rules",
    "system settings",
    "إعدادات النظام",
    "اعدادات النظام",
    "api key",
    "api_key",
    "مفاتيح api",
    "مفاتيح النظام",
    "مفاتيح",
    "قاعدة البيانات",
    "البيانات الداخلية",
    "database access",
    "sql injection",
    "app_settings",
    "system_settings",
    "select * from",
    "delete from",
    "update app_settings",
    "drop table",

    // Financial fabrication and force-making-up data
    "اخترع نسبة",
    "افترض نسبة ربح",
    "حدد هامش من عندك",
    "حط فايدة من رأسك",
    "توقع الفائدة",
    "تنبأ بالهيكل المالي",
    "أعطني نسبة عشوائية",
    "توقع من عندك",
    "تخمين نسبة الربح",
    "تخمين الفائدة",
    "تأليف أرقام مالية",
    "تأليف هامش"
  ];

  const matchesViolation = suspiciousKeywords.some(keyword => norm.includes(keyword));

  if (matchesViolation) {
    return {
      isBlocked: true,
      rejectMessage: "لا أستطيع عرض القواعد أو الإعدادات الداخلية للنظام، أو توقع وتخمين نسب الربح والأرقام خارج البيانات الفعلية. يمكنني فقط مساعدتك في فهم الأرقام الناتجة عن حسبتك الفعلية بدقة."
    };
  }

  return {
    isBlocked: false,
    rejectMessage: ""
  };
}
