import React, { useState, useEffect } from 'react';
import { normalizeNumberInput } from '../../lib/number-input';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | '';
  onChange: (val: number | '') => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
}

export default function NumericInput({
  value,
  onChange,
  allowDecimals = true,
  min,
  max,
  className,
  placeholder,
  id,
  ...props
}: NumericInputProps) {
  // We keep a local string state to allow natural typing (including trailing dots, e.g. "12.")
  const [localVal, setLocalVal] = useState<string>('');

  // Sync with parent value if it changes externally
  useEffect(() => {
    if (value === '') {
      if (localVal !== '') setLocalVal('');
    } else {
      const parsedLocal = parseFloat(localVal.replace(/,/g, ''));
      // If the parent number is different from parsed local representation, sync them
      if (isNaN(parsedLocal) || parsedLocal !== value) {
        setLocalVal(value.toString());
      }
    }
  }, [value]);

  const convertArabicToEnglish = (input: string): string => {
    if (!input) return '';
    let result = input;

    // Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      result = result.replace(arabicIndic[i], i.toString());
    }

    // Convert Persian numerals (۰۱۲۳۴۵۶۷۸۹)
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    for (let i = 0; i < 10; i++) {
      result = result.replace(persian[i], i.toString());
    }

    // Convert Arabic comma (،) to decimal dot (.)
    result = result.replace(/،/g, '.');

    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const translated = convertArabicToEnglish(raw);

    // Apply normalizeNumberInput to handle digits/dot/comma safely
    let sanitized = normalizeNumberInput(translated);

    if (!allowDecimals) {
      sanitized = sanitized.replace(/\./g, '');
    }

    setLocalVal(sanitized);

    if (sanitized === '' || sanitized === '.') {
      onChange('');
    } else {
      let parsed = allowDecimals ? parseFloat(sanitized) : parseInt(sanitized, 10);
      if (!isNaN(parsed)) {
        if (min !== undefined && parsed < min) {
          // Keep local state
        }
        if (max !== undefined && parsed > max) {
          parsed = max;
          setLocalVal(max.toString());
        }
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    // On loss of focus, enforce min limit if specified
    if (localVal === '' || localVal === '.') {
      if (min !== undefined) {
        setLocalVal(min.toString());
        onChange(min);
      } else {
        setLocalVal('');
        onChange('');
      }
      return;
    }

    let parsed = allowDecimals ? parseFloat(localVal.replace(/,/g, '')) : parseInt(localVal.replace(/,/g, ''), 10);
    if (!isNaN(parsed)) {
      if (min !== undefined && parsed < min) {
        parsed = min;
      }
      if (max !== undefined && parsed > max) {
        parsed = max;
      }
      setLocalVal(parsed.toString());
      onChange(parsed);
    }
  };

  return (
    <input
      {...props}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      id={id}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
