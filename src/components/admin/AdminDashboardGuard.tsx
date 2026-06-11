import React, { useEffect, useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GuardProps {
  children: React.ReactNode;
}

export function AdminDashboardGuard({ children }: GuardProps) {
  const { navigate } = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          if (active) {
            setIsAllowed(false);
            setLoading(false);
          }
          return;
        }

        // Verify user exists in the admins table
        const { data: adminRow, error: adminErr } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (active) {
          if (adminErr || !adminRow) {
            setIsAllowed(false);
          } else {
            setIsAllowed(true);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Verify admin session failed:', err);
        if (active) {
          setIsAllowed(false);
          setLoading(false);
        }
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        checkSession();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
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
