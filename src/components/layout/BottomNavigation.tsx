import React from 'react';
import { useAppState } from '../../context/AppContext';
import { Home, BarChart3, User, HelpCircle } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';

export default function BottomNavigation() {
  const { results } = useAppState();
  const location = useLocation();

  const handleVibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  };

  const handleNavigate = (path: string) => {
    handleVibrate();
    location.navigate(path);
  };

  // Determine active states matching exact route paths
  const isHomeActive = location.pathname === '/';
  const isResultsActive = location.pathname === '/results';
  const isAccountActive = location.pathname === '/account';
  const isAboutActive = location.pathname === '/about';

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200/90 sm:hidden block shadow-[0_-4px_16px_rgba(0,0,0,0.06)] h-16 select-none"
      dir="rtl"
    >
      <div className="flex h-full items-center justify-around px-2 pb-safe-padding">
        
        {/* Tab 1: 🏠 الرئيسية */}
        <button
          onClick={() => handleNavigate('/')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all gap-1 cursor-pointer hover:opacity-80 active:scale-95 ${
            isHomeActive ? 'text-[#0057B8]' : 'text-[#6B7280]'
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold font-sans">الرئيسية</span>
        </button>

        {/* Tab 2: 📊 نتائجي */}
        <button
          onClick={() => handleNavigate('/results')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all gap-1 cursor-pointer hover:opacity-80 active:scale-95 relative ${
            isResultsActive ? 'text-[#0057B8]' : 'text-[#6B7280]'
          }`}
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold font-sans">نتائجي</span>
          {results && results.length > 0 && !isResultsActive && (
            <span className="absolute top-1.5 right-4 w-2 h-2 bg-[#0ea5a4] rounded-full animate-pulse" />
          )}
        </button>

        {/* Tab 3: 👤 حسابي */}
        <button
          onClick={() => handleNavigate('/account')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all gap-1 cursor-pointer hover:opacity-80 active:scale-95 ${
            isAccountActive ? 'text-[#0057B8]' : 'text-[#6B7280]'
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold font-sans">حسابي</span>
        </button>

        {/* Tab 4: ❓ من نحن */}
        <button
          onClick={() => handleNavigate('/about')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all gap-1 cursor-pointer hover:opacity-80 active:scale-95 ${
            isAboutActive ? 'text-[#0057B8]' : 'text-[#6B7280]'
          }`}
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold font-sans">من نحن</span>
        </button>

      </div>
    </div>
  );
}
