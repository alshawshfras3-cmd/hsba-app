import { NetSalaryRule } from '../types';

export const initialSalaryRules: NetSalaryRule[] = [
  {
    sectorId: 'gov_civil',
    deductionPercentage: 9.0, // 9% deduction towards Pension Agency
    deductionBase: 'basic_housing',
    deductFromAllowances: false,
    allowDirectInput: true,
    roundResult: true,
    isActive: true
  },
  {
    sectorId: 'semi_gov',
    deductionPercentage: 9.0,
    deductionBase: 'basic_housing',
    deductFromAllowances: false,
    allowDirectInput: true,
    roundResult: true,
    isActive: true
  },
  {
    sectorId: 'companies',
    deductionPercentage: 9.75, // GOSI
    deductionBase: 'basic_housing',
    deductFromAllowances: false,
    allowDirectInput: true,
    roundResult: true,
    isActive: true
  },
  {
    sectorId: 'military',
    deductionPercentage: 9.0, // 9% military retirement deduction
    deductionBase: 'basic_housing',
    deductFromAllowances: false,
    allowDirectInput: true,
    roundResult: true,
    isActive: true
  },
  {
    sectorId: 'retired',
    deductionPercentage: 0.0,
    deductionBase: 'total',
    deductFromAllowances: false,
    allowDirectInput: true,
    roundResult: true,
    isActive: true
  }
];
