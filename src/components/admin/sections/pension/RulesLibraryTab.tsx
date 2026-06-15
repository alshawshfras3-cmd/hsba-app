import React, { useState } from 'react';
import { Plus, Trash2, Edit, CheckCircle2 } from 'lucide-react';
import { PensionLibraryRule } from '../../../../types/pension-rules';
import NumericInput from '../../../calculator/NumericInput';

interface RulesLibraryTabProps {
  libraryRules: PensionLibraryRule[];
  saveLibraryRulesToStorage: (updatedRules: PensionLibraryRule[]) => void;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export default function RulesLibraryTab({
  libraryRules,
  saveLibraryRulesToStorage,
  showToast
}: RulesLibraryTabProps) {
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingLibraryRule, setEditingLibraryRule] = useState<PensionLibraryRule | null>(null);

  return (
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
          className="bg-[#0057B8] hover:bg-blue-770 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
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
                          <span className="block text-purple-600 text-[9px] bg-purple-50 px-1 py-0.2 rounded w-max">سقف الراتب المعتمد مفعل</span>
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

      {/* Modal: Pension Rules Library Add/Edit Modal */}
      {isLibraryModalOpen && editingLibraryRule && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans text-right animate-fade-in animate-in fade-in duration-200" dir="rtl">
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
              <h3 className="text-sm font-extrabold text-[#111827] text-right w-full">
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
                      <NumericInput
                        value={editingLibraryRule.divisorYears ?? 40}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          divisorYears: val === '' ? 40 : val
                        })}
                        allowDecimals={false}
                        placeholder="مثال: 40 لـ 480 شهر"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] text-right font-bold"
                      />
                      <span className="block text-[10px] text-gray-400 font-sans mt-1">
                        عادة 40 سنة للمدني و 35 سنة للعسكري.
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500">معدل النمو السنوي (%):</label>
                      <NumericInput
                        value={editingLibraryRule.growthRate !== undefined ? editingLibraryRule.growthRate : 2.5}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          growthRate: val === '' ? 0 : val
                        })}
                        allowDecimals={true}
                        placeholder="مثال: 2.5 للـ 2.5%"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] text-right font-bold"
                      />
                      <span className="block text-[10px] text-gray-400 font-sans mt-1">
                        إذا تم إعفاء القاعدة من نمو الراتب، ضعه بـ 0.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-right">
                    <div className="space-y-1">
                      <label className="block text-slate-500 text-[10px]">الحد الأدنى للنمو (سنة):</label>
                      <NumericInput
                        value={editingLibraryRule.growthMinYears ?? 0}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          growthMinYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none text-right font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500 text-[10px]">سقف سنوات النمو:</label>
                      <NumericInput
                        value={editingLibraryRule.growthMaxYears ?? 0}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          growthMaxYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none text-right font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500 text-[10px]">الحد المانع (سنة متبقية):</label>
                      <NumericInput
                        value={editingLibraryRule.noGrowthAboveYears ?? 0}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          noGrowthAboveYears: val === '' ? 0 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none text-right font-bold"
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
                      <NumericInput
                        value={editingLibraryRule.thresholdYears ?? 5}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          thresholdYears: val === '' ? 5 : val
                        })}
                        allowDecimals={false}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] text-right font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500 text-[10px]">النسبة إذا أقل أو يساوي (%):</label>
                      <NumericInput
                        value={editingLibraryRule.rateBelow ?? 70}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          rateBelow: val === '' ? 70 : val
                        })}
                        allowDecimals={true}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] text-right font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500 text-[10px]">النسبة إذا أكبر (%):</label>
                      <NumericInput
                        value={editingLibraryRule.rateAbove ?? 80}
                        onChange={(val) => setEditingLibraryRule({
                          ...editingLibraryRule,
                          rateAbove: val === '' ? 80 : val
                        })}
                        allowDecimals={true}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0057B8] text-right font-bold"
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
                className="bg-[#0057B8] hover:bg-blue-705 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
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
    </div>
  );
}
