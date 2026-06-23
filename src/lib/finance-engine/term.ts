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
  isAgeLimitingFactor?: boolean;
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
  postRetirementMode?: 'dynamic' | 'fixed';
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
    ruleSource,
    postRetirementMode
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
    if (sectorId === 'military' && (!postRetirementMode || postRetirementMode === 'dynamic')) {
      monthsAfterRetirement = Math.max(0, Math.round((maxAgeAtEnd - retirementAge) * 12));
    } else {
      monthsAfterRetirement = allowedMonthsAfterRetirement;
    }
  }

  // 4. Max months permitted by the age at the end of financing
  const maxAgeAtEndMonths = maxAgeAtEnd * 12;
  const remainingMonthsToMaxAge = Math.max(0, maxAgeAtEndMonths - currentAgeMonths);

  // Hierarchical Capping Logic:
  // - Start from absolute maxTermMonths from rules
  let absoluteMaxTerm = maxTermMonths;
  let isAgeLimitingFactor = false;

  // Level A: Cap by max age at end of financing
  if (absoluteMaxTerm > remainingMonthsToMaxAge) {
    absoluteMaxTerm = remainingMonthsToMaxAge;
    isAgeLimitingFactor = true;
  }

  // Level B: Cap by sector statutory service rules (months before + allowed months after retirement)
  const ruleLimitTerm = sectorId === 'retired'
    ? maxTermMonths
    : (monthsBeforeRetirement + monthsAfterRetirement);

  if (absoluteMaxTerm > ruleLimitTerm) {
    absoluteMaxTerm = ruleLimitTerm;
    // If the sector service rules capped it even further than the age cap did,
    // then age limit is NOT the active limiting constraint!
    isAgeLimitingFactor = false;
  }

  // Selected Modes
  let totalMonths = absoluteMaxTerm;
  let reductionReason = '';

  if (selectedMode === 'until_retirement' && sectorId !== 'retired') {
    totalMonths = Math.min(absoluteMaxTerm, monthsBeforeRetirement);
    isAgeLimitingFactor = false;
    reductionReason = 'تم تحديد مدة التمويل لتنتهي عند التقاعد بناءً على طلبك.';
  } else if (selectedMode === 'manual') {
    const requested = manualTermMonths;
    if (requested > absoluteMaxTerm) {
      totalMonths = absoluteMaxTerm;
      const reqYears = Math.round(requested / 12);
      const absYears = Math.round(absoluteMaxTerm / 12);
      if (absoluteMaxTerm === maxTermMonths) {
        reductionReason = `اختار المستخدم ${reqYears} سنة، لكن أقصى مدة لدى البنك ${absYears} سنة، لذلك تم الحساب على ${absYears} سنة.`;
      } else {
        reductionReason = `اختار المستخدم ${reqYears} سنة، لكن أقصى مدة مسموحة بعد تطبيق الضوابط العمرية واللوائح هي ${absYears} سنة، لذلك تم الحساب على ${absYears} سنة.`;
      }
    } else {
      totalMonths = Math.max(minTermMonths, requested);
      isAgeLimitingFactor = false;
    }
  }

  // Limit minimum term
  if (totalMonths < minTermMonths) {
    totalMonths = minTermMonths;
  }

  // Set precise reduction explanations for the diagnostics log
  if (totalMonths < maxTermMonths && selectedMode === 'max') {
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
    actualMonthsBefore = Math.min(totalMonths, monthsBeforeRetirement);
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
    ruleSource,
    isAgeLimitingFactor
  };
}
