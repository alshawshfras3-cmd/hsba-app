// src/lib/date-utils.ts

// Helper: Gregorian to Julian Day Number (JDN)
export function gregorianToJdn(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = Math.floor(A / 4);
  const C = 2 - A + B;
  const E = Math.floor(365.25 * (y + 4716));
  const F = Math.floor(30.6001 * (m + 1));
  return C + day + E + F - 1524;
}

// Helper: JDN to Gregorian
export function jdnToGregorian(jd: number): { year: number; month: number; day: number } {
  const z = Math.floor(jd + 0.5);
  const f = (jd + 0.5) - z;
  let A = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + f;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year: Math.round(year), month: Math.round(month), day: Math.round(day) };
}

// Helper: Hijri to JDN
export function hijriToJdn(year: number, month: number, day: number): number {
  return Math.floor((11 * year + 3) / 30) + 354 * year + 30 * month - Math.floor((month - 1) / 2) + day + 1948440 - 385;
}

// Helper: JDN to Hijri
export function jdnToHijri(jd: number): { year: number; month: number; day: number } {
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  
  // Calculate index j
  const step1 = Math.floor((10985 - l) / 5316);
  const step2 = Math.floor((50 * l) / 17719);
  const step3 = Math.floor(l / 5670);
  const step4 = Math.floor((43 * l) / 15248);
  const j = step1 * step2 + step3 * step4;
  
  // Apply coefficients
  const term1 = Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50);
  const term2 = Math.floor(j / 16) * Math.floor((15248 * j) / 43);
  l = l - term1 - term2 + 29;
  
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

// Public API converters
export function convertHijriToGregorian(y: number, m: number, d: number): { year: number; month: number; day: number } {
  const jd = hijriToJdn(y, m, d);
  return jdnToGregorian(jd);
}

export function convertGregorianToHijri(y: number, m: number, d: number): { year: number; month: number; day: number } {
  const jd = gregorianToJdn(y, m, d);
  return jdnToHijri(jd);
}

// Get standardized date representation in specific calendar
export function getStandardizedDate(
  year: number,
  month: number,
  day: number,
  sourceCalendar: 'gregorian' | 'hijri',
  targetCalendar: 'gregorian' | 'hijri'
): { year: number; month: number; day: number } {
  if (sourceCalendar === targetCalendar) {
    return { year, month, day };
  }
  if (sourceCalendar === 'hijri' && targetCalendar === 'gregorian') {
    return convertHijriToGregorian(year, month, day);
  } else {
    return convertGregorianToHijri(year, month, day);
  }
}

// Calculate months between two dates in specific calendar
export function calculateMonthsBetween(
  start: { year: number; month: number; day: number },
  end: { year: number; month: number; day: number }
): number {
  let months = (end.year - start.year) * 12 + (end.month - start.month);
  if (end.day < start.day) {
    months -= 1;
  }
  return Math.max(0, months);
}

// Calculate current age in months based on preferred calendar
export function getAgeInMonths(
  birth: { year: number; month: number; day: number; calendar: 'gregorian' | 'hijri' },
  today: Date,
  targetCalendar: 'gregorian' | 'hijri'
): number {
  const todayGreg = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  const birthInTarget = getStandardizedDate(birth.year, birth.month, birth.day, birth.calendar, targetCalendar);
  const todayInTarget = targetCalendar === 'hijri'
    ? convertGregorianToHijri(todayGreg.year, todayGreg.month, todayGreg.day)
    : todayGreg;

  return calculateMonthsBetween(birthInTarget, todayInTarget);
}

// Calculate service tenure in months
export function getServiceTenureInMonths(
  appointment: { year: number; month: number; day: number; calendar: 'gregorian' | 'hijri' },
  today: Date,
  targetCalendar: 'gregorian' | 'hijri'
): number {
  const todayGreg = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  const appInTarget = getStandardizedDate(appointment.year, appointment.month, appointment.day, appointment.calendar, targetCalendar);
  const todayInTarget = targetCalendar === 'hijri'
    ? convertGregorianToHijri(todayGreg.year, todayGreg.month, todayGreg.day)
    : todayGreg;

  return calculateMonthsBetween(appInTarget, todayInTarget);
}
