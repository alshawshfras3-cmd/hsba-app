import { TermOutput, SectorId, TermMode } from '../../types';
import { 
  getAgeInMonths, 
  getStandardizedDate, 
  convertGregorianToHijri 
} from '../date-utils';

export interface ExtendedTermOutput extends TermOutput {
  currentAgeMonths: number;
  monthsBeforeRetirement: number;
  remainingMonthsToMaxAge: number;
  monthsAfterRetirement: number;
  calendarUsed: 'hijri' | 'gregorian';
  ruleSource: 'termRule' | 'bankFallback';
}

export function calculateFinanceTerm(params: {
  sectorId: SectorId;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthCalendar: 'gregorian' | 'hijri';

  retirementAge: number;
  displayRetirementAge?: number;

  maxTermMonths: number;
  maxAgeAtEnd: number;
  allowedMonthsAfterRetirement: number;
  allowAfterRetirement: boolean;
  calendarType: 'gregorian' | 'hijri';
  minTermMonths: number;

  selectedMode: TermMode;
  manualTermMonths?: number;

  ruleSource: 'termRule' | 'bankFallback';
}): ExtendedTermOutput {
  const {
    sectorId,
    birthYear,
    birthMonth,
    birthDay,
    birthCalendar,
    retirementAge,
    displayRetirementAge,

    maxTermMonths,
    maxAgeAtEnd,
    allowedMonthsAfterRetirement,
    allowAfterRetirement,
    calendarType,
    minTermMonths,

    selectedMode,
    manualTermMonths = 300,
    ruleSource
  } = params;

  const today = new Date();

  // 1. Calculate age in months using the rules calendar
  const currentAgeMonths = getAgeInMonths(
    { year: birthYear, month: birthMonth, day: birthDay, calendar: birthCalendar },
    today,
    calendarType
  );

  const retirementAgeMonths = Math.round(retirementAge * 12);

  // 2. Count months before retirement
  const monthsBeforeRetirement = Math.max(0, retirementAgeMonths - currentAgeMonths);

  // 3. Post-retirement eligibility extension
  let monthsAfterRetirement = 0;
  if (sectorId !== 'retired' && allowAfterRetirement) {
    monthsAfterRetirement = allowedMonthsAfterRetirement;
  }

  // 4. Max months permitted by the age at the end of financing
  const maxAgeAtEndMonths = maxAgeAtEnd * 12;
  const remainingMonthsToMaxAge = Math.max(0, maxAgeAtEndMonths - currentAgeMonths);

  // 5. Capping months before retirement to statutory 25 years (300 months) for risk control
  const cappedMonthsBefore = Math.min(monthsBeforeRetirement, 300);

  const ruleLimitTerm = sectorId === 'retired'
    ? remainingMonthsToMaxAge
    : (cappedMonthsBefore + monthsAfterRetirement);

  // Risk profile cap: if remaining term before retirement is >= 240 months (20 years), absolute limit is 25 years (300 months)
  const maxTermAllowed = (sectorId !== 'retired' && monthsBeforeRetirement >= 240)
    ? 300
    : maxTermMonths;

  const absoluteMaxTerm = Math.min(
    maxTermAllowed,
    remainingMonthsToMaxAge,
    ruleLimitTerm
  );

  let totalMonths = absoluteMaxTerm;
  let reductionReason = '';

  if (selectedMode === 'until_retirement' && sectorId !== 'retired') {
    totalMonths = Math.min(absoluteMaxTerm, monthsBeforeRetirement);
    reductionReason = 'تم تحديد مدة التمويل لتنتهي عند التقاعد بناءً على طلبك.';
  } else if (selectedMode === 'manual') {
    const requested = manualTermMonths;
    if (requested > absoluteMaxTerm) {
      totalMonths = absoluteMaxTerm;
      reductionReason = 'تم تقليص المدة لتتجاوز الضوابط العمرية أو لوائح جهة الإقراض.';
    } else {
      totalMonths = Math.max(minTermMonths, requested);
    }
  }

  // Limit minimum term
  if (totalMonths < minTermMonths) {
    totalMonths = minTermMonths;
  }

  // Set precise reduction explanations for the diagnostics log
  if (sectorId !== 'retired' && monthsBeforeRetirement >= 240 && totalMonths <= 300 && selectedMode === 'max') {
    reductionReason = 'تم تحديد مدة التمويل بـ 25 سنة كحد أقصى للمرحله قبل التقاعد وفق سياسة إدارة المخاطر لدى جهة التمويل.';
  } else if (totalMonths < maxTermMonths && selectedMode === 'max') {
    if (remainingMonthsToMaxAge < maxTermMonths && remainingMonthsToMaxAge <= ruleLimitTerm) {
      reductionReason = `تم تقليص مدة التمويل لتتجاوز العمر الأقصى للعميل عند نهاية التمويل البالغ ${maxAgeAtEnd} سنة.`;
    } else if (ruleLimitTerm < maxTermMonths) {
      const displayAge = displayRetirementAge ?? Math.round(retirementAge);
      reductionReason = `تم تقليص مدة التمويل بسبب بلوغ سن التقاعد (${displayAge} سنة) مع الحدود المسموح بها بعد التقاعد.`;
    }
  }

  // Distribute actual before vs after retirement months
  let actualMonthsBefore = 0;
  let actualMonthsAfter = 0;

  if (sectorId === 'retired') {
    actualMonthsBefore = 0;
    actualMonthsAfter = totalMonths;
  } else {
    actualMonthsBefore = Math.min(totalMonths, monthsBeforeRetirement, 300);
    actualMonthsAfter = Math.max(0, totalMonths - actualMonthsBefore);
  }

  return {
    monthsBeforeRetirement: actualMonthsBefore,
    monthsAfterRetirement: actualMonthsAfter,
    totalMonths,
    totalYears: Number((totalMonths / 12).toFixed(1)),
    reductionReason,
    selectedTermMode: selectedMode,
    currentAgeMonths,
    remainingMonthsToMaxAge,
    calendarUsed: calendarType,
    ruleSource
  };
}
