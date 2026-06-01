import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Sparkles, User, Mail, Calendar, Settings, AlertCircle, Loader2 } from 'lucide-react';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user';
  subscription: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string | null;
  created_at: string;
  last_login?: string | null;
};

const roleLabel = { admin: 'أدمن رئيسي', manager: 'مدير منصة', user: 'مستشار عقاري' };
const roleColor = {
  admin: 'bg-red-50 text-red-700 border border-red-100',
  manager: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
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
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setErrorMsg('');

    if (!hasSupabaseKeys) {
      // Return beautiful mock user list for local view
      const mockUsers: Profile[] = [
        {
          id: 'admin_id_1',
          email: 'alshawshfras3@gmail.com',
          full_name: 'فراس الشاوش',
          role: 'admin',
          subscription: 'free',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date().toISOString(),
        },
        {
          id: 'manager_id_1',
          email: 'manager@hasba.com',
          full_name: 'مدير العمليات',
          role: 'manager',
          subscription: 'basic',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'user_id_1',
          email: 'consultant@hasba.com',
          full_name: 'المستشار العقاري الجديد',
          role: 'user',
          subscription: 'premium',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          last_login: null,
        }
      ];
      setUsers(mockUsers);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure subscription is typed correctly and has fallback
      const typedData = (data ?? []).map((item: any) => ({
        ...item,
        subscription: item.subscription || 'free'
      })) as Profile[];
      
      setUsers(typedData);
    } catch (err: any) {
      console.error("Error fetching user profiles:", err);
      setErrorMsg(err?.message || 'فشل تحميل بيانات البروفايلات العقارية');
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: 'admin' | 'manager' | 'user') {
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

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white border border-red-100 rounded-2xl max-w-md mx-auto my-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-950">غير مصرح بالوصول</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          هذه الصفحة مخصصة فقط للمسؤولين المعتمدين والمصممين في نظام حسبة التضامني.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0057B8]" />
          <span>لوحة التحكم بالمستخدمين والصلاحيات وباقات الاشتراكات</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          عرض وترقية المستشارين المعتمدين والمشرفين والتحكم في باقات اشتراكاتهم وتاريخ دخولهم.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
          <span className="text-xs text-gray-500 font-bold">جاري تحميل البروفايلات...</span>
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
                  <th className="p-4 font-bold text-center">تحديث الصلاحية والباقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-semibold">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all text-xs">
                    <td className="p-4 font-bold flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <User className="w-4 h-4" />
                      </div>
                      <span>{user.full_name ?? 'مستشار غير معرّف'}</span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-[11px] select-all">{user.email}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${roleColor[user.role]}`}>
                        {roleLabel[user.role]}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${subscriptionColor[user.subscription || 'free']}`}>
                        {subscriptionLabel[user.subscription || 'free'] || 'مجانية'}
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-500 font-mono">
                      {new Date(user.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-4 text-center text-gray-500 font-mono">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('ar-SA') : 'غير متوفر'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex flex-col gap-0.5 text-[9px] text-gray-400">
                          <span className="text-right">الدور:</span>
                          <select
                            value={user.role}
                            onChange={e => updateRole(user.id, e.target.value as any)}
                            disabled={user.email === 'alshawshfras3@gmail.com'}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg outline-none focus:border-[#0057B8] cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">مستشار (User)</option>
                            <option value="manager">مدير (Manager)</option>
                            <option value="admin">أدمن (Admin)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-0.5 text-[9px] text-gray-400">
                          <span className="text-right">الباقة:</span>
                          <select
                            value={user.subscription || 'free'}
                            onChange={e => updateSubscription(user.id, e.target.value as any)}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg outline-none focus:border-[#0057B8] cursor-pointer"
                          >
                            <option value="free">مجانية (Free)</option>
                            <option value="basic">أساسية (Basic)</option>
                            <option value="premium">مميزة (Premium)</option>
                            <option value="enterprise">مؤسسات (Enterprise)</option>
                          </select>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
