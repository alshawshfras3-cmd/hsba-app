import { SupportSettings } from '../types';

export const initialSupportSettings: SupportSettings = {
  addDownpaymentToLoan: false, // Default: false (does not add downpayment to loan size, adds to total buying power)
  addMonthlyToInstallment: true, // Default: true (reduces actual payable or increases loan size)
  monthlyBrackets: [
    { fromSalary: 0, toSalary: 3000, supportAmount: 1350 },
    { fromSalary: 3001, toSalary: 4000, supportAmount: 1206 },
    { fromSalary: 4001, toSalary: 4999, supportAmount: 1073 },
    { fromSalary: 5000, toSalary: 5999, supportAmount: 955 },
    { fromSalary: 6000, toSalary: 6999, supportAmount: 850 },
    { fromSalary: 7000, toSalary: 7999, supportAmount: 757 },
    { fromSalary: 8000, toSalary: 8999, supportAmount: 673 },
    { fromSalary: 9000, toSalary: 10000, supportAmount: 599 },
    { fromSalary: 10001, toSalary: 999999, supportAmount: 416 }
  ],
  downpaymentBrackets: [
    { fromSalary: 0, toSalary: 10000, supportAmount: 150000 },
    { fromSalary: 10001, toSalary: 999999, supportAmount: 100000 }
  ],
  etizaz: {
    enabled: true,
    amount: 160000,
    isRefundable: true,
    eligibleSectors: ['military'],
    label: 'دعم اعتزاز للعسكريين',
    notes: 'دفعة مستردة خاصة بالعسكريين المؤهلين'
  }
};
export const initialSupportRules = initialSupportSettings; // Aliasing for clarity
