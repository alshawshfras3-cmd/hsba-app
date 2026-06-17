import React, { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { Calculator, ShieldAlert, Award, FileText, LogOut, Settings, X, ShieldCheck, User, BarChart3, HelpCircle } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';

export default function Header() {
  const { 
    activeNav, 
    setActiveNav, 
    hasUnsavedChanges, 
    user, 
    signOut,
    activeStepLabel,
    userSubscriptions
  } = useAppState();

  const location = useLocation();
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  const handleNavChange = (target: 'calculator' | 'admin') => {
    if (target === 'calculator') {
      location.navigate('/');
    } else {
      location.navigate('/admin');
    }
  };

  const handleToggleSettingsMobile = () => {
    // Vibrate haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
    
    // Toggle mobile settings modal
    setIsMobileSettingsOpen(!isMobileSettingsOpen);
  };

  const currentSub = userSubscriptions?.find(sub => sub.email === user?.email);
  const planName = currentSub?.plan === 'enterprise' ? 'مؤسسي متميز' : (currentSub?.plan === 'premium' ? 'حساب ذهبي متكامل' : 'اشتراك قياسي مجاني');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/85 dark:border-slate-800/80 transition-all duration-200 shadow-xs">
      {/* 1. DESKTOP HEADER (hidden on mobile) */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-tr from-[#0057B8] to-[#0074F0] rounded-xl flex items-center justify-center shadow-md text-white font-sans font-black text-xl select-none transform hover:scale-102 transition-transform">
            ح
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-xl tracking-tight text-[#111827] dark:text-white leading-none">حسبة</h1>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 block mt-1.5 font-medium">التمويل الذكي للمواطن السعودي</span>
          </div>
        </div>

        {/* Global Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/50">
          <button
            id="nav-calc-btn"
            onClick={() => handleNavChange('calculator')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
              location.pathname !== '/admin' && location.pathname !== '/account' && location.pathname !== '/results' && location.pathname !== '/about' && location.pathname !== '/about-us'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>حاسبة العميل</span>
          </button>

          <button
            id="nav-results-btn"
            onClick={() => location.navigate('/results')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
              location.pathname === '/results'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>نتائجي</span>
          </button>

          <button
            id="nav-about-btn"
            onClick={() => location.navigate('/about')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
              location.pathname === '/about' || location.pathname === '/about-us'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>من نحن</span>
          </button>
          
          {user && (
            <button
              id="nav-account-btn"
              onClick={() => location.navigate('/account')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
                location.pathname === '/account'
                  ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>ملفي الشخصي</span>
            </button>
          )}

        </div>

        {/* Brand Minimal Accent */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-1.5 pr-4 pl-1.5 rounded-full select-none font-sans shadow-xs">
              <div className="text-right">
                <span className="text-[10px] text-gray-600 dark:text-slate-200 font-bold block max-w-[140px] truncate leading-none font-mono" title={user.email}>
                  {user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                title="تسجيل الخروج"
                className="w-8 h-8 bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 hover:border-red-200 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/40">النسخة التجريبية v2.4</span>
          )}
        </div>
      </div>

      {/* 2. MOBILE HEADER (56px tall, specific layout: Logo left, Active Step center, Settings right) */}
      <div className="flex sm:hidden w-full h-14 bg-white dark:bg-[#0B0F19] relative items-center select-none" dir="rtl font-semibold">
        
        {/* Left (يسار): Brand Logo */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className="w-8 h-8 bg-[#0057B8] rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
            ح
          </div>
          <span className="font-sans font-extrabold text-[#111827] dark:text-white text-sm">حسبة</span>
         </div>
 
        {/* Center: Active step label text */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            {location.pathname === '/about' ? 'من نحن' : 
             location.pathname === '/account' ? 'حسابي' :
             location.pathname === '/results' ? 'نتائجي' :
             location.pathname === '/admin' ? 'الإعدادات والمدخلات' : (activeStepLabel || 'الحاسبة الذكية')}
          </span>
         </div>
 
        {/* Right (يمين): Settings button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <button
            onClick={handleToggleSettingsMobile}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer min-h-[36px] min-w-[36px] ${
              isMobileSettingsOpen 
                ? 'bg-[#0057B8] text-white border-[#0057B8]' 
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#6B7280] dark:text-slate-300'
            }`}
            title="الإعدادات السريعة"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
 
      </div>
 
      {/* Mobile Settings dropdown / dialog popup */}
      {isMobileSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:hidden text-right" dir="rtl">
          <div className="w-full bg-white dark:bg-[#0F172A] rounded-t-3xl p-6 space-y-5 animate-slide-up shadow-2xl border-t border-slate-100 dark:border-slate-800 pb-10">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0057B8]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">إعدادات الحساب والنظام</h3>
              </div>
              <button 
                onClick={() => setIsMobileSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
 
            <div className="space-y-3 pt-1">
              {/* User Email & Plan display */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>البريد الحالي:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email || 'حساب زائر'}</span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  setIsMobileSettingsOpen(false);
                  signOut();
                }}
                className="w-full mt-4 py-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-200/50 dark:border-rose-900/30 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج الآمن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
