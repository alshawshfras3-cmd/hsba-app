export function sanitizeBankResponse(engineResults: any[], propertyPrice?: number) {
  if (!Array.isArray(engineResults) || engineResults.length === 0) {
    return {
      eligible: false,
      status: 'not_eligible' as const,
      summary: {
        maxRealEstateFinance: 0,
        maxPersonalFinance: 0,
        estimatedInstallment: 0,
        totalAvailable: 0,
        propertyGap: null,
        recommendedBank: null
      },
      banks: [],
      notes: [
        'لم يتم العثور على عرض مؤهل بناءً على البيانات المدخلة.',
        'هذه النتيجة تقديرية وليست موافقة تمويلية نهائية.'
      ]
    };
  }

  // Map all results to public-safe bank summaries
  const publicBanks = engineResults.map((r: any) => ({
    bankId: r.bankId,
    bankName: r.bankName,
    eligible: !!r.isEligible,
    status: (r.isEligible ? 'approved' : 'rejected') as 'approved' | 'rejected',
    realEstateFinance: Number(r.realEstateAmount ?? 0),
    personalFinance: Number(r.personalAmount ?? 0),
    totalAvailable: Number(r.totalPurchasingPower ?? 0),
    estimatedInstallment: Number(r.monthlyInstallmentBeforeRetirement ?? 0),
    termMonths: Number(r.termMonths ?? 0)
  }));

  // Filter eligible options
  const eligibleBanks = publicBanks.filter(b => b.eligible);

  if (eligibleBanks.length === 0) {
    return {
      eligible: false,
      status: 'not_eligible' as const,
      summary: {
        maxRealEstateFinance: 0,
        maxPersonalFinance: 0,
        estimatedInstallment: 0,
        totalAvailable: 0,
        propertyGap: null,
        recommendedBank: null
      },
      banks: [],
      notes: [
        'لم يتم العثور على عرض مؤهل بناءً على البيانات المدخلة.',
        'هذه النتيجة تقديرية وليست موافقة تمويلية نهائية.'
      ]
    };
  }

  // Sort eligible banks to find recommended (best option)
  // Best option has standard highest totalAvailable, then highest realEstateFinance
  const sortedEligible = [...eligibleBanks].sort((a, b) => {
    if (b.totalAvailable !== a.totalAvailable) {
      return b.totalAvailable - a.totalAvailable;
    }
    return b.realEstateFinance - a.realEstateFinance;
  });

  const bestBank = sortedEligible[0];

  // Calculate property gap if propertyPrice exists and is positive
  let propertyGap: number | null = null;
  if (propertyPrice && propertyPrice > 0) {
    propertyGap = Math.max(0, propertyPrice - bestBank.totalAvailable);
  }

  return {
    eligible: true,
    status: 'eligible' as const,
    summary: {
      maxRealEstateFinance: bestBank.realEstateFinance,
      maxPersonalFinance: bestBank.personalFinance,
      estimatedInstallment: bestBank.estimatedInstallment,
      totalAvailable: bestBank.totalAvailable,
      propertyGap,
      recommendedBank: bestBank.bankId
    },
    banks: publicBanks,
    notes: [
      'هذه النتيجة تقديرية وليست موافقة تمويلية نهائية.'
    ]
  };
}
