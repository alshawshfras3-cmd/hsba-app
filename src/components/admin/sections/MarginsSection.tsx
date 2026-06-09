import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { Bank, ProductId, SupportType, SectorId, MarginRule, Sector } from '../../../types';
import { calculateMargin } from '../../../lib/finance-engine/margin';

interface MarginsSectionProps {
  banks: Bank[];
  marginRules: MarginRule[];
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  sectors: Sector[];
}

const productTypesList = [
  { id: 'real_estate_only', nameAr: 'عقاري فقط' },
  { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
  { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
];

const yearsList = [5, 10, 15, 20, 25, 30];

export const MarginsSection: React.FC<MarginsSectionProps> = ({
  banks,
  marginRules,
  setMarginRules,
  showToast,
  sectors
}) => {
  const sectorsList = (sectors || []).map(sec => ({ id: sec.id, nameAr: sec.nameAr }));

  // 1. Selector States (Active single configuration)
  const [selectedBank, setSelectedBank] = useState<string>(banks[0]?.id || 'alahli');
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('real_estate_only');
  const [selectedSupport, setSelectedSupport] = useState<SupportType>('none');
  const [selectedSalaryTier, setSelectedSalaryTier] = useState<'below_25000' | 'above_or_equal_25000' | 'not_applicable'>('not_applicable');
  const [selectedYearsMode, setSelectedYearsMode] = useState<'yearly' | 'key_points'>('key_points');
  const [selectedCalcMethod, setSelectedCalcMethod] = useState<'linear' | 'fixed'>('fixed');

  // 2. Local inputs for Edit Grid
  const [localMargins, setLocalMargins] = useState<Record<number, string>>({});
  const [localSectorExceptions, setLocalSectorExceptions] = useState<Record<string, string>>({});

  const [isLoaded, setIsLoaded] = useState(false);

  // Auxiliary UI States
  const [showCloneCard, setShowCloneCard] = useState(false);
  const [cloneFromBank, setCloneFromBank] = useState('alahli');
  const [cloneToBank, setCloneToBank] = useState('rajhi');
  const [showGeneralLogs, setShowGeneralLogs] = useState(false);

  // Copy Margins Modal States
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySrcBank, setCopySrcBank] = useState<string>(banks[0]?.id || 'alahli');
  const [copySrcProduct, setCopySrcProduct] = useState<ProductId>('real_estate_only');
  const [copySrcSupport, setCopySrcSupport] = useState<SupportType>('none');
  const [copyDstBank, setCopyDstBank] = useState<string>(banks[1]?.id || 'rajhi');
  const [copyDstProduct, setCopyDstProduct] = useState<ProductId>('real_estate_only');
  const [copyDstSupport, setCopyDstSupport] = useState<SupportType>('none');

  // Auto handle support and salary tier dependencies
  useEffect(() => {
    if (selectedSupport === 'none') {
      setSelectedSalaryTier('not_applicable');
    } else if (selectedSalaryTier === 'not_applicable') {
      setSelectedSalaryTier('below_25000');
    }
  }, [selectedSupport]);

  // Synchronize local states when selection changes or marginRules are updated
  useEffect(() => {
    if (!selectedBank) return;

    const normSupport = (selectedSupport as string) === 'down_payment' || selectedSupport === 'downpayment' ? 'downpayment' : selectedSupport;

    // Normalize all rules to clean official product IDs and support types upon reading
    const relevantRules = marginRules.map(r => {
      let pId = r.productId as string;
      if (pId === 'real_estate') pId = 'real_estate_only';
      else if (pId === 'both') pId = 'real_estate_with_new_personal';
      else if (pId === 'real_estate_with_personal_existing') pId = 'real_estate_with_existing_personal';

      let sType = r.supportType as string;
      if (sType === 'down_payment') sType = 'downpayment';

      return {
        ...r,
        productId: pId as ProductId,
        supportType: sType as SupportType
      };
    }).filter(r => 
      r.bankId === selectedBank && 
      r.productId === selectedProduct && 
      (r.supportType === normSupport || r.supportType === 'all') &&
      (!r.isExceptionOnly) &&
      (r.salaryTier === selectedSalaryTier || (!r.salaryTier && selectedSalaryTier === 'not_applicable'))
    );

    const yearsListFull = Array.from({ length: 26 }, (_, i) => 5 + i);
    const initialMargins: Record<number, string> = {};

    yearsListFull.forEach(year => {
      const rY = relevantRules.find(r => r.year === year || r.toTermMonths === year * 12);
      if (rY) {
        initialMargins[year] = (rY.annualMargin !== undefined ? rY.annualMargin : (rY.baseMargin !== undefined ? Number((rY.baseMargin * 100).toFixed(3)) : rY.endMargin)).toString();
      } else {
        initialMargins[year] = '';
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
    setSelectedCalcMethod(method);
    setSelectedYearsMode(inputMode);

    // Synchronize sector exceptions (bank level only)
    const initialExceptions: Record<string, string> = {};
    sectorsList.forEach(sec => {
      const exRule = marginRules.find(r =>
        r.bankId === selectedBank &&
        r.sectorId === sec.id &&
        r.isExceptionOnly === true
      );
      initialExceptions[sec.id] = exRule && exRule.exceptionBps !== undefined ? exRule.exceptionBps.toString() : '0';
    });
    setLocalSectorExceptions(initialExceptions);
    setIsLoaded(true);

  }, [selectedBank, selectedProduct, selectedSupport, selectedSalaryTier, marginRules]);

  // Database updater to match exact core rules compatibility
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
    const normSupport = (targetSupport as string) === 'down_payment' || targetSupport === 'downpayment' ? 'downpayment' : targetSupport;

    const remainingRules = marginRules.filter(r => {
      const normalizedSupportType = (r.supportType === 'down_payment' || r.supportType === 'downpayment') ? 'downpayment' : r.supportType;
      
      const isBaseForCombo = r.bankId === targetBank &&
                             r.productId === targetProduct &&
                             normalizedSupportType === normSupport &&
                             (r.sectorId || 'all') === 'all' &&
                             (r.salaryTier === targetSalaryTier || (!r.salaryTier && targetSalaryTier === 'not_applicable')) &&
                             !r.isExceptionOnly;

      const isExceptionForCombo = r.bankId === targetBank &&
                                  r.isExceptionOnly === true;

      return !isBaseForCombo && !isExceptionForCombo;
    });

    const newRulesForThisCombo: MarginRule[] = [];
    const yearsToExtract = inputMode === 'yearly'
      ? Array.from({ length: 26 }, (_, i) => 5 + i)
      : [5, 10, 15, 20, 25, 30];

    const filledYears = yearsToExtract.filter(year => {
      const val = marginsRecord[year];
      return val !== undefined && val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0;
    });

    filledYears.sort((a, b) => a - b);

    if (filledYears.length > 0) {
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
          id: `gen_margin_${targetBank}_${targetProduct}_${normSupport}_${targetSalaryTier}_t${def.from}_${def.to}_${index}`,
          bankId: targetBank,
          productId: targetProduct,
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
    }

    const newExceptionRules: MarginRule[] = [];
    sectorsList.forEach(secObj => {
      const secId = secObj.id;
      const parsedBps = parseInt(sectorExceptionsRecord[secId] || '0', 10);
      newExceptionRules.push({
        id: `exception_${targetBank}_${secId}`,
        bankId: targetBank,
        sectorId: secId as SectorId,
        isActive: true,
        isExceptionOnly: true,
        exceptionBps: parsedBps
      } as any);
    });

    setMarginRules([...remainingRules, ...newRulesForThisCombo, ...newExceptionRules]);
  };

  // Main save action for basic margins + exceptions
  const handleSaveConfig = () => {
    try {
      updateGlobalRulesForCombo(
        selectedBank,
        selectedProduct,
        selectedSupport,
        selectedSalaryTier,
        localMargins,
        localSectorExceptions,
        selectedCalcMethod,
        selectedYearsMode
      );
      showToast('تم حفظ وتطبيق الإعدادات للمنتج واستثناءات القطاعات بنجاح!', 'success');
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء حفظ أو تطبيق البيانات.', 'refuse');
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

  const handleCopyMargins = (
    srcBank: string,
    srcProduct: ProductId,
    srcSupport: SupportType,
    dstBank: string,
    dstProduct: ProductId,
    dstSupport: SupportType
  ) => {
    if (srcBank === dstBank && srcProduct === dstProduct && srcSupport === dstSupport) {
      showToast('لا يمكن النسخ لقرينة مطابِقة تماماً للمصدر.', 'refuse');
      return;
    }

    const normSrcSupport = (srcSupport as string) === 'down_payment' || srcSupport === 'downpayment' ? 'downpayment' : srcSupport;
    const normDstSupport = (dstSupport as string) === 'down_payment' || dstSupport === 'downpayment' ? 'downpayment' : dstSupport;

    // Build the mapped product IDs for raw DB matches from source
    const srcProductIds = [srcProduct];

    // Try both with/without salary tier to get the rules of the source
    const srcSalaryTier = normSrcSupport === 'none' ? 'not_applicable' : 'below_25000';

    const relevantSrcRules = marginRules.map(r => {
      let pId = r.productId as string;
      if (pId === 'real_estate') pId = 'real_estate_only';
      else if (pId === 'both') pId = 'real_estate_with_new_personal';
      else if (pId === 'real_estate_with_personal_existing') pId = 'real_estate_with_existing_personal';

      let sType = r.supportType as string;
      if (sType === 'down_payment') sType = 'downpayment';

      return {
        ...r,
        productId: pId as ProductId,
        supportType: sType as SupportType
      };
    }).filter(r => 
      r.bankId === srcBank && 
      r.productId === srcProduct && 
      (r.supportType === normSrcSupport || r.supportType === 'all') &&
      (!r.isExceptionOnly) &&
      (r.salaryTier === srcSalaryTier || (!r.salaryTier && srcSalaryTier === 'not_applicable') || r.salaryTier === 'not_applicable' || !r.salaryTier)
    );

    const yearsListFull = Array.from({ length: 26 }, (_, i) => 5 + i);
    const srcMargins: Record<number, string> = {};

    yearsListFull.forEach(year => {
      const rY = relevantSrcRules.find(r => r.year === year || r.toTermMonths === year * 12);
      if (rY) {
        srcMargins[year] = (rY.annualMargin !== undefined ? rY.annualMargin : (rY.baseMargin !== undefined ? Number((rY.baseMargin * 100).toFixed(3)) : rY.endMargin)).toLocaleString('en-US', {useGrouping: false});
      } else {
        srcMargins[year] = '';
      }
    });

    let method: 'linear' | 'fixed' = 'fixed';
    const foundMethodRule = relevantSrcRules.find(r => r.calculationMethod || r.calcType);
    if (foundMethodRule) {
      method = (foundMethodRule.calculationMethod || foundMethodRule.calcType) as any;
    }

    let inputMode: 'yearly' | 'key_points' = 'key_points';
    const foundInputModeRule = relevantSrcRules.find(r => r.marginInputMode);
    if (foundInputModeRule) {
      inputMode = foundInputModeRule.marginInputMode;
    } else {
      const hasIntermediate = relevantSrcRules.some(r => {
        const y = r.year || (r.toTermMonths / 12);
        return y !== undefined && ![5, 10, 15, 20, 25, 30].includes(y);
      });
      if (hasIntermediate) {
        inputMode = 'yearly';
      }
    }

    // 2. Resolve target parameters
    const targetSalaryTiers: Array<'below_25000' | 'above_or_equal_25000' | 'not_applicable'> = 
      normDstSupport === 'none' ? ['not_applicable'] : ['below_25000', 'above_or_equal_25000'];

    // Filter out any existing base rules on the target combination
    const remainingRules = marginRules.filter(r => {
      const normalizedSupportType = (r.supportType === 'down_payment' || r.supportType === 'downpayment') ? 'downpayment' : r.supportType;
      const isTargetBaseRule = 
        r.bankId === dstBank &&
        r.productId === dstProduct &&
        normalizedSupportType === normDstSupport &&
        targetSalaryTiers.includes(r.salaryTier || 'not_applicable' as any) &&
        !r.isExceptionOnly;
      return !isTargetBaseRule;
    });

    // Generate new rules for the target combo
    const newRulesForDst: MarginRule[] = [];
    const yearsToExtract = inputMode === 'yearly'
      ? Array.from({ length: 26 }, (_, i) => 5 + i)
      : [5, 10, 15, 20, 25, 30];

    const filledYears = yearsToExtract.filter(year => {
      const val = srcMargins[year];
      return val !== undefined && val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0;
    });

    filledYears.sort((a, b) => a - b);

    if (filledYears.length > 0) {
      targetSalaryTiers.forEach(targetSalaryTier => {
        const definitions: Array<{ from: number, to: number, start: number, end: number, calcType: 'fixed' | 'linear', yearPoint: number }> = [];

        for (let i = 0; i < filledYears.length; i++) {
          const currentYear = filledYears[i];
          const currentMarginStr = srcMargins[currentYear];
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
            const prevMarginStr = srcMargins[prevYear];
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
        const lastMarginStr = srcMargins[lastYear];
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
          newRulesForDst.push({
            id: `copied_margin_${dstBank}_${dstProduct}_${normDstSupport}_${targetSalaryTier}_t${def.from}_${def.to}_${index}_${Date.now()}`,
            bankId: dstBank,
            productId: dstProduct,
            supportType: normDstSupport as any,
            sectorId: 'all',
            fromTermMonths: def.from,
            toTermMonths: def.to,
            startMargin: def.start,
            endMargin: def.end,
            calcType: def.calcType,
            isActive: true,
            salaryTier: targetSalaryTier,
            productType: dstProduct as any,
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

    setMarginRules([...remainingRules, ...newRulesForDst]);

    // Force context selections to change to the target combo automatically
    // so the state-update event is triggered, and the user directly sees the copied values in the grid!
    setSelectedBank(dstBank);
    setSelectedProduct(dstProduct);
    setSelectedSupport(dstSupport);
    if (normDstSupport === 'none') {
      setSelectedSalaryTier('not_applicable');
    } else {
      setSelectedSalaryTier('below_25000');
    }

    showToast('تم نسخ هوامش التمويل الأساسية وتطبيقها بنجاح! تم تحويل شاشة العرض تلقائياً للبنك الهدف لمراجعة وتثبيت التعديلات.', 'success');
  };

  // Compile combined flat row configs for general log reviewing
  const getFilteredMarginRows = () => {
    const list: any[] = [];
    const targetBanks = banks.map(b => b.id);

    targetBanks.forEach(bId => {
      if (selectedBank && bId !== selectedBank) return;

      productTypesList.forEach(pObj => {
        const pId = pObj.id as ProductId;
        if (selectedProduct && pId !== selectedProduct) return;

        const supports: SupportType[] = ['none', 'monthly', 'downpayment'];
        supports.forEach(sId => {
          if (selectedSupport && sId !== selectedSupport) return;

          const tiers: Array<'not_applicable' | 'below_25000' | 'above_or_equal_25000'> = sId === 'none'
            ? ['not_applicable']
            : ['below_25000', 'above_or_equal_25000'];

          tiers.forEach(tier => {
            if (sId !== 'none' && selectedSalaryTier !== tier) return;

            const relevantRules = marginRules.map(r => {
              let prodInput = r.productId as string;
              if (prodInput === 'real_estate') prodInput = 'real_estate_only';
              else if (prodInput === 'both') prodInput = 'real_estate_with_new_personal';
              else if (prodInput === 'real_estate_with_personal_existing') prodInput = 'real_estate_with_existing_personal';

              let sType = r.supportType as string;
              if (sType === 'down_payment') sType = 'downpayment';

              return {
                ...r,
                productId: prodInput as ProductId,
                supportType: sType as SupportType
              };
            }).filter(r => 
              r.bankId === bId &&
              r.productId === pId &&
              (r.supportType === sId || r.supportType === 'all') &&
              (r.salaryTier === tier || (!r.salaryTier && tier === 'not_applicable'))
            );

            if (relevantRules.length === 0) return;

            sectorsList.forEach(sec => {
              const yearsToIterate = selectedYearsMode === 'key_points' ? [5, 10, 15, 20, 25, 30] : Array.from({ length: 26 }, (_, i) => 5 + i);
              yearsToIterate.forEach(year => {
                const result = calculateMargin({
                  bankId: bId,
                  productId: pId,
                  supportType: sId,
                  sectorId: sec.id as SectorId,
                  termMonths: year * 12,
                  marginRules,
                  netSalary: tier === 'below_25000' ? 20000 : tier === 'above_or_equal_25000' ? 30000 : undefined
                });

                const matchedBaseRule = relevantRules.find(r => 
                  (r.sectorId === 'all' || !r.sectorId) &&
                  !r.isExceptionOnly &&
                  (r.year === year || r.toTermMonths === year * 12)
                );
                const isActive = matchedBaseRule ? matchedBaseRule.isActive !== false : true;

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

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-right">
        <div className="space-y-1 text-right">
          <h2 className="text-xl font-bold text-gray-900 font-sans">هوامش الأرباح البنكية</h2>
          <p className="text-xs text-gray-500 font-sans">
            جهة سهلة ومباشرة لإعداد هوامش التمويل الأساسية ومزامنة كافة استثناءات القطاعات.
          </p>
        </div>
        <div className="flex gap-2 font-sans">
          <button
            type="button"
            onClick={() => setShowCloneCard(!showCloneCard)}
            className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ إعدادات بنك</span>
          </button>
        </div>
      </div>

      {/* Clone Quick Actions Block */}
      {showCloneCard && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200 text-right font-sans">
          <h4 className="font-bold text-slate-800 text-xs">📋 استنساخ ومزامنة هوامش جهة تمويلية كاملة</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">البنك المصدر (الذي ستنسخ منه):</label>
              <select
                value={cloneFromBank}
                onChange={(e) => setCloneFromBank(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-705 outline-none focus:ring-1 focus:ring-[#0057B8]"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-705 outline-none focus:ring-1 focus:ring-[#0057B8]"
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
              className="px-5 py-2 bg-[#0057B8] text-white rounded-xl text-xs font-bold hover:bg-[#004bb0] cursor-pointer"
            >
              تأكيد الاستنساخ والمزامنة
            </button>
          </div>
        </div>
      )}

      {/* 2. Banks Horizontal Selection Row */}
      <div className="space-y-2 text-right">
        <span className="text-xs font-extrabold text-gray-500 block mb-1 font-sans">اختر البنك التمويلي:</span>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2.5 font-sans">
          {banks.map((b) => {
            const isSelected = selectedBank === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBank(b.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-sm shadow-[#0057B8]/20 scale-[1.01]'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <span>{b.nameAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selections and Controls Block */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6 text-right">
        
        {/* أولاً: نوع المنتج */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">أولاً: المنتج</span>
          <div className="flex flex-wrap gap-2.5">
            {productTypesList.map((p) => {
              const isSelected = selectedProduct === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p.id as ProductId)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-sm font-extrabold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {p.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* ثانياً: نوع الدعم */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">ثانياً: نوع الدعم</span>
          <div className="flex flex-wrap gap-2.5">
            {[
              { id: 'none', nameAr: 'غير مدعوم' },
              { id: 'monthly', nameAr: 'دعم شهري' },
              { id: 'downpayment', nameAr: 'دعم دفعة' }
            ].map((s) => {
              const isSelected = selectedSupport === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSupport(s.id as SupportType)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-sm font-extrabold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {s.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* ثالثاً: فئة الراتب */}
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0057B8] font-sans">ثالثاً: فئة الراتب</span>
          {selectedSupport === 'none' ? (
            <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-3.5 text-xs font-semibold max-w-md font-sans">
              🔒 فئة الراتب غير مطبقة لغير المدعوم ويتم تطبيق جدول عام لكافة الرواتب.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'below_25000', nameAr: '💵 أقل من 25,000' },
                { id: 'above_or_equal_25000', nameAr: '💰 25,000 فأكثر' }
              ].map((t) => {
                const isSelected = selectedSalaryTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedSalaryTier(t.id as any)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0057B8] border-[#0057B8] text-white shadow-sm font-extrabold'
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

        {/* طريقة إدارة السنوات وطريقة الحساب */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-gray-700 font-sans block">طريقة إدارة السنوات المعروضة:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedYearsMode('key_points')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                  selectedYearsMode === 'key_points'
                    ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-xs'
                    : 'bg-white text-gray-650 border-gray-250 hover:bg-slate-50'
                }`}
              >
                نقاط رئيسية فقط (5/10/15/20/25/30)
              </button>
              <button
                type="button"
                onClick={() => setSelectedYearsMode('yearly')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                  selectedYearsMode === 'yearly'
                    ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-xs'
                    : 'bg-white text-gray-650 border-gray-250 hover:bg-slate-50'
                }`}
              >
                كل سنة مستقلة (5 إلى 30 سنة كاملة)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-extrabold text-gray-700 font-sans block">طريقة الحساب (النسب البينية):</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCalcMethod('fixed')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                  selectedCalcMethod === 'fixed'
                    ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-xs'
                    : 'bg-white text-gray-655 border-gray-250 hover:bg-slate-50'
                }`}
              >
                ثابتة Fixed (بدون تدرج)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCalcMethod('linear')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border text-center ${
                  selectedCalcMethod === 'linear'
                    ? 'bg-[#0057B8] text-white border-[#0057B8] font-extrabold shadow-xs'
                    : 'bg-white text-gray-655 border-gray-250 hover:bg-slate-50'
                }`}
              >
                تدرج خطي Linear (انسيابي)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Standalone Bank Sector Exceptions Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4 text-right font-sans">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-2">
          <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
            🛡️ استثناءات القطاعات للبنك الحالي: <span className="text-[#0057B8]">{(banks.find(b => b.id === selectedBank)?.nameAr) || selectedBank}</span>
          </h3>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
            * دخل قيم نقاط الأساس Bps (مثال: -192 لرفع الهامش بنسبة 1.92٪، أو 100 لتخفيض الهامش بنسبة 1.00٪)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sectorsList.map((sec) => {
            return (
              <div key={sec.id} className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                <label className="block text-xs font-bold text-slate-705 text-center">{sec.nameAr}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={localSectorExceptions[sec.id] ?? '0'}
                    onChange={(e) => {
                      let valStr = e.target.value;
                      valStr = valStr.replace(/[^0-9-]/g, '');
                      setLocalSectorExceptions(prev => ({ ...prev, [sec.id]: valStr }));
                    }}
                    className="bg-white border border-gray-350 rounded-xl px-2 py-2 w-full text-center text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Base Margins Table Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4 text-right font-sans">
        <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2 border-b border-gray-100 pb-3">
          📊 هوامش التمويل الأساسية
        </h3>
        
        {isLoaded && Object.values(localMargins).every(v => !v || v === '') && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold font-sans text-center my-2 leading-6 flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>لا توجد هوامش محفوظة لهذه التركيبة، أدخل القيم ثم اضغط حفظ.</span>
          </div>
        )}
        
        <div className="overflow-x-auto border border-gray-200 rounded-2xl max-h-[450px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-250 text-right text-xs">
            <thead className="bg-slate-50 text-slate-650 font-bold sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-4 text-right font-bold">مدة التمويل بالسنوات</th>
                <th scope="col" className="px-6 py-4 text-right font-bold text-[#0057B8]">هامش الجدول %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-slate-700 font-semibold">
              {(selectedYearsMode === 'yearly'
                ? Array.from({ length: 26 }, (_, i) => 5 + i)
                : [5, 10, 15, 20, 25, 30]
              ).map((year) => {
                const label = year === 5 || year === 10 ? `${year} سنوات` : `${year} سنة`;
                return (
                  <tr key={year} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800">
                      {label}
                    </td>
                    <td className="px-6 py-2">
                      <div className="relative max-w-[180px] inline-block w-full">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={localMargins[year] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                              setLocalMargins(prev => ({ ...prev, [year]: val }));
                            }
                          }}
                          className="bg-white border border-gray-300 rounded-xl pl-8 pr-4 py-2 w-full text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-left"
                          placeholder="0.00"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Inline Copy Margins Section */}
      {showCopyModal && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-right space-y-5 my-5 font-sans animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-150 pb-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
              📋 نسخ هوامش الأرباح الأساسية
            </h3>
            <button
              type="button"
              onClick={() => setShowCopyModal(false)}
              className="text-[10px] sm:text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إخفاء
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* المصدر */}
            <div className="bg-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100 space-y-3">
              <span className="block text-xs font-extrabold text-[#0057B8]">👈 المصدر (الذي يُنسخ منه):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">البنك:</label>
                  <select
                    value={copySrcBank}
                    onChange={(e) => setCopySrcBank(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">المنتج:</label>
                  <select
                    value={copySrcProduct}
                    onChange={(e) => setCopySrcProduct(e.target.value as ProductId)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                  >
                    {productTypesList.map(p => (
                      <option key={p.id} value={p.id}>{p.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">نوع الدعم:</label>
                  <select
                    value={copySrcSupport}
                    onChange={(e) => setCopySrcSupport(e.target.value as SupportType)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                  >
                    <option value="none">غير مدعوم</option>
                    <option value="monthly">دعم شهري</option>
                    <option value="downpayment">دعم دفعة</option>
                  </select>
                </div>
              </div>
            </div>

            {/* الهدف */}
            <div className="bg-emerald-50/20 p-4 sm:p-5 rounded-2xl border border-emerald-100 space-y-3">
              <span className="block text-xs font-extrabold text-emerald-700">👉 الهدف (الذي يتم النسخ والتبديل فيه):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">البنك:</label>
                  <select
                    value={copyDstBank}
                    onChange={(e) => setCopyDstBank(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">المنتج:</label>
                  <select
                    value={copyDstProduct}
                    onChange={(e) => setCopyDstProduct(e.target.value as ProductId)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {productTypesList.map(p => (
                      <option key={p.id} value={p.id}>{p.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500">نوع الدعم:</label>
                  <select
                    value={copyDstSupport}
                    onChange={(e) => setCopyDstSupport(e.target.value as SupportType)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="none">غير مدعوم</option>
                    <option value="monthly">دعم شهري</option>
                    <option value="downpayment">دعم دفعة</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-[10px] text-gray-500 leading-relaxed font-bold text-right">
              * تنبيه: عملية النسخ تطبق فقط على جدول هوامش التمويل الأساسية (سنوات التمويل والنسب %)، ولن تؤثر على استثناءات القطاعات، DSR، أو أي إعدادات أخرى. التعديلات تكون محلية مؤقتة ويتم تثبيتها فقط عند نقر "حفظ وتطبيق الإعدادات".
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyMargins(
                    copySrcBank,
                    copySrcProduct,
                    copySrcSupport,
                    copyDstBank,
                    copyDstProduct,
                    copyDstSupport
                  );
                }}
                className="px-5 py-2 bg-[#0057B8] hover:bg-[#004bb0] text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors shadow-xs"
              >
                نسخ وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Unified Save Button */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2 font-sans">
        <button
          type="button"
          onClick={() => setShowCopyModal(!showCopyModal)}
          className="w-full sm:w-auto px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] border border-slate-200"
        >
          <span>📋 نسخ الهوامش من بنك آخر</span>
        </button>
        <button
          type="button"
          onClick={handleSaveConfig}
          className="w-full sm:w-auto px-8 py-4 bg-[#0057B8] hover:bg-[#004bb0] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#0057B8]/20 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
        >
          <span>💾 حفظ وتطبيق الإعدادات</span>
        </button>
      </div>

      {/* 7. Collapsible General Review Log List */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden text-right font-sans">
        <button
          type="button"
          onClick={() => setShowGeneralLogs(!showGeneralLogs)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer text-right border-none outline-none leading-none"
        >
          <div className="flex items-center gap-2">
            <span>📋</span>
            <span className="text-sm font-bold text-slate-800 leading-none">سجل الهوامش</span>
          </div>
          <span className="text-xs font-bold text-[#0057B8] bg-blue-50 px-3 py-1.5 rounded-lg leading-none">
            {showGeneralLogs ? 'إخفاء السجل 🔼' : 'عرض السجل الشامل 🔽'}
          </span>
        </button>

        {showGeneralLogs && (
          <div className="p-6 border-t border-gray-100 space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-gray-500">
              قائمة تفصيلية بكافة القواعد الفعالة في النظام حالياً لمراجعتها بشكل مجمع.
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-right text-xs text-[#111827] min-w-[900px]">
                <thead className="bg-slate-50 text-gray-500 border-b border-gray-100 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-4 font-bold text-right col-span-1">البنك</th>
                    <th className="p-4 font-bold text-right col-span-1">نوع المنتج</th>
                    <th className="p-4 font-bold text-right col-span-1">نوع الدعم</th>
                    <th className="p-4 font-bold text-right col-span-1">القطاع</th>
                    <th className="p-4 font-bold text-right col-span-1">مدة التمويل</th>
                    <th className="p-4 font-bold text-center col-span-1">هامش الجدول %</th>
                    <th className="p-4 font-bold text-center col-span-1">نسبة الاستثناء Bps</th>
                    <th className="p-4 font-bold text-center col-span-1">الهامش النهائي %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-slate-705 font-semibold">
                  {(() => {
                    const list = getFilteredMarginRows();
                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                            لا توجد سجلات مطابقة للتصفية الحالية.
                          </td>
                        </tr>
                      );
                    }
                    return list.map((row) => {
                      const bObj = banks.find(b => b.id === row.bankId);
                      const bankName = bObj ? bObj.nameAr : row.bankId;
                      const productName = productTypesList.find(p => p.id === row.productId)?.nameAr || row.productId;
                      const supportName = row.supportType === 'none' ? 'غير مدعوم' : row.supportType === 'monthly' ? 'دعم شهري' : 'دعم دفعة';
                      const durationLabel = row.year === 5 || row.year === 10 ? `${row.year} سنوات` : `${row.year} سنة`;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/40">
                          <td className="p-4 font-bold text-slate-800">{bankName}</td>
                          <td className="p-4 text-slate-600">{productName}</td>
                          <td className="p-4 text-slate-500">{supportName}</td>
                          <td className="p-4 text-slate-900 font-bold">{row.sectorNameAr}</td>
                          <td className="p-4 text-slate-700 font-mono">{durationLabel}</td>
                          <td className="p-4 text-center text-slate-800 font-mono">{(row.baseMargin || 0).toFixed(2)}%</td>
                          <td className={`p-4 text-center font-mono ${
                            row.exceptionBps > 0 
                              ? 'text-rose-500' 
                              : row.exceptionBps < 0 
                                ? 'text-emerald-500' 
                                : 'text-slate-400'
                          }`}>
                            {row.exceptionBps > 0 ? `+${row.exceptionBps}` : row.exceptionBps} Bps
                          </td>
                          <td className="p-4 text-center text-[#0057B8] font-mono font-extrabold text-sm">{(row.finalMarginSec || 0).toFixed(3)}%</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
