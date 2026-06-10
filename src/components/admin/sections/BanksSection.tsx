import React, { useState } from 'react';
import { Plus, ToggleRight, ToggleLeft, Edit, Trash2 } from 'lucide-react';
import { Bank, ProductAcceptance, TermRule, PersonalFinanceRules, DsrRule, MarginRule } from '../../../types';

const LOGO_COLOR_PRESETS = [
  { value: 'from-emerald-700 to-emerald-950', name: 'أخضر داكن (الأهلي)' },
  { value: 'from-blue-700 to-blue-950', name: 'أزرق داكن (الراجحي)' },
  { value: 'from-amber-600 to-amber-950', name: 'ذهبي / خردلي (الإنماء)' },
  { value: 'from-cyan-600 to-cyan-950', name: 'سماوي داكن (الفرنسي)' },
  { value: 'from-rose-600 to-rose-950', name: 'وردي غامق (بداية)' },
  { value: 'from-teal-600 to-teal-950', name: 'تيل / أخضر مزرق (البلاد)' },
  { value: 'from-indigo-700 to-indigo-950', name: 'كحلي (العربي)' },
  { value: 'from-violet-700 to-violet-950', name: 'بنفسجي داكن' },
  { value: 'from-slate-700 to-slate-950', name: 'رمادي صخري' },
  { value: 'from-red-700 to-red-950', name: 'أحمر فاخر' }
];

interface BanksSectionProps {
  banks: Bank[];
  setBanks: React.Dispatch<React.SetStateAction<Bank[]>>;
  setProducts: React.Dispatch<React.SetStateAction<ProductAcceptance[]>>;
  setTermRules: React.Dispatch<React.SetStateAction<TermRule[]>>;
  setPersonalRules: React.Dispatch<React.SetStateAction<PersonalFinanceRules[]>>;
  setDsrRules: React.Dispatch<React.SetStateAction<DsrRule[]>>;
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export const BanksSection: React.FC<BanksSectionProps> = ({
  banks,
  setBanks,
  setProducts,
  setTermRules,
  setPersonalRules,
  setDsrRules,
  setMarginRules,
  showToast
}) => {
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Bank | null>(null);

  const [instId, setInstId] = useState('');
  const [instNameAr, setInstNameAr] = useState('');
  const [instNameEn, setInstNameEn] = useState('');
  const [instType, setInstType] = useState<'bank' | 'finance_company'>('bank');
  const [instLogoColor, setInstLogoColor] = useState('from-emerald-700 to-emerald-950');
  const [instLogoText, setInstLogoText] = useState('');
  const [instMaxTermMonths, setInstMaxTermMonths] = useState(360);
  const [instMaxAgeAtEnd, setInstMaxAgeAtEnd] = useState(75);
  const [instAllowAfterRetirement, setInstAllowAfterRetirement] = useState(true);
  const [instMonthsAfterRetirement, setInstMonthsAfterRetirement] = useState(120);
  const [instIsActive, setInstIsActive] = useState(true);
  const [instInternalNotes, setInstInternalNotes] = useState('');
  const [instModalError, setInstModalError] = useState('');

  const openAddInstitution = () => {
    setEditingInstitution(null);
    setInstId('');
    setInstNameAr('');
    setInstNameEn('');
    setInstType('bank');
    setInstLogoColor('from-[#0057B8] to-blue-900');
    setInstLogoText('');
    setInstMaxTermMonths(360);
    setInstMaxAgeAtEnd(75);
    setInstAllowAfterRetirement(true);
    setInstMonthsAfterRetirement(120);
    setInstIsActive(true);
    setInstInternalNotes('');
    setInstModalError('');
    setIsInstitutionModalOpen(true);
  };

  const openEditInstitution = (bank: Bank) => {
    setEditingInstitution(bank);
    setInstId(bank.id);
    setInstNameAr(bank.nameAr || '');
    setInstNameEn(bank.nameEn || '');
    setInstType(bank.institutionType || 'bank');
    setInstLogoColor(bank.logoColor || 'from-[#0057B8] to-blue-900');
    setInstLogoText(bank.logoText || '');
    setInstMaxTermMonths(bank.maxTermMonths || 360);
    setInstMaxAgeAtEnd(bank.maxAgeAtEnd || 75);
    setInstAllowAfterRetirement(bank.allowAfterRetirement || false);
    setInstMonthsAfterRetirement(bank.monthsAfterRetirement || 0);
    setInstIsActive(bank.isActive !== false);
    setInstInternalNotes(bank.internalNotes || '');
    setInstModalError('');
    setIsInstitutionModalOpen(true);
  };

  const saveInstitution = () => {
    if (!instNameAr.trim()) {
      setInstModalError('الرجاء إدخال اسم الجهة بالعربي.');
      return;
    }
    const cleanId = instId.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
      setInstModalError('الرجاء إدخال الرمز المختصر بالإنجليزي (ID).');
      return;
    }
    if (!editingInstitution && banks.some(b => b.id === cleanId)) {
      setInstModalError('الرمز المختصر (ID) مستخدم بالفعل لجهة تمويل أخرى.');
      return;
    }

    const finalLogoText = instLogoText.trim() || instNameAr.trim().substring(0, 4);

    const updatedBank: Bank = {
      id: cleanId,
      institutionType: instType,
      nameAr: instNameAr.trim(),
      nameEn: instNameEn.trim() || cleanId.toUpperCase(),
      logoColor: instLogoColor,
      logoText: finalLogoText,
      isActive: instIsActive,
      calendarType: instType === 'finance_company' ? 'hijri' : 'gregorian',
      maxTermMonths: Number(instMaxTermMonths) || (instType === 'finance_company' ? 240 : 360),
      maxAgeAtEnd: Number(instMaxAgeAtEnd) || 75,
      monthsAfterRetirement: instAllowAfterRetirement ? (Number(instMonthsAfterRetirement) || 0) : 0,
      allowAfterRetirement: instAllowAfterRetirement,
      displayOrder: editingInstitution ? (editingInstitution.displayOrder || 1) : (banks.length + 1)
    };

    if (instInternalNotes.trim()) {
      updatedBank.internalNotes = instInternalNotes.trim();
    }

    if (editingInstitution) {
      const updatedBanks = banks.map(b => b.id === editingInstitution.id ? updatedBank : b);
      setBanks(updatedBanks);
      showToast(`تم تعديل بيانات جهة التمويل "${instNameAr}" بنجاح في المسودة.`, "success");
    } else {
      setBanks(prev => [...prev, updatedBank]);

      // 1. PRODUCTS & ACCEPTANCE
      const newProducts: ProductAcceptance[] = [
        {
          id: `${cleanId}_re_only`,
          bankId: cleanId,
          productId: 'real_estate_only',
          allowedSectors: ['gov_civil', 'semi_gov', 'companies', 'military'],
          minAge: 18,
          maxAge: updatedBank.maxAgeAtEnd - 5,
          minSalary: instType === 'finance_company' ? 4000 : 5000,
          minServiceMonths: 3,
          allowMonthlySupport: true,
          allowDownpaymentSupport: true,
          allowUnsupported: true,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          isActive: true,
          defaultRejectionMessage: `${updatedBank.nameAr}: يتطلب راتب لا يقل عن ${instType === 'finance_company' ? '4,000' : '5,000'} وعمر مناسب ومطابقة الحد الأقصى للمدة والسن.`
        },
        {
          id: `${cleanId}_pf_only`,
          bankId: cleanId,
          productId: 'personal_only',
          allowedSectors: ['gov_civil', 'semi_gov', 'companies', 'military', 'retired'],
          minAge: 18,
          maxAge: 65,
          minSalary: instType === 'finance_company' ? 3000 : 4000,
          minServiceMonths: 1,
          allowMonthlySupport: false,
          allowDownpaymentSupport: false,
          allowUnsupported: true,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          isActive: true,
          defaultRejectionMessage: `${updatedBank.nameAr}: التمويل الشخصي يتطلب مطابقة السن وجودة السجل الائتماني والخدمة.`
        },
        {
          id: `${cleanId}_re_new_pf`,
          bankId: cleanId,
          productId: 'real_estate_with_new_personal',
          allowedSectors: ['gov_civil', 'semi_gov', 'companies', 'military'],
          minAge: 21,
          maxAge: 60,
          minSalary: instType === 'finance_company' ? 6000 : 8000,
          minServiceMonths: 6,
          allowMonthlySupport: true,
          allowDownpaymentSupport: true,
          allowUnsupported: true,
          allowAfterRetirement: false,
          isActive: true,
          defaultRejectionMessage: `${updatedBank.nameAr}: التمويل المشترك يتطلب حد أدنى للراتب ومطابقة السن قبل التقاعد والحدود المعتمدة.`
        },
        {
          id: `${cleanId}_re_existing_pf`,
          bankId: cleanId,
          productId: 'real_estate_with_existing_personal',
          allowedSectors: ['gov_civil', 'semi_gov', 'companies', 'military'],
          minAge: 21,
          maxAge: updatedBank.maxAgeAtEnd - 5,
          minSalary: instType === 'finance_company' ? 5000 : 6000,
          minServiceMonths: 3,
          allowMonthlySupport: true,
          allowDownpaymentSupport: true,
          allowUnsupported: true,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          isActive: true,
          defaultRejectionMessage: `${updatedBank.nameAr}: يتطلب كفاية الدخل وتوفر مستندات القرض القائم وانسجام حدود الالتزام.`
        }
      ];
      setProducts(prev => {
        const currentProducts = Array.isArray(prev) ? prev : [];
        return [...currentProducts, ...newProducts];
      });

      // 2. TERM RULES
      const newTermRules: TermRule[] = [
        {
          bankId: cleanId,
          sectorId: 'gov_civil',
          rankId: 'all',
          productId: 'both',
          supportType: 'all',
          maxTermMonths: updatedBank.maxTermMonths,
          allowedMonthsAfterRetirement: updatedBank.monthsAfterRetirement,
          maxAgeAtEnd: updatedBank.maxAgeAtEnd,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          calendarType: updatedBank.calendarType,
          minTermMonths: 60,
          defaultTermMode: 'max',
          isActive: true
        },
        {
          bankId: cleanId,
          sectorId: 'military',
          rankId: 'all',
          productId: 'both',
          supportType: 'all',
          maxTermMonths: updatedBank.maxTermMonths,
          allowedMonthsAfterRetirement: updatedBank.monthsAfterRetirement,
          maxAgeAtEnd: updatedBank.maxAgeAtEnd,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          calendarType: updatedBank.calendarType,
          minTermMonths: 60,
          defaultTermMode: 'max',
          isActive: true
        },
        {
          bankId: cleanId,
          sectorId: 'companies',
          rankId: 'all',
          productId: 'both',
          supportType: 'all',
          maxTermMonths: updatedBank.maxTermMonths,
          allowedMonthsAfterRetirement: updatedBank.monthsAfterRetirement,
          maxAgeAtEnd: updatedBank.maxAgeAtEnd,
          allowAfterRetirement: updatedBank.allowAfterRetirement,
          calendarType: updatedBank.calendarType,
          minTermMonths: 60,
          defaultTermMode: 'max',
          isActive: true
        }
      ];

      if (updatedBank.allowAfterRetirement) {
        newTermRules.push({
          bankId: cleanId,
          sectorId: 'retired',
          rankId: 'all',
          productId: 'both',
          supportType: 'all',
          maxTermMonths: updatedBank.maxTermMonths,
          allowedMonthsAfterRetirement: updatedBank.monthsAfterRetirement,
          maxAgeAtEnd: updatedBank.maxAgeAtEnd,
          allowAfterRetirement: true,
          calendarType: updatedBank.calendarType,
          minTermMonths: 60,
          defaultTermMode: 'max',
          isActive: true
        });
      }
      setTermRules(prev => {
        const currentTerms = Array.isArray(prev) ? prev : [];
        return [...currentTerms, ...newTermRules];
      });

      // 3. PERSONAL CONTROLLER RULES
      const newPersonalRules: PersonalFinanceRules[] = [
        {
          id: `rule-${cleanId}-personal-active`,
          bankId: cleanId,
          sectorId: 'all',
          dsrPercentage: 33,
          termMonths: 60,
          financeCoefficient: 0,
          annualMargin: 4.80,
          minSalary: instType === 'finance_company' ? 3000 : 4000,
          minAge: 18,
          maxAge: updatedBank.maxAgeAtEnd - 5,
          retireeDsrPercentage: 25,
          isActive: true,
          calculationMethod: 'flat_rate',
          pathType: 'personal_only',
          customerStatus: 'active_employee'
        },
        {
          id: `rule-${cleanId}-personal-retired`,
          bankId: cleanId,
          sectorId: 'retired',
          dsrPercentage: 25,
          termMonths: 60,
          financeCoefficient: 0,
          annualMargin: 4.80,
          minSalary: instType === 'finance_company' ? 3000 : 4000,
          minAge: 18,
          maxAge: updatedBank.maxAgeAtEnd - 5,
          retireeDsrPercentage: 25,
          isActive: updatedBank.allowAfterRetirement,
          calculationMethod: 'flat_rate',
          pathType: 'personal_only',
          customerStatus: 'retired'
        },
        {
          id: `rule-${cleanId}-combo-active`,
          bankId: cleanId,
          sectorId: 'all',
          dsrPercentage: 40,
          termMonths: 60,
          financeCoefficient: 0,
          annualMargin: 4.80,
          minSalary: instType === 'finance_company' ? 5000 : 6000,
          minAge: 21,
          maxAge: 60,
          retireeDsrPercentage: 25,
          isActive: true,
          calculationMethod: 'flat_rate',
          pathType: 'real_estate_with_new_personal',
          customerStatus: 'active_employee'
        }
      ];
      setPersonalRules(prev => {
        const currentPersonal = Array.isArray(prev) ? prev : [];
        return [...currentPersonal, ...newPersonalRules];
      });

      // 4. DSR RULES
      const newDsrRules: DsrRule[] = [
        {
          id: `${cleanId}_re_only_none_before`,
          bankId: cleanId,
          productType: 'real_estate_only',
          supportType: 'none',
          customerStage: 'active_before_retirement',
          dsrPercent: 55,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_re_only_monthly_before`,
          bankId: cleanId,
          productType: 'real_estate_only',
          supportType: 'monthly',
          customerStage: 'active_before_retirement',
          dsrPercent: instType === 'finance_company' ? 60 : 65,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_re_only_down_before`,
          bankId: cleanId,
          productType: 'real_estate_only',
          supportType: 'downpayment',
          customerStage: 'active_before_retirement',
          dsrPercent: 55,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_personal_only_none_before`,
          bankId: cleanId,
          productType: 'personal_only',
          supportType: 'not_applicable',
          customerStage: 'active_before_retirement',
          dsrPercent: 33,
          deductExistingObligations: true,
          active: true
        }
      ];

      if (updatedBank.allowAfterRetirement) {
        newDsrRules.push(
          {
            id: `${cleanId}_re_only_none_after`,
            bankId: cleanId,
            productType: 'real_estate_only',
            supportType: 'none',
            customerStage: 'retired_after_retirement',
            dsrPercent: 55,
            deductExistingObligations: true,
            active: true
          },
          {
            id: `${cleanId}_re_only_monthly_after`,
            bankId: cleanId,
            productType: 'real_estate_only',
            supportType: 'monthly',
            customerStage: 'retired_after_retirement',
            dsrPercent: instType === 'finance_company' ? 60 : 65,
            deductExistingObligations: true,
            active: true
          },
          {
            id: `${cleanId}_personal_only_none_after`,
            bankId: cleanId,
            productType: 'personal_only',
            supportType: 'not_applicable',
            customerStage: 'retired_after_retirement',
            dsrPercent: 25,
            deductExistingObligations: true,
            active: true
          }
        );
      }
      setDsrRules(prev => {
        const currentDsr = Array.isArray(prev) ? prev : [];
        return [...currentDsr, ...newDsrRules];
      });

      // 5. MARGIN RULES
      const newMarginRule: MarginRule = {
        id: `${cleanId}_re_m1`,
        bankId: cleanId,
        productId: 'real_estate_only',
        supportType: 'all',
        sectorId: 'all',
        fromTermMonths: 0,
        toTermMonths: 360,
        startMargin: 3.50,
        endMargin: 3.50,
        calcType: 'fixed',
        isActive: true
      };
      setMarginRules(prev => {
        const currentMargin = Array.isArray(prev) ? prev : [];
        return [...currentMargin, newMarginRule];
      });

      showToast(`تمت إضافة جهة التمويل "${instNameAr}" بنجاح مع تهيئة القواعد الافتراضية. يرجى الضغط على حفظ التغييرات لحفظها دائماً.`, "success");
    }

    setIsInstitutionModalOpen(false);
  };

  const deleteInstitution = (bankId: string) => {
    const bankObj = banks.find(b => b.id === bankId);
    if (!bankObj) return;

    setBanks(prev => prev.filter(b => b.id !== bankId));

    // Clear related config
    setProducts(prev => Array.isArray(prev) ? prev.filter(p => p.bankId !== bankId) : []);
    setTermRules(prev => Array.isArray(prev) ? prev.filter(t => t.bankId !== bankId) : []);
    setPersonalRules(prev => Array.isArray(prev) ? prev.filter(pr => pr.bankId !== bankId) : []);
    setDsrRules(prev => Array.isArray(prev) ? prev.filter(d => d.bankId !== bankId) : []);
    setMarginRules(prev => Array.isArray(prev) ? prev.filter(m => m.bankId !== bankId) : []);

    showToast(`تم حذف جهة التمويل "${bankObj.nameAr}" وجميع الإعدادات التابعة لها من المسودة.`, "success");
  };

  const toggleBankActive = (id: string) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#F1F5F9] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">جهات التمويل والشركات المرخصة</h2>
          <p className="text-xs text-[#6B7280]">إدارة البنوك وشركات التمويل النشطة، الحدود القصوى للتمويل، ومعايير القبول.</p>
        </div>
        <button
          type="button"
          id="btn-add-institution"
          onClick={openAddInstitution}
          className="inline-flex items-center gap-2 bg-[#0057B8] hover:bg-[#00418A] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm shadow-[#0057B8]/20 cursor-pointer text-right shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة جهة تمويل</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs">
        <table className="w-full text-right text-xs font-semibold text-[#111827] min-w-[800px]">
          <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-gray-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">شعار واسم الجهة</th>
              <th className="p-4">الترميز (ID)</th>
              <th className="p-4">نوع الجهة</th>
              <th className="p-4 text-center">حالة الجهة</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {banks.map((bank) => (
              <tr key={bank.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bank.logoColor || 'from-[#0057B8] to-blue-900'} text-white flex items-center justify-center font-bold text-[10px]`}>
                      {bank.logoText}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-800 text-[13px]">{bank.nameAr}</span>
                      <span className="text-[10px] text-gray-400 font-sans">{bank.nameEn}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-[11px] text-gray-500">{bank.id}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    bank.institutionType === 'finance_company' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                      : 'bg-[#0057B8]/10 text-[#0057B8] border border-[#0057B8]/20'
                  }`}>
                    {bank.institutionType === 'finance_company' ? 'شركة تمويل' : 'بنك'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    id={`bank-toggle-${bank.id}`}
                    onClick={() => toggleBankActive(bank.id)}
                    className="text-[#0057B8] hover:opacity-80 transition cursor-pointer inline-flex items-center"
                  >
                    {bank.isActive ? (
                      <ToggleRight className="w-8 h-8 text-[#0057B8]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditInstitution(bank)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#E5E7EB] hover:border-[#0057B8] text-[#0057B8] hover:bg-[#0057B8]/5 rounded-lg transition-all font-bold text-[11px] cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف الجهة "${bank.nameAr}" بالكامل من لوحة التحكم وجميع الإعدادات المترتبة عليها؟`)) {
                          deleteInstitution(bank.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 hover:border-red-600 text-red-600 hover:bg-red-50 rounded-lg transition-all font-bold text-[11px] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInstitutionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 w-full max-w-lg shadow-2xl animate-fade-in text-right font-sans">
            <h3 className="text-sm font-extrabold text-[#111827] border-b border-gray-100 pb-3 mb-5">
              {editingInstitution ? `تعديل بيانات جهة التمويل - ${editingInstitution.nameAr}` : 'إضافة جهة تمويل جديدة'}
            </h3>

            {instModalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold mb-4">
                {instModalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم الجهة بالعربي:</label>
                <input
                  type="text"
                  value={instNameAr}
                  onChange={(e) => {
                    setInstNameAr(e.target.value);
                    if (!editingInstitution && e.target.value) {
                      const words = e.target.value.trim().split(/\s+/);
                      if (words[0]) {
                        setInstLogoText(words[0].substring(0, 4));
                      }
                    }
                  }}
                  placeholder="مثال: البنك الأهلي السعودي، شركة بداية للتمويل"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الرمز التعريفي / المختصر بالإنجليزي (ID):</label>
                <input
                  type="text"
                  disabled={!!editingInstitution}
                  value={instId}
                  onChange={(e) => setInstId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder={editingInstitution ? '' : "e.g. alahli, rajhi, bidaya (أحرف صغيرة وأرقام فقط)"}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right ${
                    editingInstitution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                  }`}
                />
                {!editingInstitution && (
                  <p className="text-[10px] text-gray-400 mt-1">الرمز التعريفي فريد ويستخدم للربط الداخلي مع إعدادات الحسبة، لا يمكن تعديله لاحقاً.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم بالإنجليزي (اختياري):</label>
                <input
                  type="text"
                  value={instNameEn}
                  onChange={(e) => setInstNameEn(e.target.value)}
                  placeholder="مثال: SNB Finance, Rajhi Bank"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">نوع جهة التمويل:</label>
                  <select
                    value={instType}
                    onChange={(e) => {
                      const newType = e.target.value as 'bank' | 'finance_company';
                      setInstType(newType);
                      if (newType === 'finance_company') {
                        setInstMaxTermMonths(240);
                        setInstMaxAgeAtEnd(65);
                      } else {
                        setInstMaxTermMonths(360);
                        setInstMaxAgeAtEnd(75);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                  >
                    <option value="bank">بنك تجاري</option>
                    <option value="finance_company">شركة تمويل عقاري/شخصي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اختصار الشعار (أقصى حد 4 أحرف):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={instLogoText}
                    onChange={(e) => setInstLogoText(e.target.value)}
                    placeholder="مثال: أهلي، راجحي"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">سمة تدرج لون الجهة والشعار:</label>
                <div className="grid grid-cols-5 gap-2">
                  {LOGO_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setInstLogoColor(preset.value)}
                      title={preset.name}
                      className={`h-8 rounded-lg bg-gradient-to-br ${preset.value} flex items-center justify-center cursor-pointer border-2 transition-transform ${
                        instLogoColor === preset.value ? 'border-amber-500 scale-105 shadow-md' : 'border-transparent scale-100 hover:scale-102 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-white text-[9px] font-bold leading-none">{instLogoText || 'جهة'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">حالة جهة التمويل (التفعيل التلقائي بالفواتير والمحرك):</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInstIsActive(true)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      instIsActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-gray-50 text-gray-500 border border-gray-100'
                    }`}
                  >
                    مفعلة
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstIsActive(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      !instIsActive 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                        : 'bg-gray-50 text-gray-500 border border-gray-100'
                    }`}
                  >
                    غير مفعلة
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظة داخلية أو قيود اختيارية:</label>
                <textarea
                  value={instInternalNotes}
                  onChange={(e) => setInstInternalNotes(e.target.value)}
                  placeholder="أدخل أي تمييز إضافي أو مستندات مساندة..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsInstitutionModalOpen(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء التعديل
              </button>
              <button
                type="button"
                onClick={saveInstitution}
                className="px-5 py-2 bg-[#0057B8] hover:bg-[#00418A] text-white rounded-xl text-xs font-bold shadow-sm shadow-[#0057B8]/20 cursor-pointer"
              >
                {editingInstitution ? 'تعديل وحفظ كمسودة' : 'حفظ وإضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
