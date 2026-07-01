import React, { useState, useEffect, useMemo } from 'react';
import { getBankLogoCandidates } from '../../lib/bankLogos';

interface BankLogoProps {
  bankId?: string;
  bankName?: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function BankLogo({
  bankId,
  bankName = '',
  logoUrl,
  size = "md",
  className = ''
}: BankLogoProps) {
  const candidates = useMemo(() => {
    return getBankLogoCandidates(bankId, bankName, logoUrl);
  }, [bankId, bankName, logoUrl]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  // Reset indices if candidates change
  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
  }, [candidates]);

  const sizeClasses = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-11 w-11 text-xs sm:text-sm",
    lg: "h-14 w-14 text-base"
  };

  const nameToUse = bankName || bankId || 'ب';
  // Extract a clean starting letter or abbreviation
  const fallbackChar = nameToUse
    .replace('البنك', '')
    .replace('مصرف', '')
    .replace('شركة', '')
    .trim()
    .charAt(0) || 'ب';

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setFailed(true);
    }
  };

  const hasLogo = candidates.length > 0 && !failed;

  if (!hasLogo) {
    return (
      <div 
        className={`flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b] text-[#0057B8] dark:text-[#60A5FA] font-black shrink-0 shadow-sm ${sizeClasses[size]} ${className}`}
        title={bankName}
      >
        {fallbackChar}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white p-1 shadow-sm shrink-0 ${sizeClasses[size]} ${className}`}>
      <img 
        src={candidates[candidateIndex]} 
        alt={bankName} 
        referrerPolicy="no-referrer"
        onError={handleError}
        className="max-h-[85%] max-w-[85%] object-contain select-none" 
      />
    </div>
  );
}
