import React, { useState } from 'react';
import { Edit, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Bank } from '../../../../types';
import { BankSectorPensionRule } from '../../../../types/pension-rules';
import NumericInput from '../../../calculator/NumericInput';

interface BankSectorRulesTabProps {
  banks: Bank[];
  bankSectorRules: BankSectorPensionRule[];
  setBankSectorRules: React.Dispatch<React.SetStateAction<BankSectorPensionRule[]>>;
  saveBankSectorRulesToStorage: (rules: BankSectorPensionRule[]) => void;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export default function BankSectorRulesTab({
  banks,
  bankSectorRules,
  setBankSectorRules,
  saveBankSectorRulesToStorage,
  showToast
}: BankSectorRulesTabProps) {
  const [bankSectorRulesSelectedBankId, setBankSectorRulesSelectedBankId] = useState<string>(banks[0]?.id || 'rajhi');
  const [isBankSectorModalOpen, setIsBankSectorModalOpen] = useState(false);
  const [editingBankSectorRule, setEditingBankSectorRule] = useState<BankSectorPensionRule | null>(null);
  const [pensionModalError, setPensionModalError] = useState<string>('');

  // Copy bank rules modals states
  const [isCopyBankModalOpen, setIsCopyBankModalOpen] = useState(false);
  const [copySourceBankId, setCopySourceBankId] = useState<string>('');

  const displaySectors = ['gov_civil', 'military', 'semi_gov', 'companies', 'retired'];

  const sectorNamesAr: Record<string, string> = {
    gov_civil: "مدني / حكومي",
    military: "عسكري",
    semi_gov: "شبه حكومي",
    companies: "موظف شركات",
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

  return (
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
                      : 'bg-white hover:bg-slate-100 text-gray-755 border-gray-200 hover:border-gray-300'
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
            {displaySectors.map((sectId) => {
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
                          setPensionModalError('');
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
            })}
          </tbody>
        </table>
      </div>

      {/* Editing bank sector rule modal */}
      {isBankSectorModalOpen && editingBankSectorRule && (
        <div className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans text-right animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-[#0057B8] text-white px-6 py-4 flex justify-between items-center text-right font-sans">
              <button
                type="button"
                onClick={() => {
                  setIsBankSectorModalOpen(false);
                  setEditingBankSectorRule(null);
                }}
                className="text-white hover:text-gray-200 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm text-right w-full">⚙️ محددات احتساب التقاعد المباشر</h3>
            </div>

            <div className="p-6 space-y-4 text-xs font-bold text-gray-750 overflow-y-auto flex-1 text-right">
              {pensionModalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-extrabold mb-4">
                  ⚠️ {pensionModalError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-right">
                <div>
                  <label className="block text-gray-500 mb-1">الجهة التمويلية المستهدفة:</label>
                  <input
                    type="text"
                    disabled
                    value={banks.find(b => b.id === editingBankSectorRule.bankId)?.nameAr || editingBankSectorRule.bankId}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 font-bold text-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">القطاع والمنصب:</label>
                  <input
                    type="text"
                    disabled
                    value={sectorNamesAr[editingBankSectorRule.sectorId] || editingBankSectorRule.sectorId}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 font-bold text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1.5">طريقة الحساب لتصميم التقاعد:</label>
                <select
                  value={editingBankSectorRule.calcMethod}
                  onChange={(e) => {
                    const method = e.target.value as 'service_growth' | 'fixed_percentage' | 'direct';
                    setEditingBankSectorRule({
                      ...editingBankSectorRule,
                      calcMethod: method,
                      salarySource: method === 'direct' ? 'manual' : 'basic_only'
                    });
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                >
                  <option value="service_growth">معادلة سنوات الخدمة والنمو 📈</option>
                  <option value="fixed_percentage">نسبة مئوية ثابتة (البقاء بالخدمة) 📊</option>
                  <option value="direct">إدخال مباشر وصافي التقاعد الحالي 🎯</option>
                </select>
              </div>

              {editingBankSectorRule.calcMethod !== 'direct' && (
                <div>
                  <label className="block text-gray-500 mb-1.5">الراتب المعتمد لحساب معاش التقاعد:</label>
                  <select
                    value={editingBankSectorRule.salarySource}
                    onChange={(e) => setEditingBankSectorRule({
                      ...editingBankSectorRule,
                      salarySource: e.target.value as 'basic_only' | 'basic_housing' | 'net_salary' | 'manual'
                    })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#0057B8]"
                  >
                    <option value="basic_only">الأساسي فقط 💵</option>
                    <option value="basic_housing">الأساسي + بدل السكن 🏠</option>
                    <option value="net_salary">صافي راتب العميل 💳</option>
                    <option value="manual">مباشر / يدوي ✍️</option>
                  </select>
                </div>
              )}

              {/* SERVICE GROWTH SPECIFIC */}
              {editingBankSectorRule.calcMethod === 'service_growth' && (
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 text-right">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">قاسم حساب التقاعد (سنة):</label>
                      <NumericInput
                        value={editingBankSectorRule.divisorYears ?? 40}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          divisorYears: val === '' ? 40 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">معدل النمو السنوي %:</label>
                      <NumericInput
                        value={editingBankSectorRule.growthRate ?? 2.5}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          growthRate: val === '' ? 0 : val
                        })}
                        allowDecimals={true}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">أدنى سنوات للنمو:</label>
                      <NumericInput
                        value={editingBankSectorRule.growthMinYears ?? 5}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          growthMinYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">أقصى سن للنمو:</label>
                      <NumericInput
                        value={editingBankSectorRule.growthMaxYears ?? 12}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          growthMaxYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">مانع الخدمة (سنة):</label>
                      <NumericInput
                        value={editingBankSectorRule.noGrowthAboveYears ?? 25}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          noGrowthAboveYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="editCapAtApprovedSalary"
                      checked={editingBankSectorRule.capAtApprovedSalary !== false}
                      onChange={(e) => setEditingBankSectorRule({
                        ...editingBankSectorRule,
                        capAtApprovedSalary: e.target.checked
                      })}
                      className="w-4 h-4 text-[#0057B8] rounded focus:ring-[#0057B8]"
                    />
                    <label htmlFor="editCapAtApprovedSalary" className="text-xs text-gray-700 font-extrabold cursor-pointer">
                      سقف المعاش: حظر تجاوز قيمة المعاش لـ (الراتب المعتمد)
                    </label>
                  </div>
                </div>
              )}

              {/* FIXED PERCENTAGE SPECIFIC */}
              {editingBankSectorRule.calcMethod === 'fixed_percentage' && (
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 text-right">
                  <div className="grid grid-cols-3 gap-2 text-right">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">عتبة السنوات المتبقية:</label>
                      <NumericInput
                        value={editingBankSectorRule.thresholdYears ?? 5}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          thresholdYears: val === '' ? 5 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">النسبة % (≤ العتبة):</label>
                      <NumericInput
                        value={editingBankSectorRule.rateBelow ?? 70}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          rateBelow: val === '' ? 70 : val
                        })}
                        allowDecimals={true}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">النسبة % (&gt; العتبة):</label>
                      <NumericInput
                        value={editingBankSectorRule.rateAbove ?? 80}
                        onChange={(val) => setEditingBankSectorRule({
                          ...editingBankSectorRule,
                          rateAbove: val === '' ? 80 : val
                        })}
                        allowDecimals={true}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100 font-bold text-xs">
              <button
                type="button"
                onClick={() => {
                  // 1. Validate & Parse fields based on calcMethod
                  const calcMethod = editingBankSectorRule.calcMethod || 'service_growth';
                  const salarySource = editingBankSectorRule.salarySource || 'basic_only';
                  
                  let divY = editingBankSectorRule.divisorYears;
                  let grR = editingBankSectorRule.growthRate;
                  let grMin = editingBankSectorRule.growthMinYears;
                  let grMax = editingBankSectorRule.growthMaxYears;
                  let noGr = editingBankSectorRule.noGrowthAboveYears;
                  let thY = editingBankSectorRule.thresholdYears;
                  let rBelow = editingBankSectorRule.rateBelow;
                  let rAbove = editingBankSectorRule.rateAbove;

                  if (calcMethod === 'service_growth') {
                    const valDiv = divY ?? 40;
                    if (isNaN(Number(valDiv)) || Number(valDiv) <= 0) {
                      setPensionModalError('معامل أو قاسم التقاعد يجب أن يكون رقماً أكبر من 0');
                      return;
                    }
                    divY = Number(valDiv);

                    const valGrowth = grR ?? 0;
                    if (isNaN(Number(valGrowth)) || Number(valGrowth) < 0 || Number(valGrowth) > 100) {
                      setPensionModalError('نسبة النمو السنوية يجب أن تكون بين 0 و 100');
                      return;
                    }
                    grR = Number(valGrowth);

                    const valMin = grMin ?? 0;
                    if (isNaN(Number(valMin)) || Number(valMin) < 0) {
                      setPensionModalError('أقل سنوات متبقية للنمو يجب أن تكون 0 أو أكبر');
                      return;
                    }
                    grMin = Number(valMin);

                    const valMax = grMax ?? 0;
                    if (isNaN(Number(valMax)) || Number(valMax) < 0) {
                      setPensionModalError('أقصى سنوات متبقية للنمو يجب أن تكون 0 أو أكبر');
                      return;
                    }
                    grMax = Number(valMax);

                    const valNoGr = noGr ?? 0;
                    if (isNaN(Number(valNoGr)) || Number(valNoGr) < 0) {
                      setPensionModalError('توقف النمو إذا تخطى سنوات يجب أن يكون 0 أو أكبر');
                      return;
                    }
                    noGr = Number(valNoGr);

                    thY = undefined;
                    rBelow = undefined;
                    rAbove = undefined;
                  } else if (calcMethod === 'fixed_percentage') {
                    const valTh = thY ?? 5;
                    if (isNaN(Number(valTh)) || Number(valTh) <= 0) {
                      setPensionModalError('حد السنوات المتبقية الفارق يجب أن يكون أكبر من 0');
                      return;
                    }
                    thY = Number(valTh);

                    const valBelow = rBelow ?? 70;
                    if (isNaN(Number(valBelow)) || Number(valBelow) < 0 || Number(valBelow) > 100) {
                      setPensionModalError('النسبة إذا كان السنوات ≤ الحد يجب أن تكون بين 0 و 100');
                      return;
                    }
                    rBelow = Number(valBelow);

                    const valAbove = rAbove ?? 80;
                    if (isNaN(Number(valAbove)) || Number(valAbove) < 0 || Number(valAbove) > 100) {
                      setPensionModalError('النسبة إذا كان السنوات > الحد يجب أن تكون بين 0 و 100');
                      return;
                    }
                    rAbove = Number(valAbove);

                    divY = undefined;
                    grR = undefined;
                    grMin = undefined;
                    grMax = undefined;
                    noGr = undefined;
                  } else {
                    divY = undefined;
                    grR = undefined;
                    grMin = undefined;
                    grMax = undefined;
                    noGr = undefined;
                    thY = undefined;
                    rBelow = undefined;
                    rAbove = undefined;
                  }

                  // Clean error
                  setPensionModalError('');

                  const finalRule: BankSectorPensionRule = {
                    ...editingBankSectorRule,
                    id: `${editingBankSectorRule.bankId}_${editingBankSectorRule.sectorId}`,
                    calcMethod,
                    salarySource,
                    divisorYears: divY,
                    growthRate: grR,
                    growthMinYears: grMin,
                    growthMaxYears: grMax,
                    noGrowthAboveYears: noGr,
                    thresholdYears: thY,
                    rateBelow: rBelow,
                    rateAbove: rAbove
                  };

                  const existingIndex = bankSectorRules.findIndex(
                    rule =>
                      rule.bankId === finalRule.bankId &&
                      rule.sectorId === finalRule.sectorId
                  );

                  const updated =
                    existingIndex >= 0
                      ? bankSectorRules.map((rule, index) =>
                          index === existingIndex ? finalRule : rule
                        )
                      : [...bankSectorRules, finalRule];

                  setBankSectorRules(updated);
                  setIsBankSectorModalOpen(false);
                  setEditingBankSectorRule(null);
                  showToast("تم تطبيق التعديل محلياً. اضغط حفظ التغييرات لتثبيته في قاعدة البيانات.", "success");
                }}
                className="bg-[#0057B8] hover:bg-blue-755 text-white px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                تطبيق التعديلات
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBankSectorModalOpen(false);
                  setEditingBankSectorRule(null);
                }}
                className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer hover:bg-gray-100"
              >
                إلغاء وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Bank Rules Modal */}
      {isCopyBankModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans text-right animate-fade-in animate-in fade-in duration-200 animate-out duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md border border-gray-150 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-650 bg-[#0057B8] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white text-right">📋 نسخ إعدادات وقواعد بنك تقاعدي آخر</h3>
              <button
                type="button"
                onClick={() => setIsCopyBankModalOpen(false)}
                className="text-white hover:text-gray-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-bold text-gray-705">
              <p className="text-[11px] text-gray-500 leading-relaxed font-normal">
                سيتم مسح كافة إعدادات وقواعد الربط للبنك الحالي واستبدالها بالكامل بنسخة مطابقة من إعدادات المصرف والقطاع المستورد المختار:
              </p>

              <div className="space-y-1">
                <label className="block text-slate-500">من (المصرف المصدر):</label>
                <select
                  value={copySourceBankId}
                  onChange={(e) => setCopySourceBankId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#0057B8] outline-none"
                >
                  {banks.filter(b => b.id !== bankSectorRulesSelectedBankId).map((bank) => (
                    <option key={bank.id} value={bank.id}>{bank.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500">إلى (البنك المستهدف للنسخ فوقه):</label>
                <div className="w-full bg-slate-50 border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-semibold">
                  {banks.find(b => b.id === bankSectorRulesSelectedBankId)?.nameAr}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100 font-bold text-xs">
              <button
                type="button"
                onClick={() => {
                  if (!copySourceBankId) return;
                  const sourceRules = bankSectorRules.filter(r => r.bankId === copySourceBankId);
                  
                  // Delete existing target bank rules
                  const filteredRules = bankSectorRules.filter(r => r.bankId !== bankSectorRulesSelectedBankId);
                  
                  // Clone source rules with key of target
                  const clonedRules = sourceRules.map(rule => ({
                    ...rule,
                    id: `${bankSectorRulesSelectedBankId}_${rule.sectorId}`,
                    bankId: bankSectorRulesSelectedBankId
                  }));

                  setBankSectorRules([...filteredRules, ...clonedRules]);
                  setIsCopyBankModalOpen(false);
                  showToast("تم استيراد كافة إعدادات البنك بنجاح! اضغط على حفظ تغييرات الربط للمزامنة.", "success");
                }}
                className="bg-[#0057B8] hover:bg-blue-755 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                تأكيد وبدء النسخ
              </button>
              <button
                type="button"
                onClick={() => setIsCopyBankModalOpen(false)}
                className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl transition-all cursor-pointer hover:bg-gray-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
