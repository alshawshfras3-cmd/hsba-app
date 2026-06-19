export function mapPayloadToEngineInput(payload: any, appSettings: any) {
  const { customer, finance } = payload;

  const [birthYear, birthMonth, birthDay] = customer.birthDate.split('-').map(Number);
  
  let appointmentYear = undefined;
  let appointmentMonth = undefined;
  let appointmentDay = 1;
  if (customer.employmentDate) {
    const parts = customer.employmentDate.split('-').map(Number);
    appointmentYear = parts[0];
    appointmentMonth = parts[1];
    appointmentDay = parts[2] || 1;
  }

  // 1. Sector mapping
  let mappedSectorId = 'gov_civil';
  const sector = customer.employmentSector;
  if (sector === 'government_civilian' || sector === 'gov_civil') {
    mappedSectorId = 'gov_civil';
  } else if (sector === 'semi_gov') {
    mappedSectorId = 'semi_gov';
  } else if (sector === 'companies' || sector === 'company' || sector === 'private') {
    mappedSectorId = 'companies';
  } else if (sector === 'military') {
    mappedSectorId = 'military';
  } else if (sector === 'retired') {
    mappedSectorId = 'retired';
  }

  // 2. Product ID mapping
  let mappedProductId = 'real_estate_only';
  const pType = finance.type;
  if (pType === 'real_estate' || pType === 'real_estate_only') {
    mappedProductId = 'real_estate_only';
  } else if (pType === 'personal' || pType === 'personal_only') {
    mappedProductId = 'personal_only';
  } else if (pType === 'real_estate_with_personal' || pType === 'real_estate_with_new_personal') {
    mappedProductId = 'real_estate_with_new_personal';
  } else if (pType === 'real_estate_with_existing_personal' || pType === 'real_estate_with_personal_existing') {
    mappedProductId = 'real_estate_with_existing_personal';
  }

  // 3. Support Mapping
  let resolvedSupportType = finance.supportType || 'none';
  let etizazAmount = 0;
  
  if (resolvedSupportType === 'etizaz') {
    resolvedSupportType = 'none';
    const etizazConfig = appSettings?.supportSettings?.etizaz;
    if (etizazConfig?.enabled !== false) {
      const allowedSectors = etizazConfig?.eligibleSectors || ['military'];
      if (allowedSectors.includes(mappedSectorId)) {
        etizazAmount = Number(etizazConfig?.amount ?? 160000);
      }
    }
  } else if (resolvedSupportType === 'none' || resolvedSupportType === 'monthly' || resolvedSupportType === 'downpayment') {
    // Valid support types
  } else {
    resolvedSupportType = 'none';
  }

  // 4. Term Mode & length
  const termMode = finance.termYears ? 'custom' : 'auto';
  const manualTermMonths = finance.termYears ? Number(finance.termYears) * 12 : 300;

  // Assemble full engine-compliant inputs
  return {
    sectorId: mappedSectorId,
    productId: mappedProductId,
    birthYear,
    birthMonth,
    birthDay,
    birthCalendar: 'gregorian' as const,
    appointmentYear,
    appointmentMonth,
    appointmentDay,
    appointmentCalendar: 'gregorian' as const,
    salaryMode: customer.basicSalary ? 'details' : 'direct' as const,
    basicSalary: customer.basicSalary ? Number(customer.basicSalary) : 0,
    housingAllowance: customer.housingAllowance ? Number(customer.housingAllowance) : 0,
    otherAllowances: customer.otherAllowances ? Number(customer.otherAllowances) : 0,
    directNetSalary: Number(customer.salary),
    directPensionSalary: Number(customer.salary),
    obligations: customer.obligations ? Number(customer.obligations) : 0,
    supportType: resolvedSupportType,
    selectedBankId: finance.preferredBank || 'all',
    termMode,
    manualTermMonths,
    etizazAmount,
    
    // Pass existing state from appSettings config
    banks: appSettings.banks || [],
    products: appSettings.products || [],
    militaryRanks: appSettings.militaryRanks || [],
    salaryRules: appSettings.salaryRules || [],
    pensionRules: appSettings.pensionRules || [],
    marginRules: appSettings.marginRules || [],
    dsrRules: appSettings.dsrRules || [],
    supportSettings: appSettings.supportSettings || {},
    housingSupportTiers: appSettings.housingSupportTiers || [],
    advancePaymentTiers: appSettings.advancePaymentTiers || [],
    personalRules: appSettings.personalRules || [],
    termRules: appSettings.termRules || [],
    approvedSalaryDbRules: appSettings.approvedSalaryDbRules || appSettings.approvedSalaryRules || [],
    pensionDbRules: appSettings.pensionDbRules || [],
    sectorMappings: appSettings.sectorMappings || [],
    bankSectorRules: appSettings.bankSectorRules || [],
    customSectors: appSettings.customSectors || []
  };
}
