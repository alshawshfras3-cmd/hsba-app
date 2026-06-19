export function combineToRetirementRules(
  salRules: any[],
  penRules: any[]
): any[] {
  const rulesMap = new Map<string, any>();

  for (const s of salRules) {
    const key = `${s.bankId}||${s.sectorId}`;
    if (!rulesMap.has(key)) {
      rulesMap.set(key, { bankId: s.bankId, sectorId: s.sectorId });
    }
    const r = rulesMap.get(key)!;
    let source = 'basic_housing';
    if (s.salarySource === 'basic_only') source = 'basic_only';
    else if (s.salarySource === 'basic_housing') source = 'basic_housing';
    else if (s.salarySource === 'gross' || s.salarySource === 'basic_housing_allowances') source = 'basic_housing_allowances';
    else if (s.salarySource === 'net_salary') source = 'net_salary';
    else if (s.salarySource === 'manual' || s.salarySource === 'custom_multiplier') source = 'manual';

    r.approvedSalarySource = source;
    r.approvedSalaryMultiplier = s.multiplier ?? 1.0;
    r.id = s.id;
  }

  for (const p of penRules) {
    const key = `${p.bankId}||${p.sectorId}`;
    if (!rulesMap.has(key)) {
      rulesMap.set(key, { bankId: p.bankId, sectorId: p.sectorId });
    }
    const r = rulesMap.get(key)!;
    r.calculationMethod = p.calculationMethod || 'service_based';
    r.divisorMonths = p.divisorMonths;
    r.yearsThreshold = p.yearsThreshold;
    r.rateBelowThreshold = p.rateBelowThreshold;
    r.rateAboveThreshold = p.rateAboveThreshold;
    if (!r.id) r.id = p.id;
  }

  return Array.from(rulesMap.values());
}
