import snbLogo from "@/assets/images/snb_1782906319473.jpg";
import alrajhiLogo from "@/assets/images/alrajhi_1782906349287.jpg";
import albiladLogo from "@/assets/images/albilad_1782906360982.jpg";
import alinmaLogo from "@/assets/images/alinma_1782906373688.jpg";
import fransiLogo from "@/assets/images/fransi_1782906385288.jpg";
import alarabiLogo from "@/assets/images/alarabi_1782906398681.jpg";
import bidayaLogo from "@/assets/images/bidaya_1782906411827.jpg";
import masarLogo from "@/assets/images/masar_1782906422129.jpg";

export const BANK_LOGOS: Record<string, string> = {
  snb: snbLogo,
  alahli: snbLogo,
  alrajhi: alrajhiLogo,
  albilad: albiladLogo,
  alinma: alinmaLogo,
  fransi: fransiLogo,
  alarabi: alarabiLogo,
  bidaya: bidayaLogo,
  masar: masarLogo,
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
  }

  return Array.from(new Set(candidates));
}

export function getBankLogo(bankId?: string, bankName?: string): string | null {
  const candidates = getBankLogoCandidates(bankId, bankName);
  return candidates[0] || null;
}
