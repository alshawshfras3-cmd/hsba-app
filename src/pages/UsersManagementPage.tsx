import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Sparkles, User, Mail, Calendar, Settings, AlertCircle, Loader2 } from 'lucide-react';

import { devUsers } from '../seeds/dev-users';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'user';
  subscription: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string | null;
  created_at: string;
  last_login?: string | null;
  is_active?: boolean;
  status?: string | null;
};

const roleLabel = { 
  owner: 'مدير',
  user: 'مستخدم'
};
const roleColor = {
  owner: 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold',
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
    const currentUserRole = isOwner ? 'owner' : 'user';

    if (!hasSupabaseKeys) {
      // Return beautiful mock user list for local view
      let mockUsers: Profile[] = [];
      const isDevMode = (import.meta as any).env?.DEV === true;
      const showDevUsers = isDevMode && !hasSupabaseKeys && !user;

      const suspendedMocks = JSON.parse(localStorage.getItem('hesba_suspended_mock_emails') || '[]');

      if (showDevUsers) {
        mockUsers = devUsers.map(u => {
          const em = u.email.toLowerCase().trim();
          const isSusp = suspendedMocks.includes(em);
          return {
            ...u,
            role: (em === 'alshawshfras.gmail.com' || em === 'alshawshfras3@gmail.com' || (u.role as any) === 'owner' || (u.role as any) === 'manager' || (u.role as any) === 'admin') ? 'owner' as const : 'user' as const,
            subscription: u.subscription || 'free',
            status: isSusp ? 'suspended' : 'active',
            is_active: !isSusp
          };
        }) as Profile[];
      } else if (user) {
        const em = (user.email ?? '').toLowerCase().trim();
        const isSusp = suspendedMocks.includes(em);
        mockUsers = [
          {
            id: user.id,
            email: user.email || '',
            full_name: authProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.username || 'مستخدم',
            role: (isOwner ? 'owner' : 'user') as any,
            subscription: 'free',
            created_at: user.created_at || new Date().toISOString(),
            last_login: new Date().toISOString(),
            status: isSusp ? 'suspended' : 'active',
            is_active: !isSusp
          }
        ];
      }

      // Safe filtering on mock list
      let filtered = mockUsers;
      if (currentUserRole !== 'owner' && user) {
        filtered = filtered.filter(u => u.id === user.id);
      }

      setUsers(filtered);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('user_profiles').select('*');
      
      if (currentUserRole !== 'owner' && user) {
        query = query.eq('id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure subscription is typed correctly and has fallback, normalize roles as well
      let typedData = (data ?? []).map((item: any) => {
        let r = item.role || 'user';
        const em = (item.email || '').toLowerCase().trim();
        if (em === 'alshawshfras3@gmail.com' || em === 'alshawshfras@gmail.com' || r === 'owner' || r === 'admin' || r === 'manager') {
          r = 'owner';
        } else {
          r = 'user';
        }

        let statusVal = item.status;
        if (!statusVal) {
          statusVal = item.is_active === false ? 'suspended' : 'active';
        }

        return {
          ...item,
          role: r,
          status: statusVal,
          subscription: item.subscription || 'free'
        };
      }) as Profile[];
      
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
          full_name: authProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.username || 'مستخدم',
          role: (isOwner ? 'owner' : 'user') as any,
          subscription: 'free',
          created_at: user.created_at || new Date().toISOString(),
          last_login: new Date().toISOString(),
          status: 'active',
          is_active: true
        };
        const filteredFallback = (currentUserRole !== 'owner' && fallbackProfile.role === 'owner') ? [] : [fallbackProfile];
        setUsers(filteredFallback);
        setErrorMsg('ملاحظة: تعذر الاتصال بجدول المستخدمين الموحد في Supabase. تم عرض حسابك الحالي مؤقتاً.');
      } else {
        setErrorMsg('فشل تحميل بيانات البروفايلات العقارية ولا يوجد مستخدم نشط حالياً.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: 'owner' | 'user') {
    const targetUser = users.find(u => u.id === userId);
    const currentUserRole = isOwner ? 'owner' : 'user';

    // Admin/User cannot edit themselves
    if (userId === authProfile?.id) {
      alert('لا يمكنك تعديل صلاحيتك الخاصة حماية للنظام!');
      return;
    }

    // Role protection checks
    if (currentUserRole !== 'owner') {
      alert('خطأ أمني: غير مصرح لك بتعديل أو ترقية أدوار المستخدمين الآخرين!');
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

  async function toggleStatus(userId: string, currentStatus: string | null | undefined, targetEmail: string) {
    const isOwnerEmail = targetEmail.toLowerCase().trim() === 'alshawshfras@gmail.com' || targetEmail.toLowerCase().trim() === 'alshawshfras3@gmail.com';
    if (isOwnerEmail) {
      alert('ممنوع تماماً حظر أو تعطيل حساب مالك النظام الأساسي!');
      return;
    }

    if (userId === authProfile?.id) {
      alert('لا يمكنك حظر حسابك الحالي النشط!');
      return;
    }

    const nextStatus = (currentStatus === 'suspended') ? 'active' : 'suspended';
    const isBanning = nextStatus === 'suspended';

    const confirmAction = window.confirm(
      isBanning 
        ? `هل أنت متأكد من حظر المستخدم (${targetEmail})؟\nلن يتمكن من استخدام النظام أو تسجيل الدخول بعد الآن.`
        : `هل أنت متأكد من إلغاء الحظر وتفعيل حساب المستخدم (${targetEmail})؟`
    );
    if (!confirmAction) return;

    if (!hasSupabaseKeys) {
      // Mock ban
      const suspendedMocks = JSON.parse(localStorage.getItem('hesba_suspended_mock_emails') || '[]');
      let updatedMocks = [];
      if (isBanning) {
        updatedMocks = [...suspendedMocks, targetEmail.toLowerCase().trim()];
      } else {
        updatedMocks = suspendedMocks.filter((e: string) => e !== targetEmail.toLowerCase().trim());
      }
      localStorage.setItem('hesba_suspended_mock_emails', JSON.stringify(updatedMocks));
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus, is_active: !isBanning } : u));
      alert(isBanning ? 'تم حظر المستخدم في قائمة معاينة النظام بنجاح.' : 'تم إلغاء حظر المستخدم في قائمة معاينة النظام بنجاح.');
      return;
    }

    try {
      // Direct dual payload update
      let updatePayload: any = { is_active: !isBanning, status: nextStatus };
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) {
        // Fallback checks
        if (error.message?.includes('column "status"') || error.message?.includes('status')) {
          const { error: fallbackError } = await supabase
            .from('user_profiles')
            .update({ is_active: !isBanning })
            .eq('id', userId);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      alert(isBanning ? 'تم حظر حساب المستخدم بنجاح.' : 'تم إلغاء حظر حساب المستخدم وتفعيله المباشر.');
      fetchUsers();
    } catch (err: any) {
      console.error('Error toggling ban status:', err);
      alert(err?.message || 'حدث خطأ أثناء تغيير حالة حظر حساب العضو.');
    }
  }

  if (!user && hasSupabaseKeys) {
    return (
      <div className="p-8 text-center bg-white border border-amber-100 rounded-2xl max-w-md mx-auto my-12 space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">يرجى تسجيل الدخول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          يرجى تسجيل الدخول للوصول إلى تفاصيل الحساب.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-8 text-center bg-white border border-red-100 rounded-2xl max-w-md mx-auto my-12 space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">غير مصرح بالوصول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          أنت غير مسجل كمسؤول معتمد في النظام. هذه الصفحة مخصصة لمدراء الإدارة والتحكم.
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
      u.full_name || 'مستخدم غير معرّف',
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
          <span>لوحة التحكم الشاملة وإدارة أدوار وصلاحيات المستخدمين</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          عرض وترقية المستخدمين وتعيين أدوارهم وحجب أو تفعيل الحسابات فوراً.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* قسم الإحصائيات الذكية المبسطة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">إجمالي الحسابات المسجلة بالنظام</span>
            <h3 className="text-xl font-bold font-mono text-[#111827]">{totalCount} مستخدم</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">الحسابات المفلترة حالياً</span>
            <h3 className="text-xl font-bold font-mono text-emerald-600">{filteredUsers.length} حساب</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* شريط البحث وتصفية الأدوار والتصدير */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3 flex-grow">
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-gray-50 border border-gray-100 text-gray-900 rounded-xl text-xs font-bold font-mono outline-none focus:border-[#0057B8] focus:bg-white placeholder:font-sans placeholder:font-normal transition-all"
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
              <option value="owner">مدير</option>
              <option value="user">مستخدم</option>
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
                  <th className="p-4 font-bold">المستخدم / الاسم</th>
                  <th className="p-4 font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold text-center">الصلاحية الحالية</th>
                  <th className="p-4 font-bold text-center">تاريخ التسجيل</th>
                  <th className="p-4 font-bold text-center">حالة الحساب</th>
                  {isOwner && <th className="p-4 font-bold text-center">تحديث الصلاحية والدور</th>}
                  {isOwner && <th className="p-4 font-bold text-center">التحكم بالحظر</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-semibold">
                {filteredUsers.map(userItem => {
                  const isUserOwner = userItem.role === 'owner' || userItem.email === 'alshawshfras@gmail.com' || userItem.email === 'alshawshfras3@gmail.com';
                  const isSelf = userItem.id === authProfile?.id;
                  
                  // Disable dropdown controls for Owner trying to update themselves
                  const canModifyRole = isOwner ? !isSelf : false;

                  const isSuspended = userItem.status === 'suspended' || userItem.is_active === false;

                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50/50 transition-all text-xs">
                      <td className="p-4 font-bold flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                        <span>{userItem.full_name ?? 'مستخدم غير معرّف'}</span>
                      </td>
                      <td className="p-4 text-gray-500 font-mono text-[11px] select-all">{userItem.email}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${roleColor[userItem.role]}`}>
                          {roleLabel[userItem.role]}
                        </span>
                      </td>
                      <td className="p-4 text-center text-gray-500 font-mono">
                        {new Date(userItem.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-4 text-center">
                        {isSuspended ? (
                          <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-[10px] font-bold">
                            محظور
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold">
                            نشط
                          </span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-400">
                              <span className="text-right">الدور:</span>
                              {isUserOwner ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[11px] font-bold inline-block select-none whitespace-nowrap">
                                  مدير
                                </span>
                              ) : (
                                <select
                                   value={userItem.role}
                                   onChange={e => updateRole(userItem.id, e.target.value as any)}
                                   disabled={!canModifyRole}
                                   className="px-2 py-1 bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg outline-none focus:border-[#0057B8] cursor-pointer disabled:opacity-50"
                                >
                                  <option value="owner">مدير</option>
                                  <option value="user">مستخدم</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {isOwner && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleStatus(userItem.id, userItem.status, userItem.email)}
                            disabled={
                              isSelf || 
                              isUserOwner
                            }
                            className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 transition-all ${
                              isSuspended
                                ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700'
                                : 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48]'
                            }`}
                          >
                            {isSuspended ? 'إلغاء الحظر' : 'حظر الحساب'}
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
