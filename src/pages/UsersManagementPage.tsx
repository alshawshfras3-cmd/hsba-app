import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import NumericInput from '../components/calculator/NumericInput';
import { 
  Shield, 
  User, 
  Mail, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  Crown, 
  CreditCard, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Clock, 
  Settings, 
  Check, 
  TrendingUp, 
  Sparkles, 
  Search, 
  Filter,
  Plus,
  ShieldCheck,
  Edit2,
  Save,
  HelpCircle,
  Trash,
  Copy,
  Layers,
  Star,
  AlertTriangle
} from 'lucide-react';
import { 
  adminListSubscribers, 
  adminManualActivateSubscription, 
  adminCancelSubscription, 
  adminExtendSubscription, 
  adminMarkSubscriptionExpired, 
  getSubscriptionPlans, 
  adminUpdatePlan,
  adminCreatePlan,
  adminDeletePlan,
  adminCopyPlan,
  adminListActivationRequests,
  adminApproveActivationRequest,
  adminRejectActivationRequest,
  adminDeleteActivationRequest,
  adminSaveUserSubscription,
  adminUpdatePhoneNumber,
  adminBackfillFreePlanForExistingUsers,
  setDefaultPlan,
  SubscriptionPlan,
  ActivationRequest,
  listActivePlans,
  getUserCurrentSubscription,
  assignSubscriptionToUser,
  ensureBillingProfileForUser
} from '../lib/subscriptionService';
import { useAppState } from '../context/AppContext';

type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  is_blocked: boolean;
  status?: string | null;
  created_at: string;
};

export function UsersManagementPage() {
  const { subscriptionSettings, setSubscriptionSettings, saveChanges } = useAppState();

  const [activeTab, setActiveTab] = useState<'users' | 'subscribers' | 'plans' | 'requests' | 'payments'>('users');
  
  // Tab: Activation Requests States
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Add Plan state
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    code: '',
    name: '',
    description: '',
    price_sar: 0,
    duration_days: 30,
    daily_calculation_limit: null,
    is_active: true,
    sort_order: 0,
    features: [''],
    badge_text: '',
    badge_color: 'bg-indigo-500 text-white',
    card_color: 'border-indigo-500 bg-white dark:bg-slate-900',
    is_free_plan: false
  });
  
  // WhatsApp settings local state
  const [localWhatsappNumber, setLocalWhatsappNumber] = useState(subscriptionSettings?.activationWhatsappNumber || '');
  const [localWhatsappMessage, setLocalWhatsappMessage] = useState(subscriptionSettings?.activationWhatsappMessage || '');

  useEffect(() => {
    if (subscriptionSettings) {
      setLocalWhatsappNumber(subscriptionSettings.activationWhatsappNumber || '');
      setLocalWhatsappMessage(subscriptionSettings.activationWhatsappMessage || '');
    }
  }, [subscriptionSettings]);

  // Tab 1: Users States
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilter, setUsersFilter] = useState('all'); // all, active, blocked

  // Tab 2: Subscribers States
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subsSearch, setSubsSearch] = useState('');
  const [subsFilter, setSubsFilter] = useState('all'); // all, trialing, active, expired, cancelled

  // Tab 3: Plans States
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Shared / General states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string | null>(null);

  // Manual Activation modal state (Grant manually a standard pack)
  const [showManualPromo, setShowManualPromo] = useState(false);
  const [manualPromoUserId, setManualPromoUserId] = useState<string>('');
  const [manualPromoPlanCode, setManualPromoPlanCode] = useState<string>('monthly');

  // Grant Free access modal state (मनح مدة مجانية)
  const [showFreeGrantModal, setShowFreeGrantModal] = useState(false);
  const [freeGrantUserId, setFreeGrantUserId] = useState<string>('');
  const [freeGrantDays, setFreeGrantDays] = useState<number>(14); // default 14 days
  const [freeGrantLimit, setFreeGrantLimit] = useState<string>('15'); // default 15 daily calculations limit
  const [freeGrantNotes, setFreeGrantNotes] = useState<string>('هدية تسويقية مجانية من الإدارة لكبار الشركاء');
  const [freeGrantStartDate, setFreeGrantStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Unified Subscriber Manage (إدارة الشريك والاشتراك بالكامل)
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  
  // States inside subscriber edit sub-modal
  const [editPhone, setEditPhone] = useState<string>('');
  const [editPlanId, setEditPlanId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editSource, setEditSource] = useState<string>('manual_paid');
  const [editEndsAt, setEditEndsAt] = useState<string>('');
  const [editStartedAt, setEditStartedAt] = useState<string>('');
  const [editCustomLimit, setEditCustomLimit] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Activate Plan Modal States
  const [showActivatePlanModal, setShowActivatePlanModal] = useState(false);
  const [selectedUserForActivation, setSelectedUserForActivation] = useState<any | null>(null);
  const [activePlansOnly, setActivePlansOnly] = useState<SubscriptionPlan[]>([]);
  const [chosenPlanId, setChosenPlanId] = useState<string>('');
  const [activationStartDate, setActivationStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activationEndDate, setActivationEndDate] = useState<string>('');
  const [activationStatus, setActivationStatus] = useState<'active' | 'trialing'>('active');
  const [activationNotes, setActivationNotes] = useState<string>('');
  const [existingSubscriptionWarning, setExistingSubscriptionWarning] = useState<string | null>(null);

  // Automatically calculate endsAt when chosen plan or startDate changes
  useEffect(() => {
    if (!chosenPlanId || activePlansOnly.length === 0) return;
    const plan = activePlansOnly.find(p => p.id === chosenPlanId);
    if (!plan) return;
    try {
      const start = new Date(activationStartDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (plan.duration_days || 30));
      setActivationEndDate(end.toISOString().split('T')[0]);
    } catch (e) {
      console.error('Error calculating end date:', e);
    }
  }, [chosenPlanId, activationStartDate, activePlansOnly]);

  const getUserSubscriptionStatusBadge = (userId: string) => {
    const userSubs = subscribers.filter(s => s.user_id === userId);
    if (!userSubs || userSubs.length === 0) {
      return <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-[10px] font-bold">لا يوجد اشتراك</span>;
    }
    
    const activeSub = userSubs.find(s => s.status === 'active');
    const trialingSub = userSubs.find(s => s.status === 'trialing');
    const prioritySub = activeSub || trialingSub || userSubs[0];

    if (prioritySub.status === 'active') {
      return (
        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[10px] font-bold">
          نشط ({prioritySub.plan_name})
        </span>
      );
    } else if (prioritySub.status === 'trialing') {
      return (
        <span className="inline-block px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 rounded-lg text-[10px] font-bold">
          تجربة ({prioritySub.plan_name})
        </span>
      );
    } else if (prioritySub.status === 'expired') {
      return (
        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg text-[10px] font-bold">
          منتهي
        </span>
      );
    } else if (prioritySub.status === 'suspended') {
      return (
        <span className="inline-block px-2.5 py-1 bg-red-50 text-red-750 border border-red-200 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-[10px] font-bold">
          موقوف
        </span>
      );
    } else if (prioritySub.status === 'cancelled') {
      return (
        <span className="inline-block px-2.5 py-1 bg-gray-150 text-gray-500 border border-gray-200 dark:bg-slate-800/80 dark:text-slate-500 rounded-lg text-[10px] font-bold">
          ملغي
        </span>
      );
    } else {
      return (
        <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-[10px] font-bold">
          {prioritySub.status}
        </span>
      );
    }
  };

  const handleOpenActivatePlanModal = async (user: any) => {
    setSelectedUserForActivation(user);
    setActivationStartDate(new Date().toISOString().split('T')[0]);
    setActivationStatus('active');
    setActivationNotes('');
    
    // Check for existing active or trialing subscription in the loaded subscribers list
    const existing = subscribers.find(s => s.user_id === user.id && (s.status === 'active' || s.status === 'trialing'));
    if (existing) {
      setExistingSubscriptionWarning(`يوجد اشتراك نشط حاليًا لهذا المستخدم (${existing.plan_name}). هل تريد استبداله؟`);
    } else {
      setExistingSubscriptionWarning(null);
    }

    // Load active plans
    try {
      const activePlans = await listActivePlans();
      setActivePlansOnly(activePlans);
      if (activePlans.length > 0) {
        setChosenPlanId(activePlans[0].id);
        const end = new Date();
        end.setDate(end.getDate() + (activePlans[0].duration_days || 30));
        setActivationEndDate(end.toISOString().split('T')[0]);
      } else {
        setChosenPlanId('');
        setActivationEndDate('');
      }
    } catch (err) {
      console.error('Error listing active plans:', err);
    }
    
    setShowActivatePlanModal(true);
  };

  const handleConfirmActivatePlan = async () => {
    if (!selectedUserForActivation || !chosenPlanId) return;
    
    setActionLoading(true);
    try {
      // 1. Ensure billing profile is present in system
      await ensureBillingProfileForUser({
        id: selectedUserForActivation.id,
        email: selectedUserForActivation.email,
        full_name: selectedUserForActivation.full_name || 'مستخدم بدون ملف',
        phone: selectedUserForActivation.phone || undefined
      });

      // 2. Perform the assignment
      await assignSubscriptionToUser({
        userId: selectedUserForActivation.id,
        planId: chosenPlanId,
        startsAt: new Date(activationStartDate).toISOString(),
        endsAt: new Date(activationEndDate).toISOString(),
        status: activationStatus,
        notes: activationNotes || `تفعيل إداري يدوي بواسطة المشرف`,
        source: 'admin'
      });

      showFlashSuccess('تم تفعيل الباقة للمستخدم بنجاح');
      setShowActivatePlanModal(false);
      
      // Update our lists
      await Promise.all([fetchUsers(), fetchSubscribers()]);
    } catch (err: any) {
      console.error('CRITICAL: Manual plan activation error details:', err);
      showFlashError(`فشل تفعيل الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    async function loadAdminContext() {
      try {
        const { data: { user: authed } } = await supabase.auth.getUser();
        if (authed) {
          setCurrentAdminUserId(authed.id);
        }

        const { data: adminsList } = await supabase
          .from('admins')
          .select('user_id');
        
        if (adminsList) {
          setAdminUserIds(adminsList.map(a => a.user_id));
        }
      } catch (e) {
        console.warn("Could not load current admin context:", e);
      }
    }
    loadAdminContext();
    fetchUsers();
    fetchSubscribers();
    fetchPlans();
    fetchRequests();
  }, []);

  // Flash messages helper
  const showFlashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const showFlashError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Backfill existing users with free plan
  const handleBackfillUsers = async () => {
    setActionLoading(true);
    try {
      const result = await adminBackfillFreePlanForExistingUsers();
      if (result.success) {
        showFlashSuccess(`تم تشغيل عملية التفعيل التلقائي بنجاح! تم فحص ${result.processed} حساب ومقاطعتها، وتم تفعيل الباقة المجانية لعدد (${result.added}) مستخدم ليس لديهم اشتراكات نشطة حالياً.`);
        await Promise.all([fetchUsers(), fetchSubscribers()]);
      } else {
        showFlashError(`فشل في عملية تفعيل الحسابات: ${result.error}`);
      }
    } catch (err: any) {
      showFlashError(`تعذر تفعيل باقات المستخدمين: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Fetch Users
  async function fetchUsers() {
    setLoadingUsers(true);
    if (!hasSupabaseKeys) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, full_name, email, phone, is_blocked, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(
        (data || []).map((item: any) => ({
          id: item.id,
          email: item.email || '',
          full_name: item.full_name || 'مستخدم بدون ملف — يحتاج ربط بيانات',
          phone: item.phone || null,
          is_blocked: item.is_blocked === true,
          status: item.status || 'active',
          created_at: item.created_at || new Date().toISOString()
        }))
      );
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showFlashError(`فشل تحميل المستخدمين: ${err.message || err}`);
    } finally {
      setLoadingUsers(false);
    }
  }

  // 2. Fetch Subscribers
  async function fetchSubscribers() {
    setLoadingSubs(true);
    try {
      const list = await adminListSubscribers();
      setSubscribers(list);
    } catch (err: any) {
      console.error('Failed to load subscribers:', err);
      showFlashError(`تعذر تحميل المشتركين: ${err.message || err}`);
    } finally {
      setLoadingSubs(false);
    }
  }

  // 3. Fetch Plans
  async function fetchPlans() {
    setLoadingPlans(true);
    try {
      const list = await getSubscriptionPlans();
      setPlans(list);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
      showFlashError(`تعذر تفصيل الخطط: ${err.message || err}`);
    } finally {
      setLoadingPlans(false);
    }
  }

  // 3b. Fetch Activation Requests
  async function fetchRequests() {
    setLoadingRequests(true);
    try {
      const list = await adminListActivationRequests();
      setRequests(list);
    } catch (err: any) {
      console.error('Failed to load activation requests:', err);
      showFlashError(`تعذر تحميل طلبات تفعيل الاشتراكات المعلقة: ${err.message || err}`);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleApproveRequest(id: string) {
    if (!window.confirm('هل أنت متأكد من الموافقة على طلب التفعيل هذا وتنشيط اشتراك العميل؟')) return;
    setActionLoading(true);
    try {
      await adminApproveActivationRequest(id);
      showFlashSuccess('تمت الموافقة وتفعيل باقة الاشتراك بنجاح.');
      await Promise.all([fetchRequests(), fetchSubscribers()]);
    } catch (err: any) {
      showFlashError(`تعذر تفعيل هذا الطلب: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectRequest(id: string) {
    if (!window.confirm('هل تريد فعلاً إلغاء/رفض هذا الطلب؟')) return;
    setActionLoading(true);
    try {
      await adminRejectActivationRequest(id);
      showFlashSuccess('تم رفض طلب التفعيل بنجاح.');
      await fetchRequests();
    } catch (err: any) {
      showFlashError(`تعذر رفض الطلب: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteRequest(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً من سجلات الإدارة؟')) return;
    setActionLoading(true);
    try {
      await adminDeleteActivationRequest(id);
      showFlashSuccess('تم حذف الطلب بنجاح.');
      await fetchRequests();
    } catch (err: any) {
      showFlashError(`تعذر حذف الطلب بنجاح: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Actions
  async function handleToggleBlock(userId: string, email: string, currentlyBlocked: boolean) {
    if (adminUserIds.includes(userId) || userId === currentAdminUserId) {
      alert('لا يمكنك إيقاف أو حظر حساب مشرف أو مسؤول نظام حسبة!');
      return;
    }

    const nextState = !currentlyBlocked;
    const confirm = window.confirm(
      nextState 
        ? `هل أنت متأكد من حظر المستخدم (${email})؟\nلن يتمكن من الدخول للمنصة بمجرد الحظر.`
        : `هل أنت متأكد من إلغاء الحظر وتنشيط المستخدم (${email})؟`
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ is_blocked: nextState, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      showFlashSuccess(nextState ? 'تم حظر الحساب بنجاح.' : 'تم إعادة تنشيط الحساب بنجاح.');
      await fetchUsers();
    } catch (e: any) {
      showFlashError(`فشل تغيير حالة الحظر: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Subscriber Management actions (Fast preset actions)
  async function handleCancelSubscription(userId: string) {
    if (!window.confirm('هل أنت متأكد من إلغاء باقة هذا الشريك؟\nستتحول حالة الباقة إلى ملغاة.')) return;
    setActionLoading(true);
    try {
      await adminCancelSubscription(userId);
      showFlashSuccess('تم إلغاء الاشتراك بنجاح.');
      await fetchSubscribers();
      if (selectedSub && selectedSub.user_id === userId) {
        setSelectedSub(null);
      }
    } catch (err: any) {
      showFlashError(`فشل الإلغاء: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExtendSubscription(userId: string, days: number) {
    if (!window.confirm(`هل أنت متأكد من تمديد باقة الشريك بمقدار ${days} يوم كامل؟`)) return;
    setActionLoading(true);
    try {
      await adminExtendSubscription(userId, days);
      showFlashSuccess(`تم تمديد صلاحية باقة الشريك بمقدار ${days} يوم بنجاح.`);
      await fetchSubscribers();
      if (selectedSub && selectedSub.user_id === userId) {
        setSelectedSub(null);
      }
    } catch (err: any) {
      showFlashError(`فشل التمديد: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkExpired(userId: string) {
    if (!window.confirm('هل أنت متأكد من فرض انتهاء فترة تجربة أو باقة هذا الشريك يدويًا؟')) return;
    setActionLoading(true);
    try {
      await adminMarkSubscriptionExpired(userId);
      showFlashSuccess('تم فرض انتهاء الصلاحية فوراً.');
      await fetchSubscribers();
      if (selectedSub && selectedSub.user_id === userId) {
        setSelectedSub(null);
      }
    } catch (err: any) {
      showFlashError(`تعذر إنهاء الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Fast manual activation logic
  async function handleManualActivateSubmit() {
    if (!manualPromoUserId) return;
    setActionLoading(true);
    try {
      await adminManualActivateSubscription(manualPromoUserId, manualPromoPlanCode);
      showFlashSuccess('تم تفعيل الاشتراك العقاري المسجل بنجاح.');
      setShowManualPromo(false);
      await fetchSubscribers();
    } catch (err: any) {
      showFlashError(`فشل التنشيط: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Grant Free access submit
  async function handleFreeGrantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!freeGrantUserId) {
      showFlashError('يرجى اختيار الشريك أو المستخدم.');
      return;
    }

    setActionLoading(true);
    try {
      const ends = new Date(freeGrantStartDate);
      ends.setDate(ends.getDate() + Number(freeGrantDays));

      await adminSaveUserSubscription({
        userId: freeGrantUserId,
        planId: null, // Custom Free limits don't strictly require a default database plan
        status: 'active',
        startedAt: new Date(freeGrantStartDate).toISOString(),
        endsAt: ends.toISOString(),
        source: 'admin_free',
        customDailyLimit: freeGrantLimit === '' ? null : Number(freeGrantLimit),
        notes: freeGrantNotes || 'منح مدة مجانية ترويجية من الإدارة'
      });

      showFlashSuccess('تم منح المدة المجانية وتفعيل الصلاحية للشريك بنجاح!');
      setShowFreeGrantModal(false);
      await fetchSubscribers();
    } catch (err: any) {
      showFlashError(`فشل منح المدة المجانية: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Load sub edit details modal
  function handleOpenManageSub(sub: any) {
    setSelectedSub(sub);
    setEditPhone(sub.phone_number || '');
    setEditPlanId(sub.plan_id || '');
    setEditStatus(sub.status || 'active');
    setEditSource(sub.source || 'manual_paid');
    setEditStartedAt(sub.started_at ? sub.started_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditEndsAt(sub.ends_at ? sub.ends_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditCustomLimit(sub.custom_daily_limit === null || sub.custom_daily_limit === undefined ? '' : String(sub.custom_daily_limit));
    setEditNotes(sub.notes || '');
  }

  // Save the complete sub configurations edits
  async function handleSaveSubSettings() {
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      // 1. Update phone number (using adminUpdatePhoneNumber helper)
      if (editPhone !== selectedSub.phone_number && editPhone.trim()) {
        await adminUpdatePhoneNumber(selectedSub.user_id, editPhone.trim());
      }

      // 2. Save active subscription profile
      await adminSaveUserSubscription({
        userId: selectedSub.user_id,
        planId: editPlanId === '' ? null : editPlanId,
        status: editStatus as any,
        startedAt: new Date(editStartedAt).toISOString(),
        endsAt: new Date(editEndsAt).toISOString(),
        source: editSource as any,
        customDailyLimit: editCustomLimit === '' ? null : Number(editCustomLimit),
        notes: editNotes
      });

      showFlashSuccess('تم تحديث ومزامنة تفاصيل الفوترة وتراخيص المستخدم بنجاح!');
      setSelectedSub(null);
      await fetchSubscribers();
    } catch (err: any) {
      showFlashError(`تعذر حفظ التغييرات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Update Subscription Plan
  async function handleSavePlanUpdates() {
    if (!editingPlan) return;
    setActionLoading(true);
    try {
      await adminUpdatePlan(editingPlan.id, {
        name: editingPlan.name,
        price_sar: Number(editingPlan.price_sar),
        duration_days: Number(editingPlan.duration_days),
        daily_calculation_limit: editingPlan.daily_calculation_limit === null ? null : Number(editingPlan.daily_calculation_limit),
        is_active: editingPlan.is_active,
        description: editingPlan.description,
        sort_order: Number(editingPlan.sort_order || 0),
        features: editingPlan.features || [],
        badge_text: editingPlan.badge_text || null,
        badge_color: editingPlan.badge_color || null,
        card_color: editingPlan.card_color || null,
        is_free_plan: !!editingPlan.is_free_plan,
        is_default_on_signup: !!editingPlan.is_default_on_signup,
        saved_results_limit: editingPlan.saved_results_limit === null || editingPlan.saved_results_limit === undefined ? null : Number(editingPlan.saved_results_limit),
        can_save_results: !!editingPlan.can_save_results,
        can_export_results: !!editingPlan.can_export_results,
        can_view_advanced_details: !!editingPlan.can_view_advanced_details
      });
      showFlashSuccess('تم تحديث إعدادات وأسعار وميزات الباقة البرمجية بنجاح.');
      setEditingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      showFlashError(`فشل تعديل الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Create Subscription Plan
  async function handleCreatePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlan.code || !newPlan.name) {
      showFlashError('يرجى كتابة رمز الباقة الفريد واسمها.');
      return;
    }
    
    setActionLoading(true);
    try {
      const finalFeatures = Array.isArray(newPlan.features) 
         ? newPlan.features.filter(f => f.trim() !== '') 
         : [];

      await adminCreatePlan({
        code: newPlan.code.trim(),
        name: newPlan.name.trim(),
        description: newPlan.description || '',
        price_sar: Number(newPlan.price_sar || 0),
        duration_days: Number(newPlan.duration_days || 30),
        daily_calculation_limit: newPlan.daily_calculation_limit === null || newPlan.daily_calculation_limit === undefined ? null : Number(newPlan.daily_calculation_limit),
        is_active: !!newPlan.is_active,
        sort_order: Number(newPlan.sort_order || 0),
        features: finalFeatures,
        badge_text: newPlan.badge_text || null,
        badge_color: newPlan.badge_color || null,
        card_color: newPlan.card_color || null,
        is_free_plan: !!newPlan.is_free_plan,
        is_default_on_signup: !!newPlan.is_default_on_signup,
        saved_results_limit: newPlan.saved_results_limit === null || newPlan.saved_results_limit === undefined ? null : Number(newPlan.saved_results_limit),
        can_save_results: !!newPlan.can_save_results,
        can_export_results: !!newPlan.can_export_results,
        can_view_advanced_details: !!newPlan.can_view_advanced_details
      });

      showFlashSuccess('تم إنشاء باقة الاشتراك الجديدة ومزامنتها بنجاح!');
      setShowAddPlanModal(false);
      setNewPlan({
        code: '',
        name: '',
        description: '',
        price_sar: 0,
        duration_days: 30,
        daily_calculation_limit: null,
        is_active: true,
        sort_order: 0,
        features: [''],
        badge_text: '',
        badge_color: 'bg-indigo-500 text-white',
        card_color: 'border-indigo-500 bg-white dark:bg-slate-900',
        is_free_plan: false,
        is_default_on_signup: false,
        saved_results_limit: null,
        can_save_results: true,
        can_export_results: true,
        can_view_advanced_details: true
      });
      await fetchPlans();
    } catch (err: any) {
      showFlashError(`تعذر إنشاء الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Delete Subscription Plan
  async function handleDeletePlanSubmit(planId: string) {
    if (!window.confirm('هل أنت متأكد تماماً من حذف هذه الباقة؟\nتحذير: سيتم إزالة الباقة من قوائم العرض، وقد يتأثر المشتركون الحاليون بالباقة.')) return;
    setActionLoading(true);
    try {
      await adminDeletePlan(planId);
      showFlashSuccess('تم حذف باقة الاشتراك بنجاح.');
      await fetchPlans();
    } catch (err: any) {
      showFlashError(`تعذر حذف الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Copy Subscription Plan
  async function handleCopyPlanSubmit(planId: string) {
    setActionLoading(true);
    try {
      await adminCopyPlan(planId);
      showFlashSuccess('تم تكرار ونسخ الباقة كمسودة بنجاح. يمكنك الآن تعديل الباقة الجديدة وتفعيلها.');
      await fetchPlans();
    } catch (err: any) {
      showFlashError(`تعذر نسخ الباقة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Filter calculations
  const filteredUsers = users.filter(u => {
    if (adminUserIds.includes(u.id) || u.id === currentAdminUserId) return false;
    const matchesSearch = 
      (u.full_name || '').toLowerCase().includes(usersSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(usersSearch.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(usersSearch.toLowerCase());
    
    let matchesFilter = true;
    if (usersFilter === 'blocked') matchesFilter = u.is_blocked;
    else if (usersFilter === 'active') matchesFilter = !u.is_blocked;

    return matchesSearch && matchesFilter;
  });

  const filteredSubscribers = subscribers.filter(s => {
    const emailStr = (s.email || '').toLowerCase();
    const nameStr = (s.full_name || '').toLowerCase();
    const sourceStr = (s.source || '').toLowerCase();
    const notesStr = (s.notes || '').toLowerCase();
    
    const isMock = 
      emailStr.includes('example.com') ||
      nameStr.includes('عضو مجهول') ||
      nameStr.includes('مجهول') ||
      nameStr.includes('تجربة') ||
      nameStr.includes('تجريب') ||
      nameStr.includes('محاكاة') ||
      sourceStr === 'demo' ||
      sourceStr === 'mock' ||
      sourceStr === 'system' ||
      notesStr.includes('تجربة') ||
      notesStr.includes('محاكاة');

    const isInvalid = !s.user_id || !s.email || s.email === 'مسجل خارجي' || s.full_name === 'عضو مجهول';

    if (isMock || isInvalid) {
      return false;
    }

    const matchesSearch = 
      (s.full_name || '').toLowerCase().includes(subsSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(subsSearch.toLowerCase()) ||
      (s.phone_number || '').toLowerCase().includes(subsSearch.toLowerCase());
    
    let matchesFilter = true;
    if (subsFilter !== 'all') matchesFilter = s.status === subsFilter;

    return matchesSearch && matchesFilter;
  });

  const unlinkedSubs = subscribers.filter(s => {
    const emailStr = (s.email || '').toLowerCase();
    const nameStr = (s.full_name || '').toLowerCase();
    const isMock = emailStr.includes('example.com') || nameStr.includes('تجربة') || nameStr.includes('تجريب') || nameStr.includes('محاكاة') || (s.source || '') === 'demo';
    const isInvalid = !s.user_id || !s.email || s.email === 'غير متوفر' || s.email === 'مسجل خارجي' || s.full_name === 'عضو مجهول' || s.full_name === 'مستخدم بدون ملف — يحتاج ربط بيانات';
    return (isMock || isInvalid);
  });

  // Days remaining calculation helper
  function getDaysRem(endsAt: string) {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* HEADER PAGE TITLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-indigo-500" />
            <span>الباقات والاشتراكات والفوترة اللامحدودة</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إدارة حسابات الأعضاء والشركاء، تنشيط الباقات اليدوية، تعديل التسعيرات وحظر المتجاوزين لترخيص المنصة.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex gap-2">
          {/* Grant Free Duration Button */}
          <button 
            onClick={() => {
              setFreeGrantUserId('');
              setFreeGrantDays(14);
              setFreeGrantLimit('15');
              setFreeGrantNotes('منح مدة مجانية ترويجية من الإدارة');
              setFreeGrantStartDate(new Date().toISOString().split('T')[0]);
              setShowFreeGrantModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4 animate-bounce" />
            <span>منح مدة مجانية 🚀</span>
          </button>

          <button 
            onClick={() => {
              setManualPromoUserId('');
              setManualPromoPlanCode('monthly');
              setShowManualPromo(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تنشيط باقة يدوية لشريك</span>
          </button>
        </div>
      </div>

      {/* Success/Error flashes */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-955/20 text-red-800 dark:text-red-400 text-xs font-bold p-4 rounded-xl border border-red-100 dark:border-red-900/35 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUBPAGE HORIZONTAL TABS */}
      <div className="flex border-b border-gray-150 dark:border-slate-800 gap-1.5 select-none overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'users' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          👤 دليل المستخدمين وحظر الحسابات ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('subscribers')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'subscribers' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          👑 سجل المشتركين والباقات النشطة ({subscribers.length})
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'plans' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          ⚙️ إدارة الباقات ({plans.length})
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'requests' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          🔔 طلبات التفعيل ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'payments' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          ⚙️ إعدادات الاشتراكات
        </button>
      </div>

      {actionLoading && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-slate-800 rounded-xl justify-center text-xs font-bold text-indigo-700 dark:text-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جاري تحديث وتطبيق التغييرات الائتمانية في النظام...</span>
        </div>
      )}

      {/* VIEW: TAB 1 - USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                placeholder="البحث بالاسم البريد الهوية..."
                value={usersSearch}
                onChange={e => setUsersSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white font-sans rounded-xl text-xs font-semibold outline-none focus:bg-white"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 shrink-0">تصفية حالة الحظر:</span>
              <select
                value={usersFilter}
                onChange={e => setUsersFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl text-xs font-sans font-bold select-none"
              >
                <option value="all">كل المسجلين</option>
                <option value="active">النشطين فقط</option>
                <option value="blocked">المحظورين فقط</option>
              </select>

              <button
                type="button"
                onClick={handleBackfillUsers}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-1.5"
                title="تفعيل الباقة المجانية تلقائيًا للمستخدمين الذين لا يمتلكون اشتراكاً نشطاً أو تجريبياً"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تفعيل الباقة المجانية للمستخدمين الحاليين</span>
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <span className="text-xs text-gray-400">جاري مسح الحسابات المسجلة...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-850">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold">لا توجد حسابات مطابقة لشروط البحث.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] border-b border-gray-150 dark:border-slate-800 text-gray-550 dark:text-slate-400">
                    <tr>
                      <th className="p-4 font-bold">الاسم المهني / الشريك</th>
                      <th className="p-4 font-bold">البريد الإلكتروني</th>
                      <th className="p-4 font-bold text-center">الجوال</th>
                      <th className="p-4 font-bold text-center">تاريخ الالتحاق</th>
                      <th className="p-4 font-bold text-center">حالة الاشتراك</th>
                      <th className="p-4 font-bold text-center">حالة الحظر</th>
                      <th className="p-4 font-bold text-center">إجراء العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-semibold text-gray-800 dark:text-white">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-810/30 transition-all">
                        <td className="p-4 font-bold flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <span>{u.full_name}</span>
                        </td>
                        <td className="p-4 font-mono text-[11px] select-all text-gray-500 dark:text-slate-400">{u.email}</td>
                        <td className="p-4 text-center font-mono text-[11px] text-gray-500 dark:text-slate-400">
                          {u.phone || 'غير مدخل'}
                        </td>
                        <td className="p-4 text-center text-gray-500 font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="p-4 text-center">
                          {getUserSubscriptionStatusBadge(u.id)}
                        </td>
                        <td className="p-4 text-center">
                          {u.is_blocked ? (
                            <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-[10px] font-bold">محظور ومجمد</span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[10px] font-bold">عضو نشط</span>
                          )}
                        </td>
                        <td className="p-4 text-center flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenActivatePlanModal(u)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 border border-indigo-200 text-indigo-700 dark:text-indigo-400 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Crown className="w-3.5 h-3.5 text-indigo-500" />
                            <span>تفعيل باقة</span>
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u.id, u.email, u.is_blocked)}
                            className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              u.is_blocked 
                                ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 border-emerald-200 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-50 hover:bg-red-100 dark:bg-red-900/10 border-red-200 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {u.is_blocked ? 'إلغاء الحظر وتفعيل الحساب' : 'حظر الحساب'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: TAB 2 - SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {!hasSupabaseKeys ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-150 dark:border-slate-800 shadow-sm max-w-md mx-auto my-8">
              <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
              <p className="text-sm text-gray-500 dark:text-slate-400 font-extrabold mb-1">لا يمكن تحميل الاشتراكات لأن Supabase غير مهيأ.</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-relaxed font-semibold">يرجى ربط وتكوين مفاتيح الاتصال بـ Supabase للتمكن من تحميل وفحص وعرض اشتراكات الشركاء الحقيقيين.</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-xs">
                  <input
                    type="text"
                    placeholder="البحث بالاسم الجوال البريد..."
                    value={subsSearch}
                    onChange={e => setSubsSearch(e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white font-sans rounded-xl text-xs font-semibold outline-none"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-[11px] font-bold text-gray-400 shrink-0">باقة الاشتراك ومستوى الخدمة:</span>
                  <select
                    value={subsFilter}
                    onChange={e => setSubsFilter(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl text-xs font-bold"
                  >
                    <option value="all">كل المشتركين الفعليين</option>
                    <option value="trialing">باقة تجريبية (Trialing)</option>
                    <option value="active">اشتراكات مفعلة (Active)</option>
                    <option value="expired">منتهي الصلاحية (Expired)</option>
                    <option value="cancelled">ملغي تمامًا (Cancelled)</option>
                  </select>
                </div>
              </div>

              {unlinkedSubs.length > 0 && (
                <div className="p-4 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:border-amber-900 border border-amber-200 rounded-2xl flex flex-col gap-2 transition-all">
                  <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-400 text-xs font-semibold leading-relaxed">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-300">تحذير إداري: تم رصد {unlinkedSubs.length} اشتراك معلّق لا يمتلك ملفاً تعريفياً مكتملاً أو بريداً مفعلاً.</p>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">تم تصفية هذه السجلات وحجبها تلقائياً من قائمة المشتركين الفعليين لضمان دقة وسلامة الإحصائيات وجداول الفوترة.</p>
                    </div>
                  </div>
                </div>
              )}

              {loadingSubs ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                  <span className="text-xs text-gray-400">جاري تحميل سجل المشتركين النشطين...</span>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-850">
                  <Crown className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-extrabold">لا توجد اشتراكات مستخدمين حقيقية حتى الآن.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] border-b border-gray-150 dark:border-slate-800 text-gray-550 dark:text-slate-400">
                        <tr>
                          <th className="p-4 font-bold">الشريك / جهة العقار</th>
                          <th className="p-4 font-bold">جوال الفوترة</th>
                          <th className="p-4 font-bold text-center">تفاصيل الترخيص</th>
                          <th className="p-4 font-bold text-center">قناة الاشتراك (Source)</th>
                          <th className="p-4 font-bold text-center">تاريخ الانتهاء</th>
                          <th className="p-4 font-bold text-center">الأيام المتبقية</th>
                          <th className="p-4 font-bold text-center">حمل اليوم</th>
                          <th className="p-4 font-bold text-center">إجراءات المراقبة والمحاسبة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-semibold text-gray-800 dark:text-white">
                        {filteredSubscribers.map(s => {
                          const daysRem = getDaysRem(s.ends_at);
                          return (
                            <tr key={s.id || s.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-810/30 transition-all text-xs font-semibold">
                              <td className="p-4">
                                <span className="font-bold block text-sm text-gray-900 dark:text-white">{s.full_name}</span>
                                <span className="text-[10px] text-gray-400 block font-mono mt-0.5 select-all">{s.email}</span>
                              </td>
                              <td className="p-4 font-mono text-[11px] select-all">{s.phone_number || 'غير متوفر'}</td>
                          <td className="p-4 text-center">
                            <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block">{s.plan_name}</span>
                            <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-md font-extrabold mt-1 ${
                              s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' :
                              s.status === 'trialing' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400' :
                              'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-955/20 dark:text-rose-450'
                            }`}>
                              {s.status === 'active' ? 'نشط مدفوع' :
                               s.status === 'trialing' ? 'فترة تجريبية' :
                               s.status === 'expired' ? 'منتهي الصلاحية' :
                               s.status === 'cancelled' ? 'ملغي نهائياً' : s.status}
                            </span>
                            {/* Display if custom limit override is applied */}
                            {s.custom_daily_limit !== null && s.custom_daily_limit !== undefined && (
                              <span className="block text-[9px] text-[#D97706] font-bold mt-1">
                                (حد مخصص: {s.custom_daily_limit} عمليّة)
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              s.source === 'admin_free' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              s.source === 'manual_paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                              s.source === 'trial' ? 'bg-yellow-100 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-300' :
                              s.source === 'payment' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' :
                              'bg-gray-105 text-gray-700 dark:bg-slate-800'
                            }`}>
                              {s.source === 'admin_free' ? '🏷️ منح إداري مجاني' :
                               s.source === 'manual_paid' ? '💼 تفعيل إداري مدفوع' :
                               s.source === 'trial' ? '🌱 تجريب النّظام' :
                               s.source === 'payment' ? '💳 بوابة سداد آلي' : s.source}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-[11px] text-gray-500 dark:text-slate-400">
                            {new Date(s.ends_at).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`font-mono font-bold text-xs ${daysRem > 3 ? 'text-emerald-600' : 'text-red-500 animate-pulse'}`}>
                              {daysRem} يوم
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {s.usage_today} عملية
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => handleOpenManageSub(s)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>إدارة الشريك واشتراكه</span>
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
          )}
            </>
          )}
        </div>
      )}

      {/* VIEW: TAB 3 - SUBSCRIPTION PLANS CONFIG */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50/20 to-sky-50/10 dark:from-slate-900 dark:to-slate-900/50 border border-indigo-100/40 dark:border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>إدارة وتصميم باقات الخدمة والأسعار السحابية</span>
              </h4>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                أنشئ، عدل، كرر أو احذف باقات الخدمة بشكل مرن. يتم تحديث التغيرات محلياً وسحابياً وتنعكس فوراً على شاشات تفعيل واشتراك مستخدمي حاسبة حسبة.
              </p>
            </div>
            
            <button
              onClick={() => {
                setNewPlan({
                  code: `custom_${Math.random().toString(36).substr(2, 5)}`,
                  name: '',
                  description: '',
                  price_sar: 19,
                  duration_days: 30,
                  daily_calculation_limit: null,
                  is_active: true,
                  sort_order: plans.length,
                  features: ['ولوج لا نهائي للحسابات وبنوك الدعم'],
                  badge_text: '',
                  badge_color: 'bg-indigo-500 text-white',
                  card_color: 'border-indigo-500 bg-white dark:bg-slate-900',
                  is_free_plan: false
                });
                setShowAddPlanModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة باقة جديدة 🚀</span>
            </button>
          </div>

          {/* DEFAULT PLAN ALERT */}
          {(() => {
            const hasDefaultPlan = plans.some(p => p.is_default_on_signup && p.is_active);
            if (!hasDefaultPlan && plans.length > 0) {
              return (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-850/40 rounded-2xl flex items-start gap-3 text-amber-850 dark:text-amber-350 text-xs font-semibold leading-relaxed mb-4 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm text-amber-900 dark:text-amber-200">الخطة الافتراضية للتسجيل غير محددة!</h5>
                    <p className="mt-1">لم يتم تفعيل أو تحديد أي باقة كافتراضية أثناء تسجيل مستخدم جديد (is_default_on_signup = true). يرجى تعيين باقة كباقة افتراضية لتسريع تفعيل الحسابات للشركاء والمقاولين تلقائياً.</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {loadingPlans ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <span className="text-xs text-gray-400">جاري تجميع حزم التسعير...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold">لا توجد باقات مدخلة حالياً. اضغط على "إضافة باقة جديدة" للبدء.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(p => (
                <div 
                   key={p.id} 
                   className={`bg-white dark:bg-slate-900 border ${
                     p.card_color || 'border-gray-150 dark:border-slate-800'
                   } p-6 rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden`}
                >
                  {p.badge_text && (
                    <div className="absolute top-3 left-4">
                      <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full ${p.badge_color || 'bg-amber-500 text-white'}`}>
                        {p.badge_text}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 wrap-reverse">
                          <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{p.name}</h4>
                          {p.is_free_plan && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 rounded">باقة مجانية</span>
                          )}
                          {p.is_default_on_signup && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-55 bg-indigo-600 text-white rounded">الافتراضية للشركاء ⭐</span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] text-gray-400 block font-bold mt-0.5">رمز الكود: {p.code} (ترتيب: {p.sort_order || 0})</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md ${
                        p.is_active ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-red-50 text-red-750 dark:bg-red-955/20 dark:text-red-400'
                      }`}>
                        {p.is_active ? 'نشطة للعموم' : 'معطلة / مسودة'}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold leading-relaxed mb-4 border-b border-gray-50 dark:border-slate-800/80 pb-3 h-14 overflow-hidden">
                      {p.description}
                    </p>

                    <div className="space-y-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-5">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px] font-semibold">سعر الاشتراك بالاتصال:</span>
                        <span className="text-indigo-650 dark:text-indigo-400 font-black">{p.price_sar} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px] font-semibold">مدة الصلاحية بالأيام:</span>
                        <span>{p.duration_days} يوم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px] font-semibold">سقف العمليات اليومية:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {p.daily_calculation_limit === null ? 'وصول مفتوح لا نهائي (∞)' : `${p.daily_calculation_limit} عمليّة يومية`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px] font-semibold">سقف حفظ البيانات:</span>
                        <span>
                          {p.saved_results_limit === null || p.saved_results_limit === undefined ? 'وصول مفتوح لا نهائي (∞)' : `${p.saved_results_limit} حسبة ميزانية`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-450 text-[11px] font-semibold">الميزات والصلاحيات:</span>
                        <div className="flex gap-1 text-[9px] font-sans">
                          {p.can_save_results !== false && <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 px-1 rounded" title="حفظ المقارنات">حفظ</span>}
                          {!!p.can_export_results && <span className="bg-sky-50 text-sky-850 dark:bg-sky-955/20 dark:text-sky-400 px-1 rounded" title="تصدير PDF">تصدير PDF</span>}
                          {!!p.can_view_advanced_details && <span className="bg-indigo-50 text-indigo-805 dark:bg-indigo-955/20 dark:text-indigo-400 px-1 rounded" title="الحسبة المتقدمة">حسبة متقدمة</span>}
                        </div>
                      </div>
                    </div>

                    {/* Manage default status control */}
                    <div className="mb-4">
                      {p.is_default_on_signup ? (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/10 py-1.5 px-3 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 flex items-center gap-1.5 font-bold">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>الباقة الافتراضية المعينة عند التسجيل الجديد ✅</span>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              await setDefaultPlan(p.id);
                              showFlashSuccess('تم تفعيل هذه الباقة كباقة افتراضية عند التسجيل بنجاح!');
                              await fetchPlans();
                            } catch (err: any) {
                              showFlashError(`فشل تعيين الباقة كافتراضية: ${err.message || err}`);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading}
                          className="w-full text-center py-1.5 px-3 border border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span>تعيين كالباقة الافتراضية عند التسجيل الجديد</span>
                        </button>
                      )}
                    </div>

                    {/* Features list breakdown within app let */}
                    {p.features && p.features.length > 0 && (
                      <div className="border-t border-gray-50 dark:border-slate-800/80 pt-3 mb-5 space-y-1.5">
                        <span className="text-[10px] text-gray-450 block font-bold mb-1">الميزات المدرجة بالباقة:</span>
                        {p.features.map((feat, fidx) => (
                           <div key={fidx} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-gray-600 dark:text-slate-300">
                             <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                             <span className="font-semibold">{feat}</span>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-50 dark:border-slate-800/80 grid grid-cols-3 gap-2 mt-auto">
                    <button 
                      onClick={() => setEditingPlan({ ...p, features: p.features || [''] })}
                      className="py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                      title="تعديل تفاصيل الباقة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button 
                      onClick={() => handleCopyPlanSubmit(p.id)}
                      className="py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/40 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-350 text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                      title="نسخ وتكرار الباقة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>تكرار</span>
                    </button>
                    <button 
                      onClick={() => handleDeletePlanSubmit(p.id)}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-750 dark:text-rose-400 text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                      title="حذف الباقة نهائياً"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADD PLAN MODAL */}
          {showAddPlanModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 text-right space-y-4 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3 mb-2">
                  <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>تصميم وبناء باقة اشتراك جديدة</span>
                  </h3>
                  <button onClick={() => setShowAddPlanModal(false)} className="text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
                </div>

                <form onSubmit={handleCreatePlanSubmit} className="space-y-4 font-bold text-xs text-gray-700 dark:text-slate-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">اسم الباقة الفريد (بالعربية):</label>
                      <input 
                        type="text"
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                        placeholder="مثال: الباقة العقارية المتميزة"
                        value={newPlan.name}
                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">كود/معرف الباقة الفريد (Plan Code - English - NO spaces):</label>
                      <input 
                        type="text"
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono text-left"
                        placeholder="e.g. premium_annual"
                        value={newPlan.code}
                        onChange={e => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[11px] block">وصف الباقة الموجه للعملاء:</label>
                    <textarea 
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                      placeholder="صف المزايا الرئيسية باختصار لتشجيع الاشتراكات..."
                      value={newPlan.description || ''}
                      onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">سعر الباقة الإجمالي (ريال):</label>
                      <NumericInput 
                        allowDecimals={true}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={newPlan.price_sar === undefined || newPlan.price_sar === null ? '' : newPlan.price_sar}
                        onChange={val => setNewPlan({ ...newPlan, price_sar: val === '' ? 0 : Number(val) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">فترة الصلاحية بالأيام:</label>
                      <NumericInput 
                        allowDecimals={false}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={newPlan.duration_days === undefined || newPlan.duration_days === null ? '' : newPlan.duration_days}
                        onChange={val => setNewPlan({ ...newPlan, duration_days: val === '' ? 30 : Number(val) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">الترتيب بالفهرس (Sort Order):</label>
                      <NumericInput 
                        allowDecimals={false}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={newPlan.sort_order === undefined || newPlan.sort_order === null ? '' : newPlan.sort_order}
                        onChange={val => setNewPlan({ ...newPlan, sort_order: val === '' ? 0 : Number(val) })}
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">سقف العمليات اليومي (أو خالي للمفتوح):</label>
                      <NumericInput 
                        allowDecimals={false}
                        placeholder="للوصول المفتوح غير المحدود اتركه خاليًا"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={newPlan.daily_calculation_limit === null || newPlan.daily_calculation_limit === undefined ? '' : newPlan.daily_calculation_limit}
                        onChange={val => setNewPlan({ ...newPlan, daily_calculation_limit: val === '' ? null : Number(val) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">سقف تفويض الحسابات المحفوظة (أو خالي للمفتوح):</label>
                      <NumericInput 
                        allowDecimals={false}
                        placeholder="للحفظ المفتوح غير المحدود اتركه خاليًا"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={newPlan.saved_results_limit === null || newPlan.saved_results_limit === undefined ? '' : newPlan.saved_results_limit}
                        onChange={val => setNewPlan({ ...newPlan, saved_results_limit: val === '' ? null : Number(val) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_save_results_chk_add"
                        checked={newPlan.can_save_results !== false}
                        onChange={e => setNewPlan({ ...newPlan, can_save_results: e.target.checked })}
                      />
                      <label htmlFor="plan_save_results_chk_add" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">تمكين حفظ المقارنات</label>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_export_pdf_chk_add"
                        checked={!!newPlan.can_export_results}
                        onChange={e => setNewPlan({ ...newPlan, can_export_results: e.target.checked })}
                      />
                      <label htmlFor="plan_export_pdf_chk_add" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">تصدير تقارير PDF</label>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_adv_det_chk_add"
                        checked={!!newPlan.can_view_advanced_details}
                        onChange={e => setNewPlan({ ...newPlan, can_view_advanced_details: e.target.checked })}
                      />
                      <label htmlFor="plan_adv_det_chk_add" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">الحسبة المتقدمة والهوامش</label>
                    </div>
                  </div>

                  {/* Features list section */}
                  <div className="space-y-2 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <label className="text-gray-400 text-[11px] block">مزايا وميزات الباقة (تظهر كعلامات صح خضراء للعملاء):</label>
                    <div className="space-y-2">
                      {(newPlan.features || []).map((feat, index) => (
                        <div key={index} className="flex gap-2">
                          <input 
                            type="text"
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-2 text-xs rounded-xl outline-none flex-1 text-gray-950 dark:text-white text-right"
                            placeholder="اكتب اسم الميزة باللغة العربية..."
                            value={feat}
                            onChange={e => {
                              const copy = [...(newPlan.features || [])];
                              copy[index] = e.target.value;
                              setNewPlan({ ...newPlan, features: copy });
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const copy = [...(newPlan.features || [])];
                              copy.splice(index, 1);
                              setNewPlan({ ...newPlan, features: copy });
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs"
                          >
                            إزالة
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => {
                          setNewPlan({ ...newPlan, features: [...(newPlan.features || []), ''] });
                        }}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 text-xs rounded-xl flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة ميزة مخصصة أخرى</span>
                      </button>
                    </div>
                  </div>

                  {/* Styles section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">نص الشارة الفريدة (الوسم):</label>
                      <input 
                        type="text"
                        placeholder="مثال: الأكثر توفيراً"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                        value={newPlan.badge_text || ''}
                        onChange={e => setNewPlan({ ...newPlan, badge_text: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">ألوان الشارة (Tailwind Classes):</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-[11px] font-mono text-left"
                        value={newPlan.badge_color || ''}
                        onChange={e => setNewPlan({ ...newPlan, badge_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">تصميم برواز الكرت (Tailwind Classes):</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-[11px] font-mono text-left"
                        value={newPlan.card_color || ''}
                        onChange={e => setNewPlan({ ...newPlan, card_color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="new_is_active"
                        checked={newPlan.is_active}
                        onChange={e => setNewPlan({ ...newPlan, is_active: e.target.checked })}
                      />
                      <label htmlFor="new_is_active" className="cursor-pointer select-none text-[11px] text-gray-700 dark:text-slate-300">أريد إتاحة الباقة بالماركت فوراً</label>
                    </div>

                    <div className="flex items-center gap-2">
                       <input 
                        type="checkbox"
                        id="new_is_free"
                        checked={newPlan.is_free_plan}
                        onChange={e => setNewPlan({ ...newPlan, is_free_plan: e.target.checked })}
                      />
                      <label htmlFor="new_is_free" className="cursor-pointer select-none text-[11px] text-gray-700 dark:text-slate-300">تعيين كباقة مجانية (Free Plan)</label>
                    </div>

                    <div className="flex items-center gap-2 col-span-2 border-t border-gray-50 dark:border-slate-800/40 pt-2">
                       <input 
                        type="checkbox"
                        id="new_is_default"
                        checked={!!newPlan.is_default_on_signup}
                        onChange={e => setNewPlan({ ...newPlan, is_default_on_signup: e.target.checked })}
                      />
                      <label htmlFor="new_is_default" className="cursor-pointer select-none text-xs text-indigo-700 dark:text-indigo-400 font-bold">تعيين الباقة الافتراضية الممنوحة تلقائياً عند التسجيل الجديد ⭐</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-gray-50 dark:border-slate-800/80">
                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      تأكيد ومزامنة الباقة السحابة 🌟
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowAddPlanModal(false)}
                      className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer"
                    >
                      إلغاء وإغلاق
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT PLAN MODAL */}
          {editingPlan && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 text-right space-y-4 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3 mb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span>تعديل الباقة البرمجية: {editingPlan.name}</span>
                  </h3>
                  <button onClick={() => setEditingPlan(null)} className="text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
                </div>

                <div className="space-y-4 font-bold text-xs text-gray-700 dark:text-slate-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">اسم المسمى (شاشة الشركاء):</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                        value={editingPlan.name}
                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">كود/معرف الباقة الفريد (غير قابل للتعديل):</label>
                      <input 
                        type="text"
                        disabled
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-400 rounded-xl outline-none text-xs font-mono text-left cursor-not-allowed"
                        value={editingPlan.code}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[11px] block">وصف الباقة الموجه للعملاء:</label>
                    <textarea 
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                      value={editingPlan.description || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">السعر بالريال السعودي (price_sar):</label>
                      <NumericInput 
                        allowDecimals={true}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={editingPlan.price_sar === undefined || editingPlan.price_sar === null ? '' : editingPlan.price_sar}
                        onChange={val => setEditingPlan({ ...editingPlan, price_sar: val === '' ? 0 : Number(val) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">صلاحية الباقة بالأيام (duration_days):</label>
                      <NumericInput 
                        allowDecimals={false}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={editingPlan.duration_days === undefined || editingPlan.duration_days === null ? '' : editingPlan.duration_days}
                        onChange={val => setEditingPlan({ ...editingPlan, duration_days: val === '' ? 30 : Number(val) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">الترتيب بالفهرس (Sort Order):</label>
                      <NumericInput 
                        allowDecimals={false}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={editingPlan.sort_order === undefined || editingPlan.sort_order === null ? '' : editingPlan.sort_order}
                        onChange={val => setEditingPlan({ ...editingPlan, sort_order: val === '' ? 0 : Number(val) })}
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">سقف العمليات اليومي (أو خالي للمفتوح):</label>
                      <NumericInput 
                        allowDecimals={false}
                        placeholder="للوصول المفتوح غير المحدود اتركه خاليًا"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={editingPlan.daily_calculation_limit === null || editingPlan.daily_calculation_limit === undefined ? '' : editingPlan.daily_calculation_limit}
                        onChange={val => setEditingPlan({ ...editingPlan, daily_calculation_limit: val === '' ? null : Number(val) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">سقف تفويض الحسابات المحفوظة (أو خالي للمفتوح):</label>
                      <NumericInput 
                        allowDecimals={false}
                        placeholder="للحفظ المفتوح غير المحدود اتركه خاليًا"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                        value={editingPlan.saved_results_limit === null || editingPlan.saved_results_limit === undefined ? '' : editingPlan.saved_results_limit}
                        onChange={val => setEditingPlan({ ...editingPlan, saved_results_limit: val === '' ? null : Number(val) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_save_results_chk_edit"
                        checked={editingPlan.can_save_results !== false}
                        onChange={e => setEditingPlan({ ...editingPlan, can_save_results: e.target.checked })}
                      />
                      <label htmlFor="plan_save_results_chk_edit" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">تمكين حفظ المقارنات</label>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_export_pdf_chk_edit"
                        checked={!!editingPlan.can_export_results}
                        onChange={e => setEditingPlan({ ...editingPlan, can_export_results: e.target.checked })}
                      />
                      <label htmlFor="plan_export_pdf_chk_edit" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">تصدير تقارير PDF</label>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <input 
                        type="checkbox"
                        id="plan_adv_det_chk_edit"
                        checked={!!editingPlan.can_view_advanced_details}
                        onChange={e => setEditingPlan({ ...editingPlan, can_view_advanced_details: e.target.checked })}
                      />
                      <label htmlFor="plan_adv_det_chk_edit" className="cursor-pointer select-none text-[10px] text-gray-700 dark:text-slate-300">الحسبة المتقدمة والهوامش</label>
                    </div>
                  </div>

                  {/* Features list section */}
                  <div className="space-y-2 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <label className="text-gray-400 text-[11px] block">مزايا وميزات الباقة:</label>
                    <div className="space-y-2">
                      {(editingPlan.features || []).map((feat, index) => (
                        <div key={index} className="flex gap-2">
                          <input 
                            type="text"
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-2 text-xs rounded-xl outline-none flex-1 text-gray-950 dark:text-white text-right"
                            value={feat}
                            onChange={e => {
                              const copy = [...(editingPlan.features || [])];
                              copy[index] = e.target.value;
                              setEditingPlan({ ...editingPlan, features: copy });
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const copy = [...(editingPlan.features || [])];
                              copy.splice(index, 1);
                              setEditingPlan({ ...editingPlan, features: copy });
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold"
                          >
                            إزالة
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingPlan({ ...editingPlan, features: [...(editingPlan.features || []), ''] });
                        }}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 text-xs rounded-xl flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة ميزة مخصصة أخرى</span>
                      </button>
                    </div>
                  </div>

                  {/* Styles section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">نص الشارة الفريدة:</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                        value={editingPlan.badge_text || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, badge_text: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">ألوان الشارة (Tailwind):</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-[11px] font-mono text-left"
                        value={editingPlan.badge_color || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, badge_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 text-[11px] block">تصميم برواز الكرت (Tailwind):</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-[11px] font-mono text-left"
                        value={editingPlan.card_color || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, card_color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-50 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="plan_active_chk_edit"
                        checked={editingPlan.is_active}
                        onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                      />
                      <label htmlFor="plan_active_chk_edit" className="cursor-pointer select-none text-xs text-gray-700 dark:text-slate-350">إتاحة الباقة بالماركت وفي خيارات الترقية</label>
                    </div>

                    <div className="flex items-center gap-2">
                       <input 
                        type="checkbox"
                        id="plan_is_free_chk_edit"
                        checked={editingPlan.is_free_plan}
                        onChange={e => setEditingPlan({ ...editingPlan, is_free_plan: e.target.checked })}
                      />
                      <label htmlFor="plan_is_free_chk_edit" className="cursor-pointer select-none text-xs text-gray-700 dark:text-slate-350">تعيين كباقة مجانية (Free Plan)</label>
                    </div>

                    <div className="flex items-center gap-2 col-span-2 border-t border-gray-50 dark:border-slate-800/40 pt-2">
                       <input 
                        type="checkbox"
                        id="plan_default_chk_edit"
                        checked={!!editingPlan.is_default_on_signup}
                        onChange={e => setEditingPlan({ ...editingPlan, is_default_on_signup: e.target.checked })}
                      />
                      <label htmlFor="plan_default_chk_edit" className="cursor-pointer select-none text-xs text-indigo-700 dark:text-indigo-400 font-bold">تعيين الباقة الافتراضية الممنوحة تلقائياً عند التسجيل الجديد ⭐</label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-gray-50 dark:border-slate-800/80">
                  <button 
                    onClick={handleSavePlanUpdates}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    حفظ التعديلات الفنية ومزامنتها
                  </button>
                  <button 
                    onClick={() => setEditingPlan(null)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: TAB - ACTIVATION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {!hasSupabaseKeys ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-150 dark:border-slate-800 shadow-sm max-w-md mx-auto my-8">
              <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
              <p className="text-sm text-gray-500 dark:text-slate-400 font-extrabold mb-1">لا يمكن تحميل الاشتراكات لأن Supabase غير مهيأ.</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-relaxed font-semibold">يرجى ربط وتكوين مفاتيح الاتصال بـ Supabase للتمكن من فحص وقبول ومعالجة طلبات تفعيل الشركاء الحقيقيين.</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">فرز وتتبع طلبات تفعيل الاشتراكات اليدوية والباقية</h4>
              <p className="text-[10px] text-gray-400">تظهر هنا كافة طلبات التفعيل المرسلة من قبل المستخدمين الراغبين بمزايا الحزم المدفوعة، بادر بالمتابعة لتأكيد التحويلات.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400">صفية الحالة:</span>
              <select
                value={requestsFilter}
                onChange={e => setRequestsFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl text-xs font-bold"
              >
                <option value="all">الكل ({requests.length})</option>
                <option value="pending">المعلقة ({requests.filter(r => r.status === 'pending').length})</option>
                <option value="approved">المقبولة / المفعلة ({requests.filter(r => r.status === 'approved').length})</option>
                <option value="rejected">المرفوضة والملغاة ({requests.filter(r => r.status === 'rejected').length})</option>
              </select>
            </div>
          </div>

          {loadingRequests ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <span className="text-xs text-gray-400">جاري تحميل طلبات التفعيل...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-850">
              <AlertCircle className="w-8 h-8 text-gray-305 mx-auto mb-2 text-indigo-500" />
              <p className="text-xs text-gray-450 font-bold">لا توجد أي طلبات تفعيل واردة حالياً من قبل الشركاء في هذا الفهرس.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-105 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] border-b border-gray-150 dark:border-slate-800 text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="p-4 font-bold">الشريك / العميل</th>
                      <th className="p-4 font-bold">البريد الإلكتروني</th>
                      <th className="p-4 font-bold">الباقة المرغوبة</th>
                      <th className="p-4 font-bold text-center">السعر المقدر</th>
                      <th className="p-4 font-bold text-center">تاريخ تقديم الطلب</th>
                      <th className="p-4 font-bold text-center">الوضعية الحالية</th>
                      <th className="p-4 font-bold text-center">لوحة قرارات الموافقة والتفعيل اليدوي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-semibold text-gray-800 dark:text-white">
                    {requests
                      .filter(r => requestsFilter === 'all' || r.status === requestsFilter)
                      .map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all text-xs font-semibold">
                          <td className="p-4">
                            <span className="font-bold block text-sm text-gray-901 dark:text-white">{r.user_name || 'عضو غير مسجل الاسم'}</span>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{r.user_phone || 'لا يوجد رقم هاتف'}</span>
                          </td>
                          <td className="p-4 font-mono text-[11px] select-all text-gray-500 dark:text-slate-400">{r.user_email}</td>
                          <td className="p-4">
                            <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block">{r.plan_name}</span>
                            <span className="text-[10px] text-gray-400 font-mono block">كود: {r.plan_code}</span>
                          </td>
                          <td className="p-4 text-center text-emerald-600 font-extrabold font-mono">
                            {r.plan_price_sar} ر.س
                          </td>
                          <td className="p-4 text-center text-gray-400 text-[10px] font-mono">
                            {new Date(r.created_at).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center text-[10px] px-2.5 py-1 rounded-full font-bold ${
                              r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-400' :
                              r.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-955/25 dark:text-rose-450' :
                              'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-955/25 dark:text-amber-400 animate-pulse'
                            }`}>
                              {r.status === 'approved' ? '✓ تم الموافقة والتفعيل' :
                               r.status === 'rejected' ? '✕ تم الرفض' : '⏳ معلق وبانتظار تأكيدك'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {r.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveRequest(r.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                                  >
                                    تفعيل فوري 🚀
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(r.id)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black cursor-pointer transition-all"
                                  >
                                    رفض
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteRequest(r.id)}
                                className="p-1 px-2.5 bg-gray-55 hover:bg-gray-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-gray-500 hover:text-rose-650 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                title="حذف من السجلات"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* VIEW: TAB 4 - FUTURE PAYMENTS INFORMATION */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* WhatsApp Settings Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <span className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600">
                <Phone className="w-6 h-6 text-emerald-500" />
              </span>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">إعدادات تفعيل الاشتراكات اليدوية عبر الواتساب</h3>
                <p className="text-xs text-gray-400">يتيح تفعيل باقة اشتراك الشريك من خلال تحويله لرسائل الواتساب لإرسال الإثبات أو تفعيل باقة محددة يدويًا.</p>
              </div>
            </div>

            <div className="border-t border-gray-50 dark:border-slate-800 pt-5 space-y-4 font-bold text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-gray-750 dark:text-slate-350 block">رقم واتساب لوكيل تفعيل الحسابات (مع رمز الدولة وبدون اصفار أو مفتاح +):</label>
                  <input
                    type="text"
                    value={localWhatsappNumber}
                    onChange={(e) => setLocalWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="مثال: 9665xxxxxxxx"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-250 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs text-right font-semibold font-mono"
                  />
                  <span className="text-[10px] text-gray-400 font-sans block mt-1 leading-normal font-medium">* سيتم توجيه العميل بشكل آلي إلى wa.me/رقم_الواتساب لإرسال رسالة التفعيل المخصصة بناءً على هذه القيمة.</span>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-gray-750 dark:text-slate-350 block">رسالة التفعيل الافتراضية (سيتم دمج تفاصيل الباقة المحددة معها):</label>
                  <textarea
                    rows={3}
                    value={localWhatsappMessage}
                    onChange={(e) => setLocalWhatsappMessage(e.target.value)}
                    placeholder="مثال: مرحبًا، أريد تفعيل اشتراك حسبة."
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-250 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs text-right font-semibold"
                  />
                  <span className="text-[10px] text-gray-400 font-sans block mt-1 leading-normal font-medium">* هذه الرسالة كافتتاحية للطلب، سيقوم النظام تلقائيًا بإلحاق الباقة، السعر، مدة الصلاحية، وحد المحاسبة اليومي، والبريد والمسجل للعميل.</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      setSubscriptionSettings({
                        activationWhatsappNumber: localWhatsappNumber.trim(),
                        activationWhatsappMessage: localWhatsappMessage.trim()
                      });
                      showFlashSuccess('تم حفظ إعدادات تفعيل اشتراكات واتساب محلياً في ذاكرة النظام. يرجى الضغط على زر "حفظ التغييرات" أسفل الصفحة لاعتمادها في سحابة قاعدة البيانات.');
                    } catch (err: any) {
                      showFlashError(`تعذر تحديث إعدادات الواتساب: ${err.message || err}`);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>تطبيق إعدادات واتساب المحلية</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <span className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-500">
                <CreditCard className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">هيكلة وجداول المدفوعات التلقائية المستهدفة</h3>
                <p className="text-xs text-gray-400 mt-1">كيف تعمل حوكمة الدورة النقدية ومزامنتها مع بوابات السداد السعودية.</p>
              </div>
            </div>

            <div className="border-t border-gray-50 dark:border-slate-800 pt-4 space-y-4 text-xs font-semibold text-gray-650 dark:text-slate-350 leading-relaxed font-sans">
              <p>
                تم تهيئة الهيكلة البرمجية في المنظومة لتسجيل وإدارة دورة المدفوعات والـ Checkout بالربط مع جدول <code className="bg-slate-100 dark:bg-slate-800 p-1 rounded font-mono text-[10px]">payment_transactions</code>. بمجرد تزويدكم بمتغيرات البيئة لبوابة الدفع الإلكترونية، ستبدأ الحاسبة باستقبال المدفوعات عبر الخطوات الـ 4 التالية:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 text-right">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full flex items-center justify-center mb-3">١</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs block mb-1">فتح معالج الدفع</h4>
                  <p className="text-[11px] text-gray-400 leading-normal font-sans">العميل يختار ترقية الباقة الشهرية أو الـ ٦ أشهر، فيقوده النظام لمعالج الدفع مدى أو الفيزا.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full flex items-center justify-center mb-3">٢</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs block mb-1">تسجيل الـ Pending</h4>
                  <p className="text-[11px] text-gray-400 leading-normal font-sans">يخلق النظام فوراً تعامل بـ Status "pending" مسجلاً الباقة والقيمة والمستخدم في جدول السحابة.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full flex items-center justify-center mb-3">٣</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs block mb-1">استقبال الـ Webhook</h4>
                  <p className="text-[11px] text-gray-400 leading-normal font-sans">بمجرد اقتطاع الرسوم بنجاح من البوابة، يرد الـ Hook للـ API فيتحول حالة المعاملة إلى "paid".</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full flex items-center justify-center mb-3">٤</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs block mb-1">تفعيل الباقة آلياً</h4>
                  <p className="text-[11px] text-gray-400 leading-normal font-sans">يكتشف النظام حالة السداد، فيحدث ends_at ويفعل باقة المستخدم لـ 30 يوم أو 180 يوم فوريًا.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAST MANUAL ACTIVATION MODAL */}
      {showManualPromo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3 mb-2">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">🚀 تفعيل اشتراك يدوي لشريك</h3>
              <button onClick={() => setShowManualPromo(false)} className="text-gray-405 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
            </div>

            <div className="space-y-4 font-bold text-xs text-right">
              <div className="space-y-1.5">
                <label className="text-gray-550 dark:text-slate-350 block">اسم الشريك المطلوب تنشيطه:</label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs text-right font-semibold"
                  value={manualPromoUserId}
                  onChange={e => setManualPromoUserId(e.target.value)}
                >
                  <option value="">-- اختر المستخدم --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-550 dark:text-slate-350 block">حزمة الاشتراك المراد تنشيطها:</label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs text-right font-semibold"
                  value={manualPromoPlanCode}
                  onChange={e => setManualPromoPlanCode(e.target.value)}
                >
                  <option value="monthly">باقة عقارية شهرية (٣٠ يوماً)</option>
                  <option value="six_months">باقة احترافية عقارية (١٨٠ يوماً)</option>
                  <option value="trial">تفعيل مجدداً تجريبي (٧ أيام)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-4">
              <button 
                onClick={handleManualActivateSubmit}
                disabled={!manualPromoUserId}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer text-center"
              >
                تنشيد وتفعيل الباقة
              </button>
              <button 
                onClick={() => setShowManualPromo(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer text-center"
              >
                رجوع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRANT FREE DURATION MODAL (منح مدة مجانية) */}
      {showFreeGrantModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <form onSubmit={handleFreeGrantSubmit} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800/80 pb-3 mb-2">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 text-emerald-600">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
                <span>منح مدة مجانية ائتمانية للشريك</span>
              </h3>
              <button type="button" onClick={() => setShowFreeGrantModal(false)} className="text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
            </div>

            <p className="text-[11px] text-gray-400 font-semibold leading-normal">
              يتيح لك هذا المعالج منح دخول آمن ومستمر لأي عضو مسجل بدون ربطه بבاقة مدفوعة مسبقاً، مع تدوين ملاحظات وامتياز تجريبي مخصص.
            </p>

            <div className="space-y-3 font-bold text-xs text-right">
              {/* Select User */}
              <div className="space-y-1">
                <label className="text-gray-400 block">اختيار المستخدم / الشريك:</label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-semibold text-right"
                  required
                  value={freeGrantUserId}
                  onChange={e => setFreeGrantUserId(e.target.value)}
                >
                  <option value="">-- اختر من المستخدمين في النظام --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email}) - {u.phone || 'بلا جوال'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-gray-400 block">تاريخ بدء المنحة:</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center"
                    required
                    value={freeGrantStartDate}
                    onChange={e => setFreeGrantStartDate(e.target.value)}
                  />
                </div>

                {/* Number of days */}
                <div className="space-y-1">
                  <label className="text-gray-400 block">عدد أيام الترخيص بالشرط:</label>
                  <NumericInput 
                    allowDecimals={false}
                    min={1}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center font-bold"
                    required
                    value={freeGrantDays === undefined || freeGrantDays === null ? '' : freeGrantDays}
                    onChange={val => setFreeGrantDays(val === '' ? 14 : Number(val))}
                  />
                </div>
              </div>

              {/* Custom Daily Limit Limit */}
              <div className="space-y-1">
                <label className="text-gray-400 block">حد العمليات اليومي الممنوح (اختياري):</label>
                <NumericInput 
                  allowDecimals={false}
                  placeholder="اتركه فارغًا لتمنحه إمكانية حسابية لا نهائية (∞)"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono"
                  value={freeGrantLimit === '' ? '' : Number(freeGrantLimit)}
                  onChange={val => setFreeGrantLimit(val === '' ? '' : val.toString())}
                />
                <span className="text-[10px] text-gray-400 font-sans block mt-1 leading-normal">
                  * إذا حدّدت رقماً (مثلاً 15)، فلن يسمح له النظام بتجاوز 15 حسبة في اليوم الواحد طيلة فترة المنحة.
                </span>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-gray-400 block">تأمين ملاحظات المشرف الفنية:</label>
                <textarea 
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none"
                  placeholder="لماذا تم منح هذه المدة؟"
                  value={freeGrantNotes}
                  onChange={e => setFreeGrantNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-4">
              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer text-center"
              >
                تفعيل المنحة المجانية
              </button>
              <button 
                type="button"
                onClick={() => setShowFreeGrantModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-extrabold text-xs"
              >
                رجوع وإلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COMPREHENSIVE SUBSCRIBER MANAGE MODAL (إدارة الشريك والاشتراك بالكامل) */}
      {selectedSub && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-2xl rounded-3xl p-6 text-right space-y-6 overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span>إدارة وهيكلة اشتراك الشريك الثنائية</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-semibold block mt-0.5 select-all">الرقم التعريفي: {selectedSub.user_id}</span>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
            </div>

            {/* Sub-tabs: Profile Information and Sub configuration details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Readonly and contact editing */}
              <div className="space-y-4 border-l border-gray-50 dark:border-slate-800/80 pl-0 md:pl-6">
                <h4 className="font-bold text-xs text-indigo-650 dark:text-indigo-400 border-b border-gray-50 dark:border-slate-850 pb-1.5 block">
                  📂 البيانات الشخصية والفوترة الآمنة
                </h4>

                <div className="space-y-3.5 text-xs font-bold font-sans">
                  <div>
                    <span className="text-gray-400 block text-[11px] mb-1">اسم الشريك التعاقدي:</span>
                    <span className="py-2.5 px-3 bg-gray-50 dark:bg-slate-950 border border-transparent rounded-xl text-xs block text-gray-800 dark:text-slate-200">
                      {selectedSub.full_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px] mb-1">البريد الإلكتروني للفوترة والتحقق:</span>
                    <span className="py-2.5 px-3 bg-gray-50 dark:bg-slate-950 border border-transparent rounded-xl text-xs block text-gray-800 dark:text-slate-200 select-all font-mono">
                      {selectedSub.email}
                    </span>
                  </div>

                  {/* ADMIN EDITABLE PHONE NUMBER */}
                  <div>
                    <label className="text-gray-400 block text-[11px] mb-1">
                      جوال الاتصال والتحصيل الموثق (متاح للمشرف التعديل):
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full pr-9 pl-3 py-2.5 bg-amber-50/10 hover:bg-amber-50/20 dark:bg-slate-950 border border-amber-200/50 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-xs font-bold"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                      />
                      <Phone className="w-4 h-4 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] text-amber-600 block mt-1 font-sans">
                      * يتيح النظام للمشرفين تعديل هاتف الشريك لضمان التحصيل إذا سجلو رقمًا خاطئًا.
                    </span>
                  </div>

                  <div className="bg-indigo-50/10 dark:bg-slate-950/40 p-3 rounded-2xl border border-indigo-100/10 text-[11px] leading-normal font-sans text-gray-500 dark:text-slate-400">
                    <p className="font-bold text-gray-700 dark:text-slate-300 block mb-1">💡 تعليمات السير الائتماني للامتياز:</p>
                    تستطيع تغيير ترقية الترخيص من جدول اليمين فوراً. عند الضغط على ترقية التعديلات الائتمانية، سيتم مزامة الرصيد آلياً مع حاسبة الشريك وقفل/فتح القيود اليدوية.
                  </div>
                </div>
              </div>

              {/* Right Column: Active Subscription parameters configurations */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-indigo-650 dark:text-indigo-400 border-b border-gray-50 dark:border-slate-850 pb-1.5 block">
                  🛡️ ترخيص الباقة والتحكم بالصلاحية
                </h4>

                <div className="space-y-3 text-xs font-bold">
                  {/* Select Map-Plancode */}
                  <div className="space-y-1">
                    <label className="text-gray-400 block">مستوى باقة الاشتراك (Plan):</label>
                    <select 
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-semibold text-right"
                      value={editPlanId}
                      onChange={e => setEditPlanId(e.target.value)}
                    >
                      <option value="">باقة مخصصة مجانية (بدون باقة مسبقة)</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.duration_days} يوم | {p.daily_calculation_limit === null ? 'مفتوح' : `${p.daily_calculation_limit} قسط`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status Select */}
                    <div className="space-y-1">
                      <label className="text-gray-400 block">حالة الاشتراك النشط:</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-right font-bold"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                      >
                        <option value="active">نشط بالكامل (Active)</option>
                        <option value="trialing">فترة تجربة (Trialing)</option>
                        <option value="expired">منتهي الصلاحية (Expired)</option>
                        <option value="cancelled">ملغي الترخيص (Cancelled)</option>
                        <option value="past_due">مستحق السداد (Past Due)</option>
                      </select>
                    </div>

                    {/* Source Select */}
                    <div className="space-y-1">
                      <label className="text-gray-400 block">وسيلة الاقتطاع/القناة:</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-right font-bold"
                        value={editSource}
                        onChange={e => setEditSource(e.target.value)}
                      >
                        <option value="trial">🌱 تجريبي (Trial)</option>
                        <option value="admin_free">👑 منح إداري مجاني</option>
                        <option value="manual_paid">💼 تفعيل إداري مدفوع</option>
                        <option value="payment">💳 بوابة سداد آلي</option>
                        <option value="system">🌐 نظام (System)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Started At Date */}
                    <div className="space-y-1">
                      <label className="text-gray-400 block">تاريخ تفعيل الاشتراك:</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center font-bold"
                        value={editStartedAt}
                        onChange={e => setEditStartedAt(e.target.value)}
                      />
                    </div>

                    {/* Ends At Date */}
                    <div className="space-y-1">
                      <label className="text-gray-400 block">تاريخ انتهاء المفعول:</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center font-bold"
                        value={editEndsAt}
                        onChange={e => setEditEndsAt(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* CUSTOM DAILY LIMIT OVERRIDE */}
                  <div className="space-y-1">
                    <label className="text-gray-400 block">سقف العمليات اليومي المخصص (أوفررايد):</label>
                    <NumericInput 
                      allowDecimals={false}
                      placeholder="للامتياز المفتوح اتكه خاليًا"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono font-bold"
                      value={editCustomLimit === '' ? '' : Number(editCustomLimit)}
                      onChange={val => setEditCustomLimit(val === '' ? '' : val.toString())}
                    />
                    <span className="text-[10px] text-gray-400 font-sans block mt-1 leading-normal font-medium">
                      * يحل هذا الحد المخصص محل المعايير الأساسية للباقة المحددة في الأعلى (إذا تم ملؤه).
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-gray-400 block">ملاحظات وشهادات المشرف التعاقدية:</label>
                    <textarea 
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-semibold"
                      placeholder="ملاحظات توضيحية حول تفعيل مميزات الحساب يدوياً..."
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PRESET FAST ACTIONS ROW */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-gray-150 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-black text-gray-900 dark:text-white block">⚡ إجراءات تحكم سريعة وبديلة:</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button"
                  onClick={() => handleExtendSubscription(selectedSub.user_id, 30)}
                  className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                >
                  ➕ تمديد فوري ٣٠ يوم
                </button>
                <button 
                  type="button"
                  onClick={() => handleMarkExpired(selectedSub.user_id)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                >
                  ⚠️ إنهاء صلاحية كود الباقة
                </button>
                <button 
                  type="button"
                  onClick={() => handleCancelSubscription(selectedSub.user_id)}
                  className="px-3 py-2 bg-gray-250 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-350 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                >
                  🛑 إلغاء الاشتراك نهائياً
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50 dark:border-slate-800/80">
              <button 
                onClick={handleSaveSubSettings}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>تطبيق التغييرات الائتمانية والمالية</span>
              </button>
              <button 
                onClick={() => setSelectedSub(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                إغلاق المعالج والرجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL PLAN ACTIVATION MODAL */}
      {showActivatePlanModal && selectedUserForActivation && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800/80 pb-3 mb-2">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 text-indigo-600">
                <Crown className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>تفعيل باقة اشتراك جديدة للمستخدم يدوياً</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowActivatePlanModal(false)} 
                className="text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 text-xs font-semibold text-gray-800 dark:text-slate-350 space-y-1.5">
              <p className="font-bold text-indigo-805 dark:text-indigo-300">📌 بيانات المستخدم المحدد:</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-sans text-[11px] text-gray-600 dark:text-slate-400">
                <div>الاسم: <span className="font-bold text-gray-900 dark:text-slate-200">{selectedUserForActivation.full_name}</span></div>
                <div>البريد: <span className="font-bold text-gray-900 dark:text-slate-200">{selectedUserForActivation.email}</span></div>
                <div className="col-span-2">الجوال: <span className="font-bold text-gray-900 dark:text-slate-200">{selectedUserForActivation.phone || 'غير متوفر'}</span></div>
              </div>
            </div>

            {existingSubscriptionWarning && (
              <div className="p-4 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex flex-col gap-1 transition-all">
                <div className="flex items-start gap-2 text-amber-805 dark:text-amber-400 text-xs font-semibold leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-300">تحذير استبدال الاشتراك:</p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">{existingSubscriptionWarning}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 font-semibold text-xs text-right">
              {/* Select Plan */}
              <div className="space-y-1.5">
                <label className="text-gray-400 block font-bold">اختيار الباقة البرمجية المرادة:</label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-bold text-right"
                  required
                  value={chosenPlanId}
                  onChange={e => setChosenPlanId(e.target.value)}
                >
                  {activePlansOnly.length === 0 ? (
                    <option value="">لا توجد باقات مفعلة حالياً في النظام</option>
                  ) : (
                    activePlansOnly.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - سعرها: {p.price_sar} ر.س ({p.duration_days} يوم)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-bold">تاريخ بداية الصلاحية:</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center font-bold"
                    required
                    value={activationStartDate}
                    onChange={e => setActivationStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-bold">تاريخ نهاية الصلاحية:</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center font-bold"
                    required
                    value={activationEndDate}
                    onChange={e => setActivationEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-gray-400 block font-bold">حالة الاشتراك الابتدائي:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-slate-350 select-none">
                    <input 
                      type="radio" 
                      name="activationStatus" 
                      value="active" 
                      checked={activationStatus === 'active'} 
                      onChange={() => setActivationStatus('active')}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>نشط وفوري (active)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-slate-350 select-none">
                    <input 
                      type="radio" 
                      name="activationStatus" 
                      value="trialing" 
                      checked={activationStatus === 'trialing'} 
                      onChange={() => setActivationStatus('trialing')}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>تجريبي مقيد (trialing)</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-gray-400 block font-bold">ملاحظات المشرف الإداري:</label>
                <textarea 
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-semibold text-right"
                  placeholder="ملاحظات توضيحية (مثال: تم التفعيل بالطلب يدوياً عبر واتساب)..."
                  value={activationNotes}
                  onChange={e => setActivationNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-slate-800/80">
              <button 
                type="button"
                onClick={handleConfirmActivatePlan}
                disabled={actionLoading || activePlansOnly.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4 text-white" />
                )}
                <span>{existingSubscriptionWarning ? 'تأكيد واستبدال الباقة' : 'تفعيل الاشتراك الآن'}</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowActivatePlanModal(false)}
                className="w-full py-3 bg-gray-150 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-350 font-black text-xs rounded-xl cursor-pointer transition-all"
              >
                إلغاء وتراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
