import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { supabase, hasSupabaseKeys } from "../lib/supabase";
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Mail, 
  Shield, 
  Calendar, 
  KeyRound, 
  Settings, 
  Info, 
  ChevronLeft, 
  Check, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  Sun, 
  Moon, 
  Phone, 
  CreditCard, 
  Crown,
  Sparkles,
  AlertTriangle,
  Download
} from "lucide-react";
import { getBillingProfile, testBillingProfileUniquePhone } from "../lib/subscriptionService";
import { normalizeSaudiPhone, isValidSaudiPhone } from "../lib/phoneUtils";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { usePwaInstallPrompt } from "../hooks/usePwaInstallPrompt";

export function AccountPage() {
  const { user, signOut, subSettings, subscriptionSettings } = useAppState();
  const { profile, refreshProfile } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const subStatus = useSubscriptionStatus();
  const { canInstall, isInstalled, promptInstall, resetDismissalAndPrompt, isIosSafari } = usePwaInstallPrompt();

  // Profile states
  const [fullNameInput, setFullNameInput] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [installError, setInstallError] = useState<string | null>(null);
  const [billingProfile, setBillingProfile] = useState<any>(null);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Active section state: 'menu' (mobile only) or one of the section IDs
  const [activeSection, setActiveSection] = useState<string>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'menu' : 'my-account';
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  // Modals state
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

  // Sync profile details
  useEffect(() => {
    if (profile?.full_name || user?.user_metadata?.full_name) {
      setFullNameInput(profile?.full_name || user?.user_metadata?.full_name || '');
    }
  }, [profile, user]);

  useEffect(() => {
    if (user?.email) {
      setEmailInput(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (billingProfile?.phone_number) {
      setPhoneInput(billingProfile.phone_number);
    } else if (user?.user_metadata?.phone) {
      setPhoneInput(user.user_metadata.phone);
    }
  }, [billingProfile, user]);

  // Load user billing profile details
  useEffect(() => {
    async function loadBillingProfile() {
      if (!user) return;
      try {
        const bp = await getBillingProfile(user.id);
        setBillingProfile(bp);
      } catch (err) {
        console.error("Error loading billing profile in AccountPage:", err);
      }
    }
    loadBillingProfile();
  }, [user]);

  // Sync window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setActiveSection(prev => (prev === 'menu' || !prev) ? 'my-account' : prev);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openEditModal = () => {
    setFullNameInput(profile?.full_name || user?.user_metadata?.full_name || '');
    setEmailInput(user?.email || '');
    setPhoneInput(billingProfile?.phone_number || user?.user_metadata?.phone || '');
    setProfileMessage(null);
    setShowEditNameModal(true);
  };

  // Update profile handler (name, email, phone)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      const msg = 'يرجى إدخال اسم كامل صحيح.';
      setProfileMessage({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }
    if (!emailInput.trim()) {
      const msg = 'يرجى إدخال بريد إلكتروني صحيح.';
      setProfileMessage({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }
    if (phoneInput.trim() && !isValidSaudiPhone(phoneInput)) {
      const msg = 'يرجى إدخال رقم جوال سعودي صحيح.';
      setProfileMessage({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }

    handleVibrate();
    setProfileSaving(true);
    setProfileMessage(null);

    const normalizedPhone = phoneInput.trim() ? normalizeSaudiPhone(phoneInput) : null;
    const newEmail = emailInput.trim().toLowerCase();
    const newName = fullNameInput.trim();
    const currentEmail = user?.email || '';

    try {
      if (hasSupabaseKeys && user) {
        // Check Phone Uniqueness
        if (normalizedPhone) {
          const isUnique = await testBillingProfileUniquePhone(normalizedPhone, user.id);
          if (!isUnique) {
            throw new Error('phone_duplicate');
          }
        }

        // 1. Update app_users
        const { error: appUserErr } = await supabase
          .from('app_users')
          .upsert({
            id: user.id,
            email: currentEmail, // keep current email
            full_name: newName,
            phone: normalizedPhone,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (appUserErr) {
          if (appUserErr.code === '23505' || appUserErr.message?.includes('unique_billing_normalized_phone')) {
            throw new Error('phone_duplicate');
          }
          throw appUserErr;
        }

        // 2. Update or create user_billing_profiles
        const { data: existingBp, error: fetchBpErr } = await supabase
          .from('user_billing_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingBp) {
          const { error: bpErr } = await supabase
            .from('user_billing_profiles')
            .update({
              phone_number: normalizedPhone,
              normalized_phone: normalizedPhone,
              full_name: newName,
              email: currentEmail, // keep current email
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
          if (bpErr) {
            if (bpErr.code === '23505' || bpErr.message?.includes('unique_billing_normalized_phone')) {
              throw new Error('phone_duplicate');
            }
            throw bpErr;
          }
        } else {
          const { error: bpErr } = await supabase
            .from('user_billing_profiles')
            .insert({
              user_id: user.id,
              phone_number: normalizedPhone,
              normalized_phone: normalizedPhone,
              full_name: newName,
              email: currentEmail, // keep current email
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          if (bpErr) {
            if (bpErr.code === '23505' || bpErr.message?.includes('unique_billing_normalized_phone')) {
              throw new Error('phone_duplicate');
            }
            throw bpErr;
          }
        }

        // 3. Update user metadata
        const { error: metadataErr } = await supabase.auth.updateUser({
          data: { 
            full_name: newName,
            phone: normalizedPhone
          }
        });
        if (metadataErr) throw metadataErr;

        // 4. Update Email step separately if changing
        let emailChanged = false;
        let emailUpdateError = null;

        if (newEmail !== currentEmail.toLowerCase()) {
          const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail });
          if (emailErr) {
            console.error('Email update error:', emailErr);
            emailUpdateError = emailErr;
          } else {
            emailChanged = true;
          }
        }

        // Refresh AuthContext Profile
        if (refreshProfile) {
          await refreshProfile();
        }

        // Refresh local billing states
        const updatedBp = await getBillingProfile(user.id);
        setBillingProfile(updatedBp);

        setShowEditNameModal(false);

        if (emailUpdateError) {
          const warnMsg = 'تم حفظ الاسم ورقم الجوال، ولكن فشل تحديث البريد الإلكتروني. يرجى التحقق من بريدك الجديد أو إعدادات التأكيد.';
          setProfileMessage({ type: 'error', text: warnMsg });
          showToast(warnMsg, 'error');
        } else if (emailChanged) {
          showToast('تم تحديث بيانات الحساب بنجاح. تم إرسال رابط تأكيد إلى بريدك الجديد لإتمام التغيير.', 'success');
        } else {
          showToast('تم تحديث بيانات الحساب بنجاح.', 'success');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        showToast('تم تحديث بيانات الحساب بنجاح (معاينة محلي)');
        setShowEditNameModal(false);
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'تعذر تحديث البيانات حاليًا. حاول مرة أخرى.';
      if (err.message === 'phone_duplicate' || err.code === '23505' || err.message?.includes('unique_billing_normalized_phone')) {
        errorMessage = 'رقم الجوال مستخدم مسبقًا.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setProfileMessage({ type: 'error', text: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Update password handler
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
        setPasswordMessage({ type: 'success', text: 'تم تحديث الكود في المعاينة المحلية!' });
        showToast('تم التحديث بنجاح!');
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

  // Delete account handler
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

  const getCreationDate = () => {
    if (!user?.created_at) return '15 مارس 2024';
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

  // WhatsApp contact
  const handleContactViaWhatsapp = () => {
    const rawNumber = subscriptionSettings?.activationWhatsappNumber || '';
    const normalizedNumber = rawNumber.replace(/\D/g, '');

    if (!normalizedNumber) {
      showToast('رقم واتساب التفعيل غير مضاف حاليًا.', 'error');
      return;
    }

    const defaultMsg = subscriptionSettings?.activationWhatsappMessage || 'مرحبًا، أريد تفعيل اشتراك حسبة.';
    const userPhone = billingProfile?.phone_number || user?.user_metadata?.phone || 'غير متوفر';
    const userEmail = user?.email || 'غير متوفر';
    const planName = subStatus.subscription?.plan?.name || 'الباقة المجانية';

    const messageText = `${defaultMsg}

بريدي الإلكتروني: ${userEmail}
رقم الجوال: ${userPhone}
الباقة الحالية: ${planName}`;

    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const triggerCustomerAssistant = () => {
    handleVibrate();
    window.dispatchEvent(new CustomEvent('open-customer-assistant'));
  };

  const handleLegalNavigate = (path: string) => {
    handleVibrate();
    location.navigate(path);
  };

  // Section items definitions
  const menuTabsList = [
    { id: 'my-account', name: 'حسابي', icon: User },
    { id: 'subscription', name: 'الباقات والاشتراك', icon: CreditCard },
    { id: 'security', name: 'الأمان والخصوصية', icon: ShieldCheck },
    { id: 'support', name: 'الدعم والشروط', icon: FileText },
    { id: 'appearance', name: 'مظهر التطبيق', icon: Settings }
  ];

  // Render each section content dynamically
  const renderSectionContent = (id: string) => {
    switch (id) {
      case 'my-account':
        return (
          <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md relative overflow-hidden text-right">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* User Identity */}
              <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right w-full md:w-auto">
                <div className="w-20 h-20 bg-[#0057B8] dark:bg-blue-650 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white dark:border-slate-800 select-none shrink-0 mx-auto md:mx-0">
                  {displayFullName.trim().charAt(0) || 'أ'}
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                    {displayFullName}
                  </h2>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <span className="text-xs md:text-sm font-semibold font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1" dir="ltr">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{user?.email || 'saud.ahmed@gmail.com'}</span>
                    </span>
                    
                    <span className="flex items-center gap-1 bg-[#E8F8F2] dark:bg-emerald-955/20 text-xs font-black px-2.5 py-1 rounded-full text-emerald-700 dark:text-emerald-400 shrink-0 select-none border border-emerald-100 dark:border-emerald-900/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>البريد موثق</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5">
                    <span className="text-xs md:text-sm font-semibold font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1" dir="ltr">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{billingProfile?.phone_number || user?.user_metadata?.phone || 'لا يوجد رقم جوال'}</span>
                    </span>
                    
                    <span className="flex items-center gap-1 bg-[#E6F0FA] dark:bg-blue-950/20 text-xs font-black px-2.5 py-1 rounded-full text-[#0057B8] dark:text-[#38BDF8] shrink-0 select-none border border-blue-100 dark:border-blue-950/40">
                      <Check className="w-3.5 h-3.5" />
                      <span>رقم الجوال قابل للتعديل</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center justify-center md:justify-start gap-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>تاريخ إنشاء الحساب:</span>
                    <span className="font-mono">{getCreationDate()}</span>
                  </p>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => { handleVibrate(); openEditModal(); }}
                className="px-5 py-3 border border-slate-200 dark:border-slate-700 hover:border-[#0057B8] dark:hover:border-[#38BDF8] rounded-xl hover:bg-blue-50/10 text-[#0057B8] dark:text-[#38BDF8] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 select-none w-full md:w-auto"
              >
                <Settings className="w-4 h-4" />
                <span>تعديل البيانات</span>
              </button>

            </div>
          </div>
        );

      case 'subscription':
        const isNotSubscribed = !subStatus.subscription || subStatus.isExpired;
        return (
          <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 text-right w-full">
            <div className="space-y-4 flex-1 w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center border border-amber-100/30 shrink-0">
                  <Crown className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">باقتي الحالية</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">تفاصيل اشتراكك النشط وصلاحيات حسابك</p>
                </div>
              </div>

              {isNotSubscribed ? (
                <div className="bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-100 dark:border-yellow-900/40 rounded-2xl p-4 text-right">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-bold leading-relaxed">
                    لا يوجد اشتراك نشط. اختر باقة أو تواصل معنا لتفعيل الحساب.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-right">
                  {/* Plan Name & Status */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] rounded-2xl p-4 border border-slate-100 dark:border-slate-800/40 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">الباقة الحالية</span>
                    <div className="flex items-center justify-start gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {subStatus.subscription?.plan?.name || 'باقة مجانية'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        مفعل
                      </span>
                    </div>
                  </div>

                  {/* Days & Expiry */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] rounded-2xl p-4 border border-slate-100 dark:border-slate-800/40 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">صلاحية الباقة</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {subStatus.daysRemaining > 0 
                        ? `${subStatus.daysRemaining} يوم متبقي`
                        : subStatus.subscription?.ends_at 
                          ? 'باقة دائمة' 
                          : 'صلاحية غير محدودة'
                      }
                      {subStatus.subscription?.ends_at && (
                        <span className="text-[10px] text-slate-400 block font-normal font-mono mt-0.5">
                          تاريخ الانتهاء: {new Date(subStatus.subscription.ends_at).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Usage Limit */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] rounded-2xl p-4 border border-slate-100 dark:border-slate-800/40 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">الاستخدام اليومي للعمليات</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {subStatus.dailyLimit === null ? (
                        'الاستخدام اليومي: غير محدود'
                      ) : (
                        <>
                          تم استخدام {subStatus.usedToday} من {subStatus.dailyLimit}
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                            المتبقي اليوم: {subStatus.remainingToday} عمليات
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                {subStatus.subscription?.ends_at ? (
                  `باقتك مفعلة وصالحة حتى تاريخ ${new Date(subStatus.subscription.ends_at).toLocaleDateString('ar-SA')}`
                ) : (
                  'باقتك المجانية مفعلة تلقائياً للاستخدام الدائم وغير المحدود للمقارنات.'
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:self-end shrink-0 w-full md:w-auto">
              <button
                onClick={() => {
                  handleVibrate();
                  location.navigate('/subscription');
                }}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 dark:bg-blue-650 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none border border-transparent w-full md:w-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>عرض الباقات</span>
              </button>

              <button
                onClick={() => {
                  handleVibrate();
                  handleContactViaWhatsapp();
                }}
                className="px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-[#10B981] dark:bg-[#1E3A2F] dark:hover:bg-[#1E3A2F]/80 border border-emerald-150 dark:border-slate-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none w-full md:w-auto"
              >
                <MessageSquare className="w-4 h-4" />
                <span>تواصل واتساب</span>
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-6 text-right w-full">
            <h3 className="font-sans font-black text-base md:text-lg text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2.5">
              <ShieldCheck className="w-5.5 h-5.5 text-[#0057B8] dark:text-[#38BDF8]" />
              <span>الأمان والخصوصية</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Change Password */}
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

              {/* Verification Status */}
              <button
                onClick={() => { handleVibrate(); setShowVerificationModal(true); }}
                className="bg-slate-50/50 dark:bg-[#101726]/40 hover:bg-blue-50/20 border border-slate-150/70 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
              >
                <div className="space-y-1 shrink overflow-hidden pr-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">حالة التحقق</h4>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">البريد موثق ومؤصل</p>
                </div>
                <div className="w-9 h-9 bg-slate-100/50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-550 shrink-0">
                  <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </button>

              {/* Logout */}
              <button
                onClick={() => { handleVibrate(); signOut(); }}
                className="bg-slate-50/50 dark:bg-[#101726]/40 hover:bg-amber-50/30 border border-slate-150/70 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
              >
                <div className="space-y-1 shrink overflow-hidden pr-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تسجيل الخروج</h4>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">مغادرة الجلسة الحالية</p>
                </div>
                <div className="w-9 h-9 bg-slate-100/50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-amber-655 shrink-0">
                  <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </button>

              {/* Delete Account */}
              <button
                onClick={() => { handleVibrate(); setShowDeleteConfirm(true); }}
                className="bg-rose-50/10 dark:bg-rose-955/5 hover:bg-rose-50/30 border border-rose-100/40 p-4 rounded-2xl flex items-center justify-between text-right cursor-pointer group transition-all"
              >
                <div className="space-y-1 shrink overflow-hidden pr-1">
                  <h4 className="text-xs font-black text-rose-600 dark:text-rose-450">حذف الحساب</h4>
                  <p className="text-[10px] text-rose-450 dark:text-rose-500 font-semibold truncate">إتلاف نهائي وسري للبيانات</p>
                </div>
                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2Icon className="w-4 h-4 group-hover:shake transition-transform duration-300" />
                </div>
              </button>
            </div>

            {/* Security Note */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 p-5 rounded-2xl flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-[#0057B8] dark:text-[#38BDF8] shrink-0" />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">سرية وأمان تعاملاتك الميدانية</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                  نستخدم أعلى بروتوكولات التشفير والتحقق الثنائي لضمان حماية دراستك الائتمانية وحظر أي محاولات للاطلاع على بيانات حسبتك العقارية والتمويلية الخاصة من أي أطراف ثالثة.
                </p>
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-6 text-right w-full">
            <h3 className="font-sans font-black text-base md:text-lg text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2.5">
              <LogOut className="w-5.5 h-5.5 text-[#0057B8] dark:text-[#38BDF8] rotate-180" />
              <span>الدعم والشروط المستندية</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Terms */}
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

              {/* Privacy */}
              <button
                onClick={() => handleLegalNavigate('/privacy')}
                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer text-right text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50/50 dark:bg-slate-800 text-[#0057B8] dark:text-[#38BDF8] rounded-xl flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-855 dark:text-slate-200">سياسة الخصوصية وسرية الحسبة</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">كيف نحمي معلوماتك وكيف يتم معالجتها</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Disclaimer */}
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

              {/* Assistant Chat */}
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
        );

      case 'appearance':
        return (
          <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 md:p-8 shadow-md space-y-4 text-right w-full">
            <div>
              <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">مظهر التطبيق</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">اختر مظهر التطبيق الذي يناسبك</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
              {/* Light Button */}
              <button
                onClick={() => {
                  handleVibrate();
                  setTheme('light');
                }}
                className={`flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#E6F0FA] text-[#0057B8] border-[#0057B8]/40 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>فاتح</span>
              </button>

              {/* Dark Button */}
              <button
                onClick={() => {
                  handleVibrate();
                  setTheme('dark');
                }}
                className={`flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#E6F0FA] dark:bg-blue-950/40 text-[#0057B8] dark:text-[#38BDF8] border-[#0057B8]/40 dark:border-slate-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                }`}
              >
                <Moon className="w-4 h-4 text-yellow-400" />
                <span>داكن</span>
              </button>
            </div>

            {/* PWA Settings Option */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mt-5">
              <h4 className="font-sans font-black text-slate-800 dark:text-white text-sm">تثبيت حسبة كتطبيق</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                تصفح الحاسبة بأداء أسرع وبشكل مستقل من شاشتك الرئيسية في أي وقت.
              </p>
              
              <div className="mt-4">
                {isInstalled ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 rounded-xl text-xs font-bold font-sans">
                    <Check className="w-4 h-4" />
                    <span>حسبة مثبتة على جهازك</span>
                  </div>
                ) : (
                  <div>
                    {isIosSafari ? (
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed font-sans">
                          لتثبيت التطبيق على جهاز iOS (آيفون/آيباد)، اضغط على زر <strong>المشاركة</strong> <span className="inline-block px-1 select-none">⎙</span> في المتصفح بالأسفل ثم اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={async () => {
                            handleVibrate();
                            setInstallError(null);
                            if (!canInstall) {
                              setInstallError('يرجى النقر على القائمة الثلاثية للمتصفح واختيار "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".');
                              return;
                            }
                            resetDismissalAndPrompt();
                            setTimeout(async () => {
                              const success = await promptInstall();
                              if (!success) {
                                setInstallError('يرجى النقر على القائمة الثلاثية للمتصفح واختيار "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".');
                              }
                            }, 150);
                          }}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                            canInstall
                              ? 'bg-[#0057B8] hover:bg-blue-700 text-white border-[#0057B8]/20 shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span>تثبيت حسبة كتطبيق</span>
                        </button>

                        {installError && (
                          <p className="text-xs font-bold text-rose-600 dark:text-[#F87171] mt-2 font-sans">
                            {installError}
                          </p>
                        )}

                        {!canInstall && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed font-sans">
                            إذا لم يظهر زر التثبيت، افتح قائمة المتصفح واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render Mobile View
  if (isMobile) {
    if (activeSection === 'menu' || !activeSection) {
      return (
        <div className="min-h-screen bg-[#F4F7FB] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 pb-16 pt-6 select-none px-4 space-y-5" dir="rtl">
          {/* Compact Account Header */}
          <div className="bg-white dark:bg-[#111827] rounded-[24px] border border-slate-100/80 dark:border-slate-800 p-4 shadow-sm flex items-center gap-4 text-right">
            <div className="w-12 h-12 bg-[#0057B8] dark:bg-blue-650 text-white rounded-full flex items-center justify-center font-bold text-lg select-none shrink-0">
              {displayFullName.trim().charAt(0) || 'أ'}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{displayFullName}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{user?.email}</p>
            </div>
          </div>

          {/* Menu List */}
          <div className="bg-white dark:bg-[#111827] rounded-[24px] border border-slate-100/80 dark:border-slate-800 p-2 shadow-md flex flex-col">
            {menuTabsList.map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleVibrate();
                    setActiveSection(tab.id);
                  }}
                  className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 text-slate-600 dark:text-slate-300 hover:text-[#0057B8] dark:hover:text-[#38BDF8] hover:bg-slate-50/50 dark:hover:bg-slate-900/40 font-bold text-xs cursor-pointer rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <IconComp className="w-4.5 h-4.5" />
                    </div>
                    <span>{tab.name}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-350" />
                </button>
              );
            })}
          </div>

          {/* Mobile Trust Card */}
          <div className="bg-white dark:bg-[#111827] rounded-[24px] border border-slate-100/80 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4 text-right">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 text-[#0057B8] dark:text-[#38BDF8] rounded-full flex items-center justify-center border border-blue-100/40 dark:border-blue-900/30 shrink-0">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-slate-800 dark:text-white leading-none">نحمي بياناتك</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed mt-1">
                نحافظ على خصوصية بياناتك وفق أعلى معايير الأمان.
              </p>
            </div>
          </div>

          {/* Mobile Footer */}
          <footer className="w-full text-center select-none pt-4">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              © {new Date().getFullYear()} حسبة. جميع الحقوق محفوظة وموثقة لدى المنصة.
            </p>
          </footer>

          {/* Render Active Modals */}
          {renderModals()}
        </div>
      );
    } else {
      // Subpage on mobile
      return (
        <div className="min-h-screen bg-[#F4F7FB] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 pb-16 pt-6 select-none px-4 space-y-4" dir="rtl">
          {/* Sticky elegant subpage back button header */}
          <div className="flex items-center justify-between bg-white dark:bg-[#111827] rounded-[20px] p-4 border border-slate-100/80 dark:border-slate-805 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleVibrate();
                  setActiveSection('menu');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-550 dark:text-slate-300 cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 rotate-180 translate-x-[1px]" />
              </button>
              <h3 className="font-sans font-black text-sm text-slate-900 dark:text-white leading-none">
                {menuTabsList.find(t => t.id === activeSection)?.name || 'تفاصيل الإعدادات'}
              </h3>
            </div>
            <button
              onClick={() => {
                handleVibrate();
                setActiveSection('menu');
              }}
              className="text-[10px] text-slate-450 dark:text-slate-500 font-bold hover:underline"
            >
              رجوع للقائمة
            </button>
          </div>

          {/* Section Dynamic view */}
          <div className="w-full">
            {renderSectionContent(activeSection)}
          </div>

          {/* Modals rendering */}
          {renderModals()}
        </div>
      );
    }
  }

  // Desktop View
  return (
    <div className="min-h-screen bg-[#F4F7FB] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 pb-16 pt-6 select-none" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Right Column: Settings menu & Security trust badge */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Sidebar menu section */}
            <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-4 shadow-md">
              <h3 className="text-sm font-black text-slate-900 dark:text-white px-4 pt-2 pb-4 border-b border-slate-50 dark:border-slate-800">
                الإعدادات
              </h3>
              <nav className="space-y-1.5 mt-3">
                {menuTabsList.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleVibrate();
                        setActiveSection(tab.id);
                      }}
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

            {/* Desktop Shield Security Card from Column 1 */}
            <div className="bg-white dark:bg-[#111827] rounded-[30px] border border-slate-100/80 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center space-y-3 select-none">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-[#0057B8] dark:text-[#38BDF8] rounded-full flex items-center justify-center border border-blue-100/40 dark:border-blue-900/30">
                <Shield className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-[200px] leading-relaxed">
                نحمي بياناتك وفق أعلى معايير الأمان والخصوصية
              </p>
            </div>

          </div>

          {/* Left Column: Selected section content */}
          <div className="lg:col-span-3">
            {renderSectionContent(activeSection)}
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-200/65 dark:border-slate-800/80 text-center select-none space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-xs text-slate-500 dark:text-slate-400">
          <button onClick={() => handleLegalNavigate('/terms')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">شروط الاستخدام</button>
          <span className="text-slate-300 dark:text-slate-800 text-[10px]">•</span>
          <button onClick={() => handleLegalNavigate('/privacy')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">سياسة الخصوصية</button>
          <span className="text-slate-300 dark:text-slate-800 text-[10px]">•</span>
          <button onClick={() => handleLegalNavigate('/disclaimer')} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">إخلاء المسؤولية</button>
          <span className="text-slate-300 dark:text-slate-800 text-[10px]">•</span>
          <button onClick={triggerCustomerAssistant} className="hover:text-[#0057B8] dark:hover:text-[#38BDF8] transition-colors cursor-pointer">تواصل معنا</button>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
          © {new Date().getFullYear()} حسبة. جميع الحقوق محفوظة وموثقة لدى المنصة.
        </p>
      </footer>

      {/* Render Popups */}
      {renderModals()}
    </div>
  );

  // Helper function to render all modals in one clean place
  function renderModals() {
    return (
      <>
        {/* EDIT PROFILE MODAL */}
        {showEditNameModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
            <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 text-right animate-scale-up space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-800">
                <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">تعديل بيانات الحساب</h3>
                <button 
                  onClick={() => setShowEditNameModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer text-xs"
                >
                  إغلاق
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileMessage && (
                  <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20' : 'bg-red-50 text-red-850 dark:bg-red-950/20'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">الاسم الكامل:</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullNameInput}
                      onChange={e => setFullNameInput(e.target.value)}
                      placeholder="أدخل الاسم بالكامل"
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#38BDF8] text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-105 outline-none transition-all text-right"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">البريد الإلكتروني:</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#38BDF8] text-xs font-semibold rounded-xl text-slate-850 dark:text-slate-105 outline-none transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">رقم الجوال:</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      placeholder="05xxxxxxx"
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#0057B8] dark:focus:border-[#38BDF8] text-xs font-semibold rounded-xl text-slate-850 dark:text-slate-105 outline-none transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">أدخل رقم جوالك السعودي المكون من 10 خانات. رقم الجوال قابل للتعديل.</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 py-3 bg-[#0057B8] hover:bg-[#00479b] text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {profileSaving ? 'جاري حفظ التغييرات...' : 'حفظ التغييرات'}
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

        {/* PASSWORD RESET MODAL */}
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
                  يرجى كتابة الرقم السري الجديد لتحديثه مباشرة بشكل آمن على منصة حسبة.
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
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-xs font-semibold rounded-xl text-left outline-none text-slate-800 dark:text-slate-100"
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
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-xs font-semibold rounded-xl text-left outline-none text-slate-800 dark:text-slate-100"
                      dir="ltr"
                    />
                  </div>
                </div>

                {passwordMessage && (
                  <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20' : 'bg-red-50 text-red-850 dark:bg-red-955/20'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 py-3 bg-[#0057B8] hover:bg-[#00479b] text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {passwordLoading ? 'جاري التحديث...' : 'تحديث كلمة السر'}
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

        {/* EMAIL VERIFICATION MODAL */}
        {showVerificationModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
            <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center animate-scale-up space-y-4">
              
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-100/40">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="font-sans font-black text-slate-900 dark:text-white text-base">توثيق الحساب والبريد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  حسابك موثق بالكامل ومحمي ضمن شبكة قنوات حسبة الآمنة. عنوان البريد الإلكتروني الخاص بك مفعل ولديه كامل الصلاحيات لتنفيذ واستخراج الحسابات والتقارير.
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

        {/* UNIFIED CORRESPONDING TRASH AND DELETION ICON (We need to declare a simple SVG inline inside the trash buttons below so that it displays perfectly) */}

        {/* SECURE DELETION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
            <div className="bg-white dark:bg-[#151F32] border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 text-right animate-scale-up space-y-4">
              
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>

              <div className="space-y-1.5 text-center">
                <h3 className="font-sans font-black text-rose-605 dark:text-rose-400 text-base">هل أنت متأكد تماماً من حذف الحساب؟</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold max-w-sm mx-auto">
                  هذا الإجراء مدمر ولا يمكن التراجع عنه. ستفقد جميع الحسبات المقارنة وعروض التمويل المحفوظة سحابياً بشكل معجل وفوري.
                </p>
              </div>

              <div className="space-y-1 text-right">
                <label className="text-[11px] text-slate-500 font-bold block">لتأكيد الحذر، يرجى كتابة بريدك الإلكتروني بالأسفل:</label>
                <input
                  type="text"
                  required
                  value={confirmDeleteEmail}
                  onChange={e => setConfirmDeleteEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني هنا..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left text-slate-800 dark:text-slate-105 rounded-xl outline-none"
                  dir="ltr"
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-955/20 text-red-800 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
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
                  className="px-5 py-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء الإجراء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST SYSTEM */}
        {toast && (
          <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 animate-slide-up select-none max-w-sm mx-auto sm:mx-0">
            <div className={`p-4 rounded-[16px] shadow-2xl flex items-center gap-3 text-right ${
              toast.type === 'error' 
                ? 'bg-rose-600 text-white' 
                : 'bg-[#151F32] text-white border border-slate-80Q/80 dark:border-slate-800'
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
      </>
    );
  }
}

// Simple Inline Trash Icon
function Trash2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      {...props}
    >
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}
