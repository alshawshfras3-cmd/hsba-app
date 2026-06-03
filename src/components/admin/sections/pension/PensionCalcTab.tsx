import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Bank } from '../../../../types';
import { PensionCalculationRule } from '../../../../types/pension-rules';
import { savePensionCalculationRule } from '../../../../lib/pensionDb';
import NumericInput from '../../../calculator/NumericInput';

interface PensionCalcTabProps {
  banks: Bank[];
  dbRulesLoading: boolean;
  pensionDbRules: PensionCalculationRule[];
  setPensionDbRules: React.Dispatch<React.SetStateAction<PensionCalculationRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  openHistory: (tableName: string, bankId: string, title: string) => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: Array<'margins' | 'dsr' | 'personal' | 'salary_source' | 'pension'>) => void;
  setShowCopyModal: (show: boolean) => void;
}

export default function PensionCalcTab({
  banks,
  dbRulesLoading,
  pensionDbRules,
  setPensionDbRules,
  showToast,
  openHistory,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal
}: PensionCalcTabProps) {
  const [selectedPensionBankTabId, setSelectedPensionBankTabId] = useState<string>(banks[0]?.id === 'alahli' ? 'ahli' : (banks[0]?.id || ''));
  const [editingPensionRule, setEditingPensionRule] = useState<PensionCalculationRule | null>(null);

  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  return (
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
                    : 'bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 hover:border-gray-350'
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
              <h3 className="font-extrabold text-sm text-right w-full">تعديل قواعد التقاعد والمعاش</h3>
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
                  <option value="service_based">معادلة سنوات الخدمة (القاسم)</option>
                  <option value="fixed_percentage">نسبة ثابتة (أهلي)</option>
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
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#0057B8] font-mono text-right"
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
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-right"
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
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-right"
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
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-right"
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
                  showToast('تم تعديل قواعد المعاش محلياً! يرجى النقر على حفظ التغييرات للرفع والمزامنة.', 'success');
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
  );
}
