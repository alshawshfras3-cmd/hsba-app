import React, { useState } from 'react';
import { Bank, TermRule, SectorId } from '../../../types';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

interface TermsSectionProps {
  banks: Bank[];
  termRules: TermRule[];
  setTermRules: React.Dispatch<React.SetStateAction<TermRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export default function TermsSection({
  banks,
  termRules,
  setTermRules,
  showToast
}: TermsSectionProps) {
  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));
  const [termActiveBankId, setTermActiveBankId] = useState<string>(banks[0]?.id || 'rajhi');

  // Modal / Form States
  const [isAddingTermRule, setIsAddingTermRule] = useState(false);
  const [editingTermRule, setEditingTermRule] = useState<TermRule | null>(null);
  const [editingTermRuleIndex, setEditingTermRuleIndex] = useState<number | null>(null);

  const [termRuleFormSectorId, setTermRuleFormSectorId] = useState<SectorId | 'all'>('gov_civil');
  const [termRuleFormMaxTermMonths, setTermRuleFormMaxTermMonths] = useState('240');
  const [termRuleFormMaxAgeAtEnd, setTermRuleFormMaxAgeAtEnd] = useState('77');
  const [termRuleFormCalendarType, setTermRuleFormCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
  const [termRuleFormAllowAfterRetirement, setTermRuleFormAllowAfterRetirement] = useState(true);
  const [termRuleFormAllowedMonthsAfterRetirement, setTermRuleFormAllowedMonthsAfterRetirement] = useState('204');
  const [termRuleFormMinTermMonths, setTermRuleFormMinTermMonths] = useState('60');
  const [termRuleFormIsActive, setTermRuleFormIsActive] = useState(true);
  const [termRuleFormMilitarySubType, setTermRuleFormMilitarySubType] = useState<'officer' | 'enlisted' | 'all'>('all');

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 mb-6 shadow-xs font-sans text-right" dir="rtl">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">مدد التمويل والحدود الائتمانية للأعمار</h2>
          <p className="text-xs text-[#6B7280] mt-1">اضبط الحدود القصوى والدنيا لمدد التمويل بالأشهر ومحاذاة نهاية عمر العميل الائتماني وشروط سداد المتقاعدين في كل جهة تمويلية.</p>
        </div>
      </div>

      {/* 2. CHOOSE BANK TAB */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 rounded-2xl p-5 border border-gray-100 font-sans text-right" dir="rtl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700">جهة التمويل المستهدفة للحدود:</span>
          <select
            value={termActiveBankId}
            onChange={(e) => setTermActiveBankId(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#0057B8]"
          >
            {formBanksList.map(b => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddingTermRule(true);
            setEditingTermRule(null);
            setEditingTermRuleIndex(null);
            
            // Set defaults
            setTermRuleFormSectorId('gov_civil');
            setTermRuleFormMaxTermMonths('240');
            setTermRuleFormMaxAgeAtEnd('77');
            setTermRuleFormCalendarType(termActiveBankId === 'rajhi' ? 'hijri' : 'gregorian');
            setTermRuleFormAllowAfterRetirement(true);
            setTermRuleFormAllowedMonthsAfterRetirement('204');
            setTermRuleFormMinTermMonths('60');
            setTermRuleFormIsActive(true);
            setTermRuleFormMilitarySubType('all');
          }}
          className="inline-flex items-center gap-1 px-4 py-2.5 bg-[#0057B8] text-white hover:bg-[#004bb0] rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <span>+ إضافة قاعدة قطاع جديدة</span>
        </button>
      </div>

      {/* 3. TABLE OF TERM RULES */}
      <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs" dir="rtl">
        <table className="min-w-full divide-y divide-gray-200 text-right font-sans">
          <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-4 text-right">القطاع</th>
              <th scope="col" className="px-6 py-4 text-right">أقصى مدة</th>
              <th scope="col" className="px-6 py-4 text-right">أقصى عمر عند النهاية</th>
              <th scope="col" className="px-6 py-4 text-right">نوع التقويم</th>
              <th scope="col" className="px-6 py-4 text-right">سماح بعد التقاعد</th>
              <th scope="col" className="px-6 py-4 text-right">أشهر السماح</th>
              <th scope="col" className="px-6 py-4 text-right">أقل مدة</th>
              <th scope="col" className="px-6 py-4 text-right">الحالة</th>
              <th scope="col" className="px-6 py-4 text-right">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-700">
            {(() => {
              const filteredRules = termRules.filter(r => r.bankId === termActiveBankId);
              if (filteredRules.length === 0) {
                return (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-medium text-xs font-sans">
                      لا توجد قواعد مدة وحدود مسجلة لهذا البنك حالياً. اضغط على "+ إضافة قاعدة قطاع" لإنشاء أول قاعدة في المسودة.
                    </td>
                  </tr>
                );
              }

              return filteredRules.map((r, index) => {
                const absoluteIndex = termRules.findIndex(item => item === r);
                
                const sectorLabels: Record<string, string> = {
                  gov_civil: 'حكومي مدني',
                  military: 'عسكري',
                  semi_gov: 'شبه حكومي',
                  companies: 'موظف شركات',
                  retired: 'متقاعد',
                  all: 'الكل / عام'
                };

                const isMilitary = r.sectorId === 'military';
                const isRetired = r.sectorId === 'retired';

                let sectorName = sectorLabels[r.sectorId] || r.sectorId;
                if (isMilitary) {
                  const subLabel = r.militarySubType === 'officer' ? 'ضباط' : r.militarySubType === 'enlisted' ? 'أفراد' : 'الكل';
                  sectorName = `عسكري (${subLabel})`;
                }

                return (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span>{sectorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">{r.maxTermMonths} شهر</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">{r.maxAgeAtEnd} سنة</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs text-right">
                      {r.calendarType === 'hijri' ? 'هجري' : 'ميلادي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isRetired ? (
                        <span className="text-gray-400 font-sans">—</span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          r.allowAfterRetirement 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {r.allowAfterRetirement ? 'نعم' : 'لا'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                      {isMilitary ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">ديناميكي</span>
                      ) : isRetired ? (
                        <span className="text-gray-400 font-sans">—</span>
                      ) : (
                        r.allowAfterRetirement ? `${r.allowedMonthsAfterRetirement} شهر` : '0'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500 text-xs">{r.minTermMonths || 60} شهر</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        r.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {r.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTermRule(r);
                            setEditingTermRuleIndex(absoluteIndex);
                            setIsAddingTermRule(false);
                            
                            // Prepopulate
                            setTermRuleFormSectorId(r.sectorId);
                            setTermRuleFormMaxTermMonths(r.maxTermMonths.toString());
                            setTermRuleFormMaxAgeAtEnd(r.maxAgeAtEnd.toString());
                            setTermRuleFormCalendarType(r.calendarType);
                            setTermRuleFormAllowAfterRetirement(r.allowAfterRetirement);
                            setTermRuleFormAllowedMonthsAfterRetirement(r.allowedMonthsAfterRetirement.toString());
                            setTermRuleFormMinTermMonths((r.minTermMonths || 60).toString());
                            setTermRuleFormIsActive(r.isActive);
                            setTermRuleFormMilitarySubType(r.militarySubType || 'all');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E5E7EB] hover:border-[#0057B8] text-[#0057B8] hover:bg-[#0057B8]/5 rounded-lg transition-all font-bold text-[11px] cursor-pointer"
                        >
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف قاعدة هذا القطاع؟')) {
                              const updated = [...termRules];
                              updated.splice(absoluteIndex, 1);
                              setTermRules(updated);
                              showToast("تم حذف قاعدة مدة القطاع بنجاح في المسودة.", "success");
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-rose-100 hover:border-rose-500 text-rose-600 hover:bg-rose-50 rounded-lg transition-all font-bold text-[11px] cursor-pointer"
                        >
                          <span>حذف</span>
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

      {/* 4. MODAL FOR ADDING/EDITING TERM RULE */}
      {(isAddingTermRule || editingTermRule) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 w-full max-w-md shadow-2xl animate-fade-in text-right font-sans" dir="rtl">
            <h3 className="text-sm font-extrabold text-[#111827] border-b border-gray-100 pb-3 mb-5">
              {isAddingTermRule ? '+ إضافة قاعدة قطاع جديدة' : 'تعديل قاعدة مدد التمويل'}
            </h3>

            <div className="space-y-4 text-right">
              {/* Bank Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">اسم البنك:</label>
                <input
                  type="text"
                  disabled
                  value={formBanksList.find(b => b.id === termActiveBankId)?.nameAr || termActiveBankId}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 text-xs font-bold cursor-not-allowed text-right focus:outline-none"
                />
              </div>

              {/* Sector select */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">القطاع:</label>
                <select
                  value={termRuleFormSectorId}
                  onChange={(e) => setTermRuleFormSectorId(e.target.value as SectorId | 'all')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right outline-none"
                >
                  <option value="gov_civil">💼 حكومي مدني</option>
                  <option value="military">🪖 عسكري</option>
                  <option value="semi_gov">🏢 شبه حكومي</option>
                  <option value="companies">🏢 موظف شركات</option>
                  <option value="retired">👴 متقاعد</option>
                  <option value="all">🌍 الكل / عام (احتياطي)</option>
                </select>
              </div>

              {/* Military SubType Select */}
              {termRuleFormSectorId === 'military' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">تصنيف العسكري:</label>
                  <select
                    value={termRuleFormMilitarySubType}
                    onChange={(e) => setTermRuleFormMilitarySubType(e.target.value as 'officer' | 'enlisted' | 'all')}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right outline-none"
                  >
                    <option value="all">👨‍✈️ الكل</option>
                    <option value="officer">👮‍♂️ ضباط</option>
                    <option value="enlisted">💂‍♂️ أفراد</option>
                  </select>
                </div>
              )}

              {/* Max Term Months */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">أقصى مدة تمويل بالأشهر:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={termRuleFormMaxTermMonths}
                  onChange={(e) => {
                    const val = normalizeNumberInput(e.target.value);
                    setTermRuleFormMaxTermMonths(val);
                  }}
                  placeholder="مثال: 360"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right font-mono"
                />
              </div>

              {/* Max Age At End */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">أقصى عمر عند نهاية التمويل:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={termRuleFormMaxAgeAtEnd}
                  onChange={(e) => {
                    const val = normalizeNumberInput(e.target.value);
                    setTermRuleFormMaxAgeAtEnd(val);
                  }}
                  placeholder="مثال: 77"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right font-mono"
                />
              </div>

              {/* Calendar Type */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2">نوع التقويم:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTermRuleFormCalendarType('hijri')}
                    className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      termRuleFormCalendarType === 'hijri'
                        ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8] font-bold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    هجري
                  </button>
                  <button
                    type="button"
                    onClick={() => setTermRuleFormCalendarType('gregorian')}
                    className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      termRuleFormCalendarType === 'gregorian'
                        ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8] font-bold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    ميلادي
                  </button>
                </div>
              </div>

              {/* Is Post Retirement Allowed (unless isRetired) */}
              {termRuleFormSectorId !== 'retired' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-2">السماح بعد التقاعد:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTermRuleFormAllowAfterRetirement(true)}
                        className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          termRuleFormAllowAfterRetirement
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-850 font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTermRuleFormAllowAfterRetirement(false);
                          setTermRuleFormAllowedMonthsAfterRetirement('0');
                        }}
                        className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          !termRuleFormAllowAfterRetirement
                            ? 'border-rose-600 bg-rose-50 text-rose-850 font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        لا
                      </button>
                    </div>
                  </div>

                  {/* Months After Retirement */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">أشهر السماح بعد التقاعد:</label>
                    {termRuleFormSectorId === 'military' ? (
                      <div className="w-full bg-amber-50/70 text-right border border-amber-100 rounded-xl px-4 py-2.5 text-[10px] font-bold text-amber-805 leading-snug">
                        🛡️ يتم حساب أشهر السماح لقطاع العسكري ديناميكياً = (أقصى عمر − سن تقاعد الرتبة) × 12.
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        disabled={!termRuleFormAllowAfterRetirement}
                        value={termRuleFormAllowedMonthsAfterRetirement}
                        onChange={(e) => {
                          if (!termRuleFormAllowAfterRetirement) return;
                          const val = normalizeNumberInput(e.target.value);
                          setTermRuleFormAllowedMonthsAfterRetirement(val);
                        }}
                        placeholder="مثال: 204"
                        className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none text-right font-mono ${
                          termRuleFormAllowAfterRetirement 
                            ? 'bg-white border-gray-200 focus:ring-2 focus:ring-[#0057B8] text-gray-800' 
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Min Term Months */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">أقل مدة تمويل بالأشهر:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={termRuleFormMinTermMonths}
                  onChange={(e) => {
                    const val = normalizeNumberInput(e.target.value);
                    setTermRuleFormMinTermMonths(val);
                  }}
                  placeholder="مثال: 60"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right font-mono"
                />
              </div>

              {/* Active State */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2">الحالة:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTermRuleFormIsActive(true)}
                    className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      termRuleFormIsActive
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-850 font-bold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    مفعل
                  </button>
                  <button
                    type="button"
                    onClick={() => setTermRuleFormIsActive(false)}
                    className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      !termRuleFormIsActive
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
                onClick={() => {
                  setIsAddingTermRule(false);
                  setEditingTermRule(null);
                  setEditingTermRuleIndex(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const maxTermVal = Math.round(parseNumberInput(termRuleFormMaxTermMonths, 0));
                  const maxAgeVal = Math.round(parseNumberInput(termRuleFormMaxAgeAtEnd, 0));
                  const minTermVal = Math.round(parseNumberInput(termRuleFormMinTermMonths, 0));
                  const isMil = termRuleFormSectorId === 'military';
                  const postRetVal = isMil ? 120 : (Math.round(parseNumberInput(termRuleFormAllowedMonthsAfterRetirement, 0)) || 0);

                  if (isNaN(maxTermVal) || maxTermVal <= 0) {
                    alert("يرجى إدخال أقصى مدة تمويل صحيحة");
                    return;
                  }
                  if (isNaN(maxAgeVal) || maxAgeVal <= 0) {
                    alert("يرجى إدخال أقصى عمر صحيح");
                    return;
                  }
                  if (isNaN(minTermVal) || minTermVal <= 0) {
                    alert("يرجى إدخال أقل مدة تمويل صحيحة");
                    return;
                  }

                  if (isAddingTermRule) {
                    // Check duplicate
                    const duplicate = termRules.some(r => 
                      r.bankId === termActiveBankId && 
                      r.sectorId === termRuleFormSectorId &&
                      (termRuleFormSectorId !== 'military' || (r.militarySubType || 'all') === termRuleFormMilitarySubType)
                    );
                    if (duplicate) {
                      alert("هناك قاعدة مسجلة بالفعل لهذا القطاع والتصنيف وتحت هذا البنك. يرجى تعديلها بدلاً من إضافة مكرر.");
                      return;
                    }

                    const newRule: TermRule = {
                      bankId: termActiveBankId,
                      sectorId: termRuleFormSectorId as SectorId,
                      militarySubType: termRuleFormSectorId === 'military' ? termRuleFormMilitarySubType : undefined,
                      rankId: termRuleFormSectorId === 'military' && termRuleFormMilitarySubType !== 'all' ? termRuleFormMilitarySubType : 'all',
                      productId: 'real_estate',
                      supportType: 'all',
                      maxTermMonths: maxTermVal,
                      maxAgeAtEnd: maxAgeVal,
                      minTermMonths: minTermVal,
                      allowAfterRetirement: termRuleFormSectorId === 'retired' ? false : termRuleFormAllowAfterRetirement,
                      allowedMonthsAfterRetirement: termRuleFormSectorId === 'retired' ? 0 : postRetVal,
                      calendarType: termRuleFormCalendarType,
                      defaultTermMode: 'max',
                      isActive: termRuleFormIsActive
                    };

                    setTermRules([...termRules, newRule]);
                    setIsAddingTermRule(false);
                    showToast("تم إضافة قاعدة قطاع جديدة بنجاح في المسودة.", "success");
                  } else if (editingTermRuleIndex !== null) {
                    const updated = [...termRules];
                    updated[editingTermRuleIndex] = {
                      ...updated[editingTermRuleIndex],
                      sectorId: termRuleFormSectorId as SectorId,
                      militarySubType: termRuleFormSectorId === 'military' ? termRuleFormMilitarySubType : undefined,
                      rankId: termRuleFormSectorId === 'military' && termRuleFormMilitarySubType !== 'all' ? termRuleFormMilitarySubType : 'all',
                      maxTermMonths: maxTermVal,
                      maxAgeAtEnd: maxAgeVal,
                      minTermMonths: minTermVal,
                      allowAfterRetirement: termRuleFormSectorId === 'retired' ? false : termRuleFormAllowAfterRetirement,
                      allowedMonthsAfterRetirement: termRuleFormSectorId === 'retired' ? 0 : postRetVal,
                      calendarType: termRuleFormCalendarType,
                      isActive: termRuleFormIsActive
                    };

                    setTermRules(updated);
                    setEditingTermRule(null);
                    setEditingTermRuleIndex(null);
                    showToast("تم تطبيق التعديلات بنجاح في المسودة.", "success");
                  }
                }}
                className="px-5 py-2 bg-[#0057B8] text-white hover:bg-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                تطبيق القاعدة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
