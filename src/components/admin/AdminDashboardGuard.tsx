import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface GuardProps {
  children: React.ReactNode;
}

export function AdminDashboardGuard({ children }: GuardProps) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const { navigate } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-[#0057B8]" />
        <span className="text-xs text-slate-400 font-bold select-none">جاري التحقق من صلاحيات المدير الفنية...</span>
      </div>
    );
  }

  if (!user) {
    // If no user session, redirect to administrative login page
    React.useEffect(() => {
      navigate('/admin');
    }, [navigate]);
    return null;
  }

  // Double check role is exclusively 'admin'
  const userRole = profile?.role || 'user';
  const isAllowed = userRole === 'admin' || isAdmin;

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-sans font-black text-lg text-slate-950">الوصول غير مصرح به</h2>
            <p className="text-sm font-bold text-red-600 leading-relaxed font-sans">
              غير مصرح لك بدخول لوحة التحكم.
            </p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              الحساب الحالي (<span className="font-mono text-slate-700 font-bold">{user?.email}</span>) لا يملك رتبة مدير. رتبتك الحالية هي: مستخدم.
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate('/admin');
            }}
            className="w-full py-3 bg-[#0057B8] text-white hover:bg-[#004bb0] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            تسجيل الخروج والدخول بحساب مشرف
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
