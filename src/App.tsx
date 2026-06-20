import React from 'react';
import { AppStateProvider, useAppState } from './context/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { useLocation } from './hooks/useLocation';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import StepWizard from './components/calculator/StepWizard';
import { AdminDashboardGuard } from './components/admin/AdminDashboardGuard';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { SubscriptionGate } from './components/subscription/SubscriptionGate';
import { Calculator, ShieldCheck, Mail, Phone, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase, hasSupabaseKeys, cleanStaleSupabaseSession } from './lib/supabase';
import AssistantWidget from './components/layout/AssistantWidget';
import { LegalLayout } from './components/layout/LegalLayout';
import PwaInstallPrompt from './components/pwa/PwaInstallPrompt';

// Lazy loading heavy pages to reduce initial bundle size
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const AccountPage = React.lazy(() => import('./pages/AccountPage').then(module => ({ default: module.AccountPage })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then(module => ({ default: module.ResultsPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const DisclaimerPage = React.lazy(() => import('./pages/DisclaimerPage').then(module => ({ default: module.DisclaimerPage })));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage').then(module => ({ default: module.AdminLoginPage })));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage').then(module => ({ default: module.SubscriptionPage })));

function MarketingFooter() {
  const { navigate } = useLocation();

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
            حسبة أداة تقنية تقديرية لمقارنة نتائج التمويل بناءً على البيانات المدخلة والقواعد المتاحة مقارنة ببرامج التمويل السكني المختلفة.
          </p>
        </div>

        {/* Quick links info */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm">روابط الوصول السريع:</h4>
          <div className="flex flex-col items-start gap-2 pt-1 font-semibold">
            <button onClick={() => navigate('/terms')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs">شروط الاستخدام</button>
            <button onClick={() => navigate('/privacy')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs">سياسة الخصوصية</button>
            <button onClick={() => navigate('/disclaimer')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs">إخلاء المسؤولية</button>
            <button onClick={() => {
              window.dispatchEvent(new CustomEvent('open-customer-assistant'));
            }} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs">تواصل معنا</button>
          </div>
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
              <span className="text-emerald-500">مقارنات شاملة للبرامج التمويلية</span>
            </span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-[10px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4" dir="rtl">
        <p>© {new Date().getFullYear()} حسبة للحلول المالية والتقنية. لا تمثل المنصة بنكًا أو جهة تمويلية أو وسيطًا ائتمانيًا مرخصًا، ولا تُعد النتائج موافقة نهائية أو عرضًا تمويليًا ملزمًا.</p>
        <div className="flex flex-wrap justify-center gap-4 font-bold text-slate-400">
          <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors cursor-pointer text-xs">شروط الاستخدام</button>
          <span>•</span>
          <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors cursor-pointer text-xs">سياسة الخصوصية</button>
          <span>•</span>
          <button onClick={() => navigate('/disclaimer')} className="hover:text-white transition-colors cursor-pointer text-xs">إخلاء المسؤولية</button>
        </div>
      </div>
    </footer>
  );
}

function DashboardOrWizard() {
  const location = useLocation();

  const footerAllowedPaths = [
    "/login",
    "/about",
    "/signin",
    "/auth",
    "/about-us",
    "/terms",
    "/privacy",
    "/disclaimer"
  ];

  const showMarketingFooter = footerAllowedPaths.includes(location.pathname);

  const renderContent = () => {
    switch (location.pathname) {
      case '/':
      case '/calculator':
        return (
          <SubscriptionGate>
            <StepWizard />
          </SubscriptionGate>
        );
      case '/results':
        return (
          <SubscriptionGate>
            <ResultsPage />
          </SubscriptionGate>
        );
      case '/account':
        return <AccountPage />;
      case '/subscription':
        return <SubscriptionPage />;
      case '/about':
      case '/about-us':
        return <AboutPage />;
      case '/terms':
        return <TermsPage />;
      case '/privacy':
        return <PrivacyPage />;
      case '/disclaimer':
        return <DisclaimerPage />;
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

  const hasDraft = React.useMemo(() => {
    try {
      const draft = sessionStorage.getItem('hesba_calculator_draft');
      return !!draft;
    } catch {
      return false;
    }
  }, []);

  const hasChecked = React.useMemo(() => {
    try {
      return sessionStorage.getItem('hesba_permissions_checked') === 'true' ||
             sessionStorage.getItem('hesba_calculator_permissions') === 'true';
    } catch {
      return false;
    }
  }, [loading]);

  if (loading && !hasDraft && !hasChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center space-y-4 transition-colors duration-200" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-[#0057B8] dark:text-[#0EA5A4]" />
        <span className="text-xs text-gray-400 dark:text-slate-400 font-bold select-none">جاري الاستعلام عن صلاحيات حسبة...</span>
      </div>
    );
  }

  // Google OAuth Auth Callback Pathway (unprotected, public)
  if (location.pathname === '/auth/callback' || location.pathname === '/auth/callback/') {
    return <AuthCallbackPage />;
  }

  // Admin Login Section Pathway
  if (location.pathname === '/admin' || location.pathname === '/admin/login') {
    return <AdminLoginPage />;
  }

  // Admin Dashboard main protected path
  if (location.pathname === '/admin/dashboard') {
    return (
      <AdminDashboardGuard>
        <AdminDashboard />
      </AdminDashboardGuard>
    );
  }

  // Reset Password Pathway
  if (location.pathname === '/reset-password' || location.pathname === '/reset-password/') {
    return <ResetPasswordPage />;
  }

  // Support guest routing to public pages so unregistered users can view them
  if (!user) {
    const legalPaths = ['/terms', '/privacy', '/disclaimer'];
    if (legalPaths.includes(location.pathname)) {
      const renderLegalContent = () => {
        switch (location.pathname) {
          case '/terms':
            return <TermsPage />;
          case '/privacy':
            return <PrivacyPage />;
          case '/disclaimer':
            return <DisclaimerPage />;
          default:
            return <TermsPage />;
        }
      };

      return (
        <LegalLayout>
          {renderLegalContent()}
        </LegalLayout>
      );
    }

    const publicPaths = ['/about', '/about-us'];
    if (publicPaths.includes(location.pathname)) {
      const renderGuestContent = () => {
        switch (location.pathname) {
          case '/about':
          case '/about-us':
            return <AboutPage />;
          default:
            return <AboutPage />;
        }
      };

      return (
        <div className="min-h-screen flex flex-col justify-between pb-16 sm:pb-0 relative bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
          <Header />
          <main className="flex-grow">
            {renderGuestContent()}
          </main>
          <MarketingFooter />
          <BottomNavigation />
          <AssistantWidget mode="customer" />
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
      <AssistantWidget mode="customer" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppStateProvider>
          <React.Suspense
            fallback={
              <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center space-y-4" dir="rtl">
                <Loader2 className="w-10 h-10 animate-spin text-[#0057B8] dark:text-[#0EA5A4]" />
                <span className="text-xs text-gray-400 dark:text-slate-400 font-bold select-none">جاري تحميل الصفحة...</span>
              </div>
            }
          >
            <AppContent />
            <PwaInstallPrompt />
          </React.Suspense>
        </AppStateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
