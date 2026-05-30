export type SalarySource = 'basic_only' | 'basic_housing' | 'gross' | 'custom_multiplier' | 'basic_housing_allowances' | 'net_salary' | 'manual';
export type PensionMethod = 'service_based' | 'fixed_percentage' | 'direct';

export interface BankRetirementRule {
  id: string;
  bankId: string;
  sectorId: string;
  approvedSalarySource:
    | 'basic_only'
    | 'basic_housing'
    | 'basic_housing_allowances'
    | 'net_salary'
    | 'manual';
  approvedSalaryMultiplier: number;
  calculationMethod:
    | 'service_based'
    | 'fixed_percentage'
    | 'direct';
  divisorMonths?: number;
  yearsThreshold?: number;
  rateBelowThreshold?: number;
  rateAboveThreshold?: number;
  enabled: boolean;
  notes?: string;
}

export interface ApprovedSalarySourceRule {
  id: string;
  bankId: string;
  sectorId: string;
  salarySource: SalarySource;
  multiplier: number;
  descriptionAr?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PensionCalculationRule {
  id: string;
  bankId: string;
  sectorId: string;
  calculationMethod: PensionMethod;
  // service_based
  divisorMonths?: number;
  salarySourceOverride?: SalarySource;
  // fixed_percentage
  rateBelowThreshold?: number;
  rateAboveThreshold?: number;
  yearsThreshold?: number;
  descriptionAr?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionSetting {
  id: string;
  bankId: string;
  settingKey: string;
  settingValue: string;
  labelAr?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SectorClassificationMapping {
  id: string;
  bankId: string;
  sectorId: string;
  bankSectorId: string;
  labelAr?: string;
  createdAt?: string;
}

export interface RuleVersion {
  id: string;
  tableName: string;
  recordId: string;
  bankId: string;
  changedBy?: string;
  oldData?: any;
  newData?: any;
  changeNote?: string;
  createdAt?: string;
}

export interface PensionLibraryRule {
  id: string;
  name: string;
  calcMethod: 'service_growth' | 'fixed_percentage' | 'direct';
  salarySource: 'basic_only' | 'basic_housing' | 'net_salary' | 'manual';
  divisorYears?: number;
  growthRate?: number;
  growthMinYears?: number;
  growthMaxYears?: number;
  noGrowthAboveYears?: number;
  thresholdYears?: number;
  rateBelow?: number;
  rateAbove?: number;
  capAtApprovedSalary?: boolean;
  isActive: boolean;
  notes?: string;
  description?: string;
}

export interface BankSectorPensionRule {
  id: string; // e.g., bankId_sectorId
  bankId: string;
  sectorId: string;
  isActive: boolean;
  notes?: string;
  ruleId?: string; // Optional legacy fallback
  isCustomized?: boolean; // Optional legacy fallback
  customRuleName?: string; // Optional legacy fallback
  
  // Real concrete rules direct configuration parameters
  salarySource?: 'basic_only' | 'basic_housing' | 'net_salary' | 'manual';
  calcMethod?: 'service_growth' | 'fixed_percentage' | 'direct';
  divisorYears?: number;
  growthRate?: number;
  growthMinYears?: number;
  growthMaxYears?: number;
  noGrowthAboveYears?: number;
  thresholdYears?: number;
  rateBelow?: number;
  rateAbove?: number;
  capAtApprovedSalary?: boolean;
}

