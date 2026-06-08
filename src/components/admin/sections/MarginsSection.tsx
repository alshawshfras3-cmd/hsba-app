import React, { useState, useEffect } from 'react';
import { Plus, ToggleRight, ToggleLeft, Trash2, Loader2, Copy, History } from 'lucide-react';
import { Bank, ProductId, SupportType, SectorId, MarginRule } from '../../../types';
import { calculateMargin } from '../../../lib/finance-engine/margin';

interface MarginsSectionProps {
  banks: Bank[];
  marginRules: MarginRule[];
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

const productTypesList = [
  { id: 'real_estate_only', nameAr: 'عقاري فقط' },
  { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
  { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
];

const sectorsList = [
  { id: 'gov_civil', nameAr: 'حكومي مدني' },
  { id: 'military', nameAr: 'عسكري' },
  { id: 'semi_gov', nameAr: 'شبه حكومي' },
  { id: 'companies', nameAr: 'موظف شركات' },
  { id: 'private', nameAr: 'قطاع خاص' },
  { id: 'retired', nameAr: 'متقاعد' }
];

const yearsList = [5, 10, 15, 20, 25, 30];

export const MarginsSection: React.FC<MarginsSectionProps> = ({
  banks,
  marginRules,
  setMarginRules,
  showToast
}) => {
  // Filtering States
  const [filterMarginBank, setFilterMarginBank] = useState<string>('all');
  const [filterMarginProduct, setFilterMarginProduct] = useState<string>('all');
  const [filterMarginSupport, setFilterMarginSupport] = useState<string>('all');
  const [filterMarginActiveStatus, setFilterMarginActiveStatus] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null); // null means adding

  // Modal Form States
  const [formBankId, setFormBankId] = useState('alahli');
  const [formProductId, setFormProductId] = useState<ProductId>('real_estate_only');
  const [formSupportType, setFormSupportType] = useState<SupportType>('none');
  const [formSalaryTier, setFormSalaryTier] = useState<'below_25000' | 'above_or_equal_25000' | 'not_applicable'>('not_applicable');
  const [formSectorId, setFormSectorId] = useState('gov_civil');
  const [formYear, setFormYear] = useState<number>(25);
  const [formBaseMargin, setFormBaseMargin] = useState('');
  const [formExceptionBps, setFormExceptionBps] = useState('0');
  const [formError, setFormError] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Handle support/salary-tier dependencies
  useEffect(() => {
    if (formSupportType === 'none') {
      setFormSalaryTier('not_applicable');
    } else if (formSalaryTier === 'not_applicable') {
      setFormSalaryTier('below_25000');
    }
  }, [formSupportType]);

  // Clone State
  const [showCloneCard, setShowCloneCard] = useState(false);
  const [cloneFromBank, setCloneFromBank] = useState('alahli');
  const [cloneToBank, setCloneToBank] = useState('rajhi');

  // Parameterized database saver to match exact core rules compatibility
  const updateGlobalRulesForCombo = (
    targetBank: string,
    targetProduct: ProductId,
    targetSupport: SupportType,
    targetSalaryTier: 'below_25000' | 'above_or_equal_25000' | 'not_applicable',
    marginsRecord: Record<number, string>,
    sectorExceptionsRecord: Record<string, string>,
    method: 'linear' | 'fixed' = 'fixed',
    inputMode: 'yearly' | 'key_points' = 'key_points'
  ) => {
    const productIdsToFilter = [targetProduct];
    if (targetProduct === 'real_estate_with_new_personal') {
      productIdsToFilter.push('real_estate' as any);
      productIdsToFilter.push('both' as any);
    } else if (targetProduct === 'real_estate_with_existing_personal') {
      productIdsToFilter.push('real_estate_with_personal_existing' as any);
    } else if (targetProduct === 'real_estate_only') {
      productIdsToFilter.push('real_estate' as any);
    }

    const normSupport = (targetSupport as string) === 'down_payment' || targetSupport === 'downpayment' ? 'downpayment' : targetSupport;

    const remainingRules = marginRules.filter(r => {
      const isBaseForCombo = r.bankId === targetBank &&
                             productIdsToFilter.includes(r.productId) &&
                             (r.supportType === normSupport || r.supportType === 'all') &&
                             (r.sectorId || 'all') === 'all' &&
                             (r.salaryTier === targetSalaryTier || (!r.salaryTier && targetSalaryTier === 'not_applicable')) &&
                             !r.isExceptionOnly;

      const isExceptionForCombo = r.bankId === targetBank &&
                                  productIdsToFilter.includes(r.productId) &&
                                  (r.supportType === normSupport || r.supportType === 'all') &&
                                  r.exceptionBps !== undefined &&
                                  r.sectorId !== 'all' &&
                                  (r.isExceptionOnly === true || (r.fromTermMonths === 0 && r.toTermMonths === 9999));

      return !isBaseForCombo && !isExceptionForCombo;
    });

    const newRulesForThisCombo: MarginRule[] = [];
    const filledYears = yearsList.filter(year => {
      const val = marginsRecord[year];
      return val !== undefined && val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0;
    });

    filledYears.sort((a, b) => a - b);

    if (filledYears.length > 0) {
      productIdsToFilter.forEach(pId => {
        const definitions: Array<{ from: number, to: number, start: number, end: number, calcType: 'fixed' | 'linear', yearPoint: number }> = [];

        for (let i = 0; i < filledYears.length; i++) {
          const currentYear = filledYears[i];
          const currentMarginStr = marginsRecord[currentYear];
          const currentMarginVal = parseFloat(currentMarginStr) || 0;

          if (i === 0) {
            definitions.push({
              from: 0,
              to: currentYear * 12,
              start: currentMarginVal,
              end: currentMarginVal,
              calcType: 'fixed' as const,
              yearPoint: currentYear
            });
          } else {
            const prevYear = filledYears[i - 1];
            const prevMarginStr = marginsRecord[prevYear];
            const prevMarginVal = parseFloat(prevMarginStr) || 0;

            const fromMonths = prevYear * 12 + 1;
            const toMonths = currentYear * 12;

            definitions.push({
              from: fromMonths,
              to: toMonths,
              start: method === 'fixed' ? currentMarginVal : prevMarginVal,
              end: currentMarginVal,
              calcType: method,
              yearPoint: currentYear
            });
          }
        }

        const lastYear = filledYears[filledYears.length - 1];
        const lastMarginStr = marginsRecord[lastYear];
        const lastMarginVal = parseFloat(lastMarginStr) || 0;

        definitions.push({
          from: lastYear * 12 + 1,
          to: 9999,
          start: lastMarginVal,
          end: lastMarginVal,
          calcType: 'fixed' as const,
          yearPoint: lastYear
        });

        definitions.forEach((def, index) => {
          newRulesForThisCombo.push({
            id: `gen_margin_${targetBank}_${pId}_${normSupport}_${targetSalaryTier}_t${def.from}_${def.to}_${index}`,
            bankId: targetBank,
            productId: pId as ProductId,
            supportType: normSupport as any,
            sectorId: 'all',
            fromTermMonths: def.from,
            toTermMonths: def.to,
            startMargin: def.start,
            endMargin: def.end,
            calcType: def.calcType,
            isActive: true,
            salaryTier: targetSalaryTier,
            productType: targetProduct as any,
            marginInputMode: inputMode,
            calculationMethod: method,
            year: def.yearPoint,
            termMonths: def.to === 9999 ? (def.yearPoint * 12) : def.to,
            annualMargin: def.end,
            exceptionBps: 0,
            baseMargin: Number((def.end / 100).toFixed(6))
          });
        });
      });
    }

    const newExceptionRules: MarginRule[] = [];
    sectorsList.forEach(secObj => {
      const secId = secObj.id;
      const parsedBps = parseInt(sectorExceptionsRecord[secId] || '0', 10);
      productIdsToFilter.forEach(pId => {
        newExceptionRules.push({
          id: `exception_${targetBank}_${secId}_${pId}_${normSupport}`,
          bankId: targetBank,
          sectorId: secId as SectorId,
          productId: pId as ProductId,
          supportType: normSupport as any,
          fromTermMonths: 0,
          toTermMonths: 9999,
          startMargin: 0,
          endMargin: 0,
          calcType: 'fixed',
          isActive: true,
          isExceptionOnly: true,
          exceptionBps: parsedBps,
          productType: targetProduct as any,
          salaryTier: targetSalaryTier
        });
      });
    });

    setMarginRules([...remainingRules, ...newRulesForThisCombo, ...newExceptionRules]);
  };

  // Compile combined flat row configs
  const getFilteredMarginRows = () => {
    const list: any[] = [];
    const targetBanks = banks.map(b => b.id);

    targetBanks.forEach(bId => {
      if (filterMarginBank !== 'all' && bId !== filterMarginBank) return;

      productTypesList.forEach(pObj => {
        const pId = pObj.id as ProductId;
        if (filterMarginProduct !== 'all' && pId !== filterMarginProduct) return;

        const supports: SupportType[] = ['none', 'monthly', 'downpayment'];
        supports.forEach(sId => {
          if (filterMarginSupport !== 'all' && sId !== filterMarginSupport) return;

          const tiers: Array<'not_applicable' | 'below_25000' | 'above_or_equal_25000'> = sId === 'none'
            ? ['not_applicable']
            : ['below_25000', 'above_or_equal_25000'];

          tiers.forEach(tier => {
            // Check if any rule exists for this combination
            const relevantRules = marginRules.filter(r => 
              r.bankId === bId &&
              (r.productId === pId || r.productType === pId || (pId === 'real_estate_only' && r.productId === 'real_estate')) &&
              (r.supportType === sId || r.supportType === 'all') &&
              (r.salaryTier === tier || (!r.salaryTier && tier === 'not_applicable'))
            );

            if (relevantRules.length === 0) return;

            sectorsList.forEach(sec => {
              yearsList.forEach(year => {
                const result = calculateMargin({
                  bankId: bId,
                  productId: pId,
                  supportType: sId,
                  sectorId: sec.id as SectorId,
                  termMonths: year * 12,
                  marginRules,
                  netSalary: tier === 'below_25000' ? 20000 : tier === 'above_or_equal_25000' ? 30000 : undefined
                });

                // Read active state
                const matchedBaseRule = relevantRules.find(r => 
                  (r.sectorId === 'all' || !r.sectorId) &&
                  !r.isExceptionOnly &&
                  (r.year === year || r.toTermMonths === year * 12)
                );
                const isActive = matchedBaseRule ? matchedBaseRule.isActive !== false : true;

                if (filterMarginActiveStatus === 'active' && !isActive) return;
                if (filterMarginActiveStatus === 'inactive' && isActive) return;

                list.push({
                  id: `combo_${bId}_${pId}_${sId}_${tier}_${sec.id}_${year}`,
                  bankId: bId,
                  productId: pId,
                  supportType: sId,
                  salaryTier: tier,
                  sectorId: sec.id,
                  sectorNameAr: sec.nameAr,
                  year: year,
                  baseMargin: result.baseMargin !== undefined ? (result.baseMargin * 100) : result.annualMargin,
                  exceptionBps: result.exceptionBps,
                  finalMarginSec: result.annualMargin,
                  isActive: isActive
                });
              });
            });
          });
        });
      });
    });

    return list;
  };

  // Open edit modal
  const openEditMarginModal = (row: any) => {
    setEditingCombo(row);
    setFormBankId(row.bankId);
    setFormProductId(row.productId);
    setFormSupportType(row.supportType);
    setFormSalaryTier(row.salaryTier);
    setFormSectorId(row.sectorId);
    setFormYear(row.year);
    setFormBaseMargin(String(row.baseMargin));
    setFormExceptionBps(String(row.exceptionBps));
    setFormIsActive(row.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open add modal
  const openAddMarginModal = () => {
    setEditingCombo(null);
    setFormBankId(filterMarginBank !== 'all' ? filterMarginBank : 'alahli');
    setFormProductId(filterMarginProduct !== 'all' ? filterMarginProduct as any : 'real_estate_only');
    setFormSupportType(filterMarginSupport !== 'all' ? filterMarginSupport as any : 'none');
    setFormSalaryTier('not_applicable');
    setFormSectorId('gov_civil');
    setFormYear(25);
    setFormBaseMargin('');
    setFormExceptionBps('0');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Modal Action
  const saveMarginRule = () => {
    try {
      if (!formBankId) {
        setFormError('يرجى اختيار البنك.');
        return;
      }
      if (!formProductId) {
        setFormError('يرجى اختيار نوع المنتج.');
        return;
      }
      if (formBaseMargin === '') {
        setFormError('يرجى إدخال هامش الجدول %.');
        return;
      }
      const baseVal = parseFloat(formBaseMargin);
      if (isNaN(baseVal) || baseVal < 0) {
        setFormError('يرجى إدخال نسبة مئوية صحيحة لهامش الجدول (مثال: 4.35).');
        return;
      }
      const exBps = parseInt(formExceptionBps || '0', 10);
      if (isNaN(exBps)) {
        setFormError('يرجى إدخال قيمة صحيحة للنسبة الاستثنائية Bps.');
        return;
      }

      const productIdsToFilter = [formProductId];
      if (formProductId === 'real_estate_with_new_personal') {
        productIdsToFilter.push('real_estate' as any, 'both' as any);
      } else if (formProductId === 'real_estate_with_existing_personal') {
        productIdsToFilter.push('real_estate_with_personal_existing' as any);
      } else if (formProductId === 'real_estate_only') {
        productIdsToFilter.push('real_estate' as any);
      }

      const normSupport = formSupportType === 'down_payment' ? 'downpayment' : formSupportType;

      // Extract existing years configuration for this combo
      const baseMarginsDict: Record<number, string> = {};
      yearsList.forEach(y => {
        const match = marginRules.find(r => 
          r.bankId === formBankId && 
          productIdsToFilter.includes(r.productId) && 
          (r.supportType === normSupport || r.supportType === 'all') &&
          (r.salaryTier === formSalaryTier || (!r.salaryTier && formSalaryTier === 'not_applicable')) &&
          (r.year === y || r.toTermMonths === y * 12) &&
          !r.isExceptionOnly
        );
        baseMarginsDict[y] = match ? (match.annualMargin !== undefined ? match.annualMargin : match.endMargin).toString() : '';
      });
      baseMarginsDict[formYear] = String(baseVal);

      // Extract existing exceptions
      const exceptionDict: Record<string, string> = {};
      sectorsList.forEach(secObj => {
        const secId = secObj.id;
        const match = marginRules.find(r => 
          r.bankId === formBankId &&
          productIdsToFilter.includes(r.productId) &&
          (r.supportType === normSupport || r.supportType === 'all') &&
          r.sectorId === secId &&
          (r.salaryTier === formSalaryTier || (!r.salaryTier && formSalaryTier === 'not_applicable')) &&
          r.isExceptionOnly === true
        );
        exceptionDict[secId] = match && match.exceptionBps !== undefined ? match.exceptionBps.toString() : '0';
      });
      exceptionDict[formSectorId] = String(exBps);

      // Save!
      updateGlobalRulesForCombo(
        formBankId,
        formProductId,
        formSupportType,
        formSalaryTier,
        baseMarginsDict,
        exceptionDict,
        'fixed',
        'key_points'
      );

      showToast(editingCombo ? 'تم تعديل الهامش وقاعدة الاستثناء بنجاح!' : 'تم إضافة الهامش الجديد بنجاح!', 'success');
      setIsModalOpen(false);
      setEditingCombo(null);
    } catch (e) {
      console.error(e);
      setFormError('حدث خطأ مباغت أثناء الحفظ.');
    }
  };

  // Delete/Clear combo values
  const deleteMarginRow = (row: any) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف قاعدة هذا الهامش والاستثناء؟ سيتم تصفير القيم وإعادة تعيين الهامش.')) {
      try {
        const productIdsToFilter = [row.productId];
        if (row.productId === 'real_estate_with_new_personal') {
          productIdsToFilter.push('real_estate' as any, 'both' as any);
        } else if (row.productId === 'real_estate_with_existing_personal') {
          productIdsToFilter.push('real_estate_with_personal_existing' as any);
        } else if (row.productId === 'real_estate_only') {
          productIdsToFilter.push('real_estate' as any);
        }

        const normSupport = row.supportType === 'down_payment' ? 'downpayment' : row.supportType;

        const baseMarginsDict: Record<number, string> = {};
        yearsList.forEach(y => {
          const match = marginRules.find(r => 
            r.bankId === row.bankId && 
            productIdsToFilter.includes(r.productId) && 
            (r.supportType === normSupport || r.supportType === 'all') &&
            (r.salaryTier === row.salaryTier || (!r.salaryTier && row.salaryTier === 'not_applicable')) &&
            (r.year === y || r.toTermMonths === y * 12) &&
            !r.isExceptionOnly
          );
          baseMarginsDict[y] = match ? (match.annualMargin !== undefined ? match.annualMargin : match.endMargin).toString() : '';
        });
        baseMarginsDict[row.year] = ''; // clear

        const exceptionDict: Record<string, string> = {};
        sectorsList.forEach(secObj => {
          const secId = secObj.id;
          const match = marginRules.find(r => 
            r.bankId === row.bankId &&
            productIdsToFilter.includes(r.productId) &&
            (r.supportType === normSupport || r.supportType === 'all') &&
            r.sectorId === secId &&
            (r.salaryTier === row.salaryTier || (!r.salaryTier && row.salaryTier === 'not_applicable')) &&
            r.isExceptionOnly === true
          );
          exceptionDict[secId] = match && match.exceptionBps !== undefined ? match.exceptionBps.toString() : '0';
        });
        exceptionDict[row.sectorId] = '0'; // clear exception Bps

        updateGlobalRulesForCombo(
          row.bankId,
          row.productId,
          row.supportType,
          row.salaryTier,
          baseMarginsDict,
          exceptionDict,
          'fixed',
          'key_points'
        );

        showToast('تم تصفير الهامش والاستثناء وتحديث القواعد بنجاح.', 'success');
      } catch (e) {
        console.error(e);
        showToast('فشل تصفير القيم.', 'refuse');
      }
    }
  };

  // Perform whole bank-to-bank configs clone
  const handleCloneBankLevel = () => {
    if (cloneFromBank === cloneToBank) {
      showToast('لا يمكن النسخ من وإلى نفس البنك.', 'refuse');
      return;
    }

    if (window.confirm(`هل أنت متأكد من رغبتك في استنساخ كافة هوامش واستثناءات البنك [${banks.find(b => b.id === cloneFromBank)?.nameAr}] وتطبيقها بدلاً من هوامش البنك [${banks.find(b => b.id === cloneToBank)?.nameAr}]؟`)) {
      try {
        const remainingRules = marginRules.filter(r => r.bankId !== cloneToBank);
        const sourceRules = marginRules.filter(r => r.bankId === cloneFromBank);

        const cloned = sourceRules.map((rule, idx) => ({
          ...rule,
          id: `cloned_margin_${cloneToBank}_${idx}_${Date.now()}`,
          bankId: cloneToBank
        }));

        setMarginRules([...remainingRules, ...cloned]);
        showToast('تم استنساخ هوامش وقواعد البنك كاملة بنجاح!', 'success');
        setShowCloneCard(false);
      } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء عملية الاستنساخ.', 'refuse');
      }
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1 text-right">
          <h2 className="text-xl font-bold text-gray-900">هوامش الأرباح البنكية</h2>
          <p className="text-xs text-gray-500">
            شاشة إدارة هوامش الأرباح التمويلية الأساسية واستثناءات القطاعات في جدول مركزي واحد موحد.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCloneCard(!showCloneCard)}
            className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ إعدادات بنك</span>
          </button>
          <button
            type="button"
            onClick={openAddMarginModal}
            className="inline-flex items-center gap-2 bg-[#0057B8] hover:bg-[#00418A] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-[#0057B8]/20 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة هامش جديد</span>
          </button>
        </div>
      </div>

      {/* Clone Quick Actions Block */}
      {showCloneCard && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200 text-right">
          <h4 className="font-bold text-slate-800 text-xs">📋 استنساخ ومزامنة هوامش جهة تمويلية كاملة</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">البنك المصدر (الذي ستنسخ منه):</label>
              <select
                value={cloneFromBank}
                onChange={(e) => setCloneFromBank(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">البنك المستهدف (الذي سيمسح ويستبدل):</label>
              <select
                value={cloneToBank}
                onChange={(e) => setCloneToBank(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleCloneBankLevel}
              className="px-5 py-2 bg-[#0057B8] text-white rounded-xl text-xs font-bold hover:bg-[#004bb0] shadow-xs cursor-pointer"
            >
              تأكيد الاستنساخ والمزامنة
            </button>
          </div>
        </div>
      )}

      {/* Banks Horizontal Scrollable Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2.5">
        {[
          { id: 'all', nameAr: 'كل البنوك' },
          ...banks.map(b => ({ id: b.id, nameAr: b.nameAr }))
        ].map((b) => {
          const isSelected = filterMarginBank === b.id;
          const rowsForBank = b.id === 'all'
            ? getFilteredMarginRows()
            : getFilteredMarginRows().filter(r => r.bankId === b.id);
          const count = rowsForBank.length;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setFilterMarginBank(b.id)}
              className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-sm shadow-[#0057B8]/20 scale-[1.01]'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-250/60'
              }`}
            >
              <span>{b.nameAr}</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg min-w-[20px] text-[10px] font-extrabold ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
        {/* Product Type */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">نوع المنتج:</label>
          <select
            value={filterMarginProduct}
            onChange={(e) => setFilterMarginProduct(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل المنتجات</option>
            {productTypesList.map(type => (
              <option key={type.id} value={type.id}>{type.nameAr}</option>
            ))}
          </select>
        </div>

        {/* Support Type */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">نوع الدعم:</label>
          <select
            value={filterMarginSupport}
            onChange={(e) => setFilterMarginSupport(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل أنواع الدعم</option>
            <option value="none">غير مدعوم</option>
            <option value="monthly">دعم شهري</option>
            <option value="downpayment">دعم دفعة</option>
          </select>
        </div>

        {/* Active Status */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">الحالة:</label>
          <select
            value={filterMarginActiveStatus}
            onChange={(e) => setFilterMarginActiveStatus(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل الحالات</option>
            <option value="active">مفعل فقط</option>
            <option value="inactive">غير مفعل</option>
          </select>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl p-4.5 border border-amber-150 text-right text-xs leading-relaxed text-amber-800 space-y-1 font-sans">
        <span className="font-extrabold block mb-1">💡 طريقة آلية تطبيق المعادلة:</span>
        <p>• <b>هامش الجدول Base Margin %</b> موحد للبنك والمدد المطلوبة بغض النظر عن القطاع. تعديله من أي قطاع يحدث القيمة لكافة القطاعات المماثلة.</p>
        <p>• <b>نسبة الاستثناء Bps</b> تحدد القيمة التقاعدية أو العسكرية أو القطاعية المخصومة لجهة العمل بشكل كامل عبر جميع سنوات وعمر التمويل.</p>
        <p>• <b>الهامش النهائي %</b> = هامش الجدول % مطروحاً منه استثناء القطاع (قسمة 100). هذه هي النسبة النهائية المعالجة والمطبقة في الحسبة آلياً.</p>
      </div>

      {/* Main Unified Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-right">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#111827] min-w-[1000px] font-sans">
            <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 font-bold text-right">البنك</th>
                <th className="p-4 font-bold text-right">نوع المنتج</th>
                <th className="p-4 font-bold text-right">نوع الدعم</th>
                <th className="p-4 font-bold text-right">القطاع</th>
                <th className="p-4 font-bold text-right">مدة التمويل</th>
                <th className="p-4 font-bold text-center">هامش الجدول %</th>
                <th className="p-4 font-bold text-center">نسبة الاستثناء Bps</th>
                <th className="p-4 font-bold text-center">الهامش النهائي %</th>
                <th className="p-4 font-bold text-center">الحالة</th>
                <th className="p-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-semibold text-slate-700">
              {(() => {
                const list = getFilteredMarginRows();
                if (list.length === 0) {
                  return (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400 font-bold whitespace-nowrap">
                        لا توجد هوامش أو استثناءات مسجلة تطابق التصفية الاختيارية الحالية.
                      </td>
                    </tr>
                  );
                }

                return list.map((row) => {
                  const bObj = banks.find(b => b.id === row.bankId);
                  const bankName = bObj ? bObj.nameAr : row.bankId;
                  const productName = productTypesList.find(p => p.id === row.productId)?.nameAr || row.productId;
                  
                  let supportName = row.supportType === 'none' ? 'غير مدعوم' : row.supportType === 'monthly' ? 'دعم شهري' : 'دعم دفعة';
                  if (row.salaryTier === 'below_25000') {
                    supportName += ' (< 25 ألف راتب)';
                  } else if (row.salaryTier === 'above_or_equal_25000') {
                    supportName += ' (>= 25 ألف راتب)';
                  }

                  const durationLabel = row.year === 5 || row.year === 10 ? `${row.year} سنوات` : `${row.year} سنة`;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{bankName}</td>
                      <td className="p-4 text-slate-600 whitespace-nowrap">{productName}</td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{supportName}</td>
                      <td className="p-4 text-slate-900 font-bold whitespace-nowrap">{row.sectorNameAr}</td>
                      <td className="p-4 text-slate-700 font-mono whitespace-nowrap">{durationLabel}</td>
                      <td className="p-4 text-center text-slate-800 font-mono font-bold">{(row.baseMargin || 0).toFixed(2)}%</td>
                      <td className={`p-4 text-center font-mono font-bold whitespace-nowrap ${
                        row.exceptionBps > 0 
                          ? 'text-rose-500' 
                          : row.exceptionBps < 0 
                            ? 'text-emerald-500' 
                            : 'text-slate-400'
                      }`}>
                        {row.exceptionBps > 0 ? `+${row.exceptionBps}` : row.exceptionBps} Bps
                      </td>
                      <td className="p-4 text-center text-[#0057B8] font-mono font-extrabold text-sm">{(row.finalMarginSec || 0).toFixed(3)}%</td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            // Find base margin rule for this combination and toggle
                            const matchedBaseRule = marginRules.find(r => 
                              r.bankId === row.bankId &&
                              (r.productId === row.productId || r.productType === row.productId) &&
                              (r.year === row.year || r.toTermMonths === row.year * 12) &&
                              !r.isExceptionOnly
                            );
                            if (matchedBaseRule) {
                              setMarginRules(prev => prev.map(m => m.id === matchedBaseRule.id ? { ...m, isActive: !m.isActive } : m));
                              showToast('تم تغيير حالة تفعيل الهامش بنجاح', 'success');
                            } else {
                              showToast('الرجاء تهيئة قاعدة الهامش وتعديلها أولاً لتفعيل التبديل آلياً.', 'refuse');
                            }
                          }}
                          className="inline-flex items-center justify-center p-1 cursor-pointer transition-colors"
                        >
                          {row.isActive ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500 animate-in fade-in duration-200" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-300 animate-in fade-in duration-200" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditMarginModal(row)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-[#0057B8] cursor-pointer transition-colors"
                            title="تعديل هذا الصف"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMarginRow(row)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 cursor-pointer transition-colors"
                            title="حذف وتصفير"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL FOR ADD/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-[#0057B8] text-white p-5 flex justify-between items-center">
              <h3 className="text-sm font-bold">
                {editingCombo ? 'تعديل الهامش وقاعدة الاستثناء' : 'إضافة قاعدة هامش جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-slate-200 transition-colors text-lg font-bold outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] text-right">
              {formError && (
                <div className="bg-rose-50 border border-rose-150 text-rose-700 text-xs font-bold rounded-xl p-3.5">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Bank */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-gray-600">البنك التمويلي:</label>
                  <select
                    value={formBankId}
                    onChange={(e) => setFormBankId(e.target.value)}
                    disabled={editingCombo !== null}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Product Type */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-gray-600">نوع المنتج ككل:</label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value as ProductId)}
                    disabled={editingCombo !== null}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    {productTypesList.map(p => (
                      <option key={p.id} value={p.id}>{p.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Support Type */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">نوع الدعم:</label>
                  <select
                    value={formSupportType}
                    onChange={(e) => setFormSupportType(e.target.value as SupportType)}
                    disabled={editingCombo !== null}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    <option value="none">غير مدعوم</option>
                    <option value="monthly">دعم شهري</option>
                    <option value="downpayment">دعم دفعة</option>
                  </select>
                </div>

                {/* Salary Tier */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">فئة الراتب:</label>
                  <select
                    value={formSalaryTier}
                    onChange={(e) => setFormSalaryTier(e.target.value as any)}
                    disabled={editingCombo !== null || formSupportType === 'none'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    {formSupportType === 'none' ? (
                      <option value="not_applicable">غير مطبق</option>
                    ) : (
                      <>
                        <option value="below_25000">أقل من 25 ألف ريال</option>
                        <option value="above_or_equal_25000">25 ألف ريال فأكثر</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Sector */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">القطاع:</label>
                  <select
                    value={formSectorId}
                    onChange={(e) => setFormSectorId(e.target.value)}
                    disabled={editingCombo !== null}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    {sectorsList.map(s => (
                      <option key={s.id} value={s.id}>{s.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">مدة التمويل (سنوات):</label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                    disabled={editingCombo !== null}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0057B8] disabled:opacity-60"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y} سنة</option>
                    ))}
                  </select>
                </div>

                {/* Base margin value */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">هامش الجدول Base %:</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formBaseMargin}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          setFormBaseMargin(val);
                        }
                      }}
                      placeholder="4.35"
                      className="w-full bg-white border border-gray-250 rounded-xl px-4 py-2.5 pl-8 text-xs font-bold font-mono text-left focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">%</span>
                  </div>
                </div>

                {/* Exception Bps */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">نسبة الاستثناء Bps (نقاط):</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formExceptionBps}
                    onChange={(e) => {
                      let valStr = e.target.value;
                      valStr = valStr.replace(/[^0-9-]/g, '');
                      setFormExceptionBps(valStr);
                    }}
                    placeholder="-192"
                    className="w-full bg-white border border-gray-250 rounded-xl px-4 py-2.5 text-xs font-bold font-mono text-left focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 text-[10px] text-gray-500 leading-normal space-y-1">
                <p>💡 ملاحظة آلية التحديث:</p>
                <p>• تحديث "هامش الجدول" ينعكس لجميع قطاعات هذه المدة والبنك بشكل جماعي لتوحيد القاعدة الأساسية.</p>
                <p>• تحديث "نسبة الاستثناء" ينعكس لجميع مدد وسنوات هذا القطاع للبنك المحدد للحفاظ على النسبة المئوية المخصومة.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveMarginRule}
                className="px-6 py-2.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-[#0057B8]"
              >
                حفظ القاعدة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
