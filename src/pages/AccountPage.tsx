import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { supabase, hasSupabaseKeys } from "../lib/supabase";
import { 
  fetchSavedResults, 
  deleteSavedResult 
} from "../lib/savedResultsService";
import { SavedResult, Bank } from "../types";
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Mail, 
  Shield, 
  Calendar, 
  KeyRound, 
  Settings, 
  Calculator, 
  Clock, 
  Info, 
  Trash2, 
  Lock,
  ChevronLeft,
  Check,
  Bookmark,
  Share2,
  Copy,
  MessageSquare,
  HelpCircle,
  FileText,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export function AccountPage() {
  const { user, signOut, userSubscriptions, banks } = useAppState();
  const { profile, canAccessDashboard } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // Profile states
  const [fullNameInput, setFullNameInput] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Saved results states
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loadingResults, setLoadingResults] = useState<boolean>(true);
  const [selectedResult, setSelectedResult] = useState<SavedResult | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Active section scrolling state (for sidebar tabs highlighting)
  const [activeSection, setActiveSection] = useState<'my-account' | 'saved-results' | 'security' | 'support'>('my-account');

  // Interactive popup modals
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Password update states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Account deletion states
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const displayFullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.username || 'مستخدم حسبة';

  // Haptic feedback simulator
  const handleVibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  // Trigger floating toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load actual saved calculations from Supabase for this logged-in account
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoadingResults(false);
        return;
      }
      setLoadingResults(true);
      try {
        const results = await fetchSavedResults(user.id);
        // Clean out duplicates or empty items
        setSavedResults(results || []);
      } catch (err) {
        console.error("Error fetching saved results in AccountPage:", err);
      } finally {
        setLoadingResults(false);
      }
    }
    loadData();
  }, [user]);

  // Synchronize full name inputs
  useEffect(() => {
    if (profile?.full_name || user?.user_metadata?.full_name) {
      setFullNameInput(profile?.full_name || user?.user_metadata?.full_name || '');
    }
  }, [profile, user]);

  // Sync profile checking
  useEffect(() => {
    async function checkAndCreateProfile() {
      if (!hasSupabaseKeys || !user) return;
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error || !data) {
          console.log("No profile in app_users, creating automatically for user:", user.email);
          await supabase
            .from('app_users')
            .upsert({
              id: user.id,
              email: user.email?.toLowerCase().trim() || '',
              full_name: user?.user_metadata?.full_name || '',
              phone: user?.user_metadata?.phone || '',
              status: 'active',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        }
      } catch (err) {
        console.error("Error auto-checking user profile in AccountPage:", err);
      }
    }
    checkAndCreateProfile();
  }, [user]);

  // Update full name in database
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      showToast('يرجى إدخال اسم كامل صحيح.', 'error');
      return;
    }
    handleVibrate();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      if (hasSupabaseKeys && user) {
        const { error } = await supabase
          .from('app_users')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullNameInput.trim(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (error) throw error;
        
        await supabase.auth.updateUser({
          data: { full_name: fullNameInput.trim() }
        });

        showToast('تم تحديث الشفرة والمزهر الشخصي بنجاح!');
        setShowEditNameModal(false);
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        showToast('محاكاة: تم تحديث البيانات بنجاح.');
        setShowEditNameModal(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'حدث خطأ أثناء حفظ الاسم.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: 'يرجى إدخال كلمة مرور جديدة.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'يجب ألا تقل كلمة المرور عن 6 أحرف.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' });
      return;
    }

    handleVibrate();
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      if (hasSupabaseKeys) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPasswordMessage({ type: 'success', text: 'تم تحديث كلمة المرور بنجاح!' });
        showToast('تم تحديث الكود السري للبروفايل!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordModal(false), 2000);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        setPasswordMessage({ type: 'success', text: 'تم تحديث الرقم في المعاينة المحلية!' });
        showToast('تم التحديث المحلي للجلسة!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordModal(false), 2000);
      }
    } catch (err: any) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: err.message || 'فشل التحديث.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Delete saved calculation card
  const handleCardDelete = async (id: string) => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteSavedResult(id, user.id);
      setSavedResults(prev => prev.filter(item => item.id !== id));
      showToast("تم إزالة الحسبة المحفوظة نهائياً بنجاح");
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting saved calculation:", err);
      showToast("فشلت عملية الإزالة، الرجاء تكرار المحاولة", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Self deletion of the account
  const handleSelfDelete = async () => {
    if (!user?.email) return;
    if (confirmDeleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('البريد الإلكتروني الذي أدخلته غير متطابق.');
      return;
    }

    handleVibrate();
    setDeleteLoading(true);
    setDeleteError('');

    try {
      if (hasSupabaseKeys) {
        const { error } = await supabase.rpc('delete_current_user');
        if (error) {
          const errMsg = error.message || '';
          if (error.code === 'PGRST202' || errMsg.includes('does not exist') || errMsg.includes('could not find the function')) {
            throw new Error("يجب تطبيق دالة الحذف delete_current_user في Supabase أولاً.");
          }
          throw error;
        }
        await signOut();
        window.location.href = '/';
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await signOut();
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'فشل الحذف التلقائي، يرجى التواصل مع الدعم الفني لحسبة.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Generate WhatsApp details and link for matched bank employee
  const getWhatsAppUrl = (item: SavedResult) => {
    const bankName = item.bank_name;
    const matchedBank = banks?.find(b => 
      b.nameAr === bankName || 
      b.nameEn === bankName || 
      bankName.includes(b.nameAr) || 
      b.nameAr.includes(bankName)
    );
    const rawContact = matchedBank?.employeeWhatsApp?.trim();
    if (!rawContact) return null;

    let number = rawContact.replace(/[\s+\-()]/g, '');
    if (!number.startsWith('966') && number.startsWith('0')) {
      number = '966' + number.slice(1);
    } else if (!number.startsWith('966') && !number.startsWith('+')) {
      number = '966' + number;
    }

    const textEnc = encodeURIComponent(`مرحباً، أود الاستفسار والتواصل بخصوص عرض التمويل المحسوب التمهيدي على منصة حسبة:
• الجهة: ${item.bank_name}
• قيمة المنتج التمويلي: ${Math.round(item.real_estate_amount || item.personal_amount).toLocaleString('ar-SA')} ريال
• الملاءة كقسط شهري: ${Math.round(item.monthly_installment).toLocaleString('ar-SA')} ريال
• المدة التشغيلية: ${Math.round(item.term_months / 12)} سنوات`);

    return `https://wa.me/${number}?text=${textEnc}`;
  };

  // Format share text
  const getCalculationCopyText = (item: SavedResult) => {
    const statusAr = item.eligibility_status === 'eligible' ? 'مقبول ومطابق' : 'غير مطابق للائحة';
    const totalAmount = item.real_estate_amount || item.personal_amount;
    const lines = [
      `📊 دراسة ائتمانية وحسبة تمويلية محفوظة عبر منصة حسبة`,
      `• المنشأة التمويلية: ${item.bank_name}`,
      `• الملخص الأساسي: ${item.title}`,
      `• الحالة الائتمانية: ${statusAr}`,
      `• مدة الأقساط: ${Math.round(item.term_months / 12)} سنوات (${item.term_months} شهراً)`,
      `• التمويل الإجمالي: ${Math.round(totalAmount).toLocaleString('ar-SA')} ريال`,
      `• القسط الشهري المستقطع: ${Math.round(item.monthly_installment).toLocaleString('ar-SA')} ريال / شهر`,
      `• هامش الربح والربط: ${item.profit_margin}%`,
      `• الدعم السكني الفيدرالي: ${item.support_type === 'none' ? 'غير مدعوم' : item.support_type === 'monthly' ? 'دعم شهري مستقطع' : 'دفعة عينية عاجلة'}`,
      `\nاستخرج حاسبتك وقارن الآن عبر حسبة: ${window.location.origin}`
    ];
    return lines.join('\n');
  };

  // Copy result to clipboard
  const handleCopyResult = async (item: SavedResult) => {
    const text = getCalculationCopyText(item);
    try {
      await navigator.clipboard.writeText(text);
      showToast("📋 تم نسخ ملخص الحسبة والتقرير بنجاح!");
    } catch (e) {
      showToast("فشل في نسخ النص للمتصفح الحالي", "error");
    }
  };

  // Share result using native APIs or fallback
  const handleShareResult = async (item: SavedResult) => {
    const text = getCalculationCopyText(item);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `حسبة ائتمانية - ${item.bank_name}`,
          text: text,
          url: window.location.origin
        });
        showToast("👍 تمت المشاركة بنجاح!");
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      await handleCopyResult(item);
    }
  };

  const getCreationDate = () => {
    if (!user?.created_at) return '15 مارس 2024'; // fallback matching image
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString("ar-SA", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '15 مارس 2024';
    }
  };

  // Scroll smoothly to screen elements
  const scrollToSection = (id: string, secName: any) => {
    handleVibrate();
    setActiveSection(secName);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Trigger interactive support help popup (Contact helper)
  const triggerCustomerAssistant = () => {
    handleVibrate();
    window.dispatchEvent(new CustomEvent('open-customer-assistant'));
  };

  // Legal routers
  const handleLegalNavigate = (path: string) => {
    handleVibrate();
    location.navigate(path);
  };

  const menuTabsList = [
    { id: 'my-account', name: 'حسابي', icon: User, target: 'section-my-account' },
    { id: 'saved-results', name: 'نتائجي المحفوظة', icon: Bookmark, target: 'section-saved-results' },
    { id: 'security', name: 'الأمان والخصوصية', icon: Shield, target: 'section-security-privacy' },
    { id: 'support', name: 'الدعم والشروط', icon: FileText, target: 'section-support-terms' }
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 pb-16 pt-6 transition-colors duration-200 select-none" dir="rtl">
      
      {/* Main Responsive Layout Wrapper */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* =======================================================
              RIGHT SIDEBAR (Desktop Web-only Navigation)
              ======================================================= */}
          <div className="lg:col-span-1 space-y-6 hidden lg:block sticky top-24">
            
            {/* Sidebar Active Navigation Card */}
            <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-3 shadow-md">
              <nav className="space-y-1.5">
                {menuTabsList.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => scrollToSection(tab.target, tab.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[20px] transition-all duration-300 font-bold text-sm cursor-pointer ${
                        isActive 
                          ? "bg-[#E6F0FA] dark:bg-blue-950/40 text-[#0057B8] dark:text-[#38BDF8] border-r-4 border-[#0057B8] dark:border-[#38BDF8]" 
                          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComp className={`w-5 h-5 ${isActive ? "text-[#0057B8] dark:text-[#38BDF8]" : "text-slate-400"}`} />
                        <span>{tab.name}</span>
                      </div>
                      <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isActive ? "text-[#0057B8] dark:text-[#38BDF8] -translate-x-1" : "text-slate-350"}`} />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Shield Security Card Footer */}
            <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-[#0057B8] dark:text-[#38BDF8] rounded-full flex items-center justify-center border border-blue-100/40 dark:border-blue-900/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-[200px] leading-relaxed">
                نحمي بياناتك وفق أعلى معايير الأمان والخصوصية
              </p>
            </div>

          </div>

          {/* =======================================================
              MAIN LEFT CONTENT COLUMN
              ======================================================= */}
          <div className="lg:col-span-3 space-y-6">

            {/* 0. DYNAMIC THEME SELECTOR CARD */}
            <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-right w-full sm:w-auto flex-col sm:flex-row">
                <div className="w-12 h-12 bg-slate-50 dark:bg-[#0F172A] rounded-2xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-100 dark:border-slate-800">
                  {theme === 'dark' ? (
                    <Moon className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <Sun className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm text-slate-900 dark:text-white leading-none">مظهر التطبيق</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">تخصيص المظهر وتفعيل الوضع الفاتح أو الداكن</p>
                </div>
              </div>
              <button
                onClick={() => { handleVibrate(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                className="w-full sm:w-auto px-6 py-3 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-black text-xs rounded-xl border border-slate-150 dark:border-slate-850 cursor-pointer transition-all flex items-center justify-center gap-2 select-none"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>تفعيل الوضع الفاتح</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
                    <span>تفعيل الوضع الداكن</span>
                  </>
                )}
              </button>
            </div>

            {/* 1. USER ACCOUNT INFORMATION CARD */}
            <div id="section-my-account" className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md relative overflow-hidden">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* User Identity block */}
                <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
                  {/* Dynamic Letter Portrait */}
                  <div className="w-20 h-20 bg-[#0057B8] dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white select-none shrink-0">
                    {displayFullName.trim().charAt(0) || 'أ'}
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                      {displayFullName}
                    </h2>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="text-xs md:text-sm font-semibold font-mono text-slate-500 flex items-center gap-1" dir="ltr">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{user?.email || 'saud.ahmed@gmail.com'}</span>
                      </span>
                      
                      <span className="flex items-center gap-1 bg-[#E8F8F2] text-xs font-black px-2.5 py-1 rounded-full text-emerald-700 shrink-0 select-none border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>البريد موثق</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center justify-center md:justify-start gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>تاريخ إنشاء الحساب:</span>
                      <span className="font-mono">{getCreationDate()}</span>
                    </p>
                  </div>
                </div>

                {/* Edit details button */}
                <button
                  onClick={() => { handleVibrate(); setShowEditNameModal(true); }}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-700 hover:border-[#0057B8] dark:hover:border-[#38BDF8] rounded-xl hover:bg-blue-50/10 text-[#0057B8] dark:text-[#38BDF8] text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  <span>تعديل البيانات</span>
                </button>

              </div>

            </div>

            {/* =======================================================
                MOBILE-ONLY VERTICAL CATEGORIES LIST
                ======================================================= */}
            <div className="lg:hidden bg-white dark:bg-[#151F32] rounded-[24px] border border-slate-100/80 dark:border-slate-800 p-2 shadow-md">
              {menuTabsList.map((tab) => {
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.target, tab.id)}
                    className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 text-slate-600 dark:text-slate-355 font-bold text-sm cursor-pointer hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50/50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                        <IconComp className="w-4.5 h-4.5" />
                      </div>
                      <span>{tab.name}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-350" />
                  </button>
                );
              })}
            </div>

            {/* 2. REAL SAVED RESULTS SECTION */}
            <div id="section-saved-results" className="bg-white dark:bg-[#151F32] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-6">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800">
                <h3 className="font-sans font-black text-base md:text-lg text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Bookmark className="w-5.5 h-5.5 text-[#0057B8] dark:text-[#38BDF8]" />
                  <span>نتائجي المحفوظة</span>
                </h3>

                <button 
                  onClick={() => { handleVibrate(); location.navigate('/'); }}
                  className="text-xs text-[#0057B8] dark:text-[#38BDF8] font-black hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض كل النتائج</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Loader */}
              {loadingResults && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-[#0057B8] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-slate-450 font-bold">جاري جلب حسبتك المعتمدة من السيرفر...</p>
                </div>
              )}

              {/* No results placeholder */}
              {!loadingResults && savedResults.length === 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[20px] p-8 text-center space-y-4 border border-slate-100 dark:border-slate-800/60">
                  <Calculator className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs md:text-sm font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
                    لا توجد نتائج محفوظة حتى الآن. قارن واستخرج برامج التمويل ثم احفظ نتائجك لمراجعتها لاحقاً.
                  </p>
                  <button
                    onClick={() => { handleVibrate(); location.navigate('/'); }}
                    className="px-5 py-2.5 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-black rounded-lg transition-all cursor-pointer"
                  >
                    إجراء حسبة جديدة
                  </button>
                </div>
              )}

              {/* Saved Results Grid */}
              {!loadingResults && savedResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {savedResults.map((item) => {
                    const isEligible = item.eligibility_status === 'eligible';
                    const matchedWhatsApp = getWhatsAppUrl(item);

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-[#1A263E] border border-slate-150 dark:border-slate-805 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
                      >
                        {/* Card Title Block with logo fallback */}
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {/* Logo circle */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 select-none text-white ${
                              item.payload?.logoColor ? `bg-gradient-to-br ${item.payload.logoColor}` : 'bg-[#0057B8]'
                            }`}>
                              {item.payload?.logoText || item.bank_name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-sans font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate leading-snug">
                                {item.bank_name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-0.5">
                                {item.finance_type}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                            isEligible 
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40" 
                              : "bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/40"
                          }`}>
                            {isEligible ? "مؤهل" : "غير مطابق"}
                          </span>
                        </div>

                        {/* Card Parameters Content */}
                        <div className="p-4 space-y-3 flex-1 text-right text-xs">
                          <div className="space-y-1 border-b border-slate-50 dark:border-slate-800/80 pb-2.5">
                            <span className="text-[10px] text-slate-400 font-bold block">إجمالي مبلغ التمويل:</span>
                            <span className="text-sm font-black text-[#0057B8] dark:text-[#38BDF8] font-mono tabular-nums leading-none">
                              {Math.round(item.real_estate_amount || item.personal_amount).toLocaleString('ar-SA')} <span className="text-[10px] font-sans text-slate-400">ريال</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-450 font-bold block">القسط الشهري:</span>
                              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                                {Math.round(item.monthly_installment).toLocaleString('ar-SA')} <span className="text-[9px] font-sans text-slate-400">ريال</span>
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-455 font-bold block">المدة:</span>
                              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono tracking-tight">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{item.term_months} شهراً</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Control Toolbar */}
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          
                          <div className="flex gap-1.5 w-full">
                            <button
                              onClick={() => { handleVibrate(); setSelectedResult(item); }}
                              className="flex-3 py-2 bg-[#0057B8] dark:bg-blue-650 text-white rounded-lg text-[11px] font-extrabold transition-all hover:bg-opacity-90 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>عرض النتيجة</span>
                            </button>

                            <button
                              onClick={() => { handleVibrate(); handleCopyResult(item); }}
                              className="flex-1 p-2 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                              title="نسخ ملخص التقرير"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => { handleVibrate(); handleShareResult(item); }}
                              className="flex-1 p-2 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                              title="مشاركة الحسبة"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => { handleVibrate(); setDeleteConfirmId(item.id); }}
                              className="flex-1 p-2 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50/50 rounded-lg flex items-center justify-center text-rose-500 cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Contact WhatsApp Employee Full Width button */}
                          {matchedWhatsApp && (
                            <a
                              href={matchedWhatsApp}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleVibrate}
                              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تواصل مع الموظف عبر الوتساب</span>
                            </a>
                          )}

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* 3. SECURITY AND PRIVACY SECTION */}
            <div id="section-security-privacy" className="bg-white dark:bg-[#151F32] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-6">
              
              <h3 className="font-sans font-black text-base md:text-lg text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2.5">
                <ShieldCheck className="w-5.5 h-5.5 text-[#0057B8] dark:text-[#38BDF8]" />
                <span>الأمان والخصوصية</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* A. Change Password button Card */}
                <button
                  onClick={() => { handleVibrate(); setShowPasswordModal(true); }}
                  className="bg-slate-50/50 dark:bg-[#101726]/40 hover:bg-blue-50/20 border border-slate-150/70 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
                >
                  <div className="space-y-1 shrink overflow-hidden pr-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تغيير كلمة المرور</h4>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">تحديث وحماية الباسورد</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-100/50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <KeyRound className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                </button>

                {/* B. Verification status button Card */}
                <button
                  onClick={() => { handleVibrate(); setShowVerificationModal(true); }}
                  className="bg-slate-50/50 dark:bg-[#101726]/40 hover:bg-blue-50/20 border border-slate-150/70 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
                >
                  <div className="space-y-1 shrink overflow-hidden pr-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">حالة التحقق</h4>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">البريد موثق ومؤصل</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-100/50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </button>

                {/* C. Logout button Card */}
                <button
                  onClick={() => { handleVibrate(); signOut(); }}
                  className="bg-slate-50/50 dark:bg-[#101726]/40 hover:bg-amber-50/30 border border-slate-150/70 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
                >
                  <div className="space-y-1 shrink overflow-hidden pr-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تسجيل الخروج</h4>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">مغادرة الجلسة الحالية</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-100/50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-amber-650 shrink-0">
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </button>

                {/* D. Delete account Card */}
                <button
                  onClick={() => { handleVibrate(); setShowDeleteConfirm(true); }}
                  className="bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/30 border border-rose-100/40 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
                >
                  <div className="space-y-1 shrink overflow-hidden pr-1">
                    <h4 className="text-xs font-black text-rose-600 dark:text-rose-400">حذف الحساب</h4>
                    <p className="text-[10px] text-rose-450 dark:text-rose-500 font-semibold truncate">إتلاف نهائي وسري للبيانات</p>
                  </div>
                  <div className="w-9 h-9 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-4 h-4 group-hover:shake transition-transform duration-300" />
                  </div>
                </button>

              </div>

            </div>

            {/* 4. SUPPORT AND TERMS SECTION */}
            <div id="section-support-terms" className="bg-white dark:bg-[#151F32] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-6">
              
              <h3 className="font-sans font-black text-base md:text-lg text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2.5">
                <HelpCircle className="w-5.5 h-5.5 text-[#0057B8] dark:text-[#38BDF8]" />
                <span>الدعم والشروط المستندية</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Terms link */}
                <button
                  onClick={() => handleLegalNavigate('/terms')}
                  className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer text-right text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50/50 dark:bg-slate-800 text-[#0057B8] dark:text-[#38BDF8] rounded-xl flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-200">شروط الاستخدام والأهلية</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">تفاصيل الأحكام والشروط المنظمة للمنصة</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Privacy policy link */}
                <button
                  onClick={() => handleLegalNavigate('/privacy')}
                  className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer text-right text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50/50 dark:bg-slate-800 text-[#0057B8] dark:text-[#38BDF8] rounded-xl flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-200">سياسة الخصوصية وسرية الحسبة</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">كيف نحمي معلوماتك وكيف يتم معالجتها</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Disclaimer policy */}
                <button
                  onClick={() => handleLegalNavigate('/disclaimer')}
                  className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer text-right text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50/50 dark:bg-slate-800 text-[#0057B8] dark:text-[#38BDF8] rounded-xl flex items-center justify-center font-bold">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-200">إخلاء المسؤولية التنظيمي</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">النتائج التقديرية ونفي تمثيل البنوك</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Live Assistant Trigger (Connect with support) */}
                <button
                  onClick={triggerCustomerAssistant}
                  className="w-full p-4 hover:bg-blue-50/20 bg-blue-50/5 dark:bg-slate-900/30 rounded-2xl border border-blue-100/40 dark:border-slate-800 flex items-center justify-between group cursor-pointer text-right text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#0057B8] dark:bg-blue-650 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                      <MessageSquare className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-200">تواصل مع مساعد حسبة الذكي</h4>
                      <p className="text-[10px] text-[#0057B8] dark:text-[#38BDF8] font-bold mt-0.5">فتح نافذة الدعم المالي الفوري والمحادثة</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#0057B8] dark:text-[#38BDF8] group-hover:-translate-x-1 transition-transform" />
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =======================================================
          MINIMAL COHESIVE FOOTER
          ======================================================= */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-200/65 dark:border-slate-800/80 text-center select-none space-y-4">
        
        <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-xs text-slate-500 dark:text-slate-400">
          <button onClick={() => handleLegalNavigate('/terms')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">شروط الاستخدام</button>
          <span className="text-slate-300 dark:text-slate-850 text-[10px]">•</span>
          <button onClick={() => handleLegalNavigate('/privacy')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">سياسة الخصوصية</button>
          <span className="text-slate-300 dark:text-slate-850 text-[10px]">•</span>
          <button onClick={() => handleLegalNavigate('/disclaimer')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">إخلاء المسؤولية</button>
          <span className="text-slate-300 dark:text-slate-850 text-[10px]">•</span>
          <button onClick={triggerCustomerAssistant} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">تواصل معنا</button>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold" dir="rtl">
          © {new Date().getFullYear()} حسبة. جميع الحقوق محفوظة وموثقة لدى المنصة.
        </p>

      </footer>

      {/* =======================================================
          📊 INTERACTIVE POPUP MODALS
          ======================================================= */}

      {/* A. EDIT NAME MODAL */}
      {showEditNameModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 text-right animate-scale-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">تعديل الاسم البروفيلي</h3>
              <button 
                onClick={() => setShowEditNameModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer text-xs"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">الاسم الكامل الرسمي المحدث:</label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={e => setFullNameInput(e.target.value)}
                  placeholder="أدخل الاسم بوضوح لمطابقته ائتمانياً"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#38BDF8] text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-100 outline-none transition-all"
                />
                <p className="text-[10.5px] text-slate-400 leading-normal font-medium">يستخدم هذا الكلم في إخراج التقارير والتدقيق التلقائي التمهيدي للمقارنة.</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex-1 py-3 bg-[#0057B8] hover:bg-[#00479b] text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? 'جاري توثيق المزامنة...' : 'حفظ الاسم المحدث'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="px-5 py-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. PASSWORD RESET MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 text-right animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">تحديث كلمة المرور</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                عبر ملئ المعمريين أدناه، سيتم تعميد الباسورد الجديد بشكل مباشر وفوري في خوادم الإشارة لحماية حسابك الاستشاري.
              </p>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 font-bold block text-right">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-left"
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 font-bold block text-right">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {passwordMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20' : 'bg-red-50 text-red-850 dark:bg-red-950/20'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-805">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-3 bg-[#0057B8] hover:bg-[#00479b] text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'جاري تعميد السيرفر...' : 'تحديث كلمة السر'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-5 py-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. EMAIL VERIFICATION STATUS PROMPT */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center animate-scale-up space-y-4">
            
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-100/40">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">توثيق الحساب والبريد</h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                حسابك موثق بالكامل ومحمي ضمن شبكة قنوات حسبة الآمنة. عنوان البريد الإلكتروني الخاص بك مفعل ولديه كامل الصلاحيات لتنفيذ الحساب وتصدير ملفات الأقساط.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* D. UNIFIED CALCULATIONS DETAILS DRAWER */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-[#F4F7FB] dark:bg-[#0E1624] h-full overflow-y-auto flex flex-col animate-slide-in shadow-2xl text-right" dir="rtl">
            
            {/* Header */}
            <div className={`p-6 text-white bg-gradient-to-r ${selectedResult.payload?.logoColor ? `bg-gradient-to-br ${selectedResult.payload.logoColor}` : 'from-[#0057B8] to-blue-800'} sticky top-0 z-10 flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-xs select-none">
                  {selectedResult.payload?.logoText || selectedResult.bank_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">{selectedResult.bank_name}</h3>
                  <p className="text-[10px] text-white/80 font-bold">تقرير دراسة الحسبة املحفوظة</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedResult(null)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black cursor-pointer"
              >
                رجوع
              </button>
            </div>

            {/* Document Details Body */}
            <div className="p-5 space-y-5 flex-1">
              
              {/* Top Summary Block */}
              <div className="bg-white dark:bg-[#151F32] border border-slate-150 rounded-2xl p-4 space-y-3 shadow-xs">
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{selectedResult.title}</h4>
                <div className="grid grid-cols-2 gap-y-2.5 text-[11px] font-semibold text-slate-500">
                  <div>قطاع العميل: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedResult.sector}</span></div>
                  <div>نوع المنتج: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedResult.finance_type}</span></div>
                  <div>مبلغ العقار: <span className="text-slate-850 dark:text-slate-100 font-mono font-black" dir="ltr">{Math.round(selectedResult.real_estate_amount).toLocaleString('ar-SA')} ريال</span></div>
                  <div>المدة بالأشهر: <span className="text-slate-850 dark:text-slate-100 font-mono font-black">{selectedResult.term_months} شهراً</span></div>
                </div>
              </div>

              {/* Installment parameters */}
              <div className="bg-white dark:bg-[#151F32] border border-slate-150 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
                <h4 className="font-black text-slate-900 dark:text-white text-xs border-b border-slate-50 dark:border-slate-800 pb-2">تفاصيل الاستقطاع الشهري</h4>
                
                <div className="space-y-3 text-xs font-bold">
                  <div className="flex justify-between items-center text-slate-900 dark:text-white py-1">
                    <span className="text-slate-500">قيمة القسط المستقطع:</span>
                    <span className="text-sm font-black text-emerald-600 font-mono" dir="ltr">
                      {Math.round(selectedResult.monthly_installment).toLocaleString('ar-SA')} ريال شهرياً
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 dark:text-white py-1">
                    <span className="text-slate-500 border-t border-slate-50/50">هامش الربح السنوي:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-105 font-black">{selectedResult.profit_margin}%</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 dark:text-white py-1">
                    <span className="text-slate-500">الدعم السكني المستحق:</span>
                    <span className="text-slate-800 dark:text-slate-105">
                      {selectedResult.support_type === 'none' ? 'بدون دعم سكني' : selectedResult.support_type === 'monthly' ? 'دعم شهري شامل' : 'دعم دفعة مقدمة عينية'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 rounded-xl p-4 flex items-start gap-2 text-right">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                  تنبيه: النتائج المعروضة تقديرية مبدئية لاستقراء ملاءة العميل العقارية، وتخضع للموافقة الائتمانية واللوائح الصارمة للجهة المانحة والبنك الشريك لمعايير SAMA.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* E. SAVED RESULT DELECTION CONFIRM DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center animate-scale-up space-y-4">
            
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 text-red-650 rounded-full flex items-center justify-center mx-auto border border-red-100/50">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="font-sans font-black text-slate-950 dark:text-white text-base">حذف النتيجة المحفوظة؟</h3>
              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                ستتم إزالة هذه المعاينة المعتمدة فوراً ولن تتمكن من الاطلاع عليها مجدداً.
              </p>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button
                onClick={() => handleCardDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                {deleting ? "جاري الإتلاف..." : "تأكيد الإزالة"}
              </button>
              
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* F. SECURE ACCOUNT DELETION MODAL WITH EMAIL CONFIRM */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 text-right animate-scale-up space-y-4">
            
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-955 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="font-sans font-black text-rose-600 dark:text-rose-450 text-base">هل أنت متأكد تماماً من حذف الحساب؟</h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold max-w-sm mx-auto">
                هذا الإجراء مدمر ولا يمكن التراجع عنه. ستفقد جميع الحسبات المقارنة وعروض التمويل المحفوظة سحابياً بشكل معجل وفوري.
              </p>
            </div>

            <div className="space-y-1 text-right">
              <label className="text-[11px] text-slate-550 font-black block">لتأكيد الحذر، يرجى كتابة بريدك الإلكتروني بالأسفل:</label>
              <input
                type="text"
                required
                value={confirmDeleteEmail}
                onChange={e => setConfirmDeleteEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني المسجل هنا..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-xs text-left text-slate-800 dark:text-slate-105 rounded-xl outline-none"
                dir="ltr"
              />
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-2 w-full pt-1.5 border-t border-slate-50 dark:border-slate-800">
              <button
                onClick={handleSelfDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "جاري الإلغاء والرفع..." : "نعم، احذف حسابي نهائياً"}
              </button>
              
              <button
                onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteEmail(''); setDeleteError(''); }}
                disabled={deleteLoading}
                className="px-5 py-3 bg-slate-55 dark:bg-slate-900 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء الإجراء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================
          💨 FLOATING TOAST FEEDBACK NOTIFICATION
          ======================================================= */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 animate-slide-up select-none max-w-sm mx-auto sm:mx-0">
          <div className={`p-4 rounded-[16px] shadow-2xl flex items-center gap-3 text-right ${
            toast.type === 'error' 
              ? 'bg-rose-600 text-white' 
              : 'bg-[#151F32] text-white border border-slate-800/80'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'error' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold leading-relaxed">
              {toast.message}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
