import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Sparkles, User, Mail, Calendar, Settings, AlertCircle, Loader2 } from 'lucide-react';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'staff' | 'customer' | 'user' | 'manager';
  subscription: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string | null;
  created_at: string;
  last_login?: string | null;
};

const roleLabel = { 
  owner: 'مالك المنصة والسيستم الرئيسي',
  admin: 'مدير (Admin)', 
  staff: 'موظف (Staff)', 
  customer: 'عميل (Customer)',
  manager: 'مدير عمليات (Manager)',
  user: 'مستشار عقاري (User)'
};
const roleColor = {
  owner: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-700 font-extrabold',
  admin: 'bg-red-50 text-red-700 border border-red-100',
  staff: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  customer: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  manager: 'bg-amber-50 text-amber-700 border border-amber-100',
  user: 'bg-slate-100 text-slate-700 border border-slate-200'
};

const subscriptionLabel = {
  free: 'مجانية',
  basic: 'أساسية',
  premium: 'مميزة',
  enterprise: 'مؤسسات'
};

const subscriptionColor = {
  free: 'bg-slate-100 text-slate-700 border border-slate-200',
  basic: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  premium: 'bg-amber-50 text-amber-700 border border-amber-100',
  enterprise: 'bg-purple-50 text-purple-700 border border-purple-100'
};

export function UsersManagementPage() {
  const { isOwner, isAdmin, isStaff, isCustomer, user, profile: authProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, [isOwner, isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    setErrorMsg('');

    // Determine current user role
    const currentUserRole = authProfile?.role || (isOwner ? 'owner' : (isAdmin ? 'admin' : 'customer'));

    if (!hasSupabaseKeys) {
      // Return beautiful mock user list for local view
      const mockUsers: Profile[] = [
        {
          id: 'owner_id',
          email: 'alshawshfras@gmail.com',
          full_name: 'فراس الشاوش (مالك المنصة)',
          role: 'owner',
          subscription: 'enterprise',
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date().toISOString(),
        },
        {
          id: 'admin_id_1',
          email: 'admin@hasba.com',
          full_name: 'مدير الصلاحيات المساعد',
          role: 'admin',
          subscription: 'premium',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date().toISOString(),
        },
        {
          id: 'staff_id_1',
          email: 'staff@hasba.com',
          full_name: 'الموظف الداخلي المالي',
          role: 'staff',
          subscription: 'basic',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'customer_id_1',
          email: 'customer@hasba.com',
          full_name: 'العميل المالي المعتمد',
          role: 'customer',
          subscription: 'free',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: null,
        }
      ];

      // Safe filtering on mock list
      let filtered = mockUsers;
      if (currentUserRole === 'admin') {
        filtered = filtered.filter(u => u.role !== 'owner');
      } else if (currentUserRole !== 'owner' && user) {
        filtered = filtered.filter(u => u.id === user.id);
      }

      setUsers(filtered);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('user_profiles').select('*');
      
      // If admin, filter out role = owner from database request
      if (currentUserRole === 'admin') {
        query = query.neq('role', 'owner');
      } else if (currentUserRole !== 'owner' && user) {
        query = query.eq('id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure subscription is typed correctly and has fallback
      let typedData = (data ?? []).map((item: any) => ({
        ...item,
        subscription: item.subscription || 'free'
      })) as Profile[];
      
      // Direct clientside filter as additional double safety
      if (currentUserRole !== 'owner') {
        typedData = typedData.filter(u => u.role !== 'owner' && u.email?.toLowerCase().trim() !== 'alshawshfras@gmail.com' && u.email?.toLowerCase().trim() !== 'alshawshfras3@gmail.com');
      }

      setUsers(typedData);
    } catch (err: any) {
      console.error("Error fetching user profiles:", err);
      // Fallback gracefully in case the public.user_profiles table doesn't exist yet
      if (user) {
        const fallbackProfile: Profile = {
          id: user.id,
          email: user.email || '',
          full_name: authProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.username || 'مستشار عقاري',
          role: isOwner ? 'owner' : (isAdmin ? 'admin' : 'customer'),
          subscription: 'free',
          created_at: user.created_at || new Date().toISOString(),
          last_login: new Date().toISOString()
        };
        const filteredFallback = (currentUserRole === 'admin' && fallbackProfile.role === 'owner') ? [] : [fallbackProfile];
        setUsers(filteredFallback);
        setErrorMsg('ملاحظة: تعذر الاتصال بجدول المستخدمين الموحد في Supabase. تم عرض حسابك الحالي مؤقتاً.');
      } else {
        setErrorMsg('فشل تحميل بيانات البروفايلات العقارية ولا يوجد مستخدم نشط حالياً.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: 'owner' | 'admin' | 'staff' | 'customer' | 'user' | 'manager') {
    const targetUser = users.find(u => u.id === userId);
    const currentUserRole = authProfile?.role || (isOwner ? 'owner' : (isAdmin ? 'admin' : 'customer'));

    // Admin/User cannot edit themselves
    if (userId === authProfile?.id) {
      alert('لا يمكنك تعديل صلاحيتك الخاصة حماية للنظام!');
      return;
    }

    // Role protection checks
    if (currentUserRole !== 'owner') {
      alert('خطأ أمني: غير مصرح لك كمسؤول بتعديل أو ترقية أدوار المستخدمين الآخرين!');
      return;
    }

    if (!hasSupabaseKeys) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء تحديث الدور');
    }
  }

  async function updateSubscription(userId: string, newSub: 'free' | 'basic' | 'premium' | 'enterprise') {
    const targetUser = users.find(u => u.id === userId);
    const currentUserRole = authProfile?.role || (isOwner ? 'owner' : (isAdmin ? 'admin' : 'customer'));

    if (userId === authProfile?.id) {
      alert('لا يمكنك تعديل باقة الاشتراك الخاصة بك من هنا!');
      return;
    }

    // Direct block for non-owners trying to modify owners or admins
    if (currentUserRole !== 'owner') {
      if (targetUser?.role === 'owner' || targetUser?.role === 'admin') {
        alert('خطأ أمني: كمدير لا يمكنك تعديل باقات المشرفين أو ملاك المنصة!');
        return;
      }
    }

    if (!hasSupabaseKeys) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription: newSub } : u));
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ subscription: newSub })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء تحديث الباقة');
    }
  }

  async function deleteUser(userId: string, targetEmail: string, targetRole: string) {
    const currentUserRole = authProfile?.role || (isOwner ? 'owner' : (isAdmin ? 'admin' : 'customer'));

    // owner cannot delete themselves from UI
    if (userId === authProfile?.id) {
      alert('لا يمكنك حذف حسابك الحالي النشط من لوحة الإشراف!');
      return;
    }

    // Direct block if targets is owner
    if (targetRole === 'owner' || targetEmail === 'alshawshfras@gmail.com' || targetEmail === 'alshawshfras3@gmail.com') {
      alert('خطأ أمني: لا يمكن حذف حساب مالك النظام الرئيسي!');
      return;
    }

    // Check if admin has authority
    if (currentUserRole !== 'owner') {
      if (currentUserRole === 'admin') {
        if (!['customer', 'staff', 'user', 'manager'].includes(targetRole)) {
          alert('خطأ أمني: كمدير، يمكنك فقط حذف العملاء أو الموظفين!');
          return;
        }
      } else {
        alert('خطأ أمني: غير مصرح لك بإجراء عمليات حذف الحسابات!');
        return;
      }
    }

    const confirmDelete = window.confirm(`هل أنت متأكد من حذف هذا الحساب نهائيًا؟ (${targetEmail})\nلا يمكن التراجع عن هذا الإجراء مطلقاً وسيتم إزالته من بوابة الهوية والبروفايلات.`);
    if (!confirmDelete) return;

    if (!hasSupabaseKeys) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert('محاكاة: تم حذف حساب المستخدم بنجاح من قائمة معاينة النظام.');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
      if (error) throw error;

      alert('تم حذف الحساب والهوية والبروفايل للمستشار بنجاح من السيستم وقاعدة البيانات.');
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err?.message || 'حدث خطأ أثناء محاولة حذف المستخدم. يرجى التأكد من تشغيل الترحيل المناسب.');
    }
  }

  if (!user && hasSupabaseKeys) {
    return (
      <div className="p-8 text-center bg-white border border-amber-100 rounded-2xl max-w-md mx-auto my-12 space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">يرجى تسجيل الدخول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          يرجى تسجيل الدخول كمسؤول أو كمستشار مسجّل للوصول إلى تفاصيل الحساب والاشتراكات.
        </p>
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="p-8 text-center bg-white border border-amber-100 rounded-2xl max-w-md mx-auto my-12 space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">غير مصرح بالوصول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          حسابك كـ (موظف) لا يملك صلاحية مخصصة لعرض وإدارة حسابات واشتراكات مستخدمي المنصة الماليين.
        </p>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="p-8 text-center bg-white border border-red-100 rounded-2xl max-w-md mx-auto my-12 space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">غير مصرح بالوصول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          أنت غير مسجل كمسؤول أو موظف مالي معتمد. هذه الصفحة مخصصة لمدراء النظام وملاك حسبة لحماية البيانات.
        </p>
      </div>
    );
  }

  // Calc statistics over already filtered list (means owner is fully hidden from admin's perspective)
  const totalCount = users.length;
  const activeSubsCount = users.filter(u => ['basic', 'premium', 'enterprise'].includes(u.subscription)).length;
  const freeCount = users.filter(u => u.subscription === 'free' || !u.subscription).length;

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSub = subscriptionFilter === 'all' || u.subscription === subscriptionFilter;

    return matchSearch && matchRole && matchSub;
  });

  function handleExportCSV() {
    const headers = ['الاسم', 'البريد الإلكتروني', 'الصلاحية', 'الباقة', 'تاريخ التسجيل', 'آخر دخول'];
    const rows = filteredUsers.map(u => [
      u.full_name || 'مستشار غير معرّف',
      u.email,
      roleLabel[u.role] || u.role,
      subscriptionLabel[u.subscription] || 'مجانية',
      u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '',
      u.last_login ? new Date(u.last_login).toLocaleDateString('ar-SA') : 'غير متوفر'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hesba_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0057B8]" />
          <span>{isOwner ? 'لوحة التحكم الشاملة لمالك المنصة والاشتراكات والتحكم بالصلاحيات' : (isAdmin ? 'لوحة التحكم بالمستخدمين والصلاحيات وباقات الاشتراكات' : 'تفاصيل حسابي العقاري واشتراكي')}</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          {isAdmin 
            ? 'عرض وترقية المستشارين المعتمدين والمشرفين والتحكم في باقات اشتراكاتهم وتاريخ دخولهم.' 
            : 'عرض تفاصيل ملفك الشخصي المعتمد وصلاحياتك وباقة الاشتراك النشطة حالياً.'
          }
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* قسم الإحصائيات الذكية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">إجمالي الحسابات المسجلة</span>
            <h3 className="text-xl font-bold font-mono text-[#111827]">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
            <User className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">الاشتراكات المدفوعة النشطة</span>
            <h3 className="text-xl font-bold font-mono text-amber-600">{activeSubsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">الحسابات المجانية</span>
            <h3 className="text-xl font-bold font-mono text-emerald-600">{freeCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* شريط البحث والتصفية والتصدير */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3 flex-grow">
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-xs font-bold font-mono outline-none focus:border-[#0057B8] focus:bg-white placeholder:font-sans placeholder:font-normal transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-4 h-4" />
            </span>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 shrink-0">تصفية الأدوار:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-xs font-bold font-sans outline-none cursor-pointer focus:border-[#0057B8] transition-all"
            >
              <option value="all">كل الصلاحيات</option>
              {isOwner && <option value="owner">مالك المنصة</option>}
              <option value="admin">مدير (Admin)</option>
              <option value="staff">موظف (Staff)</option>
              <option value="customer">عميل (Customer)</option>
              <option value="manager">مدير عمليات</option>
              <option value="user">مستشار عقاري</option>
            </select>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 shrink-0">الاشتراكات:</span>
            <select
              value={subscriptionFilter}
              onChange={e => setSubscriptionFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-xs font-bold font-sans outline-none cursor-pointer focus:border-[#0057B8] transition-all"
            >
              <option value="all">كل الباقات</option>
              <option value="free">مجانية</option>
              <option value="basic">أساسية</option>
              <option value="premium">مميزة</option>
              <option value="enterprise">مؤسسات</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredUsers.length === 0}
          className="w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
        >
          <Calendar className="w-4 h-4" />
          <span>تصدير البيانات (CSV)</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
          <span className="text-xs text-gray-500 font-bold">جاري تحميل البروفايلات...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl space-y-3">
          <User className="w-10 h-10 text-gray-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-gray-700">لا يوجد حسابات مطابقة للبحث</h4>
          <p className="text-xs text-gray-400">لم نتمكن من العثور على أي نتائج في الحسابات النشطة والمفلترة.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#111827]">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-gray-500">
                <tr>
                  <th className="p-4 font-bold">المستشار / العضو</th>
                  <th className="p-4 font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold text-center">الصلاحية الحالية</th>
                  <th className="p-4 font-bold text-center">الباقة الحالية</th>
                  <th className="p-4 font-bold text-center">تاريخ التسجيل</th>
                  <th className="p-4 font-bold text-center">آخر دخول</th>
                  {isAdmin && <th className="p-4 font-bold text-center">تحديث الصلاحية والباقة</th>}
                  {(isOwner || isAdmin) && <th className="p-4 font-bold text-center">إجراءات الحذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-semibold">
                {filteredUsers.map(userItem => {
                  const isUserOwner = userItem.role === 'owner' || userItem.email === 'alshawshfras@gmail.com' || userItem.email === 'alshawshfras3@gmail.com';
                  const isUserAdmin = userItem.role === 'admin';
                  const isSelf = userItem.id === authProfile?.id;
                  
                  // Disable dropdown controls for Admin trying to update Owner/Admin, or Owner trying to update themselves
                  const canModifyRole = isOwner && !isSelf;
                  const canModifySubscription = isOwner || (isAdmin && !isUserOwner && !isUserAdmin);

                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50/50 transition-all text-xs">
                      <td className="p-4 font-bold flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                        <span>{userItem.full_name ?? 'مستشار غير معرّف'}</span>
                      </td>
                      <td className="p-4 text-gray-500 font-mono text-[11px] select-all">{userItem.email}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${roleColor[userItem.role]}`}>
                          {roleLabel[userItem.role]}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${subscriptionColor[userItem.subscription || 'free']}`}>
                          {subscriptionLabel[userItem.subscription || 'free'] || 'مجانية'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-gray-500 font-mono">
                        {new Date(userItem.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-4 text-center text-gray-500 font-mono">
                        {userItem.last_login ? new Date(userItem.last_login).toLocaleDateString('ar-SA') : 'غير متوفر'}
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-400">
                              <span className="text-right">الدور:</span>
                              <select
                                 value={userItem.role}
                                 onChange={e => updateRole(userItem.id, e.target.value as any)}
                                 disabled={!canModifyRole}
                                 className="px-2 py-1 bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg outline-none focus:border-[#0057B8] cursor-pointer disabled:opacity-50"
                              >
                                {isOwner && <option value="owner">مالك المنصة (Owner)</option>}
                                <option value="admin">مدير (Admin)</option>
                                <option value="staff">موظف (Staff)</option>
                                <option value="customer">عميل (Customer)</option>
                                {userItem.role === 'manager' && <option value="manager">مدير عمليات (Manager)</option>}
                                {userItem.role === 'user' && <option value="user">مستشار عقاري (User)</option>}
                              </select>
                            </div>

                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-400">
                              <span className="text-right">الباقة:</span>
                              <select
                                value={userItem.subscription || 'free'}
                                onChange={e => updateSubscription(userItem.id, e.target.value as any)}
                                disabled={!canModifySubscription}
                                className="px-2 py-1 bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg outline-none focus:border-[#0057B8] cursor-pointer disabled:opacity-50"
                              >
                                <option value="free">مجانية (Free)</option>
                                <option value="basic">أساسية (Basic)</option>
                                <option value="premium">مميزة (Premium)</option>
                                <option value="enterprise">مؤسسات (Enterprise)</option>
                              </select>
                            </div>
                          </div>
                        </td>
                      )}
                      {(isOwner || isAdmin) && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => deleteUser(userItem.id, userItem.email, userItem.role)}
                            disabled={
                              isSelf || 
                              isUserOwner ||
                              (!isOwner && !['customer', 'staff', 'user', 'manager'].includes(userItem.role))
                            }
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 transition-all"
                          >
                            حذف حساب المستخدم
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
