export type SectorId =
  | 'gov_civil'          // مدني حكومي — سن تقاعد ثابت
  | 'military'           // عسكري
  | 'semi_gov'           // شبه حكومي — سن تقاعد ثابت
  | 'companies'          // موظف شركات — سن تقاعد ثابت
  | 'retired';           // متقاعد
export type CalendarType = 'hijri' | 'gregorian';
export type ProductId = 'real_estate' | 'personal' | 'both' | 'real_estate_with_personal_existing' | 'real_estate_only' | 'personal_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal';
export type SupportType = 'none' | 'monthly' | 'downpayment';
export type TermMode = 'max' | 'until_retirement' | 'manual';
export type CalculationStatus = 'approved' | 'rejected' | 'warning';

export interface Bank {
  id: string; // e.g. 'alahli', 'rajhi'
  institutionType: 'bank' | 'finance_company';
  nameAr: string;
  nameEn: string;
  logoColor: string; // for custom stylized fintech logos
  logoText: string;
  isActive: boolean;
  calendarType: CalendarType;
  maxTermMonths: number;
  maxAgeAtEnd: number;
  monthsAfterRetirement: number;
  allowAfterRetirement: boolean;
  displayOrder: number;
  internalNotes?: string;
}

export interface ProductAcceptance {
  id: string;
  bankId: string;
  productId: ProductId;
  allowedSectors: SectorId[];
  minAge: number;
  maxAge: number;
  minSalary: number;
  minServiceMonths: number;
  allowMonthlySupport: boolean;
  allowDownpaymentSupport: boolean;
  allowUnsupported: boolean;
  allowAfterRetirement: boolean;
  isActive: boolean;
  defaultRejectionMessage: string;
}

export interface Sector {
  id: SectorId;
  nameAr: string;
  deductionPercentage: number; // e.g., 9% for government
  deductionBase: 'basic_housing' | 'basic_only' | 'total';
  needsServiceDate: boolean;
  needsRank: boolean;
  defaultRetirementAge: number;
  pensionMultiplier: number; // e.g., 480 or 420
  isActive: boolean;
}

export interface MilitaryRank {
  id: string;
  nameAr: string;
  retirementAge: number; // different for each military rank
  pensionMultiplier: number; // e.g. 420
  displayOrder: number;
  isActive: boolean;
  sectorScope?: 'enlisted' | 'officer';
}

export interface NetSalaryRule {
  sectorId: SectorId;
  deductionPercentage: number;
  deductionBase: 'basic_housing' | 'basic_only' | 'total';
  deductFromAllowances: boolean;
  allowDirectInput: boolean;
  roundResult: boolean;
  isActive: boolean;
}

export interface PensionRule {
  sectorId: SectorId;
  rankId?: string; // or 'all'
  retirementAge: number;
  pensionMultiplier: number;
  ageCalcCalendar: CalendarType;
  serviceCalcCalendar: CalendarType;
  roundServiceMonths: boolean;
  isActive: boolean;
}

export interface TermRule {
  bankId: string;
  sectorId: SectorId;
  militarySubType?: 'officer' | 'enlisted' | 'all';
  rankId: string; // or 'all'
  productId: ProductId;
  supportType: 'all' | SupportType;
  maxTermMonths: number;
  allowedMonthsAfterRetirement: number;
  maxAgeAtEnd: number;
  allowAfterRetirement: boolean;
  calendarType: CalendarType;
  minTermMonths: number;
  defaultTermMode: TermMode;
  isActive: boolean;
}

export interface MarginRule {
  id: string;
  bankId: string;
  productId: ProductId;
  supportType: 'all' | SupportType;
  sectorId: 'all' | SectorId;
  fromTermMonths: number;
  toTermMonths: number;
  startMargin: number; // e.g. 2.5 represents 2.5%
  endMargin: number; // e.g. 3.5 represents 3.5%
  calcType: 'fixed' | 'linear';
  isActive: boolean;
}

export interface DsrRule {
  id: string;
  bankId: string;
  productType: 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only';
  supportType: 'none' | 'monthly' | 'down_payment';
  customerStage: 'before_retirement' | 'after_retirement';
  dsrPercent: number;
  deductExistingObligations: boolean;
  active: boolean;
}

export interface SupportMonthlyBracket {
  fromSalary: number;
  toSalary: number;
  supportAmount: number;
}

export interface SupportDownpaymentBracket {
  fromSalary: number;
  toSalary: number;
  supportAmount: number;
}

export interface SupportSettings {
  addDownpaymentToLoan: boolean; // default: false
  addMonthlyToInstallment: boolean; // default: true
  monthlyBrackets: SupportMonthlyBracket[];
  downpaymentBrackets: SupportDownpaymentBracket[];
}

export interface PersonalFinanceRules {
  id?: string;
  bankId: string;
  sectorId: 'all' | SectorId;
  dsrPercentage: number; // e.g. 33
  termMonths: number; // e.g. 60
  financeCoefficient: number; // e.g. 50.4
  annualMargin: number; // e.g. 1.99
  minSalary: number;
  minAge: number;
  maxAge: number;
  retireeDsrPercentage: number; // e.g. 25
  isActive: boolean;
  calculationMethod?: 'multiplier' | 'pmt' | 'flat_rate';
  pathType?: 'personal_only' | 'real_estate_with_new_personal';
  customerStatus?: 'active_employee' | 'retired';
}

export interface AdvancedRule {
  id: string;
  name: string;
  bankId: 'all' | string;
  productId: 'all' | ProductId;
  sectorId: 'all' | SectorId;
  conditionFormula: string; // simple readable formula or script
  actionType: 'reject' | 'warn' | 'apply_modifier';
  actionValue: string;
  priority: number;
  isActive: boolean;
}

export interface CalculationLog {
  id: string;
  timestamp: string;
  bankId: string;
  productId: ProductId;
  netSalary: number;
  termMonths: number;
  margin: number;
  dsrBefore: number;
  financeAmount: number;
  status: CalculationStatus;
  rejectionReason?: string;
  diagnosticSteps: string[];
}

export interface UserSubscription {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  plan: 'free' | 'premium' | 'enterprise';
  calculationsCount: number;
  expiryDate: string;
  isActive: boolean;
}

// Outputs from each sub-engine
export interface NetSalaryOutput {
  grossSalary: number;
  deductionAmount: number;
  netSalary: number;
  calculationMethod: 'direct' | 'details';
  breakdown?: any;
}

export interface PensionOutput {
  retirementAge: number;
  currentAgeMonths: number;
  monthsUntilRetirement: number;
  serviceMonthsAtRetirement: number;
  pensionSalary: number;
}

export interface TermOutput {
  monthsBeforeRetirement: number;
  monthsAfterRetirement: number;
  totalMonths: number;
  totalYears: number;
  reductionReason: string;
  selectedTermMode: TermMode;
}

export interface HousingSupportOutput {
  monthlySupport: number;
  downPaymentSupport: number;
  supportType: SupportType;
  appliedRule: string;
}

export interface DsrOutput {
  dsrPercentage: number;
  maxInstallment: number;
  ruleUsed: string;
}

export interface MarginOutput {
  annualMargin: number;
  marginType: 'fixed' | 'linear';
  ruleUsed: string;
  interpolationDetails?: string;
}

export interface PersonalFinanceOutput {
  personalFinanceAmount: number;
  monthlyInstallment: number;
  totalRepayment: number;
  profitAmount: number;
  totalProfitPercentage: number;
  termMonths: number;
  calculationMethod?: 'multiplier' | 'pmt' | 'flat_rate';
  multiplier?: number;
  diagnostics?: {
    ruleId?: string;
    bankId: string;
    customerStatus: string;
    pathType: string;
    dsr: number;
    termMonths: number;
    calculationMethod: string;
    multiplier?: number;
    flatRate?: number;
    source: 'bank_specific' | 'default_bank' | 'fallback';
    error?: string;
  };
}

export interface RealEstateFinanceOutput {
  realEstateFinanceAmount: number;
  monthlyInstallmentBeforeRetirement: number;
  monthlyInstallmentAfterRetirement: number;
  totalCashflow: number;
  totalRepayment: number;
  profitAmount: number;
  housingSupportAmount: number;
  totalPurchasingPower: number;
  annualMargin: number;
  termMonths: number;
}

export interface DiagnosticResult {
  status: CalculationStatus;
  messages: string[];
  calculationSteps: string[];
}

// Master Client Calculation Result Item per Bank
export interface BankCalculationResult {
  bankId: string;
  bankName: string;
  logoColor: string;
  logoText: string;
  status: CalculationStatus;
  isEligible: boolean;
  realEstateAmount: number;
  personalAmount: number;
  housingSupportAmount: number;
  supportType?: 'none' | 'monthly' | 'downpayment';
  totalPurchasingPower: number;
  monthlyInstallmentBeforeRetirement: number;
  monthlyInstallmentAfterRetirement: number;
  termMonths: number;
  annualMargin: number;
  dsrUsed: number;
  personalCoefficient?: number;
  personalTotalRepayment?: number;
  personalProfitAmount?: number;
  personalCalculationMethod?: 'multiplier' | 'pmt' | 'flat_rate';
  personalDiagnostics?: any;
  rejectionReason?: string;
  netSalary: number;
  retirementAge: number;
  pensionSalary: number;
  pensionDiagnostic?: any;
  monthlyInstallmentAfterPersonal?: number;
  personalInstallmentAmount?: number;
  realEstateInstallmentOnly?: number;
  diagnostics?: any;
  existingMonthlyObligations?: number;
  obligationRemainingMonths?: number;
  realEstateStage1?: number;
  totalCustomerStage1?: number;
  realEstateStage2?: number;
  realEstateStage3?: number;
  stage1Months?: number;
  stage2Months?: number;
  stage3Months?: number;
  diagnosticMessages: string[];
  diagnosticSteps: string[];
  isAgeLimitingFactor?: boolean;
}

export interface SavedResult {
  id: string;
  user_id?: string;
  created_at: string;
  title: string;
  finance_type: string;
  sector: string;
  bank_name: string;
  real_estate_amount: number;
  personal_amount: number;
  monthly_installment: number;
  term_months: number;
  support_type: string;
  net_salary: number;
  profit_margin: number;
  eligibility_status: string;
  payload: BankCalculationResult;
  customer_name?: string;
}

export interface HousingSupportTier {
  id: string;
  min_salary: number;
  max_salary: number;
  amount_at_min: number;
  amount_at_max: number;
  sort_order: number;
}

export interface AdvancePaymentTier {
  id: string;
  salary_threshold: number;
  amount: number;
}

