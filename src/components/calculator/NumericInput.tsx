import React, { useState, useEffect } from 'react';

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
  const [localVal, setLocalVal] = useState<string>('');

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      if (localVal !== '') setLocalVal('');
    } else {
      const parsedLocal = parseFloat(localVal.replace(/,/g, ''));
      if (isNaN(parsedLocal) || parsedLocal !== value) {
        setLocalVal(value.toString());
      }
    }
  }, [value]);

  const convertToEnglish = (input: string): string => {
    if (!input) return '';
    let result = input;

    // Arabic-Indic numerals ٠١٢٣٤٥٦٧٨٩
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      result = result.replace(arabicIndic[i], i.toString());
    }

    // Persian numerals ۰۱۲۳۴۵۶۷۸۹
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      result = result.replace(persian[i], i.toString());
    }

    // Arabic comma → dot
    result = result.replace(/،/g, '.');
    // Arabic decimal separator
    result = result.replace(/٫/g, '.');

    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const translated = convertToEnglish(raw);

    // Keep only digits, dots, and minus
    let sanitized = translated
      .replace(/[^\d.\-]/g, '')
      .replace(/(\..*)\./g, '$1'); // Only one dot allowed

    if (!allowDecimals) {
      sanitized = sanitized.replace(/\./g, '');
    }

    // Remove minus if not at start
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
    }

    setLocalVal(sanitized);

    if (sanitized === '' || sanitized === '.' || sanitized === '-') {
      onChange('');
    } else {
      let parsed = allowDecimals ? parseFloat(sanitized) : parseInt(sanitized, 10);
      if (!isNaN(parsed)) {
        if (max !== undefined && parsed > max) {
          parsed = max;
          setLocalVal(max.toString());
        }
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (localVal === '' || localVal === '.' || localVal === '-') {
      if (min !== undefined) {
        setLocalVal(min.toString());
        onChange(min);
      } else {
        setLocalVal('');
        onChange('');
      }
      return;
    }

    let parsed = allowDecimals
      ? parseFloat(localVal.replace(/,/g, ''))
      : parseInt(localVal.replace(/,/g, ''), 10);

    if (!isNaN(parsed)) {
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      setLocalVal(parsed.toString());
      onChange(parsed);
    }
  };

  return (
    <input
      {...props}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      dir="ltr"
      style={{ textAlign: 'right', ...(props.style || {}) }}
      id={id}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder || (allowDecimals ? '0.00' : '0')}
      className={className}
      autoComplete="off"
    />
  );
}
