import React, { useState } from 'react';
import { Bank, HousingSupportTier, AdvancePaymentTier } from '../../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getHousingSupport, getAdvancePayment } from '../../../lib/housingSupportService';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

interface SupportSectionProps {
  banks: Bank[];
  housingSupportTiers: HousingSupportTier[];
  setHousingSupportTiers: React.Dispatch<React.SetStateAction<HousingSupportTier[]>>;
  advancePaymentTiers: AdvancePaymentTier[];
  setAdvancePaymentTiers: React.Dispatch<React.SetStateAction<AdvancePaymentTier[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export default function SupportSection({
  banks,
  housingSupportTiers,
  setHousingSupportTiers,
  advancePaymentTiers,
  setAdvancePaymentTiers,
  showToast
}: SupportSectionProps) {
  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  // Simulated live tester
  const [supportTestSalary, setSupportTestSalary] = useState<string>('8500');

  // Housing Support list inputs/adding/editing states
  const [isAddingHousing, setIsAddingHousing] = useState(false);
  const [editHousingTierId, setEditHousingTierId] = useState<string | null>(null);

  const [hMinSalary, setHMinSalary] = useState<string>('0');
  const [hMaxSalary, setHMaxSalary] = useState<string>('0');
  const [hAmountMin, setHAmountMin] = useState<string>('0');
  const [hAmountMax, setHAmountMax] = useState<string>('0');
  const [hSortOrder, setHSortOrder] = useState(1);

  // Advance Payment lists/adding/editing states
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [editAdvanceTierId, setEditAdvanceTierId] = useState<string | null>(null);

  const [aSalaryThreshold, setASalaryThreshold] = useState<string>('0');
  const [aAmount, setAAmount] = useState<string>('0');

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs leading-relaxed">
        <h2 className="text-lg font-bold text-[#111827] mb-2 flex flex-wrap items-center gap-2">
          <span className="p-1 px-2.5 bg-sky-50 text-[#0057B8] rounded-xl text-sm font-sans">جدول الدعم السكني</span>
          إدارة شرائح الدعم السكني المعتمدة للحاسبة ولوحة الأدمن (سكني)
        </h2>
        <p className="text-xs text-[#6B7280]">
          يمكنك الآن تعديل وإضافة وحذف شرائح الدعم السكني بنوعيه (الشهري المتواصل ودعم الدفعة المسبقة). يتم حفظ التعديلات وإدماجها في الحاسبة واللوحة تلقائياً بآلية الاستيفاء الخطي للراجحي.
        </p>
      </div>

      {/* Live Interactive Verification Tester */}
      <div className="border border-indigo-100 rounded-2xl p-5 bg-gradient-to-r from-indigo-50/50 to-sky-50/20 shadow-xs">
        <h3 className="font-bold text-xs text-indigo-950 mb-3 flex items-center gap-1.5 font-sans">
          🧪 مُحاكي التحقق من مخرجات الدعم اللحظي (Simulated Live Tester)
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <label htmlFor="test-salary-input" className="text-gray-600 font-sans">أدخل صافي راتب العميل للتجربة:</label>
            <input
              type="text"
              id="test-salary-input"
              dir="ltr"
              className="w-32 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 focus:outline-none font-mono text-center text-xs"
              placeholder="مثال: 8,500"
              value={supportTestSalary}
              onChange={(e) => setSupportTestSalary(normalizeNumberInput(e.target.value))}
            />
            <span className="text-gray-400">ريال</span>
          </div>
          {supportTestSalary && !isNaN(parseNumberInput(supportTestSalary, NaN)) && (
            <div className="bg-white border border-emerald-100 rounded-xl px-4 py-1.5 flex flex-wrap items-center gap-3 text-xs text-emerald-800 shadow-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                الدعم الشهري (استيفاء خطي): 
                <strong className="text-emerald-700 font-mono mr-1">{Math.round(getHousingSupport(parseNumberInput(supportTestSalary), housingSupportTiers))} ريال</strong>
              </span>
              <span className="border-r border-gray-200 h-4 mx-1"></span>
              <span>
                دعم الدفعة المسبقة: 
                <strong className="text-indigo-700 font-mono mr-1">{(getAdvancePayment(parseNumberInput(supportTestSalary), advancePaymentTiers)).toLocaleString('ar-SA')} ريال</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* SECTION 1: MONTHLY SUBSIDIES */}
        <div className="border border-[#E5E7EB] rounded-2xl p-5 bg-white space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h3 className="font-bold text-xs text-[#111827]">شرائح الدعم السكني الشهري المتواصل</h3>
              <p className="text-[10px] text-gray-500 font-medium font-sans">يتم الحساب بطريقة الاستيفاء الخطي من الشرائح المدخلة.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingHousing(true);
                setHMinSalary('0');
                setHMaxSalary('0');
                setHAmountMin('0');
                setHAmountMax('0');
                setHSortOrder(housingSupportTiers.length + 1);
              }}
              className="p-1 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              شريحة جديدة
            </button>
          </div>

          {isAddingHousing && (
            <div className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-[11px] text-emerald-900 font-sans">إضافة شريحة دعم شهري جديدة</h4>
              <div className="grid grid-cols-2 gap-2 text-right">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">من راتب (الحد الأدنى):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={hMinSalary}
                    onChange={(e) => setHMinSalary(normalizeNumberInput(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">إلى راتب (الحد الأقصى):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={hMaxSalary}
                    onChange={(e) => setHMaxSalary(normalizeNumberInput(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">الدعم عند البداية:</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={hAmountMin}
                    onChange={(e) => setHAmountMin(normalizeNumberInput(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">الدعم عند النهاية:</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={hAmountMax}
                    onChange={(e) => setHAmountMax(normalizeNumberInput(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const min_val = parseNumberInput(hMinSalary, NaN);
                    const max_val = parseNumberInput(hMaxSalary, NaN);
                    const amount_min_val = parseNumberInput(hAmountMin, NaN);
                    const amount_max_val = parseNumberInput(hAmountMax, NaN);

                    if (isNaN(min_val) || isNaN(max_val) || isNaN(amount_min_val) || isNaN(amount_max_val)) {
                      showToast('الرجاء التأكد من إدخال جميع الحقول بشكل رقمي صحيح وبدون تركها فارغة.', 'refuse');
                      return;
                    }

                    const newTier: HousingSupportTier = {
                      id: `h_tier_${Date.now()}`,
                      min_salary: min_val,
                      max_salary: max_val,
                      amount_at_min: amount_min_val,
                      amount_at_max: amount_max_val,
                      sort_order: hSortOrder
                    };
                    setHousingSupportTiers([...housingSupportTiers, newTier].sort((a,b) => a.min_salary - b.min_salary));
                    setIsAddingHousing(false);
                    showToast('تمت إضافة شريحة دعم سكني جديدة بنجاح في المسودة!', 'success');
                  }}
                  className="p-1 px-3 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer hover:bg-emerald-700"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingHousing(false)}
                  className="p-1 px-3 bg-gray-250 text-gray-750 rounded-lg font-bold cursor-pointer hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 overflow-y-auto max-h-[450px]">
            {housingSupportTiers?.map((br) => {
              const isEditing = editHousingTierId === br.id;
              return (
                <div key={br.id} className="flex flex-col text-xs font-semibold bg-gray-50 p-2.5 rounded-xl border border-[#F1F5F9] space-y-2 text-right">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-right">
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">من راتب:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            className="w-full bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                            value={hMinSalary}
                            onChange={(e) => setHMinSalary(normalizeNumberInput(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">إلى راتب:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            className="w-full bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                            value={hMaxSalary}
                            onChange={(e) => setHMaxSalary(normalizeNumberInput(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">الدعم عند البداية:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            className="w-full bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                            value={hAmountMin}
                            onChange={(e) => setHAmountMin(normalizeNumberInput(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">الدعم عند النهاية:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            className="w-full bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                            value={hAmountMax}
                            onChange={(e) => setHAmountMax(normalizeNumberInput(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const min_val = parseNumberInput(hMinSalary, NaN);
                            const max_val = parseNumberInput(hMaxSalary, NaN);
                            const amount_min_val = parseNumberInput(hAmountMin, NaN);
                            const amount_max_val = parseNumberInput(hAmountMax, NaN);

                            if (isNaN(min_val) || isNaN(max_val) || isNaN(amount_min_val) || isNaN(amount_max_val)) {
                              showToast('الرجاء التأكد من إدخال جميع قيم الشريحة بشكل رقمي صحيح وبدون تركها فارغة.', 'refuse');
                              return;
                            }

                            setHousingSupportTiers(
                              housingSupportTiers.map(t => 
                                t.id === br.id ? { 
                                  ...t, 
                                  min_salary: min_val, 
                                  max_salary: max_val, 
                                  amount_at_min: amount_min_val, 
                                  amount_at_max: amount_max_val 
                                } : t
                              ).sort((a,b) => a.min_salary - b.min_salary)
                            );
                            setEditHousingTierId(null);
                            showToast('تم تحديث شريحة الدعم بنجاح!', 'success');
                          }}
                          className="p-1 px-2.5 bg-[#0057B8] text-white rounded-lg text-[10px] font-bold"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditHousingTierId(null)}
                          className="p-1 px-2.5 bg-gray-200 text-gray-700 rounded-lg text-[10px]"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-right">
                      <div className="text-gray-500 font-sans">
                        الرواتب من <strong className="text-gray-800 font-mono">{(br.min_salary || 0).toLocaleString('ar-SA')}</strong> إلى 
                        <strong className="text-gray-800 font-mono ml-1">{(br.max_salary || 0) > 90000 ? 'فأكثر' : (br.max_salary || 0).toLocaleString('ar-SA')}</strong> ريال:
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col text-left items-end">
                          <span className="text-emerald-700 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded-lg text-xs">إستيفاء: {br.amount_at_min} ← {br.amount_at_max} ريال</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditHousingTierId(br.id);
                              setHMinSalary(String(br.min_salary || 0));
                              setHMaxSalary(String(br.max_salary || 0));
                              setHAmountMin(String(br.amount_at_min || 0));
                              setHAmountMax(String(br.amount_at_max || 0));
                              setHSortOrder(br.sort_order || 1);
                            }}
                            className="p-1 text-[#0057B8] hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذه الشريحة؟")) {
                                setHousingSupportTiers(housingSupportTiers.filter(t => t.id !== br.id));
                                showToast('تم مسح شريحة الدعم في المسودة.', 'success');
                              }
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DOWNPAYMENT SUBSIDIES */}
        <div className="border border-[#E5E7EB] rounded-2xl p-5 bg-white space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h3 className="font-bold text-xs text-[#111827]">شرائح دعم الدفعة المسبقة (منحة غير مستردة)</h3>
              <p className="text-[10px] text-gray-500 font-medium font-sans">المنحة المباشرة لتكبير أصل الدفعة في نهاية الحسبة.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingAdvance(true);
                setASalaryThreshold('0');
                setAAmount('0');
              }}
              className="p-1 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              شريحة جديدة
            </button>
          </div>

          {isAddingAdvance && (
            <div className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-[11px] text-emerald-950 font-sans">إضافة شريحة دعم دفعة جديدة</h4>
              <div className="grid grid-cols-2 gap-2 text-right">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">عتبة الراتب (أقل من):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={aSalaryThreshold}
                    onChange={(e) => setASalaryThreshold(normalizeNumberInput(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-sans">مبلغ الدعم:</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-center outline-none"
                    value={aAmount}
                    onChange={(e) => setAAmount(normalizeNumberInput(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const threshold_val = parseNumberInput(aSalaryThreshold, NaN);
                    const amt_val = parseNumberInput(aAmount, NaN);

                    if (isNaN(threshold_val) || isNaN(amt_val)) {
                      showToast('الرجاء التأكد من إدخال قيم الشريحة بشكل رقمي صحيح وبدون تركها فارغة.', 'refuse');
                      return;
                    }

                    const newTier: AdvancePaymentTier = {
                      id: `a_tier_${Date.now()}`,
                      salary_threshold: threshold_val,
                      amount: amt_val
                    };
                    setAdvancePaymentTiers([...advancePaymentTiers, newTier].sort((a,b) => a.salary_threshold - b.salary_threshold));
                    setIsAddingAdvance(false);
                    showToast('تمت إضافة شريحة دعم الدفعة في المسودة.', 'success');
                  }}
                  className="p-1 px-3 bg-[#0EA5A4] text-white rounded-lg font-bold cursor-pointer hover:bg-teal-700"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingAdvance(false)}
                  className="p-1 px-3 bg-gray-250 text-gray-750 rounded-lg font-bold cursor-pointer hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 overflow-y-auto max-h-[450px]">
            {advancePaymentTiers?.map((br) => {
              const isEditing = editAdvanceTierId === br.id;
              return (
                <div key={br.id} className="flex justify-between items-center text-xs font-semibold bg-gray-50 p-2.5 rounded-xl border border-[#F1F5F9] text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full text-right" dir="rtl">
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          className="bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                          value={aSalaryThreshold}
                          onChange={(e) => setASalaryThreshold(normalizeNumberInput(e.target.value))}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          className="bg-white border rounded-xl px-1.5 py-0.5 text-xs font-bold text-center outline-none"
                          value={aAmount}
                          onChange={(e) => setAAmount(normalizeNumberInput(e.target.value))}
                        />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const threshold_val = parseNumberInput(aSalaryThreshold, NaN);
                            const amt_val = parseNumberInput(aAmount, NaN);

                            if (isNaN(threshold_val) || isNaN(amt_val)) {
                              showToast('الرجاء التأكد من إدخال قيم الشريحة بشكل رقمي صحيح وبدون تركها فارغة.', 'refuse');
                              return;
                            }

                            setAdvancePaymentTiers(advancePaymentTiers.map(t => t.id === br.id ? { ...t, salary_threshold: threshold_val, amount: amt_val } : t).sort((a,b) => a.salary_threshold - b.salary_threshold));
                            setEditAdvanceTierId(null);
                            showToast('تم حفظ شريحة دعم الدفعة!', 'success');
                          }}
                          className="p-1 px-2.5 bg-[#0057B8] text-white rounded-lg text-[10px] font-bold"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAdvanceTierId(null)}
                          className="p-1 px-2.5 bg-gray-200 text-gray-700 rounded-lg text-[10px]"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-500 font-sans">
                        الرواتب أقل من <strong className="text-gray-800 font-mono">{(br.salary_threshold || 0).toLocaleString('ar-SA')}</strong> ريال:
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#0EA5A4] font-bold font-mono">{(br.amount || 0).toLocaleString('ar-SA')} ريال</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditAdvanceTierId(br.id);
                              setASalaryThreshold(String(br.salary_threshold || 0));
                              setAAmount(String(br.amount || 0));
                            }}
                            className="p-1 text-[#0057B8] hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذه الشريحة؟")) {
                                setAdvancePaymentTiers(advancePaymentTiers.filter(t => t.id !== br.id));
                                showToast('تم مسح الشريحة في المسودة.', 'success');
                              }
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
