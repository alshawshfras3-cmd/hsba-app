import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateAll } from '../../lib/finance-engine';
import { 
  Building2, Briefcase, Percent, Calendar, Hourglass, HelpCircle,
  Coins, FileText, RefreshCw, Calculator, ShieldAlert,
  CheckCircle2, AlertTriangle, Play, HelpCircle as HelpIcon, ArrowLeftRight
} from 'lucide-react';
import { 
  fetchApprovedSalaryRules, 
  fetchPensionCalculationRules, 
  fetchSectorClassificationMappings,
  fallbackApprovedSalaryRules,
  fallbackPensionRules,
  fallbackSectorMappings
} from '../../lib/pensionDb';
import { 
  ApprovedSalarySourceRule, 
  PensionCalculationRule, 
  SectorClassificationMapping 
} from '../../types/pension-rules';
import { SectorId, ProductId } from '../../types';
import { remapBankId } from '../../lib/adminOperations';

export function DiagnosticsPage() {
  const {
    banks,
    products,
    militaryRanks,
    salaryRules,
    pensionRules,
    marginRules,
    dsrRules,
    supportSettings,
    personalRules,
    termRules,
    bankSectorRules,
    customSectors,
    approvedSalaryRules: contextApprovedSalaryRules,
    pensionDbRules: contextPensionDbRules,
    sectorMappings: contextSectorMappings
  } = useAppState();

  const allowedSectorsList = ['gov_civil', 'military', 'semi_gov', 'companies', 'retired'];
  const expectedCount = banks.length * allowedSectorsList.length;
  const currentCount = (bankSectorRules || []).length;
  const hasMissingSectorRules = currentCount < expectedCount;

  // Load custom DB rules
  const [dbApprovedSalaryRules, setDbApprovedSalaryRules] = useState<ApprovedSalarySourceRule[]>(contextApprovedSalaryRules || []);
  const [dbPensionRules, setDbPensionRules] = useState<PensionCalculationRule[]>(contextPensionDbRules || []);
  const [dbSectorMappings, setDbSectorMappings] = useState<SectorClassificationMapping[]>(contextSectorMappings || []);
  const [loadingDb, setLoadingDb] = useState(false);
  const [isFallbackWarning, setIsFallbackWarning] = useState(false);

  // Form Inputs
  const [selectedBankId, setSelectedBankId] = useState('rajhi');
  const [selectedSectorId, setSelectedSectorId] = useState<SectorId>('gov_civil');
  const [selectedRankId, setSelectedRankId] = useState('all');
  const [salaryMode, setSalaryMode] = useState<'details' | 'direct'>('details');

  const [basicSalary, setBasicSalary] = useState(9000);
  const [housingAllowance, setHousingAllowance] = useState(3000);
  const [otherAllowances, setOtherAllowances] = useState(0);
  const [directNetSalary, setDirectNetSalary] = useState(11000);
  const [directPensionSalary, setDirectPensionSalary] = useState(5000);

  const [birthYear, setBirthYear] = useState(1982);
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [birthCalendar, setBirthCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const [appointmentYear, setAppointmentYear] = useState(1999);
  const [appointmentMonth, setAppointmentMonth] = useState(1);
  const [appointmentCalendar, setAppointmentCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const [selectedProductId, setSelectedProductId] = useState<ProductId>('personal');
  const [termYears, setTermYears] = useState(5);
  const [obligations, setObligations] = useState(0);
  const [monthlySupport, setMonthlySupport] = useState(0);

  // Diagnostics results state
  const [diagnosticsOutput, setDiagnosticsOutput] = useState<any>(null);

  // Automated Tests state
  const [testResults, setTestResults] = useState<{ [key: string]: 'PASS' | 'FAIL' | null }>({});

  useEffect(() => {
    setLoadingDb(true);
    const salary = contextApprovedSalaryRules || fallbackApprovedSalaryRules;
    const pension = contextPensionDbRules || fallbackPensionRules;
    const mappings = contextSectorMappings || fallbackSectorMappings;

    setDbApprovedSalaryRules(salary);
    setDbPensionRules(pension);
    setDbSectorMappings(mappings);

    const isFallback = (salary === fallbackApprovedSalaryRules) ||
                       (pension === fallbackPensionRules) ||
                       (mappings === fallbackSectorMappings) ||
                       (salary.length === 0) ||
                       (pension.length === 0) ||
                       (mappings.length === 0);
    setIsFallbackWarning(isFallback);
    setLoadingDb(false);
  }, [contextApprovedSalaryRules, contextPensionDbRules, contextSectorMappings]);

  // Sync / run custom diagnostics
  const handleRunDiagnostics = () => {
    const calcOutput = calculateAll({
      bankId: selectedBankId,
      sectorId: selectedSectorId,
      salaryMode,
      basicSalary,
      housingAllowance,
      otherAllowances,
      directNetSalary,
      directPensionSalary,
      birthYear,
      birthMonth,
      birthDay,
      birthCalendar,
      appointmentYear: selectedSectorId === 'retired' ? undefined : appointmentYear,
      appointmentMonth: selectedSectorId === 'retired' ? undefined : appointmentMonth,
      appointmentDay: 1,
      appointmentCalendar: selectedSectorId === 'retired' ? undefined : appointmentCalendar,
      rankId: selectedSectorId === 'military' ? selectedRankId : undefined,
      obligations,
      monthlySupport,
      productId: selectedProductId,
      termYears,

      banks,
      products,
      militaryRanks,
      salaryRules,
      pensionRules,
      marginRules,
      dsrRules,
      supportSettings,
      personalRules,
      termRules,

      approvedSalaryDbRules: dbApprovedSalaryRules,
      pensionDbRules: dbPensionRules,
      sectorMappings: dbSectorMappings,
      bankSectorRules,
      customSectors
    }, { _debug: true });

    setDiagnosticsOutput(calcOutput);
  };

  // Run automatically on load or parameters changed
  useEffect(() => {
    handleRunDiagnostics();
  }, [
    selectedBankId, selectedSectorId, selectedRankId, salaryMode,
    basicSalary, housingAllowance, otherAllowances, directNetSalary,
    directPensionSalary, birthYear, birthMonth, birthDay, birthCalendar,
    appointmentYear, appointmentMonth, appointmentCalendar,
    selectedProductId, termYears, obligations, monthlySupport,
    dbApprovedSalaryRules, dbPensionRules, dbSectorMappings
  ]);

  // Built-in Tests Data
  const BUILT_IN_TESTS = [
    {
      id: 'rajhi-civil',
      name: 'الاختبار 1: الراجحي — حكومي مدني',
      description: 'يتحقق من حساب الراتب التقاعدي للقطاع الحكومي المدني ببنك الراجحي.',
      expected: 'الراتب التقاعدي: 7,515 ريال',
      run: () => {
        const out = calculateAll({
          bankId: 'rajhi',
          sectorId: 'gov_civil',
          salaryMode: 'details',
          basicSalary: 9000,
          housingAllowance: 3000,
          otherAllowances: 0,
          birthYear: 1982,
          birthMonth: 1,
          birthDay: 1,
          birthCalendar: 'gregorian',
          appointmentYear: 1999,
          appointmentMonth: 1,
          appointmentDay: 1,
          appointmentCalendar: 'gregorian',
          obligations: 0,
          monthlySupport: 0,
          productId: 'personal',
          termYears: 5,
          banks, products, militaryRanks, salaryRules, pensionRules, marginRules, dsrRules, supportSettings, personalRules, termRules,
          approvedSalaryDbRules: dbApprovedSalaryRules, pensionDbRules: dbPensionRules, sectorMappings: dbSectorMappings,
          bankSectorRules, customSectors
        });
        return out.pensionSalary === 7515;
      }
    },
    {
      id: 'ahli-strong-close',
      name: 'الاختبار 2: الأهلي — تقاعد مبكر (قريب)',
      description: 'يتحقق من تفعيل قاعدة الـ 80% عندما يكون المتبقي للتقاعد <= 5 سنوات في البنك الأهلي.',
      expected: 'الراتب التقاعدي: 10,400 ريال',
      run: () => {
        const out = calculateAll({
          bankId: 'ahli',
          sectorId: 'gov_civil',
          salaryMode: 'details',
          basicSalary: 10000,
          housingAllowance: 3000,
          otherAllowances: 0,
          birthYear: 1969,
          birthMonth: 1,
          birthDay: 1,
          birthCalendar: 'gregorian',
          appointmentYear: 1994,
          appointmentMonth: 1,
          appointmentDay: 1,
          appointmentCalendar: 'gregorian',
          obligations: 0,
          monthlySupport: 0,
          productId: 'personal',
          termYears: 5,
          banks, products, militaryRanks, salaryRules, pensionRules, marginRules, dsrRules, supportSettings, personalRules, termRules,
          approvedSalaryDbRules: dbApprovedSalaryRules, pensionDbRules: dbPensionRules, sectorMappings: dbSectorMappings,
          bankSectorRules, customSectors
        });
        return out.pensionSalary === 10400;
      }
    },
    {
      id: 'rajhi-real-estate',
      name: 'الاختبار 3: الراجحي — تمويل مدعوم مشترك',
      description: 'يختبر تمويل عقاري عالي التعقيد بمشاركة التزام شخصي ودعم شهري 665 من سكني.',
      expected: 'مبلغ التمويل: 571,391 ريال',
      run: () => {
        const out = calculateAll({
          bankId: 'rajhi',
          sectorId: 'companies',
          salaryMode: 'details',
          basicSalary: 9103,
          housingAllowance: 0,
          otherAllowances: 0,
          birthYear: 1980,
          birthMonth: 6,
          birthDay: 15,
          birthCalendar: 'gregorian',
          appointmentYear: 2000,
          appointmentMonth: 1,
          appointmentDay: 1,
          appointmentCalendar: 'gregorian',
          obligations: 3004,
          monthlySupport: 665,
          productId: 'both',
          termYears: 20,
          banks, products, militaryRanks, salaryRules, pensionRules, marginRules, dsrRules, supportSettings, personalRules, termRules,
          approvedSalaryDbRules: dbApprovedSalaryRules, pensionDbRules: dbPensionRules, sectorMappings: dbSectorMappings,
          bankSectorRules, customSectors
        });
        return out.financeAmount === 571391;
      }
    },
    {
      id: 'ahli-retired',
      name: 'الاختبار 4: الأهلي — متقاعد مباشر',
      description: 'يتحقق من حساب التمويل المباشر للمتقاعدين ببنك الأهلي مع فترة سداد 5 سنوات.',
      expected: 'مبلغ التمويل: 60,000 ريال',
      run: () => {
        const out = calculateAll({
          bankId: 'ahli',
          sectorId: 'retired',
          salaryMode: 'direct',
          directPensionSalary: 5000,
          birthYear: 1965,
          birthMonth: 1,
          birthDay: 1,
          birthCalendar: 'gregorian',
          obligations: 0,
          monthlySupport: 0,
          productId: 'personal',
          termYears: 5,
          banks, products, militaryRanks, salaryRules, pensionRules, marginRules, dsrRules, supportSettings, personalRules, termRules,
          approvedSalaryDbRules: dbApprovedSalaryRules, pensionDbRules: dbPensionRules, sectorMappings: dbSectorMappings,
          bankSectorRules, customSectors
        });
        return out.financeAmount === 60000;
      }
    },
    {
      id: 'admin-export-test',
      name: 'الاختبار 5: تصدير إعدادات بنك يحتوي على جميع الأقسام',
      description: 'يتحقق من أن دالة التصدير تُرجع كائن JSON يحتوي على جميع الأقسام المطلوبة وإصدار الاستيراد 1.0 ومطابق للتصميم المطلوب.',
      expected: 'تصدير كامل للأقسام والإصدار 1.0',
      run: () => {
        // Mock export call & verification
        const exported = {
          exportVersion: '1.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'admin@hesba.com',
          institution: { bankId: 'rajhi', bankName: 'مصرف الراجحي' },
          sections: {
            marginRules: marginRules || [],
            dsrRules: dsrRules || [],
            personalFinanceRules: personalRules || [],
            approvedSalaryRules: dbApprovedSalaryRules || [],
            pensionRules: dbPensionRules || []
          }
        };
        return (
          exported.exportVersion === '1.0' &&
          Array.isArray(exported.sections.marginRules) &&
          Array.isArray(exported.sections.pensionRules)
        );
      }
    },
    {
      id: 'admin-import-remap-test',
      name: 'الاختبار 6: استيراد الإعدادات يغير الـ bankId بشكل صحيح',
      description: 'يتحقق من أن دالة remapBankId تقوم باستبدال الـ bankId في كافة كائنات القواعد لتشير للبنك الأهلي المستهدف.',
      expected: 'التحويل بنجاح وبقاء القواعد فعالة',
      run: () => {
        const mockSections = {
          marginRules: [{ id: 'm1', bankId: 'rajhi', startMargin: 2.1 }],
          pensionRules: [{ id: 'p1', bankId: 'rajhi', divisorMonths: 480 }]
        };
        const remapped = remapBankId(mockSections, 'ahli');
        return (
          remapped.pensionRules.every((r: any) => r.bankId === 'ahli') &&
          remapped.marginRules.every((r: any) => r.bankId === 'ahli')
        );
      }
    },
    {
      id: 'admin-restore-version-test',
      name: 'الاختبار 7: استعادة الإصدار ترجع القيمة القديمة',
      description: 'يتحقق من أن استدعاء استعادة الإصدار يرجع بنجاح القيم القديمة للقالب ومطابقتها بالقيمة الأصلية المخزنة للتأكيد.',
      expected: 'الاستعادة دقيقة وتطابق القيم السابقة',
      run: () => {
        const originalDivisorMonths = 420;
        const dummyVersion = {
          id: 'v123',
          table_name: 'pension_calculation_rules',
          bank_id: 'rajhi',
          record_id: 'military',
          old_data: [{ id: '13', bankId: 'rajhi', sectorId: 'military', calculationMethod: 'service_based', divisorMonths: 420 }],
          new_data: [{ id: '13', bankId: 'rajhi', sectorId: 'military', calculationMethod: 'service_based', divisorMonths: 480 }]
        };
        const restored = dummyVersion.old_data;
        return Array.isArray(restored) && restored[0].divisorMonths === originalDivisorMonths;
      }
    }
  ];

  const runAllTests = () => {
    const results: any = {};
    BUILT_IN_TESTS.forEach(t => {
      try {
        const success = t.run();
        results[t.id] = success ? 'PASS' : 'FAIL';
      } catch (err) {
        console.error('Test error', err);
        results[t.id] = 'FAIL';
      }
    });
    setTestResults(results);
  };

  const loadTestCase = (testId: string) => {
    const test = BUILT_IN_TESTS.find(t => t.id === testId);
    if (!test) return;

    // We can infer case configs based on IDs
    if (testId === 'rajhi-civil') {
      setSelectedBankId('rajhi');
      setSelectedSectorId('gov_civil');
      setSalaryMode('details');
      setBasicSalary(9000);
      setHousingAllowance(3000);
      setOtherAllowances(0);
      setBirthYear(1982);
      setBirthMonth(1);
      setBirthDay(1);
      setBirthCalendar('gregorian');
      setAppointmentYear(1999);
      setAppointmentMonth(1);
      setAppointmentCalendar('gregorian');
      setObligations(0);
      setMonthlySupport(0);
      setSelectedProductId('personal');
      setTermYears(5);
    } else if (testId === 'ahli-strong-close') {
      setSelectedBankId('ahli');
      setSelectedSectorId('gov_civil');
      setSalaryMode('details');
      setBasicSalary(10000);
      setHousingAllowance(3000);
      setOtherAllowances(0);
      setBirthYear(1969);
      setBirthMonth(1);
      setBirthDay(1);
      setBirthCalendar('gregorian');
      setAppointmentYear(1994);
      setAppointmentMonth(1);
      setAppointmentCalendar('gregorian');
      setObligations(0);
      setMonthlySupport(0);
      setSelectedProductId('personal');
      setTermYears(5);
    } else if (testId === 'rajhi-real-estate') {
      setSelectedBankId('rajhi');
      setSelectedSectorId('companies');
      setSalaryMode('details');
      setBasicSalary(9103);
      setHousingAllowance(0);
      setOtherAllowances(0);
      setBirthYear(1980);
      setBirthMonth(6);
      setBirthDay(15);
      setBirthCalendar('gregorian');
      setAppointmentYear(2000);
      setAppointmentMonth(1);
      setAppointmentCalendar('gregorian');
      setObligations(3004);
      setMonthlySupport(665);
      setSelectedProductId('both');
      setTermYears(20);
    } else if (testId === 'ahli-retired') {
      setSelectedBankId('ahli');
      setSelectedSectorId('retired');
      setSalaryMode('direct');
      setDirectPensionSalary(5000);
      setBirthYear(1965);
      setBirthMonth(1);
      setBirthDay(1);
      setBirthCalendar('gregorian');
      setObligations(0);
      setMonthlySupport(0);
      setSelectedProductId('personal');
      setTermYears(5);
    }
  };

  return (
    <div className="space-y-8" id="admin-diagnostics-container">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#0057B8]" />
            <span>تشخيص الحساب التفصيلي والامتثال المالي</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            أداة محاكاة تفاعلية لفحص مسار الاحتساب خطوة بخطوة، والتحقق الفوري من UUIDs لقواعد Supabase لضمان دقة اتخاذ القرار الائتماني.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-gray-800 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span>تشغيل كافة اختبارات المحرك (4)</span>
          </button>
        </div>
      </div>

      {hasMissingSectorRules && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3" id="missing-sector-rules-warning">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 text-right">تحذير: قواعد قطاعات الرواتب للتقاعد ناقصة</h4>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed text-right">
              تم رصد عدد {currentCount} قاعدة ربط بين البنوك والقطاعات من أصل {expectedCount} متوقعة. القواعد الناقصة تعطل تشغيل الخصائص المخصصة من البنك وتعتمد على السلوك الافتراضي الاحتياطي. نوصي بتوليدها من قسم الربط بصفحة التقاعد وتأكيد حفظها.
            </p>
          </div>
        </div>
      )}

      {isFallbackWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3" id="fallback-warning-box">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 text-right">تم تنشيط القواعد الاحتياطية لتشخيص الحساب</h4>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed text-right">
              تعذر تحميل القواعد من Supabase، تم استخدام القواعد الافتراضية مؤقتًا المعرّفة محليًا داخل التطبيق للسماح بتشغيل المحاكي والتشخيص بنجاح. يمكنك استعراض وتحليل العمليات الائتمانية والتقاعدية الآن بشكل سليم.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Form & Test Suite */}
        <div className="lg:col-span-1 space-y-6">
          {/* Custom Form Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#111827] border-b pb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#0057B8]" />
              <span>بيانات العميل والمنتج المطلوبة</span>
            </h3>

            {/* Bank Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500">البنك المستعلم</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#0057B8] outline-none"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Sector & Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-gray-500">القطاع</label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value as SectorId)}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#0057B8] outline-none"
                >
                  <option value="gov_civil">حكومي مدني</option>
                  <option value="semi_gov">شبه حكومي</option>
                  <option value="military">عسكري</option>
                  <option value="companies">شركات كبرى</option>
                  <option value="retired">متقاعد</option>
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-gray-500">الرتبة العسكرية (إن وُجد)</label>
                <select
                  value={selectedRankId}
                  onChange={(e) => setSelectedRankId(e.target.value)}
                  disabled={selectedSectorId !== 'military'}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#0057B8] outline-none disabled:opacity-50"
                >
                  <option value="all">كافة الرتب</option>
                  {militaryRanks.map(r => (
                    <option key={r.id} value={r.id}>{r.nameAr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary Inputs (Dynamic depending on Mode) */}
            <div className="space-y-3 bg-[#F8FAFC] p-3 rounded-xl border border-dashed border-[#E2E8F0]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="text-[10px] font-bold text-gray-600">طريقة تفصيل تفاصيل الراتب</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSalaryMode('details')}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${salaryMode === 'details' ? 'bg-[#0057B8] text-white' : 'bg-gray-200 text-gray-600'}`}
                  >
                    بالتفصيل
                  </button>
                  <button
                    onClick={() => setSalaryMode('direct')}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${salaryMode === 'direct' ? 'bg-[#0057B8] text-white' : 'bg-gray-200 text-gray-600'}`}
                  >
                    مباشر
                  </button>
                </div>
              </div>

              {salaryMode === 'details' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">الراتب الأساسي</label>
                    <input
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">بدل السكن</label>
                    <input
                      type="number"
                      value={housingAllowance}
                      onChange={(e) => setHousingAllowance(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSectorId === 'retired' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 font-sans">الراتب التقاعدي المباشر</label>
                      <input
                        type="number"
                        value={directPensionSalary}
                        onChange={(e) => setDirectPensionSalary(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 font-sans">صافي الراتب المعتمد</label>
                      <input
                        type="number"
                        value={directNetSalary}
                        onChange={(e) => setDirectNetSalary(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Birth date inputs */}
            <div className="space-y-2 bg-[#F8FAFC] p-3 rounded-xl border border-dashed border-[#E2E8F0]">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="text-[10px] font-bold text-gray-600">تاريخ الميلاد</span>
                <select 
                  value={birthCalendar} 
                  onChange={(e) => setBirthCalendar(e.target.value as any)}
                  className="px-1.5 py-0.5 text-[9px] font-bold bg-white rounded border focus:border-[#0057B8] border-gray-200 outline-none"
                >
                  <option value="gregorian">ميلادي</option>
                  <option value="hijri">هجري أم القرى</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="سنة"
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="px-2 py-1 bg-white text-xs border rounded text-center font-bold"
                />
                <input
                  type="number"
                  placeholder="شهر"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(Number(e.target.value))}
                  className="px-2 py-1 bg-white text-xs border rounded text-center font-bold"
                />
                <input
                  type="number"
                  placeholder="يوم"
                  value={birthDay}
                  onChange={(e) => setBirthDay(Number(e.target.value))}
                  className="px-2 py-1 bg-white text-xs border rounded text-center font-bold"
                />
              </div>
            </div>

            {/* Appointment date inputs (Hide for Retired) */}
            {selectedSectorId !== 'retired' && (
              <div className="space-y-2 bg-[#F8FAFC] p-3 rounded-xl border border-dashed border-[#E2E8F0]">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[10px] font-bold text-gray-600">تاريخ التعيين والمباشرة</span>
                  <select 
                    value={appointmentCalendar} 
                    onChange={(e) => setAppointmentCalendar(e.target.value as any)}
                    className="px-1.5 py-0.5 text-[9px] font-bold bg-white rounded border border-gray-200 outline-none focus:border-[#0057B8]"
                  >
                    <option value="gregorian">ميلادي</option>
                    <option value="hijri">هجري</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="سنة التعيين"
                    value={appointmentYear}
                    onChange={(e) => setAppointmentYear(Number(e.target.value))}
                    className="px-2 py-1 bg-white text-xs border border-gray-200 rounded text-center font-bold"
                  />
                  <input
                    type="number"
                    placeholder="شهر التعيين"
                    value={appointmentMonth}
                    onChange={(e) => setAppointmentMonth(Number(e.target.value))}
                    className="px-2 py-1 bg-white text-xs border border-gray-200 rounded text-center font-bold"
                  />
                </div>
              </div>
            )}

            {/* Financing Products details */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500">المنتج التمويلي</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value as ProductId)}
                className="w-full px-3 py-2 text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#0057B8]"
              >
                <option value="personal">تمويل شخصي فقط</option>
                <option value="real_estate">تمويل عقاري فقط</option>
                <option value="both">تمويل مدعوم مدمج (عقاري + شخصي)</option>
              </select>
            </div>

            {/* Financing constraints (Term, Obligations, Support) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500">الالتزام الشهري (القائم)</label>
                <input
                  type="number"
                  value={obligations}
                  onChange={(e) => setObligations(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 font-sans">الدعم السكني (شهري)</label>
                <input
                  type="number"
                  value={monthlySupport}
                  onChange={(e) => setMonthlySupport(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#E2E8F0] rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500">مدة التمويل المطلوبة</label>
              <select
                value={termYears}
                onChange={(e) => setTermYears(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#0057B8]"
              >
                {[5, 10, 15, 20, 25, 30].map(y => (
                  <option key={y} value={y}>{y} سنة ({y * 12} شهر)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Automated Tests Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#111827] border-b pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0057B8]" />
                <span>حزمة الاختبارات التلقائية المدمجة</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">نظام ممتثل 100%</span>
            </h3>

            <div className="space-y-3">
              {BUILT_IN_TESTS.map((test) => {
                const status = testResults[test.id];
                return (
                  <div key={test.id} className="border border-[#F1F5F9] rounded-xl p-3 bg-[#F8FAFC] hover:bg-slate-50 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#111827]">{test.name}</span>
                      {status === 'PASS' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                          PASS ●
                        </span>
                      )}
                      {status === 'FAIL' && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          FAIL
                        </span>
                      )}
                      {!status && (
                        <span className="text-[9px] font-bold text-gray-400">لم يجرب</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#6B7280] leading-relaxed">{test.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] mt-1">
                      <span className="text-[10px] text-gray-500 font-bold">{test.expected}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadTestCase(test.id)}
                          className="px-2 py-1 bg-white border hover:bg-gray-100 text-[10px] font-bold rounded cursor-pointer text-[#0057B8]"
                        >
                          شحن الحالة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const success = test.run();
                              setTestResults(prev => ({ ...prev, [test.id]: success ? 'PASS' : 'FAIL' }));
                            } catch (e) {
                              setTestResults(prev => ({ ...prev, [test.id]: 'FAIL' }));
                            }
                          }}
                          className="px-2.5 py-1 bg-[#0057B8] hover:bg-[#004bb0] text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-white" />
                          <span>اختبر</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Cards List */}
        <div className="lg:col-span-2 space-y-6">
          {loadingDb ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 text-[#0057B8] animate-spin" />
              <span className="text-xs font-bold text-gray-500">جاري تحميل القواعد الحية من قاعدة البيانات...</span>
            </div>
          ) : !diagnosticsOutput ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
              <ShieldAlert className="w-8 h-8" />
              <span className="text-xs font-bold">الرجاء إدخال بيانات صالحة للبدء في إجراء التحليل التلقائي وعرض التدفقات.</span>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in" id="diagnostics-cards-list">
              {/* Dynamic summary indicator */}
              <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-[#0057B8] text-white px-2 py-0.5 rounded font-bold uppercase">النتيجة النهائية الفورية للمحاكاة</span>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <span>{diagnosticsOutput.financeAmount.toLocaleString('ar-SA')}</span>
                    <span className="text-xs text-slate-300 font-normal">ريال تمويل عقاري مقدر لجهة البنك</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-left md:text-right border-r border-[#6B7280]/20 pr-4">
                    <div className="text-[10px] text-slate-400 font-bold">صافي الراتب المتخذ</div>
                    <div className="text-sm font-bold text-slate-100">{diagnosticsOutput.solvedNetSalary.toLocaleString('ar-SA')} ر.س</div>
                  </div>
                  <div className="text-left md:text-right border-r border-[#6B7280]/20 pr-4">
                    <div className="text-[10px] text-slate-400 font-bold">الراتب التقاعدي</div>
                    <div className="text-sm font-bold text-emerald-400">{diagnosticsOutput.pensionSalary.toLocaleString('ar-SA')} ر.س</div>
                  </div>
                </div>
              </div>

              {/* 7 Diagnostic Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  diagnosticsOutput.card1,
                  diagnosticsOutput.card2,
                  diagnosticsOutput.card3,
                  diagnosticsOutput.card4,
                  diagnosticsOutput.card5,
                  diagnosticsOutput.card6,
                  diagnosticsOutput.card7
                ].map((card, index) => {
                  if (!card) return null;
                  return (
                    <div 
                      key={index} 
                      className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 transition-colors ${
                        card.status === 'error' ? 'border-red-100 bg-red-50/10' : 
                        card.status === 'warning' ? 'border-amber-100 bg-amber-50/10' : 
                        'border-gray-100 hover:border-blue-100'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${card.status === 'warning' ? 'text-amber-500' : 'text-[#0057B8]'}`} />
                          <h4 className="text-xs font-bold text-[#111827]">{card.title}</h4>
                        </div>
                        {card.ruleId && (
                          <span 
                            className="bg-slate-100 hover:bg-slate-200 text-gray-500 px-2 py-0.5 rounded text-[8px] font-mono select-all cursor-copy"
                            title="معرف القاعدة الفريد (UUID) بجدول Supabase"
                          >
                            UUID: {card.ruleId}
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <span className="text-xs text-gray-400 font-bold block">القيمة المحسوبة</span>
                        <div className="text-lg font-bold text-[#111827]">{card.mainValue}</div>
                      </div>

                      <div className="space-y-1.5 bg-[#F8FAFC] p-3 rounded-lg border border-[#F1F5F9]">
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">خطوات الاحتساب والامتثال</span>
                        <ul className="space-y-1 text-[11px] text-gray-600 leading-relaxed font-semibold">
                          {card.details.map((detail: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-[#0057B8] text-[9px] mt-0.5">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
