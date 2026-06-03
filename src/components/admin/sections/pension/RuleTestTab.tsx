import React, { useState } from 'react';
import { Bank, NetSalaryRule } from '../../../../types';
import { ApprovedSalarySourceRule, PensionCalculationRule } from '../../../../types/pension-rules';
import { calculateNetSalary } from '../../../../lib/finance-engine/salary';
import { combineToRetirementRules } from '../../../../lib/pensionDb';
import { 
  getBankRetirementRule, 
  calculateApprovedBase, 
  calculatePensionByBankRule 
} from '../../../../lib/finance-engine/pension';

interface RuleTestTabProps {
  banks: Bank[];
  salaryRules: NetSalaryRule[];
  approvedSalaryDbRules: ApprovedSalarySourceRule[];
  pensionDbRules: PensionCalculationRule[];
  sectorMappings: any[];
}

export default function RuleTestTab({
  banks,
  salaryRules,
  approvedSalaryDbRules,
  pensionDbRules,
  sectorMappings
}: RuleTestTabProps) {
  const [sandboxBankId, setSandboxBankId] = useState<string>(banks[0]?.id || 'rajhi');
  const [sandboxSectorId, setSandboxSectorId] = useState<string>('gov_civil');
  const [sandboxSelectedRuleId, setSandboxSelectedRuleId] = useState<string>('auto');
  const [sandboxSalaryMode, setSandboxSalaryMode] = useState<'direct' | 'details'>('details');
  const [sandboxBasic, setSandboxBasic] = useState<number>(12000);
  const [sandboxHousing, setSandboxHousing] = useState<number>(3500);
  const [sandboxOther, setSandboxOther] = useState<number>(1500);
  const [sandboxDirectNet, setSandboxDirectNet] = useState<number>(16000);
  const [sandboxDirectPension, setSandboxDirectPension] = useState<number>(0);
  const [sandboxAgeMethod, setSandboxAgeMethod] = useState<'manual' | 'dates'>('manual');
  const [sandboxServiceMonths, setSandboxServiceMonths] = useState<number>(240);
  const [sandboxYearsToRetire, setSandboxYearsToRetire] = useState<number>(10);

  // Birthday Dates state variables
  const [sandboxBirthDay, setSandboxBirthDay] = useState<number>(1);
  const [sandboxBirthMonth, setSandboxBirthMonth] = useState<number>(1);
  const [sandboxBirthYear, setSandboxBirthYear] = useState<number>(1985);
  const [sandboxBirthCalendar, setSandboxBirthCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  // Appointment Dates state variables
  const [sandboxAppointmentDay, setSandboxAppointmentDay] = useState<number>(1);
  const [sandboxAppointmentMonth, setSandboxAppointmentMonth] = useState<number>(1);
  const [sandboxAppointmentYear, setSandboxAppointmentYear] = useState<number>(2010);
  const [sandboxAppointmentCalendar, setSandboxAppointmentCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const [sandboxResult, setSandboxResult] = useState<any>(null);

  const triggerCalculate = () => {
    const trace: string[] = [];
    const netSalaryObj = calculateNetSalary({
      sectorId: sandboxSectorId as any,
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

    const activeRulesCombined = combineToRetirementRules(approvedSalaryDbRules, pensionDbRules);
    const ruleObj = getBankRetirementRule({
      bankId: sandboxBankId,
      sectorId: sandboxSectorId as any,
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
      trace.push(`   - المعادلة النهائية: ${finalApprovedSalary} × ${rate}% = ${correctedPensionValue.toLocaleString('ar-SA')} ريال.`);
    } else if (ruleObj.calculationMethod === 'service_based') {
      trace.push(`   - القاسم المتنوع: شهور تقاعد ${sandboxServiceMonths} وقاسم شهري ${ruleObj.divisorMonths || 480}.`);
      trace.push(`   - المعادلة النهائية: ${finalApprovedSalary} × ${sandboxServiceMonths} ÷ ${ruleObj.divisorMonths || 480} = ${correctedPensionValue.toLocaleString('ar-SA')} ريال.`);
    } else {
      trace.push(`   - تقاعد مباشر: الراتب التقاعدي الصافي = ${correctedPensionValue} ريال.`);
    }

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
  };

  const handleDateChange = (type: 'birth' | 'appt', field: 'd' | 'm' | 'y', val: number) => {
    let bD = sandboxBirthDay;
    let bM = sandboxBirthMonth;
    let bY = sandboxBirthYear;
    let aD = sandboxAppointmentDay;
    let aM = sandboxAppointmentMonth;
    let aY = sandboxAppointmentYear;

    if (type === 'birth') {
      if (field === 'd') bD = val;
      if (field === 'm') bM = val;
      if (field === 'y') bY = val;
      setSandboxBirthDay(bD);
      setSandboxBirthMonth(bM);
      setSandboxBirthYear(bY);
    } else {
      if (field === 'd') aD = val;
      if (field === 'm') aM = val;
      if (field === 'y') aY = val;
      setSandboxAppointmentDay(aD);
      setSandboxAppointmentMonth(aM);
      setSandboxAppointmentYear(aY);
    }

    const now = new Date();
    const appt = new Date(aY, aM - 1, aD);
    const birth = new Date(bY, bM - 1, bD);
    const curSvc = Math.max(0, (now.getFullYear() * 12 + now.getMonth()) - (appt.getFullYear() * 12 + appt.getMonth()));
    const mtr = Math.max(0, 60 * 12 - ((now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth())));
    setSandboxServiceMonths(curSvc + mtr);
    setSandboxYearsToRetire(parseFloat((mtr / 12).toFixed(1)));
  };

  return (
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
            setSandboxSectorId('gov_civil');
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
            onChange={(e) => setSandboxSectorId(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
          >
            <option value="gov_civil">💼 حكومي مدني</option>
            <option value="military">👮 عسكري</option>
            <option value="semi_gov">🏢 شبه حكومي</option>
            <option value="companies">🏢 موظف شركات</option>
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
                    onChange={(e) => handleDateChange('birth', 'd', Number(e.target.value))}
                    className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                  />
                  <input
                    type="number" value={sandboxBirthMonth} min={1} max={12} placeholder="شهر"
                    onChange={(e) => handleDateChange('birth', 'm', Number(e.target.value))}
                    className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                  />
                  <input
                    type="number" value={sandboxBirthYear} placeholder="سنة"
                    onChange={(e) => handleDateChange('birth', 'y', Number(e.target.value))}
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
                    onChange={(e) => handleDateChange('appt', 'd', Number(e.target.value))}
                    className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                  />
                  <input
                    type="number" value={sandboxAppointmentMonth} min={1} max={12} placeholder="شهر"
                    onChange={(e) => handleDateChange('appt', 'm', Number(e.target.value))}
                    className="w-14 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold outline-none text-center"
                  />
                  <input
                    type="number" value={sandboxAppointmentYear} placeholder="سنة"
                    onChange={(e) => handleDateChange('appt', 'y', Number(e.target.value))}
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
                  const curSvc = Math.max(0, (now.getFullYear() * 12 + now.getMonth()) - (appt.getFullYear() * 12 + appt.getMonth()));
                  const mtr = Math.max(0, 60 * 12 - ((now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth())));
                  return (
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div><span className="text-gray-500">خدمة حالية: </span><span className="font-extrabold text-indigo-700">{curSvc} شهر</span><span className="text-gray-400 mr-1"> ({(curSvc / 12).toFixed(1)} سنة)</span></div>
                      <div><span className="text-gray-500">متبقي للتقاعد: </span><span className="font-extrabold text-[#0057B8]">{mtr} شهر</span><span className="text-gray-400 mr-1"> ({(mtr / 12).toFixed(1)} سنة)</span></div>
                      <div><span className="text-[#6B7280] font-bold">خدمة عند التقاعد: </span><span className="font-extrabold text-emerald-600">{curSvc + mtr} شهر</span><span className="text-gray-405 mr-1"> ({((curSvc + mtr) / 12).toFixed(1)} سنة)</span></div>
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
            onClick={triggerCalculate}
            className="w-full bg-[#0057B8] text-white hover:bg-blue-700 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-md text-center"
          >
            🚀 محاكاة وتشغيل اختبار قانون التقاعد
          </button>
        </div>
      </div>

      {sandboxResult && (
        <div className="border border-slate-150 rounded-2xl p-6 bg-slate-50 space-y-4 font-sans animate-fade-in text-right" dir="rtl">
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
            {sandboxResult.diagnostics.map((line: string, idx: number) => (
              <div key={idx} className="border-b border-slate-800 pb-1 mb-1 last:border-b-0 last:pb-0">{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
