import React, { useState, useEffect } from 'react';
import { Bank, ProductId, SupportType, MarginRule } from '../../../types';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

interface MarginsSectionProps {
  banks: Bank[];
  marginRules: MarginRule[];
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  openHistory: (tableName: string, bankId: string, title: string) => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: Array<'margins' | 'dsr' | 'personal' | 'salary_source' | 'pension'>) => void;
  setShowCopyModal: (show: boolean) => void;
}

export default function MarginsSection({
  banks,
  marginRules,
  setMarginRules,
  showToast,
  openHistory,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal
}: MarginsSectionProps) {
  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  // Profit Margins Selector and Editor states
  const [selectedMarginBank, setSelectedMarginBank] = useState<string>('alahli');
  const [selectedMarginProduct, setSelectedMarginProduct] = useState<ProductId>('real_estate_only');
  const [selectedMarginSupport, setSelectedMarginSupport] = useState<SupportType>('none');
  const [selectedMarginSalaryTier, setSelectedMarginSalaryTier] = useState<'below_25000' | 'above_or_equal_25000' | 'not_applicable'>('not_applicable');
  const [selectedMarginInputMode, setSelectedMarginInputMode] = useState<'yearly' | 'key_points'>('key_points');

  useEffect(() => {
    if (selectedMarginSupport === 'none') {
      setSelectedMarginSalaryTier('not_applicable');
    } else if (selectedMarginSalaryTier === 'not_applicable') {
      setSelectedMarginSalaryTier('below_25000');
    }
  }, [selectedMarginSupport]);

  const [localMargins, setLocalMargins] = useState<Record<number, string>>({
    5: '3.80',
    10: '3.98',
    15: '4.25',
    20: '4.60',
    25: '4.95',
    30: '5.25'
  });
  const [localCalcMethod, setLocalCalcMethod] = useState<'linear' | 'fixed'>('fixed');

  // Copy-from states for Cloning inside the same bank & cross-bank
  const [cloningFromBank, setCloningFromBank] = useState<string>('alahli');
  const [cloningFromProduct, setCloningFromProduct] = useState<ProductId>('real_estate_only');
  const [cloningFromSupport, setCloningFromSupport] = useState<SupportType>('none');
  const [cloningFromSalaryTier, setCloningFromSalaryTier] = useState<'below_25000' | 'above_or_equal_25000' | 'not_applicable'>('not_applicable');

  useEffect(() => {
    setCloningFromBank(selectedMarginBank);
  }, [selectedMarginBank]);

  // Synchronize local states when selection changes or marginRules are canceled/refreshed
  useEffect(() => {
    const relevantRules = marginRules.filter(r => 
      r.bankId === selectedMarginBank && 
      (r.productType === selectedMarginProduct || r.productId === selectedMarginProduct || (selectedMarginProduct === 'real_estate_only' && r.productId === 'real_estate')) && 
      (r.supportType === selectedMarginSupport || r.supportType === 'all') &&
      (r.salaryTier === selectedMarginSalaryTier || (!r.salaryTier && selectedMarginSalaryTier === 'not_applicable'))
    );

    const yearsList = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const initialMargins: Record<number, string> = {};

    const hasRules = relevantRules.length > 0;

    yearsList.forEach(year => {
      const rY = relevantRules.find(r => r.year === year || r.toTermMonths === year * 12);
      if (rY) {
        initialMargins[year] = (rY.annualMargin !== undefined ? rY.annualMargin : rY.endMargin).toString();
      } else {
        const isStandardYear = [5, 10, 15, 20, 25, 30].includes(year);
        if (!hasRules && isStandardYear) {
          if (year === 5) initialMargins[year] = '3.80';
          else if (year === 10) initialMargins[year] = '3.98';
          else if (year === 15) initialMargins[year] = '4.25';
          else if (year === 20) initialMargins[year] = '4.60';
          else if (year === 25) initialMargins[year] = '4.95';
          else if (year === 30) initialMargins[year] = '5.25';
        } else {
          initialMargins[year] = '';
        }
      }
    });

    let method: 'linear' | 'fixed' = 'fixed';
    const foundMethodRule = relevantRules.find(r => r.calculationMethod || r.calcType);
    if (foundMethodRule) {
      method = (foundMethodRule.calculationMethod || foundMethodRule.calcType) as any;
    }

    let inputMode: 'yearly' | 'key_points' = 'key_points';
    const foundInputModeRule = relevantRules.find(r => r.marginInputMode);
    if (foundInputModeRule) {
      inputMode = foundInputModeRule.marginInputMode;
    } else {
      const hasIntermediate = relevantRules.some(r => {
        const y = r.year || (r.toTermMonths / 12);
        return y !== undefined && ![5, 10, 15, 20, 25, 30].includes(y);
      });
      if (hasIntermediate) {
        inputMode = 'yearly';
      }
    }

    setLocalMargins(initialMargins);
    setLocalCalcMethod(method);
    setSelectedMarginInputMode(inputMode);
  }, [selectedMarginBank, selectedMarginProduct, selectedMarginSupport, selectedMarginSalaryTier, marginRules]);

  const updateGlobalRulesFromLocal = (marginsRecord: Record<number, string>, method: 'linear' | 'fixed', inputMode: 'yearly' | 'key_points') => {
    const productIdsToFilter = [selectedMarginProduct];
    if (selectedMarginProduct === 'real_estate_with_new_personal') {
      productIdsToFilter.push('real_estate');
      productIdsToFilter.push('both');
    } else if (selectedMarginProduct === 'real_estate_with_existing_personal') {
      productIdsToFilter.push('real_estate_with_personal_existing');
    } else if (selectedMarginProduct === 'real_estate_only') {
      productIdsToFilter.push('real_estate');
    }

    const normSupport = selectedMarginSupport === 'down_payment' ? 'downpayment' : selectedMarginSupport;

    const remainingRules = marginRules.filter(r => {
      const matchesTarget = r.bankId === selectedMarginBank &&
                            productIdsToFilter.includes(r.productId) &&
                            (r.supportType === normSupport || r.supportType === 'all') &&
                            (r.salaryTier === selectedMarginSalaryTier || (!r.salaryTier && selectedMarginSalaryTier === 'not_applicable'));
      return !matchesTarget;
    });

    const newRulesForThisCombo: MarginRule[] = [];
    
    const yearsToSave = inputMode === 'yearly'
      ? Array.from({ length: 26 }, (_, i) => 5 + i)
      : [5, 10, 15, 20, 25, 30];

    // Find definitions
    const dataPoints: { yearPoint: number; from: number; to: number; start: number; end: number }[] = [];
    yearsToSave.forEach(year => {
      const valStr = marginsRecord[year];
      const parsedVal = parseNumberInput(valStr, NaN);
      if (valStr !== undefined && valStr !== '' && !isNaN(parsedVal)) {
        const val = parsedVal;
        dataPoints.push({
          yearPoint: year,
          from: year === 5 ? 0 : (year - 1) * 12 + 1,
          to: year * 12,
          start: val,
          end: val
        });
      }
    });

    dataPoints.sort((a, b) => a.yearPoint - b.yearPoint);

    dataPoints.forEach((def, index) => {
      if (index === 0) {
        def.from = 0;
      }
      if (index === dataPoints.length - 1) {
        def.to = 9999;
      } else {
        const nextPoint = dataPoints[index + 1];
        def.to = (nextPoint.yearPoint - 1) * 12;
      }
    });

    productIdsToFilter.forEach(pId => {
      dataPoints.forEach((def, index) => {
        newRulesForThisCombo.push({
          id: `gen_margin_${selectedMarginBank}_${pId}_${normSupport}_${selectedMarginSalaryTier}_t${def.from}_${def.to}_${index}`,
          bankId: selectedMarginBank,
          productId: pId,
          productType: selectedMarginProduct,
          supportType: normSupport,
          salaryTier: selectedMarginSalaryTier === 'not_applicable' ? undefined : selectedMarginSalaryTier,
          fromTermMonths: def.from,
          toTermMonths: def.to,
          marginInputMode: inputMode,
          calculationMethod: method,
          year: def.yearPoint,
          termMonths: def.to === 9999 ? (def.yearPoint * 12) : def.to,
          annualMargin: def.end,
          sectorId: 'all',
          startMargin: def.start,
          endMargin: def.end,
          calcType: method,
          isActive: true
        });
      });
    });

    setMarginRules([...remainingRules, ...newRulesForThisCombo]);
  };

  const handleMarginLocalChange = (year: number, value: string) => {
    setLocalMargins(prev => ({ ...prev, [year]: value }));
  };

  const handleSaveMargins = () => {
    updateGlobalRulesFromLocal(localMargins, localCalcMethod, selectedMarginInputMode);
    showToast("تم حفظ وتطبيق إعدادات الهوامش على الحسبة", "success");
  };

  const handleCloneLocal = () => {
    if (cloningFromBank === selectedMarginBank &&
        cloningFromProduct === selectedMarginProduct &&
        cloningFromSupport === selectedMarginSupport &&
        cloningFromSalaryTier === selectedMarginSalaryTier) {
      showToast("لا يمكن النسخ من وإلى نفس الحالة الحالية تماماً.", "refuse");
      return;
    }

    const confirmCopy = window.confirm("سيتم استبدال قيم الجدول الحالي بقيم الجدول المصدر المحدد. الحفظ التلقائي سيطبق. هل أنت متأكد؟");
    if (!confirmCopy) return;

    const sourceRules = marginRules.filter(r => 
      r.bankId === cloningFromBank && 
      (r.productType === cloningFromProduct || r.productId === cloningFromProduct || (cloningFromProduct === 'real_estate_only' && r.productId === 'real_estate')) && 
      (r.supportType === cloningFromSupport || r.supportType === 'all') &&
      (r.salaryTier === cloningFromSalaryTier || (!r.salaryTier && cloningFromSalaryTier === 'not_applicable'))
    );

    let method: 'linear' | 'fixed' = 'fixed';
    if (sourceRules.length > 0) {
      const match = sourceRules.find(r => r.calculationMethod || r.calcType);
      if (match) {
        method = (match.calculationMethod || match.calcType) as any;
      }
    }

    let inputMode: 'yearly' | 'key_points' = 'key_points';
    const foundInputModeRule = sourceRules.find(r => r.marginInputMode);
    if (foundInputModeRule) {
      inputMode = foundInputModeRule.marginInputMode;
    } else {
      const hasIntermediate = sourceRules.some(r => {
        const y = r.year || (r.toTermMonths / 12);
        return y !== undefined && ![5, 10, 15, 20, 25, 30].includes(y);
      });
      if (hasIntermediate) {
        inputMode = 'yearly';
      }
    }

    const yearsList = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const newCopiedMargins: Record<number, string> = {};

    yearsList.forEach(year => {
      const rY = sourceRules.find(r => r.year === year || r.toTermMonths === year * 12);
      newCopiedMargins[year] = rY ? (rY.annualMargin !== undefined ? rY.annualMargin : rY.endMargin).toString() : '';
    });

    setLocalMargins(newCopiedMargins);
    setLocalCalcMethod(method);
    setSelectedMarginInputMode(inputMode);

    updateGlobalRulesFromLocal(newCopiedMargins, method, inputMode);
    showToast("تم استنساخ الجدول بنجاح وتحديث المسودة الحالية.", "success");
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] pb-4">
        <h2 className="text-xl font-extrabold text-[#111827]">هوامش الأرباح البنكية</h2>
        <p className="text-xs text-[#6B7280] mt-1">إدارة هوامش التمويل حسب البنك والمنتج ونوع الدعم والمدة.</p>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
        <span className="text-xs font-bold text-slate-700">عمليات سريعة للبنك التمويلي الحالي:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCopyTargetBank(selectedMarginBank);
              setCopySourceBank('');
              setCopySections(['margins']);
              setShowCopyModal(true);
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📋 نسخ إعدادات من بنك آخر
          </button>
          <button
            type="button"
            onClick={() => {
              openHistory('margin_rules', selectedMarginBank, `سجل تغييرات قواعد الهامش — ${formBanksList.find(b => b.id === selectedMarginBank)?.nameAr || selectedMarginBank}`);
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📜 سجل التغييرات
          </button>
        </div>
      </div>

      {/* Bank Selection Tabs */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-gray-500 block mb-1 font-sans">اختر البنك التمويلي:</span>
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 font-sans">
          {[
            { id: 'alahli', nameAr: 'البنك الأهلي السعودي' },
            { id: 'rajhi', nameAr: 'مصرف الراجحي' },
            { id: 'alinma', nameAr: 'مصرف الإنماء' },
            { id: 'fransi', nameAr: 'البنك السعودي الفرنسي' },
            { id: 'bidaya', nameAr: 'بداية لتمويل المنازل' },
            { id: 'albilad', nameAr: 'بنك البلاد' },
            { id: 'alarabi', nameAr: 'البنك العربي الوطني' }
          ].map((b) => {
            const isSelected = selectedMarginBank === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedMarginBank(b.id)}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0057B8] text-white shadow-[#0057B8]/20 shadow-md scale-[1.02]' 
                    : 'bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 hover:border-gray-300'
                }`}
              >
                {b.nameAr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection Grid */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
        {/* المنتج */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">أولاً: المنتج</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'real_estate_only', nameAr: 'عقاري فقط' },
              { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
              { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
            ].map((p) => {
              const isSelected = selectedMarginProduct === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedMarginProduct(p.id as ProductId)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-xs font-extrabold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {p.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* نوع الدعم */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">ثانياً: نوع الدعم</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'none', nameAr: 'غير مدعوم' },
              { id: 'monthly', nameAr: 'دعم شهري' },
              { id: 'downpayment', nameAr: 'دعم دفعة' }
            ].map((s) => {
              const isSelected = selectedMarginSupport === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedMarginSupport(s.id as SupportType)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-xs font-extrabold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {s.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* فئة الراتب */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">ثالثاً: فئة الراتب</span>
          {selectedMarginSupport === 'none' ? (
            <div className="bg-slate-50 border border-slate-200 text-slate-550 rounded-xl px-4 py-3 text-xs font-semibold max-w-md font-sans">
              🔒 فئة الراتب غير مطبقة لغير المدعوم ويتم تطبيق جدول عام لكافة الرواتب.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'below_25000', nameAr: '💵 أقل من 25,000' },
                { id: 'above_or_equal_25000', nameAr: '💰 25,000 فأكثر' }
              ].map((t) => {
                const isSelected = selectedMarginSalaryTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedMarginSalaryTier(t.id as any)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-xs font-extrabold'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.nameAr}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input & Calculation Controls Row */}
      <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* طريقة إدخال الهوامش */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold text-gray-700 font-sans block">طريقة إدارة السنوات المعروضة:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMarginInputMode('key_points')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                selectedMarginInputMode === 'key_points'
                  ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              نقاط رئيسية فقط (5/10/15/20/25/30)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMarginInputMode('yearly')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                selectedMarginInputMode === 'yearly'
                  ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              كل سنة مستقلة (5 إلى 30 سنة كاملة)
            </button>
          </div>
          <p className="text-[10px] text-[#6B7280] font-sans">
            * اختيار {selectedMarginInputMode === 'key_points' ? 'نقاط رئيسية' : 'كل سنة مستقلة'} يتم حفظه كطريقة إدخال لهذا الجدول بشكل مستقل.
          </p>
        </div>

        {/* طريقة الحساب السنوية */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold text-gray-700 font-sans block">طريقة الحساب (النسب البينية):</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setLocalCalcMethod('fixed')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                localCalcMethod === 'fixed'
                  ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              ثابتة Fixed (بدون تدرج)
            </button>
            <button
              type="button"
              onClick={() => setLocalCalcMethod('linear')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                localCalcMethod === 'linear'
                  ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
              }`}
            >
              تدرج خطي Linear (انسيابي)
            </button>
          </div>
          <p className="text-[10px] text-[#6B7280] font-sans">
            * {localCalcMethod === 'linear' ? 'سيقوم النظام بتركيب خط متدرج بين النقاط المدخلة لجميع الشهور البينية.' : 'سيثبت النظام النسبة المدخلة للمدة حتى النقطة التالية دون خط متدرج.'}
          </p>
        </div>
      </div>

      {/* Active Margins Configuration Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#F1F5F9] pb-4 gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-[#111827] font-sans">
              {formBanksList.find(b => b.id === selectedMarginBank)?.nameAr || selectedMarginBank} — {' '}
              {selectedMarginProduct === 'real_estate_only' ? 'عقاري فقط' : selectedMarginProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم'} — {' '}
              {selectedMarginSupport === 'none' ? 'غير مدعوم' : selectedMarginSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة'}
              {(selectedMarginSupport !== 'none') && ` (${selectedMarginSalaryTier === 'below_25000' ? 'فئة راتب أقل من 25 ألف' : 'فئة راتب 25 ألف فأكثر'})`}
            </h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">جدول هوامش الفوائد والنسب السنوية المعتمدة.</p>
          </div>
        </div>

        {localCalcMethod === 'linear' && (
          <div className="bg-[#EBF7F2] text-emerald-800 text-[11px] font-semibold font-sans border border-emerald-100/60 rounded-xl p-3 leading-relaxed">
            * يتم احتساب الهامش للشهور البينية بالتدرج الخطي Linear Interpolation بناءً على أقرب قيمتين مدخلتين.
          </div>
        )}

        {/* Input Grid Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-right">
            <thead className="bg-[#F8FAFC] text-slate-500 font-bold text-xs font-sans">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-right w-1/2">مدة التمويل بالسنوات</th>
                <th scope="col" className="px-6 py-3.5 text-right w-1/2 font-extrabold text-[#0057B8]">الهامش السنوي المدخل %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs font-semibold text-gray-700">
              {(selectedMarginInputMode === 'yearly'
                ? Array.from({ length: 26 }, (_, i) => 5 + i)
                : [5, 10, 15, 20, 25, 30]
              ).map((year) => {
                const label = year <= 10 ? `${year} سنوات` : `${year} سنة`;
                return (
                  <tr key={year} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-800 font-sans">
                      {label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative max-w-[240px] inline-block w-full">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={localMargins[year] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.,]/g, '');
                            handleMarginLocalChange(year, val);
                          }}
                          className="bg-white border border-gray-300 rounded-xl pl-8 pr-4 py-2 w-full text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-left"
                          placeholder="0.00"
                        />
                        <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold font-sans">%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaveMargins}
            className="px-8 py-3 bg-[#0057B8] hover:bg-blue-700 text-white rounded-xl font-extrabold text-[#111827] text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            💾 حفظ وتطبيق الإعدادات
          </button>
        </div>
      </div>

      {/* Advanced Clone panel */}
      <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <h4 className="font-extrabold text-[#111827] text-sm font-sans flex items-center gap-1.5">
          📋 استنساخ من جدول آخر (نسخ الإعدادات)
        </h4>
        <p className="text-[11px] text-[#6B7280] font-sans">
          يتيح لك نسخ الهوامش وطرق الحساب والمدد المعتمدة من أي جدول أو بنك آخر وتطبيقها فورياً على المسودة الحالية.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end text-xs font-bold text-gray-700 font-sans">
          {/* Bank */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-sans">البنك المصدر:</label>
            <select
              value={cloningFromBank}
              onChange={(e) => setCloningFromBank(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right outline-none"
            >
              {formBanksList.map(b => (
                <option key={b.id} value={b.id}>{b.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-sans">المنتج المصدر:</label>
            <select
              value={cloningFromProduct}
              onChange={(e) => setCloningFromProduct(e.target.value as ProductId)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right outline-none"
            >
              {[
                { id: 'real_estate_only', nameAr: 'عقاري فقط' },
                { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
                { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
              ].map(p => (
                <option key={p.id} value={p.id}>{p.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Support */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-sans">نوع الدعم المصدر:</label>
            <select
              value={cloningFromSupport}
              onChange={(e) => setCloningFromSupport(e.target.value as SupportType)}
              className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right outline-none"
            >
              {[
                { id: 'none', nameAr: 'غير مدعوم' },
                { id: 'monthly', nameAr: 'دعم شهري' },
                { id: 'downpayment', nameAr: 'دعم دفعة' }
              ].map(s => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Salary Tier */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-sans">فئة الراتب المصدر:</label>
            <select
              value={cloningFromSalaryTier}
              onChange={(e) => setCloningFromSalaryTier(e.target.value as any)}
              className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right outline-none disabled:opacity-50"
              disabled={cloningFromSupport === 'none'}
            >
              {cloningFromSupport === 'none' ? (
                <option value="not_applicable">غير مطبق</option>
              ) : (
                <>
                  <option value="below_25000">أقل من 25,000</option>
                  <option value="above_or_equal_25000">25,000 فأكثر</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleCloneLocal}
            className="px-6 py-2.5 bg-[#0057B8] hover:bg-blue-700 text-white rounded-xl font-extrabold text-[#111827] text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            📋 تنفيذ عملية الاستنساخ المصدرية
          </button>
        </div>
      </div>
    </div>
  );
}
