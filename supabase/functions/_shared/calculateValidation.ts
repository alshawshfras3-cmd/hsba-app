export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
  normalizedData?: any;
}

export function validateCalculatePayload(body: any): ValidationResult {
  const errors: ValidationErrorDetail[] = [];

  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request payload must be a valid JSON object.' }]
    };
  }

  const { requestId, customer, finance } = body;

  // Validate optional requestId
  if (requestId !== undefined && typeof requestId !== 'string') {
    errors.push({ field: 'requestId', message: 'requestId must be a string.' });
  } else if (typeof requestId === 'string' && requestId.length > 100) {
    errors.push({ field: 'requestId', message: 'requestId length must not exceed 100 characters.' });
  }

  // Validate customer section
  if (!customer || typeof customer !== 'object') {
    errors.push({ field: 'customer', message: 'customer section is required and must be an object.' });
  } else {
    // birthDate
    if (!customer.birthDate) {
      errors.push({ field: 'customer.birthDate', message: 'birthDate is required.' });
    } else if (typeof customer.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(customer.birthDate)) {
      errors.push({ field: 'customer.birthDate', message: 'birthDate must be a string in YYYY-MM-DD format.' });
    }

    // employmentSector
    const allowedSectors = [
      'government_civilian',
      'semi_gov',
      'companies',
      'military',
      'private',
      'retired',
      // Old aliases to recognize and map
      'gov_civil',
      'company'
    ];
    if (!customer.employmentSector) {
      errors.push({ field: 'customer.employmentSector', message: 'employmentSector is required.' });
    } else if (typeof customer.employmentSector !== 'string' || !allowedSectors.includes(customer.employmentSector)) {
      errors.push({ 
        field: 'customer.employmentSector', 
        message: 'employmentSector must be one of: government_civilian, semi_gov, companies, military, private, retired.' 
      });
    }

    // salary
    if (customer.salary === undefined) {
      errors.push({ field: 'customer.salary', message: 'salary is required.' });
    } else if (typeof customer.salary !== 'number' || customer.salary < 0) {
      errors.push({ field: 'customer.salary', message: 'salary must be a positive number.' });
    }

    // Optional numerical customer fields
    ['basicSalary', 'housingAllowance', 'otherAllowances', 'obligations'].forEach(field => {
      const val = customer[field];
      if (val !== undefined && (typeof val !== 'number' || val < 0)) {
        errors.push({ field: `customer.${field}`, message: `${field} must be a positive number.` });
      }
    });

    // Optional employmentDate
    if (customer.employmentDate !== undefined) {
      if (typeof customer.employmentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(customer.employmentDate)) {
        errors.push({ field: 'customer.employmentDate', message: 'employmentDate must be in YYYY-MM-DD format.' });
      }
    }
  }

  // Validate finance section
  if (!finance || typeof finance !== 'object') {
    errors.push({ field: 'finance', message: 'finance section is required and must be an object.' });
  } else {
    // type
    const allowedFinanceTypes = [
      'real_estate',
      'personal',
      'real_estate_with_personal',
      'real_estate_with_existing_personal'
    ];
    if (!finance.type) {
      errors.push({ field: 'finance.type', message: 'finance.type is required.' });
    } else if (typeof finance.type !== 'string' || !allowedFinanceTypes.includes(finance.type)) {
      errors.push({
        field: 'finance.type',
        message: 'finance.type must be one of: real_estate, personal, real_estate_with_personal, real_estate_with_existing_personal.'
      });
    }

    // Optional propertyPrice & downPayment
    ['propertyPrice', 'downPayment'].forEach(field => {
      const val = finance[field];
      if (val !== undefined && (typeof val !== 'number' || val < 0)) {
        errors.push({ field: `finance.${field}`, message: `${field} must be a positive number.` });
      }
    });

    // Optional supportType
    const allowedSupportTypes = ['none', 'monthly', 'downpayment', 'etizaz'];
    if (finance.supportType !== undefined) {
      if (typeof finance.supportType !== 'string' || !allowedSupportTypes.includes(finance.supportType)) {
        errors.push({
          field: 'finance.supportType',
          message: 'finance.supportType must be one of: none, monthly, downpayment, etizaz.'
        });
      }
    }

    // Optional preferredBank
    if (finance.preferredBank !== undefined && typeof finance.preferredBank !== 'string') {
      errors.push({ field: 'finance.preferredBank', message: 'preferredBank must be a string.' });
    }

    // Optional termYears
    if (finance.termYears !== undefined) {
      if (typeof finance.termYears !== 'number' || finance.termYears < 1 || finance.termYears > 30) {
        errors.push({ field: 'finance.termYears', message: 'termYears must be a number between 1 and 30.' });
      }
    }
  }

  // Build normalized/mapped payload if valid
  let normalizedData = null;
  if (errors.length === 0) {
    let sector = customer.employmentSector;
    if (sector === 'gov_civil') sector = 'government_civilian';
    if (sector === 'company') sector = 'companies';

    normalizedData = {
      requestId: requestId || null,
      customer: {
        birthDate: customer.birthDate,
        employmentSector: sector,
        salary: Number(customer.salary),
        basicSalary: customer.basicSalary !== undefined ? Number(customer.basicSalary) : 0,
        housingAllowance: customer.housingAllowance !== undefined ? Number(customer.housingAllowance) : 0,
        otherAllowances: customer.otherAllowances !== undefined ? Number(customer.otherAllowances) : 0,
        obligations: customer.obligations !== undefined ? Number(customer.obligations) : 0,
        employmentDate: customer.employmentDate || null
      },
      finance: {
        type: finance.type,
        propertyPrice: finance.propertyPrice !== undefined ? Number(finance.propertyPrice) : 0,
        downPayment: finance.downPayment !== undefined ? Number(finance.downPayment) : 0,
        supportType: finance.supportType || 'none',
        preferredBank: finance.preferredBank || null,
        termYears: finance.termYears !== undefined ? Number(finance.termYears) : undefined
      }
    };
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedData
  };
}
