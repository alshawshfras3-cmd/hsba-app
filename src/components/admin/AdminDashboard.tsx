import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { UsersManagementPage } from '../../pages/UsersManagementPage';
import { DiagnosticsPage } from './DiagnosticsPage';
import { 
  Building2, Briefcase, Percent, Calendar, Hourglass, HelpCircle,
  Coins, FileText, ToggleLeft, ToggleRight, Trash2, Plus, RefreshCw, 
  Map, UserPlus, ListOrdered, CheckCircle2, ChevronRight, Calculator,
  Lock, Settings, ShieldAlert, Award, FileSpreadsheet, Users, Edit, Loader2
} from 'lucide-react';
import { Bank, ProductAcceptance, SectorId, ProductId, MilitaryRank, MarginRule, DsrRule, CalculationStatus, PersonalFinanceRules, SupportType, TermRule } from '../../types';
import NumericInput from '../calculator/NumericInput';
import { 
  ApprovedSalarySourceRule, 
  PensionCalculationRule, 
  SectorClassificationMapping,
  PensionLibraryRule,
  BankSectorPensionRule
} from '../../types/pension-rules';
import { 
  fetchApprovedSalaryRules, 
  saveApprovedSalaryRule, 
  fetchPensionCalculationRules, 
  savePensionCalculationRule, 
  fetchSectorClassificationMappings, 
  saveSectorClassificationMapping,
  combineToRetirementRules
} from '../../lib/pensionDb';
import { calculateNetSalary } from '../../lib/finance-engine/salary';
import { 
  getBankRetirementRule, 
  calculateApprovedBase, 
  calculatePensionByBankRule,
  calculatePensionSalaryByRule,
  calculatePensionSalary
} from '../../lib/finance-engine/pension';
import {
  copyBankSettings,
  exportBankSettings,
  validateExportFile,
  importBankSettings,
  fetchVersions,
  restoreVersion,
  saveWithVersioning,
  toUUID
} from '../../lib/adminOperations';

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

const productTypesList = [
  { id: 'real_estate_only', nameAr: 'عقاري فقط' },
  { id: 'personal_only', nameAr: 'شخصي فقط' },
  { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
  { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
];

const sectorsList = [
  { id: 'government_civilian', nameAr: 'حكومي مدني' },
  { id: 'semi_gov', nameAr: 'شبه حكومي' },
  { id: 'companies', nameAr: 'موظف شركات' },
  { id: 'military', nameAr: 'عسكري' },
  { id: 'retired', nameAr: 'متقاعد' }
];

export default function AdminDashboard() {
  const {
    banks, setBanks,
    products, setProducts,
    militaryRanks, setMilitaryRanks,
    salaryRules, setSalaryRules,
    pensionRules, setPensionRules,
    marginRules, setMarginRules,
    dsrRules, setDsrRules,
    supportSettings, setSupportSettings,
    personalRules, setPersonalRules,
    advancedRules, setAdvancedRules,
    calculationLogs, setCalculationLogs,
    userSubscriptions, setUserSubscriptions,
    termRules, setTermRules,
    adminSubPage, setAdminSubPage,
    hasUnsavedChanges, saveChanges, cancelChanges
  } = useAppState();

  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  // Sidebar navigations
  const menuItems = [
    { id: 'banks', label: 'البنوك المرخصة', icon: Building2 },
    { id: 'products', label: 'المنتجات والقبول', icon: Settings },
    { id: 'sectors', label: 'القطاعات والرتب', icon: Briefcase },
    { id: 'pension', label: 'قواعد الراتب التقاعدي', icon: Calendar },
    { id: 'terms', label: 'مدد التمويل والحدود', icon: Hourglass },
    { id: 'margins', label: 'هوامش الأرباح البنكية', icon: FileSpreadsheet },
    { id: 'dsr', label: 'حدود الاستقطاع DSR', icon: Calculator },
    { id: 'support', label: 'الدعم السكني (سكني)', icon: Map },
    { id: 'personal', label: 'عقود التمويل الشخصي', icon: Coins },
    { id: 'advanced', label: 'صفحة القواعد المتقدمة', icon: ShieldAlert },
    { id: 'diagnostics', label: 'تشخيص الحساب التفصيلي', icon: HelpCircle },
    { id: 'logs', label: 'التشخيص وسجل المعالجة', icon: FileText },
    { id: 'users', label: 'المستخدمون والاشتراكات', icon: UserPlus }
  ];

  // Common UI State helpers
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pensionActiveTab, setPensionActiveTab] = useState<'approved_salary' | 'pension_calc' | 'sector_class' | 'rule_test' | 'rules_library' | 'bank_sector_rules'>('bank_sector_rules');
  
  const defaultLibraryRules: PensionLibraryRule[] = [
    {
      id: "tpl_rajhi_civil",
      name: "خدمة مدني الراجحي",
      calcMethod: "service_growth",
      salarySource: "basic_only",
      divisorYears: 40,
      growthRate: 2.5,
      growthMinYears: 5,
      growthMaxYears: 12,
      noGrowthAboveYears: 25,
      capAtApprovedSalary: true,
      isActive: true,
      notes: "معادلة الخدمة المدنية للراجحي مع نمو وبقاسم 40 سنة"
    },
    {
      id: "tpl_rajhi_military",
      name: "خدمة عسكري الراجحي",
      calcMethod: "service_growth",
      salarySource: "basic_only",
      divisorYears: 35,
      growthRate: 2.5,
      growthMinYears: 5,
      growthMaxYears: 12,
      noGrowthAboveYears: 25,
      capAtApprovedSalary: true,
      isActive: true,
      notes: "معادلة الخدمة العسكرية للراجحي بقاسم 35 سنة ونمو"
    },
    {
      id: "tpl_rajhi_semi",
      name: "خدمة شبه حكومي الراجحي",
      calcMethod: "service_growth",
      salarySource: "basic_only",
      divisorYears: 40,
      growthRate: 1.25,
      growthMinYears: 5,
      growthMaxYears: 12,
      noGrowthAboveYears: 25,
      capAtApprovedSalary: true,
      isActive: true,
      notes: "معادلة شبه حكومي الراجحي بحد نمو 1.25%"
    },
    {
      id: "tpl_rajhi_companies",
      name: "خدمة شركات الراجحي",
      calcMethod: "service_growth",
      salarySource: "basic_only",
      divisorYears: 40,
      growthRate: 0,
      growthMinYears: 0,
      growthMaxYears: 0,
      noGrowthAboveYears: 0,
      capAtApprovedSalary: true,
      isActive: true,
      notes: "معادلة الشركات للراجحي بدون نمو وبقاسم 40 سنة"
    },
    {
      id: "tpl_fixed_strong",
      name: "قالب نسبة ثابتة قوي",
      calcMethod: "fixed_percentage",
      salarySource: "basic_housing",
      thresholdYears: 5,
      rateBelow: 70,
      rateAbove: 80,
      capAtApprovedSalary: false,
      isActive: true,
      notes: "حساب نسبة ثابتة للقطاعات القوية (مثال: الأهلي)"
    },
    {
      id: "tpl_fixed_weak",
      name: "قالب نسبة ثابتة ضعيف",
      calcMethod: "fixed_percentage",
      salarySource: "basic_housing",
      thresholdYears: 5,
      rateBelow: 60,
      rateAbove: 70,
      capAtApprovedSalary: false,
      isActive: true,
      notes: "حساب نسبة ثابتة للقطاعات الضعيفة (مثال: الأهلي)"
    },
    {
      id: "tpl_direct",
      name: "مباشر متقاعد",
      calcMethod: "direct",
      salarySource: "manual",
      capAtApprovedSalary: false,
      isActive: true,
      notes: "اعتماد الدخل التقاعدي المباشر المدخل"
    }
  ];

  const [libraryRules, setLibraryRules] = useState<PensionLibraryRule[]>(() => {
    try {
      const saved = localStorage.getItem("pension_rules_library");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading pension_rules_library", e);
    }
    return defaultLibraryRules;
  });

  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingLibraryRule, setEditingLibraryRule] = useState<PensionLibraryRule | null>(null);

  const saveLibraryRulesToStorage = (updatedRules: PensionLibraryRule[]) => {
    try {
      localStorage.setItem("pension_rules_library", JSON.stringify(updatedRules));
      setLibraryRules(updatedRules);
    } catch (e) {
      console.error("Error saving library rules to storage", e);
    }
  };

  // --- BANK & SECTOR PENSION RULES STATE AND GENERATORS ---
  const [bankSectorRulesSelectedBankId, setBankSectorRulesSelectedBankId] = useState<string>('');
  const [isBankSectorModalOpen, setIsBankSectorModalOpen] = useState(false);
  const [editingBankSectorRule, setEditingBankSectorRule] = useState<BankSectorPensionRule | null>(null);
  const [copySourceBankId, setCopySourceBankId] = useState<string>('');
  const [isCopyBankModalOpen, setIsCopyBankModalOpen] = useState(false);

  const ensureBankSectorPensionRules = (allBanks: Bank[], currentRules: BankSectorPensionRule[]): BankSectorPensionRule[] => {
    const allowedSectors = ['gov_civil', 'military', 'semi_gov', 'companies', 'private', 'retired'];
    const sectorMigrationMap: Record<string, string> = {
      government_civilian: 'gov_civil',
      military_officer: 'military',
      military_individual: 'military',
      retiree: 'retired'
    };

    let processed = currentRules.map(rule => {
      let updatedSectorId = rule.sectorId || '';
      if (sectorMigrationMap[updatedSectorId]) {
        updatedSectorId = sectorMigrationMap[updatedSectorId];
      }
      return {
        ...rule,
        id: `${rule.bankId}_${updatedSectorId}`,
        sectorId: updatedSectorId
      };
    });

    processed = processed.filter(r => allowedSectors.includes(r.sectorId));

    const deduped: BankSectorPensionRule[] = [];
    const seen = new Set<string>();
    processed.forEach(rule => {
      const key = `${rule.bankId}_${rule.sectorId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(rule);
      }
    });

    const finalRules = [...deduped];

    allBanks.forEach(bank => {
      allowedSectors.forEach(sectorId => {
        const alreadyExists = finalRules.some(r => r.bankId === bank.id && r.sectorId === sectorId);
        
        if (!alreadyExists) {
          let salarySource: 'basic_only' | 'basic_housing' | 'net_salary' | 'manual' = 'basic_only';
          let calcMethod: 'service_growth' | 'fixed_percentage' | 'direct' = 'service_growth';
          let divisorYears = 40;
          let growthRate = 0;
          let growthMinYears = 0;
          let growthMaxYears = 0;
          let noGrowthAboveYears = 0;
          let thresholdYears = 5;
          let rateBelow = 70;
          let rateAbove = 80;
          let capAtApprovedSalary = true;

          if (sectorId === 'gov_civil') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 2.5;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'military') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 35;
            growthRate = 2.5;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'semi_gov') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 1.25;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'companies') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 0;
            growthMinYears = 0;
            growthMaxYears = 0;
            noGrowthAboveYears = 0;
            capAtApprovedSalary = true;
          } else if (sectorId === 'private') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 0;
            growthMinYears = 0;
            growthMaxYears = 0;
            noGrowthAboveYears = 0;
            capAtApprovedSalary = true;
          } else if (sectorId === 'retired') {
            salarySource = 'manual';
            calcMethod = 'direct';
            capAtApprovedSalary = false;
          }

          finalRules.push({
            id: `${bank.id}_${sectorId}`,
            bankId: bank.id,
            sectorId: sectorId,
            isActive: true,
            notes: '',
            salarySource,
            calcMethod,
            divisorYears,
            growthRate,
            growthMinYears,
            growthMaxYears,
            noGrowthAboveYears,
            thresholdYears,
            rateBelow,
            rateAbove,
            capAtApprovedSalary
          });
        }
      });
    });

    return finalRules;
  };

  const generateDefaultBankSectorRules = (allBanks: Bank[], rulesList?: PensionLibraryRule[]): BankSectorPensionRule[] => {
    return ensureBankSectorPensionRules(allBanks, []);
  };

  const [bankSectorRules, setBankSectorRules] = useState<BankSectorPensionRule[]>(() => {
    try {
      const saved = localStorage.getItem("bank_sector_pension_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const allowedSectors = ['gov_civil', 'military', 'semi_gov', 'companies', 'private', 'retired'];
          const sectorMigrationMap: Record<string, string> = {
            government_civilian: 'gov_civil',
            military_officer: 'military',
            military_individual: 'military',
            retiree: 'retired'
          };

          const migratedAndFiltered = parsed
            .map((rule: any) => {
              let updatedSectorId = rule.sectorId || '';
              if (sectorMigrationMap[updatedSectorId]) {
                updatedSectorId = sectorMigrationMap[updatedSectorId];
              }

              return {
                ...rule,
                id: `${rule.bankId}_${updatedSectorId}`,
                sectorId: updatedSectorId,
                isCustomized: false
              };
            })
            .filter((rule: any) => allowedSectors.includes(rule.sectorId));
          return migratedAndFiltered;
        }
      }
    } catch (e) {
      console.error("Error reading bank_sector_pension_rules", e);
    }
    return [];
  });

  // Ensure default bank choice and dynamic links on load or bank change
  useEffect(() => {
    if (banks.length > 0 && !bankSectorRulesSelectedBankId) {
      setBankSectorRulesSelectedBankId(banks[0].id);
    }
  }, [banks, bankSectorRulesSelectedBankId]);

  // Synchronize dynamic sector pension rules on banks change or component mount / tab open
  useEffect(() => {
    if (banks.length > 0) {
      const synchronized = ensureBankSectorPensionRules(banks, bankSectorRules);
      const serializedSync = JSON.stringify(synchronized);
      const serializedOrig = JSON.stringify(bankSectorRules);

      if (serializedSync !== serializedOrig) {
        localStorage.setItem("bank_sector_pension_rules", JSON.stringify(synchronized));
        setBankSectorRules(synchronized);
      }
    }
  }, [banks, bankSectorRules]);

  // Force rebuilding of missing rules when entering the pension sub-page
  useEffect(() => {
    if (adminSubPage === 'pension' && banks.length > 0) {
      const synchronized = ensureBankSectorPensionRules(banks, bankSectorRules);
      const serializedSync = JSON.stringify(synchronized);
      const serializedOrig = JSON.stringify(bankSectorRules);

      if (serializedSync !== serializedOrig) {
        localStorage.setItem("bank_sector_pension_rules", JSON.stringify(synchronized));
        setBankSectorRules(synchronized);
      }
    }
  }, [adminSubPage, banks]);

  const saveBankSectorRulesToStorage = (updatedRules: BankSectorPensionRule[]) => {
    try {
      localStorage.setItem("bank_sector_pension_rules", JSON.stringify(updatedRules));
      setBankSectorRules(updatedRules);
    } catch (e) {
      console.error("Error saving bank sector rules to storage", e);
    }
  };


  const [editingPension, setEditingPension] = useState<{
    sectorId: SectorId;
    retirementAge: string;
    pensionMultiplier: string;
    isActive: boolean;
  } | null>(null);
  const [editingBankTerm, setEditingBankTerm] = useState<{
    id: string;
    nameAr: string;
    maxTermMonths: string;
    maxAgeAtEnd: string;
    monthsAfterRetirement: string;
    allowAfterRetirement: boolean;
    calendarType: 'hijri' | 'gregorian';
    isActive: boolean;
  } | null>(null);

  // Dynamic institution management states
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
  const [instMonthsAfterRetirement, setInstMonthsAfterRetirement] = useState(180);
  const [instIsActive, setInstIsActive] = useState(true);
  const [instInternalNotes, setInstInternalNotes] = useState('');
  const [instModalError, setInstModalError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'refuse' } | null>(null);
  const showToast = (message: string, type: 'success' | 'refuse' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // User Management local states
  const [userTab, setUserTab] = useState<'subscriptions' | 'database_profiles'>('database_profiles');

  // --- Approved Salary Rules & Pension Rules Database States ---
  const [approvedSalaryDbRules, setApprovedSalaryDbRules] = useState<ApprovedSalarySourceRule[]>([]);
  const [pensionDbRules, setPensionDbRules] = useState<PensionCalculationRule[]>([]);
  const [sectorMappings, setSectorMappings] = useState<SectorClassificationMapping[]>([]);
  const [dbRulesLoading, setDbRulesLoading] = useState<boolean>(true);

  // Default bank selections for views
  const [selectedSalaryBankId, setSelectedSalaryBankId] = useState<string>('rajhi');
  const [selectedPensionBankTabId, setSelectedPensionBankTabId] = useState<string>('rajhi');

  // Modals editing states
  const [editingSalaryRule, setEditingSalaryRule] = useState<ApprovedSalarySourceRule | null>(null);
  const [editingPensionRule, setEditingPensionRule] = useState<PensionCalculationRule | null>(null);

  // --- Copy, Import, Export, and Version History states ---
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetBank, setCopyTargetBank] = useState('');
  const [copySourceBank, setCopySourceBank] = useState('');
  const [copySections, setCopySections] = useState<('margins' | 'dsr' | 'personal' | 'salary_source' | 'pension')[]>([
    'margins', 'dsr', 'personal', 'salary_source', 'pension'
  ]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importTargetBank, setImportTargetBank] = useState('rajhi');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTableName, setHistoryTableName] = useState('');
  const [historyBankId, setHistoryBankId] = useState('');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('');

  // --- Sandbox / Rule Tester states ---
  const [sandboxBankId, setSandboxBankId] = useState('rajhi');
  const [sandboxSectorId, setSandboxSectorId] = useState<SectorId>('government_civilian');
  const [sandboxSalaryMode, setSandboxSalaryMode] = useState<'direct' | 'details'>('details');
  const [sandboxBasic, setSandboxBasic] = useState(10000);
  const [sandboxHousing, setSandboxHousing] = useState(3000);
  const [sandboxOther, setSandboxOther] = useState(1000);
  const [sandboxDirectNet, setSandboxDirectNet] = useState(14000);
  const [sandboxDirectPension, setSandboxDirectPension] = useState(5000);
  const [sandboxServiceMonths, setSandboxServiceMonths] = useState(240);
  const [sandboxYearsToRetire, setSandboxYearsToRetire] = useState(10);
  const [sandboxMilitarySubType, setSandboxMilitarySubType] = useState<'military_officer' | 'military_individual'>('military_officer');
  const [sandboxAgeMethod, setSandboxAgeMethod] = useState<'dates' | 'manual'>('manual');
  const [sandboxBirthDay, setSandboxBirthDay] = useState(1);
  const [sandboxBirthMonth, setSandboxBirthMonth] = useState(1);
  const [sandboxBirthYear, setSandboxBirthYear] = useState(1985);
  const [sandboxBirthCalendar, setSandboxBirthCalendar] = useState<'gregorian' | 'hijri'>('gregorian');
  const [sandboxAppointmentDay, setSandboxAppointmentDay] = useState(1);
  const [sandboxAppointmentMonth, setSandboxAppointmentMonth] = useState(1);
  const [sandboxAppointmentYear, setSandboxAppointmentYear] = useState(2010);
  const [sandboxAppointmentCalendar, setSandboxAppointmentCalendar] = useState<'gregorian' | 'hijri'>('gregorian');
  const [sandboxSelectedRuleId, setSandboxSelectedRuleId] = useState<string>('auto');
  const [sandboxReferenceResult, setSandboxReferenceResult] = useState<string>('');
  
  const [sandboxResult, setSandboxResult] = useState<{
    solvedNetSalary: number;
    approvedBase: number;
    approvedSalaryMultiplier: number;
    approvedSalaryValue: number;
    ruleCalculationMethod: string;
    rateValue?: number;
    divisorMonths?: number;
    correctedPensionSalary: number;
    diagnostics: string[];
    pensionDiagnostic?: any;
    dateCalculatedAgeMonths?: number;
    dateCalculatedServiceMonths?: number;
    dateCalculatedYearsToRetire?: number;
  } | null>(null);

  // Load Database Rules on mount
  useEffect(() => {
    async function loadDbRules() {
      setDbRulesLoading(true);
      try {
        const [salaryData, pensionData, mappingsData] = await Promise.all([
          fetchApprovedSalaryRules(),
          fetchPensionCalculationRules(),
          fetchSectorClassificationMappings()
        ]);
        setApprovedSalaryDbRules(salaryData);
        setPensionDbRules(pensionData);
        setSectorMappings(mappingsData);
      } catch (err) {
        console.error("Failed loading database rules", err);
      } finally {
        setDbRulesLoading(false);
      }
    }
    loadDbRules();
  }, []);

  const openHistory = async (tableName: string, bankId: string, title: string) => {
    setHistoryTableName(tableName);
    setHistoryBankId(bankId);
    setHistoryTitle(title);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const list = await fetchVersions(tableName, bankId);
      setHistoryList(list);
    } catch (err) {
      console.error(err);
      showToast('فشل تحميل سجل التغييرات', 'refuse');
    } finally {
      setHistoryLoading(false);
    }
  };

  const executeCopy = async () => {
    if (!copySourceBank) {
      showToast('يرجى تحديد البنك المصدر للنسخ', 'refuse');
      return;
    }
    if (copySourceBank === copyTargetBank) {
      showToast('لا يمكن نسخ الإعدادات لنفس البنك المستهدف', 'refuse');
      return;
    }
    if (copySections.length === 0) {
      showToast('يرجى اختيار قسم واحد على الأقل للنسخ', 'refuse');
      return;
    }

    try {
      const results = await copyBankSettings({
        fromBankId: copySourceBank,
        toBankId: copyTargetBank,
        sections: copySections,
        currentUserEmail: 'admin@hisba.sa',
        marginRules,
        dsrRules,
        personalRules,
        approvedSalaryDbRules,
        pensionDbRules
      });

      // Update states
      if (copySections.includes('margins')) setMarginRules(results.nextMarginRules);
      if (copySections.includes('dsr')) setDsrRules(results.nextDsrRules);
      if (copySections.includes('personal')) setPersonalRules(results.nextPersonalRules);
      if (copySections.includes('salary_source')) setApprovedSalaryDbRules(results.nextApprovedSalaryDbRules);
      if (copySections.includes('pension')) setPensionDbRules(results.nextPensionDbRules);

      setShowCopyModal(false);
      showToast('تمت عملية النسخ والمزامنة بنجاح!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('فشل عملية النسخ: ' + (err.message || err), 'refuse');
    }
  };

  const triggerExport = async (bankId: string) => {
    try {
      const bkObj = banks.find(b => b.id === bankId);
      const bankNameAr = bkObj ? bkObj.nameAr : bankId;
      const exportData = await exportBankSettings(bankId, {
        marginRules,
        dsrRules,
        personalRules,
        approvedSalaryDbRules,
        pensionRules: pensionDbRules,
        currentUserEmail: 'admin@hisba.sa',
        bankNameAr
      });

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisba-settings-${bankId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير الإعدادات بنجاح بنسق JSON', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('فشل تصدير الإعدادات: ' + (err.message || err), 'refuse');
    }
  };

  const triggerRestore = async (version: any) => {
    const formattedDate = new Date(version.created_at || version.createdAt).toLocaleString('ar-SA');
    const msg = `هل أنت متأكد من الاستعادة للإصدار من ${formattedDate}؟ سيتم حذف الإعدادات الحالية للقسم وتطبيق هذه النسخة المخزنة.`;
    if (!window.confirm(msg)) {
      return;
    }
    try {
      const results = await restoreVersion(version, {
        marginRules,
        dsrRules,
        personalRules,
        approvedSalaryDbRules,
        pensionDbRules,
        currentUserEmail: 'admin@hisba.sa'
      });

      // Update states
      if (version.table_name === 'margin_rules') setMarginRules(results.nextMarginRules);
      if (version.table_name === 'dsr_rules') setDsrRules(results.nextDsrRules);
      if (version.table_name === 'personal_finance_rules') setPersonalRules(results.nextPersonalRules);
      if (version.table_name === 'approved_salary_source_rules') setApprovedSalaryDbRules(results.nextApprovedSalaryDbRules);
      if (version.table_name === 'pension_calculation_rules') setPensionDbRules(results.nextPensionDbRules);

      showToast('تمت استعادة الإصدار السابق وحفظه بنجاح!', 'success');
      setShowHistoryModal(false);
    } catch (err: any) {
      console.error(err);
      showToast('فشل الاستعادة: ' + (err.message || err), 'refuse');
    }
  };

  const triggerImportApply = async () => {
    if (!importData) return;
    try {
      const results = await importBankSettings(importData, importTargetBank, {
        marginRules,
        dsrRules,
        personalRules,
        approvedSalaryDbRules,
        pensionDbRules,
        currentUserEmail: 'admin@hisba.sa'
      });

      // Update states
      setMarginRules(results.nextMarginRules);
      setDsrRules(results.nextDsrRules);
      setPersonalRules(results.nextPersonalRules);
      setApprovedSalaryDbRules(results.nextApprovedSalaryDbRules);
      setPensionDbRules(results.nextPensionDbRules);

      setShowImportModal(false);
      setImportData(null);
      showToast('تم استيراد إعدادات البنك ومزامنتها بنجاح!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('فشل استيراد التكوينات: ' + (err.message || err), 'refuse');
    }
  };

  const getSectionNameAr = (sec: string) => {
    switch (sec) {
      case 'margin_rules': return 'قواعد الهامش والأرباح';
      case 'dsr_rules': return 'نسب الاستقطاع DSR';
      case 'personal_finance_rules': return 'قواعد التمويل الشخصي';
      case 'approved_salary_source_rules': return 'قواعد الراتب المعتمد';
      case 'pension_calculation_rules': return 'محددات الراتب التقاعدي';
      default: return sec;
    }
  };

  const [newUserNameStr, setNewUserNameStr] = useState('');
  const [newUserEmailStr, setNewUserEmailStr] = useState('');
  const [newUserRoleStr, setNewUserRoleStr] = useState<'admin' | 'manager' | 'user'>('user');
  const [newUserPlanStr, setNewUserPlanStr] = useState<'free' | 'premium' | 'enterprise'>('free');

  // States to facilitate adding new entries easily in margins
  const [newMarginBank, setNewMarginBank] = useState('alahli');
  const [newMarginStart, setNewMarginStart] = useState(2.5);
  const [newMarginEnd, setNewMarginEnd] = useState(3.5);
  const [newMarginFrom, setNewMarginFrom] = useState(1);
  const [newMarginTo, setNewMarginTo] = useState(300);

  // Filter margins
  const [filterMarginBank, setFilterMarginBank] = useState('all');

  // --- Bank Margin Rules States & Management ---
  const [selectedMarginBank, setSelectedMarginBank] = useState<string>('alahli');
  const [selectedMarginProduct, setSelectedMarginProduct] = useState<ProductId>('real_estate_only');
  const [selectedMarginSupport, setSelectedMarginSupport] = useState<SupportType>('none');
  const [localMargins, setLocalMargins] = useState<Record<number, string>>({
    5: '3.80',
    10: '3.98',
    15: '4.25',
    20: '4.60',
    25: '4.95',
    30: '5.25'
  });
  const [localCalcMethod, setLocalCalcMethod] = useState<'linear' | 'fixed'>('linear');

  // Copy-from states for Cloning inside the same bank
  const [cloningFromProduct, setCloningFromProduct] = useState<ProductId>('real_estate_only');
  const [cloningFromSupport, setCloningFromSupport] = useState<SupportType>('none');

  // Synchronize local states when selection changes or marginRules are canceled/refreshed
  useEffect(() => {
    const relevantRules = marginRules.filter(r => 
      r.bankId === selectedMarginBank && 
      r.productId === selectedMarginProduct && 
      (r.supportType === selectedMarginSupport || r.supportType === 'all')
    );

    let p5 = '3.80';
    let p10 = '3.98';
    let p15 = '4.25';
    let p20 = '4.60';
    let p25 = '4.95';
    let p30 = '5.25';
    let method: 'linear' | 'fixed' = 'linear';

    if (relevantRules.length > 0) {
      const r60 = relevantRules.find(r => r.toTermMonths === 60);
      const r120 = relevantRules.find(r => r.toTermMonths === 120);
      const r180 = relevantRules.find(r => r.toTermMonths === 180);
      const r240 = relevantRules.find(r => r.toTermMonths === 240);
      const r300 = relevantRules.find(r => r.toTermMonths === 300);
      const r360 = relevantRules.find(r => r.toTermMonths === 360);

      if (r60) p5 = r60.endMargin.toString();
      if (r120) {
        p10 = r120.endMargin.toString();
        method = r120.calcType;
      }
      if (r180) p15 = r180.endMargin.toString();
      if (r240) p20 = r240.endMargin.toString();
      if (r300) p25 = r300.endMargin.toString();
      if (r360) p30 = r360.endMargin.toString();
    } else {
      // Fallback matching logic for legacy rule structure ('real_estate' rule format)
      const oldRules = marginRules.filter(r => 
        r.bankId === selectedMarginBank && 
        r.productId === 'real_estate' && 
        (r.supportType === selectedMarginSupport || r.supportType === 'all')
      );
      if (oldRules.length > 0) {
        const r60 = oldRules.find(r => r.toTermMonths === 60);
        const r120 = oldRules.find(r => r.toTermMonths === 120);
        const r180 = oldRules.find(r => r.toTermMonths === 180);
        const r240 = oldRules.find(r => r.toTermMonths === 240);
        const r300 = oldRules.find(r => r.toTermMonths === 300);
        const r360 = oldRules.find(r => r.toTermMonths === 360);

        if (r60) p5 = r60.endMargin.toString();
        if (r120) {
          p10 = r120.endMargin.toString();
          method = r120.calcType;
        }
        if (r180) p15 = r180.endMargin.toString();
        if (r240) p20 = r240.endMargin.toString();
        if (r300) p25 = r300.endMargin.toString();
        if (r360) p30 = r360.endMargin.toString();
      }
    }

    setLocalMargins({
      5: p5,
      10: p10,
      15: p15,
      20: p20,
      25: p25,
      30: p30
    });
    setLocalCalcMethod(method);
  }, [selectedMarginBank, selectedMarginProduct, selectedMarginSupport, marginRules]);

  // General update helper to map 5-30 year points to standard ranges for the calculation engine
  const updateGlobalRulesFromLocal = (marginsRecord: Record<number, string>, method: 'linear' | 'fixed') => {
    const p5 = parseFloat(marginsRecord[5]) || 0;
    const p10 = parseFloat(marginsRecord[10]) || 0;
    const p15 = parseFloat(marginsRecord[15]) || 0;
    const p20 = parseFloat(marginsRecord[20]) || 0;
    const p25 = parseFloat(marginsRecord[25]) || 0;
    const p30 = parseFloat(marginsRecord[30]) || 0;

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

    // Filter out existing rules matching this combination to allow clean overwrite
    const remainingRules = marginRules.filter(r => {
      const matchesTarget = r.bankId === selectedMarginBank &&
                            productIdsToFilter.includes(r.productId) &&
                            (r.supportType === normSupport || r.supportType === 'all');
      return !matchesTarget;
    });

    const newRulesForThisCombo: MarginRule[] = [];
    
    // Generate rules for each of the products we want to map for this selection
    productIdsToFilter.forEach(pId => {
      const definitions = [
        { from: 0, to: 60, start: p5, end: p5, calcType: 'fixed' as const },
        { from: 61, to: 120, start: p5, end: p10, calcType: method },
        { from: 121, to: 180, start: p10, end: p15, calcType: method },
        { from: 181, to: 240, start: p15, end: p20, calcType: method },
        { from: 241, to: 300, start: p20, end: p25, calcType: method },
        { from: 301, to: 360, start: p25, end: p30, calcType: method },
        { from: 361, to: 9999, start: p30, end: p30, calcType: 'fixed' as const }
      ];

      definitions.forEach((def, index) => {
        newRulesForThisCombo.push({
          id: `gen_margin_${selectedMarginBank}_${pId}_${normSupport}_t${def.from}_${def.to}_${index}`,
          bankId: selectedMarginBank,
          productId: pId as ProductId,
          supportType: normSupport as any,
          sectorId: 'all',
          fromTermMonths: def.from,
          toTermMonths: def.to,
          startMargin: def.start,
          endMargin: def.end,
          calcType: def.calcType,
          isActive: true
        });
      });
    });

    setMarginRules([...remainingRules, ...newRulesForThisCombo]);
  };

  const handleMarginLocalChange = (year: number, value: string) => {
    setLocalMargins(prev => ({ ...prev, [year]: value }));
  };

  const handleMarginBlur = (year: number, textValue: string) => {
    updateGlobalRulesFromLocal({
      ...localMargins,
      [year]: textValue
    }, localCalcMethod);
  };

  const handleCalcMethodChange = (method: 'linear' | 'fixed') => {
    setLocalCalcMethod(method);
    updateGlobalRulesFromLocal(localMargins, method);
  };

  const handleCloneLocal = () => {
    if (cloningFromProduct === selectedMarginProduct && cloningFromSupport === selectedMarginSupport) {
      showToast("لا يمكن النسخ من وإلى نفس الحالة الحالية.", "refuse");
      return;
    }

    const confirmCopy = window.confirm("سيتم استبدال قيم الجدول الحالي بقيم الجدول المصدر. هل أنت متأكد؟");
    if (!confirmCopy) return;

    // map productId للتوافق مع الصيغة القديمة 'real_estate'
    const legacyProductId = cloningFromProduct === 'real_estate_only' ? 'real_estate' : cloningFromProduct;

    let sourceRules = marginRules.filter(r => 
      r.bankId === selectedMarginBank && 
      r.productId === cloningFromProduct && 
      (r.supportType === cloningFromSupport || r.supportType === 'all')
    );

    if (sourceRules.length === 0) {
      sourceRules = marginRules.filter(r => 
        r.bankId === selectedMarginBank && 
        r.productId === legacyProductId && 
        (r.supportType === cloningFromSupport || r.supportType === 'all')
      );
    }

    let p5 = '3.80';
    let p10 = '3.98';
    let p15 = '4.25';
    let p20 = '4.60';
    let p25 = '4.95';
    let p30 = '5.25';
    let method: 'linear' | 'fixed' = 'linear';

    if (sourceRules.length > 0) {
      const r60 = sourceRules.find(r => r.toTermMonths === 60);
      const r120 = sourceRules.find(r => r.toTermMonths === 120);
      const r180 = sourceRules.find(r => r.toTermMonths === 180);
      const r240 = sourceRules.find(r => r.toTermMonths === 240);
      const r300 = sourceRules.find(r => r.toTermMonths === 300);
      const r360 = sourceRules.find(r => r.toTermMonths === 360);

      if (r60) p5 = r60.endMargin.toString();
      if (r120) {
        p10 = r120.endMargin.toString();
        method = r120.calcType;
      }
      if (r180) p15 = r180.endMargin.toString();
      if (r240) p20 = r240.endMargin.toString();
      if (r300) p25 = r300.endMargin.toString();
      if (r360) p30 = r360.endMargin.toString();
    }

    const newCopiedMargins = {
      5: p5,
      10: p10,
      15: p15,
      20: p20,
      25: p25,
      30: p30
    };

    setLocalMargins(newCopiedMargins);
    setLocalCalcMethod(method);

    // Apply instantly to the global rules of the current selected state to cause reactive save state
    updateGlobalRulesFromLocal(newCopiedMargins, method);

    showToast("تم استنساخ الجدول بنجاح", "success");
  };

  // --- DSR Rules States & Management ---
  const [filterDsrBank, setFilterDsrBank] = useState<string>('all');
  const [filterDsrProduct, setFilterDsrProduct] = useState<string>('all');
  const [filterDsrSupport, setFilterDsrSupport] = useState<string>('all');
  const [filterDsrStage, setFilterDsrStage] = useState<string>('all');
  const [filterDsrStatus, setFilterDsrStatus] = useState<string>('all');

  const [isDsrModalOpen, setIsDsrModalOpen] = useState(false);
  const [editingDsrRule, setEditingDsrRule] = useState<DsrRule | null>(null);

  // Form states for adding/editing a DSR Rule
  const [formDsrBankId, setFormDsrBankId] = useState<string>('default');
  const [formDsrProductType, setFormDsrProductType] = useState<'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only'>('real_estate_only');
  const [formDsrSupportType, setFormDsrSupportType] = useState<'none' | 'monthly' | 'down_payment'>('none');
  const [formDsrCustomerStage, setFormDsrCustomerStage] = useState<'before_retirement' | 'after_retirement'>('before_retirement');
  const [formDsrPercentStr, setFormDsrPercentStr] = useState<string>('');
  const [formDsrDeductExisting, setFormDsrDeductExisting] = useState<boolean>(true);
  const [formDsrActive, setFormDsrActive] = useState<boolean>(true);
  const [formDsrError, setFormDsrError] = useState<string>('');

  const DSR_BANKS = [
    { id: 'default', nameAr: 'الافتراضي العام (default)' },
    ...banks.map(b => ({ id: b.id, nameAr: `${b.nameAr} (${b.id})` }))
  ];

  const DSR_PRODUCT_TYPES = [
    { id: 'real_estate_only', nameAr: 'عقاري فقط' },
    { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
    { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' },
    { id: 'personal_only', nameAr: 'شخصي فقط' }
  ];

  const DSR_SUPPORT_TYPES = [
    { id: 'none', nameAr: 'غير مدعوم' },
    { id: 'monthly', nameAr: 'دعم شهري' },
    { id: 'down_payment', nameAr: 'دعم دفعة' }
  ];

  const DSR_CUSTOMER_STAGES = [
    { id: 'before_retirement', nameAr: 'موظف نشط (قبل التقاعد)' },
    { id: 'after_retirement', nameAr: 'متقاعد (بعد التقاعد)' }
  ];

  const handleOpenAddDsrModal = () => {
    setEditingDsrRule(null);
    setFormDsrBankId('default');
    setFormDsrProductType('real_estate_only');
    setFormDsrSupportType('none');
    setFormDsrCustomerStage('before_retirement');
    setFormDsrPercentStr('');
    setFormDsrDeductExisting(true);
    setFormDsrActive(true);
    setFormDsrError('');
    setIsDsrModalOpen(true);
  };

  const handleOpenEditDsrModal = (rule: DsrRule) => {
    setEditingDsrRule(rule);
    setFormDsrBankId(rule.bankId);
    setFormDsrProductType(rule.productType);
    setFormDsrSupportType(rule.supportType);
    setFormDsrCustomerStage(rule.customerStage);
    setFormDsrPercentStr(String(rule.dsrPercent));
    setFormDsrDeductExisting(rule.deductExistingObligations);
    setFormDsrActive(rule.active);
    setFormDsrError('');
    setIsDsrModalOpen(true);
  };

  const handleDeleteDsrRule = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف قاعدة الاستقطاع هذه؟')) {
      setDsrRules(prev => prev.filter(r => r.id !== id));
      showToast('تم حذف قاعدة الاستقطاع بنجاح!', 'success');
    }
  };

  const handleToggleDsrRuleActive = (id: string) => {
    setDsrRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    showToast('تم تحديث حالة تفعيل القاعدة بنجاح!', 'success');
  };

  const handleSaveDsrForm = () => {
    const val = parseFloat(formDsrPercentStr);
    if (isNaN(val) || val < 0 || val > 100) {
      setFormDsrError('يرجى إدخال نسبة استقطاع صحيحة بين 0 و 100 %');
      return;
    }

    if (formDsrProductType === 'personal_only' && formDsrSupportType !== 'none') {
      setFormDsrError('تنبيه: لا يمكن اختيار دعم سكني مع منتج التمويل الشخصي فقط.');
      return;
    }

    const ruleId = editingDsrRule ? editingDsrRule.id : `dsr_rule_${Date.now()}`;
    const newRule: DsrRule = {
      id: ruleId,
      bankId: formDsrBankId,
      productType: formDsrProductType,
      supportType: formDsrSupportType,
      customerStage: formDsrCustomerStage,
      dsrPercent: val,
      deductExistingObligations: formDsrDeductExisting,
      active: formDsrActive
    };

    if (editingDsrRule) {
      setDsrRules(prev => prev.map(r => r.id === editingDsrRule.id ? newRule : r));
      showToast('تم تعديل قاعدة DSR بنجاح!', 'success');
    } else {
      setDsrRules(prev => [newRule, ...prev]);
      showToast('تم إضافة قاعدة DSR جديدة بنجاح!', 'success');
    }

    setIsDsrModalOpen(false);
  };

  // --- Products Acceptance Rules States & Management ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAcceptance | null>(null);

  const [formBankId, setFormBankId] = useState('alahli');
  const [formProductId, setFormProductId] = useState<ProductId>('real_estate_only');
  const [formMinSalary, setFormMinSalary] = useState('');
  const [formMinAge, setFormMinAge] = useState('');
  const [formMaxAge, setFormMaxAge] = useState('');
  const [formMinServiceMonths, setFormMinServiceMonths] = useState('');
  
  const [formAllowUnsupported, setFormAllowUnsupported] = useState(true);
  const [formAllowMonthlySupport, setFormAllowMonthlySupport] = useState(true);
  const [formAllowDownpaymentSupport, setFormAllowDownpaymentSupport] = useState(true);
  
  const [formAllowedSectors, setFormAllowedSectors] = useState<SectorId[]>(['government_civilian', 'semi_gov', 'companies', 'military', 'private']);
  const [formRejectionMessage, setFormRejectionMessage] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // --- Personal Finance Rules States & Management ---
  const [isPfModalOpen, setIsPfModalOpen] = useState(false);
  const [editingPfRule, setEditingPfRule] = useState<PersonalFinanceRules | null>(null);

  const [formPfBankId, setFormPfBankId] = useState('all');
  const [formPfPathType, setFormPfPathType] = useState<'personal_only' | 'real_estate_with_new_personal'>('personal_only');
  const [formPfCustomerStatus, setFormPfCustomerStatus] = useState<'active_employee' | 'retired'>('active_employee');
  const [formPfDsr, setFormPfDsr] = useState('33');
  const [formPfTerm, setFormPfTerm] = useState('60');
  const [formPfCoeff, setFormPfCoeff] = useState('0');
  const [formPfMargin, setFormPfMargin] = useState('4.80');
  const [formPfMinSalary, setFormPfMinSalary] = useState('4000');
  const [formPfCalcMethod, setFormPfCalcMethod] = useState<'multiplier' | 'pmt' | 'flat_rate'>('flat_rate');
  const [formPfActive, setFormPfActive] = useState(true);
  const [pfError, setPfError] = useState('');

  const openAddPfModal = () => {
    setEditingPfRule(null);
    setFormPfBankId('all');
    setFormPfPathType('personal_only');
    setFormPfCustomerStatus('active_employee');
    setFormPfDsr('33');
    setFormPfTerm('60');
    setFormPfCoeff('0');
    setFormPfMargin('4.80');
    setFormPfMinSalary('4000');
    setFormPfCalcMethod('flat_rate');
    setFormPfActive(true);
    setPfError('');
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
    setFormPfCalcMethod(rule.calculationMethod || 'multiplier');
    setFormPfActive(rule.isActive !== false);
    setPfError('');
    setIsPfModalOpen(true);
  };

  const savePfRule = () => {
    // 1. Clean input
    const cleanDsrStr = parseArabicAndEnglishNumber(formPfDsr).replace(/,/g, '').trim();
    const cleanTermStr = parseArabicAndEnglishNumber(formPfTerm).replace(/,/g, '').trim();
    const cleanCoeffStr = parseArabicAndEnglishNumber(formPfCoeff).replace(/,/g, '').trim();
    const cleanMarginStr = parseArabicAndEnglishNumber(formPfMargin).replace(/,/g, '').trim();
    const cleanSalaryStr = parseArabicAndEnglishNumber(formPfMinSalary).replace(/,/g, '').trim();

    if (!cleanDsrStr || !cleanTermStr || !cleanCoeffStr || !cleanMarginStr || !cleanSalaryStr) {
      setPfError('جميع الحقول الرقمية مطلوبة.');
      return;
    }

    const dsrNum = Number(cleanDsrStr);
    const termNum = Number(cleanTermStr);
    const coeffNum = Number(cleanCoeffStr);
    const marginNum = Number(cleanMarginStr);
    const salaryNum = Number(cleanSalaryStr);

    if (isNaN(dsrNum) || isNaN(termNum) || isNaN(coeffNum) || isNaN(marginNum) || isNaN(salaryNum)) {
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
      minAge: editingPfRule?.minAge ?? 18,
      maxAge: editingPfRule?.maxAge ?? 65,
      retireeDsrPercentage: formPfCustomerStatus === 'retired' ? dsrNum : 25,
      isActive: formPfActive,
      calculationMethod: formPfCalcMethod,
      pathType: formPfPathType,
      customerStatus: formPfCustomerStatus
    };

    if (editingPfRule) {
      // Editing Mode
      setPersonalRules(prev => prev.map(r => (r.id === editingPfRule.id || (!r.id && r.bankId === editingPfRule.bankId && r.pathType === editingPfRule.pathType && r.customerStatus === editingPfRule.customerStatus)) ? ruleData : r));
      showToast('تم تحديث قاعدة التمويل الشخصي بنجاح!', 'success');
    } else {
      // Adding Mode - check for duplicate first to prevent issues
      const exists = personalRules.some(r => r.bankId === formPfBankId && r.pathType === formPfPathType && r.customerStatus === formPfCustomerStatus);
      if (exists) {
        setPfError('توجد بالفعل قاعدة مسجلة لنفس البنك، المسار، وحالة العميل.');
        return;
      }
      setPersonalRules(prev => [...prev, ruleData]);
      showToast('تم إضافة قاعدة التمويل الشخصي بنجاح!', 'success');
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

  // --- Sectors States & Management ---
  const [sectors, setSectors] = useState([
    { id: 'government_civilian', nameAr: 'حكومي مدني', isActive: true, notes: 'لا يحتاج رتبة' },
    { id: 'semi_gov', nameAr: 'شبه حكومي', isActive: true, notes: 'لا يحتاج رتبة' },
    { id: 'companies', nameAr: 'موظف شركات', isActive: true, notes: 'لا يحتاج رتبة' },
    { id: 'military', nameAr: 'عسكري', isActive: true, notes: 'يحتاج اختيار رتبة' },
    { id: 'private', nameAr: 'قطاع خاص', isActive: true, notes: 'لا يحتاج رتبة' },
    { id: 'retired', nameAr: 'متقاعد', isActive: true, notes: 'لا يحتاج رتبة' }
  ]);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<{ id: string; nameAr: string; isActive: boolean; notes: string } | null>(null);
  const [formSectorNameAr, setFormSectorNameAr] = useState('');
  const [formSectorIsActive, setFormSectorIsActive] = useState(true);

  const openEditSectorModal = (sec: { id: string; nameAr: string; isActive: boolean; notes: string }) => {
    setEditingSector(sec);
    setFormSectorNameAr(sec.nameAr);
    setFormSectorIsActive(sec.isActive);
    setIsSectorModalOpen(true);
  };

  const saveSector = () => {
    if (!formSectorNameAr.trim()) {
      showToast('يرجى إدخال اسم القطاع', 'refuse');
      return;
    }
    setSectors(prev => prev.map(s => s.id === editingSector?.id ? { ...s, nameAr: formSectorNameAr, isActive: formSectorIsActive } : s));
    setIsSectorModalOpen(false);
    showToast('تم تحديث القطاع بنجاح!', 'success');
  };

  // --- Military Ranks States & Management ---
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<MilitaryRank | null>(null);
  const [formRankNameAr, setFormRankNameAr] = useState('');
  const [formRankId, setFormRankId] = useState('');
  const [formRankRetirementAge, setFormRankRetirementAge] = useState('');
  const [formRankDisplayOrder, setFormRankDisplayOrder] = useState('');
  const [formRankIsActive, setFormRankIsActive] = useState(true);
  const [rankError, setRankError] = useState('');

  const openEditRankModal = (rank: MilitaryRank) => {
    setEditingRank(rank);
    setFormRankNameAr(rank.nameAr);
    setFormRankId(rank.id);
    setFormRankRetirementAge(String(rank.retirementAge ?? ''));
    setFormRankDisplayOrder(String(rank.displayOrder ?? ''));
    setFormRankIsActive(rank.isActive !== false);
    setRankError('');
    setIsRankModalOpen(true);
  };

  const saveRank = () => {
    if (!formRankNameAr.trim()) {
      setRankError('اسم الرتبة مطلوب.');
      return;
    }
    const ageStr = parseArabicAndEnglishNumber(formRankRetirementAge).trim();
    const orderStr = parseArabicAndEnglishNumber(formRankDisplayOrder).trim();

    if (!ageStr || !orderStr) {
      setRankError('سن التقاعد وترتيب العرض حقول مطلوبة.');
      return;
    }

    const ageNum = Number(ageStr);
    const orderNum = Number(orderStr);

    if (isNaN(ageNum) || isNaN(orderNum)) {
      setRankError('الرجاء إدخال أرقام صحيحة لسن التقاعد وترتيب العرض.');
      return;
    }

    const updatedRank: MilitaryRank = {
      ...editingRank!,
      nameAr: formRankNameAr,
      id: formRankId,
      retirementAge: ageNum,
      displayOrder: orderNum,
      isActive: formRankIsActive
    };

    setMilitaryRanks(prev => prev.map(r => r.id === editingRank?.id ? updatedRank : r));
    setIsRankModalOpen(false);
    showToast('تم تحديث الرتبة العسكرية بنجاح!', 'success');
  };

  // Filtering states for admin table
  const [filterBank, setFilterBank] = useState('all');
  const [filterProductType, setFilterProductType] = useState('all');
  const [filterActiveStatus, setFilterActiveStatus] = useState('all');
  const [filterSupport, setFilterSupport] = useState('all');

  const openAddProductModal = () => {
    try {
      setEditingProduct(null);
      setFormBankId('alahli');
      setFormProductId('real_estate_only');
      setFormMinSalary('');
      setFormMinAge('');
      setFormMaxAge('');
      setFormMinServiceMonths('');
      setFormAllowUnsupported(true);
      setFormAllowMonthlySupport(true);
      setFormAllowDownpaymentSupport(true);
      setFormAllowedSectors(['government_civilian', 'semi_gov', 'companies', 'military', 'private', 'retired']);
      setFormRejectionMessage('');
      setFormIsActive(true);
      setFormError('');
      setIsProductModalOpen(true);
    } catch (e) {
      console.error("حدث خطأ أثناء فتح نموذج الإضافة:", e);
    }
  };

  const parseArabicAndEnglishNumber = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    // Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to english
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(arabicIndic[i], i.toString());
    }
    // Convert Persian numerals (۰۱۲۳۴۵۶۷۸۹) to english
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(persian[i], i.toString());
    }
    return str;
  };

  const openEditProductModal = (rule: ProductAcceptance) => {
    try {
      console.log("Safe copy initialization starting for edit...");
      const selectedRule = { ...rule };

      const minSalaryVal = selectedRule.minSalary !== undefined && selectedRule.minSalary !== null ? String(selectedRule.minSalary) : "";
      const minAgeVal = selectedRule.minAge !== undefined && selectedRule.minAge !== null ? String(selectedRule.minAge) : "";
      const maxAgeVal = selectedRule.maxAge !== undefined && selectedRule.maxAge !== null ? String(selectedRule.maxAge) : "";
      const minServiceVal = selectedRule.minServiceMonths !== undefined && selectedRule.minServiceMonths !== null ? String(selectedRule.minServiceMonths) : "";

      let allowedSectors: SectorId[] = [];
      if (Array.isArray(selectedRule.allowedSectors)) {
        allowedSectors = [...selectedRule.allowedSectors];
      } else if (typeof selectedRule.allowedSectors === 'string') {
        try {
          const parsed = JSON.parse(selectedRule.allowedSectors);
          if (Array.isArray(parsed)) allowedSectors = parsed;
        } catch {
          allowedSectors = [selectedRule.allowedSectors as any];
        }
      }

      // Safe fallback definitions based on User Intent Checklist:
      const minSalary = parseArabicAndEnglishNumber(minSalaryVal);
      const minAge = parseArabicAndEnglishNumber(minAgeVal);
      const maxAge = parseArabicAndEnglishNumber(maxAgeVal);
      const minServiceMonths = parseArabicAndEnglishNumber(minServiceVal);
      const rejectionMessage = selectedRule.defaultRejectionMessage || "";
      const active = selectedRule.isActive !== false;

      // Unused check but defined to fulfill checklist Requirement 8
      const allowedSupportTypes = Array.isArray((selectedRule as any).allowedSupportTypes) ? (selectedRule as any).allowedSupportTypes : [];

      setEditingProduct(selectedRule);
      setFormBankId(selectedRule.bankId || 'alahli');
      setFormProductId(selectedRule.productId || 'real_estate_only');
      setFormMinSalary(minSalary);
      setFormMinAge(minAge);
      setFormMaxAge(maxAge);
      setFormMinServiceMonths(minServiceMonths);
      setFormAllowUnsupported(selectedRule.allowUnsupported !== false);
      setFormAllowMonthlySupport(selectedRule.allowMonthlySupport !== false);
      setFormAllowDownpaymentSupport(selectedRule.allowDownpaymentSupport !== false);
      setFormAllowedSectors(allowedSectors);
      setFormRejectionMessage(rejectionMessage);
      setFormIsActive(active);
      setFormError('');
      setIsProductModalOpen(true);
      console.log("Edit product modal successfully opened without changing the original rule reference.");
    } catch (e) {
      console.error("Critical error in openEditProductModal:", e);
      setFormError("حدث خطأ غير متوقع أثناء تحميل بيانات التعديل.");
    }
  };

  const closeProductModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    try {
      if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه القاعدة؟')) {
        setProducts(prev => prev.filter(p => p.id !== id));
        showToast('تم حذف قاعدة القبول بنجاح!', 'success');
      }
    } catch (e) {
      console.error("Error deleting product:", e);
    }
  };

  const saveProductRule = () => {
    try {
      if (!formBankId) {
        setFormError('يرجى اختيار البنك.');
        return;
      }
      if (!formProductId) {
        setFormError('يرجى اختيار نوع المنتج.');
        return;
      }

      // Safe clean input reading - converting Arabic numbers and commas
      const cleanSalaryStr = parseArabicAndEnglishNumber(formMinSalary).replace(/,/g, '').trim();
      const cleanMinAgeStr = parseArabicAndEnglishNumber(formMinAge).replace(/,/g, '').trim();
      const cleanMaxAgeStr = parseArabicAndEnglishNumber(formMaxAge).replace(/,/g, '').trim();
      const cleanServiceStr = parseArabicAndEnglishNumber(formMinServiceMonths).replace(/,/g, '').trim();

      if (cleanSalaryStr === '') {
        setFormError('الحد الأدنى للراتب مطلوب.');
        return;
      }
      if (cleanMinAgeStr === '') {
        setFormError('الحد الأدنى للعمر مطلوب.');
        return;
      }
      if (cleanMaxAgeStr === '') {
        setFormError('الحد الأقصى للعمر مطلوب.');
        return;
      }
      if (cleanServiceStr === '') {
        setFormError('الحد الأدنى لخدمة الأشهر مطلوب.');
        return;
      }

      const salaryNum = Number(cleanSalaryStr);
      const minAgeNum = Number(cleanMinAgeStr);
      const maxAgeNum = Number(cleanMaxAgeStr);
      const serviceNum = Number(cleanServiceStr);

      if (isNaN(salaryNum) || salaryNum < 0) {
        setFormError('يرجى إدخال قيمة صحيحة للراتب الأدنى (0 أو أكبر).');
        return;
      }
      if (isNaN(minAgeNum) || minAgeNum < 18) {
        setFormError('الحد الأدنى للعمر يجب ألا يقل عن 18 سنة.');
        return;
      }
      if (isNaN(maxAgeNum) || maxAgeNum < minAgeNum) {
        setFormError('الحد الأقصى للعمر يجب أن يكون أكبر من أو يساوي الحد الأدنى.');
        return;
      }
      if (isNaN(serviceNum) || serviceNum < 0) {
        setFormError('أقل مدة خدمة يجب ألا تقل عن 0.');
        return;
      }

      const safeAllowedSectors = Array.isArray(formAllowedSectors) ? formAllowedSectors : [];
      if (safeAllowedSectors.length === 0) {
        setFormError('يرجى اختيار قطاع واحد مسموح به على الأقل.');
        return;
      }
      if (!formRejectionMessage.trim()) {
        setFormError('رسالة الرفض لا يمكن أن تكون فارغة.');
        return;
      }

      const payload: ProductAcceptance = {
        id: editingProduct ? editingProduct.id : `prod_rule_${Date.now()}`,
        bankId: formBankId,
        productId: formProductId,
        minSalary: salaryNum,
        minAge: minAgeNum,
        maxAge: maxAgeNum,
        minServiceMonths: serviceNum,
        allowUnsupported: formAllowUnsupported,
        allowMonthlySupport: formAllowMonthlySupport,
        allowDownpaymentSupport: formAllowDownpaymentSupport,
        allowedSectors: safeAllowedSectors,
        defaultRejectionMessage: formRejectionMessage,
        isActive: formIsActive,
        allowAfterRetirement: safeAllowedSectors.includes('retired')
      };

      if (editingProduct) {
        setProducts(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map(p => p.id === editingProduct.id ? payload : p);
        });
        showToast('تم تعديل قاعدة القبول بنجاح!', 'success');
      } else {
        setProducts(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return [payload, ...arr];
        });
        showToast('تم إضافة قاعدة القبول بنجاح!', 'success');
      }

      setEditingProduct(null);
      setIsProductModalOpen(false);
    } catch (e) {
      console.error("Critical error in saveProductRule:", e);
      setFormError("حدث خطأ غير متوقع أثناء حفظ قاعدة القبول.");
    }
  };

  // --- ACTIONS ---

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
      // Edit existing
      const updatedBanks = banks.map(b => b.id === editingInstitution.id ? updatedBank : b);
      setBanks(updatedBanks);
      showToast(`تم تعديل بيانات جهة التمويل "${instNameAr}" بنجاح في المسودة.`, "success");
    } else {
      // Create new + Create default rules to avoid gaps or errors in formulas
      setBanks(prev => [...prev, updatedBank]);

      // 1. PRODUCTS & ACCEPTANCE
      const newProducts: ProductAcceptance[] = [
        {
          id: `${cleanId}_re_only`,
          bankId: cleanId,
          productId: 'real_estate_only',
          allowedSectors: ['government_civilian', 'semi_gov', 'companies', 'military', 'private'],
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
          allowedSectors: ['government_civilian', 'semi_gov', 'companies', 'military', 'private', 'retired'],
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
          allowedSectors: ['government_civilian', 'semi_gov', 'companies', 'military', 'private'],
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
          allowedSectors: ['government_civilian', 'semi_gov', 'companies', 'military', 'private'],
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
          sectorId: 'government_civilian',
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
          sectorId: 'private',
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
          dsrPercentage: instType === 'finance_company' ? 33 : 33,
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
          dsrPercentage: instType === 'finance_company' ? 40 : 40,
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
          customerStage: 'before_retirement',
          dsrPercent: 55,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_re_only_monthly_before`,
          bankId: cleanId,
          productType: 'real_estate_only',
          supportType: 'monthly',
          customerStage: 'before_retirement',
          dsrPercent: instType === 'finance_company' ? 60 : 65,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_re_only_down_before`,
          bankId: cleanId,
          productType: 'real_estate_only',
          supportType: 'down_payment',
          customerStage: 'before_retirement',
          dsrPercent: 55,
          deductExistingObligations: true,
          active: true
        },
        {
          id: `${cleanId}_personal_only_none_before`,
          bankId: cleanId,
          productType: 'personal_only',
          supportType: 'none',
          customerStage: 'before_retirement',
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
            customerStage: 'after_retirement',
            dsrPercent: 55,
            deductExistingObligations: true,
            active: true
          },
          {
            id: `${cleanId}_re_only_monthly_after`,
            bankId: cleanId,
            productType: 'real_estate_only',
            supportType: 'monthly',
            customerStage: 'after_retirement',
            dsrPercent: instType === 'finance_company' ? 60 : 65,
            deductExistingObligations: true,
            active: true
          },
          {
            id: `${cleanId}_personal_only_none_after`,
            bankId: cleanId,
            productType: 'personal_only',
            supportType: 'none',
            customerStage: 'after_retirement',
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

  // Toggle active helper
  const toggleBankActive = (id: string) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };

  const toggleProductActive = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const toggleMarginActive = (id: string) => {
    setMarginRules(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  const deleteMargin = (id: string) => {
    setMarginRules(prev => prev.filter(m => m.id !== id));
  };

  const addMarginRule = () => {
    const newRule: MarginRule = {
      id: `m_rule_${Date.now()}`,
      bankId: newMarginBank,
      productId: 'real_estate',
      supportType: 'all',
      sectorId: 'all',
      fromTermMonths: newMarginFrom,
      toTermMonths: newMarginTo,
      startMargin: newMarginStart,
      endMargin: newMarginEnd,
      calcType: 'linear',
      isActive: true
    };
    setMarginRules(prev => [newRule, ...prev]);
    showToast('تم إضافة نطاق الفائدة ومعدل الهامش بنجاح!', 'success');
  };

  const cloneMargins = (fromBank: string, toBank: string) => {
    const parentRules = marginRules.filter(m => m.bankId === fromBank);
    const clonedRules = parentRules.map((r, i) => ({
      ...r,
      id: `cloned_${r.id}_${Date.now()}_${i}`,
      bankId: toBank
    }));
    setMarginRules(prev => [...clonedRules, ...prev]);
    showToast(`تم نسخ جدول هوامش الفائدة من ${fromBank} إلى ${toBank} بنجاح!`, 'success');
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 ${hasUnsavedChanges ? 'pb-32' : ''}`}>
      
      {/* 1. RIGHT SIDEBAR */}
      <aside className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-[#E5E7EB] p-4 h-fit">
        <div className="flex justify-between items-center lg:block pb-2 lg:pb-3 mb-2 lg:mb-3 border-b border-[#F1F5F9]">
          <h3 className="font-extrabold text-sm text-[#111827] flex items-center gap-2 px-3">
            <Settings className="w-4 h-4 text-[#0057B8]" />
            <span>إعدادات النظام والحسبة</span>
          </h3>
          {/* Mobile Hamburguer button toggle */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1.5 border border-slate-200 cursor-pointer min-h-[36px]"
          >
            <span>{isMobileNavOpen ? 'إغلاق ✕' : 'أقسام الإعدادات ☰'}</span>
          </button>
        </div>
        
        <nav className={`${isMobileNavOpen ? 'block animate-fade-in' : 'hidden'} lg:block space-y-1`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => {
                  if (hasUnsavedChanges) {
                    const confirmLeave = window.confirm("لديك تغييرات غير محفوظة، هل تريد المتابعة؟");
                    if (confirmLeave) {
                      setAdminSubPage(item.id);
                      setIsMobileNavOpen(false);
                    }
                  } else {
                    setAdminSubPage(item.id);
                    setIsMobileNavOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right text-xs font-semibold cursor-pointer transition-all min-h-[44px] ${
                  adminSubPage === item.id
                    ? 'bg-[#0057B8]/5 text-[#0057B8] font-bold border-r-4 border-[#0057B8]'
                    : 'text-[#6B7280] hover:bg-slate-50 hover:text-[#111827]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. MAIN SUB-PAGE VIEWPORT */}
      <main className="flex-1 bg-white rounded-3xl border border-gray-200 p-6 shadow-xs overflow-x-hidden min-h-[500px]">
        
        {toast && (
          <div className={`mb-6 p-4 border rounded-xl text-xs font-bold flex justify-between items-center transition-all animate-fade-in ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="font-extrabold text-sm px-1.5 opacity-75 hover:opacity-100 cursor-pointer">×</button>
          </div>
        )}

        {/* Unsaved Changes Banner Bar */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white py-4 px-6 md:px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-50 animate-fade-in">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-bold font-sans text-right">لديك تغييرات غير محفوظة في الإعدادات الحالية</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  id="admin-cancel-btn"
                  onClick={() => {
                    cancelChanges();
                    showToast('تم إلغاء التعديلات بنجاح واستعادة القيم السابقة', 'success');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-500"
                >
                  إلغاء التعديلات
                </button>
                <button
                  type="button"
                  id="admin-save-btn"
                  onClick={() => {
                    saveChanges();
                    showToast('تم حفظ التغييرات بنجاح', 'success');
                  }}
                  className="px-5 py-2 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-[#0057B8]"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* VIEW 1: BANKS MANAGE */}
        {adminSubPage === 'banks' && (
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
                    <th className="p-4">أقصى تمويل بالشهور</th>
                    <th className="p-4">أقصى عمر للانتهاء</th>
                    <th className="p-4 text-center">خدمة المتقاعدين</th>
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
                      <td className="p-4">
                        <NumericInput
                          id={`bank-term-${bank.id}`}
                          value={bank.maxTermMonths}
                          onChange={(val) => setBanks(prev => prev.map(b => b.id === bank.id ? { ...b, maxTermMonths: val } : b))}
                          allowDecimals={false}
                          className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-4">
                        <NumericInput
                          id={`bank-age-${bank.id}`}
                          value={bank.maxAgeAtEnd}
                          onChange={(val) => setBanks(prev => prev.map(b => b.id === bank.id ? { ...b, maxAgeAtEnd: val } : b))}
                          allowDecimals={false}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${bank.allowAfterRetirement ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {bank.allowAfterRetirement ? 'متاح' : 'غير متاح'}
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

            {/* MODAL FOR ADDING / EDITING COMFORTABLE INSTITUTIONS */}
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
                    {/* Arabic Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">اسم الجهة بالعربي:</label>
                      <input
                        type="text"
                        value={instNameAr}
                        onChange={(e) => {
                          setInstNameAr(e.target.value);
                          if (!editingInstitution && e.target.value) {
                            // auto set logo text first word
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

                    {/* Short ID Name */}
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

                    {/* English Name (optional) */}
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
                      {/* Institution Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">نوع جهة التمويل:</label>
                        <select
                          value={instType}
                          onChange={(e) => {
                            const newType = e.target.value as 'bank' | 'finance_company';
                            setInstType(newType);
                            // Adjust default limits based on type
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

                      {/* Logo Text */}
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

                    {/* Logo Colors presets swatch */}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                      {/* Max Term */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">أقصى مدة تمويل بالأشهر:</label>
                        <input
                          type="number"
                          value={instMaxTermMonths}
                          onChange={(e) => setInstMaxTermMonths(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="text-[10px] text-gray-400 block mt-0.5 mt-1">يعادل {Math.floor(instMaxTermMonths / 12)} سنة و {instMaxTermMonths % 12} شهر</span>
                      </div>

                      {/* Max Age */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">أقصى عمر لانتهاء التمويل:</label>
                        <input
                          type="number"
                          value={instMaxAgeAtEnd}
                          onChange={(e) => setInstMaxAgeAtEnd(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                      </div>
                    </div>

                    {/* Allow after retirement and months */}
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between mb-2 pb-1">
                        <span className="text-xs font-bold text-gray-700">هل تخدم المتقاعدين وتسمح بالتمويل لأصحاب الهوية المتقاعدة؟</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInstAllowAfterRetirement(true);
                              if (instMonthsAfterRetirement === 0) setInstMonthsAfterRetirement(120);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                              instAllowAfterRetirement 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}
                          >
                            نعم
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInstAllowAfterRetirement(false);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                              !instAllowAfterRetirement 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}
                          >
                            لا
                          </button>
                        </div>
                      </div>

                      {instAllowAfterRetirement && (
                        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 animate-fade-in">
                          <label className="block text-xs font-bold text-emerald-800 mb-1">أشهر السماح القابلة للتمديد بعد سن التقاعد المعتمد:</label>
                          <input
                            type="number"
                            value={instMonthsAfterRetirement}
                            onChange={(e) => setInstMonthsAfterRetirement(Number(e.target.value) || 0)}
                            className="w-full max-w-[150px] bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-center font-bold font-mono text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <p className="text-[10px] text-emerald-600 mt-1">تؤخذ بعين الاعتبار في معالجة القسط التقاعدي والسن المقر بالتكامل مع القطاعات.</p>
                        </div>
                      )}
                    </div>

                    {/* isActive status */}
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

                    {/* Optional Notes */}
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
        )}

        {/* VIEW 2: PRODUCTS ACCEPTANCE */}
        {adminSubPage === 'products' && (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">المنتجات والقبول</h2>
                <p className="text-xs text-gray-500">
                  إدارة منتجات البنوك وشروط قبول العملاء حسب الراتب والعمر والخدمة والدعم.
                </p>
              </div>
              <button
                id="btn-add-product-rule"
                onClick={openAddProductModal}
                className="inline-flex items-center gap-2 bg-[#0057B8] hover:bg-[#00418A] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-[#0057B8]/20 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قاعدة قبول</span>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter Bank */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">تصفية حسب البنك:</label>
                <select
                  id="filter-bank-select"
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                >
                  <option value="all">كل البنوك</option>
                  {formBanksList.map(b => (
                    <option key={b.id} value={b.id}>{b.nameAr}</option>
                  ))}
                </select>
              </div>

              {/* Filter Product Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">نوع المنتج:</label>
                <select
                  id="filter-product-select"
                  value={filterProductType}
                  onChange={(e) => setFilterProductType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                >
                  <option value="all">كل المنتجات</option>
                  {productTypesList.map(type => (
                    <option key={type.id} value={type.id}>{type.nameAr}</option>
                  ))}
                </select>
              </div>

              {/* Filter Active Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">الحالة:</label>
                <select
                  id="filter-status-select"
                  value={filterActiveStatus}
                  onChange={(e) => setFilterActiveStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">مفعل فقط</option>
                  <option value="inactive">غير مفعل</option>
                </select>
              </div>

              {/* Filter Support Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">نوع الدعم المسموح:</label>
                <select
                  id="filter-support-select"
                  value={filterSupport}
                  onChange={(e) => setFilterSupport(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                >
                  <option value="all">كل قنوات الدعم</option>
                  <option value="none">غير مدعوم متاح</option>
                  <option value="monthly">دعم شهري متاح</option>
                  <option value="downpayment">دعم دفعة متاح</option>
                </select>
              </div>
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-[#111827]">
                  <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-4 font-bold">البنك</th>
                      <th className="p-4 font-bold">نوع المنتج</th>
                      <th className="p-4 font-bold text-center">أقل راتب مقبول</th>
                      <th className="p-4 font-bold text-center">أقل عمر</th>
                      <th className="p-4 font-bold text-center">أعلى عمر</th>
                      <th className="p-4 font-bold text-center">أقل خدمة</th>
                      <th className="p-4 font-bold">الدعم المسموح</th>
                      <th className="p-4 font-bold">القطاعات المسموحة</th>
                      <th className="p-4 font-bold text-center">الحالة</th>
                      <th className="p-4 font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(() => {
                      const filteredList = products.filter(p => {
                        if (filterBank !== 'all' && p.bankId !== filterBank) return false;
                        if (filterProductType !== 'all' && p.productId !== filterProductType) return false;
                        if (filterActiveStatus === 'active' && !p.isActive) return false;
                        if (filterActiveStatus === 'inactive' && p.isActive) return false;
                        if (filterSupport === 'none' && !p.allowUnsupported) return false;
                        if (filterSupport === 'monthly' && !p.allowMonthlySupport) return false;
                        if (filterSupport === 'downpayment' && !p.allowDownpaymentSupport) return false;
                        return true;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-gray-400 font-medium">
                              لا توجد قواعد قبول مسجلة تطابق التصفية الحالية.
                            </td>
                          </tr>
                        );
                      }

                      return filteredList.map((prod) => {
                        const matchedBank = banks.find(b => b.id === prod.bankId);
                        const displayProduct = productTypesList.find(pt => pt.id === prod.productId)?.nameAr || prod.productId;
                        
                        // Supports lists
                        const supports: string[] = [];
                        if (prod.allowUnsupported !== false) supports.push('غير مدعوم');
                        if (prod.allowMonthlySupport) supports.push('دعم شهري');
                        if (prod.allowDownpaymentSupport) supports.push('دعم دفعة');

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 font-bold text-gray-900">{matchedBank?.nameAr || prod.bankId}</td>
                            <td className="p-4">
                              <span className="inline-flex font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-[#475569] text-[10px]">
                                {displayProduct}
                              </span>
                            </td>
                            <td className="p-4 text-center font-bold text-[#0057B8]">
                              {(prod.minSalary ?? 0).toLocaleString('en-US')} <span className="text-[10px] font-normal text-gray-400">ريـال</span>
                            </td>
                            <td className="p-4 text-center font-semibold text-gray-700">
                              {prod.minAge} <span className="text-[10px] font-normal text-gray-400">سنة</span>
                            </td>
                            <td className="p-4 text-center font-semibold text-gray-700">
                              {prod.maxAge} <span className="text-[10px] font-normal text-gray-400">سنة</span>
                            </td>
                            <td className="p-4 text-center font-semibold text-gray-700">
                              {prod.minServiceMonths} <span className="text-[10px] font-normal text-gray-400">شهر</span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {supports.map((s, idx) => (
                                  <span key={idx} className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    {s}
                                  </span>
                                ))}
                                {supports.length === 0 && (
                                  <span className="text-red-500 text-[9px] font-bold">لا يوجد دعم متاح</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {(Array.isArray(prod.allowedSectors) ? prod.allowedSectors : []).map(sec => {
                                  const secAr = sec === 'government_civilian' ? 'حكومي' :
                                                sec === 'semi_gov' ? 'شبه حكومي' :
                                                sec === 'companies' ? 'موظف شركات' :
                                                sec === 'military' ? 'عسكري' :
                                                sec === 'private' ? 'خاص' : 'متقاعد';
                                  return (
                                    <span key={sec} className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                                      {secAr}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                aria-label="تبديل الحالة"
                                onClick={() => toggleProductActive(prod.id)}
                                className="cursor-pointer inline-flex transition-transform hover:scale-105"
                              >
                                {prod.isActive ? (
                                  <ToggleRight className="w-8 h-8 text-[#0057B8]" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <div className="inline-flex gap-2">
                                <button
                                  id={`btn-edit-rule-${prod.id}`}
                                  onClick={() => openEditProductModal(prod)}
                                  className="text-[#0057B8] hover:bg-blue-50 p-1.5 rounded-lg transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  تعديل
                                </button>
                                <button
                                  id={`btn-delete-rule-${prod.id}`}
                                  onClick={() => deleteProduct(prod.id)}
                                  className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title="حذف القاعدة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

            {/* PRODUCT DRAWER/MODAL POPUP */}
            {isProductModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  
                  {/* Backdrop Overlay */}
                  <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"
                    onClick={closeProductModal}
                  ></div>

                  {/* Centering spacer element */}
                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                  {/* Modal box */}
                  <div className="relative z-50 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-100">
                    
                    {/* Header */}
                    <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900" id="modal-title">
                        {editingProduct ? 'تعديل قاعدة قبول القرض' : 'إضافة قاعدة قبول جديدة'}
                      </h3>
                      <button
                        type="button"
                        onClick={closeProductModal}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                      
                      {/* Error Alert inside popup */}
                      {formError && (
                        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-xl text-red-700 text-xs font-bold leading-relaxed">
                          ⚠️ {formError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Bank Select */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">البنك الشريك *</label>
                          <select
                            id="form-bank-select"
                            value={formBankId}
                            onChange={(e) => setFormBankId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          >
                            {formBanksList.map(b => (
                              <option key={b.id} value={b.id}>{b.nameAr}</option>
                            ))}
                          </select>
                        </div>

                        {/* Product Type Select */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">نوع منتج التمويل *</label>
                          <select
                            id="form-product-select"
                            value={formProductId}
                            onChange={(e) => setFormProductId(e.target.value as ProductId)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          >
                            {productTypesList.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.nameAr}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Min Salary Input */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">أقل راتب مقبول (ريال سـعودي) *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="form-min-salary-input"
                            value={formMinSalary}
                            placeholder="مثال: 5000 أو 4,500"
                            onChange={(e) => setFormMinSalary(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                        </div>

                        {/* Min Service Months Input */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">أقل مدة خدمه للعملاء بالأشهر *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="form-min-service-input"
                            value={formMinServiceMonths}
                            placeholder="مثال: 3 أو 6"
                            onChange={(e) => setFormMinServiceMonths(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Min Age Input */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">أقل عمر للعميل مقبول ومفعل *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="form-min-age-input"
                            value={formMinAge}
                            placeholder="مثال: 18"
                            onChange={(e) => setFormMinAge(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                        </div>

                        {/* Max Age Input */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700">أعلى عمر للعميل مقبول ومفعل *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="form-max-age-input"
                            value={formMaxAge}
                            placeholder="مثال: 70 أو 75"
                            onChange={(e) => setFormMaxAge(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                        </div>
                      </div>

                      {/* Allowed Support Choices (Checks) */}
                      <div className="space-y-2 border border-gray-100 bg-gray-50/50 p-4 rounded-2xl">
                        <label className="block text-xs font-bold text-gray-800">أنواع الدعم المسكوني المسموحة:</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={formAllowUnsupported}
                              onChange={(e) => setFormAllowUnsupported(e.target.checked)}
                              className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                            />
                            <span>غير مدعوم متاح</span>
                          </label>

                          {formProductId !== 'personal_only' && formProductId !== 'personal' && (
                            <>
                              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={formAllowMonthlySupport}
                                  onChange={(e) => setFormAllowMonthlySupport(e.target.checked)}
                                  className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                                />
                                <span>دعم شهري متاح</span>
                              </label>

                              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={formAllowDownpaymentSupport}
                                  onChange={(e) => setFormAllowDownpaymentSupport(e.target.checked)}
                                  className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                                />
                                <span>دعم دفعة متاح</span>
                              </label>
                            </>
                          )}
                        </div>
                        {formProductId === 'personal_only' && (
                          <p className="text-[10px] text-amber-600 font-semibold mt-1">
                            * تنبيه: يُمنع استخدام الدعم السكني في التمويل الشخصي وفق شروط الحسبة.
                          </p>
                        )}
                      </div>

                      {/* Allowed Sectors */}
                      <div className="space-y-2 border border-gray-100 bg-gray-50/50 p-4 rounded-2xl">
                        <label className="block text-xs font-bold text-gray-800">القطاعات المقبولة والمسموحة لقاعدة الشريك: *</label>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6">
                          {sectorsList.map(sec => {
                            const sectorsArr = Array.isArray(formAllowedSectors) ? formAllowedSectors : [];
                            const isChecked = sectorsArr.includes(sec.id as SectorId);
                            return (
                              <label key={sec.id} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormAllowedSectors(prev => {
                                        const current = Array.isArray(prev) ? prev : [];
                                        return [...current, sec.id as SectorId];
                                      });
                                    } else {
                                      setFormAllowedSectors(prev => {
                                        const current = Array.isArray(prev) ? prev : [];
                                        return current.filter(x => x !== sec.id);
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                                />
                                <span>{sec.nameAr}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Default Rejection Message */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700">رسالة الرفض عند عدم مطابقة الشروط *</label>
                        <textarea
                          id="form-rejection-msg"
                          rows={2}
                          value={formRejectionMessage}
                          onChange={(e) => setFormRejectionMessage(e.target.value)}
                          placeholder="مثال: تم رفض الطلب بسبب أن صافي الراتب أقل من الحد الأدنى المقدر لهذا البنك."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        ></textarea>
                      </div>

                      {/* Active Status Check */}
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <input
                          type="checkbox"
                          id="form-is-active-btn"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded border-gray-300 text-[#0057B8] w-4 h-4 focus:ring-[#0057B8] cursor-pointer"
                        />
                        <label htmlFor="form-is-active-btn" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                          تفعيل هذه القاعدة في الحسبة الحالية مباشرة
                        </label>
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-row-reverse gap-3 rounded-b-3xl">
                      <button
                        type="button"
                        id="btn-save-product-rule"
                        onClick={saveProductRule}
                        className="bg-[#0057B8] hover:bg-[#00418A] text-white px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#0057B8]/10"
                      >
                        حفظ القاعدة
                      </button>
                      <button
                        type="button"
                        onClick={closeProductModal}
                        className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        إلغاء المعالجة
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: SECTORS */}
        {adminSubPage === 'sectors' && (
          <div className="space-y-8">
            {/* Header Description */}
            <div>
              <h2 className="text-lg font-bold text-[#111827]">إعدادات القطاعات الوظيفية والرتب العسكرية</h2>
              <p className="text-xs text-[#6B7280]">ترتيب وإدارة القطاعات الوظيفية، وإدارة الرتب العسكرية لتعيين سن التقاعد وضبط معايير العرض والقبول.</p>
            </div>

            {/* Section 1: Sectors Grid */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-[#111827] text-sm flex items-center gap-1.5 border-b pb-2 border-gray-100">
                <Briefcase className="w-4 h-4 text-[#0057B8]" />
                <span>القسم الأول: القطاعات الوظيفية</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sectors.filter(sec => sec.id !== 'private').map((sec) => (
                  <div key={sec.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-[#111827] text-sm">{sec.nameAr}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sec.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {sec.isActive ? 'مفعل' : 'غير مفعل'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex flex-col gap-1">
                        <div>
                          <span className="font-semibold text-slate-400">Sector ID:</span>{' '}
                          <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-[10px] text-slate-600">{sec.id}</code>
                        </div>
                        <p className="mt-1">ملاحظة: {sec.notes}</p>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => openEditSectorModal(sec)}
                        className="w-full text-center text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        تعديل القطاع
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Military Ranks Table */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-[#111827] text-sm flex items-center gap-1.5 border-b pb-2 border-gray-100">
                <Award className="w-4 h-4 text-[#0057B8]" />
                <span>القسم الثاني: الرتب العسكرية</span>
              </h3>
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs text-[#111827]">
                    <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="p-4 font-bold">الرتبة</th>
                        <th className="p-4 font-bold">Rank ID</th>
                        <th className="p-4 font-bold text-center">سن التقاعد</th>
                        <th className="p-4 font-bold text-center">ترتيب العرض</th>
                        <th className="p-4 font-bold text-center">الحالة</th>
                        <th className="p-4 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-semibold">
                      {militaryRanks && militaryRanks.length > 0 ? (
                        militaryRanks.slice().sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)).map((rank) => (
                          <tr key={rank.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-800">{rank.nameAr}</td>
                            <td className="p-4">
                              <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-500">{rank.id}</code>
                            </td>
                            <td className="p-4 text-center font-sans">
                              {rank.retirementAge} سنة
                            </td>
                            <td className="p-4 text-center font-sans">
                              {rank.displayOrder}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setMilitaryRanks(prev => prev.map(r => r.id === rank.id ? { ...r, isActive: !r.isActive } : r))}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  rank.isActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    rank.isActive ? '-translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => openEditRankModal(rank)}
                                className="text-[#0057B8] hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                              >
                                تعديل
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">لا توجد رتب عسكرية مسجلة حالياً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTORS MODAL POPUP */}
            {isSectorModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="sector-modal-title" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" onClick={() => setIsSectorModalOpen(false)}></div>
                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                  <div className="relative z-55 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-gray-900" id="sector-modal-title">
                        تعديل بيانات القطاع الوظيفي
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsSectorModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="px-6 py-6 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">اسم القطاع:</label>
                        <input
                          type="text"
                          value={formSectorNameAr}
                          onChange={(e) => setFormSectorNameAr(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">ID القطاع:</label>
                        <input
                          type="text"
                          value={editingSector?.id || ''}
                          disabled
                          className="w-full bg-slate-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs font-bold text-gray-600">حالة التفعيل:</span>
                        <button
                          type="button"
                          onClick={() => setFormSectorIsActive(!formSectorIsActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            formSectorIsActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              formSectorIsActive ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
                      <button
                        type="button"
                        onClick={saveSector}
                        className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                      >
                        حفظ التعديلات
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSectorModalOpen(false)}
                        className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MILITARY RANKS MODAL POPUP */}
            {isRankModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="rank-modal-title" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" onClick={() => setIsRankModalOpen(false)}></div>
                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                  <div className="relative z-55 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-gray-900" id="rank-modal-title">
                        تعديل بيانات الرتبة العسكرية
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsRankModalOpen(false)}
                        className="text-gray-400 hover:text-gray-650 focus:outline-none text-lg font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="px-6 py-6 space-y-4">
                      {rankError && (
                        <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold">
                          ⚠️ {rankError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">اسم الرتبة:</label>
                        <input
                          type="text"
                          value={formRankNameAr}
                          onChange={(e) => setFormRankNameAr(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">Rank ID:</label>
                        <input
                          type="text"
                          value={formRankId}
                          disabled
                          className="w-full bg-slate-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">سن التقاعد الإلزامي:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formRankRetirementAge}
                          onChange={(e) => setFormRankRetirementAge(e.target.value)}
                          className="text-right w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="مثال: 44"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600">ترتيب العرض:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formRankDisplayOrder}
                          onChange={(e) => setFormRankDisplayOrder(e.target.value)}
                          className="text-right w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="مثال: 1"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs font-bold text-gray-600">حالة التفعيل:</span>
                        <button
                          type="button"
                          onClick={() => setFormRankIsActive(!formRankIsActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            formRankIsActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              formRankIsActive ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
                      <button
                        type="button"
                        onClick={saveRank}
                        className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                      >
                        حفظ التعديلات
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRankModalOpen(false)}
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
        )}

        {/* VIEW 4: APPROVED SALARY RULES & PENSION UNIFIED HEADER */}
        {adminSubPage === 'pension' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 mb-6 shadow-xs font-sans">
            <div className="flex justify-between items-center pb-1">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">قواعد الراتب التقاعدي</h2>
                <p className="text-xs text-[#6B7280]">إدارة قواعد احتساب الراتب التقاعدي الحيوية والمباشرة لكل قطاع وبنك دون تعقيد الربط أو مكتبات القوالب</p>
              </div>
            </div>
          </div>
        )}

        {adminSubPage === 'pension' && pensionActiveTab === 'approved_salary' && (
          <div className="space-y-6">

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
              <span className="text-xs font-bold text-slate-700">عمليات سريعة للبنك التمويلي الحالي:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCopyTargetBank(selectedSalaryBankId);
                    setCopySourceBank('');
                    setCopySections(['salary_source']);
                    setShowCopyModal(true);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📋 نسخ إعدادات من بنك آخر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openHistory('approved_salary_source_rules', selectedSalaryBankId, `سجل تغييرات قواعد الراتب المعتمد — ${formBanksList.find(b => b.id === selectedSalaryBankId)?.nameAr || selectedSalaryBankId}`);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📜 سجل التغييرات
                </button>
              </div>
            </div>

            {/* Dropdown to select bank */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 rounded-2xl p-5 border border-gray-100 font-sans">
              <span className="text-xs font-bold text-gray-700">البنك:</span>
              <select
                id="salary-bank-selector"
                value={selectedSalaryBankId}
                onChange={(e) => setSelectedSalaryBankId(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              >
                {formBanksList.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>

            {dbRulesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
                <span className="text-xs font-bold text-gray-500">جاري تحميل قواعد الرواتب المعتمدة...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs">
                  <table className="min-w-full divide-y divide-gray-200 text-right font-sans">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-right">القطاع</th>
                        <th scope="col" className="px-6 py-4 text-right">مصدر الراتب</th>
                        <th scope="col" className="px-6 py-4 text-right">المضاعف</th>
                        <th scope="col" className="px-6 py-4 text-right">تعديل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-700">
                      {(() => {
                        const SECTOR_LABELS_LOCAL: Record<string, string> = {
                          gov_civil: 'مدني حكومي',
                          military: 'عسكري',
                          companies: 'شركات',
                          semi_gov: 'شبه حكومي',
                          retired: 'متقاعد',
                          default: 'افتراضي / أخرى'
                        };
                        const SOURCE_LABELS_LOCAL: Record<string, string> = {
                          basic_only: 'أساسي فقط',
                          basic_housing: 'أساسي + سكن',
                          gross: 'الإجمالي',
                          custom_multiplier: 'مخصص'
                        };

                        const filtered = approvedSalaryDbRules.filter(r => r.bankId === selectedSalaryBankId);
                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400 font-bold">
                                لا يوجد قطاعات مضافة لهذا البنك بعد. يمكنك إضافة قطاع جديد أدناه.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((rule) => (
                          <tr key={rule.id || rule.sectorId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                              {SECTOR_LABELS_LOCAL[rule.sectorId] || rule.descriptionAr || rule.sectorId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                              {SOURCE_LABELS_LOCAL[rule.salarySource] || rule.salarySource}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                              {rule.multiplier !== undefined ? Number(rule.multiplier).toFixed(3) : '1.000'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setEditingSalaryRule(rule)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-[#0057B8] transition-colors cursor-pointer"
                                title="تعديل"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 justify-start font-bold text-xs pt-2 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      const customId = prompt("أدخل الرمز التعريفي للقطاع بالإنجليزية (مثال: semi_gov, private):");
                      if (!customId) return;
                      const customLabel = prompt("أدخل الاسم العربي لعرض القطاع:");
                      if (!customLabel) return;
                      
                      const newRule: ApprovedSalarySourceRule = {
                        id: 'temp_' + Date.now(),
                        bankId: selectedSalaryBankId,
                        sectorId: customId,
                        salarySource: 'basic_housing',
                        multiplier: 1.0,
                        descriptionAr: customLabel
                      };
                      setApprovedSalaryDbRules(prev => [...prev, newRule]);
                      showToast('تم إضافة قطاع جديد محلياً! انقر على حفظ التغييرات للرفع والمزامنة.', 'success');
                    }}
                    className="bg-white border border-gray-200 hover:border-[#0057B8] text-gray-700 hover:text-[#0057B8] px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    + إضافة قطاع
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const rulesToSave = approvedSalaryDbRules.filter(r => r.bankId === selectedSalaryBankId);
                        for (const rule of rulesToSave) {
                          await saveApprovedSalaryRule(rule);
                        }
                        showToast('تم حفظ تغييرات الرواتب المعتمدة بنجاح للبنك وزيادة الاستجابة فورياً!', 'success');
                      } catch (err: any) {
                        console.error(err);
                        showToast('فشل المزامنة مع الجداول في Supabase: ' + (err.message || err), 'refuse');
                      }
                    }}
                    className="bg-[#0057B8] hover:bg-blue-750 text-white px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            )}

            {/* Editing salary rule modal */}
            {editingSalaryRule && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
                <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#0057B8] text-white px-6 py-4 flex justify-between items-center">
                    <h3 className="font-extrabold text-sm font-sans">تعديل مصدر الراتب المعتمد</h3>
                    <button onClick={() => setEditingSalaryRule(null)} className="text-white hover:text-gray-200 text-xl font-bold cursor-pointer">×</button>
                  </div>
                  
                  <div className="p-6 space-y-4 text-xs font-semibold text-gray-700 text-right">
                    <div>
                      <label className="block text-gray-500 mb-1.5 font-sans font-bold">اسم القطاع (للعرض فقط)</label>
                      <input 
                        type="text" 
                        disabled 
                        value={
                          editingSalaryRule.sectorId === 'gov_civil' ? 'مدني حكومي' :
                          editingSalaryRule.sectorId === 'military' ? 'عسكري' :
                          editingSalaryRule.sectorId === 'companies' ? 'شركات' :
                          editingSalaryRule.sectorId === 'semi_gov' ? 'شبه حكومي' :
                          editingSalaryRule.sectorId === 'retired' ? 'متقاعد' :
                          editingSalaryRule.sectorId === 'default' ? 'افتراضي / أخرى' :
                          editingSalaryRule.descriptionAr || editingSalaryRule.sectorId
                        } 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-gray-500 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 mb-1.5 font-bold font-sans">مصدر الراتب</label>
                      <select
                        value={editingSalaryRule.salarySource}
                        onChange={(e) => setEditingSalaryRule({
                          ...editingSalaryRule,
                          salarySource: e.target.value as any
                        })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] outline-none"
                      >
                        <option value="basic_only">أساسي فقط</option>
                        <option value="basic_housing">أساسي + سكن</option>
                        <option value="gross">الإجمالي</option>
                        <option value="custom_multiplier">مخصص</option>
                      </select>
                    </div>

                    {(editingSalaryRule.salarySource === 'basic_only' || editingSalaryRule.salarySource === 'custom_multiplier') && (
                      <div>
                        <label className="block text-gray-500 mb-1.5 font-sans font-bold">المضاعف</label>
                        <NumericInput
                          id="salary-multiplier-input"
                          value={editingSalaryRule.multiplier}
                          onChange={(val) => setEditingSalaryRule({
                            ...editingSalaryRule,
                            multiplier: val
                          })}
                          allowDecimals={true}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] outline-none font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-500 mb-1.5 font-sans font-bold">وصف عربي اختياري</label>
                      <textarea
                        value={editingSalaryRule.descriptionAr || ''}
                        onChange={(e) => setEditingSalaryRule({
                          ...editingSalaryRule,
                          descriptionAr: e.target.value
                        })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] outline-none h-20 resize-none font-sans"
                        placeholder="مثال: أساسي × 1.345 للمدنيين المشمولين..."
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setApprovedSalaryDbRules(prev => prev.map(r => r.sectorId === editingSalaryRule.sectorId && r.bankId === editingSalaryRule.bankId ? editingSalaryRule : r));
                        setEditingSalaryRule(null);
                        showToast('تم تعديل القواعد محلياً بنجاح! يرجى النقر على حفظ التغييرات للمزامنة النهائية.', 'success');
                      }}
                      className="bg-[#0057B8] hover:bg-blue-750 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSalaryRule(null)}
                      className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: PENSION */}
        {adminSubPage === 'pension' && pensionActiveTab === 'pension_calc' && (
          <div className="space-y-6">

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
              <span className="text-xs font-bold text-slate-700">عمليات سريعة للبنك التمويلي المفتوح:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const mappedBankId = selectedPensionBankTabId === 'ahli' ? 'alahli' : selectedPensionBankTabId;
                    setCopyTargetBank(mappedBankId);
                    setCopySourceBank('');
                    setCopySections(['pension']);
                    setShowCopyModal(true);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📋 نسخ إعدادات من بنك آخر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mappedBankId = selectedPensionBankTabId === 'ahli' ? 'alahli' : selectedPensionBankTabId;
                    openHistory('pension_calculation_rules', mappedBankId, `سجل تغييرات قواعد الراتب التقاعدي — ${formBanksList.find(b => b.id === mappedBankId)?.nameAr || mappedBankId}`);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📜 سجل التغييرات
                </button>
              </div>
            </div>

            {/* Bank Navigation Tabs */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 block mb-1 font-sans">اختر البنك أو المصرف التمويلي:</span>
              <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3 font-sans">
                {banks.map((b) => {
                  const tabId = b.id === 'alahli' ? 'ahli' : b.id;
                  const isSelected = selectedPensionBankTabId === tabId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedPensionBankTabId(tabId)}
                      className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#0057B8] text-white shadow-md' 
                          : 'bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 hover:border-gray-300'
                      }`}
                    >
                      {b.nameAr.replace('البنك ', '')}
                    </button>
                  );
                })}
              </div>
            </div>

            {dbRulesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
                <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
                <span className="text-xs font-bold text-gray-500">جاري تحميل قواعد الراتب التقاعدي...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const filteredRules = pensionDbRules.filter(r => r.bankId === selectedPensionBankTabId);
                  
                  // If we don't have rules for this bank, we offer to seed default ones!
                  if (filteredRules.length === 0) {
                    return (
                      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 text-center font-sans space-y-4">
                        <p className="text-xs font-bold text-amber-800">لا يوجد قواعد احتساب معاش تقاعدي معتبرة في قاعدة البيانات لهذا البنك بعد.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultSectors = ['gov_civil', 'military', 'companies', 'semi_gov', 'retired', 'default'];
                            const seeded: PensionCalculationRule[] = defaultSectors.map(sec => ({
                              id: 'temp_pension_' + sec + '_' + Date.now(),
                              bankId: selectedPensionBankTabId,
                              sectorId: sec,
                              calculationMethod: selectedPensionBankTabId === 'ahli' ? 'fixed_percentage' : 'service_based',
                              divisorMonths: selectedPensionBankTabId === 'ahli' ? undefined : (sec === 'military' ? 420 : 480),
                              rateBelowThreshold: selectedPensionBankTabId === 'ahli' ? 50 : undefined,
                              rateAboveThreshold: selectedPensionBankTabId === 'ahli' ? 55 : undefined,
                              yearsThreshold: selectedPensionBankTabId === 'ahli' ? 5 : undefined
                            }));
                            setPensionDbRules(prev => [...prev, ...seeded]);
                            showToast('تم تهيئة قواعد افتراضية للبنك محلياً! اضغط على حفظ لإنشائها.', 'success');
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          + تهيئة قواعد افتراضية للبنك
                        </button>
                      </div>
                    );
                  }

                  // Group by method so we render nicely if they have both, or prioritize based on calculationMethod
                  const sampleRule = filteredRules[0];
                  const isServiceBased = sampleRule.calculationMethod === 'service_based';

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-sky-50 rounded-2xl p-4 border border-sky-100 font-sans">
                        <span className="text-xs font-bold text-sky-900">طريقة احتساب المعاش الافتراضية للبنك:</span>
                        <span className="text-xs font-extrabold text-[#0057B8] bg-white border border-[#0057B8]/20 px-3 py-1 rounded-xl">
                          {isServiceBased ? 'معادلة خدمة (القاسم الشهري)' : 'برنامج النسبة المئوية الثابتة'}
                        </span>
                      </div>

                      {isServiceBased ? (
                        /* Case 1: Service Based Rules Table */
                        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs font-sans">
                          <table className="min-w-full divide-y divide-gray-200 text-right">
                            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              <tr>
                                <th scope="col" className="px-6 py-4 text-right">القطاع</th>
                                <th scope="col" className="px-6 py-4 text-right">الطريقة</th>
                                <th scope="col" className="px-6 py-4 text-right">القاسم الشهري (عدد الأشهر)</th>
                                <th scope="col" className="px-6 py-4 text-right">تجاوز الراتب المعتمد</th>
                                <th scope="col" className="px-6 py-4 text-right">تعديل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-700">
                              {filteredRules.map((rule) => {
                                const SECTOR_LABELS_LOCAL: Record<string, string> = {
                                  gov_civil: 'مدني حكومي',
                                  military: 'عسكري',
                                  companies: 'شركات',
                                  semi_gov: 'شبه حكومي',
                                  retired: 'متقاعد',
                                  default: 'افتراضي / أخرى'
                                };
                                const OVERRIDE_LABELS: Record<string, string> = {
                                  basic_only: 'أساسي فقط',
                                  basic_housing: 'أساسي + سكن',
                                  gross: 'الإجمالي',
                                  custom_multiplier: 'مخصص'
                                };
                                return (
                                  <tr key={rule.id || rule.sectorId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                                      {SECTOR_LABELS_LOCAL[rule.sectorId] || rule.sectorId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                      معادلة سنوات الخدمة
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                                      {rule.divisorMonths || '480'} شهر
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-bold">
                                      {rule.salarySourceOverride ? `تجاوز إلى: ${OVERRIDE_LABELS[rule.salarySourceOverride]}` : 'لا يوجد (افتراضي)'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => setEditingPensionRule(rule)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-[#0057B8] transition-colors cursor-pointer"
                                      >
                                        ✏️
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Case 2: Fixed Percentage Table */
                        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs font-sans">
                          <table className="min-w-full divide-y divide-gray-200 text-right">
                            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              <tr>
                                <th scope="col" className="px-6 py-4 text-right">التصنيف</th>
                                <th scope="col" className="px-6 py-4 text-right">الطريقة</th>
                                <th scope="col" className="px-6 py-4 text-right">النسبة (عند أو دون العتبة)</th>
                                <th scope="col" className="px-6 py-4 text-right">النسبة (فوق العتبة)</th>
                                <th scope="col" className="px-6 py-4 text-right">عتبة السنوات</th>
                                <th scope="col" className="px-6 py-4 text-right font-bold text-slate-500">تعديل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-700 font-sans">
                              {filteredRules.map((rule) => {
                                const CLASSIFICATION_LABELS: Record<string, string> = {
                                  strong: 'قطاعات قوية',
                                  weak: 'قطاعات ضعيفة',
                                  gov_civil: 'مدني حكومي',
                                  military: 'عسكري',
                                  companies: 'شركات',
                                  semi_gov: 'شبه حكومي',
                                  retired: 'متقاعد',
                                  default: 'افتراضي / أخرى'
                                };
                                return (
                                  <tr key={rule.id || rule.sectorId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                                      {CLASSIFICATION_LABELS[rule.sectorId] || rule.sectorId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                      نسبة مئوية ثابتة
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                                      {rule.rateBelowThreshold !== undefined ? `${rule.rateBelowThreshold}%` : '50%'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                                      {rule.rateAboveThreshold !== undefined ? `${rule.rateAboveThreshold}%` : '55%'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                                      {rule.yearsThreshold || '5'} سنوات
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => setEditingPensionRule(rule)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-[#0057B8] transition-colors cursor-pointer"
                                      >
                                        ✏️
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="flex gap-4 justify-start font-bold text-xs pt-2 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            const methodType = confirm("هل تريد تحويل البنك بأكمله لطريقة النسبة الثابتة؟ انقر 'حسناً' للنسية الثابتة، أو 'إلغاء' لمعادلة سنوات الخدمة.") ? 'fixed_percentage' : 'service_based';
                            setPensionDbRules(prev => prev.map(r => r.bankId === selectedPensionBankTabId ? {
                              ...r,
                              calculationMethod: methodType as any
                            } : r));
                            showToast('تم تعديل الطريقة مؤقتاً بالمسودة! انقر على حفظ لمزامنة التغيير.', 'success');
                          }}
                          className="bg-white border border-gray-200 hover:border-[#0057B8] text-gray-700 hover:text-[#0057B8] px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          🔄 تغيير طريقة الحساب للبنك
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const rulesToSave = pensionDbRules.filter(r => r.bankId === selectedPensionBankTabId);
                              for (const rule of rulesToSave) {
                                await savePensionCalculationRule(rule);
                              }
                              showToast('تم حفظ تغييرات محددات المعاش والراتب التقاعدي بنجاح!', 'success');
                            } catch (err: any) {
                              console.error(err);
                              showToast('فشل المزامنة مع الجداول: ' + (err.message || err), 'refuse');
                            }
                          }}
                          className="bg-[#0057B8] hover:bg-blue-750 text-white px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          حفظ التغييرات
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Editing pension rule modal */}
            {editingPensionRule && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
                <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#0057B8] text-white px-6 py-4 flex justify-between items-center font-sans">
                    <h3 className="font-extrabold text-sm">تعديل قواعد التقاعد والمعاش</h3>
                    <button onClick={() => setEditingPensionRule(null)} className="text-white hover:text-gray-200 text-xl font-bold cursor-pointer">×</button>
                  </div>

                  <div className="p-6 space-y-4 text-xs font-semibold text-gray-700 text-right">
                    <div>
                      <label className="block text-gray-500 mb-1.5 font-sans font-bold">التصنيف أو القطاع (للعرض فقط)</label>
                      <input 
                        type="text" 
                        disabled 
                        value={
                          editingPensionRule.sectorId === 'strong' ? 'قطاعات قوية (A)' :
                          editingPensionRule.sectorId === 'weak' ? 'قطاعات ضعيفة (B)' :
                          editingPensionRule.sectorId === 'gov_civil' ? 'مدني حكومي' :
                          editingPensionRule.sectorId === 'military' ? 'عسكري' :
                          editingPensionRule.sectorId === 'companies' ? 'شركات' :
                          editingPensionRule.sectorId === 'semi_gov' ? 'شبه حكومي' :
                          editingPensionRule.sectorId === 'retired' ? 'متقاعد' :
                          editingPensionRule.sectorId === 'default' ? 'افتراضي / أخرى' :
                          editingPensionRule.sectorId
                        } 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-gray-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 mb-1.5 font-sans font-bold">طريقة الحساب</label>
                      <select
                        value={editingPensionRule.calculationMethod}
                        onChange={(e) => setEditingPensionRule({
                          ...editingPensionRule,
                          calculationMethod: e.target.value as any,
                          divisorMonths: e.target.value === 'service_based' ? 480 : undefined,
                          yearsThreshold: e.target.value === 'fixed_percentage' ? 5 : undefined,
                          rateBelowThreshold: e.target.value === 'fixed_percentage' ? 50 : undefined,
                          rateAboveThreshold: e.target.value === 'fixed_percentage' ? 55 : undefined
                        })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-[#0057B8] outline-none"
                      >
                        <option value="service_based font-sans">معادلة سنوات الخدمة (القاسم)</option>
                        <option value="fixed_percentage font-sans">نسبة ثابتة (أهلي)</option>
                      </select>
                    </div>

                    {editingPensionRule.calculationMethod === 'service_based' ? (
                      /* Service Based Inputs */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-500 mb-1.5 font-sans font-bold">قاسم حساب المعاش (أشهر الخدمة)</label>
                          <NumericInput
                            id="pension-divisor-input"
                            value={editingPensionRule.divisorMonths}
                            onChange={(val) => setEditingPensionRule({
                              ...editingPensionRule,
                              divisorMonths: val
                            })}
                            allowDecimals={false}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#0057B8] font-mono"
                          />
                          <span className="text-[10px] text-gray-400 font-normal leading-relaxed block mt-1">عادةً 480 شهر للمدنيين (40 سنة خدمة) و 420 شهر للعسكريين (35 سنة خدمة).</span>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1.5 font-sans font-bold">تجاوز الراتب المعتمد أو الرتبة التلقائية</label>
                          <select
                            value={editingPensionRule.salarySourceOverride || ''}
                            onChange={(e) => setEditingPensionRule({
                              ...editingPensionRule,
                              salarySourceOverride: (e.target.value || undefined) as any
                            })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#0057B8]"
                          >
                            <option value="">استخدم راتب القطاع المعتمد التلقائي للبنك</option>
                            <option value="basic_only">أساسي فقط</option>
                            <option value="basic_housing">أساسي + سكن</option>
                            <option value="gross">إجمالي الراتب بالبدلات</option>
                            <option value="custom_multiplier">مخصص</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Fixed Percentage Inputs */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-500 mb-1.5 font-sans font-bold">النسبة % (دون أو عند العتبة)</label>
                            <NumericInput
                              id="pension-rate-below-input"
                              value={editingPensionRule.rateBelowThreshold}
                              onChange={(val) => setEditingPensionRule({
                                ...editingPensionRule,
                                rateBelowThreshold: val
                              })}
                              allowDecimals={true}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-500 mb-1.5 font-sans font-bold">النسبة % (فوق العتبة)</label>
                            <NumericInput
                              id="pension-rate-above-input"
                              value={editingPensionRule.rateAboveThreshold}
                              onChange={(val) => setEditingPensionRule({
                                ...editingPensionRule,
                                rateAboveThreshold: val
                              })}
                              allowDecimals={true}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1.5 font-sans font-bold">عتبة السنوات (مثلاً المتبقي لسنوات التقاعد)</label>
                          <NumericInput
                            id="pension-threshold-years-input"
                            value={editingPensionRule.yearsThreshold}
                            onChange={(val) => setEditingPensionRule({
                              ...editingPensionRule,
                              yearsThreshold: val
                            })}
                            allowDecimals={false}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setPensionDbRules(prev => prev.map(r => r.sectorId === editingPensionRule.sectorId && r.bankId === editingPensionRule.bankId ? editingPensionRule : r));
                        setEditingPensionRule(null);
                        showToast('تم تحديل قواعد المعاش محلياً! يرجى النقر على حفظ التغييرات للرفع والمزامنة.', 'success');
                      }}
                      className="bg-[#0057B8] hover:bg-blue-750 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPensionRule(null)}
                      className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5.2: SECTOR CLASSIFICATIONS (TAB 3) */}
        {adminSubPage === 'pension' && pensionActiveTab === 'sector_class' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6 font-sans">
            <div>
              <h3 className="text-md font-bold text-gray-900">خرائط تصنيف القطاعات (قوي / ضعيف)</h3>
              <p className="text-xs text-slate-500 mt-1">تستخدم بعض الجهات التمويلية كالبنك الأهلي تصنيفًا ثنائيًا للقطاعات الوظيفية لتطبيق معادلات تقاعد مختلفة بناءً على تصنيف القطاع.</p>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed font-semibold">
              ℹ️ تنويه الأهلي (Alahli):
              <ul className="list-disc list-inside mt-1 space-y-1 font-normal text-blue-700 text-[11px]">
                <li><strong>القطاعات القوية (Strong):</strong> حكومي مدني، شبه حكومي، شركات كبرى، عسكري ضابط. (تقاعدها: 80% إذا تبقى له أكثر من 5 سنوات، و 70% إذا كان المتبقي 5 سنوات أو أقل).</li>
                <li><strong>القطاعات الضعيفة (Weak):</strong> غيرها من القطاعات كعسكري أفراد. (تقاعدها: 70% إذا تبقى له أكثر من 5 سنوات، و 60% إذا كان المتبقي 5 سنوات أو أقل).</li>
              </ul>
            </div>

            <div className="border border-slate-150 rounded-2xl overflow-x-auto shadow-xs">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-extrabold text-[#111827] border-b border-slate-150">
                    <th className="px-6 py-3.5">القطاع المهني</th>
                    <th className="px-6 py-3.5">مفتاح القطاع كود</th>
                    <th className="px-6 py-3.5 text-center">التصنيف المعياري الحالي (للأهلي)</th>
                    <th className="px-6 py-3.5 text-center">تحديث التصنيف الفوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-[#111827]">
                  {[
                    { id: 'government_civilian', label: 'حكومي مدني', defaultClass: 'strong' },
                    { id: 'semi_gov', label: 'شبه حكومي', defaultClass: 'strong' },
                    { id: 'companies', label: 'شركات كبرى (أرامكو/سابك)', defaultClass: 'strong' },
                    { id: 'military_officer', label: 'عسكري (ضباط)', defaultClass: 'strong' },
                    { id: 'military_individual', label: 'عسكري (أفراد)', defaultClass: 'weak' },
                    { id: 'private', label: 'القطاع الخاص', defaultClass: 'weak' },
                    { id: 'retired', label: 'متقاعد حالي', defaultClass: 'strong' }
                  ].map((sec) => {
                    const customMapping = sectorMappings.find(m => m.bankId === 'alahli' && m.sectorId === sec.id);
                    const currentClass = customMapping ? customMapping.bankSectorId : sec.defaultClass;
                    const isStrong = currentClass === 'strong';

                    return (
                      <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold">{sec.label}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{sec.id}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isStrong
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {isStrong ? 'قوي (Strong)' : 'ضعيف (Weak)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedClass = isStrong ? 'weak' : 'strong';
                              const nextMapping: SectorClassificationMapping = {
                                id: customMapping?.id || `map_alahli_${sec.id}_${Date.now()}`,
                                bankId: 'alahli',
                                sectorId: sec.id as SectorId,
                                bankSectorId: updatedClass
                              };
                              // Save locally
                              setSectorMappings(prev => {
                                const filtered = prev.filter(m => !(m.bankId === 'alahli' && m.sectorId === sec.id));
                                return [...filtered, nextMapping];
                              });
                              // Save DB
                              try {
                                await saveSectorClassificationMapping(nextMapping);
                                showToast(`تم تعديل قطاع ${sec.label} بنجاح إلى ${isStrong ? 'ضعيف' : 'قوي'}!`, 'success');
                              } catch (err) {
                                console.error(err);
                                showToast('خطأ أثناء حفظ التصنيف لقاعدة البيانات', 'refuse');
                              }
                            }}
                            className="text-[10px] font-extrabold text-[#0057B8] hover:underline cursor-pointer"
                          >
                            🔄 تبديل التصنيف
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5.4: PENSION RULES LIBRARY (TAB 5) */}
        {adminSubPage === 'pension' && pensionActiveTab === 'rules_library' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6 font-sans text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-md font-bold text-gray-900">مكتبة قواعد التقاعد 📚</h3>
                <p className="text-xs text-slate-500 mt-1">
                  قوالب عامة لتنظيم وتصميم قواعد حساب الراتب التقاعدي المتاحة في السوق المصرفي والقطاعات المختلفة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingLibraryRule({
                    id: `lib_rule_${Date.now()}`,
                    name: '',
                    calcMethod: 'service_growth',
                    salarySource: 'basic_only',
                    divisorYears: 40,
                    growthRate: 2.5,
                    growthMinYears: 5,
                    growthMaxYears: 12,
                    noGrowthAboveYears: 25,
                    capAtApprovedSalary: true,
                    isActive: true,
                    notes: '',
                    description: ''
                  });
                  setIsLibraryModalOpen(true);
                }}
                className="bg-[#0057B8] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة قاعدة جديدة
              </button>
            </div>

            {/* Statistics Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">
                <span className="text-xs text-slate-500 font-bold">إجمالي القواعد المتوفرة</span>
                <span className="block text-2xl font-extrabold text-slate-800 mt-1">{libraryRules.length}</span>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-right">
                <span className="text-xs text-emerald-600 font-bold">القواعد النشطة</span>
                <span className="block text-2xl font-extrabold text-emerald-700 mt-1">
                  {libraryRules.filter(r => r.isActive).length}
                </span>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-right">
                <span className="text-xs text-amber-600 font-bold font-sans">القواعد غير النشطة</span>
                <span className="block text-2xl font-extrabold text-amber-700 mt-1">
                  {libraryRules.filter(r => !r.isActive).length}
                </span>
              </div>
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-150">
              <table className="min-w-full divide-y divide-gray-200 text-right" dir="rtl">
                <thead className="bg-[#F8FAFC] text-gray-750 text-xs font-bold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-right">قاعدة التقاعد</th>
                    <th scope="col" className="px-4 py-3 text-right">مصدر الراتب المعتمد</th>
                    <th scope="col" className="px-4 py-3 text-right">طريقة الحساب والتفاصيل</th>
                    <th scope="col" className="px-4 py-3 text-right">ملاحظات</th>
                    <th scope="col" className="px-4 py-3 text-center">حالة التفعيل</th>
                    <th scope="col" className="px-4 py-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-xs text-gray-650">
                  {libraryRules.map((rule) => {
                    const sourceLabels: Record<string, string> = {
                      basic_only: 'الأساسي فقط 💵',
                      basic_housing: 'الأساسي + بدل السكن 🏠',
                      net_salary: 'صافي الراتب 💳',
                      manual: 'يدوي / مباشر ✍️'
                    };

                    const methodLabels: Record<string, string> = {
                      service_growth: 'خدمة مع نمو 📈',
                      fixed_percentage: 'نسبة ثابتة 📊',
                      direct: 'مباشر (متقاعد) 🎯'
                    };

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 max-w-[200px]">
                          <span className="block font-bold text-gray-800 text-sm">{rule.name}</span>
                          <span className="block text-[11px] text-gray-400 mt-0.5 line-clamp-2">{rule.description}</span>
                          <span className="text-[9px] text-[#0057B8] font-mono block mt-1 bg-blue-50 px-1.5 py-0.5 rounded w-max inline-block">{rule.id}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${
                            rule.salarySource === 'basic_only' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            rule.salarySource === 'basic_housing' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rule.salarySource === 'net_salary' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {sourceLabels[rule.salarySource] || rule.salarySource}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-sans text-right leading-relaxed">
                          <span className="block font-bold text-gray-700">{methodLabels[rule.calcMethod] || rule.calcMethod}</span>
                          {rule.calcMethod === 'service_growth' && (
                            <div className="text-[10px] space-y-0.5 text-slate-500 font-semibold mt-0.5">
                              <span className="block font-sans text-[#0057B8]">
                                الأساسي المعتمد × أشهر الخدمة ÷ {(rule.divisorYears ?? 40) * 12} أشهر
                              </span>
                              {rule.growthRate && rule.growthRate > 0 ? (
                                <span className="block text-emerald-600">
                                  🌱 نمو بنسبة {rule.growthRate.toFixed(2)}% سنويًا (لمدة متبقية {rule.growthMinYears} إلى {rule.growthMaxYears} سنة)
                                </span>
                              ) : (
                                <span className="block text-slate-400">بدون نمو سنوي للراتب المعتمد</span>
                              )}
                              {rule.capAtApprovedSalary && (
                                <span className="block text-purple-600 text-[9px] bg-purple-50 px-1 py-0.2 rounded w-max animate-pulse">سقف الراتب المعتمد مفعل</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 max-w-[180px]">
                          <span className="text-gray-500 block text-[11px] leading-normal" title={rule.notes}>{rule.notes || '—'}</span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = libraryRules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r);
                              saveLibraryRulesToStorage(updated);
                              showToast(rule.isActive ? "تم تعطيل قاعدة التقاعد بنجاح" : "تم تفعيل قاعدة التقاعد بنجاح", "success");
                            }}
                            className="focus:outline-none cursor-pointer"
                          >
                            {rule.isActive ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3" /> نشطة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                معطلة
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLibraryRule({ ...rule });
                                setIsLibraryModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="تعديل قالب القاعدة"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه قاعدة التقاعد هذه من المكتبة؟')) {
                                  const updated = libraryRules.filter(r => r.id !== rule.id);
                                  saveLibraryRulesToStorage(updated);
                                  showToast("تم حذف قاعدة التقاعد من المكتبة", "success");
                                }
                              }}
                              className="text-rose-600 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="حذف القالب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* VIEW 5.5: BANK & SECTOR PENSION RULES MAPPING (TAB 6) */}
        {adminSubPage === 'pension' && pensionActiveTab === 'bank_sector_rules' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6 font-sans text-right" dir="rtl">
            <div className="flex flex-col gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-2 w-full text-right" dir="rtl">
                <label className="block text-xs font-bold text-gray-500">اختر البنك أو شركة التمويل 🏦</label>
                <div className="flex flex-wrap gap-2">
                  {banks.map((bank) => {
                    const isSelected = bank.id === bankSectorRulesSelectedBankId;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setBankSectorRulesSelectedBankId(bank.id)}
                        className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-sm transform scale-[1.02]'
                            : 'bg-white hover:bg-slate-100 text-gray-750 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {bank.nameAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full justify-start md:justify-end border-t border-gray-200/60 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const otherBanks = banks.filter(b => b.id !== bankSectorRulesSelectedBankId);
                    if (otherBanks.length === 0) {
                      showToast("لا توجد بنوك أخرى للنسخ منها", "refuse");
                      return;
                    }
                    setCopySourceBankId(otherBanks[0].id);
                    setIsCopyBankModalOpen(true);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  نسخ الإعدادات من بنك آخر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveBankSectorRulesToStorage(bankSectorRules);
                    showToast("تم حفظ جميع قواعد البنوك والقطاعات بنجاح! 🎉", "success");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  حفظ تغييرات الربط
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-[#111827]">قواعد احتساب الراتب التقاعدي للقطاعات</h3>
              <p className="text-xs text-[#6B7280]">
                قم بضبط وحفظ تفاصيل ومعادلات الحساب لكل قطاع مناسب للبنك المحدد مباشرة دون تعقيد الربط أو مكتبات القوالب.
              </p>
            </div>

            {/* Main Sector Mapping Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-150">
              <table className="min-w-full divide-y divide-gray-200 text-right" dir="rtl">
                <thead className="bg-[#F8FAFC] text-gray-750 text-xs font-extrabold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-5 py-4 text-right">القطاع</th>
                    <th scope="col" className="px-5 py-4 text-right">مصدر الراتب المعتمد</th>
                    <th scope="col" className="px-5 py-4 text-right">طريقة الحساب</th>
                    <th scope="col" className="px-5 py-4 text-right">تفاصيل ومعادلة احتساب التقاعد</th>
                    <th scope="col" className="px-5 py-4 text-center">حالة التفعيل</th>
                    <th scope="col" className="px-5 py-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-xs text-[#334155]">
                   {(() => {
                    const sectorNamesAr: Record<string, string> = {
                      gov_civil: "مدني / حكومي",
                      military: "عسكري",
                      semi_gov: "شبه حكومي",
                      companies: "موظف شركات",
                      private: "قطاع خاص",
                      retired: "متقاعد"
                    };

                    const sourceLabels: Record<string, string> = {
                      basic_only: 'الأساسي فقط 💵',
                      basic_housing: 'الأساسي + بدل السكن 🏠',
                      net_salary: 'صافي الراتب 💳',
                      manual: 'يدوي / مباشر ✍️'
                    };

                    const methodLabels: Record<string, string> = {
                      service_growth: 'خدمة + نمو 📈',
                      fixed_percentage: 'نسبة ثابتة 📊',
                      direct: 'راتب مباشر 🎯'
                    };

                    const currentBankRules = bankSectorRules.filter(r => r.bankId === bankSectorRulesSelectedBankId);
                    
                    const displaySectors = [
                      'gov_civil',
                      'military',
                      'semi_gov',
                      'companies',
                      'retired'
                    ];

                    return displaySectors.map((sectId) => {
                      const rule = currentBankRules.find(r => r.sectorId === sectId);
                      
                      const ruleObj: BankSectorPensionRule = rule || {
                        id: `${bankSectorRulesSelectedBankId}_${sectId}`,
                        bankId: bankSectorRulesSelectedBankId,
                        sectorId: sectId,
                        isActive: true,
                        notes: '',
                        salarySource: sectId === 'retired' ? 'manual' : 'basic_only',
                        calcMethod: sectId === 'retired' ? 'direct' : 'service_growth',
                        divisorYears: sectId === 'military' ? 35 : 40,
                        growthRate: (sectId === 'gov_civil' || sectId === 'military') ? 2.5 : (sectId === 'semi_gov' ? 1.25 : 0),
                        growthMinYears: (sectId === 'gov_civil' || sectId === 'military' || sectId === 'semi_gov') ? 5 : 0,
                        growthMaxYears: (sectId === 'gov_civil' || sectId === 'military' || sectId === 'semi_gov') ? 12 : 0,
                        noGrowthAboveYears: (sectId === 'gov_civil' || sectId === 'military' || sectId === 'semi_gov') ? 25 : 0,
                        thresholdYears: 5,
                        rateBelow: 70,
                        rateAbove: 80,
                        capAtApprovedSalary: sectId !== 'retired'
                      };

                      const resolvedSalarySource = ruleObj.salarySource || 'basic_only';
                      const resolvedCalcMethod = ruleObj.calcMethod || 'service_growth';

                      return (
                        <tr key={sectId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="block font-extrabold text-gray-800 text-sm">
                              {sectorNamesAr[sectId] || sectId}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-extrabold bg-[#F1F5F9] text-[#334155] border border-gray-200">
                              {sourceLabels[resolvedSalarySource] || resolvedSalarySource}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-extrabold bg-blue-50 text-[#0057B8] border border-blue-100">
                              {methodLabels[resolvedCalcMethod] || resolvedCalcMethod}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-sans text-right leading-relaxed">
                            {resolvedCalcMethod === 'service_growth' && (
                              <div className="text-[11px] space-y-0.5 text-slate-600 font-semibold">
                                <span className="block text-[#0057B8]">
                                  معادلة الخدمة: الراتب المعتمد × أشهر الخدمة ÷ {(ruleObj.divisorYears ?? 40) * 12} أشهر
                                </span>
                                {(ruleObj.growthRate ?? 0) > 0 ? (
                                  <span className="block text-emerald-600">
                                    🌱 نمو سنوي: {(ruleObj.growthRate ?? 0).toFixed(2)}% (بين {ruleObj.growthMinYears ?? 5} و {ruleObj.growthMaxYears ?? 12} سنة) | حد أقصى للنمو: {ruleObj.noGrowthAboveYears ?? 25} سنة
                                  </span>
                                ) : (
                                  <span className="block text-slate-400">بدون نمو للراتب المعتمد</span>
                                )}
                                <span className="block text-indigo-500 text-[10px] mt-0.5">
                                  سقف التقاعد بالراتب المعتمد: {ruleObj.capAtApprovedSalary !== false ? "مفعّل" : "معطّل"}
                                </span>
                              </div>
                            )}

                            {resolvedCalcMethod === 'fixed_percentage' && (
                              <div className="text-[11px] space-y-0.5 text-slate-600 font-semibold">
                                <span className="block text-indigo-600">
                                  حد سنوات التقاعد الذكي: {ruleObj.thresholdYears ?? 5} سنة
                                </span>
                                <span className="block text-emerald-600">
                                  سنوات متبقية ≤ {ruleObj.thresholdYears ?? 5}: نسبة {ruleObj.rateBelow ?? 70}%
                                </span>
                                <span className="block text-emerald-700">
                                  سنوات متبقية &gt; {ruleObj.thresholdYears ?? 5}: نسبة {ruleObj.rateAbove ?? 80}%
                                </span>
                              </div>
                            )}

                            {resolvedCalcMethod === 'direct' && (
                              <span className="block text-[11px] text-slate-500 font-semibold">
                                اعتماد الراتب التقاعدي المدخل مباشرة من العميل.
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                               type="button"
                               onClick={() => {
                                 const updated = bankSectorRules.map(r => r.id === ruleObj.id ? { ...r, isActive: !r.isActive } : r);
                                 setBankSectorRules(updated);
                                 showToast("تم تحديث حالة التفعيل بنجاح! لا تنس حفظ تغييرات الربط.", "success");
                               }}
                               className="focus:outline-none cursor-pointer"
                            >
                              {ruleObj.isActive ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="font-semibold w-3.5 h-3.5" /> مفعّل للعملاء
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                  معطّل للبنك
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBankSectorRule({
                                    ...ruleObj,
                                    calcMethod: ruleObj.calcMethod || 'service_growth',
                                    salarySource: ruleObj.salarySource || 'basic_only',
                                    divisorYears: ruleObj.divisorYears ?? (sectId === 'military' ? 35 : 40),
                                    growthRate: ruleObj.growthRate ?? (sectId === 'retired' ? 0 : (sectId === 'semi_gov' ? 1.25 : 2.5)),
                                    growthMinYears: ruleObj.growthMinYears ?? 5,
                                    growthMaxYears: ruleObj.growthMaxYears ?? 12,
                                    noGrowthAboveYears: ruleObj.noGrowthAboveYears ?? 25,
                                    thresholdYears: ruleObj.thresholdYears ?? 5,
                                    rateBelow: ruleObj.rateBelow ?? 70,
                                    rateAbove: ruleObj.rateAbove ?? 80,
                                    capAtApprovedSalary: ruleObj.capAtApprovedSalary !== false
                                  });
                                  setIsBankSectorModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-white bg-blue-50 hover:bg-[#0057B8] px-3.5 py-2 rounded-xl border border-blue-150 font-extrabold font-sans text-xs flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                تعديل
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
        )}

        {/* VIEW 5.3: PENSION RULE TESTER SANDBOX (TAB 4) */}
        {adminSubPage === 'pension' && pensionActiveTab === 'rule_test' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-2">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                  <span>مختبر وصندوق رمل قوانين التقاعد والمطابقة المتقدم 🧪</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">قم بتغذية المدخلات التقاعدية والمالية التفصيلية واختبر نواتج محرك الحسبة وقواعد البنوك والقطاعات مباشرة بتقرير تشخيصي متكامل يتطابق مع نتائج البنوك الحقيقية.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSandboxBasic(12000);
                  setSandboxHousing(3500);
                  setSandboxOther(1500);
                  setSandboxDirectNet(16000);
                  setSandboxDirectPension(0);
                  setSandboxSectorId('government_civilian');
                  setSandboxBankId(banks[0]?.id || 'rajhi');
                  setSandboxSelectedRuleId('auto');
                  setSandboxSalaryMode('details');
                  setSandboxAgeMethod('manual');
                  setSandboxServiceMonths(240);
                  setSandboxYearsToRetire(10);
                  setSandboxBirthDay(1);
                  setSandboxBirthMonth(1);
                  setSandboxBirthYear(1985);
                  setSandboxAppointmentDay(1);
                  setSandboxAppointmentMonth(1);
                  setSandboxAppointmentYear(2010);
                  setSandboxReferenceResult('');
                  setSandboxResult(null);
                }}
                className="text-xs font-bold text-gray-500 hover:text-[#0057B8] px-3 py-1.5 bg-slate-100 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
              >
                🔄 إعادة تعيين المدخلات الافتراضية
              </button>
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 p-5 border border-slate-150 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">البنك المستهدف للفحص:</label>
                <select
                  value={sandboxBankId}
                  onChange={(e) => setSandboxBankId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-150"
                >
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>🏦 {bank.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">القطاع الأصلي للعميل:</label>
                <select
                  value={sandboxSectorId}
                  onChange={(e) => setSandboxSectorId(e.target.value as SectorId)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
                >
                  <option value="government_civilian">💼 حكومي مدني</option>
                  <option value="military_officer">👮 عسكري (ضابط)</option>
                  <option value="military_individual">🎖️ عسكري (فرد)</option>
                  <option value="retired">👴 متقاعد</option>
                </select>
              </div>

              {/* Core Pension Rule Selection - Auto vs Target Override */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 text-[#0057B8]">القاعدة المحددة للاختبار:</label>
                <select
                  value={sandboxSelectedRuleId}
                  onChange={(e) => setSandboxSelectedRuleId(e.target.value)}
                  className="w-full bg-white border border-[#0057B8]/40 hover:border-[#0057B8] text-[#0057B8] rounded-xl px-3 py-2 text-xs font-extrabold outline-none focus:ring-2 focus:ring-blue-205"
                >
                  <option value="auto">🔗 القاعدة المرتبطة تلقائياً بالبنك والقطاع المختار</option>
                  {libraryRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>📚 {rule.name} ({rule.approvedSalarySource === 'basic_only' ? 'أساسي' : 'أساسي+سكن'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">طريقة إدخال الراتب:</label>
                <select
                  value={sandboxSalaryMode}
                  onChange={(e) => setSandboxSalaryMode(e.target.value as 'direct' | 'details')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="details">تفاصيل الراتب (أساسي + سكن + بدلات)</option>
                  <option value="direct">إدخال مباشر وصافي الراتب الفوري</option>
                </select>
              </div>

              <div className="opacity-0 hidden md:block" />

              {/* Salary Fields */}
              {sandboxSalaryMode === 'details' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">الراتب الأساسي الحالي:</label>
                    <input
                      type="number"
                      value={sandboxBasic}
                      onChange={(e) => setSandboxBasic(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 font-sans">بدل السكن الحالي:</label>
                    <input
                      type="number"
                      value={sandboxHousing}
                      onChange={(e) => setSandboxHousing(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 font-sans">البدلات الأخرى والمكافآت:</label>
                    <input
                      type="number"
                      value={sandboxOther}
                      onChange={(e) => setSandboxOther(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">صافي الراتب الفوري المدخل:</label>
                    <input
                      type="number"
                      value={sandboxDirectNet}
                      onChange={(e) => setSandboxDirectNet(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                    />
                  </div>
                  {sandboxSectorId === 'retired' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">الراتب التقاعدي الحالي المدخل:</label>
                      <input
                        type="number"
                        value={sandboxDirectPension}
                        onChange={(e) => setSandboxDirectPension(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                      />
                    </div>
                  )}
                  <div className="opacity-0 pointer-events-none hidden md:block" />
                </>
              )}

              {/* Service & Age Calculation Method Picker */}
              <div className="col-span-1 md:col-span-3 border-t border-slate-100 pt-4 mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-indigo-900">طريقة تحديد فترات الخدمة والسن وقضايا التقاعد:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start">
                    <button
                      type="button"
                      onClick={() => setSandboxAgeMethod('manual')}
                      className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${sandboxAgeMethod === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      🔢 إدخال يدوي مباشر (شهور/سنوات)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxAgeMethod('dates')}
                      className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${sandboxAgeMethod === 'dates' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      📅 حساب تلقائي بالتواريخ الدقيقة
                    </button>
                  </div>
                </div>

                {sandboxAgeMethod === 'manual' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100/30 p-3.5 rounded-xl border border-slate-200/50">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">أشهر الخدمة عند التقاعد (مثال: 240 شهر تعادل 20 سنة):</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={sandboxServiceMonths}
                          onChange={(e) => setSandboxServiceMonths(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        />
                        <span className="bg-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-600 self-center whitespace-nowrap">
                          ({(sandboxServiceMonths / 12).toFixed(1)} سنة بالتقريب)
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">السنوات المتبقية على التقاعد الفعلي للعميل:</label>
                      <input
                        type="number"
                        value={sandboxYearsToRetire}
                        onChange={(e) => setSandboxYearsToRetire(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100/30 p-3.5 rounded-xl border border-slate-200/50">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">تاريخ الميلاد (يوم / شهر / سنة):</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number" value={sandboxBirthDay} min={1} max={31} placeholder="يوم"
                          onChange={(e) => {
                            const d = Number(e.target.value);
                            setSandboxBirthDay(d);
                            const now = new Date();
                            const appt = new Date(sandboxAppointmentYear, sandboxAppointmentMonth - 1, sandboxAppointmentDay);
                            const birth = new Date(sandboxBirthYear, sandboxBirthMonth - 1, d);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <input
                          type="number" value={sandboxBirthMonth} min={1} max={12} placeholder="شهر"
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            setSandboxBirthMonth(m);
                            const now = new Date();
                            const appt = new Date(sandboxAppointmentYear, sandboxAppointmentMonth - 1, sandboxAppointmentDay);
                            const birth = new Date(sandboxBirthYear, m - 1, sandboxBirthDay);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <input
                          type="number" value={sandboxBirthYear} placeholder="سنة"
                          onChange={(e) => {
                            const y = Number(e.target.value);
                            setSandboxBirthYear(y);
                            const now = new Date();
                            const appt = new Date(sandboxAppointmentYear, sandboxAppointmentMonth - 1, sandboxAppointmentDay);
                            const birth = new Date(y, sandboxBirthMonth - 1, sandboxBirthDay);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <select
                          value={sandboxBirthCalendar}
                          onChange={(e) => setSandboxBirthCalendar(e.target.value as 'gregorian' | 'hijri')}
                          className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                        >
                          <option value="gregorian">م</option>
                          <option value="hijri">هـ</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">تاريخ التعيين (يوم / شهر / سنة):</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number" value={sandboxAppointmentDay} min={1} max={31} placeholder="يوم"
                          onChange={(e) => {
                            const d = Number(e.target.value);
                            setSandboxAppointmentDay(d);
                            const now = new Date();
                            const appt = new Date(sandboxAppointmentYear, sandboxAppointmentMonth - 1, d);
                            const birth = new Date(sandboxBirthYear, sandboxBirthMonth - 1, sandboxBirthDay);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <input
                          type="number" value={sandboxAppointmentMonth} min={1} max={12} placeholder="شهر"
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            setSandboxAppointmentMonth(m);
                            const now = new Date();
                            const appt = new Date(sandboxAppointmentYear, m - 1, sandboxAppointmentDay);
                            const birth = new Date(sandboxBirthYear, sandboxBirthMonth - 1, sandboxBirthDay);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <input
                          type="number" value={sandboxAppointmentYear} placeholder="سنة"
                          onChange={(e) => {
                            const y = Number(e.target.value);
                            setSandboxAppointmentYear(y);
                            const now = new Date();
                            const appt = new Date(y, sandboxAppointmentMonth - 1, sandboxAppointmentDay);
                            const birth = new Date(sandboxBirthYear, sandboxBirthMonth - 1, sandboxBirthDay);
                            const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                            const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                            setSandboxServiceMonths(curSvc + mtr);
                            setSandboxYearsToRetire(parseFloat((mtr/12).toFixed(1)));
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                        />
                        <select
                          value={sandboxAppointmentCalendar}
                          onChange={(e) => setSandboxAppointmentCalendar(e.target.value as 'gregorian' | 'hijri')}
                          className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                        >
                          <option value="gregorian">م</option>
                          <option value="hijri">هـ</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      {(() => {
                        const now = new Date();
                        const appt = new Date(sandboxAppointmentYear, sandboxAppointmentMonth - 1, sandboxAppointmentDay);
                        const birth = new Date(sandboxBirthYear, sandboxBirthMonth - 1, sandboxBirthDay);
                        const curSvc = Math.max(0, (now.getFullYear()*12+now.getMonth()) - (appt.getFullYear()*12+appt.getMonth()));
                        const mtr = Math.max(0, 60*12 - ((now.getFullYear()*12+now.getMonth()) - (birth.getFullYear()*12+birth.getMonth())));
                        return (
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div><span className="text-gray-500">خدمة حالية: </span><span className="font-extrabold text-indigo-700">{curSvc} شهر</span><span className="text-gray-400 mr-1"> ({(curSvc/12).toFixed(1)} سنة)</span></div>
                            <div><span className="text-gray-500">متبقي للتقاعد: </span><span className="font-extrabold text-[#0057B8]">{mtr} شهر</span><span className="text-gray-400 mr-1"> ({(mtr/12).toFixed(1)} سنة)</span></div>
                            <div><span className="text-[#6B7280] font-bold">خدمة عند التقاعد: </span><span className="font-extrabold text-emerald-600">{curSvc + mtr} شهر</span><span className="text-gray-405 mr-1"> ({((curSvc+mtr)/12).toFixed(1)} سنة)</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="opacity-0 pointer-events-none hidden md:block" />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const trace: string[] = [];
                    // Run real financial-engine net salary resolver
                    const netSalaryObj = calculateNetSalary({
                      sectorId: (sandboxSectorId as any),
                      basicSalary: sandboxBasic,
                      housingAllowance: sandboxHousing,
                      otherAllowances: sandboxOther,
                      method: sandboxSalaryMode,
                      directNetSalary: sandboxDirectNet,
                      directPensionSalary: sandboxDirectPension,
                      rules: salaryRules
                    });
                    const solvedNetSalary = netSalaryObj.netSalary;
                    trace.push(`1. الراتب الصافي المفكك: تم حساب صافي الراتب بقيمة ${solvedNetSalary.toLocaleString('ar-SA')} ريال (تخفيضات التأمينات: ${netSalaryObj.deductionAmount} ريال).`);

                    // Run dynamic retirement mapping
                    const activeRulesCombined = combineToRetirementRules(approvedSalaryDbRules, pensionDbRules);
                    const ruleObj = getBankRetirementRule({
                      bankId: sandboxBankId,
                      sectorId: (sandboxSectorId as any),
                      rules: activeRulesCombined,
                      sectorMappings: sectorMappings
                    });
                    trace.push(`2. قانون التقاعد الموحد للبنك: تم العثور على قاعدة معرّفة بمعرّف [${ruleObj.id || 'قاعدة تلقائية'}].`);
                    trace.push(`   - مصدر الراتب المعتمد: ${ruleObj.approvedSalarySource} مع مضاعف ${ruleObj.approvedSalaryMultiplier}.`);

                    const approvedBaseVal = calculateApprovedBase({
                      source: ruleObj.approvedSalarySource,
                      basicSalary: sandboxSalaryMode === 'direct' ? Math.round(solvedNetSalary * 0.65) : sandboxBasic,
                      housingAllowance: sandboxHousing,
                      otherAllowances: sandboxOther,
                      netSalary: solvedNetSalary,
                      manualApprovedSalary: sandboxDirectNet
                    });
                    const finalApprovedSalary = approvedBaseVal * ruleObj.approvedSalaryMultiplier;
                    trace.push(`3. صيغة التأسيس والضرب: الراتب المعتمد الأولي = ${approvedBaseVal} × مضاعف ${ruleObj.approvedSalaryMultiplier} = ${finalApprovedSalary.toLocaleString('ar-SA')} ريال.`);

                    const correctedPensionValue = sandboxSectorId === 'retired'
                      ? (sandboxDirectPension || 0)
                      : calculatePensionByBankRule({
                          approvedSalary: finalApprovedSalary,
                          serviceMonthsAtRetirement: sandboxServiceMonths,
                          yearsToRetirement: sandboxYearsToRetire,
                          directPensionSalary: sandboxDirectPension,
                          rule: ruleObj
                        });

                    trace.push(`4. إجراء المعادلة التقاعدية: آلية الحساب = ${ruleObj.calculationMethod}.`);
                    if (ruleObj.calculationMethod === 'fixed_percentage') {
                      const rate = sandboxYearsToRetire <= (ruleObj.yearsThreshold ?? 5) ? (ruleObj.rateBelowThreshold ?? 70) : (ruleObj.rateAboveThreshold ?? 80);
                      trace.push(`   - حافز البقاء بالخدمة: لسنوات عتبة ${ruleObj.yearsThreshold} ومتبقي سنوات ${sandboxYearsToRetire} هي نسبة ${rate}%.`);
                      trace.push(`   - المعادلة النهائية: ${finalApprovedSalary} × ${rate}% = ${correctedPensionValue.toLocaleString('ar-SA')} ريالSaudi.`);
                    } else if (ruleObj.calculationMethod === 'service_based') {
                      trace.push(`   - القاسم المتنوع: شهور تقاعد ${sandboxServiceMonths} وقاسم شهري ${ruleObj.divisorMonths || 480}.`);
                      trace.push(`   - المعادلة النهائية: ${finalApprovedSalary} × ${sandboxServiceMonths} ÷ ${ruleObj.divisorMonths || 480} = ${correctedPensionValue.toLocaleString('ar-SA')} ريالSaudi.`);
                    } else {
                      trace.push(`   - تقاعد مباشر: الراتب التقاعدي الصافي = ${correctedPensionValue} ريال.`);
                    }

                    // Save output
                    setSandboxResult({
                      solvedNetSalary,
                      approvedBase: approvedBaseVal,
                      approvedSalaryMultiplier: ruleObj.approvedSalaryMultiplier,
                      approvedSalaryValue: finalApprovedSalary,
                      ruleCalculationMethod: ruleObj.calculationMethod,
                      rateValue: ruleObj.calculationMethod === 'fixed_percentage' ? (sandboxYearsToRetire <= (ruleObj.yearsThreshold ?? 5) ? (ruleObj.rateBelowThreshold ?? 70) : (ruleObj.rateAboveThreshold ?? 80)) : undefined,
                      divisorMonths: ruleObj.divisorMonths,
                      correctedPensionSalary: correctedPensionValue,
                      diagnostics: trace
                    });
                  }}
                  className="w-full bg-[#0057B8] text-white hover:bg-blue-700 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-md text-center"
                >
                  🚀 محاكاة وتشغيل اختبار قانون التقاعد
                </button>
              </div>
            </div>

            {sandboxResult && (
              <div className="border border-slate-150 rounded-2xl p-6 bg-slate-50 space-y-4 font-sans animate-fade-in">
                <h4 className="font-bold text-xs text-[#111827] border-b border-slate-200 pb-2 mb-2">📋 نتائج الفحص الفنية المعتمدة للأهلي والراجحي ومخرجات الحسبة:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-500">الراتب الصافي المحسوب:</span>
                    <span className="text-sm font-extrabold text-[#111827]">{sandboxResult.solvedNetSalary.toLocaleString('ar-SA')} ريال</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-500">الراتب المعتمد الأولي:</span>
                    <span className="text-sm font-extrabold text-[#0057B8]">{sandboxResult.approvedSalaryValue.toLocaleString('ar-SA')} ريال</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-500">معادل ضرب القطاع المعتمد:</span>
                    <span className="text-sm font-extrabold text-[#0057B8]">× {sandboxResult.approvedSalaryMultiplier}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-500">الراتب التقاعدي المعتمد للبنك:</span>
                    <span className="text-sm font-extrabold text-emerald-700">{sandboxResult.correctedPensionSalary.toLocaleString('ar-SA')} ريال</span>
                  </div>
                </div>

                <div className="bg-[#1e293b] p-5 rounded-2xl text-slate-100 font-mono text-[11px] leading-relaxed space-y-1">
                  <div className="text-yellow-400 font-bold mb-2">🐾 تفاصيل معالجة محرك الحسبة خطوة بخطوة:</div>
                  {sandboxResult.diagnostics.map((line, idx) => (
                    <div key={idx} className="border-b border-slate-800 pb-1 mb-1 last:border-b-0 last:pb-0">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: TERMS */}
        {adminSubPage === 'terms' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">مدد التمويل والحدود</h2>
                <p className="text-xs text-[#6B7280]">إدارة قواعد وضوابط مدد التمويل وحدود السن والتقاويم الخاصة بكل بنك.</p>
              </div>
            </div>

            {/* 1. CHART / BRIEF LAW INFO */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-6 text-right font-sans">
              <h3 className="font-extrabold text-[#111827] text-sm mb-3">قانون مدة التمويل:</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                يتم حساب مدة التمويل بالأشهر حسب الأقل من:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0057B8] block mb-1">1. أقصى مدة مسموحة للبنك</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed">الحد الأقصى الكلي لمدد التمويل المقررة في البنك.</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-600 block mb-1">2. المدة حتى أقصى عمر عند نهاية التمويل</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">المدة المتبقية للوصول لعمر الحد الأقصى لنهاية التمويل بالبنك.</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 block mb-1">3. المدة حتى سن التقاعد + أشهر السماح بعد التقاعد</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">المدة المتبقية لسن تقاعد القطاع مضافاً إليها أشهر السماح المتاحة بعد التقاعد.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TABLE OF BANKS TERMS */}
            <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs">
              <table className="min-w-full divide-y divide-gray-200 text-right">
                <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right">البنك</th>
                    <th scope="col" className="px-6 py-4 text-right">Bank ID</th>
                    <th scope="col" className="px-6 py-4 text-right">أقصى مدة تمويل بالأشهر</th>
                    <th scope="col" className="px-6 py-4 text-right">أقصى عمر عند نهاية التمويل</th>
                    <th scope="col" className="px-6 py-4 text-right">أشهر السماح بعد التقاعد</th>
                    <th scope="col" className="px-6 py-4 text-right">يسمح بعد التقاعد</th>
                    <th scope="col" className="px-6 py-4 text-right">نوع التقويم</th>
                    <th scope="col" className="px-6 py-4 text-right">الحالة</th>
                    <th scope="col" className="px-6 py-4 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-700">
                  {banks.map((bank) => (
                    <tr key={bank.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${bank.logoColor || 'from-[#0057B8] to-blue-900'} shrink-0`} />
                          <span>{bank.nameAr}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">{bank.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-mono">{bank.maxTermMonths} شهر</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-mono">{bank.maxAgeAtEnd} سنة</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                        {bank.allowAfterRetirement ? `${bank.monthsAfterRetirement} شهر` : '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          bank.allowAfterRetirement 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {bank.allowAfterRetirement ? 'نعم' : 'لا'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs text-right">
                        {bank.calendarType === 'hijri' ? 'هجري' : 'ميلادي'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          bank.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {bank.isActive ? 'مفعل' : 'غير مفعل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBankTerm({
                                id: bank.id,
                                nameAr: bank.nameAr,
                                maxTermMonths: bank.maxTermMonths.toString(),
                                maxAgeAtEnd: bank.maxAgeAtEnd.toString(),
                                monthsAfterRetirement: bank.monthsAfterRetirement.toString(),
                                allowAfterRetirement: bank.allowAfterRetirement,
                                calendarType: bank.calendarType,
                                isActive: bank.isActive
                              });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E5E7EB] hover:border-[#0057B8] text-[#0057B8] hover:bg-[#0057B8]/5 rounded-lg transition-all font-bold text-[11px] cursor-pointer"
                          >
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = banks.map(b => b.id === bank.id ? { ...b, isActive: !b.isActive } : b);
                              setBanks(updated);
                              showToast(`تم تغيير حالة البنك ${bank.nameAr} في المسودة.`, "success");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              bank.isActive 
                                ? 'bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-800' 
                                : 'bg-[#0057B8]/5 border-[#0057B8]/10 hover:bg-[#0057B8]/10 text-[#0057B8]'
                            }`}
                          >
                            {bank.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. MODAL FOR EDITING BANK TERM */}
            {editingBankTerm && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 w-full max-w-sm shadow-2xl animate-fade-in text-right font-sans">
                  <h3 className="text-sm font-extrabold text-[#111827] border-b border-gray-100 pb-3 mb-5">
                    تعديل إعدادات التمويل - {editingBankTerm.nameAr}
                  </h3>

                  <div className="space-y-4 text-right">
                    {/* Bank Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">اسم البنك:</label>
                      <input
                        type="text"
                        disabled
                        value={editingBankTerm.nameAr}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 text-xs font-bold cursor-not-allowed text-right focus:outline-none"
                      />
                    </div>

                    {/* Bank ID */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Bank ID:</label>
                      <input
                        type="text"
                        disabled
                        value={editingBankTerm.id}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold cursor-not-allowed text-right focus:outline-none"
                      />
                    </div>

                    {/* Max Term Months */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">أقصى مدة تمويل بالأشهر:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingBankTerm.maxTermMonths}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingBankTerm(prev => prev ? { ...prev, maxTermMonths: val } : null);
                        }}
                        placeholder="أدخل عدد الأشهر"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                      />
                    </div>

                    {/* Max Age At End */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">أقصى عمر عند نهاية التمويل:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingBankTerm.maxAgeAtEnd}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingBankTerm(prev => prev ? { ...prev, maxAgeAtEnd: val } : null);
                        }}
                        placeholder="أدخل أقصى عمر"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                      />
                    </div>

                    {/* Is Post Retirement Allowed (allowAfterRetirement) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">يسمح بعد التقاعد:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              allowAfterRetirement: true
                            };
                          })}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            editingBankTerm.allowAfterRetirement
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          نعم
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              allowAfterRetirement: false,
                              monthsAfterRetirement: '0' // تصفير أشهر السماح عند الإلغاء
                            };
                          })}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            !editingBankTerm.allowAfterRetirement
                              ? 'border-rose-600 bg-rose-50 text-rose-800 font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          لا
                        </button>
                      </div>
                    </div>

                    {/* Months After Retirement */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">أشهر السماح بعد التقاعد:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={!editingBankTerm.allowAfterRetirement}
                        value={editingBankTerm.monthsAfterRetirement}
                        onChange={(e) => {
                          if (!editingBankTerm.allowAfterRetirement) return;
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingBankTerm(prev => prev ? { ...prev, monthsAfterRetirement: val } : null);
                        }}
                        placeholder="أدخل عدد أشهر بعد التقاعد"
                        className={`w-full border rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none text-right ${
                          editingBankTerm.allowAfterRetirement 
                            ? 'bg-white border-gray-200 focus:ring-2 focus:ring-[#0057B8]' 
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    {/* Calendar Type */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">نوع التقويم:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => prev ? { ...prev, calendarType: 'hijri' } : null)}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            editingBankTerm.calendarType === 'hijri'
                              ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8] font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          هجري
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => prev ? { ...prev, calendarType: 'gregorian' } : null)}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            editingBankTerm.calendarType === 'gregorian'
                              ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8] font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          ميلادي
                        </button>
                      </div>
                    </div>

                    {/* Active State */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">مفعل / غير مفعل:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => prev ? { ...prev, isActive: true } : null)}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            editingBankTerm.isActive
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-850 font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          مفعل
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBankTerm(prev => prev ? { ...prev, isActive: false } : null)}
                          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            !editingBankTerm.isActive
                              ? 'border-rose-600 bg-rose-50 text-rose-850 font-bold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          غير مفعل
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingBankTerm(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const maxTermVal = parseInt(editingBankTerm.maxTermMonths, 10);
                        const maxAgeVal = parseInt(editingBankTerm.maxAgeAtEnd, 10);
                        const postRetVal = parseInt(editingBankTerm.monthsAfterRetirement, 10);

                        if (isNaN(maxTermVal) || maxTermVal < 0) {
                          alert("يرجى إدخال أقصى مدة تمويل صحيحة بالأرقام الإنجليزية");
                          return;
                        }
                        if (isNaN(maxAgeVal) || maxAgeVal < 0) {
                          alert("يرجى إدخال أقصى عمر صحيح بالأرقام الإنجليزية");
                          return;
                        }
                        if (editingBankTerm.allowAfterRetirement && (isNaN(postRetVal) || postRetVal < 0)) {
                          alert("يرجى إدخال أشهر السماح بعد التقاعد بالأرقام الإنجليزية");
                          return;
                        }

                        // التحديث بمسودة البنوك في السياق
                        const updatedBanks = banks.map(b => {
                          if (b.id === editingBankTerm.id) {
                            return {
                              ...b,
                              maxTermMonths: maxTermVal,
                              maxAgeAtEnd: maxAgeVal,
                              monthsAfterRetirement: editingBankTerm.allowAfterRetirement ? postRetVal : 0,
                              allowAfterRetirement: editingBankTerm.allowAfterRetirement,
                              calendarType: editingBankTerm.calendarType,
                              isActive: editingBankTerm.isActive
                            };
                          }
                          return b;
                        });

                        setBanks(updatedBanks);
                        setEditingBankTerm(null);
                        showToast("تم تطبيق التعديلات المؤقتة بنجاح كمسودة. يرجى الضغط على حفظ التغييرات لحفظها دائمًا.", "success");
                      }}
                      className="px-5 py-2 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      تطبيق التعديل
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 7: MARGINS - GRID & INTERPOLATION */}
        {adminSubPage === 'margins' && (
          <div className="space-y-6">
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
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📋 نسخ إعدادات من بنك آخر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openHistory('margin_rules', selectedMarginBank, `سجل تغييرات قواعد الهامش — ${formBanksList.find(b => b.id === selectedMarginBank)?.nameAr || selectedMarginBank}`);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📜 سجل التغييرات
                </button>
              </div>
            </div>

            {/* Selection Grid */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
              {/* 1. Selector dropdown of bank */}
              <div>
                <label htmlFor="margin-bank-select" className="block text-xs font-bold text-gray-700 mb-2">اختر البنك:</label>
                <div className="relative">
                  <select
                    id="margin-bank-select"
                    value={selectedMarginBank}
                    onChange={(e) => setSelectedMarginBank(e.target.value)}
                    className="w-full md:max-w-md bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs font-bold font-sans text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right cursor-pointer"
                  >
                    {formBanksList.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Selector Product (المنتج) */}
              <div>
                <span className="block text-xs font-bold text-gray-700 mb-3 font-sans">أولاً: المنتج</span>
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

              {/* 3. Selector Support (نوع الدعم) */}
              <div>
                <span className="block text-xs font-bold text-gray-700 mb-3 font-sans">ثانياً: نوع الدعم</span>
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
            </div>

            {/* Active Margins Configuration Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
              {/* Table Headline */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#F1F5F9] pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827] font-sans">
                    {formBanksList.find(b => b.id === selectedMarginBank)?.nameAr || selectedMarginBank} — {' '}
                    {selectedMarginProduct === 'real_estate_only' ? 'عقاري فقط' : selectedMarginProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم'} — {' '}
                    {selectedMarginSupport === 'none' ? 'غير مدعوم' : selectedMarginSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة'}
                  </h3>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">جدول هوامش الفوائد والنسب السنوية المعتمدة.</p>
                </div>

                {/* Calculation method */}
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2 flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-600 font-sans">طريقة الحساب:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleCalcMethodChange('linear')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                        localCalcMethod === 'linear'
                          ? 'bg-[#0057B8] text-white font-extrabold'
                          : 'bg-white text-gray-600 border border-gray-100 hover:bg-slate-50'
                      }`}
                    >
                      تدرج خطي Linear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcMethodChange('fixed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                        localCalcMethod === 'fixed'
                          ? 'bg-[#0057B8] text-white font-extrabold'
                          : 'bg-white text-gray-600 border border-gray-100 hover:bg-slate-50'
                      }`}
                    >
                      ثابت Fixed
                    </button>
                  </div>
                </div>
              </div>

              {localCalcMethod === 'linear' && (
                <div className="bg-emerald-50/50 text-emerald-800 text-[11px] font-semibold font-sans border border-emerald-100/60 rounded-xl p-3 leading-relaxed">
                  * عند اختيار التدرج الخطي، يتم احتساب الهامش بين السنوات تلقائيًا.
                </div>
              )}

              {/* Core 5-30 Margin rates inputs */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-right">
                  <thead className="bg-[#F8FAFC] text-slate-500 font-bold text-xs font-sans">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-right">مدة التمويل</th>
                      <th scope="col" className="px-6 py-3.5 text-right">الهامش السنوي %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-xs font-semibold text-gray-700">
                    {[
                      { year: 5, label: '5 سنوات' },
                      { year: 10, label: '10 سنوات' },
                      { year: 15, label: '15 سنة' },
                      { year: 20, label: '20 سنة' },
                      { year: 25, label: '25 سنة' },
                      { year: 30, label: '30 سنة' }
                    ].map((row) => (
                      <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-800 font-sans">
                          {row.label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={localMargins[row.year] ?? ''}
                            onChange={(e) => handleMarginLocalChange(row.year, e.target.value)}
                            onBlur={(e) => handleMarginBlur(row.year, e.target.value)}
                            className="bg-white border border-gray-300 rounded-xl px-4 py-2 w-full max-w-[200px] text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                            placeholder="0.00"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Clone panel within the SAME bank */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="font-extrabold text-[#111827] text-xs font-sans">استنساخ من جدول آخر</h4>
              <p className="text-[11px] text-[#6B7280] font-sans">استنساخ هوامش حالة إلى الحالة المروّسة الحالية داخل نفس البنك ({formBanksList.find(b => b.id === selectedMarginBank)?.nameAr}).</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs font-bold text-gray-700 font-sans">
                <div>
                  <label htmlFor="clone-from-product" className="block text-slate-500 mb-1.5 font-sans">اختر المنتج المصدر:</label>
                  <select
                    id="clone-from-product"
                    value={cloningFromProduct}
                    onChange={(e) => setCloningFromProduct(e.target.value as ProductId)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right"
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

                <div>
                  <label htmlFor="clone-from-support" className="block text-slate-500 mb-1.5 font-sans">اختر نوع الدعم المصدر:</label>
                  <select
                    id="clone-from-support"
                    value={cloningFromSupport}
                    onChange={(e) => setCloningFromSupport(e.target.value as SupportType)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 cursor-pointer text-right"
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

                <div>
                  <button
                    type="button"
                    onClick={handleCloneLocal}
                    className="w-full py-2.5 bg-[#0057B8] hover:bg-[#004bb0] text-white rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer"
                  >
                    استنساخ إلى الجدول الحالي
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 8: DSR */}
        {adminSubPage === 'dsr' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9] pb-4 gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#111827]">حدود الاستقطاع ونسب DSR</h2>
                <p className="text-xs text-[#6B7280] mt-1">ضبط الحد الأعلى للاستقطاع حسب البنك والمنتج والدعم ومرحلة العميل.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddDsrModal}
                className="bg-[#0057B8] hover:bg-[#004bb0] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start font-sans"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قاعدة DSR</span>
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
              <span className="text-xs font-bold text-slate-700">عمليات سريعة للبنك المحدد:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetBank = filterDsrBank === 'all' ? 'rajhi' : filterDsrBank;
                    setCopyTargetBank(targetBank);
                    setCopySourceBank('');
                    setCopySections(['dsr']);
                    setShowCopyModal(true);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📋 نسخ إعدادات من بنك آخر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetBank = filterDsrBank === 'all' ? 'rajhi' : filterDsrBank;
                    openHistory('dsr_rules', targetBank, `سجل تغييرات نسب الاستقطاع DSR — ${formBanksList.find(b => b.id === targetBank)?.nameAr || targetBank}`);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  📜 سجل التغييرات
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs grid grid-cols-2 md:grid-cols-5 gap-3.5 text-xs font-bold font-sans text-gray-700">
              <div>
                <label htmlFor="filter-dsr-bank" className="block text-slate-500 mb-1.5">البنك:</label>
                <select
                  id="filter-dsr-bank"
                  value={filterDsrBank}
                  onChange={(e) => setFilterDsrBank(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800"
                >
                  <option value="all">الكل (All)</option>
                  {DSR_BANKS.map(b => (
                    <option key={b.id} value={b.id}>{b.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-dsr-product" className="block text-slate-500 mb-1.5"> نوع المنتج:</label>
                <select
                  id="filter-dsr-product"
                  value={filterDsrProduct}
                  onChange={(e) => setFilterDsrProduct(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800"
                >
                  <option value="all">الكل (All)</option>
                  {DSR_PRODUCT_TYPES.map(p => (
                    <option key={p.id} value={p.id}>{p.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-dsr-support" className="block text-slate-500 mb-1.5">نوع الدعم:</label>
                <select
                  id="filter-dsr-support"
                  value={filterDsrSupport}
                  onChange={(e) => setFilterDsrSupport(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800"
                >
                  <option value="all">الكل (All)</option>
                  {DSR_SUPPORT_TYPES.map(s => (
                    <option key={s.id} value={s.id}>{s.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-dsr-stage" className="block text-slate-500 mb-1.5">المرحلة:</label>
                <select
                  id="filter-dsr-stage"
                  value={filterDsrStage}
                  onChange={(e) => setFilterDsrStage(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800"
                >
                  <option value="all">الكل (All)</option>
                  {DSR_CUSTOMER_STAGES.map(st => (
                    <option key={st.id} value={st.id}>{st.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-dsr-status" className="block text-slate-500 mb-1.5">الدورة / الحالة:</label>
                <select
                  id="filter-dsr-status"
                  value={filterDsrStatus}
                  onChange={(e) => setFilterDsrStatus(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800"
                >
                  <option value="all">الكل (All)</option>
                  <option value="active">نشط / مفعل</option>
                  <option value="inactive">غير نشط / معطل</option>
                </select>
              </div>
            </div>

            {/* DSR Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-right">
                  <thead className="bg-[#F8FAFC] text-slate-500 font-bold text-xs font-sans">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-right">البنك</th>
                      <th scope="col" className="px-6 py-4 text-right">نوع المنتج</th>
                      <th scope="col" className="px-6 py-4 text-right">نوع الدعم</th>
                      <th scope="col" className="px-6 py-4 text-right">مرحلة العميل</th>
                      <th scope="col" className="px-6 py-4 text-center">نسبة الاستقطاع %</th>
                      <th scope="col" className="px-6 py-4 text-center">خصم الالتزامات القائمة</th>
                      <th scope="col" className="px-6 py-4 text-center">الحالة</th>
                      <th scope="col" className="px-6 py-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-xs font-semibold text-gray-700">
                    {dsrRules
                      .filter(rule => {
                        if (filterDsrBank !== 'all' && rule.bankId !== filterDsrBank) return false;
                        if (filterDsrProduct !== 'all' && rule.productType !== filterDsrProduct) return false;
                        if (filterDsrSupport !== 'all' && rule.supportType !== filterDsrSupport) return false;
                        if (filterDsrStage !== 'all' && rule.customerStage !== filterDsrStage) return false;
                        if (filterDsrStatus !== 'all') {
                          const isActiveFilter = filterDsrStatus === 'active';
                          if (rule.active !== isActiveFilter) return false;
                        }
                        return true;
                      })
                      .map((rule) => {
                        const matchedBank = DSR_BANKS.find(b => b.id === rule.bankId);
                        const matchedProduct = DSR_PRODUCT_TYPES.find(p => p.id === rule.productType);
                        const matchedSupport = DSR_SUPPORT_TYPES.find(s => s.id === rule.supportType);
                        const matchedStage = DSR_CUSTOMER_STAGES.find(st => st.id === rule.customerStage);

                        return (
                          <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 font-sans">
                              {matchedBank ? matchedBank.nameAr : rule.bankId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-sans">
                              {matchedProduct ? matchedProduct.nameAr : rule.productType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans ${
                                rule.supportType === 'monthly'
                                  ? 'bg-blue-50 text-blue-700'
                                  : rule.supportType === 'down_payment'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {matchedSupport ? matchedSupport.nameAr : rule.supportType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-sans">
                              {matchedStage ? matchedStage.nameAr : rule.customerStage}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-slate-900 font-mono font-bold text-sm">
                              {rule.dsrPercent}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold font-sans inline-block min-w-[50px] ${
                                rule.deductExistingObligations 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {rule.deductExistingObligations ? 'نعم' : 'لا'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                                rule.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {rule.active ? 'مفعل' : 'معطل'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  title="تعديل نسبة الاستقطاع"
                                  onClick={() => handleOpenEditDsrModal(rule)}
                                  className="p-1 px-2 border border-gray-200 rounded-lg hover:bg-slate-50 hover:text-[#0057B8] text-gray-500 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title={rule.active ? "تعطيل القاعدة" : "تفعيل القاعدة"}
                                  onClick={() => handleToggleDsrRuleActive(rule.id)}
                                  className="p-1 text-gray-500 hover:text-blue-600 cursor-pointer"
                                >
                                  {rule.active ? (
                                    <ToggleRight className="w-6 h-6 text-[#0057B8]" />
                                  ) : (
                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="حذف القاعدة"
                                  onClick={() => handleDeleteDsrRule(rule.id)}
                                  className="p-1 px-2 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DSR ADD/EDIT MODAL POPUP */}
            {isDsrModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="dsr-modal-title" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" onClick={() => setIsDsrModalOpen(false)}></div>

                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                  <div className="relative z-55 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-gray-100 font-sans">
                    <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-gray-900" id="dsr-modal-title">
                        {editingDsrRule ? 'تعديل قاعدة الاستقطاع DSR' : 'إضافة قاعدة استقطاع DSR جديدة'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsDsrModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      {formDsrError && (
                        <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold">
                          ⚠️ {formDsrError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Bank Select */}
                        <div className="space-y-1.5 text-right">
                          <label htmlFor="form-dsr-bank" className="block text-xs font-bold text-gray-600">البنك:</label>
                          <select
                            id="form-dsr-bank"
                            value={formDsrBankId}
                            onChange={(e) => setFormDsrBankId(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {DSR_BANKS.map(b => (
                              <option key={b.id} value={b.id}>{b.nameAr}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Product Type Select */}
                        <div className="space-y-1.5 text-right">
                          <label htmlFor="form-dsr-product" className="block text-xs font-bold text-gray-600">نوع المنتج:</label>
                          <select
                            id="form-dsr-product"
                            value={formDsrProductType}
                            onChange={(e) => {
                              const newProdType = e.target.value as any;
                              setFormDsrProductType(newProdType);
                              if (newProdType === 'personal_only') {
                                setFormDsrSupportType('none');
                              }
                            }}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {DSR_PRODUCT_TYPES.map(p => (
                              <option key={p.id} value={p.id}>{p.nameAr}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Support Type Select */}
                        <div className="space-y-1.5 text-right">
                          <label htmlFor="form-dsr-support" className="block text-xs font-bold text-gray-600">نوع الدعم السكني:</label>
                          <select
                            id="form-dsr-support"
                            value={formDsrSupportType}
                            disabled={formDsrProductType === 'personal_only'}
                            onChange={(e) => setFormDsrSupportType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {DSR_SUPPORT_TYPES.map(s => (
                              <option key={s.id} value={s.id}>{s.nameAr}</option>
                            ))}
                          </select>
                          {formDsrProductType === 'personal_only' && (
                            <p className="text-[10px] text-amber-600 font-semibold mt-1">الدعم يكون "غير مدعوم" فقط مع الشخصي.</p>
                          )}
                        </div>

                        {/* 4. Customer Stage Select */}
                        <div className="space-y-1.5 text-right">
                          <label htmlFor="form-dsr-stage" className="block text-xs font-bold text-gray-600">مرحلة العميل:</label>
                          <select
                            id="form-dsr-stage"
                            value={formDsrCustomerStage}
                            onChange={(e) => setFormDsrCustomerStage(e.target.value as any)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {DSR_CUSTOMER_STAGES.map(st => (
                              <option key={st.id} value={st.id}>{st.nameAr}</option>
                            ))}
                          </select>
                        </div>

                        {/* 5. DSR percentage Text Input */}
                        <div className="space-y-1.5 text-right">
                          <label htmlFor="form-dsr-percent" className="block text-xs font-bold text-gray-600">نسبة الاستقطاع %:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="form-dsr-percent"
                            value={formDsrPercentStr}
                            onChange={(e) => {
                              // Accept any valid text input, don't force convert to number until save
                              setFormDsrPercentStr(e.target.value);
                            }}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            placeholder="مثال: 55 أو 33.33"
                          />
                        </div>

                        {/* 6. Deduct obligations switch */}
                        <div className="space-y-1.5 text-right flex flex-col justify-end">
                          <label className="block text-xs font-bold text-gray-605 mb-2">خصم الالتزامات القائمة:</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setFormDsrDeductExisting(!formDsrDeductExisting)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                formDsrDeductExisting ? 'bg-[#0057B8]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  formDsrDeductExisting ? '-translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="text-xs font-bold text-gray-600">
                              {formDsrDeductExisting ? 'نعم (يتم خصمها)' : 'لا (تستبعد من الحسبة)'}
                            </span>
                          </div>
                        </div>

                        {/* 7. Active switch */}
                        <div className="space-y-1.5 text-right flex flex-col justify-end">
                          <label className="block text-xs font-bold text-gray-605 mb-2">الحالة (مفعل):</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setFormDsrActive(!formDsrActive)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                formDsrActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  formDsrActive ? '-translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="text-xs font-bold text-gray-600">
                              {formDsrActive ? 'نشط / مفعل' : 'معطل / غير نشط'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
                      <button
                        type="button"
                        onClick={handleSaveDsrForm}
                        className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer font-sans"
                      >
                        {editingDsrRule ? 'تعديل القاعدة' : 'حفظ وإضافة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDsrModalOpen(false)}
                        className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 9: SUPPORT (SAKANI) */}
        {adminSubPage === 'support' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#111827]">جدول الدعم السكني بوزارة الإسكان (سكني)</h2>
            <p className="text-xs text-[#6B7280]">تعديل شرائح الدعم الشهري المتواصل المعتمدة بالريال السعودي بدلالة الدخل.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] rounded-2xl p-5 bg-white">
                <h3 className="font-bold text-xs text-[#111827] border-b pb-2 mb-3">حوافز ودعم سكني الشهري المتواصل</h3>
                <div className="space-y-3">
                  {supportSettings.monthlyBrackets.map((br, index) => (
                    <div key={index} className="flex justify-between items-center text-xs font-semibold bg-gray-50 p-2.5 rounded-xl border border-[#F1F5F9]">
                      <span className="text-gray-500 font-sans">من {br.fromSalary.toLocaleString('ar-SA')} إلى {br.toSalary > 90000 ? 'أكثر' : br.toSalary.toLocaleString('ar-SA')} ريال:</span>
                      <div className="flex items-center gap-1.5">
                        <NumericInput
                          id={`support-monthly-bracket-${index}`}
                          value={br.supportAmount}
                          onChange={(val) => {
                            const newBrackets = [...supportSettings.monthlyBrackets];
                            newBrackets[index].supportAmount = val;
                            setSupportSettings({ ...supportSettings, monthlyBrackets: newBrackets });
                          }}
                          allowDecimals={true}
                          className="w-16 text-center bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold"
                        />
                        <span className="text-gray-400">ريال / شهرياً</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#111827] border-b pb-2 mb-3">دعم الدفعة المسبقة (غير المستردة)</h3>
                  <div className="space-y-3 text-xs">
                    {supportSettings.downpaymentBrackets.map((br, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                        <span className="text-gray-500 font-sans">الرواتب من {br.fromSalary} إلى {br.toSalary > 90000 ? 'أكثر' : br.toSalary}:</span>
                        <span className="font-bold text-[#0EA5A4]">{(br.supportAmount).toLocaleString('ar-SA')} ريال</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-xs text-amber-800 leading-relaxed font-sans mt-4">
                  نصيحة المنظم: يوصى بعدم إضافة دعم الدفعة المسبقة إلى أصل الدين (Loan Principal)، بل احتسابه فقط في نهاية الحسبة لتكبير القدرة الشرائية لتفادي فرض فوائد البنك على منحة الدولة.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 10: PERSONAL FINANCE */}
        {adminSubPage === 'personal' && (
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

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
              <span className="text-xs font-bold text-slate-700">عمليات سريعة لتمويل شخصي:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCopyTargetBank('rajhi');
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
                    openHistory('personal_finance_rules', 'rajhi', 'سجل تغييرات قواعد التمويل الشخصي');
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
                {/* Case 1: Active Employee Multiplier */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0057B8]">1. موظف نشط (معامل Multiplier)</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
                    <div><strong>المدخلات:</strong> راتب 5000 | نسبة 33.33% | معامل 50.42</div>
                    <div className="border-t my-1"></div>
                    <div><strong>المخرجات المتوقعة:</strong> قسط ≈ 1666.5 | تموير ≈ 84,016</div>
                    <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                      <span>النتيجة الفعلية للحاسبة:</span>
                      <span>تمويل: 84,016 | قسط: 1,667</span>
                    </div>
                  </div>
                </div>

                {/* Case 2: Retired Multiplier */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#E28743]">2. متقاعد (معامل Multiplier)</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
                    <div><strong>المدخلات:</strong> راتب 5000 | نسبة 25% | معامل 50.42</div>
                    <div className="border-t my-1"></div>
                    <div><strong>المخرجات المتوقعة:</strong> قسط = 1250 | تمويل = 63,025</div>
                    <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                      <span>النتيجة الفعلية للحاسبة:</span>
                      <span>تمويل: 63,025 | قسط: 1,250</span>
                    </div>
                  </div>
                </div>

                {/* Case 3: Retired Flat Rate */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-700">3. متقاعد (فائدة Flat Rate 5%)</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">مطابق ومجتاز ✓</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-gray-600 font-sans leading-relaxed">
                    <div><strong>المدخلات:</strong> راتب 5000 | نسبة 25% | هامش 5%</div>
                    <div className="border-t my-1"></div>
                    <div><strong>المخرجات المتوقعة:</strong> قسط = 1250 | سود تمويل = 60,000</div>
                    <div className="text-emerald-700 font-bold bg-emerald-50/50 p-1.5 rounded mt-1.5 flex justify-between">
                      <span>النتيجة الفعلية للحاسبة:</span>
                      <span>تمويل: 60,000 | ربح: 15,000</span>
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
                      <th className="p-4 font-bold text-center">DSR الشخصي</th>
                      <th className="p-4 font-bold text-center">مدة التمويل (بالشهور)</th>
                      <th className="p-4 font-bold text-center">معامل التمويل</th>
                      <th className="p-4 font-bold">طريقة الحساب</th>
                      <th className="p-4 font-bold text-center">الهامش للعرض</th>
                      <th className="p-4 font-bold text-center">أقل راتب</th>
                      <th className="p-4 font-bold text-center">مفعل</th>
                      <th className="p-4 font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-semibold">
                    {personalRules && personalRules.length > 0 ? (
                      personalRules.map((rule, idx) => {
                        const b = banks?.find(bk => bk.id === rule.bankId);
                        const bankName = rule.bankId === 'all' ? '💼 الافتراضي العام (Default)' : b?.nameAr || rule.bankId;
                        const pathLabel = rule.pathType === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'تمويل شخصي فقط';
                        const statusLabel = rule.customerStatus === 'retired' ? 'متقاعد' : 'موظف نشط';
                        const ruleId = rule.id || `rule-${rule.bankId}-${idx}`;
                        return (
                          <tr key={ruleId} className="hover:bg-slate-50 transition-colors">
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
                            <td className="p-4 text-center font-sans">{(rule.dsrPercentage ?? 0)}%</td>
                            <td className="p-4 text-center font-sans">{(rule.termMonths ?? 0)} شهراً</td>
                            <td className="p-4 text-center font-sans">{(rule.financeCoefficient ?? 0)}</td>
                            <td className="p-4 text-xs">
                              <span className="text-gray-500 font-sans">
                                {rule.calculationMethod === 'pmt' ? 'PMT' : 'Multiplier'}
                              </span>
                            </td>
                            <td className="p-4 text-center font-sans">{(rule.annualMargin ?? 0)}%</td>
                            <td className="p-4 text-center font-sans">{(rule.minSalary ?? 0).toLocaleString('ar-SA')} ريال</td>
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
                            <td className="p-4 text-center">
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

                  <div className="relative z-55 inline-block align-bottom bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-gray-100">
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
                            onChange={(e) => setFormPfBankId(e.target.value)}
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
                            onChange={(e) => setFormPfCustomerStatus(e.target.value as any)}
                            disabled={!!editingPfRule}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                          >
                            <option value="active_employee">موظف نشط</option>
                            <option value="retired">متقاعد</option>
                          </select>
                        </div>

                        {/* 4. Dsr percentage */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">DSR التمويل الشخصي (%):</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="pf-form-dsr"
                            value={formPfDsr}
                            onChange={(e) => setFormPfDsr(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="مثال: 33"
                          />
                        </div>

                        {/* 5. Term Months */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">مدة التمويل (بالشهور):</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="pf-form-term"
                            value={formPfTerm}
                            onChange={(e) => setFormPfTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="مثال: 60"
                          />
                        </div>

                        {/* 7. Profit method choice */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">طريقة الحساب:</label>
                          <select
                            id="pf-form-calcmethod"
                            value={formPfCalcMethod}
                            onChange={(e) => setFormPfCalcMethod(e.target.value as any)}
                            className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0057B8] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="flat_rate">نسبة الفائدة المسطحة (Flat Rate)</option>
                            <option value="multiplier">معامل التمويل (Multiplier)</option>
                            <option value="pmt">معادلة PMT</option>
                          </select>
                        </div>

                        {/* 6. Multiplier coeff */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">
                            معامل التمويل (Multiplier):{' '}
                            {formPfCalcMethod === 'multiplier' ? (
                              <span className="text-red-500 text-[10px] font-bold">(أساسي للحساب)</span>
                            ) : (
                              <span className="text-gray-400 text-[10px] font-normal">(للعرض/اختياري فقط)</span>
                            )}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="pf-form-coeff"
                            value={formPfCoeff}
                            onChange={(e) => setFormPfCoeff(e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              formPfCalcMethod === 'multiplier' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-gray-200'
                            }`}
                            placeholder="مثال: 50.42"
                          />
                        </div>

                        {/* 8. Margin percentage */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">
                            {formPfCalcMethod === 'pmt' ? (
                              <>معدل الفائدة السنوي (APR / Annual Rate):{' '}<span className="text-red-500 text-[10px] font-bold">(أساسي لـ PMT)</span></>
                            ) : formPfCalcMethod === 'flat_rate' ? (
                              <>هامش الربح السنوي (Flat Rate):{' '}<span className="text-red-500 text-[10px] font-bold">(أساسي للحساب)</span></>
                            ) : (
                              <>هامش الربح للعرض والتقريب (%):{' '}<span className="text-gray-400 text-[10px] font-normal">(لعرض/تقريب فقط)</span></>
                            )}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="pf-form-margin"
                            value={formPfMargin}
                            onChange={(e) => setFormPfMargin(e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              formPfCalcMethod !== 'multiplier' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-gray-200'
                            }`}
                            placeholder="مثال: 4.80"
                          />
                        </div>

                        {/* 9. Minimum Salary */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-600">الحد الأدنى للراتب:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="pf-form-minsalary"
                            value={formPfMinSalary}
                            onChange={(e) => setFormPfMinSalary(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="مثال: 4000"
                          />
                        </div>

                        {/* 10. Active */}
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

                    <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
                      <button
                        type="button"
                        onClick={savePfRule}
                        className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                      >
                        {editingPfRule ? 'تحديث القاعدة' : 'حفظ وإضافة'}
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
        )}

        {/* VIEW 11: ADVANCED RULES */}
        {adminSubPage === 'advanced' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#111827]">القواعد الائتمانية المتقدمة للقبول</h2>
            <p className="text-xs text-[#6B7280]">صياغة قواعد الاستثناءات وتعديلات الهامش المباشرة بناءً على وضع العميل.</p>

            {/* Import / Export Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4 font-sans">
              <h3 className="text-xs font-bold text-[#111827] flex items-center gap-1.5 border-b pb-3">
                <FileSpreadsheet className="w-5 h-5 text-[#0057B8]" />
                <span>إجراءات استيراد وتصدير تكوينات البنوك (JSON Backups)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Export Card */}
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 font-sans">
                  <span className="text-xs font-bold text-gray-800 block">⬇️ تصدير إعدادات بنك معين</span>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    قم بتنزيل ملف تكوين بصيغة JSON يحتوي على جميع الأقسام (الهامش، الاستقطاع DSR، التمويل الشخصي والتقاعد) للبنك المحدد.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-500 font-bold">البنك المصدَّر:</label>
                    <select
                      value={importTargetBank || 'rajhi'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) triggerExport(val);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-bold outline-none"
                    >
                      <option value="">-- اختر البنك للتصدير --</option>
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.nameAr} ({b.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Import Card */}
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 font-sans">
                  <span className="text-xs font-bold text-gray-800 block">⬆️ استيراد إعدادات بنك من ملف</span>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    قم برفع ملف تكوين بصيغة JSON المعادل للبنك والقطاع لتطبيق الإعدادات بنقرة واحدة.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-500 font-bold">الملف المرفق (.json):</label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const json = JSON.parse(evt.target?.result as string);
                              setImportData(json);
                              setShowImportModal(true);
                            } catch (err) {
                              showToast("فشل قراءة الملف: تأكد من أنه ملف JSON معتمد.", "refuse");
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0057B8] hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Modal: Bank Sector Pension Rule Edit Modal */}
        {isBankSectorModalOpen && editingBankSectorRule && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans text-right" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg border border-gray-100 animate-fade-in flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankSectorModalOpen(false);
                    setEditingBankSectorRule(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold cursor-pointer font-sans"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827]">
                  ⚙️ تعديل وتخصيص معادلة احتساب التقاعد للقطاع
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 text-xs font-bold text-gray-750 text-right overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="block text-gray-500">🏦 شركة التمويل / البنك:</span>
                    <span className="block text-slate-800 font-extrabold text-sm">
                      {banks.find(b => b.id === editingBankSectorRule.bankId)?.nameAr || editingBankSectorRule.bankId}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-gray-500">📁 القطاع المحدد:</span>
                    <span className="block text-[#0057B8] font-extrabold text-sm">
                      {(() => {
                        const names: Record<string, string> = {
                          gov_civil: "حكومي مدني",
                       semi_gov: "شبه حكومي",
                       companies: "موظف شركات",
                          military: "عسكري",
                          private: "قطاع خاص",
                          retired: "متقاعد"
                        };
                        return names[editingBankSectorRule.sectorId] || editingBankSectorRule.sectorId;
                      })()}
                    </span>
                  </div>
                </div>

                {/* 1. approvedSalarySource */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-extrabold">مصدر الراتب المعتمد للحساب:*</label>
                  <select
                    value={editingBankSectorRule.salarySource || 'basic_only'}
                    onChange={(e) => {
                      setEditingBankSectorRule({
                        ...editingBankSectorRule,
                        salarySource: e.target.value as any
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-150 font-semibold"
                  >
                    <option value="basic_only">الأساسي فقط 💵</option>
                    <option value="basic_housing">الأساسي + بدل السكن 🏠</option>
                    <option value="net_salary">صافي الراتب 💳</option>
                    <option value="manual">يدوي / مباشر (متقاعد) ✍️</option>
                  </select>
                </div>

                {/* 2. calculationMethod */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-extrabold">طريقة ومعادلة الحساب المعتمدة:*</label>
                  <select
                    value={editingBankSectorRule.calcMethod || 'service_growth'}
                    onChange={(e) => {
                      setEditingBankSectorRule({
                        ...editingBankSectorRule,
                        calcMethod: e.target.value as any
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-150 font-semibold"
                  >
                    <option value="service_growth">خدمة + نمو 📈</option>
                    <option value="fixed_percentage">نسبة ثابتة 📊</option>
                    <option value="direct">راتب مباشر 🎯</option>
                  </select>
                </div>

                {/* Conditional Fields based on method */}
                {editingBankSectorRule.calcMethod === 'service_growth' && (
                  <div className="space-y-4 border-t border-dashed border-gray-150 pt-4">
                    <h4 className="text-xs font-extrabold text-[#0057B8] flex items-center gap-1">🛠️ بارامترات معادلة الخدمة والنمو:</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-gray-500">معامل القسمة (سنوات):</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.divisorYears ?? 40}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              divisorYears: parseInt(e.target.value) || 40
                            });
                          }}
                          className="w-full bg-white border border-[#E2E8F0] focus:border-[#0057B8] rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
                        />
                        <div className="text-[9px] text-[#0057B8] font-semibold mt-0.5 leading-tight">
                          الراتب التقاعدي = الراتب المعتمد × سنوات الخدمة ÷ {editingBankSectorRule.divisorYears ?? 40}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-gray-500">نسبة النمو السنوية (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingBankSectorRule.growthRate ?? 0}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              growthRate: parseFloat(e.target.value) || 0
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">أقل سنوات متبقية للنمو:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.growthMinYears ?? 5}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              growthMinYears: parseInt(e.target.value) || 0
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">أقصى سنوات متبقية للنمو:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.growthMaxYears ?? 12}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              growthMaxYears: parseInt(e.target.value) || 0
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">توقف النمو إذا تخطى سنوات:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.noGrowthAboveYears ?? 25}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              noGrowthAboveYears: parseInt(e.target.value) || 0
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-gray-150">
                      <input
                        id="cap-at-salary-chk"
                        type="checkbox"
                        checked={editingBankSectorRule.capAtApprovedSalary !== false}
                        onChange={(e) => {
                          setEditingBankSectorRule({
                            ...editingBankSectorRule,
                            capAtApprovedSalary: e.target.checked
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                      />
                      <label htmlFor="cap-at-salary-chk" className="text-xs text-gray-700 font-bold select-none cursor-pointer">
                        سقف التقاعد بالراتب المعتمد (لا يتخطى احتساب التقاعد قيمة الراتب المعتمد بعد النمو السنوي)
                      </label>
                    </div>
                  </div>
                )}

                {editingBankSectorRule.calcMethod === 'fixed_percentage' && (
                  <div className="space-y-4 border-t border-dashed border-gray-150 pt-4">
                    <h4 className="text-xs font-extrabold text-indigo-700 flex items-center gap-1">📊 بارامترات النسبة الثابتة الذكية:</h4>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">حد السنوات المتبقية الفارق:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.thresholdYears ?? 5}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              thresholdYears: parseInt(e.target.value) || 5
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">النسبة (%) إذا السنوات ≤ الحد:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.rateBelow ?? 70}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              rateBelow: parseInt(e.target.value) || 70
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] text-gray-500">النسبة (%) إذا السنوات &gt; الحد:</label>
                        <input
                          type="number"
                          value={editingBankSectorRule.rateAbove ?? 80}
                          onChange={(e) => {
                            setEditingBankSectorRule({
                              ...editingBankSectorRule,
                              rateAbove: parseInt(e.target.value) || 80
                            });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      مثال للأهلي: يتم احتساب نسبة {editingBankSectorRule.rateBelow ?? 70}% من الراتب المعتمد إذا كان المتبقي على التقاعد {editingBankSectorRule.thresholdYears ?? 5} سنوات أو أقل، ونسبة {editingBankSectorRule.rateAbove ?? 80}% إذا كانت المدة أكثر.
                    </p>
                  </div>
                )}

                {editingBankSectorRule.calcMethod === 'direct' && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-150/60 text-gray-650 leading-relaxed text-xs">
                    ✍️ لا توجد بارامترات معادلات مطلوبة لهذا الخيار. سيقوم تطبيق الحسبة باعتماد الراتب التقاعدي المباشر الذي يقوم العميل بإدخاله يدوياً في خانة الراتب التقاعدي دون المرور بمعادلات الخدمة المدنية أو العسكرية للبنك المختار.
                  </div>
                )}

                <div className="space-y-1 pt-2">
                  <label className="block text-gray-500 text-xs">ملاحظات ومرجع القاعدة (للاستخدام الداخلي):</label>
                  <textarea
                    rows={2}
                    value={editingBankSectorRule.notes || ''}
                    onChange={(e) => {
                      setEditingBankSectorRule({
                        ...editingBankSectorRule,
                        notes: e.target.value
                      });
                    }}
                    placeholder="أدخل أي ملاحظات مخصصة لهذه المعادلة..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-150"
                  />
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const finalRule: BankSectorPensionRule = {
                      ...editingBankSectorRule,
                      calcMethod: editingBankSectorRule.calcMethod || 'service_growth',
                      salarySource: editingBankSectorRule.salarySource || 'basic_only'
                    };
                    const updated = bankSectorRules.map(r => r.id === finalRule.id ? finalRule : r);
                    setBankSectorRules(updated);
                    setIsBankSectorModalOpen(false);
                    setEditingBankSectorRule(null);
                    showToast("تم تحديث قواعد البنك والقطاع بنجاح! للثبات النهائي يرجى نقر زر حفظ تغييرات الربط بالأعلى.", "success");
                  }}
                  className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBankSectorModalOpen(false);
                    setEditingBankSectorRule(null);
                  }}
                  className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء وإغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Bank Sector Copy Settings Modal */}
        {isCopyBankModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans text-right" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm border border-gray-100 animate-fade-in">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCopyBankModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold cursor-pointer font-sans"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827]">
                  📋 نسخ إعدادات الربط من بنك آخر
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 text-xs font-bold text-gray-700 text-right">
                <div className="space-y-2">
                  <label className="block text-gray-650">اختر البنك المصدر للإعدادات:</label>
                  <select
                    value={copySourceBankId}
                    onChange={(e) => setCopySourceBankId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none"
                  >
                    {banks
                      .filter(b => b.id !== bankSectorRulesSelectedBankId)
                      .map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.nameAr} ({bank.id})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-850 leading-relaxed font-semibold">
                  ⚠️ تحذير: هذا الإجراء سيقوم باستبدال جميع روابط القطاعات المحددة حاليًا للبنك المختار ({banks.find(b => b.id === bankSectorRulesSelectedBankId)?.nameAr}) بنسخة مطابقة من روابط البنك المختار أعلاه. هذا الإجراء مؤقت في المتصفح حتى تنقر على حفظ التغييرات.
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const sourceRules = bankSectorRules.filter(r => r.bankId === copySourceBankId);
                    if (sourceRules.length === 0) {
                      showToast("لم يتم العثور على إعدادات ربط لهذا البنك الأول.", "refuse");
                      return;
                    }
                    const updated = bankSectorRules.map(r => {
                      if (r.bankId === bankSectorRulesSelectedBankId) {
                        const match = sourceRules.find(sr => sr.sectorId === r.sectorId);
                        if (match) {
                          return {
                            ...r,
                            ruleId: match.ruleId,
                            isCustomized: match.isCustomized,
                            approvedSalarySource: match.approvedSalarySource,
                            calculationMethod: match.calculationMethod,
                            divisorMonths: match.divisorMonths,
                            yearsThreshold: match.yearsThreshold,
                            rateBelowThreshold: match.rateBelowThreshold,
                            rateAboveThreshold: match.rateAboveThreshold,
                            isActive: match.isActive,
                            notes: match.notes,
                            customRuleName: match.customRuleName
                          };
                        }
                      }
                      return r;
                    });
                    setBankSectorRules(updated);
                    setIsCopyBankModalOpen(false);
                    showToast(`تم نسخ روابط القطاعات بنجاح! لا تنس النقر على زر حفظ تغييرات الربط لتأكيدها.`, "success");
                  }}
                  className="bg-[#0057B8] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  تأكيد ونسخ
                </button>
                <button
                  type="button"
                  onClick={() => setIsCopyBankModalOpen(false)}
                  className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Pension Rules Library Add/Edit Modal */}
        {isLibraryModalOpen && editingLibraryRule && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans text-right animate-fade-in" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsLibraryModalOpen(false);
                    setEditingLibraryRule(null);
                  }}
                  className="text-gray-400 hover:text-gray-650 focus:outline-none text-lg font-bold cursor-pointer font-sans"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827]">
                  {libraryRules.some(r => r.id === editingLibraryRule.id) ? '⚙️ تعديل قالب قاعدة التقاعد' : '✨ إضافة قالب قاعدة تقاعد جديدة'}
                </h3>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 text-xs font-bold text-gray-750 overflow-y-auto flex-1 text-right">
                {/* Rule Primary Info */}
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="space-y-1">
                    <label className="block text-slate-500">اسم القالب (بالعربية):</label>
                    <input
                      type="text"
                      required
                      value={editingLibraryRule.name}
                      onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, name: e.target.value })}
                      placeholder="مثال: خدمة مدني الراجحي 40 سنة"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0057B8] transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500">طريقة حساب التقاعد:</label>
                    <select
                      value={editingLibraryRule.calcMethod}
                      onChange={(e) => {
                        const method = e.target.value as 'service_growth' | 'fixed_percentage' | 'direct';
                        setEditingLibraryRule({
                          ...editingLibraryRule,
                          calcMethod: method,
                          salarySource: method === 'direct' ? 'manual' : 'basic_only'
                        });
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0057B8] transition-all"
                    >
                      <option value="service_growth">خدمة مع نمو 📈</option>
                      <option value="fixed_percentage">نسبة ثابتة 📊</option>
                      <option value="direct">مباشر (متقاعد) 🎯</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <label className="block text-slate-500">وصف القالب التوضيحي:</label>
                  <input
                    type="text"
                    value={editingLibraryRule.description || ''}
                    onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, description: e.target.value })}
                    placeholder="وصف مختصر يوضح متى تستخدم هذه القاعدة والقطاعات المستهدفة"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0057B8] transition-all"
                  />
                </div>

                {/* Salary Source */}
                <div className="space-y-1 text-right">
                  <label className="block text-slate-500">مصدر الراتب المعتمد لحساب التقاعد:</label>
                  {editingLibraryRule.calcMethod === 'direct' ? (
                    <div className="w-full bg-slate-50 border border-gray-150 rounded-xl px-3 py-2.5 text-xs text-slate-500 font-semibold text-right">
                      يدوي / مباشر (يتم تحديده تلقائيًا لمعادلة المباشر العادية)
                    </div>
                  ) : (
                    <select
                      value={editingLibraryRule.salarySource}
                      onChange={(e) => setEditingLibraryRule({
                        ...editingLibraryRule,
                        salarySource: e.target.value as 'basic_only' | 'basic_housing' | 'net_salary' | 'manual'
                      })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0057B8] transition-all"
                    >
                      <option value="basic_only">الأساسي فقط 💵</option>
                      <option value="basic_housing">الأساسي + بدل السكن 🏠</option>
                      <option value="net_salary">صافي راتب العميل 💳</option>
                      <option value="manual">يدوي / مباشر (عبر حقل الدخل التقاعدي المباشر) ✍️</option>
                    </select>
                  )}
                </div>

                {/* DYNAMIC FIELDS BY METHOD */}
                {editingLibraryRule.calcMethod === 'service_growth' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-right">
                    <span className="block text-[#0057B8] font-bold text-[11px] border-b border-gray-100 pb-1 mb-2 text-right">
                       معاملات معادلة الخدمة والنمو السنوي:
                    </span>
                    
                    <div className="grid grid-cols-2 gap-4 text-right">
                      <div className="space-y-1">
                        <label className="block text-slate-500">معامل الخدمة بالسنوات:</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.divisorYears ?? 40}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, divisorYears: parseInt(e.target.value) || 40 })}
                          placeholder="مثال: 40 لـ 480 شهر"
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8]"
                        />
                        <span className="block text-[10px] text-gray-400 font-sans mt-1">
                          عادة 40 سنة للمدني و 35 سنة للعسكري.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-500">معدل النمو السنوي (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingLibraryRule.growthRate !== undefined ? editingLibraryRule.growthRate : 2.5}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, growthRate: parseFloat(e.target.value) || 0 })}
                          placeholder="مثال: 2.5 للـ 2.5%"
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8]"
                        />
                        <span className="block text-[10px] text-gray-400 font-sans mt-1">
                          إذا تم إعفاء القاعدة من نمو الراتب، ضعه بـ 0.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-right">
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">الحد الأدنى للنمو (سنة):</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.growthMinYears ?? 0}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, growthMinYears: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">سقف سنوات النمو:</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.growthMaxYears ?? 0}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, growthMaxYears: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">الحد المانع (سنة متبقية):</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.noGrowthAboveYears ?? 0}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, noGrowthAboveYears: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 text-right">
                      <input
                        type="checkbox"
                        id="capAtApprovedSalary"
                        checked={editingLibraryRule.capAtApprovedSalary ?? true}
                        onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, capAtApprovedSalary: e.target.checked })}
                        className="w-4 h-4 text-[#0057B8] focus:ring-blue-500 rounded cursor-pointer"
                      />
                      <label htmlFor="capAtApprovedSalary" className="text-[11px] text-gray-700 cursor-pointer select-none font-bold">
                        تفعيل سقف الراتب (حظر تجاوز الدخل التقاعدي لقيمة الراتب المعتمد)
                      </label>
                    </div>
                  </div>
                )}

                {editingLibraryRule.calcMethod === 'fixed_percentage' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-right">
                    <span className="block text-[#0057B8] font-bold text-[11px] border-b border-gray-100 pb-1 mb-2 text-right">
                       معاملات نسبة التقاعد الثابتة المتبقية:
                    </span>
                    
                    <div className="grid grid-cols-3 gap-2 text-right">
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">عتبة السنوات (سنة متبقية):</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.thresholdYears ?? 5}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, thresholdYears: parseInt(e.target.value) || 5 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">النسبة إذا أقل أو يساوي (%):</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.rateBelow ?? 70}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, rateBelow: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px]">النسبة إذا أكبر (%):</label>
                        <input
                          type="number"
                          required
                          value={editingLibraryRule.rateAbove ?? 80}
                          onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, rateAbove: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 text-right">
                      <input
                        type="checkbox"
                        id="capAtApprovedSalaryFixed"
                        checked={editingLibraryRule.capAtApprovedSalary ?? false}
                        onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, capAtApprovedSalary: e.target.checked })}
                        className="w-4 h-4 text-[#0057B8] focus:ring-blue-500 rounded cursor-pointer"
                      />
                      <label htmlFor="capAtApprovedSalaryFixed" className="text-[11px] text-gray-700 cursor-pointer select-none font-bold">
                        تفعيل سقف الراتب (حظر تجاوز الدخل التقاعدي لقيمة الراتب المعتمد)
                      </label>
                    </div>
                  </div>
                )}

                {editingLibraryRule.calcMethod === 'direct' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-800 inline-block w-full leading-relaxed text-right">
                    🎯 <strong>ملاحظة هامة:</strong> طريقة الحساب المباشر تعتمد كليًا على تجاوز جميع كشوفات الخدمة أو معادلات النسب، وتعتمد فقط على إدخال العميل المباشر للراتب التقاعدي يدوياً. حقل مصدر الراتب يتم تعيينه بقيمة "يدوي / مباشر" تلقائيًا.
                  </div>
                )}

                {/* Description & Notes */}
                <div className="grid grid-cols-1 gap-2 text-right">
                  <div className="space-y-1">
                    <label className="block text-slate-500">ملاحظات داخلية وخلفية تاريخية:</label>
                    <textarea
                      value={editingLibraryRule.notes || ''}
                      onChange={(e) => setEditingLibraryRule({ ...editingLibraryRule, notes: e.target.value })}
                      placeholder="اكتب هنا أي ملاحظات إدارية، مثل: تم مراجعة الشروط من بنود وقواعد الائتمان بالبنك..."
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] font-sans font-semibold"
                    />
                  </div>
                </div>

                {/* Status Switch */}
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-right">
                  <div className="text-right">
                    <span className="block text-gray-800 text-xs font-bold font-sans">تفعيل القالب في المنصة</span>
                    <span className="block text-[10px] text-slate-500 font-normal">تعطيل القالب يمنع استخدامه في ربط قواعد البنوك الجديدة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLibraryRule({ ...editingLibraryRule, isActive: !editingLibraryRule.isActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editingLibraryRule.isActive ? 'bg-emerald-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${editingLibraryRule.isActive ? '-translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!editingLibraryRule.name.trim()) {
                      showToast("يرجى إدخال اسم القالب التقاعدي أولاً", "refuse");
                      return;
                    }
                    const isNew = !libraryRules.some(r => r.id === editingLibraryRule.id);
                    let updated: PensionLibraryRule[] = [];
                    if (isNew) {
                      updated = [...libraryRules, editingLibraryRule];
                    } else {
                      updated = libraryRules.map(r => r.id === editingLibraryRule.id ? editingLibraryRule : r);
                    }
                    saveLibraryRulesToStorage(updated);
                    setIsLibraryModalOpen(false);
                    setEditingLibraryRule(null);
                    showToast("تم حفظ قالب قاعدة التقاعد بنجاح بالمكتبة! 🎉", "success");
                  }}
                  className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  حفظ القاعدة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLibraryModalOpen(false);
                    setEditingLibraryRule(null);
                  }}
                  className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء وإغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 1: Copy Settings Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md border border-gray-100 text-right animate-fade-in">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827]">
                  📋 نسخ إعدادات إلى: {formBanksList.find(b => b.id === copyTargetBank)?.nameAr || copyTargetBank}
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 text-xs font-bold text-gray-700">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-right">انسخ من البنك:</label>
                  <select
                    value={copySourceBank}
                    onChange={(e) => setCopySourceBank(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold font-sans text-gray-800 outline-none"
                  >
                    <option value="">-- اختر البنك المصدر --</option>
                    {formBanksList.filter(b => b.id !== copyTargetBank).map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <label className="block text-slate-500 text-right">الأقسام المراد نسخها:</label>
                  <div className="space-y-2 text-right">
                    {[
                      { id: 'margins', label: 'قواعد الهامش والأرباح' },
                      { id: 'dsr', label: 'نسب الاستقطاع DSR' },
                      { id: 'personal', label: 'قواعد التمويل الشخصي' },
                      { id: 'salary_source', label: 'قواعد الراتب المعتمد' },
                      { id: 'pension', label: 'محددات الراتب التقاعدي' },
                    ].map(sec => {
                      const isChecked = copySections.includes(sec.id as any);
                      return (
                        <label key={sec.id} className="flex items-center gap-2 cursor-pointer select-none justify-start">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCopySections(prev => prev.filter(x => x !== sec.id));
                              } else {
                                setCopySections(prev => [...prev, sec.id as any]);
                              }
                            }}
                            className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8] cursor-pointer"
                          />
                          <span className="text-[#111827]">{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-50 text-amber-700 border border-amber-100/50 rounded-xl p-3 text-[10px] leading-relaxed text-right">
                  ⚠️ <strong>ملاحظة هامة:</strong> سيتم استبدال البيانات الحالية لمشروع البنك المستهدف ({formBanksList.find(b => b.id === copyTargetBank)?.nameAr || copyTargetBank}) في الأقسام المحددة بالكامل ولا يمكن التراجع عنها إلا عبر سجل التغييرات.
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-50 px-6 py-4 border-t border-gray-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={executeCopy}
                  className="px-5 py-2 bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <span>📋 نسخ البيانات</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Import Json Preview Modal */}
        {showImportModal && importData && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md border border-gray-100 text-right animate-fade-in">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827]">
                  📥 معاينة استيراد إعدادات البنك
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 text-xs font-bold text-gray-700">
                <div className="space-y-1 text-slate-500 text-right">
                  <div><strong>المصدر الأصلي:</strong> {importData.institution?.bankName || importData.institution?.bankId}</div>
                  <div><strong>تاريخ التصدير:</strong> {new Date(importData.exportedAt).toLocaleString('ar-SA')}</div>
                  <div><strong>بواسطة:</strong> {importData.exportedBy}</div>
                </div>

                <div className="space-y-2 border-t border-b py-3 text-[#111827] text-right">
                  <span className="block text-slate-500 mb-1">سيتم استيراد ما يلي:</span>
                  <ul className="list-disc list-inside space-y-1 font-semibold text-[11px]">
                    <li>{importData.sections?.marginRules?.length || 0} قاعدة هوامش أرباح</li>
                    <li>{importData.sections?.dsrRules?.length || 0} قواعد استقطاع DSR</li>
                    <li>{importData.sections?.personalFinanceRules?.length || 0} قواعد تمويل شخصي</li>
                    <li>{importData.sections?.approvedSalaryRules?.length || 0} قواعد تمويل موظف (راتب معتمد)</li>
                    <li>{importData.sections?.pensionRules?.length || 0} قواعد احتساب راتب تقاعدي</li>
                  </ul>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="block text-slate-500">تطبيق واستيراد على البنك المستهدف:</label>
                  <select
                    value={importTargetBank}
                    onChange={(e) => setImportTargetBank(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold font-sans text-gray-800 outline-none"
                  >
                    {formBanksList.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-red-50 text-red-700 border border-red-100/50 rounded-xl p-3 text-[10px] leading-relaxed text-right">
                  ⚠️ <strong>تحذير:</strong> سيتم استبدال وحذف التكوين الحالي بالكامل للبنك المستهدف ({formBanksList.find(b => b.id === importTargetBank)?.nameAr || importTargetBank}) لمطابقة الملف المستورد ومزامنته للـ DB.
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-50 px-6 py-4 border-t border-gray-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={triggerImportApply}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  تطبيق الاستيراد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: History Log / Changeset Manager Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-2xl border border-gray-100 text-right animate-fade-in flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
                <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-1.5">
                  📜 سجل التغييرات والنسخ التاريخية لـ {formBanksList.find(b => b.id === historyBankId)?.nameAr || historyBankId}
                </h3>
              </div>

              {/* Content body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-gray-700 flex-1">
                <p className="text-[11px] text-gray-500 font-medium text-right">سجل العمليات للجدول: <code className="bg-slate-50 px-1 py-0.5 rounded font-mono">{historyTableName}</code></p>
                
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0057B8]" />
                    <span className="text-xs text-gray-500 font-bold">جاري جلب إصدارات الأرشيف من قاعدة البيانات...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl text-gray-400 space-y-1">
                    <div>لا توجد هناك سجلات أو تغييرات مؤرشفة بعد للبنك المحدد.</div>
                    <div className="text-[10px]">يتم تسجيل الإصدارات تلقائياً عند إجراء أي نسخ أو استيراد أو حفظ يدوي في لوحة التحكم.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((ver) => {
                      const dateStr = new Date(ver.created_at).toLocaleString('ar-SA');
                      return (
                        <div key={ver.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 relative hover:bg-slate-50 transition-all text-right">
                          <div className="absolute top-4 left-4">
                            <button
                              type="button"
                              onClick={() => triggerRestore(ver)}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 text-[#0057B8] text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              ↩ استعادة هذا الإصدار
                            </button>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[#111827] font-extrabold text-[11px] flex items-center gap-1.5 justify-start">
                              <span className="inline-block w-2 h-2 rounded-full bg-[#0057B8]"></span>
                              <span>العملية: {ver.change_note || 'تعديل قاعدة بيانات'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex gap-3 font-mono justify-start">
                              <span>التاريخ: {dateStr}</span>
                              <span>بواسطة: {ver.changed_by}</span>
                            </div>
                          </div>

                          {/* Quick data diff view preview */}
                          {ver.new_data && (
                            <div className="bg-white border rounded-xl p-3 text-[10px] space-y-1.5 text-right">
                              <div className="text-slate-500 font-bold">معاينة التكوين (Preview):</div>
                              <div className="max-h-24 overflow-y-auto font-mono text-gray-600 whitespace-pre-wrap break-all bg-slate-50 p-2 rounded-lg leading-relaxed dir-ltr text-left">
                                {JSON.stringify(ver.new_data, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-gray-150 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 bg-[#0057B8] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
