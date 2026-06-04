import React, { useEffect, useState } from "react";
import { useAppState } from "../context/AppContext";
import { 
  fetchSavedResults, 
  deleteSavedResult 
} from "../lib/savedResultsService";
import { SavedResult, BankCalculationResult } from "../types";
import { 
  Building2, Trash2, Calendar, User, Info, Calculator, 
  Lock, Sparkles, ChevronLeft, CreditCard, Clock, Percent, Bookmark
} from "lucide-react";

export function ResultsPage() {
  const { user, setResults, setCurrentStep } = useAppState();
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedResult, setSelectedResult] = useState<SavedResult | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Load results on mount or when user changes
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const results = await fetchSavedResults(user.id);
        setSavedResults(results);
      } catch (err) {
        console.error("Error fetching saved results:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleNavigate = (path: string) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const handleRestart = () => {
    setResults(null);
    setCurrentStep(1);
    handleNavigate("/");
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteSavedResult(id, user.id);
      setSavedResults(prev => prev.filter(item => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting saved result:", err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // 1. If user is guest / not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center select-none" dir="rtl">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#0057B8] rounded-full flex items-center justify-center mx-auto border border-blue-100/50 transition-transform hover:scale-105 duration-300">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="font-sans font-black text-xl text-gray-950">سجّل دخولك لمشاهدة نتائجك</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              لكل مستخدم في منصة "حسبة" ملف خاص لعرض وحذف عروض التمويل المحفوظة. يرجى تسجيل الدخول لعرض قائمة المقارنات والتقارير الخاصة بك.
            </p>
          </div>
          <button
            onClick={() => handleNavigate("/login")}
            className="w-full py-3.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-extrabold rounded-2xl transition-all shadow-md hover:shadow-blue-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>تسجيل الدخول الآن</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#0057B8] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-500 font-bold font-sans">جاري تحميل تقاريرك التمهيدية المحفوظة...</p>
      </div>
    );
  }

  // 3. Saved results are empty
  if (savedResults.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center select-none" dir="rtl">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#0057B8] rounded-full flex items-center justify-center mx-auto border border-blue-100/50">
            <Bookmark className="w-7 h-7 text-[#0057B8]" />
          </div>
          <div className="space-y-2">
            <h3 className="font-sans font-black text-xl text-gray-950">لا توجد نتائج محفوظة بعد</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              لم تحفظ أي دراسات أو تقارير ائتمانية للبنوك في حسابك الحالي حتى الآن. يمكنك استخراج كافة عروض التمويل عبر الحاسبة واختيار المفضلة لحفظ ومقارنتها هنا.
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="w-full py-3.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-extrabold rounded-2xl transition-all shadow-md hover:shadow-blue-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>ابدأ حسبة جديدة وقارن البنوك</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F5F7FA] min-h-screen pb-16" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8">
        
        {/* Header Block */}
        <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#111827] flex items-center gap-2">
              <Bookmark className="w-5.5 h-5.5 text-[#0057B8]" />
              <span>نتائجي المحفوظة ({savedResults.length})</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1">الدراسات الائتمانية والتقارير المالية المحفوظة في ملف مقارنات "حسبة"</p>
          </div>
          <button
            onClick={handleRestart}
            className="self-start py-2.5 px-4 bg-[#0057B8] hover:bg-[#004494] text-white hover:text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Calculator className="w-4 h-4" />
            <span>حسبة عقار وتمويل جديد</span>
          </button>
        </div>

        {/* Tip strip */}
        <div className="bg-white/50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center gap-3 text-right max-w-4xl mx-auto">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <p className="text-[11px] font-bold text-slate-600 leading-relaxed font-sans">
            تحتوي البوابات أدناه على الهوامش والنتائج التفصيلية الكاملة التي قمت بتنسيقها. يمكنك إعادة قراءة وتصفح أي منها أو حذف التقارير الزائدة في أي وقت.
          </p>
        </div>

        {/* Saved Cards Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pt-2">
          {savedResults.map((item) => {
            const isEligible = item.eligibility_status === 'eligible';
            const offer = item.payload;
            const logoColor = offer?.logoColor || "from-blue-600 to-blue-800";
            const logoText = offer?.logoText || "بنك";

            return (
              <div 
                key={item.id}
                className="bg-white border border-slate-200/65 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Card Top Banner with Bank Identity */}
                <div className={`p-4 bg-gradient-to-r ${logoColor} text-white flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center font-bold text-xs select-none">
                      {logoText}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm leading-tight">{item.bank_name}</h3>
                      <p className="text-[10px] text-white/80">{item.finance_type}</p>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold select-none ${
                    isEligible ? "bg-emerald-500/20 text-emerald-100" : "bg-red-500/20 text-red-100"
                  }`}>
                    {isEligible ? "مقبول ائتمانياً" : "غير مطابق"}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 text-right space-y-4 flex-1">
                  {/* Calculation custom Title */}
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 leading-tight">{item.title}</h4>
                    {item.customer_name && (
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">العميل: {item.customer_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Finance values blocks */}
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] font-sans text-slate-400 font-bold block">مبلغ التمويل المقدر:</span>
                      <span className="text-xs font-black text-[#0057B8]" dir="ltr">
                        {Math.round(item.real_estate_amount || item.personal_amount).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] font-sans text-slate-400 font-bold block">القسط الشهري:</span>
                      <span className="text-xs font-black text-emerald-600" dir="ltr">
                        {Math.round(item.monthly_installment).toLocaleString('ar-SA')} ريال / شهر
                      </span>
                    </div>
                  </div>

                  {/* Supporting parameters */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">قطاع الوظيفة:</span>
                      <span className="font-extrabold text-slate-800">{item.sector}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">مدة التمويل:</span>
                      <span className="font-extrabold text-slate-800">{Math.round(item.term_months / 12)} سنوات</span>
                    </div>

                    <div className="flex justify-between items-center col-span-2 mt-0.5 pt-1.5 border-t border-dotted border-slate-100">
                      <span className="text-slate-400 font-sans">نوع الدعم السكني:</span>
                      <span className="font-extrabold text-slate-800">
                        {item.support_type === 'none' ? 'بدون دعم' : item.support_type === 'monthly' ? 'دعم شهري' : 'دعم مخصص عيني دفعة'}
                      </span>
                    </div>
                  </div>

                  {/* Saved Date */}
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>حُفظ بتاريخ: {formatDate(item.created_at)}</span>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="px-5 pb-5 pt-1 flex gap-2 w-full border-t border-slate-100">
                  <button
                    onClick={() => setSelectedResult(item)}
                    className="flex-3 text-center py-2 bg-slate-50 hover:bg-[#0057B8] text-slate-700 hover:text-white border border-slate-200/50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>التفاصيل الكاملة</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="flex-1 text-center py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-100 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    title="حذف النتيجة"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* 📊 Unified Details Drawer Modal */}
      {selectedResult && (
        <div id="re-saved-drawer" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-[#F5F7FA] h-full overflow-y-auto flex flex-col animate-slide-in shadow-2xl text-right" dir="rtl">
            
            {/* Drawer Header */}
            <div className={`p-6 text-white bg-gradient-to-r ${selectedResult.payload?.logoColor || 'from-slate-700 to-slate-900'} sticky top-0 z-10 flex justify-between items-center h-24`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">
                  {selectedResult.payload?.logoText || 'H'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedResult.bank_name}</h3>
                  <p className="text-xs text-white/85">التقرير التاريخي لدراسة الحسبة المعتمدة</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedResult(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold cursor-pointer transition-all active:scale-95"
              >
                إغلاق التفاصيل
              </button>
            </div>

            {/* Drawer content body */}
            <div className="p-6 space-y-6">
              
              {/* Document details box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-800">{selectedResult.title}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                    selectedResult.eligibility_status === 'eligible' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {selectedResult.eligibility_status === 'eligible' ? 'مكتمل ومقبول' : 'ائتمان غير متطابق'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs font-semibold text-slate-500">
                  <div>مستخرج الحسبة: <span className="text-slate-800 font-extrabold">{selectedResult.customer_name || 'عام / ضيف'}</span></div>
                  <div>قطاع العمل والائتمان: <span className="text-slate-800 font-extrabold">{selectedResult.sector}</span></div>
                  <div>نوع المنتج المحسوب: <span className="text-[#0057B8] font-extrabold">{selectedResult.finance_type}</span></div>
                  <div>تاريخ التخزين: <span className="text-slate-500 font-extrabold">{formatDate(selectedResult.created_at)}</span></div>
                </div>
              </div>

              {/* Purchasing Power Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h4 className="font-black text-slate-900 text-sm">القوة الشرائية والملاءمة التمويلية المقدرة</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">الحد الأقصى للتسهيلات المالية وفقاً للوائح الـ DSR المعتمدة</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedResult.payload?.realEstateAmount > 0 && (
                    <div className="border border-[#0057B8]/10 bg-blue-50/20 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold block">مبلغ التمويل العقاري:</span>
                      <span className="text-lg font-black text-[#0057B8]" dir="ltr">
                        {Math.round(selectedResult.payload.realEstateAmount).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {selectedResult.payload?.personalAmount > 0 && (
                    <div className="border border-emerald-100 bg-emerald-50/15 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold block">مبلغ التمويل الشخصي الرديف:</span>
                      <span className="text-lg font-black text-emerald-600" dir="ltr">
                        {Math.round(selectedResult.payload.personalAmount).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}

                  {selectedResult.payload?.realEstateAmount > 0 && selectedResult.payload?.personalAmount > 0 && (
                    <div className="col-span-1 md:col-span-2 bg-[#0057B8]/5 border border-[#0057B8]/10 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold block">إجمالي القدرة التمويلية المجمعة:</span>
                      <span className="text-xl font-black text-[#0057B8]" dir="ltr">
                        {Math.round(selectedResult.payload.totalPurchasingPower).toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  )}
                </div>

                {/* Settle breakdown */}
                <div className="space-y-3.5 pt-2">
                  <h5 className="font-black text-xs text-slate-700">مخطط السداد والقسط الجاري:</h5>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between items-center text-slate-900 border-b border-slate-200/55 pb-2.5">
                      <span className="flex items-center gap-1.5 font-sans">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>القسط الشهري الجاري:</span>
                      </span>
                      <span className="font-black text-sm text-emerald-600">{Math.round(selectedResult.payload.monthlyInstallmentBeforeRetirement).toLocaleString('ar-SA')} ريال</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-200/55 pb-2.5">
                      <span className="flex items-center gap-1.5 font-sans">
                        <Clock className="w-4 h-4 text-[#0057B8]" />
                        <span>المدة بالأشهر:</span>
                      </span>
                      <span className="font-black text-slate-800">{selectedResult.payload.termMonths} شهراً ({Math.round(selectedResult.payload.termMonths / 12)} سنة)</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 pb-1">
                      <span className="flex items-center gap-1.5 font-sans">
                        <Percent className="w-4 h-4 text-purple-600" />
                        <span>هامش الربح السنوي:</span>
                      </span>
                      <span className="font-black text-slate-800">{selectedResult.payload.annualMargin}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical diagnostics and log messages */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <h4 className="font-black text-slate-900 text-sm pb-2 border-b border-slate-100">المقاييس الفنية والتحقق الائتماني:</h4>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>نسبة استهلاك عبء الدين (DSR):</span>
                    <span className="font-black text-slate-800">{(selectedResult.payload.dsrUsed * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الراتب المعتمد للحسبة:</span>
                    <span className="font-black text-slate-800" dir="ltr">{Math.round(selectedResult.payload.netSalary).toLocaleString('ar-SA')} ريال</span>
                  </div>
                </div>

                {selectedResult.payload?.diagnosticMessages?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-400">إشارات الفحص المالي:</span>
                    {selectedResult.payload.diagnosticMessages.map((msg: string, i: number) => (
                      <div key={i} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0057B8]" />
                        <span className="text-slate-700 font-bold">{msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 🗑️ Delete confirm popup modal dialog */}
      {deleteConfirmId && (
        <div id="delete-saved-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white border border-slate-100 w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center animate-scale-up space-y-5 text-right">
            
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2 text-center">
              <h3 className="font-sans font-black text-base text-gray-950">هل أنت متأكد من حذف النتيجة؟</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans max-w-xs mx-auto">
                سيتم إزالة هذا التقرير والحسبة المالية نهائياً من ملف نتائجك المحفوظة ولن تتمكن من استعادتها مرة أخرى.
              </p>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
              >
                {deleting ? "جاري الحذف..." : "تأكيد الحذف نهائياً"}
              </button>
              
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200/50"
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
