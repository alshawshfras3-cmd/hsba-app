import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { Shield, User, Mail, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { getAdminCredentials } from '../lib/adminCredentials';

type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  is_blocked: boolean;
  created_at: string;
};

export function UsersManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBlockedOnly, setShowBlockedOnly] = useState('all'); // all, active, blocked

  const [adminEmail, setAdminEmail] = useState('admin@hesba.com');

  useEffect(() => {
    fetchUsersAndAdminEmail();
  }, []);

  async function fetchUsersAndAdminEmail() {
    setLoading(true);
    setErrorMsg('');

    let currentAdminEmail = 'admin@hesba.com';
    try {
      const credentials = await getAdminCredentials();
      currentAdminEmail = credentials.admin_email.toLowerCase().trim();
      setAdminEmail(currentAdminEmail);
    } catch (e) {
      console.warn("Could not load admin credentials:", e);
    }

    if (!hasSupabaseKeys) {
      setUsers([]);
      setErrorMsg('مفاتيح الاتصال بقاعدة البيانات غير متوفرة');
      setLoading(false);
      return;
    }

    try {
      // 5-second timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT_LIMIT'));
        }, 5000);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, full_name, email, phone, is_blocked, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        return data || [];
      })();

      const rawData = await Promise.race([fetchPromise, timeoutPromise]);

      const filtered = rawData.map((item: any) => ({
        id: item.id,
        email: item.email || '',
        full_name: item.full_name || 'مستخدم غير معرّف',
        phone: item.phone || null,
        is_blocked: item.is_blocked === true,
        created_at: item.created_at || new Date().toISOString()
      })).filter((u: AppUser) => {
        const emailLower = u.email.toLowerCase().trim();
        return emailLower !== currentAdminEmail && emailLower !== 'admin@hesba.com';
      });

      setUsers(filtered);
    } catch (err: any) {
      console.error("Error fetching users from app_users:", err);
      setUsers([]);
      setErrorMsg('تعذر تحميل المستخدمين من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlockStatus(userId: string, email: string, currentlyBlocked: boolean) {
    const emailLower = email.toLowerCase().trim();
    if (emailLower === adminEmail || emailLower === 'admin@hesba.com') {
      alert('ممنوع تماماً حظر حساب مالك أو مسؤول النظام الأساسي!');
      return;
    }

    const nextBlockedState = !currentlyBlocked;
    const confirmAction = window.confirm(
      nextBlockedState 
        ? `هل أنت متأكد من حظر المستخدم (${email})؟\nلن يتمكن من تسجيل الدخول بعد تغيير الحالة.`
        : `هل أنت متأكد من إلغاء الحظر وتفعيل حساب المستخدم (${email})؟`
    );
    if (!confirmAction) return;

    if (!hasSupabaseKeys) {
      alert('لا يمكن تغيير حالة الحظر لعدم وجود ربط نشط مع Supabase.');
      return;
    }

    try {
      const { error: appErr } = await supabase
        .from('app_users')
        .update({ is_blocked: nextBlockedState, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (appErr) {
        throw appErr;
      }

      alert(nextBlockedState ? 'تم حظر حساب المستخدم بنجاح.' : 'تم إلغاء حظر حساب المستخدم وتفعيله المباشر.');
      fetchUsersAndAdminEmail();
    } catch (err: any) {
      console.error('Error toggling block status:', err);
      alert('فشل تغيير حالة الحظر في قاعدة البيانات: ' + (err.message || err));
    }
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchSearch = 
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (showBlockedOnly === 'blocked') {
      matchStatus = u.is_blocked === true;
    } else if (showBlockedOnly === 'active') {
      matchStatus = u.is_blocked === false;
    }

    return matchSearch && matchStatus;
  });

  function handleExportCSV() {
    const headers = ['الاسم', 'البريد الإلكتروني', 'تاريخ التسجيل', 'الحالة'];
    const rows = filteredUsers.map(u => [
      u.full_name || 'مستخدم غير معرّف',
      u.email,
      u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '',
      u.is_blocked ? 'محظور' : 'نشط'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hesba_users_clean_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          <span>إدارة حسابات المستخدمين والاشتراكات العادية</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          عرض المستخدمين المسجلين، التحقق من حالة العضويات، والتحكم بحجب أو تفعيل الحسابات فوراً.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statistics Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">إجمالي حسابات المستخدمين</span>
            <h3 className="text-xl font-bold font-mono text-[#111827]">{users.length} مستخدم</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400">الحسابات المفلترة حالياً</span>
            <h3 className="text-xl font-bold font-mono text-amber-600">{filteredUsers.length} حساب</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3 flex-grow">
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-gray-50 border border-gray-100 text-gray-900 rounded-xl text-xs font-bold outline-none focus:border-amber-500 focus:bg-white placeholder:font-normal transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-4 h-4" />
            </span>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 shrink-0">تصفية الحالة:</span>
            <select
              value={showBlockedOnly}
              onChange={e => setShowBlockedOnly(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-xs font-bold outline-none cursor-pointer focus:border-amber-500 transition-all font-sans"
            >
              <option value="all">كل المشتركين</option>
              <option value="active">الحسابات النشطة فقط</option>
              <option value="blocked">الحسابات المحظورة فقط</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredUsers.length === 0}
          className="w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
        >
          <span>تصدير المستخدمين (CSV)</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="text-xs text-gray-500 font-bold">جاري تحميل حسابات المستخدمين...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl space-y-3">
          <User className="w-10 h-10 text-gray-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-gray-700">لا يوجد مستخدمون مسجلون حتى الآن</h4>
          <p className="text-xs text-amber-600 font-bold leading-relaxed">
            الجدول فارغ. يحتاج المستخدمون الحاليون إلى مزامنة من Supabase Auth إلى جدول app_users لإظهار حساباتهم وإحصاءاتهم في النظام بشكل سليم.
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl space-y-3">
          <User className="w-10 h-10 text-gray-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-gray-700">لا يوجد مستخدمون مطابقون</h4>
          <p className="text-xs text-gray-400">لم نعثر على نتائج مطابقة لفلترة البحث المسجلة.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#111827]">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-gray-500">
                <tr>
                  <th className="p-4 font-bold">الاسم الكامل / العضو</th>
                  <th className="p-4 font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold text-center">تاريخ التسجيل</th>
                  <th className="p-4 font-bold text-center">حالة الحساب</th>
                  <th className="p-4 font-bold text-center">التحكم بالحظر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-semibold">
                {filteredUsers.map(userItem => {
                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50/50 transition-all text-xs">
                      <td className="p-4 font-bold flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                        <span>{userItem.full_name ?? 'مستخدم غير معرّف'}</span>
                      </td>
                      <td className="p-4 text-gray-500 font-mono text-[11px] select-all">{userItem.email}</td>
                      <td className="p-4 text-center text-gray-500 font-mono">
                        {new Date(userItem.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-4 text-center">
                        {userItem.is_blocked ? (
                          <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-[10px] font-bold">
                            محظور
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold">
                            نشط
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleBlockStatus(userItem.id, userItem.email, userItem.is_blocked)}
                          className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            userItem.is_blocked
                              ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700'
                              : 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48]'
                          }`}
                        >
                          {userItem.is_blocked ? 'إلغاء الحظر وتفعيل الحساب' : 'حظر الحساب'}
                        </button>
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
  );
}
