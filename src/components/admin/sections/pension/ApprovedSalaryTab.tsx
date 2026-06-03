import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Bank } from '../../../../types';
import { ApprovedSalarySourceRule } from '../../../../types/pension-rules';
import { saveApprovedSalaryRule } from '../../../../lib/pensionDb';
import NumericInput from '../../../calculator/NumericInput';

interface ApprovedSalaryTabProps {
  banks: Bank[];
  dbRulesLoading: boolean;
  approvedSalaryDbRules: ApprovedSalarySourceRule[];
  setApprovedSalaryDbRules: React.Dispatch<React.SetStateAction<ApprovedSalarySourceRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  openHistory: (tableName: string, bankId: string, title: string) => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: Array<'margins' | 'dsr' | 'personal' | 'salary_source' | 'pension'>) => void;
  setShowCopyModal: (show: boolean) => void;
}

export default function ApprovedSalaryTab({
  banks,
  dbRulesLoading,
  approvedSalaryDbRules,
  setApprovedSalaryDbRules,
  showToast,
  openHistory,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal
}: ApprovedSalaryTabProps) {
  const [selectedSalaryBankId, setSelectedSalaryBankId] = useState<string>(banks[0]?.id || '');
  const [editingSalaryRule, setEditingSalaryRule] = useState<ApprovedSalarySourceRule | null>(null);

  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  return (
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
                const customId = prompt("أدخل الرمز التعريفي للقطاع بالإنجليزية (مثال: semi_gov, companies):");
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
              <h3 className="font-extrabold text-sm font-sans text-right w-full">تعديل مصدر الراتب المعتمد</h3>
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
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] outline-none font-mono text-right"
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
  );
}
