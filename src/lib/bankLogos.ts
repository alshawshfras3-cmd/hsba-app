export const BANK_LOGOS: Record<string, string> = {
  snb: "/bank-logos/snb.jpg",
  alahli: "/bank-logos/snb.jpg",
  alrajhi: "/bank-logos/alrajhi.jpg",
  albilad: "/bank-logos/albilad.jpg",
  alinma: "/bank-logos/alinma.jpg",
  fransi: "/bank-logos/fransi.jpg",
  alarabi: "/bank-logos/alarabi.jpg",
  bidaya: "/bank-logos/bidaya.jpg",
  masar: "/bank-logos/masar.jpg",
};

export function normalizeBankKey(bankId?: string, bankName?: string): string {
  const name = (bankName || '').trim().toLowerCase();
  const id = (bankId || '').trim().toLowerCase();

  if (
    id.includes('snb') || 
    id.includes('alahli') || 
    name.includes('الأهلي') || 
    name.includes('snb') || 
    name.includes('alahli') || 
    name.includes('أهلي') ||
    name.includes('البنك الأهلي السعودي')
  ) {
    return 'snb';
  }
  if (
    id.includes('alrajhi') || 
    name.includes('الراجحي') || 
    name.includes('alrajhi') || 
    name.includes('راجحي') ||
    name.includes('مصرف الراجحي')
  ) {
    return 'alrajhi';
  }
  if (
    id.includes('albilad') || 
    name.includes('البلاد') || 
    name.includes('albilad') || 
    name.includes('بلاد') ||
    name.includes('بنك البلاد')
  ) {
    return 'albilad';
  }
  if (
    id.includes('alinma') || 
    name.includes('الإنماء') || 
    name.includes('alinma') || 
    name.includes('إنماء') ||
    name.includes('مصرف الإنماء')
  ) {
    return 'alinma';
  }
  if (
    id.includes('fransi') || 
    id.includes('bsf') ||
    name.includes('الفرنسي') || 
    name.includes('fransi') || 
    name.includes('bsf') ||
    name.includes('فرنسي') ||
    name.includes('banque saudi fransi') ||
    name.includes('البنك السعودي الفرنسي')
  ) {
    return 'fransi';
  }
  if (
    id.includes('alarabi') || 
    id.includes('anb') ||
    name.includes('العربي') || 
    name.includes('alarabi') || 
    name.includes('anb') ||
    name.includes('عربي') ||
    name.includes('البنك العربي الوطني')
  ) {
    return 'alarabi';
  }
  if (
    id.includes('bidaya') || 
    name.includes('بداية') || 
    name.includes('bidaya') ||
    name.includes('شركة بداية') ||
    name.includes('بداية للتمويل')
  ) {
    return 'bidaya';
  }
  if (
    id.includes('masar') || 
    id.includes('alnumou') ||
    name.includes('مسار') || 
    name.includes('masar') ||
    name.includes('alnumou') ||
    name.includes('شركة مسار') ||
    name.includes('مسار للتمويل') ||
    name.includes('alnumou finance')
  ) {
    return 'masar';
  }

  return id || name;
}

export function getBankLogoCandidates(bankId?: string, bankName?: string, logoUrl?: string): string[] {
  const candidates: string[] = [];

  // 1. Prioritize direct logoUrl from settings if present
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '') {
    candidates.push(logoUrl.trim());
  }

  const key = normalizeBankKey(bankId, bankName);

  // 2. Use mapped files
  const baseLogo = BANK_LOGOS[key];
  if (baseLogo) {
    candidates.push(baseLogo);
  } else if (key) {
    candidates.push(`/bank-logos/${key}.jpg`);
  }

  return Array.from(new Set(candidates));
}

export function getBankLogo(bankId?: string, bankName?: string): string | null {
  const candidates = getBankLogoCandidates(bankId, bankName);
  return candidates[0] || null;
}
