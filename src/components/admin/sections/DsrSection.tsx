import React, { useState } from 'react';
import { Bank, DsrRule } from '../../../types';
import { Plus, Edit, ToggleLeft, ToggleRight, Trash2, AlertTriangle } from 'lucide-react';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';
import { getMissingDsrRulesList, getTemplateDsrPercent } from '../../../lib/settings/normalizeDsrRules';

interface DsrSectionProps {
  banks: Bank[];
  dsrRules: DsrRule[];
  setDsrRules: React.Dispatch<React.SetStateAction<DsrRule[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  openHistory: (tableName: string, bankId: string, title: string) => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: Array<'margins' | 'dsr' | 'personal' | 'salary_source' | 'pension'>) => void;
  setShowCopyModal: (show: boolean) => void;
}

export default function DsrSection({
  banks,
  dsrRules,
  setDsrRules,
  showToast,
  openHistory,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal
}: DsrSectionProps) {
  const formBanksList = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  const missingRules = getMissingDsrRulesList(banks, dsrRules);
  const hasMissing = missingRules.length > 0;

  const handleAddMissingFromTemplate = () => {
    const newlyAddedRules: DsrRule[] = missingRules.map((m, idx) => ({
      id: `dsr_rule_gen_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      bankId: m.bankId,
      productType: m.productType as any,
      supportType: m.supportType as any,
      customerStage: m.customerStage as any,
      dsrPercent: getTemplateDsrPercent(m.productType, m.supportType, m.customerStage),
      deductExistingObligations: true,
      active: true
    }));

    setDsrRules(prev => [...prev, ...newlyAddedRules]);
    showToast(`تمت إضافة ${newlyAddedRules.length} من القواعد الناقصة بنجاح! يرجى مراجعتها وتأكيد حفظ الإعدادات بالأسفل لاعتمادها بشكل دائم.`, 'success');
  };

  const [filterDsrBank, setFilterDsrBank] = useState<string>('rajhi');
  const [filterDsrProduct, setFilterDsrProduct] = useState<string>('all');
  const [filterDsrSupport, setFilterDsrSupport] = useState<string>('all');
  const [filterDsrStage, setFilterDsrStage] = useState<string>('all');
  const [filterDsrStatus, setFilterDsrStatus] = useState<string>('all');

  const [isDsrModalOpen, setIsDsrModalOpen] = useState(false);
  const [editingDsrRule, setEditingDsrRule] = useState<DsrRule | null>(null);

  // Form states for adding/editing a DSR Rule
  const [formDsrBankId, setFormDsrBankId] = useState<string>('rajhi');
  const [formDsrProductType, setFormDsrProductType] = useState<'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only'>('real_estate_only');
  const [formDsrSupportType, setFormDsrSupportType] = useState<'none' | 'monthly' | 'downpayment' | 'not_applicable'>('none');
  const [formDsrCustomerStage, setFormDsrCustomerStage] = useState<'active_before_retirement' | 'retired_after_retirement'>('active_before_retirement');
  const [formDsrPercentStr, setFormDsrPercentStr] = useState<string>('');
  const [formDsrDeductExisting, setFormDsrDeductExisting] = useState<boolean>(true);
  const [formDsrActive, setFormDsrActive] = useState<boolean>(true);
  const [formDsrError, setFormDsrError] = useState<string>('');

  const DSR_BANKS = banks.map(b => ({ id: b.id, nameAr: b.nameAr }));

  const DSR_SUPPORT_TYPES = [
    { id: 'none', nameAr: 'غير مدعوم' },
    { id: 'monthly', nameAr: 'دعم شهري' },
    { id: 'downpayment', nameAr: 'دعم دفعة' },
    { id: 'not_applicable', nameAr: 'غير مطبق' }
  ];

  const DSR_CUSTOMER_STAGES = [
    { id: 'active_before_retirement', nameAr: 'موظف نشط (قبل التقاعد)' },
    { id: 'retired_after_retirement', nameAr: 'متقاعد (بعد التقاعد)' }
  ];

  const getProductTypeName = (type: string) => {
    switch (type) {
      case 'real_estate_only': return 'عقاري فقط';
      case 'real_estate_with_new_personal': return 'عقاري + شخصي جديد';
      case 'real_estate_with_existing_personal': return 'عقاري مع شخصي قائم';
      case 'personal_only': return 'شخصي فقط';
      default: return type;
    }
  };

  const handleOpenAddDsrModal = () => {
    setEditingDsrRule(null);
    setFormDsrBankId(filterDsrBank);
    setFormDsrProductType('real_estate_only');
    setFormDsrSupportType('none');
    setFormDsrCustomerStage('active_before_retirement');
    setFormDsrPercentStr('');
    setFormDsrDeductExisting(true);
    setFormDsrActive(true);
    setFormDsrError('');
    setIsDsrModalOpen(true);
  };

  const handleOpenEditDsrModal = (rule: DsrRule) => {
    setEditingDsrRule(rule);
    setFormDsrBankId(rule.bankId);
    setFormDsrProductType(rule.productType || 'real_estate_only');
    setFormDsrSupportType(rule.supportType as any);
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
    const targetRule = dsrRules.find(r => r.id === id);
    if (targetRule && !targetRule.active) {
      // Ensure no active duplicate exists with same bankId + productType + supportType + customerStage
      const duplicateExists = dsrRules.some(
        r => r.id !== id &&
             r.bankId === targetRule.bankId &&
             r.productType === targetRule.productType &&
             r.supportType === targetRule.supportType &&
             r.customerStage === targetRule.customerStage &&
             r.active
      );
      if (duplicateExists) {
        showToast('خطأ: تكرار غير مسموح. توجد قاعدة أخرى نشطة بنفس المفتاح لهذه الجهة التمويلية والمنتج.', 'refuse');
        return;
      }
    }
    setDsrRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    showToast('تم تحديث حالة تفعيل القاعدة بنجاح!', 'success');
  };

  const handleSaveDsrForm = () => {
    const val = parseNumberInput(formDsrPercentStr, -1);
    if (isNaN(val) || val < 0 || val > 100) {
      setFormDsrError('يرجى إدخال نسبة استقطاع صحيحة بين 0 و 100 %');
      return;
    }

    const finalProductType = formDsrProductType || 'real_estate_only';
    const finalSupportType = finalProductType === 'personal_only' ? 'not_applicable' : formDsrSupportType;
    const ruleId = editingDsrRule ? editingDsrRule.id : `dsr_rule_${Date.now()}`;

    // Validate that no active duplicate will exist
    if (formDsrActive) {
      const duplicateExists = dsrRules.some(
        r => r.id !== ruleId &&
             r.bankId === formDsrBankId &&
             r.productType === finalProductType &&
             r.supportType === finalSupportType &&
             r.customerStage === formDsrCustomerStage &&
             r.active
      );
      if (duplicateExists) {
        setFormDsrError('خطأ تكرار: توجد بالفعل قاعدة أخرى مسجلة ونشطة لمزيج (البنك + المنتج + الدعم + المرحلة). لا يُسمح بأكثر من قاعدة نشطة للمفتاح نفسه.');
        return;
      }
    }

    const newRule: DsrRule = {
      id: ruleId,
      bankId: formDsrBankId,
      productType: finalProductType,
      supportType: finalSupportType,
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

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9] pb-4 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#111827]">حدود الاستقطاع ونسب DSR</h2>
          <p className="text-xs text-[#6B7280] mt-1">ضبط الحد الأعلى للاستقطاع حسب البنك والمنتج والدعم ومرحلة العميل.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddDsrModal}
          className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start font-sans"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قاعدة DSR</span>
        </button>
      </div>

      {hasMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-right" id="missing-dsr-rules-banner">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-extrabold text-amber-900">توجد قواعد DSR ناقصة لهذا المنتج/الدعم/المرحلة</h4>
              <p className="text-xs text-amber-705 mt-1.5 leading-relaxed">
                توجد {missingRules.length} قاعدة (قواعد) استقطاع DSR غير معرفة في لوحة التحكم لبعض المنتجات أو الجهات التمويلية. عدم وجود هذه القواعد يعطل دقة محاكاة الحساب الائتماني. يمكنك إضافة القواعد الناقصة تلقائياً بنسبة استقطاع افتراضية ثم حفظ الإعدادات.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddMissingFromTemplate}
            className="px-4.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap self-start md:self-center font-sans border-0 outline-none"
          >
            إضافة القواعد الناقصة من القالب
          </button>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-sans">
        <span className="text-xs font-bold text-slate-700">عمليات سريعة للبنك المحدد:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCopyTargetBank(filterDsrBank);
              setCopySourceBank('');
              setCopySections(['dsr']);
              setShowCopyModal(true);
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-[#0057B8] rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📋 نسخ إعدادات من بنك آخر
          </button>
          <button
            type="button"
            onClick={() => {
              openHistory('dsr_rules', filterDsrBank, `سجل تغييرات نسب الاستقطاع DSR — ${formBanksList.find(b => b.id === filterDsrBank)?.nameAr || filterDsrBank}`);
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📜 سجل التغييرات
          </button>
        </div>
      </div>

      {/* Bank Navigation Tabs for DSR */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-gray-500 block mb-1 font-sans">اختر البنك لضبط حدود الاستقطاع DSR:</span>
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3 font-sans">
          {banks.map((b) => {
            const isSelected = filterDsrBank === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setFilterDsrBank(b.id)}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0057B8] text-white shadow-md' 
                    : 'bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 hover:border-gray-300'
                }`}
              >
                {b.nameAr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs font-bold font-sans text-gray-700">
        <div>
          <label className="block text-slate-500 mb-1.5 font-sans">المنتج والتمويل:</label>
          <select
            value={filterDsrProduct}
            onChange={(e) => setFilterDsrProduct(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800 outline-none"
          >
            <option value="all">الكل (All Products)</option>
            <option value="real_estate_only">عقاري فقط</option>
            <option value="real_estate_with_new_personal">عقاري + شخصي جديد</option>
            <option value="real_estate_with_existing_personal">عقاري مع شخصي قائم</option>
            <option value="personal_only">شخصي فقط</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1.5 font-sans">نوع الدعم:</label>
          <select
            value={filterDsrSupport}
            onChange={(e) => setFilterDsrSupport(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800 outline-none"
          >
            <option value="all">الكل (All Support)</option>
            {DSR_SUPPORT_TYPES.map(s => (
              <option key={s.id} value={s.id}>{s.nameAr}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1.5 font-sans">المرحلة:</label>
          <select
            value={filterDsrStage}
            onChange={(e) => setFilterDsrStage(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800 outline-none"
          >
            <option value="all">الكل (All Stages)</option>
            {DSR_CUSTOMER_STAGES.map(st => (
              <option key={st.id} value={st.id}>{st.nameAr}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1.5 font-sans">الدورة / الحالة:</label>
          <select
            value={filterDsrStatus}
            onChange={(e) => setFilterDsrStatus(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0057B8] text-right font-semibold text-gray-800 outline-none"
          >
            <option value="all">الكل (All Statuses)</option>
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
                <th scope="col" className="px-6 py-4 text-right font-sans">البنك</th>
                <th scope="col" className="px-6 py-4 text-right font-sans">المنتج والتمويل</th>
                <th scope="col" className="px-6 py-4 text-right font-sans">نوع الدعم</th>
                <th scope="col" className="px-6 py-4 text-right font-sans">مرحلة العميل</th>
                <th scope="col" className="px-6 py-4 text-center font-sans">نسبة الاستقطاع %</th>
                <th scope="col" className="px-6 py-4 text-center font-sans">خصم الالتزامات القائمة</th>
                <th scope="col" className="px-6 py-4 text-center font-sans">الحالة</th>
                <th scope="col" className="px-6 py-4 text-center font-sans">الإجراءات</th>
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
                  const matchedSupport = DSR_SUPPORT_TYPES.find(s => s.id === rule.supportType);
                  const matchedStage = DSR_CUSTOMER_STAGES.find(st => st.id === rule.customerStage);

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 font-sans">
                        {matchedBank ? matchedBank.nameAr : rule.bankId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-800 font-sans">
                        {getProductTypeName(rule.productType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans ${
                          rule.supportType === 'monthly'
                            ? 'bg-blue-50 text-blue-700'
                            : rule.supportType === 'downpayment'
                            ? 'bg-amber-50 text-amber-700'
                            : rule.supportType === 'not_applicable'
                            ? 'bg-purple-50 text-purple-700'
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
                            onClick={() => handleOpenEditDsrModal(rule)}
                            className="p-1 px-2 border border-gray-200 rounded-lg hover:bg-slate-50 hover:text-[#0057B8] text-gray-500 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-55 w-full max-w-xl bg-white rounded-3xl text-right overflow-hidden shadow-2xl border border-gray-100 font-sans" dir="rtl">
            <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">
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
                <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold text-right">
                  ⚠️ {formDsrError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Select */}
                <div className="space-y-1.5 text-right">
                  <label className="block text-xs font-bold text-gray-600">البنك:</label>
                  <select
                    value={formDsrBankId}
                    onChange={(e) => setFormDsrBankId(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none outline-none"
                  >
                    {DSR_BANKS.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Product Type Select */}
                <div className="space-y-1.5 text-right">
                  <label className="block text-xs font-bold text-gray-600">المنتج والتمويل:</label>
                  <select
                    value={formDsrProductType}
                    onChange={(e) => {
                      const selectedProd = e.target.value as any;
                      setFormDsrProductType(selectedProd);
                      if (selectedProd === 'personal_only') {
                        setFormDsrSupportType('not_applicable');
                      } else if (formDsrSupportType === 'not_applicable') {
                        setFormDsrSupportType('none');
                      }
                    }}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none outline-none"
                  >
                    <option value="real_estate_only">عقاري فقط</option>
                    <option value="real_estate_with_new_personal">عقاري + شخصي جديد</option>
                    <option value="real_estate_with_existing_personal">عقاري مع شخصي قائم</option>
                    <option value="personal_only">شخصي فقط</option>
                  </select>
                </div>

                {/* Support Type Select */}
                {formDsrProductType !== 'personal_only' ? (
                  <div className="space-y-1.5 text-right font-sans">
                    <label className="block text-xs font-bold text-gray-600">نوع الدعم السكني:</label>
                    <select
                      value={formDsrSupportType}
                      onChange={(e) => setFormDsrSupportType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none outline-none"
                    >
                      {DSR_SUPPORT_TYPES.filter(s => s.id !== 'not_applicable').map(s => (
                        <option key={s.id} value={s.id}>{s.nameAr}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-right font-sans opacity-50">
                    <label className="block text-xs font-bold text-gray-400">نوع الدعم السكني:</label>
                    <div className="w-full bg-slate-100 border border-gray-250 rounded-xl px-3 py-2.5 text-xs text-gray-500 font-semibold mb-1">
                      غير مطبق (تمويل شخصي فقط)
                    </div>
                  </div>
                )}

                {/* Customer Stage Select */}
                <div className="space-y-1.5 text-right flex flex-col justify-end">
                  <label className="block text-xs font-bold text-gray-600">مرحلة العميل:</label>
                  <select
                    value={formDsrCustomerStage}
                    onChange={(e) => setFormDsrCustomerStage(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none outline-none"
                  >
                    {DSR_CUSTOMER_STAGES.map(st => (
                      <option key={st.id} value={st.id}>{st.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* DSR percentage Text Input */}
                <div className="space-y-1.5 text-right">
                  <label className="block text-xs font-bold text-gray-600">نسبة الاستقطاع %:</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={formDsrPercentStr}
                    onChange={(e) => setFormDsrPercentStr(normalizeNumberInput(e.target.value))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 text-left font-mono"
                    placeholder="مثال: 55 أو 33.33"
                  />
                </div>

                {/* Deduct obligations switch */}
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
                    <span className="text-xs font-bold text-gray-600 font-sans">
                      {formDsrDeductExisting ? 'نعم (يتم خصمها)' : 'لا (تستبعد من الحسبة)'}
                    </span>
                  </div>
                </div>

                {/* Active switch */}
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
                    <span className="text-xs font-bold text-gray-600 font-sans">
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
      )}
    </div>
  );
}
