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
  
  const suspiciousKeywords = [
    "system prompt",
    "systemprompt",
    "كود المشروع",
    "سورس كود",
    "source code",
    "معادلات البنك",
    "إعدادات الهوامش",
    "اعدادات الهوامش",
    "margin rules",
    "api key",
    "api_key",
    "مفاتيح api",
    "قاعدة البيانات",
    "البيانات الداخلية",
    "تجاوز صلاحيات",
    "تجاهل التعليمات",
    "تجاهل تعليمات",
    "ignore instructions",
    "bypass instructions",
    "database access",
    "sql injection",
    "app_settings",
    "select * from",
    "delete from",
    "update app_settings",
    "معادلة",
    "معادلات",
    "الكود",
    "طريقة بناء المحرك",
    "طريقه بناء المحرك",
    "مفاتيح النظام",
    "مفاتيح"
  ];

  const matchesViolation = suspiciousKeywords.some(keyword => norm.includes(keyword));

  if (matchesViolation) {
    return {
      isBlocked: true,
      rejectMessage: "لا أستطيع عرض تفاصيل النظام الداخلية أو إعداداته، لكن يمكنني مساعدتك في فهم الأرقام والنتائج الظاهرة لك."
    };
  }

  return {
    isBlocked: false,
    rejectMessage: ""
  };
}
