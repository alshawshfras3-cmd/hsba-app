import { PersonalFinanceRules } from '../types';

const banksList = ['all', 'alahli', 'rajhi', 'alinma', 'fransi', 'bidaya', 'albilad', 'alarabi'];

const rules: PersonalFinanceRules[] = [];

banksList.forEach((bankId) => {
  const marginValue = bankId === 'rajhi' ? 4.59 : (bankId === 'alahli' ? 5.00 : 4.80);

  // 1. Personal only + active_employee
  rules.push({
    id: `rule-${bankId}-personal-active`,
    bankId,
    sectorId: 'all',
    dsrPercentage: 33,
    termMonths: 60,
    financeCoefficient: 50.42,
    annualMargin: marginValue,
    minSalary: 4000,
    minAge: 18,
    maxAge: 65,
    retireeDsrPercentage: 25,
    isActive: true,
    calculationMethod: 'multiplier',
    pathType: 'personal_only',
    customerStatus: 'active_employee'
  });

  // 2. Personal only + retired
  rules.push({
    id: `rule-${bankId}-personal-retired`,
    bankId,
    sectorId: 'retired',
    dsrPercentage: 25,
    termMonths: 60,
    financeCoefficient: 50.42,
    annualMargin: marginValue,
    minSalary: 4000,
    minAge: 18,
    maxAge: 65,
    retireeDsrPercentage: 25,
    isActive: true,
    calculationMethod: 'multiplier',
    pathType: 'personal_only',
    customerStatus: 'retired'
  });

  // 3. Real estate with new personal + active_employee
  rules.push({
    id: `rule-${bankId}-realestate-active`,
    bankId,
    sectorId: 'all',
    dsrPercentage: 33,
    termMonths: 60,
    financeCoefficient: 50.42,
    annualMargin: marginValue,
    minSalary: 4000,
    minAge: 18,
    maxAge: 65,
    retireeDsrPercentage: 25,
    isActive: true,
    calculationMethod: 'multiplier',
    pathType: 'real_estate_with_new_personal',
    customerStatus: 'active_employee'
  });

  // 4. Real estate with new personal + retired
  rules.push({
    id: `rule-${bankId}-realestate-retired`,
    bankId,
    sectorId: 'retired',
    dsrPercentage: 25,
    termMonths: 60,
    financeCoefficient: 50.42,
    annualMargin: marginValue,
    minSalary: 4000,
    minAge: 18,
    maxAge: 65,
    retireeDsrPercentage: 25,
    isActive: true,
    calculationMethod: 'multiplier',
    pathType: 'real_estate_with_new_personal',
    customerStatus: 'retired'
  });
});

export const initialPersonalFinanceRules = rules;
