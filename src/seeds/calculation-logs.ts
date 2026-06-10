import { CalculationLog } from '../types';

export const initialCalculationLogs: CalculationLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-05-25T18:45:10Z',
    bankId: 'rajhi',
    productId: 'real_estate_only',
    netSalary: 12500,
    termMonths: 300,
    margin: 3.45,
    dsrBefore: 65,
    financeAmount: 1845100,
    status: 'approved',
    diagnosticSteps: [
      'حساب صافي الراتب: تم اعتماد الصافي المدخل 12,500 ريال.',
      'حساب السن: العميل يبلغ 34 عامًا ولديه 432 شهرًا حتى سن التقاعد.',
      'حساب مدة التمويل: تم اعتماد 300 شهر (الحد الأقصى للتمويل بالراجحي).',
      'حساب الدعم: العميل مؤهل لدعم شهري بمبلغ 416 ريال.',
      'نسبة الاستقطاع (DSR): تم تخصيص 65% للتمويل المدعوم بمعدل قسط أقصى 8,125 ريال.',
      'الهامش السنوي: تم احتساب هامش 3.45% بالتدرج الخطي لـ 25 عامًا.',
      'مبلغ التمويل: القدرة التمويلية الإيجابية الصافية تبلغ 1,845,100 ريال.'
    ]
  },
  {
    id: 'log_02',
    timestamp: '2026-05-25T18:50:22Z',
    bankId: 'fransi',
    productId: 'real_estate_only',
    netSalary: 4500,
    termMonths: 240,
    margin: 2.50,
    dsrBefore: 55,
    financeAmount: 0,
    status: 'rejected',
    rejectionReason: 'تم رفض البنك لأن الراتب أقل من الحد الأدنى للفرنسي البالغ 7,000 ريال.',
    diagnosticSteps: [
      'حساب صافي الراتب: الراتب الإجمالي 4,500 ريال.',
      'التحقق من أهلية المنتج: الراتب المدخل 4,500 ريال أقل من حد القبول للفرنسي (7,000 ريال).',
      'الحالة النهائية: تم رفض التمويل لعدم تلبية معيار دخل القبول.'
    ]
  }
];
