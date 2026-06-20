import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share, CheckCircle } from 'lucide-react';
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt';

export default function PwaInstallPrompt() {
  const {
    canInstall,
    isInstalled,
    isIosSafari,
    promptInstall,
    dismissInstallPrompt,
    shouldShowPrompt,
  } = usePwaInstallPrompt();

  const [visible, setVisible] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Add a slight delay before showing the prompt so it feels premium and less aggressive
  useEffect(() => {
    if (shouldShowPrompt) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000); // 2 seconds delay
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [shouldShowPrompt]);

  if (!visible) return null;

  const handleInstallClick = async () => {
    if (isIosSafari) {
      // For iOS Safari, they just click "فهمت" which dismisses/closes the prompt
      dismissInstallPrompt();
      setVisible(false);
    } else {
      const success = await promptInstall();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      }
    }
  };

  const handleDismissClick = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <div id="pwa-install-prompt-root" className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[99999] max-w-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
            className="w-full bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] rounded-2xl p-5 sm:p-6"
          >
            {/* Close icon */}
            <button
              id="pwa-close-btn"
              onClick={handleDismissClick}
              className="absolute top-3 left-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-cursor"
              aria-label="إغلاق التثبيت"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 items-start pt-2">
              {/* Branded "ح" Icon */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[#0057B8] flex items-center justify-center shadow-lg shadow-blue-500/15">
                <span className="text-white text-2xl font-extrabold font-sans select-none pb-0.5">ح</span>
              </div>

              {/* Text content */}
              <div className="flex-1">
                {justInstalled ? (
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-sans">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      تم التثبيت بنجاح!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-sans">
                      شكراً لك، متاح الآن على شاشتك الرئيسية للوصول الفوري.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 dark:text-white font-sans">
                      {isIosSafari ? 'ثبّت حسبة على الشاشة الرئيسية' : 'ثبّت حسبة كتطبيق'}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-sans">
                      {isIosSafari 
                        ? 'اضغط زر المشاركة في المتصفح ثم اختر "إضافة إلى الشاشة الرئيسية".' 
                        : 'ثبّت حسبة على جهازك للوصول السريع للحاسبة ونتائجك من الشاشة الرئيسية.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {!justInstalled && (
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  id="pwa-dismiss-btn"
                  onClick={handleDismissClick}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
                >
                  لاحقًا
                </button>
                
                {isIosSafari ? (
                  <button
                    id="pwa-action-ios"
                    onClick={handleInstallClick}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Share className="w-3.5 h-3.5" />
                    فهمت
                  </button>
                ) : (
                  <button
                    id="pwa-action-install"
                    onClick={handleInstallClick}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0057B8] hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تثبيت الآن
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
