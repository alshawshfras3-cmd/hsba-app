import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Bank, ProductId, SupportType, SectorId, MarginRule, Sector } from '../../../types';
import { calculateMargin } from '../../../lib/finance-engine/margin';

function toEnglishDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

export const getRuleInputMode = (r: MarginRule): 'yearly' | 'key_points' | 'duration_tiers' => {
  if (r.marginInputMode) return r.marginInputMode;
  if (r.fromMonth !== undefined || r.toMonth !== undefined) return 'duration_tiers';
  const y = r.year || (r.toTermMonths ? r.toTermMonths / 12 : undefined);
  if (y !== undefined) {
    if ([5, 10, 15, 20, 25, 30].includes(y)) {
      return 'key_points';
    } else if (y >= 5 && y <= 30) {
      return 'yearly';
    }
  }
  return 'key_points';
};

interface MarginsSectionProps {
  banks: Bank[];
  marginRules: MarginRule[];
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  sectors: Sector[];
  saveChanges?: (overrideMarginRules?: MarginRule[]) => Promise<void>;
  supabaseLoadStatus?: 'loading' | 'success' | 'failed' | 'empty_db';
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
  sectors,
  saveChanges,
  supabaseLoadStatus
}) => {
  const activeSectors = (sectors || []).filter(sec => sec.isActive !== false);
  const sectorsList = [
    { id: 'all', nameAr: 'كل القطاعات' },
    ...activeSectors.map(sec => ({ id: sec.id, nameAr: sec.nameAr }))
  ];

  // 1. Selector States (Active single configuration)
  const [selectedBank, setSelectedBank] = useState<string>(banks[0]?.id || 'alahli');
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('real_estate_only');
  const [selectedSupport, setSelectedSupport] = useState<SupportType>('none');
  const [selectedSalaryTier, setSelectedSalaryTier] = useState<'below_25000' | 'above_or_equal_25000' | 'not_applicable'>('not_applicable');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedYearsMode, setSelectedYearsMode] = useState<'yearly' | 'key_points' | 'duration_tiers' | ''>('');
  const [selectedCalcMethod, setSelectedCalcMethod] = useState<'linear' | 'fixed'>('fixed');

  // 2. Local inputs for Edit Grid
  const [localTiers, setLocalTiers] = useState<Array<{
    id: string;
    fromMonth: number | string;
    toMonth: number | string;
    marginRate: number | string;
    notes?: string;
    active: boolean;
  }>>([]);
  const [localMargins, setLocalMargins] = useState<Record<number, string>>({});
  const [localSectorExceptions, setLocalSectorExceptions] = useState<Record<string, string>>({});

  const [isLoaded, setIsLoaded] = useState(false);
  const lastUpdatedRulesRef = useRef<MarginRule[] | null>(null);
  const lastLoadedKeyRef = useRef<string>('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  // Hydration ref to block auto synchronization during table initialization or selection changes
  const isHydratingRef = useRef(false);

  // 1. Isolated states to track edited margins and check dirty status independently of settings
  const [marginData, setMarginData] = useState<any[]>([]);
  const [initialMarginData, setInitialMarginData] = useState<string>('[]');
  const marginDataRef = useRef<any[]>([]);

  useEffect(() => {
    marginDataRef.current = marginData;
  }, [marginData]);

  const isDirty = useMemo(() => {
    return JSON.stringify(marginData) !== initialMarginData;
  }, [marginData, initialMarginData]);

  // Auxiliary UI States
  const [showCloneCard, setShowCloneCard] = useState(false);
  const [cloneFromBank, setCloneFromBank] = useState('alahli');
  const [cloneToBank, setCloneToBank] = useState('rajhi');
  const [showGeneralLogs, setShowGeneralLogs] = useState(false);

  // Copy Margins Modal States
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTableType, setCopyTableType] = useState<'key_points' | 'yearly' | 'duration_tiers' | 'all'>('all');
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

  // Handle default selected sector initialization
  useEffect(() => {
    if (sectorsList.length > 0 && !selectedSector) {
      setSelectedSector('all');
    }
  }, [sectorsList, selectedSector]);

  // Normalization helper definitions
  const normSector = (s?: string) => (!s || s === 'all') ? 'all' : s;
  const normSupport = (s?: string) => {
    if (!s || s === 'none') return 'none';
    if (s === 'down_payment' || s === 'downpayment') return 'downpayment';
    return s;
  };
  const normSalaryTier = (t?: string) => (!t || t === 'not_applicable') ? 'not_applicable' : t;

  const isTiersRule = (r: MarginRule) => {
    const mode = getRuleInputMode(r);
    return mode === 'duration_tiers';
  };

  // Synchronize local states when selection changes or marginRules are updated
  useEffect(() => {
    if (!selectedBank) return;

    const currentKey = `${selectedBank}_${selectedProduct}_${selectedSupport}_${selectedSalaryTier}_${selectedSector}`;

    // Bypass loader if we are just reflecting our own user edits within the same active combo
    if (currentKey === lastLoadedKeyRef.current && lastUpdatedRulesRef.current === marginRules) {
      return;
    }

    // Mark as hydrating to avoid auto-synchronization and false un-saved prompts
    isHydratingRef.current = true;

    lastLoadedKeyRef.current = currentKey;

    let initialMargins: Record<number, string> = {};
    let initialTiers: any[] = [];
    let initialExceptions: Record<string, string> = {};
    let method: 'linear' | 'fixed' = 'fixed';
    let determinedMode: 'yearly' | 'key_points' | 'duration_tiers' | '' = '';

    const existingCombo = marginDataRef.current.find(item => item.key === currentKey);

    if (existingCombo) {
      initialMargins = { ...existingCombo.localMargins };
      initialTiers = [...existingCombo.localTiers];
      initialExceptions = { ...existingCombo.localSectorExceptions };
      method = existingCombo.selectedCalcMethod;
      determinedMode = existingCombo.selectedYearsMode;
    } else {
      const normSupportVal = normSupport(selectedSupport);

      // Normalize all rules to clean official product IDs and support types upon reading
      const allNormalized = marginRules.map(r => {
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
      });

      const targetBank = selectedBank;
      const targetProduct = selectedProduct;
      const targetSupport = normSupportVal;
      const targetSalaryTier = selectedSalaryTier;
      const targetSector = selectedSector;

      // Filter rules matching core values: bank, product, support, and salary tier with clean normalization
      const matchingRules = allNormalized.filter(r => {
        if (r.isExceptionOnly) return false;
        if (r.bankId !== targetBank) return false;
        if (r.productId !== targetProduct) return false;
        if (normSupport(r.supportType) !== normSupport(targetSupport)) return false;
        if (normSalaryTier(r.salaryTier) !== normSalaryTier(targetSalaryTier)) return false;
        return true;
      });

      // أولاً: فلترة القطاع
      let sectorRules = matchingRules.filter(
        r => normSector(r.sectorId) === normSector(targetSector)
      );

      // fallback فقط إذا ما فيه قطاع
      if (sectorRules.length === 0 && normSector(targetSector) !== 'all') {
        sectorRules = matchingRules.filter(
          r => normSector(r.sectorId) === 'all'
        );
      }

      // الآن فقط نحدد mode
      if (sectorRules.length > 0) {
        const withInputMode = sectorRules.find(r => r.marginInputMode);

        if (withInputMode && withInputMode.marginInputMode) {
          determinedMode = withInputMode.marginInputMode as any;
        } else {
          determinedMode = getRuleInputMode(sectorRules[0]);
        }
      }

      if (determinedMode !== '') {
        // 1. Load years margins (for yearly / key_points) independently of selected mode to avoid wiping
        const yearsRules = sectorRules.filter(r => !isTiersRule(r));
        const yearsListFull = Array.from({ length: 26 }, (_, i) => 5 + i);

        yearsListFull.forEach(year => {
          const rY = yearsRules.find(r => r.year === year || r.toTermMonths === year * 12);
          if (rY) {
            initialMargins[year] = (rY.annualMargin !== undefined ? rY.annualMargin : (rY.baseMargin !== undefined ? Number((rY.baseMargin * 100).toFixed(3)) : rY.endMargin)).toString();
          } else {
            initialMargins[year] = '';
          }
        });

        // 2. Load duration tiers independently of selected mode to avoid wiping
        const tierRules = sectorRules.filter(r => isTiersRule(r));
        initialTiers = tierRules.map((r, idx) => ({
          id: r.id || `tier_${idx}_${Date.now()}`,
          fromMonth: r.fromMonth ?? r.fromTermMonths ?? 0,
          toMonth: r.toMonth ?? r.toTermMonths ?? 0,
          marginRate: r.marginRate ?? r.endMargin ?? 3.50,
          notes: r.notes || '',
          active: r.active !== false && r.isActive !== false
        }));
        initialTiers.sort((a, b) => a.fromMonth - b.fromMonth);

        // 3. Load calculation method
        const foundMethodRule = yearsRules.find(r => r.calculationMethod || r.calcType);
        if (foundMethodRule) {
          method = (foundMethodRule.calculationMethod || foundMethodRule.calcType) as any;
        }
      }

      // 5. Synchronize sector exceptions (bank level exception list) independently of config presence
      sectorsList.forEach(sec => {
        const exRule = marginRules.find(r =>
          r.bankId === selectedBank &&
          r.sectorId === sec.id &&
          r.isExceptionOnly === true
        );
        initialExceptions[sec.id] = exRule && exRule.exceptionBps !== undefined ? exRule.exceptionBps.toString() : '0';
      });
    }

    setLocalMargins(initialMargins);
    setLocalTiers(initialTiers);
    setSelectedCalcMethod(method);
    setSelectedYearsMode(determinedMode);
    setLocalSectorExceptions(initialExceptions);

    // Save/update this newly loaded combo in both marginData and initialMarginData arrays
    const loadedCombo = {
      key: currentKey,
      localMargins: initialMargins,
      localTiers: initialTiers,
      localSectorExceptions: initialExceptions,
      selectedCalcMethod: method,
      selectedYearsMode: determinedMode
    };

    setMarginData(prev => {
      const exists = prev.find(item => item.key === currentKey);
      if (exists) return prev;
      return [...prev, loadedCombo];
    });

    setInitialMarginData(prevStr => {
      const prevArray = JSON.parse(prevStr || '[]');
      const exists = prevArray.find((item: any) => item.key === currentKey);
      if (exists) return prevStr;
      return JSON.stringify([...prevArray, loadedCombo]);
    });

    setIsLoaded(true);

    // Reset hydrating flag in next tick so that downstream update effects run with hydrating=true during this tick
    setTimeout(() => {
      isHydratingRef.current = false;
    }, 0);

  }, [selectedBank, selectedProduct, selectedSupport, selectedSalaryTier, selectedSector, marginRules]);

  // Database updater to match exact core rules compatibility
  const updateGlobalRulesForCombo = (
    targetBank: string,
    targetProduct: ProductId,
    targetSupport: SupportType,
    targetSector: string,
    targetSalaryTier: 'below_25000' | 'above_or_equal_25000' | 'not_applicable',
    marginsRecord: Record<number, string>,
    sectorExceptionsRecord: Record<string, string>,
    method: 'linear' | 'fixed' = 'fixed',
    inputMode: 'yearly' | 'key_points' | 'duration_tiers' | '' = 'key_points'
  ) => {
    if (inputMode === '') {
      return marginRules;
    }
    const normSupportVal = normSupport(targetSupport);

    const remainingRules = marginRules.filter(r => {
      const isBaseComboMatch = r.bankId === targetBank &&
                               r.productId === targetProduct &&
                               normSupport(r.supportType) === normSupportVal &&
                               normSector(r.sectorId) === normSector(targetSector) &&
                               normSalaryTier(r.salaryTier) === normSalaryTier(targetSalaryTier) &&
                               !r.isExceptionOnly;

      // COMPLETELY DELETE ALL EXISTING MARGIN RULES (both duration tiers and years)
      // for this exact combo so we don't leak stale leftovers when we switch modes!
      if (isBaseComboMatch) {
        return false;
      }

      const isExceptionForCombo = r.bankId === targetBank &&
                                  r.isExceptionOnly === true;

      return !isExceptionForCombo;
    });

    const newRulesForThisCombo: MarginRule[] = [];

    if (inputMode === 'duration_tiers') {
      localTiers.forEach((tier, index) => {
        const numFrom = Number(tier.fromMonth) || 0;
        const numTo = Number(tier.toMonth) || 0;
        const numRate = Number(tier.marginRate) || 0;
        
        newRulesForThisCombo.push({
          id: tier.id || `tier_margin_${targetBank}_${targetProduct}_${normSupportVal}_${targetSector}_${targetSalaryTier}_t${numFrom}_${numTo}_${index}`,
          bankId: targetBank,
          productId: targetProduct,
          supportType: normSupportVal as any,
          sectorId: targetSector as any,
          fromTermMonths: numFrom,
          toTermMonths: numTo,
          startMargin: numRate,
          endMargin: numRate,
          calcType: 'fixed',
          isActive: tier.active !== false,
          salaryTier: targetSalaryTier,
          productType: targetProduct as any,
          marginInputMode: 'duration_tiers',
          calculationMethod: 'fixed',
          termMonths: numTo,
          annualMargin: numRate,
          exceptionBps: 0,
          baseMargin: Number((numRate / 100).toFixed(6)),
          fromMonth: numFrom,
          toMonth: numTo,
          marginRate: numRate,
          active: tier.active !== false,
          notes: tier.notes || ''
        });
      });
    } else {
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
            id: `gen_margin_${targetBank}_${targetProduct}_${normSupportVal}_${targetSector}_${targetSalaryTier}_t${def.from}_${def.to}_${index}`,
            bankId: targetBank,
            productId: targetProduct,
            supportType: normSupportVal as any,
            sectorId: targetSector as any,
            fromTermMonths: def.from,
            toTermMonths: def.to,
            startMargin: def.start,
            endMargin: def.end,
            calcType: def.calcType,
            isActive: true,
            salaryTier: targetSalaryTier,
            productType: targetProduct as any,
            marginInputMode: inputMode as any,
            calculationMethod: method,
            year: def.yearPoint,
            termMonths: def.to === 9999 ? (def.yearPoint * 12) : def.to,
            annualMargin: def.end,
            exceptionBps: 0,
            baseMargin: Number((def.end / 100).toFixed(6))
          });
        });
      }
    }

    const newExceptionRules: MarginRule[] = [];
    sectorsList.filter(s => s.id !== 'all').forEach(secObj => {
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

    const updatedRules = [...remainingRules, ...newRulesForThisCombo, ...newExceptionRules];
    lastUpdatedRulesRef.current = updatedRules;
    setMarginRules(updatedRules);
    return updatedRules;
  };

  // Update marginData entry for currentKey when local editing states change
  useEffect(() => {
    if (!isLoaded) return;
    if (isHydratingRef.current) return;
    const currentKey = `${selectedBank}_${selectedProduct}_${selectedSupport}_${selectedSalaryTier}_${selectedSector}`;

    const activeComboData = {
      key: currentKey,
      localMargins,
      localTiers,
      localSectorExceptions,
      selectedCalcMethod,
      selectedYearsMode
    };

    setMarginData(prev => {
      const exists = prev.find(item => item.key === currentKey);
      if (exists) {
        if (JSON.stringify(exists) === JSON.stringify(activeComboData)) {
          return prev;
        }
        return prev.map(item => item.key === currentKey ? activeComboData : item);
      }
      return [...prev, activeComboData];
    });
  }, [localMargins, localTiers, localSectorExceptions, selectedCalcMethod, selectedYearsMode, isLoaded, selectedBank, selectedProduct, selectedSupport, selectedSalaryTier, selectedSector]);

  // Auto-synchronize local changes directly to parent to trigger global "hasUnsavedChanges" banner only when dirty
  useEffect(() => {
    if (!isLoaded) return;
    if (isHydratingRef.current) return;
    if (selectedYearsMode === '') return; // Guard: No mode selected/loaded, do not write empty state to global

    const currentKey = `${selectedBank}_${selectedProduct}_${selectedSupport}_${selectedSalaryTier}_${selectedSector}`;
    const activeCombo = {
      key: currentKey,
      localMargins,
      localTiers,
      localSectorExceptions,
      selectedCalcMethod,
      selectedYearsMode
    };

    const initialArr = JSON.parse(initialMarginData || '[]');
    const initialCombo = initialArr.find((item: any) => item.key === currentKey);
    const isComboDirty = !initialCombo || JSON.stringify(activeCombo) !== JSON.stringify(initialCombo);

    if (!isComboDirty) {
      // Not dirty, so do not update parent global state. This keeps reference equality of marginRules on navigation!
      return;
    }

    updateGlobalRulesForCombo(
      selectedBank,
      selectedProduct,
      selectedSupport,
      selectedSector,
      selectedSalaryTier,
      localMargins,
      localSectorExceptions,
      selectedCalcMethod,
      selectedYearsMode
    );
  }, [localMargins, localTiers, localSectorExceptions, selectedCalcMethod, selectedYearsMode, isLoaded, initialMarginData, selectedBank, selectedProduct, selectedSupport, selectedSector, selectedSalaryTier]);

  // Main save action for basic margins + exceptions
  const handleSaveConfig = async () => {
    if (isSavingToCloud) return;

    try {
      if (selectedYearsMode === 'duration_tiers') {
        // Validate duration tiers - exclude inactive rows completely from mandatory rating or overlap errors
        const parsedTiers = localTiers.map(t => ({
          ...t,
          fromNum: t.fromMonth === '' ? NaN : Number(t.fromMonth),
          toNum: t.toMonth === '' ? NaN : Number(t.toMonth),
          rateNum: t.marginRate === '' ? NaN : Number(t.marginRate)
        }));

        const activeTiers = parsedTiers.filter(t => t.active !== false);

        for (let i = 0; i < activeTiers.length; i++) {
          const t = activeTiers[i];
          if (isNaN(t.fromNum)) {
            showToast('خطأ: حقل "من شهر" يجب أن يكون رقماً صالحاً في الشرائح النشطة.', 'refuse');
            return;
          }
          if (isNaN(t.toNum)) {
            showToast('خطأ: حقل "إلى شهر" يجب أن يكون رقماً صالحاً في الشرائح النشطة.', 'refuse');
            return;
          }
          if (t.toNum < t.fromNum) {
            showToast(`خطأ: شريحة غير صالحة (${t.fromMonth} إلى ${t.toMonth}). يجب أن يكون "إلى شهر" أكبر من أو يساوي "من شهر".`, 'refuse');
            return;
          }
          if (isNaN(t.rateNum) || t.rateNum <= 0) {
            showToast('خطأ: معدل الهامش يجب أن يكون رقماً عشرياً أكبر من الصفر في الشرائح النشطة.', 'refuse');
            return;
          }
        }

        // Overlap verification strictly among active tiers
        const sortedActiveTiers = [...activeTiers].sort((a, b) => a.fromNum - b.fromNum);
        for (let i = 1; i < sortedActiveTiers.length; i++) {
          if (sortedActiveTiers[i].fromNum <= sortedActiveTiers[i-1].toNum) {
            showToast(`خطأ: يوجد تداخل بين الشرائح (${sortedActiveTiers[i-1].fromNum} إلى ${sortedActiveTiers[i-1].toNum}) و (${sortedActiveTiers[i].fromNum} إلى ${sortedActiveTiers[i].toNum}).`, 'refuse');
            return;
          }
        }
      }

      const updatedRules = updateGlobalRulesForCombo(
        selectedBank,
        selectedProduct,
        selectedSupport,
        selectedSector,
        selectedSalaryTier,
        localMargins,
        localSectorExceptions,
        selectedCalcMethod,
        selectedYearsMode
      );

      const currentKey = `${selectedBank}_${selectedProduct}_${selectedSupport}_${selectedSalaryTier}_${selectedSector}`;
      const latestCombo = {
        key: currentKey,
        localMargins,
        localTiers,
        localSectorExceptions,
        selectedCalcMethod,
        selectedYearsMode
      };

      const updatedMarginData = marginData.map(item => item.key === currentKey ? latestCombo : item);

      if (saveChanges) {
        setIsSavingToCloud(true);
        try {
          await saveChanges(updatedRules);
          
          // Clear local dirty state
          setMarginData(updatedMarginData);
          setInitialMarginData(JSON.stringify(updatedMarginData));

          showToast('🟢 تم حفظ وتطبيق الإعدادات بنجاح ومزامنتها مباشرة في قاعدة البيانات السحابية (Supabase) بشكل نهائي!', 'success');
        } catch (cloudErr: any) {
          console.error("Cloud save failed inside MarginsSection:", cloudErr);
          const errMsg = cloudErr?.message || cloudErr || '';
          showToast(`⚠️ تم تطبيق التغييرات محلياً في الرام، ولكن فشلت المزامنة مع السيرفر: ${errMsg.substring(0, 100)}. يرجى تكرار المحاولة أو النقر على زر الحفظ العام.`, 'refuse');
        } finally {
          setIsSavingToCloud(false);
        }
      } else {
        // Clear local dirty state even when local RAM-only save
        setMarginData(updatedMarginData);
        setInitialMarginData(JSON.stringify(updatedMarginData));
        showToast('✔️ تم حفظ وتطبيق الإعداد قبل قليل في الذاكرة بنجاح! نذكرك أن الحفظ مؤقت ويحتاج الضغط على زر الحفظ النهائي لحفظه بالأعلى.', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(`حدث خطأ أثناء حفظ أو تطبيق البيانات: ${e?.message || e}`, 'refuse');
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

    // Resolve target parameters
    const targetSalaryTiers: Array<'below_25000' | 'above_or_equal_25000' | 'not_applicable'> = 
      normDstSupport === 'none' ? ['not_applicable'] : ['below_25000', 'above_or_equal_25000'];

    const newRulesForDst: MarginRule[] = [];

    const shouldCopyTiers = copyTableType === 'duration_tiers' || copyTableType === 'all';
    const shouldCopyKeyPoints = copyTableType === 'key_points' || copyTableType === 'all';
    const shouldCopyYearly = copyTableType === 'yearly' || copyTableType === 'all';

    // 1. Process Duration Tiers
    if (shouldCopyTiers) {
      const tierRules = relevantSrcRules.filter(r => r.marginInputMode === 'duration_tiers');
      if (tierRules.length > 0) {
        targetSalaryTiers.forEach(targetSalaryTier => {
          tierRules.forEach((srcRule, idx) => {
            newRulesForDst.push({
              id: `copied_tier_${dstBank}_${dstProduct}_${normDstSupport}_${targetSalaryTier}_t${srcRule.fromMonth}_${srcRule.toMonth}_${idx}_${Date.now()}`,
              bankId: dstBank,
              productId: dstProduct,
              supportType: normDstSupport as any,
              sectorId: 'all',
              fromTermMonths: srcRule.fromMonth!,
              toTermMonths: srcRule.toMonth!,
              startMargin: srcRule.marginRate!,
              endMargin: srcRule.marginRate!,
              calcType: 'fixed',
              isActive: srcRule.active !== false && srcRule.isActive !== false,
              salaryTier: targetSalaryTier,
              productType: dstProduct as any,
              marginInputMode: 'duration_tiers',
              calculationMethod: 'fixed',
              termMonths: srcRule.toMonth!,
              annualMargin: srcRule.marginRate!,
              exceptionBps: 0,
              baseMargin: Number((srcRule.marginRate! / 100).toFixed(6)),
              fromMonth: srcRule.fromMonth!,
              toMonth: srcRule.toMonth!,
              marginRate: srcRule.marginRate!,
              active: srcRule.active !== false && srcRule.isActive !== false,
              notes: srcRule.notes || ''
            });
          });
        });
      }
    }

    // 2. Process Key Points
    if (shouldCopyKeyPoints) {
      const srcKeyPointRules = relevantSrcRules.filter(r => r.marginInputMode === 'key_points' || (!r.marginInputMode && [5, 10, 15, 20, 25, 30].includes(r.year || r.toTermMonths/12)));
      
      const srcMarginsKeyPoints: Record<number, string> = {};
      [5, 10, 15, 20, 25, 30].forEach(year => {
        const rY = srcKeyPointRules.find(r => r.year === year || r.toTermMonths === year * 12);
        if (rY) {
          srcMarginsKeyPoints[year] = (rY.annualMargin !== undefined ? rY.annualMargin : (rY.baseMargin !== undefined ? Number((rY.baseMargin * 100).toFixed(3)) : rY.endMargin)).toLocaleString('en-US', {useGrouping: false});
        } else {
          srcMarginsKeyPoints[year] = '';
        }
      });

      let methodKey: 'linear' | 'fixed' = 'fixed';
      const foundMethodRule = srcKeyPointRules.find(r => r.calculationMethod || r.calcType);
      if (foundMethodRule) {
        methodKey = (foundMethodRule.calculationMethod || foundMethodRule.calcType) as any;
      }

      const filledYears = [5, 10, 15, 20, 25, 30].filter(year => {
        const val = srcMarginsKeyPoints[year];
        return val !== undefined && val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0;
      });
      filledYears.sort((a, b) => a - b);

      if (filledYears.length > 0) {
        targetSalaryTiers.forEach(targetSalaryTier => {
          const definitions: Array<{ from: number, to: number, start: number, end: number, calcType: 'fixed' | 'linear', yearPoint: number }> = [];

          for (let i = 0; i < filledYears.length; i++) {
            const currentYear = filledYears[i];
            const currentMarginStr = srcMarginsKeyPoints[currentYear];
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
              const prevMarginStr = srcMarginsKeyPoints[prevYear];
              const prevMarginVal = parseFloat(prevMarginStr) || 0;

              const fromMonths = prevYear * 12 + 1;
              const toMonths = currentYear * 12;

              definitions.push({
                from: fromMonths,
                to: toMonths,
                start: methodKey === 'fixed' ? currentMarginVal : prevMarginVal,
                end: currentMarginVal,
                calcType: methodKey,
                yearPoint: currentYear
              });
            }
          }

          const lastYear = filledYears[filledYears.length - 1];
          const lastMarginStr = srcMarginsKeyPoints[lastYear];
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
              marginInputMode: 'key_points',
              calculationMethod: methodKey,
              year: def.yearPoint,
              termMonths: def.to === 9999 ? (def.yearPoint * 12) : def.to,
              annualMargin: def.end,
              exceptionBps: 0,
              baseMargin: Number((def.end / 100).toFixed(6))
            });
          });
        });
      }
    }

    // 3. Process Yearly Independent
    if (shouldCopyYearly) {
      const srcYearlyRules = relevantSrcRules.filter(r => r.marginInputMode === 'yearly' || (!r.marginInputMode && r.year && r.year >= 5 && r.year <= 30 && ![5, 10, 15, 20, 25, 30].includes(r.year)));
      
      const srcMarginsYearly: Record<number, string> = {};
      const yearsListFullForYearly = Array.from({ length: 26 }, (_, i) => 5 + i);
      yearsListFullForYearly.forEach(year => {
        const rY = srcYearlyRules.find(r => r.year === year || r.toTermMonths === year * 12);
        if (rY) {
          srcMarginsYearly[year] = (rY.annualMargin !== undefined ? rY.annualMargin : (rY.baseMargin !== undefined ? Number((rY.baseMargin * 100).toFixed(3)) : rY.endMargin)).toLocaleString('en-US', {useGrouping: false});
        } else {
          srcMarginsYearly[year] = '';
        }
      });

      let methodYearly: 'linear' | 'fixed' = 'fixed';
      const foundMethodRule = srcYearlyRules.find(r => r.calculationMethod || r.calcType);
      if (foundMethodRule) {
        methodYearly = (foundMethodRule.calculationMethod || foundMethodRule.calcType) as any;
      }

      const filledYears = yearsListFullForYearly.filter(year => {
        const val = srcMarginsYearly[year];
        return val !== undefined && val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0;
      });
      filledYears.sort((a, b) => a - b);

      if (filledYears.length > 0) {
        targetSalaryTiers.forEach(targetSalaryTier => {
          const definitions: Array<{ from: number, to: number, start: number, end: number, calcType: 'fixed' | 'linear', yearPoint: number }> = [];

          for (let i = 0; i < filledYears.length; i++) {
            const currentYear = filledYears[i];
            const currentMarginStr = srcMarginsYearly[currentYear];
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
              const prevMarginStr = srcMarginsYearly[prevYear];
              const prevMarginVal = parseFloat(prevMarginStr) || 0;

              const fromMonths = prevYear * 12 + 1;
              const toMonths = currentYear * 12;

              definitions.push({
                from: fromMonths,
                to: toMonths,
                start: methodYearly === 'fixed' ? currentMarginVal : prevMarginVal,
                end: currentMarginVal,
                calcType: methodYearly,
                yearPoint: currentYear
              });
            }
          }

          const lastYear = filledYears[filledYears.length - 1];
          const lastMarginStr = srcMarginsYearly[lastYear];
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
              marginInputMode: 'yearly',
              calculationMethod: methodYearly,
              year: def.yearPoint,
              termMonths: def.to === 9999 ? (def.yearPoint * 12) : def.to,
              annualMargin: def.end,
              exceptionBps: 0,
              baseMargin: Number((def.end / 100).toFixed(6))
            });
          });
        });
      }
    }

    const remainingRules = marginRules.filter(r => {
      const normalizedSupportType = (r.supportType === 'down_payment' || r.supportType === 'downpayment') ? 'downpayment' : r.supportType;
      const isTargetBaseRule = 
         r.bankId === dstBank &&
         r.productId === dstProduct &&
         normalizedSupportType === normDstSupport &&
         targetSalaryTiers.includes(r.salaryTier || 'not_applicable' as any) &&
         !r.isExceptionOnly;

      if (!isTargetBaseRule) return true;

      const rMode = r.marginInputMode;
      const isKeyPointsRule = rMode === 'key_points' || (!rMode && [5, 10, 15, 20, 25, 30].includes(r.year || r.toTermMonths/12));
      const rIsTiers = rMode === 'duration_tiers';
      const rIsYearly = rMode === 'yearly';

      if (copyTableType === 'duration_tiers') return !rIsTiers;
      if (copyTableType === 'key_points') return !isKeyPointsRule;
      if (copyTableType === 'yearly') return !rIsYearly;
      return false; // delete all of them for 'all'
    });

    setMarginRules([...remainingRules, ...newRulesForDst]);

    // Force context selections to change to the target combo automatically
    setSelectedBank(dstBank);
    setSelectedProduct(dstProduct);
    setSelectedSupport(dstSupport);
    if (normDstSupport === 'none') {
      setSelectedSalaryTier('not_applicable');
    } else {
      setSelectedSalaryTier('below_25000');
    }

    // Beautifully construct localized strings for copy toaster
    const getSupportName = (s: SupportType) => {
      if (s === 'monthly') return 'دعم شهري';
      if (s === 'downpayment') return 'دعم دفعة';
      return 'غير مدعوم';
    };
    const getTypeName = (t: typeof copyTableType) => {
      if (t === 'key_points') return 'الهوامش الأساسية';
      if (t === 'yearly') return 'الهوامش السنوية';
      if (t === 'duration_tiers') return 'هوامش الشرائح';
      return 'جميع الهوامش';
    };

    const srcBankName = banks.find(b => b.id === srcBank)?.nameAr || srcBank;
    const dstBankName = banks.find(b => b.id === dstBank)?.nameAr || dstBank;
    const srcProductName = productTypesList.find(p => p.id === srcProduct)?.nameAr || srcProduct;
    const dstProductName = productTypesList.find(p => p.id === dstProduct)?.nameAr || dstProduct;
    const srcSupportName = getSupportName(srcSupport);
    const dstSupportName = getSupportName(dstSupport);

    showToast(
      `تم نسخ: (${getTypeName(copyTableType)}) من: [${srcBankName} - ${srcProductName} - ${srcSupportName}] إلى: [${dstBankName} - ${dstProductName} - ${dstSupportName}] وتطبيقها بنجاح! تم تحويل شاشة العرض تلقائياً للبنك الهدف لمراجعة وتثبيت التعديلات.`,
      'success'
    );
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

            sectorsList.filter(s => s.id !== 'all').forEach(sec => {
              const yearsToIterate = selectedYearsMode === 'key_points' ? [5, 10, 15, 20, 25, 30] : Array.from({ length: 26 }, (_, i) => 5 + i);
              yearsToIterate.forEach(year => {
                const result = calculateMargin({
                  bankId: bId,
                  productId: pId,
                  supportType: sId,
                  sectorId: sec.id as SectorId,
                  termMonths: year * 12,
                  marginRules,
                  netSalary: tier === 'below_25000' ? 20000 : tier === 'above_or_equal_25000' ? 30000 : undefined,
                  calculationMode: (selectedYearsMode === 'yearly' || selectedYearsMode === 'key_points') ? selectedYearsMode : 'key_points'
                });

                let matchedBaseRule = relevantRules.find(r => 
                  r.sectorId === sec.id &&
                  !r.isExceptionOnly &&
                  (r.year === year || r.toTermMonths === year * 12)
                );
                if (!matchedBaseRule) {
                  matchedBaseRule = relevantRules.find(r => 
                    (r.sectorId === 'all' || !r.sectorId) &&
                    !r.isExceptionOnly &&
                    (r.year === year || r.toTermMonths === year * 12)
                  );
                }
                const isActive = matchedBaseRule ? matchedBaseRule.isActive !== false : true;

                list.push({
                  id: `combo_${bId}_${pId}_${sId}_${tier}_${sec.id}_${year}`,
                  bankId: bId,
                  productId: pId,
                  supportType: sId,
                  salaryTier: tier,
                  sectorId: sec.id as SectorId,
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
    <div className="space-y-4 text-right" dir="rtl">
      
      {/* 1. Header Section - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="space-y-0.5 text-right">
          <h2 className="text-lg font-bold text-gray-900 font-sans">هوامش الأرباح البنكية</h2>
          <p className="text-xs text-gray-500 font-sans">
            إدارة هوامش التمويل الأساسية ومزامنة كافة استثناءات القطاعات في واجهة واحدة متكاملة.
          </p>
        </div>
      </div>

      {/* 2. Main Horizontal Dashboard Grid (Settings Right, Table Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Right Column: Settings Panel (Wider column to comfortably display segmented buttons) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          
          {/* Settings Section Card */}
          <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>لوحة التحكم والتصفية</span>
            </h3>

            {/* Bank Select */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">البنك التمويلي:</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#0057B8] cursor-pointer"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Product Select - Segmented Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">المنتج والتمويل:</label>
              <div className="flex flex-col gap-1">
                {productTypesList.map(p => {
                  const isSelected = selectedProduct === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p.id as ProductId)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {p.nameAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Support Select - Segmented Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">نوع الدعم السكني:</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'none', label: 'غير مدعوم' },
                  { id: 'monthly', label: 'دعم شهري' },
                  { id: 'downpayment', label: 'دعم دفعة' }
                ].map(s => {
                  const isSelected = selectedSupport === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSupport(s.id as SupportType)}
                      className={`px-1 py-2 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sector Select */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">القطاع الفعال:</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#0057B8] cursor-pointer"
              >
                {sectorsList.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Salary Tier Select - Segmented Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">فئة الراتب الشهري:</label>
              {selectedSupport === 'none' ? (
                <div className="bg-slate-50 border border-slate-100 text-slate-400 rounded-lg p-2.5 text-[11px] font-bold leading-normal text-center">
                  🔒 الجدول العام لغير المدعوم (لا ينطبق)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'below_25000', label: '💵 أقل من ٢٥ ألف' },
                    { id: 'above_or_equal_25000', label: '💰 ٢٥ ألف فأكثر' }
                  ].map(t => {
                    const isSelected = selectedSalaryTier === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedSalaryTier(t.id as any)}
                        className={`px-1 py-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer white-space-nowrap ${
                          isSelected
                            ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Show Mode Selector - Segmented Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">طريقة توزيع المدة:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedYearsMode === 'duration_tiers' || selectedYearsMode === '') {
                      setSelectedYearsMode('key_points');
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    selectedYearsMode === 'key_points' || selectedYearsMode === 'yearly'
                      ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs font-extrabold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  🗓️ سنوات
                </button>
                <button
                  type="button"
                  id="tab-duration-tiers"
                  onClick={() => setSelectedYearsMode('duration_tiers')}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    selectedYearsMode === 'duration_tiers'
                      ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs font-extrabold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  📊 شرائح أشهر
                </button>
              </div>

              {(selectedYearsMode === 'key_points' || selectedYearsMode === 'yearly') && (
                <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1.5">
                  <span className="text-[10px] text-gray-400 shrink-0 select-none">عرض الجدول:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedYearsMode('key_points')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      selectedYearsMode === 'key_points'
                        ? 'bg-white text-[#0057B8] shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-slate-800'
                    }`}
                  >
                    نقاط رئيسية (٥،١٠،١٥...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedYearsMode('yearly')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      selectedYearsMode === 'yearly'
                        ? 'bg-white text-[#0057B8] shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-slate-800'
                    }`}
                  >
                    كل سنة مستقلة (٣٠-٥)
                  </button>
                </div>
              )}
            </div>

            {/* Calc Method Selector - Segmented Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500">طريقة الحساب والنسب البينية:</label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'fixed', label: 'ثابتة Fixed' },
                  { id: 'linear', label: 'تدرج خطي Linear' }
                ].map(c => {
                  const isSelected = selectedCalcMethod === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCalcMethod(c.id as any)}
                      className={`px-1 py-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0057B8]/10 border-[#0057B8] text-[#0057B8] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sector Exceptions Section Card: Formatted as a beautiful grid with no vertical scrollbar and full width of settings sidebar */}
          <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs space-y-3 text-right font-sans">
            <div className="border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>استثناءات القطاعات الفعالة للبنك (Bps)</span>
              </h4>
              <p className="text-[10px] text-gray-400 leading-normal mt-0.5">
                أدخل نقاط الأساس لقطاعات البنك (مثال: هامش أقل بـ 0.50% يكتب -50 Bps).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sectorsList.filter(s => s.id !== 'all').map((sec) => (
                <div key={sec.id} className="flex flex-col justify-between bg-slate-50 border border-slate-150 p-2.5 rounded-lg space-y-1 transition-all hover:bg-slate-100/50">
                  <span className="block text-xs font-bold text-slate-800 truncate leading-none mb-1">{sec.nameAr}</span>
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
                      className="w-full bg-white border border-gray-300 rounded-lg py-1 pl-8 pr-2 text-center text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-slate-800"
                      placeholder="0"
                    />
                    <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400 font-bold font-mono">Bps</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Left Column: Information Bar + Table Content (main workspace) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          
          {/* Live Selector Information Tags Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap gap-2 items-center justify-between text-right font-sans">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black text-slate-400 ml-1 shrink-0">التصفية النشطة:</span>
              
              <span className="bg-blue-50 border border-blue-100 text-[#0057B8] text-[11px] px-2.5 py-1 rounded-lg font-bold">
                🏦 {(banks.find(b => b.id === selectedBank)?.nameAr) || selectedBank}
              </span>

              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                📦 {productTypesList.find(p => p.id === selectedProduct)?.nameAr || selectedProduct}
              </span>

              <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                🎁 {selectedSupport === 'none' ? 'غير مدعوم' : selectedSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة'}
              </span>

              <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                💼 {sectorsList.find(s => s.id === selectedSector)?.nameAr || 'عام'}
              </span>

              <span className="col-span-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                💵 {selectedSupport === 'none' ? 'الجدول العام لغير المدعوم' : selectedSalaryTier === 'below_25000' ? 'راتب أقل من 25,000' : 'راتب 25,000 فأكثر'}
              </span>

              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                ⏱️ {selectedYearsMode === 'key_points' ? 'نقاط رئيسية' : selectedYearsMode === 'yearly' ? 'كل سنة مستقلة' : selectedYearsMode === 'duration_tiers' ? 'شرائح مدة' : 'طريقة التوزيع غير محددة بعد'}
              </span>
            </div>
          </div>

          {/* Margins Inputs Table/Grid */}
          {selectedYearsMode === '' ? (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-10 text-center space-y-4 font-sans max-w-2xl mx-auto my-4">
              <div className="text-4xl text-amber-500 flex justify-center">⚠️</div>
              <h3 className="text-sm font-black text-amber-950">لا توجد هوامش محفوظة لجهة التمويل والمنتج والدعم الحاليين</h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                لوحة التحكم لا تحتوي على تهيئة محفوظة لهذه التركيبة حالياً. 
                يرجى البدء باختيار "طريقة توزيع المدة" من القائمة الجانبية (سنوات 🗓️ أو شرائح أشهر 📊) لتظهر لك حقول إدخال وتعديل هوامش الربح.
              </p>
            </div>
          ) : selectedYearsMode === 'duration_tiers' ? (
            <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs space-y-3 text-right font-sans">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>{selectedSector === 'all' ? 'جدول شرائح مدة التمويل العامة لجميع القطاعات (مدة بالأشهر)' : 'شرائح مدة التمويل المحدّدة لهذه التصفية والقطاع (مدة بالأشهر)'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setLocalTiers(prev => [
                      ...prev,
                      {
                        id: `new_tier_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        fromMonth: 36,
                        toMonth: 60,
                        marginRate: 3.50,
                        notes: '',
                        active: true
                      }
                    ]);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>+ إضافة شريحة</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-center font-bold">من شهر</th>
                      <th scope="col" className="px-3 py-2.5 text-center font-bold">إلى شهر</th>
                      <th scope="col" className="px-3 py-2.5 text-center font-bold text-[#0057B8]">هامش الربح %</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">ملاحظات اختيارية</th>
                      <th scope="col" className="px-3 py-2.5 text-center font-bold">خيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {localTiers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">
                          لا توجد شرائح حالياً لهذه التركيبة. اضغط على زر "إضافة شريحة" للبدء.
                        </td>
                      </tr>
                    ) : (
                      localTiers.map((tier, index) => (
                        <tr key={tier.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tier.fromMonth}
                              onChange={(e) => {
                                const raw = toEnglishDigits(e.target.value);
                                const clean = raw.replace(/[^0-9]/g, '');
                                setLocalTiers(prev => prev.map(t => t.id === tier.id ? { ...t, fromMonth: clean } : t));
                              }}
                              className="bg-white border border-gray-300 rounded-lg px-2 py-1 w-full text-xs font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-slate-800"
                              placeholder="36"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tier.toMonth}
                              onChange={(e) => {
                                const raw = toEnglishDigits(e.target.value);
                                const clean = raw.replace(/[^0-9]/g, '');
                                setLocalTiers(prev => prev.map(t => t.id === tier.id ? { ...t, toMonth: clean } : t));
                              }}
                              className="bg-white border border-gray-300 rounded-lg px-2 py-1 w-full text-xs font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-slate-800"
                              placeholder="60"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={tier.marginRate}
                                onChange={(e) => {
                                  const raw = toEnglishDigits(e.target.value);
                                  let clean = raw.replace(/[^0-9.]/g, '');
                                  const firstDotIdx = clean.indexOf('.');
                                  if (firstDotIdx !== -1) {
                                    clean = clean.substring(0, firstDotIdx + 1) + clean.substring(firstDotIdx + 1).replace(/\./g, '');
                                  }
                                  setLocalTiers(prev => prev.map(t => t.id === tier.id ? { ...t, marginRate: clean } : t));
                                }}
                                className="bg-white border border-gray-300 rounded-lg pl-7 pr-2 py-1 w-full text-xs font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-slate-800"
                                placeholder="3.50"
                                dir="ltr"
                              />
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold font-mono">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={tier.notes || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLocalTiers(prev => prev.map(t => t.id === tier.id ? { ...t, notes: val } : t));
                              }}
                              className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 w-full text-xs font-bold text-right focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-slate-800"
                              placeholder="ملاحظات توضيحية..."
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setLocalTiers(prev => prev.filter(t => t.id !== tier.id));
                              }}
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs space-y-3 text-right font-sans">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <span>📊</span>
                <span>{selectedSector === 'all' ? 'جدول هوامش الأرباح السنوية العامة لجميع القطاعات' : 'جدول هوامش الأرباح السنوية المحددة للقطاع الحالي'}</span>
              </h3>
              
              {isLoaded && Object.values(localMargins).every(v => !v || v === '') && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold font-sans text-center my-1 leading-normal flex items-center justify-center gap-2">
                  <span>⚠️</span>
                  <span>لا توجد هوامش محفوظة لهذه التصفية بعد. أدخل القيم المناسبة بالأسفل ثم احفظ الإعدادات لتطبيقها.</span>
                </div>
              )}
              
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 text-right font-bold">مدة التمويل بالسنوات</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-bold text-[#0057B8]">هامش الجدول %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-slate-705 font-medium">
                    {(selectedYearsMode === 'yearly'
                      ? Array.from({ length: 26 }, (_, i) => 5 + i)
                      : [5, 10, 15, 20, 25, 30]
                    ).map((year) => {
                      const label = year === 5 || year === 10 ? `${year} سنوات` : `${year} سنة`;
                      return (
                        <tr key={year} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-2 font-bold text-slate-800">
                            {label}
                          </td>
                          <td className="px-5 py-1">
                            <div className="relative max-w-[140px] inline-block w-full">
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
                                className="bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-1.5 w-full text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-left text-slate-800"
                                placeholder="0.00"
                              />
                              <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. Natural Flow Footer Action Bar (Replaces the floating bar with a clean, fully-aligned static section) */}
      <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-right">
        <div className="text-right space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">الحالة الحالية لمستند الهوامش</span>
          <p className="text-xs font-bold text-slate-700">
            يتم تعديل هوامش <span className="text-[#0057B8] font-extrabold">{(banks.find(b => b.id === selectedBank)?.nameAr) || selectedBank}</span> لـ <span className="text-emerald-700 font-extrabold">{productTypesList.find(p => p.id === selectedProduct)?.nameAr || selectedProduct}</span> ({selectedSupport === 'none' ? 'غير مدعوم' : selectedSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة'})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSavingToCloud}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {isSavingToCloud ? (
                <span>جاري الحفظ والمزامنة...</span>
              ) : (
                <>
                  <span>💾</span>
                  <span>حفظ ومزامنة الهوامش المعدلة</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGeneralLogs(!showGeneralLogs)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex gap-1.5 items-center transition-colors"
          >
            <span>📜</span>
            <span>{showGeneralLogs ? 'إخفاء السجل الشامل' : 'عرض السجل الشامل'}</span>
          </button>
        </div>
      </div>

      {/* 4. Collapsible Cloning and Copying Section (Closed by default) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden text-right font-sans">
        <button
          type="button"
          onClick={() => setShowCopyModal(!showCopyModal)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer text-right border-none outline-none leading-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-xs font-bold text-gray-800">نسخ الهوامش من بنك آخر (مدير تكرار ومزامنة الهوامش والشرائح)</span>
          </div>
          <span className="text-xs font-bold text-[#0057B8] bg-blue-50 px-2.5 py-1 rounded-lg leading-none">
            {showCopyModal ? 'إغلاق القسم 🔼' : 'فتح خيارات النسخ والاستنساخ 🔽'}
          </span>
        </button>

        {showCopyModal && (
          <div className="p-4 border-t border-gray-150 bg-slate-50/50 space-y-4 animate-in fade-in duration-205">
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="block text-xs font-bold text-gray-700">نوع الجدول المراد نسخه من المصدر للهدف:</label>
              <select
                value={copyTableType}
                onChange={(e) => setCopyTableType(e.target.value as any)}
                className="bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-805 outline-none focus:ring-1 focus:ring-[#0057B8] cursor-pointer"
              >
                <option value="key_points">الهوامش الأساسية (نقاط رئيسية)</option>
                <option value="yearly">الهوامش السنوية (كل سنة مستقلة)</option>
                <option value="duration_tiers">هوامش الشرائح (من شهر إلى شهر)</option>
                <option value="all">جميع الهوامش مجتمعة</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Source (المنسوخ منه) */}
              <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-105 space-y-3">
                <span className="block text-xs font-bold text-[#0057B8]">👈 المصدر التمويلي (المنسخ منه):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">البنك:</label>
                    <select
                      value={copySrcBank}
                      onChange={(e) => setCopySrcBank(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">المنتج:</label>
                    <select
                      value={copySrcProduct}
                      onChange={(e) => setCopySrcProduct(e.target.value as ProductId)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      {productTypesList.map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">نوع الدعم:</label>
                    <select
                      value={copySrcSupport}
                      onChange={(e) => setCopySrcSupport(e.target.value as SupportType)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      <option value="none">غير مدعوم</option>
                      <option value="monthly">دعم شهري</option>
                      <option value="downpayment">دعم دفعة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination (الهدف) */}
              <div className="bg-emerald-50/10 p-4 rounded-xl border border-emerald-110 space-y-3">
                <span className="block text-xs font-bold text-emerald-700">👉 الهدف التمويلي (الذي سيتم استبدال قيمه):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">البنك:</label>
                    <select
                      value={copyDstBank}
                      onChange={(e) => setCopyDstBank(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">المنتج البديل:</label>
                    <select
                      value={copyDstProduct}
                      onChange={(e) => setCopyDstProduct(e.target.value as ProductId)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      {productTypesList.map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">دعم المستهدف:</label>
                    <select
                      value={copyDstSupport}
                      onChange={(e) => setCopyDstSupport(e.target.value as SupportType)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      <option value="none">غير مدعوم</option>
                      <option value="monthly">دعم شهري</option>
                      <option value="downpayment">دعم دفعة</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-100">
              <p className="text-[10px] text-amber-800 font-bold leading-normal text-right max-w-2xl">
                ⚠️ تنبيه: نسخ الهوامش يؤثر فقط على هوامش الأرباح للتركيبة المختارة، ولن يؤثر على استثناءات القطاعات أو DSR. لن تُحفَظ التعديلات نهائياً حتى يتم نقر زر الحفظ بالصفحة.
              </p>
              <div className="flex gap-2 self-end">
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
                  className="px-5 py-2 bg-[#0057B8] hover:bg-[#004bb0] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  نسخ وتطبيق الجدول
                </button>
              </div>
            </div>

            {/* Quick Bank to Bank Clone */}
            <div className="bg-slate-100/60 p-4 rounded-xl border border-gray-200 space-y-2 text-right">
              <span className="block text-xs font-extrabold text-slate-800">📋 أو استنساخ البنك بالكامل (استبدال كافة قواعد وإعدادات بنك من بنك آخر)</span>
              <p className="text-[10px] text-slate-500 mb-2">ينسخ ويستبدل جميع هوامش الأرباح واستثناءات القطاعات من بنك لآخر بضغطة واحدة.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600">من البنك المصدر:</label>
                  <select
                    value={cloneFromBank}
                    onChange={(e) => setCloneFromBank(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600">إلى البنك المستهدف (سيتم مسح بياناته واستبدالها):</label>
                  <select
                    value={cloneToBank}
                    onChange={(e) => setCloneToBank(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCloneBankLevel}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  تأكيد استنساخ البنك بالكامل
                </button>
              </div>
            </div>

          </div>
        )}
      </div>



      {/* 5. Comprehensive Register of Margin Rows (Optional reviewing log list) */}
      {showGeneralLogs && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-right font-sans mt-2">
          <div className="p-4 bg-slate-50 border-b border-gray-150 flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>📋</span>
              <span>السجل التفصيلي الشامل لكافة القواعد الفعالة في التصفية الحالية</span>
            </h4>
            <span className="text-[10px] font-medium text-slate-400">مراجعة عامة للهوامش الناتجة بناءً على استثناءات القطاع</span>
          </div>

          <div className="p-4 space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-right text-xs text-[#111827] min-w-[750px]">
                <thead className="bg-slate-50 text-gray-500 border-b border-gray-150 sticky top-0 z-10 font-bold">
                  <tr>
                    <th className="p-2.5 font-bold text-right">البنك</th>
                    <th className="p-2.5 font-bold text-right">نوع المنتج</th>
                    <th className="p-2.5 font-bold text-right">نوع الدعم</th>
                    <th className="p-2.5 font-bold text-right">القطاع</th>
                    <th className="p-2.5 font-bold text-right">مدة التمويل</th>
                    <th className="p-2.5 font-bold text-center">هامش الجدول %</th>
                    <th className="p-2.5 font-bold text-center">نسبة الاستثناء Bps</th>
                    <th className="p-2.5 font-bold text-center text-[#0057B8]">الهامش النهائي %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-slate-705 font-medium">
                  {(() => {
                    const list = getFilteredMarginRows();
                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-400 font-bold">
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
                          <td className="p-2.5 font-bold text-slate-800">{bankName}</td>
                          <td className="p-2.5 text-slate-600">{productName}</td>
                          <td className="p-2.5 text-slate-500">{supportName}</td>
                          <td className="p-2.5 text-slate-900 font-bold">{row.sectorNameAr}</td>
                          <td className="p-2.5 text-slate-700 font-mono">{durationLabel}</td>
                          <td className="p-2.5 text-center text-slate-800 font-mono">{(row.baseMargin || 0).toFixed(2)}%</td>
                          <td className={`p-2.5 text-center font-mono ${
                            row.exceptionBps > 0 
                              ? 'text-rose-500' 
                              : row.exceptionBps < 0 
                                ? 'text-emerald-500' 
                                : 'text-slate-400'
                          }`}>
                            {row.exceptionBps > 0 ? `+${row.exceptionBps}` : row.exceptionBps} Bps
                          </td>
                          <td className="p-2.5 text-center text-[#0057B8] font-mono font-black text-sm">{(row.finalMarginSec || 0).toFixed(3)}%</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
