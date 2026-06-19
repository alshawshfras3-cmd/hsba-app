import React, { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { Calculator, ShieldAlert, Award, FileText, LogOut, Settings, X, ShieldCheck, User, BarChart3, HelpCircle, Sparkles, Sun, Moon } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme, setTheme } = useTheme();

  const handleNavChange = (target: 'calculator' | 'admin') => {
    if (target === 'calculator') {
      location.navigate('/');
    } else {
      location.navigate('/admin');
    }
  };

  const currentSub = userSubscriptions?.find(sub => sub.email === user?.email);
  const planName = currentSub?.plan === 'enterprise' ? 'مؤسسي متميز' : (currentSub?.plan === 'premium' ? 'حساب ذهبي متكامل' : 'اشتراك قياسي مجاني');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/85 dark:border-slate-800/80 transition-all duration-200 shadow-xs">
      {/* 1. DESKTOP HEADER (hidden on mobile) */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0057B8] rounded-xl flex items-center justify-center shadow-md text-white font-sans font-black text-lg select-none transform hover:scale-102 transition-transform">
            ح
          </div>
          <div className="text-right">
            <h1 className="font-sans font-black text-base tracking-tight text-[#111827] dark:text-white leading-none">حسبة</h1>
            <span className="text-[9px] text-gray-400 dark:text-slate-400 block mt-1 font-medium font-sans">قبل البنك… اعرف فرصتك</span>
          </div>
        </div>

        {/* Global Navigation */}
        <div className="flex items-center gap-1 bg-[#F1F5F9]/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <button
            id="nav-calc-btn"
            onClick={() => handleNavChange('calculator')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
              location.pathname !== '/admin' && location.pathname !== '/account' && location.pathname !== '/results' && location.pathname !== '/about' && location.pathname !== '/about-us'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white border border-[#0057B8]/10 shadow-[0_2px_8px_-1px_rgba(0,87,184,0.08)]'
                : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>حاسبة العميل</span>
          </button>

          <button
            id="nav-results-btn"
            onClick={() => location.navigate('/results')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
              location.pathname === '/results'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white border border-[#0057B8]/10 shadow-[0_2px_8px_-1px_rgba(0,87,184,0.08)]'
                : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>نتائجي</span>
          </button>

          <button
            id="nav-about-btn"
            onClick={() => location.navigate('/about')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
              location.pathname === '/about' || location.pathname === '/about-us'
                ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white border border-[#0057B8]/10 shadow-[0_2px_8px_-1px_rgba(0,87,184,0.08)]'
                : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>من نحن</span>
          </button>

          <button
            id="nav-assistant-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-customer-assistant'));
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0ea5a4]" />
            <span>مساعد حسبة</span>
          </button>
          
          {user && (
            <button
              id="nav-account-btn"
              onClick={() => location.navigate('/account')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
                location.pathname === '/account'
                  ? 'bg-white dark:bg-[#0F172A] text-[#0057B8] dark:text-white border border-[#0057B8]/10 shadow-[0_2px_8px_-1px_rgba(0,87,184,0.08)]'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ملفي الشخصي</span>
            </button>
          )}

        </div>

        {/* Brand Minimal Accent */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 dark:text-yellow-400" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-[#F1F5F9]/60 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-1 pr-3 pl-1 rounded-xl select-none font-sans">
              <div className="text-right">
                <span className="text-[10px] text-gray-600 dark:text-slate-200 font-bold block max-w-[140px] truncate leading-none font-mono" title={user.email}>
                  {user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                title="تسجيل الخروج"
                className="w-7 h-7 bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 hover:border-red-200 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/40">النسخة التجريبية v2.4</span>
          )}
        </div>
      </div>

      {/* 2. MOBILE HEADER (56px tall, specific layout: Logo left, Active Step center, Settings right) */}
      <div className="flex sm:hidden w-full h-14 bg-white dark:bg-[#0B0F19] relative items-center select-none font-semibold" dir="rtl">
        
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
 
        {/* Right (يمين): Assistant button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <button
            onClick={() => {
              if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(12);
              }
              window.dispatchEvent(new CustomEvent('open-customer-assistant'));
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#0ea5a4] hover:text-[#0057B8] transition-all cursor-pointer min-h-[36px] min-w-[36px]"
            title="مساعد حسبة"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-[#0ea5a4]" />
          </button>
        </div>
 
      </div>
    </header>
  );
}
