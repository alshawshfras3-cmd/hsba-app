import React, { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { Calculator, ShieldAlert, Award, FileText, LogOut, Settings, X, ShieldCheck, User } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';

export default function Header() {
  const { 
    activeNav, 
    setActiveNav, 
    hasUnsavedChanges, 
    user, 
    userRole, 
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
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      {/* 1. DESKTOP HEADER (hidden on mobile) */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#0057B8] rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-2xl select-none">
            ح
          </div>
          <div>
            <h1 className="font-sans font-bold text-2xl tracking-tight text-[#111827] leading-none">حسبة</h1>
            <span className="text-xs text-gray-400 block mt-1">التمويل الذكي للمواطن السعودي</span>
          </div>
        </div>

        {/* Global Navigation */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            id="nav-calc-btn"
            onClick={() => handleNavChange('calculator')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
              location.pathname !== '/admin'
                ? 'bg-white text-[#0057B8] shadow-sm'
                : 'text-gray-500 hover:text-[#111827]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>حاسبة العميل</span>
          </button>
          
          {(userRole === 'admin' || userRole === 'manager') && (
            <button
              id="nav-admin-btn"
              onClick={() => handleNavChange('admin')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold transition-all ${
                location.pathname === '/admin'
                  ? 'bg-white text-[#0057B8] shadow-sm'
                  : 'text-gray-500 hover:text-[#111827]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>لوحة التحكم للإدارة</span>
            </button>
          )}
        </div>

        {/* Brand Minimal Accent */}
        <div className="hidden md:flex items-center gap-1.5">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-1.5 pr-4 pl-1.5 rounded-full select-none">
              <div className="text-right">
                <span className="text-[10px] text-gray-700 font-bold block max-w-[140px] truncate leading-none font-mono" title={user.email}>
                  {user.email}
                </span>
                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 mt-1 rounded leading-none ${
                  userRole === 'admin' ? 'bg-red-50 text-red-700' :
                  userRole === 'manager' ? 'bg-indigo-50 text-indigo-700' :
                  'bg-slate-100 text-[#475569]'
                }`}>
                  {userRole === 'admin' ? 'مسؤول رئيسي' : userRole === 'manager' ? 'مدير منصة' : 'مستشار'}
                </span>
              </div>
              <button
                onClick={signOut}
                title="تسجيل الخروج"
                className="w-8 h-8 bg-white border border-gray-200 hover:border-red-200 hover:text-red-600 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">النسخة التجريبية v2.4</span>
          )}
        </div>
      </div>

      {/* 2. MOBILE HEADER (56px tall, specific layout: Logo left, Active Step center, Settings right) */}
      <div className="flex sm:hidden w-full h-14 bg-white relative items-center select-none" dir="rtl">
        
        {/* Left (يسار): Brand Logo */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className="w-8 h-8 bg-[#0057B8] rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
            ح
          </div>
          <span className="font-sans font-extrabold text-[#111827] text-sm">حسبة</span>
         </div>

        {/* Center: Active step label text */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="text-xs font-extrabold text-slate-800 font-sans tracking-tight">
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
                : 'bg-slate-50 border-slate-200 text-[#6B7280]'
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
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-5 animate-slide-up shadow-2xl border-t border-slate-100 pb-10">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0057B8]" />
                <h3 className="text-sm font-bold text-slate-900">إعدادات الحساب والنظام</h3>
              </div>
              <button 
                onClick={() => setIsMobileSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* User Email & Plan display */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>البريد الحالي:</span>
                  <span className="font-mono text-slate-800">{user?.email || 'حساب زائر'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>صلاحية الحساب:</span>
                  <span className="text-emerald-600">{userRole === 'admin' ? 'مسؤول رئيسي مالي' : (userRole === 'manager' ? 'مدير نظام حسبة' : 'مستشار مالي معتمد')}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>باقة الاشتراك مفعّلة:</span>
                  <span className="text-indigo-600 font-bold">{planName}</span>
                </div>
              </div>

              {/* Navigation toggles if Admin / Manager */}
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      setActiveNav('calculator');
                      setIsMobileSettingsOpen(false);
                    }}
                    className={`p-3.5 rounded-xl text-center border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      activeNav === 'calculator' 
                        ? 'bg-[#0057B8]/10 text-[#0057B8] border-[#0057B8]' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Calculator className="w-4 h-4" />
                    <span>شاشة حاسبات العملاء</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveNav('admin');
                      setIsMobileSettingsOpen(false);
                    }}
                    className={`p-3.5 rounded-xl text-center border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      activeNav === 'admin' 
                        ? 'bg-[#0057B8]/10 text-[#0057B8] border-[#0057B8]' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>لوحة تحكم الإشراف</span>
                  </button>
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={() => {
                  setIsMobileSettingsOpen(false);
                  signOut();
                }}
                className="w-full mt-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-all border border-rose-200/50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
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
