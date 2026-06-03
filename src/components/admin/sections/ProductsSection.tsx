import React, { useState } from 'react';
import { Plus, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { Bank, ProductAcceptance, SectorId, ProductId } from '../../../types';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

const productTypesList = [
  { id: 'real_estate_only', nameAr: 'عقاري فقط' },
  { id: 'personal_only', nameAr: 'شخصي فقط' },
  { id: 'real_estate_with_new_personal', nameAr: 'عقاري + شخصي جديد' },
  { id: 'real_estate_with_existing_personal', nameAr: 'عقاري مع شخصي قائم' }
];

const sectorsList = [
  { id: 'gov_civil', nameAr: 'حكومي مدني' },
  { id: 'semi_gov', nameAr: 'شبه حكومي' },
  { id: 'companies', nameAr: 'موظف شركات' },
  { id: 'military', nameAr: 'عسكري' },
  { id: 'retired', nameAr: 'متقاعد' }
];

interface ProductsSectionProps {
  banks: Bank[];
  products: ProductAcceptance[];
  setProducts: React.Dispatch<React.SetStateAction<ProductAcceptance[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  banks,
  products,
  setProducts,
  showToast
}) => {
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterProductType, setFilterProductType] = useState<string>('all');
  const [filterActiveStatus, setFilterActiveStatus] = useState<string>('all');
  const [filterSupport, setFilterSupport] = useState<string>('all');

  // Modal / Form state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAcceptance | null>(null);

  const [formBankId, setFormBankId] = useState('rajhi');
  const [formProductId, setFormProductId] = useState<ProductId>('real_estate_only');
  const [formMinSalary, setFormMinSalary] = useState('');
  const [formMinAge, setFormMinAge] = useState('');
  const [formMinServiceMonths, setFormMinServiceMonths] = useState('');
  const [formAllowUnsupported, setFormAllowUnsupported] = useState(true);
  const [formAllowMonthlySupport, setFormAllowMonthlySupport] = useState(true);
  const [formAllowDownpaymentSupport, setFormAllowDownpaymentSupport] = useState(true);
  const [formAllowedSectors, setFormAllowedSectors] = useState<SectorId[]>(['gov_civil', 'semi_gov', 'companies', 'military', 'retired']);
  const [formRejectionMessage, setFormRejectionMessage] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const formBanksList = [{ id: 'all', nameAr: 'الكل' }, ...banks.map(b => ({ id: b.id, nameAr: b.nameAr }))];

  const parseArabicAndEnglishNumber = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(arabicIndic[i], i.toString());
    }
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(persian[i], i.toString());
    }
    return str;
  };

  const openAddProductModal = () => {
    try {
      setEditingProduct(null);
      const activeBank = (filterBank && filterBank !== 'all') ? filterBank : 'rajhi';
      setFormBankId(activeBank);
      setFormProductId('real_estate_only');
      setFormMinSalary('');
      setFormMinAge('');
      setFormMinServiceMonths('');
      setFormAllowUnsupported(true);
      setFormAllowMonthlySupport(true);
      setFormAllowDownpaymentSupport(true);
      setFormAllowedSectors(['gov_civil', 'semi_gov', 'companies', 'military', 'retired']);
      setFormRejectionMessage('');
      setFormIsActive(true);
      setFormError('');
      setIsProductModalOpen(true);
    } catch (e) {
      console.error("حدث خطأ أثناء فتح نموذج الإضافة:", e);
    }
  };

  const openEditProductModal = (rule: ProductAcceptance) => {
    try {
      console.log("Safe copy initialization starting for edit...");
      const selectedRule = { ...rule };

      const minSalaryVal = selectedRule.minSalary !== undefined && selectedRule.minSalary !== null ? String(selectedRule.minSalary) : "";
      const minAgeVal = selectedRule.minAge !== undefined && selectedRule.minAge !== null ? String(selectedRule.minAge) : "";
      const minServiceVal = selectedRule.minServiceMonths !== undefined && selectedRule.minServiceMonths !== null ? String(selectedRule.minServiceMonths) : "";

      let allowedSectors: SectorId[] = [];
      if (Array.isArray(selectedRule.allowedSectors)) {
        allowedSectors = [...selectedRule.allowedSectors];
      } else if (typeof selectedRule.allowedSectors === 'string') {
        try {
          const parsed = JSON.parse(selectedRule.allowedSectors);
          if (Array.isArray(parsed)) allowedSectors = parsed;
        } catch {
          allowedSectors = [selectedRule.allowedSectors as any];
        }
      }

      const minSalary = parseArabicAndEnglishNumber(minSalaryVal);
      const minAge = parseArabicAndEnglishNumber(minAgeVal);
      const minServiceMonths = parseArabicAndEnglishNumber(minServiceVal);
      const rejectionMessage = selectedRule.defaultRejectionMessage || "";
      const active = selectedRule.isActive !== false;

      setEditingProduct(selectedRule);
      setFormBankId(selectedRule.bankId || 'alahli');
      setFormProductId(selectedRule.productId || 'real_estate_only');
      setFormMinSalary(minSalary);
      setFormMinAge(minAge);
      setFormMinServiceMonths(minServiceMonths);
      setFormAllowUnsupported(selectedRule.allowUnsupported !== false);
      setFormAllowMonthlySupport(selectedRule.allowMonthlySupport !== false);
      setFormAllowDownpaymentSupport(selectedRule.allowDownpaymentSupport !== false);
      setFormAllowedSectors(allowedSectors);
      setFormRejectionMessage(rejectionMessage);
      setFormIsActive(active);
      setFormError('');
      setIsProductModalOpen(true);
      console.log("Edit product modal successfully opened without changing the original rule reference.");
    } catch (e) {
      console.error("Critical error in openEditProductModal:", e);
      setFormError("حدث خطأ غير متوقع أثناء تحميل بيانات التعديل.");
    }
  };

  const closeProductModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    try {
      if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه قاعدة؟')) {
        setProducts(prev => prev.filter(p => p.id !== id));
        showToast('تم حذف قاعدة القبول بنجاح!', 'success');
      }
    } catch (e) {
      console.error("Error deleting product:", e);
    }
  };

  const saveProductRule = () => {
    try {
      if (!formBankId) {
        setFormError('يرجى اختيار البنك.');
        return;
      }
      if (!formProductId) {
        setFormError('يرجى اختيار نوع المنتج.');
        return;
      }

      const cleanSalaryStr = normalizeNumberInput(parseArabicAndEnglishNumber(formMinSalary));
      const cleanMinAgeStr = normalizeNumberInput(parseArabicAndEnglishNumber(formMinAge));
      const cleanServiceStr = normalizeNumberInput(parseArabicAndEnglishNumber(formMinServiceMonths));

      if (cleanSalaryStr === '') {
        setFormError('الحد الأدنى للراتب مطلوب.');
        return;
      }
      if (cleanMinAgeStr === '') {
        setFormError('الحد الأدنى للعمر مطلوب.');
        return;
      }
      if (cleanServiceStr === '') {
        setFormError('الحد الأدنى لخدمة الأشهر مطلوب.');
        return;
      }

      const salaryNum = Number(cleanSalaryStr);
      const minAgeNum = Number(cleanMinAgeStr);
      const serviceNum = Number(cleanServiceStr);

      if (isNaN(salaryNum) || salaryNum < 0) {
        setFormError('يرجى إدخال قيمة صحيحة للراتب الأدنى (0 أو أكبر).');
        return;
      }
      if (isNaN(minAgeNum) || minAgeNum < 18) {
        setFormError('الحد الأدنى للعمر يجب ألا يقل عن 18 سنة.');
        return;
      }
      if (isNaN(serviceNum) || serviceNum < 0) {
        setFormError('أقل مدة خدمة يجب ألا تقل عن 0.');
        return;
      }

      const safeAllowedSectors = Array.isArray(formAllowedSectors) ? formAllowedSectors : [];
      if (safeAllowedSectors.length === 0) {
        setFormError('يرجى اختيار قطاع واحد مسموح به على الأقل.');
        return;
      }
      if (!formRejectionMessage.trim()) {
        setFormError('رسالة الرفض لا يمكن أن تكون فارغة.');
        return;
      }

      const payload: ProductAcceptance = {
        id: editingProduct ? editingProduct.id : `prod_rule_${Date.now()}`,
        bankId: formBankId,
        productId: formProductId,
        minSalary: salaryNum,
        minAge: minAgeNum,
        minServiceMonths: serviceNum,
        allowUnsupported: formAllowUnsupported,
        allowMonthlySupport: formAllowMonthlySupport,
        allowDownpaymentSupport: formAllowDownpaymentSupport,
        allowedSectors: safeAllowedSectors,
        defaultRejectionMessage: formRejectionMessage,
        isActive: formIsActive,
        allowAfterRetirement: safeAllowedSectors.includes('retired')
      };

      if (editingProduct) {
        setProducts(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map(p => p.id === editingProduct.id ? payload : p);
        });
        showToast('تم تعديل قاعدة القبول بنجاح!', 'success');
      } else {
        setProducts(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return [payload, ...arr];
        });
        showToast('تم إضافة قاعدة القبول بنجاح!', 'success');
      }

      setEditingProduct(null);
      setIsProductModalOpen(false);
    } catch (e) {
      console.error("Critical error in saveProductRule:", e);
      setFormError("حدث خطأ غير متوقع أثناء حفظ قاعدة القبول.");
    }
  };

  const toggleProductActive = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">المنتجات والقبول</h2>
          <p className="text-xs text-gray-500">
            إدارة منتجات البنوك وشروط قبول العملاء حسب الراتب والعمر والخدمة والدعم.
          </p>
        </div>
        <button
          type="button"
          id="btn-add-product-rule"
          onClick={openAddProductModal}
          className="inline-flex items-center gap-2 bg-[#0057B8] hover:bg-[#00418A] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-[#0057B8]/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قاعدة قبول</span>
        </button>
      </div>

      {/* Banks Horizontal Scrollable Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2.5">
        {formBanksList.map((b) => {
          const count = b.id === 'all' 
            ? products.length 
            : products.filter(p => p.bankId === b.id).length;
          const isSelected = filterBank === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setFilterBank(b.id)}
              className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-sm shadow-[#0057B8]/20 scale-[1.01]'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-250/60'
              }`}
            >
              <span>{b.nameAr}</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg min-w-[20px] text-[10px] font-extrabold ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Filter Product Type */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">نوع المنتج:</label>
          <select
            id="filter-product-select"
            value={filterProductType}
            onChange={(e) => setFilterProductType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل المنتجات</option>
            {productTypesList.map(type => (
              <option key={type.id} value={type.id}>{type.nameAr}</option>
            ))}
          </select>
        </div>

        {/* Filter Active Status */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">الحالة:</label>
          <select
            id="filter-status-select"
            value={filterActiveStatus}
            onChange={(e) => setFilterActiveStatus(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل الحالات</option>
            <option value="active">مفعل فقط</option>
            <option value="inactive">غير مفعل</option>
          </select>
        </div>

        {/* Filter Support Type */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-bold text-gray-600">نوع الدعم المسموح:</label>
          <select
            id="filter-support-select"
            value={filterSupport}
            onChange={(e) => setFilterSupport(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
          >
            <option value="all">كل قنوات الدعم</option>
            <option value="none">غير مدعوم متاح</option>
            <option value="monthly">دعم شهري متاح</option>
            <option value="downpayment">دعم دفعة متاح</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#111827] min-w-[800px]">
            <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 font-bold">البنك</th>
                <th className="p-4 font-bold">نوع المنتج</th>
                <th className="p-4 font-bold text-center">أقل راتب مقبول</th>
                <th className="p-4 font-bold text-center">أقل عمر</th>
                <th className="p-4 font-bold text-center">أقل خدمة</th>
                <th className="p-4 font-bold">الدعم المسموح</th>
                <th className="p-4 font-bold">القطاعات المسموحة</th>
                <th className="p-4 font-bold text-center">الحالة</th>
                <th className="p-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-semibold">
              {(() => {
                const filteredList = products.filter(p => {
                  if (filterBank !== 'all' && p.bankId !== filterBank) return false;
                  if (filterProductType !== 'all' && p.productId !== filterProductType) return false;
                  if (filterActiveStatus === 'active' && !p.isActive) return false;
                  if (filterActiveStatus === 'inactive' && p.isActive) return false;
                  if (filterSupport === 'none' && !p.allowUnsupported) return false;
                  if (filterSupport === 'monthly' && !p.allowMonthlySupport) return false;
                  if (filterSupport === 'downpayment' && !p.allowDownpaymentSupport) return false;
                  return true;
                });

                if (filteredList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400 font-medium">
                        لا توجد قواعد قبول مسجلة تطابق التصفية الحالية.
                      </td>
                    </tr>
                  );
                }

                return filteredList.map((prod) => {
                  const matchedBank = banks.find(b => b.id === prod.bankId);
                  const displayProduct = productTypesList.find(pt => pt.id === prod.productId)?.nameAr || prod.productId;
                  
                  const supports: string[] = [];
                  if (prod.allowUnsupported !== false) supports.push('غير مدعوم');
                  if (prod.allowMonthlySupport) supports.push('دعم شهري');
                  if (prod.allowDownpaymentSupport) supports.push('دعم دفعة');

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{matchedBank?.nameAr || prod.bankId}</td>
                      <td className="p-4">
                        <span className="inline-flex font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-[#475569] text-[10px]">
                          {displayProduct}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-[#0057B8]">
                        {(prod.minSalary ?? 0).toLocaleString('en-US')} <span className="text-[10px] font-normal text-gray-400">ريـال</span>
                      </td>
                      <td className="p-4 text-center font-semibold text-gray-700">
                        {prod.minAge} <span className="text-[10px] font-normal text-gray-400">سنة</span>
                      </td>
                      <td className="p-4 text-center font-semibold text-gray-700">
                        {prod.minServiceMonths} <span className="text-[10px] font-normal text-gray-400">شهر</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {supports.map((s, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          ))}
                          {supports.length === 0 && (
                            <span className="text-red-500 text-[9px] font-bold">لا يوجد دعم متاح</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(Array.isArray(prod.allowedSectors) ? prod.allowedSectors : []).map(sec => {
                            const secAr = sec === 'gov_civil' ? 'حكومي' :
                                          sec === 'semi_gov' ? 'شبه حكومي' :
                                          sec === 'companies' ? 'موظف شركات' :
                                          sec === 'military' ? 'عسكري' : 'متقاعد';
                            return (
                              <span key={sec} className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                                {secAr}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          aria-label="تبديل الحالة"
                          onClick={() => toggleProductActive(prod.id)}
                          className="cursor-pointer inline-flex transition-transform hover:scale-105"
                        >
                          {prod.isActive ? (
                            <ToggleRight className="w-8 h-8 text-[#0057B8]" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(prod)}
                            className="text-[#0057B8] hover:bg-blue-50 p-1.5 rounded-lg transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(prod.id)}
                            className="text-red-600 hover:bg-red-55 p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="حذف القاعدة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* PRODUCT DRAWER/MODAL POPUP */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all w-full max-w-2xl border border-gray-100 font-sans">
            
            {/* Header */}
            <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900" id="modal-title">
                {editingProduct ? 'تعديل قاعدة قبول القرض' : 'إضافة قاعدة قبول جديدة'}
              </h3>
              <button
                type="button"
                onClick={closeProductModal}
                className="text-gray-400 hover:text-gray-600 focus:outline-none text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Error Alert inside popup */}
              {formError && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-xl text-red-700 text-xs font-bold leading-relaxed">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">البنك الشريك *</label>
                  <select
                    id="form-bank-select"
                    value={formBankId}
                    onChange={(e) => setFormBankId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Product Type Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">نوع منتج التمويل *</label>
                  <select
                    id="form-product-select"
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value as ProductId)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                  >
                    {productTypesList.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Min Salary Input */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-xs font-bold text-gray-700">أقل راتب مقبول (ريال سـعودي) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    id="form-min-salary-input"
                    value={formMinSalary}
                    placeholder="مثال: 5000 أو 4,500"
                    onChange={(e) => setFormMinSalary(normalizeNumberInput(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#0057B8]"
                  />
                </div>

                {/* Min Service Months Input */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-xs font-bold text-gray-700">أقل مدة خدمه للعملاء بالأشهر *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    id="form-min-service-input"
                    value={formMinServiceMonths}
                    placeholder="مثال: 3 أو 6"
                    onChange={(e) => setFormMinServiceMonths(normalizeNumberInput(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#0057B8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Min Age Input */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-xs font-bold text-gray-700">أقل عمر للعميل مقبول ومفعل *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    id="form-min-age-input"
                    value={formMinAge}
                    placeholder="مثال: 18"
                    onChange={(e) => setFormMinAge(normalizeNumberInput(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#0057B8]"
                  />
                </div>
              </div>

              {/* Allowed Support Choices (Checks) */}
              <div className="space-y-2 border border-gray-100 bg-gray-50/50 p-4 rounded-2xl">
                <label className="block text-xs font-bold text-gray-800">أنواع الدعم المسكوني المسموحة:</label>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formAllowUnsupported}
                      onChange={(e) => setFormAllowUnsupported(e.target.checked)}
                      className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                    />
                    <span>غير مدعوم متاح</span>
                  </label>

                  {formProductId !== 'personal_only' && formProductId !== 'personal' && (
                    <>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={formAllowMonthlySupport}
                          onChange={(e) => setFormAllowMonthlySupport(e.target.checked)}
                          className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                        />
                        <span>دعم شهري متاح</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={formAllowDownpaymentSupport}
                          onChange={(e) => setFormAllowDownpaymentSupport(e.target.checked)}
                          className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                        />
                        <span>دعم دفعة متاح</span>
                      </label>
                    </>
                  )}
                </div>
                {formProductId === 'personal_only' && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    * تنبيه: يُمنع استخدام الدعم السكني في التمويل الشخصي وفق شروط الحسبة.
                  </p>
                )}
              </div>

              {/* Allowed Sectors */}
              <div className="space-y-2 border border-gray-100 bg-gray-50/50 p-3 rounded-2xl">
                <label className="block text-xs font-bold text-gray-800">القطاعات المقبولة والمسموحة لقاعدة الشريك: *</label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6">
                  {sectorsList.map(sec => {
                    const sectorsArr = Array.isArray(formAllowedSectors) ? formAllowedSectors : [];
                    const isChecked = sectorsArr.includes(sec.id as SectorId);
                    return (
                      <label key={sec.id} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedSectors(prev => {
                                const current = Array.isArray(prev) ? prev : [];
                                return [...current, sec.id as SectorId];
                              });
                            } else {
                              setFormAllowedSectors(prev => {
                                const current = Array.isArray(prev) ? prev : [];
                                return current.filter(x => x !== sec.id);
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-[#0057B8] focus:ring-[#0057B8]"
                        />
                        <span>{sec.nameAr}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Default Rejection Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">رسالة الرفض عند عدم مطابقة الشروط *</label>
                <textarea
                  id="form-rejection-msg"
                  rows={2}
                  value={formRejectionMessage}
                  onChange={(e) => setFormRejectionMessage(e.target.value)}
                  placeholder="مثال: تم رفض الطلب بسبب أن صافي الراتب أقل من الحد الأدنى المقدر لهذا البنك."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0057B8] text-right"
                ></textarea>
              </div>

              {/* Active Status Check */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="form-is-active-btn"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-[#0057B8] w-4 h-4 focus:ring-[#0057B8] cursor-pointer"
                />
                <label htmlFor="form-is-active-btn" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                  تفعيل هذه القاعدة في الحسبة الحالية مباشرة
                </label>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-row-reverse gap-3 rounded-b-3xl">
              <button
                type="button"
                id="btn-save-product-rule"
                onClick={saveProductRule}
                className="bg-[#0057B8] hover:bg-[#00418A] text-white px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#0057B8]/10"
              >
                حفظ القاعدة
              </button>
              <button
                type="button"
                onClick={closeProductModal}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                إلغاء المعالجة
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
