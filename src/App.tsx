import React from 'react';
import { AppStateProvider, useAppState } from './context/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { ResultsPage } from './pages/ResultsPage';
import { useLocation } from './hooks/useLocation';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import StepWizard from './components/calculator/StepWizard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAuth from './components/admin/AdminAuth';
import { Calculator, ShieldCheck, Mail, Phone, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase, hasSupabaseKeys, cleanStaleSupabaseSession } from './lib/supabase';

function AdminViewGuard() {
  const { signOut } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function verifyAndLoadAdmin() {
      if (!hasSupabaseKeys) {
        setRole('owner');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Get the current user from auth.users (strictly bypassing any cached sessions)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error(authError?.message || "لم يتم العثور على مستخدم نشط.");
        }
        
        if (active) {
          setCurrentUser(user);
        }

        const lowercaseEmail = (user.email || '').toLowerCase().trim();
        const isOwnerEmail = lowercaseEmail === 'alshawshfras@gmail.com' || lowercaseEmail === 'alshawshfras3@gmail.com';

        // 2. Fetch the user_profiles row
        let { data: profile, error: dbError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // If no row exists or there was an error, try to create or update profile
        if (!profile) {
          console.log("No profile row found, attempting to create user profile row...");
          const fullName = user.user_metadata?.full_name || user.user_metadata?.username || 'مستشار عقاري';
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              role: isOwnerEmail ? 'owner' : 'user',
              subscription: 'free'
            });

          if (upsertError) {
            console.error("Failed to upsert profile, checking email fallback:", upsertError);
            if (isOwnerEmail) {
              if (active) {
                setRole('owner');
                setLoading(false);
              }
              return;
            } else {
              throw new Error("فشل إنشاء ملف معرّف الصلاحيات وتوثيق رتبتك العقارية.");
            }
          }

          // Re-fetch role
          const { data: reProfile, error: reError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (reError && !isOwnerEmail) {
            throw new Error(reError.message || "فشل جلب ملف معرّف الصلاحيات بعد الإنشاء.");
          }
          profile = reProfile;
        }

        let userRole = profile?.role || (isOwnerEmail ? 'owner' : 'user');

        // Normalize roles
        if (userRole === 'admin') userRole = 'owner';
        if (userRole === 'staff') userRole = 'employee';
        if (userRole === 'customer') userRole = 'user';

        if (isOwnerEmail && userRole !== 'owner') {
          userRole = 'owner';
          // Update database profile if role in DB is not owner yet
          try {
            await supabase
              .from('user_profiles')
              .update({ role: 'owner' })
              .eq('id', user.id);
          } catch (e) {
            console.warn("Could not auto-update profile role in database to owner:", e);
          }
        }

        // 8. Add Diagnostic logs
        console.log("=== تشخيصات لوحة الإدارة ===");
        console.log("currentUser.id:", user.id);
        console.log("currentUser.email:", user.email);
        console.log("profile.role:", userRole);
        console.log("============================");

        if (active) {
          setRole(userRole);
        }
      } catch (err: any) {
        console.error("Error verifying admin role:", err);
        const errMsg = String(err?.message || '').toLowerCase();
        const isAuthTokenErr = errMsg.includes('refresh token') || errMsg.includes('refresh_token') || errMsg.includes('not found') || errMsg.includes('invalid');
        
        if (isAuthTokenErr) {
          cleanStaleSupabaseSession();
        }

        // If it is owner email, we bypass the error and set owner as role!
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const lowercaseEmail = (user?.email || '').toLowerCase().trim();
          const isOwnerEmail = lowercaseEmail === 'alshawshfras@gmail.com' || lowercaseEmail === 'alshawshfras3@gmail.com';
          if (isOwnerEmail) {
            if (active) {
              setRole('owner');
            }
            return;
          }
        } catch (_) {}

        if (active) {
          setErrorMsg(err.message || "حدث خطأ أثناء الاتصال بقاعدة البيانات لتوثيق الصلاحيات.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    verifyAndLoadAdmin();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
        <p className="text-xs text-gray-500 font-bold">جاري الاستعلام المباشر عن الرتبة والصلاحيات العقارية...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-12 px-4" dir="rtl">
        <div className="bg-white border border-red-100 rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-sm">فشل التحقق الأمني</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{errorMsg}</p>
          <button
            onClick={signOut}
            className="w-full py-2.5 bg-[#0057B8] text-white text-xs font-semibold rounded-xl"
          >
            تسجيل الخروج والمحاولة مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  const isAllowed = role === 'owner' || role === 'manager' || role === 'employee';

  if (!isAllowed) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-8 text-center space-y-6" dir="rtl">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-gray-900">عذراً، الوصول غير مصرح به</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed font-sans">
              حسابك الحالي (<span className="font-mono text-gray-700 font-semibold">{currentUser?.email}</span>) لا يملك صلاحية (مالك أو مدير أو موظف). رتبتك الحالية الموثقة في قاعدة البيانات هي: (<span className="font-bold text-red-600 font-mono">{role || 'غير معرّف'}</span>). يرجى التواصل مع المدير العام المالي لتعديل رتبتك.
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full py-3 bg-[#0057B8] hover:bg-[#004bb0] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            تسجيل الخروج والدخول بحساب مسؤول
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function MarketingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-semibold text-right" dir="rtl">
        
        {/* Logo & Legal Disclaimer */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0057B8] rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-md">
              ح
            </div>
            <span className="text-white font-bold text-lg">حسبة الذكية</span>
          </div>
          <p className="font-sans leading-relaxed text-slate-400">
            منصة تقنية مالية (Fintech) مرنة لحساب التمويل العقاري والشخصي بما يطابق تعليمات البنك المركزي السعودي (SAMA) ومصلحة معاشات التقاعد ومؤسسة تبادل المنافع.
          </p>
        </div>

        {/* Quick links info */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm">سرعة التنقل والتحكم لمدير الحسبة:</h4>
          <p className="font-sans leading-relaxed">
            يمكنك الدخول إلى لوحة تحكم الإشراف وتغيير هوامش البنوك أو تعديل معايير الحد الأدنى للرواتب والمقاييس عبر النوافذ في القائمة الجانبية بنقرة واحدة لتجربة الملاءمة والمقارنة الفورية في حاسبة العميل.
          </p>
        </div>

        {/* Contact Details */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm">قنوات الارتباط والاستعلام:</h4>
          <div className="space-y-1.5 flex flex-col">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#0EA5A4]" />
              <span className="font-mono text-slate-300">support@hesba.sa</span>
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#0EA5A4]" />
              <span className="font-mono text-slate-300 select-all" dir="ltr">+966 50 661 2761</span>
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0EA5A4]" />
              <span className="text-emerald-500">متوافق مع الشريعة الإسلامية بالكامل</span>
            </span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-[10px] text-slate-500">
        <p>© {new Date().getFullYear()} حسبة للحلول المالية والتقنية. جميع الحقوق محفوظة لوزارة التجارة وهيئة منشآت والمؤسسات المانحة.</p>
      </div>
    </footer>
  );
}

function DashboardOrWizard() {
  const { user } = useAuth();
  const location = useLocation();

  const footerAllowedPaths = [
    "/login",
    "/about",
    "/signin",
    "/auth",
    "/about-us"
  ];

  const showMarketingFooter = footerAllowedPaths.includes(location.pathname);

  const renderContent = () => {
    switch (location.pathname) {
      case '/':
      case '/calculator':
        return <StepWizard />;
      case '/results':
        return <ResultsPage />;
      case '/account':
        return <AccountPage />;
      case '/about':
      case '/about-us':
        return <AboutPage />;
      case '/admin':
        if (!user) {
          return <AdminAuth />;
        }
        return <AdminViewGuard />;
      default:
        return <StepWizard />;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between font-sans">
      {/* Content Area */}
      <main className="flex-grow">
        {renderContent()}
      </main>

      {/* Modern Professional Footer */}
      {showMarketingFooter && <MarketingFooter />}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center space-y-4 transition-colors duration-200" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-[#0057B8] dark:text-[#0EA5A4]" />
        <span className="text-xs text-gray-400 dark:text-slate-400 font-bold select-none">جاري الاستعلام عن صلاحيات حسبة...</span>
      </div>
    );
  }

  // Support guest routing to /about or /about-us so unregistered users can view it
  if (!user) {
    if (location.pathname === '/about' || location.pathname === '/about-us') {
      return (
        <div className="min-h-screen flex flex-col justify-between pb-16 sm:pb-0 relative bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
          <Header />
          <main className="flex-grow">
            <AboutPage />
          </main>
          <MarketingFooter />
          <BottomNavigation />
        </div>
      );
    }
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between pb-16 sm:pb-0 relative bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
      <Header />
      <DashboardOrWizard />
      <BottomNavigation />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppStateProvider>
          <AppContent />
        </AppStateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
