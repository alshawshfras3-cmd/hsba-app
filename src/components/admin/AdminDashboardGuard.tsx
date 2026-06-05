import React, { useEffect, useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface GuardProps {
  children: React.ReactNode;
}

export function AdminDashboardGuard({ children }: GuardProps) {
  const { navigate } = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      try {
        const sessionStr = sessionStorage.getItem('hesba_admin_session');

        if (sessionStr) {
          const session = JSON.parse(sessionStr);

          if (session && session.isAdmin === true) {
            setIsAllowed(true);
            setLoading(false);
            return true;
          }
        }
      } catch (e) {
        console.error('Invalid admin session:', e);
      }

      return false;
    };

    if (checkSession()) return;

    const timer = setTimeout(() => {
      if (!checkSession()) {
        setIsAllowed(false);
        setLoading(false);
      }
    }, 200);

    window.addEventListener('hesba-admin-session-changed', checkSession);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('hesba-admin-session-changed', checkSession);
    };
  }, []);

  useEffect(() => {
    if (!loading && !isAllowed) {
      navigate('/admin');
    }
  }, [loading, isAllowed, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-[#0057B8]" />
        <span className="text-xs text-slate-400 font-bold select-none">جاري التحقق من صلاحيات المدير الفنية...</span>
      </div>
    );
  }

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
          </div>
          <button
            onClick={() => {
              navigate('/admin');
            }}
            className="w-full py-3 bg-[#0057B8] text-white hover:bg-[#004bb0] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            الانتقال لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
