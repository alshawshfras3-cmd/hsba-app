import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Filter, CheckCircle2, XCircle, AlertCircle, 
  HelpCircle, Search, Briefcase, Building2, Coins, RefreshCw, ChevronDown, ChevronUp, Save, Eye, ClipboardList
} from 'lucide-react';
import { Bank } from '../../../types';
import { 
  ConfirmedBankCase, 
  listConfirmedCases, 
  createConfirmedCase, 
  updateConfirmedCase, 
  deleteConfirmedCase, 
  getConfirmedCasesStats,
  ConfirmedCasesFilter
} from '../../../lib/confirmedCasesService';

interface ConfirmedCasesSectionProps {
  banks: Bank[];
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

const productTypesList = [
  { id: 'real_estate_only', nameAr: 'عقاري فقط' },
  { id: 'personal_only', nameAr: 'شخصي فقط' },
  { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
  { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
];

const sectorsList = [
  { id: 'gov_civil', nameAr: 'حكومي مدني' },
  { id: 'semi_gov', nameAr: 'شبه حكومي' },
  { id: 'companies', nameAr: 'قطاع خاص' },
  { id: 'military', nameAr: 'عسكري' },
  { id: 'retired', nameAr: 'متقاعد' }
];

const supportTypesList = [
  { id: 'monthly_support', nameAr: 'دعم شهري ثابت' },
  { id: 'lump_sum_support', nameAr: 'باقة دفعة مسبقة (100ألف/150ألف)' },
  { id: 'no_support', nameAr: 'بدون دعم سكني' }
];

export const ConfirmedCasesSection: React.FC<ConfirmedCasesSectionProps> = ({ banks, showToast }) => {
  const [cases, setCases] = useState<ConfirmedBankCase[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, conditional: 0, needs_review: 0 });
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  // Filters State
  const [filterBank, setFilterBank] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterEmployer, setFilterEmployer] = useState('');
  const [filterSalaryBank, setFilterSalaryBank] = useState('');

  // Form Fields State
  const [caseCode, setCaseCode] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [bankId, setBankId] = useState('');
  const [productType, setProductType] = useState('real_estate_only');
  const [supportType, setSupportType] = useState('no_support');
  const [employmentSector, setEmploymentSector] = useState('gov_civil');
  const [employerName, setEmployerName] = useState('');
  const [salaryBankId, setSalaryBankId] = useState('');
  const [manualSalaryTransfer, setManualSalaryTransfer] = useState<boolean | null>(null); // null means auto-compute
  const [salaryAmount, setSalaryAmount] = useState('');
  const [obligationsAmount, setObligationsAmount] = useState('');
  const [systemResultAmount, setSystemResultAmount] = useState('');
  const [systemInstallmentAmount, setSystemInstallmentAmount] = useState('');
  const [actualBankAmount, setActualBankAmount] = useState('');
  const [actualInstallmentAmount, setActualInstallmentAmount] = useState('');
  const [actualStatus, setActualStatus] = useState<'approved' | 'rejected' | 'conditional' | 'needs_review'>('approved');
  const [decisionReason, setDecisionReason] = useState('');
  const [conditionsText, setConditionsText] = useState(''); // Comma or newline separated
  const [notes, setNotes] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isVerified, setIsVerified] = useState(true);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const filters: ConfirmedCasesFilter = {};
      if (filterBank) filters.bank_id = filterBank;
      if (filterStatus) filters.actual_status = filterStatus;
      if (filterSector) filters.employment_sector = filterSector;
      if (filterEmployer) filters.employer_name = filterEmployer;
      if (filterSalaryBank) filters.salary_bank_id = filterSalaryBank;

      const data = await listConfirmedCases(filters);
      setCases(data);

      const computedStats = await getConfirmedCasesStats();
      setStats(computedStats);
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء تحميل الحالات المؤكدة', 'refuse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterBank, filterStatus, filterSector, filterEmployer, filterSalaryBank]);

  // Handle Form clear
  const resetFormFields = () => {
    setEditingCaseId(null);
    setCaseCode('');
    setCustomerLabel('');
    setBankId(banks[0]?.id || '');
    setProductType('real_estate_only');
    setSupportType('no_support');
    setEmploymentSector('gov_civil');
    setEmployerName('');
    setSalaryBankId(banks[0]?.id || '');
    setManualSalaryTransfer(null);
    setSalaryAmount('');
    setObligationsAmount('');
    setSystemResultAmount('');
    setSystemInstallmentAmount('');
    setActualBankAmount('');
    setActualInstallmentAmount('');
    setActualStatus('approved');
    setDecisionReason('');
    setConditionsText('');
    setNotes('');
    setConfidenceLevel('medium');
    setIsVerified(true);
  };

  const handleEditInit = (item: ConfirmedBankCase) => {
    setEditingCaseId(item.id || null);
    setCaseCode(item.case_code || '');
    setCustomerLabel(item.customer_label || '');
    setBankId(item.bank_id || '');
    setProductType(item.product_type || 'real_estate_only');
    setSupportType(item.support_type || 'no_support');
    setEmploymentSector(item.employment_sector || 'gov_civil');
    setEmployerName(item.employer_name || '');
    setSalaryBankId(item.salary_bank_id || '');
    setManualSalaryTransfer(item.is_salary_transferred_to_same_bank);
    setSalaryAmount(item.salary_amount?.toString() || '');
    setObligationsAmount(item.obligations_amount?.toString() || '');
    setSystemResultAmount(item.system_result_amount?.toString() || '');
    setSystemInstallmentAmount(item.system_installment_amount?.toString() || '');
    setActualBankAmount(item.actual_bank_amount?.toString() || '');
    setActualInstallmentAmount(item.actual_installment_amount?.toString() || '');
    setActualStatus(item.actual_status || 'approved');
    setDecisionReason(item.decision_reason || '');
    setConditionsText(item.conditions?.join('\n') || '');
    setNotes(item.notes || '');
    setConfidenceLevel(item.confidence_level || 'medium');
    setIsVerified(item.is_verified !== false);

    setIsFormOpen(true);
    // Smooth scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, code?: string | null) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذه الحالة الفعلية المؤكدة؟ ${code ? `(كود: ${code})` : ''}`)) {
      return;
    }

    try {
      await deleteConfirmedCase(id);
      showToast('تم حذف الحالة المؤكدة بنجاح', 'success');
      loadData();
    } catch (e) {
      showToast('فشل حذف الحالة المؤكدة', 'refuse');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankId) {
      showToast('يرجى اختيار البنك المعني بالحسبة أولاً', 'refuse');
      return;
    }

    if (!productType) {
      showToast('يرجى تحديد اختيار نوع تمويل المنتج أولاً', 'refuse');
      return;
    }

    // Split conditions
    const conditions = conditionsText
      .split(/[\n,]/)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const payload: ConfirmedBankCase = {
      case_code: caseCode.trim() || null,
      customer_label: customerLabel.trim() || null,
      bank_id: bankId,
      bank_name: banks.find(b => b.id === bankId)?.nameAr || null,
      product_type: productType,
      support_type: supportType || null,
      employment_sector: employmentSector || null,
      employer_name: employerName.trim() || null,
      salary_bank_id: salaryBankId || null,
      salary_bank_name: banks.find(b => b.id === salaryBankId)?.nameAr || null,
      is_salary_transferred_to_same_bank: manualSalaryTransfer,
      salary_amount: salaryAmount ? Number(salaryAmount) : null,
      obligations_amount: obligationsAmount ? Number(obligationsAmount) : null,
      system_result_amount: systemResultAmount ? Number(systemResultAmount) : null,
      system_installment_amount: systemInstallmentAmount ? Number(systemInstallmentAmount) : null,
      actual_bank_amount: actualBankAmount ? Number(actualBankAmount) : null,
      actual_installment_amount: actualInstallmentAmount ? Number(actualInstallmentAmount) : null,
      actual_status: actualStatus,
      decision_reason: decisionReason.trim() || null,
      conditions,
      notes: notes.trim() || null,
      confidence_level: confidenceLevel,
      is_verified: isVerified
    };

    try {
      if (editingCaseId) {
        await updateConfirmedCase(editingCaseId, payload);
        showToast('تم تعديل وحفظ الحالة المؤكدة بنجاح الحفظ العيني', 'success');
      } else {
        await createConfirmedCase(payload);
        showToast('تم تسجيل وإضافة الحالة المؤكدة بنجاح في ذاكرة البنوك', 'success');
      }
      resetFormFields();
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`فشل أثناء محاولة الحفظ: ${err.message || err}`, 'refuse');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            مقبول
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
            <XCircle className="w-3.5 h-3.5" />
            مرفوض
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <AlertCircle className="w-3.5 h-3.5" />
            مشروط
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" />
            يحتاج مراجعة
          </span>
        );
      default:
        return null;
    }
  };

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">عالية</span>;
      case 'medium':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold">متوسطة</span>;
      case 'low':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">منخفضة</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">غير معرّف</span>;
    }
  };

  // Helper to format currency
  const formatCur = (num?: number | null) => {
    if (num === undefined || num === null) return '—';
    return Number(num).toLocaleString('ar-SA') + ' ريال';
  };

  return (
    <div className="w-full space-y-6 font-sans text-right" dir="rtl">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#0057B8]" />
            سجل الحالات المؤكدة داخل البنوك
          </h1>
          <p className="text-xs text-slate-505 font-medium text-slate-500 mt-1">
            تسجيل ومطابقة نتائج التمويل الفعلية الواردة من الجهات لغرض بناء ملفات المقارنة والتحليلات المستقبلية.
          </p>
        </div>
        <button
          onClick={() => {
            if (isFormOpen) {
              resetFormFields();
              setIsFormOpen(false);
            } else {
              resetFormFields();
              setIsFormOpen(true);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm ${
            isFormOpen ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#0057B8] text-white hover:bg-[#00479b]'
          }`}
        >
          {isFormOpen ? (
            <>
              إغلاق النموذج
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              إضافة حالة جديدة
              <Plus className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">إجمالي الحالات</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{stats.total}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">مقبولة فعلية</span>
          <span className="text-2xl font-black text-emerald-600 mt-2">{stats.approved}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">مرفوضة فعلية</span>
          <span className="text-2xl font-black text-rose-600 mt-2">{stats.rejected}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">مشروطة</span>
          <span className="text-2xl font-black text-amber-600 mt-2">{stats.conditional}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">تحتاج مراجعة</span>
          <span className="text-2xl font-black text-slate-600 mt-2">{stats.needs_review}</span>
        </div>
      </div>

      {/* Form Container */}
      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              {editingCaseId ? 'تعديل بيانات الحالة المؤكدة' : 'تسجيل حالة بنكية معتمدة جديدة'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">يرجى تعبئة الحقول أدناه بدقة لمطابقة الحسبة مع نتيجة البنك الفعلية.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Case Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كود الحالة (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: CASE-2993"
                value={caseCode}
                onChange={e => setCaseCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>

            {/* Customer Label */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف / مسمى العميل</label>
              <input
                type="text"
                placeholder="مثال: عميل مدني الرياض"
                value={customerLabel}
                onChange={e => setCustomerLabel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>

            {/* Target Bank */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">البنك المستهدف للحالة *</label>
              <select
                value={bankId}
                onChange={e => setBankId(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer"
              >
                <option value="">اختر البنك...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع منتج التمويل *</label>
              <select
                value={productType}
                onChange={e => setProductType(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer"
              >
                {productTypesList.map(p => (
                  <option key={p.id} value={p.id}>{p.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Support Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مصفوفة الدعم السكني</label>
              <select
                value={supportType}
                onChange={e => setSupportType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer"
              >
                {supportTypesList.map(s => (
                  <option key={s.id} value={s.id}>{s.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Employment Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">قطاع التعيين الوظيفي *</label>
              <select
                value={employmentSector}
                onChange={e => setEmploymentSector(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer"
              >
                {sectorsList.map(s => (
                  <option key={s.id} value={s.id}>{s.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Employer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم جهة العمل / وظيفة العميل</label>
              <input
                type="text"
                placeholder="مثال: وزارة التعليم، أرامكو"
                value={employerName}
                onChange={e => setEmployerName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>

            {/* Salary Deposited Bank */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">بنك تحويل/نزول الراتب الحالي</label>
              <select
                value={salaryBankId}
                onChange={e => setSalaryBankId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer"
              >
                <option value="">اختر البنك...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Is Salary Transferred manually override */}
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700 mb-2">رابط تحويل الراتب لجهة التمويل</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualSalaryTransfer(null)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    manualSalaryTransfer === null
                      ? 'bg-[#0057B8] text-white border-[#0057B8]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  حساب تلقائي
                </button>
                <button
                  type="button"
                  onClick={() => setManualSalaryTransfer(true)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    manualSalaryTransfer === true
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-605 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  محول
                </button>
                <button
                  type="button"
                  onClick={() => setManualSalaryTransfer(false)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    manualSalaryTransfer === false
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-605 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  غير محول
                </button>
              </div>
            </div>

            {/* Salary Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">صافي راتب العميل (شهري بالريال)</label>
              <input
                type="number"
                placeholder="مثال: 9500"
                value={salaryAmount}
                onChange={e => setSalaryAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>

            {/* Obligations */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الالتزامات الحالية (بالريال)</label>
              <input
                type="number"
                placeholder="مثال: 1200"
                value={obligationsAmount}
                onChange={e => setObligationsAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>

            {/* Empty partition */}
            <div className="hidden md:block"></div>
          </div>

          {/* Core comparison fields */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-800">حقول المقارنة والتسوية (نتائج النظام مقابل البنك)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ تمويل النظام المقدر</label>
                <input
                  type="number"
                  placeholder="مثال: 650000"
                  value={systemResultAmount}
                  onChange={e => setSystemResultAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">القسط الشهري للنظام المقدر</label>
                <input
                  type="number"
                  placeholder="مثال: 3200"
                  value={systemInstallmentAmount}
                  onChange={e => setSystemInstallmentAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white"
                />
              </div>

              <div className="bg-emerald-50/20 p-2 rounded-xl border border-emerald-50">
                <label className="block text-xs font-bold text-emerald-800 mb-1.5">المبلغ الفعلي المعتمد من البنك</label>
                <input
                  type="number"
                  placeholder="مثال: 642000"
                  value={actualBankAmount}
                  onChange={e => setActualBankAmount(e.target.value)}
                  className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="bg-emerald-50/20 p-2 rounded-xl border border-emerald-50">
                <label className="block text-xs font-bold text-emerald-800 mb-1.5">القسط الفعلي المعتمد من البنك</label>
                <input
                  type="number"
                  placeholder="مثال: 3180"
                  value={actualInstallmentAmount}
                  onChange={e => setActualInstallmentAmount(e.target.value)}
                  className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actual Result & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نتيجة قرار البنك الفعلية *</label>
              <select
                value={actualStatus}
                onChange={e => setActualStatus(e.target.value as any)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] bg-white cursor-pointer font-bold"
              >
                <option value="approved">مقبول approved</option>
                <option value="rejected">مرفوض rejected</option>
                <option value="conditional">مقبول مشروط conditional</option>
                <option value="needs_review">يحتاج مراجعة وتصفية needs_review</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب القرار / توضيح النتيجة من البنك</label>
              <input
                type="text"
                placeholder="مثال: تم قبول العميل لكن مع تخفيض النسبة لقواعد مضافة مؤخراً في DSR عسكري"
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">شروط قرار البنك المذكورة (كل شرط في سطر جديد)</label>
              <textarea
                rows={3}
                placeholder="مثال:&#10;إحضار خطاب تعريف وظيفي حديث&#10;تأمين شامل على العقار"
                value={conditionsText}
                onChange={e => setConditionsText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات داخلية للتحليل والمقارنة</label>
              <textarea
                rows={3}
                placeholder="اكتب أي ملاحظة عن فروقات النسب أو الهوامش الفنية للبنك..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8] font-sans"
              />
            </div>
          </div>

          {/* Meta settings */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-6">
              {/* Confidence level */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">درجة صحة وموثوقية البيانات</label>
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high'] as const).map(lvl => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setConfidenceLevel(lvl)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg border cursor-pointer capitalize transition-all ${
                        confidenceLevel === lvl
                          ? lvl === 'high' ? 'bg-emerald-500 text-white border-emerald-500' :
                            lvl === 'medium' ? 'bg-sky-500 text-white border-sky-500' :
                            'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-605 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {lvl === 'high' ? 'عالية (مؤكدة بالكامل)' : lvl === 'medium' ? 'متوسطة' : 'منخفضة (تقديرية)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified check */}
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <input
                  type="checkbox"
                  id="chkVerified"
                  checked={isVerified}
                  onChange={e => setIsVerified(e.target.checked)}
                  className="w-4 h-4 text-[#0057B8] border-slate-300 rounded focus:ring-[#0057B8] cursor-pointer"
                />
                <label htmlFor="chkVerified" className="text-xs font-bold text-slate-700 cursor-pointer">
                  حالة معتمدة ومطابقة للفحص النهائي
                </label>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  resetFormFields();
                  setIsFormOpen(false);
                }}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              >
                إلغاء التعديل
              </button>
              <button
                type="submit"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                حفظ الحالة
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Advanced Filters Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#0057B8]" />
          فلترة وعرض سجل الحالات
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Filter by bank */}
          <div>
            <select
              value={filterBank}
              onChange={e => setFilterBank(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white cursor-pointer"
            >
              <option value="">كل البنوك المعنية</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Filter by status */}
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white cursor-pointer"
            >
              <option value="">كل قرارات البنوك</option>
              <option value="approved">مقبول (Approved)</option>
              <option value="rejected">مرفوض (Rejected)</option>
              <option value="conditional">مشروط (Conditional)</option>
              <option value="needs_review">تحت المراجعة (Needs Review)</option>
            </select>
          </div>

          {/* Filter by Sector */}
          <div>
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white cursor-pointer"
            >
              <option value="">كل القطاعات الوظيفية</option>
              {sectorsList.map(s => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Filter by salary bank */}
          <div>
            <select
              value={filterSalaryBank}
              onChange={e => setFilterSalaryBank(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white cursor-pointer"
            >
              <option value="">كل بنوك رواتب العملاء</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Search employer */}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم جهة العمل..."
              value={filterEmployer}
              onChange={e => setFilterEmployer(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-1 focus:ring-[#0057B8] focus:border-[#0057B8]"
            />
          </div>
        </div>

        {/* Clear filter shortcut if any is selected */}
        {(filterBank || filterStatus || filterSector || filterEmployer || filterSalaryBank) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilterBank('');
                setFilterStatus('');
                setFilterSector('');
                setFilterEmployer('');
                setFilterSalaryBank('');
              }}
              className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Main Grid / Table of Cases */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0057B8]" />
            <span className="text-xs text-slate-500 font-bold">جاري جلب ومزامنة سجل الحالات المعتمدة...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <ClipboardList className="w-12 h-12 text-slate-350 text-slate-300" />
            <h4 className="text-xs font-bold text-slate-800">لا يوجد حالات مطابقة للبحث</h4>
            <p className="text-[11px] text-slate-400">انقر على "إضافة حالة جديدة" في الأعلى لبدء التسجيل وبناء ذاكرة الفحص.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/75 text-slate-500 border-b border-slate-100 shrink-0 font-bold">
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0 z-10 select-none">كود / عميل</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0">البنك المستهدف</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0">المنتج ومعلّم الدعم</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0">القطاع والجهة</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0">الراتب / التمويل المالي والمطابقة</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0 text-center">النتيجة الفعلية للقرار</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0">تاريخ التسجيل</th>
                  <th className="px-4 py-3 bg-slate-50/75 shrink-0 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cases.map((item) => {
                  const targetBank = banks.find(b => b.id === item.bank_id);
                  const salaryBank = banks.find(b => b.id === item.salary_bank_id);
                  const sector = sectorsList.find(s => s.id === item.employment_sector);
                  const prod = productTypesList.find(p => p.id === item.product_type);
                  const isAutoTransfer = item.is_salary_transferred_to_same_bank === null 
                    ? (item.salary_bank_id === item.bank_id) 
                    : item.is_salary_transferred_to_same_bank;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Code / Label */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{item.customer_label || 'عميل مجهول'}</span>
                          {item.case_code && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.case_code}</span>
                          )}
                        </div>
                      </td>

                      {/* Targeted Bank */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-tr ${targetBank?.logoColor || 'from-[#0057B8] to-blue-900'}`} />
                          <span className="font-bold text-slate-800">{item.bank_name || targetBank?.nameAr || item.bank_id}</span>
                        </div>
                      </td>

                      {/* Product & Support */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-800 text-[11px] font-bold">{prod?.nameAr || item.product_type}</span>
                          {item.support_type && (
                            <span className="text-[10px] text-indigo-600 mt-0.5">
                              {supportTypesList.find(s => s.id === item.support_type)?.nameAr || item.support_type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sector & Employer */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold">{sector?.nameAr || item.employment_sector}</span>
                          {item.employer_name && (
                            <span className="text-[10px] text-slate-500 mt-0.5">{item.employer_name}</span>
                          )}
                        </div>
                      </td>

                      {/* Salary Amount & Comparison details */}
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="text-slate-500 flex items-center gap-1">
                            <span>راتب: <b className="text-slate-800 font-bold">{formatCur(item.salary_amount)}</b></span>
                            <span className="text-[10px] text-slate-400">
                              (على {item.salary_bank_name || salaryBank?.nameAr || 'جهة أخرى'} — {isAutoTransfer ? 'محوّل' : 'غير محوّل'})
                            </span>
                          </div>
                          
                          {/* Financial delta alignment if available */}
                          {(item.system_result_amount !== undefined || item.actual_bank_amount !== undefined) && (
                            <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-x-2 text-[10px]">
                              <div>
                                <span className="text-slate-400">فحص النظام:</span>
                                <div className="font-bold text-slate-700">{formatCur(item.system_result_amount)}</div>
                              </div>
                              <div>
                                <span className="text-emerald-600 font-bold">بموجب البنك:</span>
                                <div className="font-bold text-emerald-700">{formatCur(item.actual_bank_amount)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Decision & Status */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center space-y-1">
                          {getStatusBadge(item.actual_status)}
                          <div className="flex items-center gap-1.5 mt-1">
                            {getConfidenceBadge(item.confidence_level)}
                            {item.is_verified && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded-xs border border-emerald-100">محققة</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Registered date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-400 text-[10px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditInit(item)}
                            title="تعديل الحالة"
                            className="p-1 px-2.5 py-1.5 hover:bg-[#0057B8]/5 text-[#0057B8] hover:text-[#00479b] rounded-lg transition-colors border border-slate-100 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.case_code)}
                            title="حذف الحالة"
                            className="p-1 px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-lg transition-colors border border-slate-100 cursor-pointer"
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
        )}
      </div>
    </div>
  );
};
