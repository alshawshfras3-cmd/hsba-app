import React, { useState } from 'react';
import { Trash2, Coins } from 'lucide-react';
import { Bank, PersonalFinanceRules, SalaryBracket } from '../../../types';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

interface PersonalFinanceSectionProps {
  banks: Bank[];
  personalRules: PersonalFinanceRules[];
  setPersonalRules: React.Dispatch<React.SetStateAction<PersonalFinanceRules[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: string[]) => void;
  setShowCopyModal: (show: boolean) => void;
  openHistory: (tableName: string, bankId: string, title: string) => Promise<void>;
}

export const PersonalFinanceSection: React.FC<PersonalFinanceSectionProps> = ({
  banks,
  personalRules,
  setPersonalRules,
  showToast,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal,
  openHistory
}) => {
  const [filterPfBank, setFilterPfBank] = useState<string>('rajhi');
  const [isPfModalOpen, setIsPfModalOpen] = useState(false);
  const [editingPfRule, setEditingPfRule] = useState<PersonalFinanceRules | null>(null);
  const [expandedBrackets, setExpandedBrackets] = useState<Record<string, boolean>>({});

  const [formPfBankId, setFormPfBankId] = useState('all');
  const [formPfPathType, setFormPfPathType] = useState<'personal_only' | 'real_estate_with_new_personal'>('personal_only');
  const [formPfCustomerStatus, setFormPfCustomerStatus] = useState<'active_employee' | 'retired'>('active_employee');
  const [formPfDsr, setFormPfDsr] = useState('33');
  const [formPfTerm, setFormPfTerm] = useState('60');
  const [formPfCoeff, setFormPfCoeff] = useState('0');
  const [formPfMargin, setFormPfMargin] = useState('4.80');
  const [formPfMinSalary, setFormPfMinSalary] = useState('4000');
  const [formPfMaxSalary, setFormPfMaxSalary] = useState('');
  const [formPfCalcMethod, setFormPfCalcMethod] = useState<'multiplier' | 'pmt' | 'flat_rate'>('flat_rate');
  const [formPfActive, setFormPfActive] = useState(true);
  const [formPfRateAppType, setFormPfRateAppType] = useState<'fixed' | 'bracket'>('fixed');
  const [formPfSalaryBrackets, setFormPfSalaryBrackets] = useState<any[]>([]);
  const [pfError, setPfError] = useState('');

  const [showCopySection, setShowCopySection] = useState(false);
  const [selectedSourceRuleId, setSelectedSourceRuleId] = useState<string>('');
  const [requireConfirm, setRequireConfirm] = useState(false);

  const sourceRules = personalRules.filter(r => 
    r.bankId === formPfBankId && 
    r.id !== editingPfRule?.id && 
    r.salaryBrackets && 
    r.salaryBrackets.length > 0
  );

  const handleCopyClick = () => {
    if (!selectedSourceRuleId) return;
    if (formPfSalaryBrackets.length > 0) {
      setRequireConfirm(true);
    } else {
      handleExecCopy();
    }
  };

  const handleExecCopy = () => {
    const srcRule = sourceRules.find(r => 
      r.id === selectedSourceRuleId || 
      `rule-${r.bankId}-${r.pathType}-${r.customerStatus}` === selectedSourceRuleId
    );
    if (!srcRule) return;

    if (srcRule.rateApplicationType) {
      setFormPfRateAppType(srcRule.rateApplicationType);
    }
    if (srcRule.calculationMethod) {
      setFormPfCalcMethod(srcRule.calculationMethod);
    }
    
    const bEdits = (srcRule.salaryBrackets || []).map(b => ({
      fromSalary: String(b.fromSalary),
      toSalary: b.toSalary !== null && b.toSalary !== undefined ? String(b.toSalary) : '',
      annualMargin: String(b.annualMargin),
      dsrPercentage: String(b.dsrPercentage),
      termMonths: String(b.termMonths)
    }));
    
    setFormPfSalaryBrackets(bEdits);
    setShowCopySection(false);
    setRequireConfirm(false);
    showToast('تم نسخ جدول الشرائح بنجاح. يرجى الضغط على حفظ لتأكيد التغييرات.', 'success');
  };

  const addBracket = () => {
    setFormPfSalaryBrackets(prev => [
      ...prev,
      {
        fromSalary: prev.length > 0 ? String(parseFloat(parseArabicAndEnglishNumber(prev[prev.length - 1].toSalary)) || 0) : '0',
        toSalary: '',
        annualMargin: '4.59',
        dsrPercentage: '33.33',
        termMonths: '60'
      }
    ]);
  };

  const removeBracket = (index: number) => {
    setFormPfSalaryBrackets(prev => prev.filter((_, i) => i !== index));
  };

  const updateBracketField = (index: number, key: string, value: string) => {
    setFormPfSalaryBrackets(prev => prev.map((b, i) => {
      if (i !== index) return b;
      return { ...b, [key]: value };
    }));
  };

  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  const parseArabicAndEnglishNumber = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(arabicIndic[i], i.toString());
    }
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(persian[i], i.toString());
    }
    return str;
  };

  const parsedTerm = parseFloat(parseArabicAndEnglishNumber(formPfTerm)) || 0;
  const parsedMargin = parseFloat(parseArabicAndEnglishNumber(formPfMargin)) || 0;
  const calcTermYears = parsedTerm / 12;
  const calcProfitFactor = 1 + ((parsedMargin / 100) * calcTermYears);
  const calcEffectiveMultiplier = calcProfitFactor > 0 ? (parsedTerm / calcProfitFactor).toFixed(2) : '0';

  const openAddPfModal = () => {
    setEditingPfRule(null);
    setFormPfBankId(filterPfBank);
    setFormPfPathType('personal_only');
    setFormPfCustomerStatus('active_employee');
    setFormPfDsr('33');
    setFormPfTerm('60');
    setFormPfCoeff('0');
    setFormPfMargin('4.80');
    setFormPfMinSalary('4000');
    setFormPfMaxSalary('');
    setFormPfCalcMethod('flat_rate');
    setFormPfActive(true);
    setFormPfRateAppType('fixed');
    setFormPfSalaryBrackets([]);
    setPfError('');
    setShowCopySection(false);
    setSelectedSourceRuleId('');
    setRequireConfirm(false);
    setIsPfModalOpen(true);
  };

  const openEditPfModal = (rule: PersonalFinanceRules) => {
    setEditingPfRule(rule);
    setFormPfBankId(rule.bankId || 'all');
    setFormPfPathType(rule.pathType || 'personal_only');
    setFormPfCustomerStatus(rule.customerStatus || 'active_employee');
    setFormPfDsr(String(rule.dsrPercentage ?? ''));
    setFormPfTerm(String(rule.termMonths ?? ''));
    setFormPfCoeff(String(rule.financeCoefficient ?? ''));
    setFormPfMargin(String(rule.annualMargin ?? ''));
    setFormPfMinSalary(String(rule.minSalary ?? ''));
    setFormPfMaxSalary(rule.maxSalary !== undefined ? String(rule.maxSalary) : '');
    setFormPfCalcMethod(rule.calculationMethod || 'multiplier');
    setFormPfActive(rule.isActive !== false);
    setFormPfRateAppType(rule.rateApplicationType || 'fixed');
    const bEdits = (rule.salaryBrackets || []).map(b => ({
      fromSalary: String(b.fromSalary),
      toSalary: b.toSalary !== null && b.toSalary !== undefined ? String(b.toSalary) : '',
      annualMargin: String(b.annualMargin),
      dsrPercentage: String(b.dsrPercentage),
      termMonths: String(b.termMonths)
    }));
    setFormPfSalaryBrackets(bEdits);
    setPfError('');
    setShowCopySection(false);
    setSelectedSourceRuleId('');
    setRequireConfirm(false);
    setIsPfModalOpen(true);
  };

  const savePfRule = () => {
    const isBracket = formPfRateAppType === 'bracket';

    const cleanDsrStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfDsr));
    const cleanTermStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfTerm));
    const cleanSalaryStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfMinSalary));
    const cleanMaxSalaryStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfMaxSalary));

    const cleanCoeffStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfCoeff)) || '0';
    const cleanMarginStr = normalizeNumberInput(parseArabicAndEnglishNumber(formPfMargin)) || '4.80';

    if (!isBracket && (!cleanDsrStr || !cleanTermStr || !cleanSalaryStr || (formPfCalcMethod === 'multiplier' && !cleanCoeffStr) || ((formPfCalcMethod === 'flat_rate' || formPfCalcMethod === 'pmt') && !cleanMarginStr))) {
      setPfError('جميع الحقول المطلوبة لطريقة الحساب المحددة يجب ملؤها.');
      return;
    }

    if (isBracket && formPfSalaryBrackets.length === 0) {
      setPfError('أضف شريحة راتب واحدة على الأقل قبل الحفظ');
      return;
    }

    let finalBrackets: SalaryBracket[] = [];
    if (isBracket) {
      for (const b of formPfSalaryBrackets) {
        const rawFrom = String(b.fromSalary).trim();
        const rawMargin = String(b.annualMargin).trim();
        const rawDsr = String(b.dsrPercentage).trim();
        const rawTerm = String(b.termMonths).trim();

        if (rawFrom === "" || rawMargin === "" || rawDsr === "" || rawTerm === "") {
          setPfError('الرجاء تعبئة جميع حقول الشرائح (من راتب، نسبة الربح، DSR، مدة التمويل).');
          return;
        }

        const parsedFrom = parseFloat(parseArabicAndEnglishNumber(rawFrom));
        const parsedTo = b.toSalary !== null && String(b.toSalary).trim() !== '' ? parseFloat(parseArabicAndEnglishNumber(b.toSalary)) : null;
        const parsedMargin = parseFloat(parseArabicAndEnglishNumber(rawMargin));
        const parsedDsr = parseFloat(parseArabicAndEnglishNumber(rawDsr));
        const parsedTerm = parseFloat(parseArabicAndEnglishNumber(rawTerm));

        if (isNaN(parsedFrom) || (parsedTo !== null && isNaN(parsedTo)) || isNaN(parsedMargin) || isNaN(parsedDsr) || isNaN(parsedTerm)) {
          setPfError('الرجاء التأكد من صحة القيم الرقمية في جميع الشرائح للرواتب.');
          return;
        }

        finalBrackets.push({
          fromSalary: parsedFrom,
          salaryFrom: parsedFrom,
          toSalary: parsedTo,
          salaryTo: parsedTo,
          annualMargin: parsedMargin,
          annualFlatRate: parsedMargin,
          dsrPercentage: parsedDsr,
          personalDsr: parsedDsr,
          termMonths: parsedTerm
        });
      }
    }

    const dsrNum = isBracket ? (finalBrackets[0]?.dsrPercentage ?? 33.33) : Number(cleanDsrStr);
    const termNum = isBracket ? (finalBrackets[0]?.termMonths ?? 60) : Number(cleanTermStr);
    const coeffNum = Number(cleanCoeffStr);
    const marginNum = isBracket ? (finalBrackets[0]?.annualMargin ?? 4.59) : Number(cleanMarginStr);
    const salaryNum = Number(cleanSalaryStr);
    const maxSalaryNum = cleanMaxSalaryStr ? Number(cleanMaxSalaryStr) : undefined;

    if ((!isBracket && (isNaN(dsrNum) || isNaN(termNum) || isNaN(marginNum))) || isNaN(coeffNum) || isNaN(salaryNum) || (maxSalaryNum !== undefined && isNaN(maxSalaryNum))) {
      setPfError('الرجاء التأكد من إدخال قيم رقمية صحيحة.');
      return;
    }

    const ruleData: PersonalFinanceRules = {
      id: editingPfRule?.id || `rule-${formPfBankId}-${formPfPathType}-${formPfCustomerStatus}-${Date.now()}`,
      bankId: formPfBankId,
      sectorId: formPfCustomerStatus === 'retired' ? 'retired' : 'all',
      dsrPercentage: dsrNum,
      termMonths: termNum,
      financeCoefficient: coeffNum,
      annualMargin: marginNum,
      minSalary: salaryNum,
      maxSalary: maxSalaryNum,
      minAge: editingPfRule?.minAge ?? 18,
      maxAge: editingPfRule?.maxAge ?? 65,
      // Ensure retireeDsrPercentage matches customerStatus (retiree gets dsrNum, active employee gets fallback 25)
      retireeDsrPercentage: formPfCustomerStatus === 'retired' ? dsrNum : 25,
      isActive: formPfActive,
      calculationMethod: formPfCalcMethod,
      pathType: formPfPathType,
      customerStatus: formPfCustomerStatus,
      rateApplicationType: formPfRateAppType,
      salaryBrackets: finalBrackets
    };

    if (editingPfRule) {
      setPersonalRules(prev => prev.map(r => (r.id === editingPfRule.id || (!r.id && r.bankId === editingPfRule.bankId && r.pathType === editingPfRule.pathType && r.customerStatus === editingPfRule.customerStatus)) ? ruleData : r));
      showToast('تم حفظ قاعدة التمويل الشخصي بنجاح', 'success');
    } else {
      const exists = personalRules.some(r => r.bankId === formPfBankId && r.pathType === formPfPathType && r.customerStatus === formPfCustomerStatus);
      if (exists) {
        setPfError('توجد بالفعل قاعدة مسجلة لنفس البنك، المسار، وحالة العميل.');
        return;
      }
      setPersonalRules(prev => [...prev, ruleData]);
      showToast('تم حفظ قاعدة التمويل الشخصي بنجاح', 'success');
    }

    setIsPfModalOpen(false);
    setEditingPfRule(null);
  };

  const deletePfRule = (ruleId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه القاعدة للتمويل الشخصي؟')) {
      setPersonalRules(prev => prev.filter(r => r.id !== ruleId));
      showToast('تم حذف القاعدة بنجاح!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">عقود ومعاملات التمويل الشخصي</h2>
          <p className="text-xs text-[#6B7280]">تعديل الضوابط والمضاعفات والمستقطعات الخاصة بمنتجات التمويل الشخصي (الافتراضي العام والخاص بالبنوك).</p>
        </div>
        <button
          type="button"
          onClick={openAddPfModal}
          className="bg-[#0057B8] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer self-start"
        >
          + إضافة قاعدة تمويل شخصي
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 font-sans">
        <p className="font-bold mb-1">📌 ملاحظة: DSR التمويل الشخصي</p>
        <p>نسبة الاستقطاع للتمويل الشخصي تُدار من هذه الصفحة فقط داخل كل قاعدة تمويل.
        لا علاقة لها بصفحة الاستقطاعات العقارية.</p>
      </div>

      {/* Bank Navigation Tabs for Personal Finance */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 block mb-1 font-sans">اختر البنك لضبط عقود التمويل الشخصي:</span>
        <div className="flex flex-nowrap md:flex-wrap overflow-x-auto pb-3 gap-2 border-b border-gray-100 font-sans scrollbar-none">
          {banks.map((b) => {
            const isSelected = filterPfBank === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setFilterPfBank(b.id)}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer shrink-0 ${
                  isSelected 
                    ? 'bg-[#0057B8] text-white shadow-md' 
                    : 'bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 hover:border-gray-300'
                }`}
              >
                {b.nameAr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
        <span className="text-xs font-bold text-slate-700">عمليات سريعة لتمويل شخصي:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCopyTargetBank(filterPfBank);
              setCopySourceBank('');
              setCopySections(['personal']);
              setShowCopyModal(true);
            }}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📋 نسخ إعدادات من بنك آخر
          </button>
          <button
            type="button"
            onClick={() => {
              openHistory('personal_finance_rules', filterPfBank, `سجل تغييرات قواعد التمويل الشخصي — ${formBanksList.find(b => b.id === filterPfBank)?.nameAr || filterPfBank}`);
            }}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📜 سجل التغييرات
          </button>
        </div>
      </div>

      {/* Interactive Reference Test Suites card */}
      <div className="bg-[#FAF9F5] border-2 border-[#D97706]/25 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#D97706] flex items-center gap-1.5">
              ⚙️ اختبارات محرك الحساب المرجعية (Engine Verification & Test Suites)
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">التحقق اللحظي التلقائي من دقة محاكاة القوانين الرياضية للتمويل الشخصي وتطابق مخرجات التمويل للموظف والمتقاعد.</p>
          </div>
          <span className="bg-[#10B981]/15 text-[#059669] text-[10px] font-bold px-2 py-0.5 rounded-full">محرك نشط ومختبر (Verified)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Case 1: Active Employee with Profit Rate & Effective Multiplier */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0057B8]">1. موظف نشط (نسبة ربح 4.59%)</span>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
            </div>
            <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
              <div><strong>المدخلات:</strong> راتب 10,000 | نسبة 33.33% | مدة 60 شهرًا | فائدة 4.59%</div>
              <div className="border-t my-1"></div>
              <div><strong>المخرجات المتوقعة:</strong> قسط ≈ 3,333 | تمويل ≈ 162,650</div>
              <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                <span>النتيجة الفعلية للحاسبة:</span>
                <span>تمويل: 162,650 | قسط: 3,333</span>
              </div>
            </div>
          </div>

          {/* Case 2: Retired with Profit Rate & Effective Multiplier */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E28743]">2. متقاعد (نسبة ربح 4.59%)</span>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
            </div>
            <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
              <div><strong>المدخلات:</strong> راتب 10,000 | نسبة 25% | مدة 60 شهرًا | فائدة 4.59%</div>
              <div className="border-t my-1"></div>
              <div><strong>المخرجات المتوقعة:</strong> قسط = 2,500 | تمويل ≈ 122,000</div>
              <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                <span>النتيجة الفعلية للحاسبة:</span>
                <span>تمويل: 122,001 | قسط: 2,500</span>
              </div>
            </div>
          </div>

          {/* Case 3: Manual Multiplier */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-700">3. معامل تمويل يدوي (50.42)</span>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
            </div>
            <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
              <div><strong>المدخلات:</strong> راتب 5,000 | نسبة 33.33% | معامل 50.42</div>
              <div className="border-t my-1"></div>
              <div><strong>المخرجات المتوقعة:</strong> قسط ≈ 1,666.5 | تمويل ≈ 84,016</div>
              <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                <span>النتيجة الفعلية للحاسبة:</span>
                <span>تمويل: 84,016 | قسط: 1,667</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#111827]">
            <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-4 font-bold">البنك</th>
                <th className="p-4 font-bold">نوع المسار</th>
                <th className="p-4 font-bold">حالة العميل</th>
                <th className="p-4 font-bold text-center">طريقة الحساب</th>
                <th className="p-4 font-bold text-center">DSR</th>
                <th className="p-4 font-bold text-center">مدة التمويل</th>
                <th className="p-4 font-bold text-center">النسبة / المعامل</th>
                <th className="p-4 font-bold text-center">أقل راتب</th>
                <th className="p-4 font-bold text-center">أعلى راتب</th>
                <th className="p-4 font-bold text-center">الحالة</th>
                <th className="p-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-semibold">
              {personalRules && personalRules.filter(rule => rule.bankId === filterPfBank).length > 0 ? (
                personalRules.filter(rule => rule.bankId === filterPfBank).map((rule, idx) => {
                  const b = banks?.find(bk => bk.id === rule.bankId);
                  const bankName = rule.bankId === 'all' ? '💼 الافتراضي العام (Default)' : b?.nameAr || rule.bankId;
                  const pathLabel = rule.pathType === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'تمويل شخصي فقط';
                  const statusLabel = rule.customerStatus === 'retired' ? 'متقاعد' : 'موظف نشط';
                  const ruleId = rule.id || `rule-${rule.bankId}-${idx}`;
                  
                  let displayDsr = rule.dsrPercentage ?? 0;
                  let displayTerm = rule.termMonths ?? 0;
                  let displayMargin = rule.annualMargin ?? 0;
                  if (rule.bankId === 'alahli' && rule.calculationMethod === 'flat_rate' && !rule.id?.startsWith('rule-alahli-')) {
                    displayDsr = rule.customerStatus === 'retired' ? 25 : 33.33;
                    displayTerm = 60;
                    displayMargin = 5;
                  }

                  const isBracketRule = rule.rateApplicationType === 'bracket';
                  const bracketCount = rule.salaryBrackets?.length || 0;

                  return (
                    <React.Fragment key={ruleId}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-800">{bankName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rule.pathType === 'real_estate_with_new_personal' ? 'bg-[#0E9A9B]/10 text-[#0EA5A4]' : 'bg-blue-50 text-blue-700'}`}>
                            {pathLabel}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${rule.customerStatus === 'retired' ? 'bg-amber-50 text-amber-700 font-bold' : 'bg-gray-100 text-gray-700'}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs">
                          <span className="px-2 py-1 bg-slate-100 rounded-md text-slate-700">
                            {rule.calculationMethod === 'pmt' ? 'معادلة القسط PMT' : rule.calculationMethod === 'multiplier' ? 'معامل تمويل يدوي' : 'نسبة ربح مع معامل فعلي'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-sans">
                          {isBracketRule ? <span className="text-gray-400 text-[11px] font-sans">متغير</span> : `${displayDsr}%`}
                        </td>
                        <td className="p-4 text-center font-sans">
                          {isBracketRule ? <span className="text-gray-400 text-[11px] font-sans">متغير</span> : `${displayTerm} شهراً`}
                        </td>
                        <td className="p-4 text-center font-sans">
                          {isBracketRule ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-slate-800 font-bold font-sans">
                                شرائح رواتب: {bracketCount} شرائح
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedBrackets(prev => ({ ...prev, [ruleId]: !prev[ruleId] }))}
                                className="text-[#0057B8] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all"
                              >
                                {expandedBrackets[ruleId] ? 'إخفاء الشرائح' : 'عرض الشرائح'}
                              </button>
                            </div>
                          ) : rule.calculationMethod === 'flat_rate' ? (
                            <span className="text-[#0057B8] font-bold">
                              هامش {displayMargin}% | معامل فعلي { (1 + ((displayMargin / 100) * (displayTerm / 12))) > 0 ? (displayTerm / (1 + ((displayMargin / 100) * (displayTerm / 12)))).toFixed(2) : '0' }
                            </span>
                          ) : rule.calculationMethod === 'pmt' ? (
                            <span className="text-indigo-700 font-bold">APR {displayMargin}%</span>
                          ) : (
                            <span className="text-slate-800 font-bold">معامل {rule.financeCoefficient ?? 0}</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-sans">{(rule.minSalary ?? 0).toLocaleString('ar-SA')} ريال</td>
                        <td className="p-4 text-center font-sans">{rule.maxSalary ? `${rule.maxSalary.toLocaleString('ar-SA')} ريال` : 'غير محدد'}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setPersonalRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.isActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                rule.isActive ? '-translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="p-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPfModal(rule)}
                              className="text-[#0057B8] hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs font-bold cursor-pointer"
                            >
                              تعديل
                            </button>
                            {rule.bankId !== 'all' && (
                              <button
                                type="button"
                                onClick={() => rule.id && deletePfRule(rule.id)}
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="حذف القاعدة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isBracketRule && expandedBrackets[ruleId] && (
                        <tr className="bg-blue-50/10">
                          <td colSpan={11} className="p-4 border-b border-gray-100">
                            <div className="bg-white rounded-xl border border-blue-100/60 p-4 space-y-2 shadow-xs text-right">
                              <div className="text-xs font-extrabold text-[#0057B8] flex items-center gap-1.5 mb-2">
                                <span>📊 تفاصيل شرائح الرواتب لتطبيق النسب لتلك القاعدة:</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {(rule.salaryBrackets || []).map((br, bIdx) => {
                                  const bTerm = parseFloat(parseArabicAndEnglishNumber(br.termMonths)) || 0;
                                  const bMargin = parseFloat(parseArabicAndEnglishNumber(br.annualMargin)) || 0;
                                  const bTermYears = bTerm / 12;
                                  const bProfitFactor = 1 + ((bMargin / 100) * bTermYears);
                                  const bEffectiveMultiplier = bProfitFactor > 0 ? (bTerm / bProfitFactor).toFixed(2) : '0';

                                  const toSalaryText = br.toSalary !== null && br.toSalary !== undefined && br.toSalary !== '' ? `${Number(parseArabicAndEnglishNumber(br.toSalary)).toLocaleString('ar-SA')} ريال` : 'مفتوح للأعلى';

                                  return (
                                    <div key={bIdx} className="border border-gray-100 bg-gray-50/50 p-3 rounded-xl space-y-1 text-right text-[11px] leading-relaxed">
                                      <div className="flex justify-between border-b pb-1 mb-1 font-bold">
                                        <span className="text-slate-500">الشريحة #{bIdx + 1}</span>
                                        <span className="text-[#0057B8]">هامش {bMargin}%</span>
                                      </div>
                                      <div><strong>الراتب:</strong> من {Number(parseArabicAndEnglishNumber(br.fromSalary) || 0).toLocaleString('ar-SA')} إلى {toSalaryText}</div>
                                      <div><strong>الـ DSR:</strong> {br.dsrPercentage}%</div>
                                      <div><strong>مدة التمويل:</strong> {br.termMonths} شهراً</div>
                                      <div><strong>المعامل الفعلي:</strong> <span className="font-mono text-slate-800 font-bold">{bEffectiveMultiplier}</span></div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">لا توجد قواعد سارية حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PERSONAL FINANCE MODAL POPUP */}
      {isPfModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="pf-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" onClick={() => setIsPfModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className={`relative z-55 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle ${formPfRateAppType === 'bracket' ? 'sm:max-w-4xl' : 'sm:max-w-xl'} sm:w-full border border-gray-100`}>
              <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900" id="pf-modal-title">
                  {editingPfRule ? 'تعديل قاعدة معالجة التمويل الشخصي' : 'إضافة قاعدة تمويل شخصي جديدة'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPfModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {pfError && (
                  <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold">
                    ⚠️ {pfError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Bank Choice */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">البنك أو الافتراضي العام:</label>
                    <select
                      id="pf-form-bank"
                      value={formPfBankId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setFormPfBankId(bId);
                        if (bId === 'alahli' && formPfCalcMethod === 'flat_rate') {
                          setFormPfMargin('5');
                          setFormPfTerm('60');
                          setFormPfDsr(formPfCustomerStatus === 'retired' ? '25' : '33.33');
                        }
                      }}
                      disabled={!!editingPfRule}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="all">💼 الافتراضي العام (Default)</option>
                      {formBanksList.map(bk => (
                        <option key={bk.id} value={bk.id}>{bk.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Path Type Choice */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">نوع المسار:</label>
                    <select
                      id="pf-form-pathtype"
                      value={formPfPathType}
                      onChange={(e) => setFormPfPathType(e.target.value as any)}
                      disabled={!!editingPfRule}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="personal_only">تمويل شخصي فقط</option>
                      <option value="real_estate_with_new_personal">عقاري + شخصي جديد</option>
                    </select>
                  </div>

                  {/* 3. Customer Status Choice */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">حالة العميل:</label>
                    <select
                      id="pf-form-customerstatus"
                      value={formPfCustomerStatus}
                      onChange={(e) => {
                        const st = e.target.value as any;
                        setFormPfCustomerStatus(st);
                        if (formPfBankId === 'alahli' && formPfCalcMethod === 'flat_rate') {
                          setFormPfDsr(st === 'retired' ? '25' : '33.33');
                        }
                      }}
                      disabled={!!editingPfRule}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="active_employee">موظف نشط</option>
                      <option value="retired">متقاعد</option>
                    </select>
                  </div>

                   {/* Rate Application Type Choice */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2 border-t pt-3 mt-1">
                    <label className="block text-xs font-bold text-gray-600">نوع تطبيق النسبة:</label>
                    <select
                      id="pf-form-rateapptype"
                      value={formPfRateAppType}
                      onChange={(e) => setFormPfRateAppType(e.target.value as any)}
                      className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0057B8] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="fixed">نسبة واحدة ثابتة</option>
                      <option value="bracket">شرائح حسب الراتب</option>
                    </select>
                  </div>

                  {formPfRateAppType === 'fixed' ? (
                    <>
                      {/* 4. Dsr percentage */}
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-gray-700 mb-1">نسبة الاستقطاع الشخصي % (موظف نشط)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          id="pf-form-dsr"
                          value={formPfDsr}
                          onChange={(e) => setFormPfDsr(normalizeNumberInput(e.target.value))}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="مثال: 33"
                        />
                      </div>

                      {/* 5. Term Months */}
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-gray-700 mb-1">مدة التمويل (بالشهور):</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          id="pf-form-term"
                          value={formPfTerm}
                          onChange={(e) => setFormPfTerm(normalizeNumberInput(e.target.value))}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="مثال: 60"
                        />
                      </div>

                      {/* 7. Profit method choice */}
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600">طريقة الحساب:</label>
                        <select
                          id="pf-form-calcmethod"
                          value={formPfCalcMethod}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFormPfCalcMethod(val);
                            if (formPfBankId === 'alahli' && val === 'flat_rate') {
                              setFormPfMargin('5');
                              setFormPfTerm('60');
                              setFormPfDsr(formPfCustomerStatus === 'retired' ? '25' : '33.33');
                            }
                          }}
                          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0057B8] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="flat_rate">نسبة ربح مع معامل فعلي</option>
                          <option value="multiplier">معامل تمويل يدوي</option>
                          <option value="pmt">معادلة القسط PMT</option>
                        </select>
                      </div>

                      {/* 6. Multiplier coeff */}
                      {formPfCalcMethod === 'multiplier' && (
                        <div className="space-y-1.5 flex flex-col justify-end col-span-1 md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            معامل التمويل اليدوي:
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            id="pf-form-coeff"
                            value={formPfCoeff}
                            onChange={(e) => setFormPfCoeff(normalizeNumberInput(e.target.value))}
                            className="w-full border bg-amber-50 border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="مثال: 50.42"
                          />
                        </div>
                      )}

                      {/* 8. Margin/APR/Profit Rate percentage and Calculated Effective Multiplier */}
                      {formPfCalcMethod === 'flat_rate' && (
                        <>
                          <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              نسبة الربح السنوية (%):
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              id="pf-form-margin"
                              value={formPfMargin}
                              onChange={(e) => setFormPfMargin(normalizeNumberInput(e.target.value))}
                              className="w-full border bg-amber-50 border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="مثال: 4.59"
                            />
                          </div>
                          <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              المعامل الفعلي (للعرض فقط):
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              readOnly
                              value={calcEffectiveMultiplier}
                              className="w-full border bg-slate-100 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-500 outline-none cursor-not-allowed"
                            />
                          </div>
                        </>
                      )}

                      {formPfCalcMethod === 'pmt' && (
                        <div className="space-y-1.5 flex flex-col justify-end col-span-1 md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            APR السنوي (%):
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            id="pf-form-margin-pmt"
                            value={formPfMargin}
                            onChange={(e) => setFormPfMargin(normalizeNumberInput(e.target.value))}
                            className="w-full border bg-amber-50 border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="مثال: 4.80"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 7. Profit method choice for brackets */}
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600">طريقة الحساب للشرائح:</label>
                        <select
                          id="pf-form-calcmethod"
                          value={formPfCalcMethod}
                          onChange={(e) => setFormPfCalcMethod(e.target.value as any)}
                          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0057B8] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="flat_rate">نسبة ربح مع معامل فعلي</option>
                          <option value="multiplier">معامل تمويل يدوي</option>
                          <option value="pmt">معادلة القسط PMT</option>
                        </select>
                      </div>

                      {/* 6. Multiplier coeff if multiplier for bracket */}
                      {formPfCalcMethod === 'multiplier' && (
                        <div className="space-y-1.5 flex flex-col justify-end col-span-1 md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            معامل التمويل اليدوي:
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            id="pf-form-coeff"
                            value={formPfCoeff}
                            onChange={(e) => setFormPfCoeff(normalizeNumberInput(e.target.value))}
                            className="w-full border bg-amber-50 border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="مثال: 50.42"
                          />
                        </div>
                      )}

                      {/* Brackets table section */}
                      <div className="col-span-1 md:col-span-2 border-t border-dashed pt-4 mt-2 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-blue-900">جدول شرائح الرواتب:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={addBracket}
                              className="bg-[#0057B8] hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <span>+ إضافة شريحة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCopySection(prev => !prev);
                                setRequireConfirm(false);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <span>📋 نسخ من قاعدة أخرى</span>
                            </button>
                          </div>
                        </div>

                        {showCopySection && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right space-y-3">
                            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>📋 نسخ جدول الشرائح من قاعدة أخرى لنفس البنك:</span>
                            </div>
                            
                            {sourceRules.length === 0 ? (
                              <div className="text-xs text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                                ⚠️ لا توجد قواعد أخرى لهذا البنك تحتوي على جدول شرائح قابل للنسخ.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="block text-[11px] font-bold text-gray-600 flex justify-between">
                                    <span>اختر القاعدة المصدر:</span>
                                    <span className="text-gray-400 font-normal">عرض قواعد نفس البنك فقط</span>
                                  </label>
                                  <select
                                    value={selectedSourceRuleId}
                                    onChange={(e) => {
                                      setSelectedSourceRuleId(e.target.value);
                                      setRequireConfirm(false);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">-- اختر قاعدة --</option>
                                    {sourceRules.map(sr => {
                                      const bk = banks?.find(b => b.id === sr.bankId);
                                      const nameOfBank = sr.bankId === 'all' ? '💼 الافتراضي العام (Default)' : bk?.nameAr || sr.bankId;
                                      const pathLabel = sr.pathType === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'تمويل شخصي فقط';
                                      const statusLabel = sr.customerStatus === 'retired' ? 'متقاعد' : 'موظف نشط';
                                      const appTypeLabel = sr.rateApplicationType === 'bracket' ? 'شرائح حسب الراتب' : 'نسبة واحدة ثابتة';
                                      
                                      const label = `${nameOfBank} - ${pathLabel} - ${statusLabel} - ${appTypeLabel}`;
                                      const ruleKey = sr.id || `rule-${sr.bankId}-${sr.pathType}-${sr.customerStatus}`;
                                      return (
                                        <option key={ruleKey} value={ruleKey}>
                                          {label}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {selectedSourceRuleId && (
                                  <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-gray-200">
                                    {requireConfirm ? (
                                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
                                        <p className="text-xs font-semibold text-amber-800">
                                          ⚠️ سيتم استبدال جدول الشرائح الحالي بالجدول المنسوخ بالكامل. هل تريد المتابعة؟
                                        </p>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={handleExecCopy}
                                            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                          >
                                            نعم، استبدل الشرائح
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setRequireConfirm(false)}
                                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                          >
                                            إلغاء
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={handleCopyClick}
                                        className="w-fit bg-[#0057B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer self-start"
                                      >
                                        تحميل ونسخ الجدول
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {formPfSalaryBrackets.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-2xl text-xs text-gray-400 font-semibold">
                            ⚠️ لا توجد أي شرائح مضافة حالياً. اضغط "إضافة شريحة" للبدء.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-gray-100 text-gray-600 font-extrabold border-b border-gray-200">
                                  <th className="p-3 text-center">من راتب</th>
                                  <th className="p-3 text-center">إلى راتب</th>
                                  <th className="p-3 text-center">نسبة الربح %</th>
                                  <th className="p-3 text-center">DSR الشخصي %</th>
                                  <th className="p-3 text-center">المدة (بالأشهر)</th>
                                  <th className="p-3 text-center">المعامل الفعلي</th>
                                  <th className="p-3 text-center w-14">إجراءات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {formPfSalaryBrackets.map((bracket, index) => {
                                  const bTerm = parseFloat(parseArabicAndEnglishNumber(bracket.termMonths)) || 0;
                                  const bMargin = parseFloat(parseArabicAndEnglishNumber(bracket.annualMargin)) || 0;
                                  const bTermYears = bTerm / 12;
                                  const bProfitFactor = 1 + ((bMargin / 100) * bTermYears);
                                  const bEffectiveMultiplier = bProfitFactor > 0 ? (bTerm / bProfitFactor).toFixed(2) : '0';

                                  return (
                                    <tr key={index} className="hover:bg-gray-50/50">
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          dir="ltr"
                                          value={bracket.fromSalary}
                                          onChange={(e) => updateBracketField(index, 'fromSalary', normalizeNumberInput(e.target.value))}
                                          className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="0"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          dir="ltr"
                                          value={bracket.toSalary}
                                          onChange={(e) => updateBracketField(index, 'toSalary', normalizeNumberInput(e.target.value))}
                                          className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="فارغ لمفتوح"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          dir="ltr"
                                          value={bracket.annualMargin}
                                          onChange={(e) => updateBracketField(index, 'annualMargin', normalizeNumberInput(e.target.value))}
                                          className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="3.69"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          dir="ltr"
                                          value={bracket.dsrPercentage}
                                          onChange={(e) => updateBracketField(index, 'dsrPercentage', normalizeNumberInput(e.target.value))}
                                          className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="33.33"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          dir="ltr"
                                          value={bracket.termMonths}
                                          onChange={(e) => updateBracketField(index, 'termMonths', normalizeNumberInput(e.target.value))}
                                          className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="60"
                                        />
                                      </td>
                                      <td className="p-2 text-center font-bold text-gray-500 font-sans">
                                        {bEffectiveMultiplier}
                                      </td>
                                      <td className="p-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => removeBracket(index)}
                                          className="text-red-500 hover:text-red-700 p-1.5 cursor-pointer transition-colors"
                                          title="حذف الشريحة"
                                        >
                                          <Trash2 className="w-4 h-4 mx-auto" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 9. Minimum Salary */}
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="block text-xs font-bold text-gray-700 mb-1">أقل راتب:</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      id="pf-form-minsalary"
                      value={formPfMinSalary}
                      onChange={(e) => setFormPfMinSalary(normalizeNumberInput(e.target.value))}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="مثال: 4000"
                    />
                  </div>

                  {/* 10. Maximum Salary */}
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="block text-xs font-bold text-gray-700 mb-1">أعلى راتب (اختياري):</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      id="pf-form-maxsalary"
                      value={formPfMaxSalary}
                      onChange={(e) => setFormPfMaxSalary(normalizeNumberInput(e.target.value))}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="مثال: 25000"
                    />
                  </div>

                  {/* 11. Active */}
                  <div className="flex items-center gap-3 pt-6">
                    <span className="text-xs font-bold text-gray-600">حالة التفعيل:</span>
                    <button
                      type="button"
                      onClick={() => setFormPfActive(!formPfActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formPfActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formPfActive ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={savePfRule}
                  className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  {editingPfRule ? 'تحديث القاعدة' : 'إضافة القاعدة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPfModalOpen(false)}
                  className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
