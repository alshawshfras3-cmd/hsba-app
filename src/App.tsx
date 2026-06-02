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
  const { user, userRole, authLoading, signOut } = useAppState();
  const location = useLocation();

  const renderAdminView = () => {
    if (authLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#0057B8]" />
          <p className="text-xs text-gray-500 font-bold">جاري التحقق من الهوية والصلاحيات...</p>
        </div>
      );
    }

    if (!user) {
      return <AdminAuth />;
    }

    if (userRole !== 'admin' && userRole !== 'manager') {
      return (
        <div className="max-w-md mx-auto my-12 px-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-8 text-center space-y-6" dir="rtl">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-gray-900">عذراً، الوصول غير مصرح به</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                حسابك الحالي (<span className="font-mono text-gray-700 font-semibold">{user.email}</span>) لا يملك صلاحية (مسؤول أو مدير). يرجى التواصل مع المسؤول المالي للمنصة لتعديل صلاحياتك.
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
  };

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
        return renderAdminView();
      default:
        return <StepWizard />;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
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
