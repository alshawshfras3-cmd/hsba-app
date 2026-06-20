import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Info } from 'lucide-react';

interface CenteredValidationAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  autoCloseMs?: number;
}

export default function CenteredValidationAlert({
  isOpen,
  onClose,
  title = 'تنبيه التحقق من البيانات',
  message,
  type = 'error',
  autoCloseMs = 6000,
}: CenteredValidationAlertProps) {
  useEffect(() => {
    if (isOpen && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  const typeConfig = {
    error: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-100 dark:border-red-905/30',
      text: 'text-red-800 dark:text-red-350',
      iconColor: 'text-red-500 dark:text-red-400',
      icon: AlertCircle,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-900/30',
      text: 'text-amber-800 dark:text-amber-350',
      iconColor: 'text-amber-500 dark:text-amber-400',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-101 dark:border-blue-900/30',
      text: 'text-blue-800 dark:text-blue-350',
      iconColor: 'text-blue-500 dark:text-blue-400',
      icon: Info,
    },
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="centered-validation-alert-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
          dir="rtl"
        >
          <motion.div
            id="centered-validation-alert-card"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center text-center"
          >
            {/* Close Button */}
            <button
              id="centered-validation-alert-close"
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center border border-slate-100 dark:border-slate-800 mb-4 ${config.iconColor}`}>
              <Icon className="w-6 h-6 animate-bounce" />
            </div>

            {/* Title */}
            <h3 className="font-extrabold text-slate-950 dark:text-white text-base mb-2 font-sans">
              {title}
            </h3>

            {/* Message */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium font-sans leading-relaxed">
              {message}
            </p>

            {/* Action button */}
            <button
              id="centered-validation-alert-confirm"
              type="button"
              onClick={onClose}
              className="mt-6 w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs active:scale-98"
            >
              حسناً، فهمت
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
