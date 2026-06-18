import React from 'react';
import { useLocation } from '../../hooks/useLocation';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  children: React.ReactNode;
}

export function LegalLayout({ children }: LegalLayoutProps) {
  const { navigate } = useLocation();

  const handleBackToAuth = () => {
    // Go to login page
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-[#0057B8]/10 select-none text-right" dir="rtl">
      {/* Isolated Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0057B8] rounded-xl flex items-center justify-center shadow-md text-white font-sans font-black text-lg">
              ح
            </div>
            <div className="text-right">
              <h1 className="font-sans font-black text-sm tracking-tight text-[#111827] leading-none">حسبة</h1>
              <span className="text-[8px] text-gray-400 block mt-1 font-sans font-semibold">قبل البنك… اعرف فرصتك</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleBackToAuth}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-xs"
          >
            <span>العودة لتسجيل الدخول / إنشاء الحساب</span>
            <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Main legal content */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto select-text">
          {children}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-100 py-5 text-center text-[10px] text-gray-400 font-bold select-none">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} حسبة للحلول المالية والتقنية. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4 text-xs">
            <button onClick={() => navigate('/terms')} className="text-gray-400 hover:text-[#0057B8] transition-colors cursor-pointer">شروط الاستخدام</button>
            <span className="text-slate-200">•</span>
            <button onClick={() => navigate('/privacy')} className="text-gray-400 hover:text-[#0057B8] transition-colors cursor-pointer">سياسة الخصوصية</button>
            <span className="text-slate-200">•</span>
            <button onClick={() => navigate('/disclaimer')} className="text-gray-400 hover:text-[#0057B8] transition-colors cursor-pointer">إخلاء المسؤولية</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
