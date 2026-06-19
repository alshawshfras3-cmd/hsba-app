import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
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
  HelpCircle
} from 'lucide-react';
import { 
  adminListSubscribers, 
  adminManualActivateSubscription, 
  adminCancelSubscription, 
  adminExtendSubscription, 
  adminMarkSubscriptionExpired, 
  getSubscriptionPlans, 
  adminUpdatePlan,
  adminSaveUserSubscription,
  adminUpdatePhoneNumber,
  SubscriptionPlan
} from '../lib/subscriptionService';

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
  const [activeTab, setActiveTab] = useState<'users' | 'subscribers' | 'plans' | 'payments'>('users');
  
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
          full_name: item.full_name || 'عضو مجهول',
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
        is_active: editingPlan.is_active
      });
      showFlashSuccess('تم تحديث إعدادات وأسعار الباقة بنجاح.');
      setEditingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      showFlashError(`فشل تعديل الباقة: ${err.message || err}`);
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
    const matchesSearch = 
      (s.full_name || '').toLowerCase().includes(subsSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(subsSearch.toLowerCase()) ||
      (s.phone_number || '').toLowerCase().includes(subsSearch.toLowerCase());
    
    let matchesFilter = true;
    if (subsFilter !== 'all') matchesFilter = s.status === subsFilter;

    return matchesSearch && matchesFilter;
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
          ⚙️ باقات التسعير ومستويات الخدمة ({plans.length})
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition-all border-b-2 rounded-t-xl ${
            activeTab === 'payments' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          💳 هيكلة السداد وبوابات التحصيل
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

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-[11px] font-bold text-gray-400 shrink-0">تصفية حالة الحظر:</span>
              <select
                value={usersFilter}
                onChange={e => setUsersFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl text-xs font-sans font-bold"
              >
                <option value="all">كل المسجلين</option>
                <option value="active">النشطين فقط</option>
                <option value="blocked">المحظورين فقط</option>
              </select>
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
                          {u.is_blocked ? (
                            <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-[10px] font-bold">محظور ومجمد</span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[10px] font-bold">عضو نشط</span>
                          )}
                        </td>
                        <td className="p-4 text-center flex justify-center gap-1">
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

          {loadingSubs ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <span className="text-xs text-gray-400">جاري تحميل سجل المشتركين النشطين...</span>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-850">
              <Crown className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold">لا يوجد مشتركون مطابقون لشروط التصفية النشطة.</p>
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
        </div>
      )}

      {/* VIEW: TAB 3 - SUBSCRIPTION PLANS CONFIG */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/20 dark:bg-slate-900 border border-indigo-100/40 dark:border-slate-810 p-5 rounded-3xl">
            <h4 className="text-xs font-black text-gray-900 dark:text-white mb-1">تعديل باقات الخدمة والأسعار</h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold leading-relaxed">
              تتيح لك المنصة مراجعة الباقات البرمجية الثابتة والتحكم في أسعارها ومدتها وفتراتها التجريبية واليومية على السحابة بكل حيوية دون تعديلات برمجية.
            </p>
          </div>

          {loadingPlans ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <span className="text-xs text-gray-400">جاري تجميع حزم التسعير...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white block">{p.name}</h4>
                        <span className="font-mono text-[10px] text-indigo-500 dark:text-indigo-400 block font-bold">كود الباقة: {p.code}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                        p.is_active ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-red-50 text-red-700'
                      }`}>
                        {p.is_active ? 'مفعلة بالماركت' : 'مخفية'}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold leading-relaxed mb-4 border-b border-gray-50 dark:border-slate-800 pb-3 h-14">
                      {p.description}
                    </p>

                    <div className="space-y-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px]">سعر الباقة (SAR):</span>
                        <span className="text-indigo-650 dark:text-indigo-400">{p.price_sar} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px]">المدة الزمنية بالشرط:</span>
                        <span>{p.duration_days} يوم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-[11px]">أقصى قدرة محاسبية يومية:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {p.daily_calculation_limit === null ? 'وصول مفتوح (∞)' : `${p.daily_calculation_limit} عملية`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 dark:border-slate-800 mt-5">
                    <button 
                      onClick={() => setEditingPlan({ ...p })}
                      className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-150 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer text-center"
                    >
                      ⚙️ تعديل الأسعار والحدود الحركية
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EDIT PLAN MODAL */}
          {editingPlan && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 text-right space-y-4">
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3 mb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">تعديل باقة: {editingPlan.name}</h3>
                  <button onClick={() => setEditingPlan(null)} className="text-gray-405 font-bold hover:text-gray-900 dark:hover:text-white">✕</button>
                </div>

                <div className="space-y-3 font-bold text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400">اسم المسمى (شاشة الشركاء):</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs"
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-gray-400">السعر بالريال السعودي (price_sar):</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                      value={editingPlan.price_sar}
                      onChange={e => setEditingPlan({ ...editingPlan, price_sar: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400">صلاحية الباقة بالأيام (duration_days):</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                      value={editingPlan.duration_days}
                      onChange={e => setEditingPlan({ ...editingPlan, duration_days: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400">سقف العمليات اليومي (أو تصفير للمفتوح):</label>
                    <input 
                      type="number"
                      placeholder="للوصول المفتوح غير المحدود اتركه خاليًا"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none text-xs font-mono"
                      value={editingPlan.daily_calculation_limit === null ? '' : editingPlan.daily_calculation_limit}
                      onChange={e => setEditingPlan({ ...editingPlan, daily_calculation_limit: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                    <span className="text-[10px] text-gray-400 font-sans block mt-1 leading-normal">* اتركه فارغًا لتعيين حد الحسابات اليومية إلى لا نهائي (مفتوح بالكامل).</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox"
                      id="plan_active_chk"
                      checked={editingPlan.is_active}
                      onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    />
                    <label htmlFor="plan_active_chk" className="cursor-pointer select-none text-xs text-gray-700 dark:text-slate-350">إتاحة الباقة بالماركت وفي خيارات الترقية</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-4">
                  <button 
                    onClick={handleSavePlanUpdates}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    حفظ التعديلات الفنية
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

      {/* VIEW: TAB 4 - FUTURE PAYMENTS INFORMATION */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
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
                  <input 
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono text-center"
                    required
                    value={freeGrantDays}
                    onChange={e => setFreeGrantDays(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Custom Daily Limit Limit */}
              <div className="space-y-1">
                <label className="text-gray-400 block">حد العمليات اليومي الممنوح (اختياري):</label>
                <input 
                  type="number"
                  placeholder="اتركه فارغًا لتمنحه إمكانية حسابية لا نهائية (∞)"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono"
                  value={freeGrantLimit}
                  onChange={e => setFreeGrantLimit(e.target.value)}
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
                    <input 
                      type="number"
                      placeholder="للامتياز المفتوح اتكه خاليًا"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl outline-none font-mono font-bold"
                      value={editCustomLimit}
                      onChange={e => setEditCustomLimit(e.target.value)}
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
    </div>
  );
}
