/**
 * Input Validation Utilities
 * Provides validation functions for text-only and number-only inputs
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const parseDateInput = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    const parsedDate = dayjs(value);
    return parsedDate.isValid() ? parsedDate.startOf('day') : null;
  }

  if (dayjs.isDayjs(value)) {
    return value.startOf('day');
  }

  if (typeof value === 'string') {
    const strictDdMmYyyy = dayjs(value, 'DD/MM/YYYY', true);
    if (strictDdMmYyyy.isValid()) {
      return strictDdMmYyyy.startOf('day');
    }

    const isoDate = dayjs(value);
    return isoDate.isValid() ? isoDate.startOf('day') : null;
  }

  return null;
};

/**
 * Validates and filters text-only input (letters, spaces, hyphens, apostrophes)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only valid text characters
 */
export const validateTextOnly = (value) => {
  // Allow letters (any language), spaces, hyphens, and apostrophes
  return value.replace(/[^a-zA-Z\s\-']/g, '');
};

/**
 * Validates and filters number-only input (digits only)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only digits
 */
export const validateNumberOnly = (value) => {
  // Allow only digits 0-9
  return value.replace(/[^0-9]/g, '');
};

/**
 * Validates and filters mobile number input (digits only, no special characters)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only digits
 */
export const validateMobileNumber = (value) => {
  // Allow only digits 0-9 (no spaces, hyphens, plus, parentheses)
  return value.replace(/[^0-9]/g, '');
};

/**
 * Validates and filters phone number input (digits, spaces, hyphens, plus, parentheses)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only valid phone characters
 */
export const validatePhoneNumber = (value) => {
  // Allow digits, spaces, hyphens, plus sign, and parentheses
  return value.replace(/[^0-9\s\-+()]/g, '');
};

/**
 * Validates and filters email input (basic email characters)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only valid email characters
 */
export const validateEmail = (value) => {
  // Allow alphanumeric, @, dot, hyphen, underscore
  return value.replace(/[^a-zA-Z0-9@.\-_]/g, '').toLowerCase();
};

/**
 * Validates and filters alphanumeric input (letters and numbers only)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only alphanumeric characters
 */
export const validateAlphanumeric = (value) => {
  // Allow letters and numbers only
  return value.replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * Validates and filters decimal number input (digits and single decimal point)
 * @param {string} value - Input value to validate
 * @returns {string} - Filtered value containing only valid decimal number
 */
export const validateDecimal = (value) => {
  // Allow digits and single decimal point
  const parts = value.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return value.replace(/[^0-9.]/g, '');
};

/**
 * Validates image file type for photo uploads
 * @param {File} file - File to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg'];
  
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      message: 'Only JPG and JPEG images are allowed.'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validates document file type for document uploads
 * @param {File} file - File to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateDocumentFile = (file) => {
  const validTypes = ['application/pdf'];
  
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      message: 'Only PDF files are allowed.'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validates Date of Birth (must be 18+ years old)
 * @param {Date|string} dob - Date of birth to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateDateOfBirth = (dob) => {
  const today = dayjs().startOf('day');
  const birthDate = parseDateInput(dob);

  if (!birthDate) {
    return {
      isValid: false,
      message: 'Invalid date of birth.'
    };
  }
  
  // Check if birth date is in the future
  if (birthDate.isAfter(today)) {
    return {
      isValid: false,
      message: 'Date of Birth cannot be a future date.'
    };
  }
  
  // Calculate age
  let age = today.year() - birthDate.year();
  const monthDiff = today.month() - birthDate.month();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.date() < birthDate.date())) {
    age--;
  }
  
  if (age < 18) {
    return {
      isValid: false,
      message: 'You must be at least 18 years old.'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validates employee start date (must not be future date)
 * @param {Date|string} startDate - Start date to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateStartDate = (startDate) => {
  const start = parseDateInput(startDate);

  if (!start) {
    return {
      isValid: false,
      message: 'Invalid employee start date.'
    };
  }
  
  return {
    isValid: true,
    message: ""
  };
};

/**
 * Validates probation end date (must not be past date)
 * @param {Date|string} probationDate - Probation end date to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateProbationEndDate = (probationDate) => {
  const probation = parseDateInput(probationDate);

  if (!probation) {
    return {
      isValid: false,
      message: 'Invalid probation end date.'
    };
  }
  
  return {
    isValid: true,
    message: ""
  };
};

/**
 * Gets maximum allowed date for start date (today)
 * @returns {Date} - Maximum allowed date for start date
 */
export const getMaxStartDate = () => {
  const today = new Date();
  return today;
};

/**
 * Gets minimum allowed date for probation end date (today)
 * @returns {Date} - Minimum allowed date for probation end date
 */
export const getMinProbationDate = () => {
  const today = new Date();
  return today;
};

/**
 * Gets maximum allowed date for DOB (18 years ago from today)
 * @returns {Date} - Maximum allowed date for DOB
 */
export const getMaxDOBDate = () => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return maxDate;
};

/**
 * Handler for text-only input fields
 * Use with onChange event
 */
export const handleTextOnlyChange = (e, setter) => {
  const validValue = validateTextOnly(e.target.value);
  setter(validValue);
};

/**
 * Handler for number-only input fields
 * Use with onChange event
 */
export const handleNumberOnlyChange = (e, setter) => {
  const validValue = validateNumberOnly(e.target.value);
  setter(validValue);
};

/**
 * Handler for mobile number input fields (digits only)
 * Use with onChange event
 */
export const handleMobileNumberChange = (e, setter) => {
  const validValue = validateMobileNumber(e.target.value);
  setter(validValue);
};

/**
 * Prevents non-numeric key presses
 * Use with onKeyPress event
 */
export const preventNonNumeric = (e) => {
  if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
    e.preventDefault();
  }
};

/**
 * Prevents non-numeric key presses for mobile numbers (strictly digits only)
 * Use with onKeyPress event
 */
export const preventNonMobileNumeric = (e) => {
  if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
    e.preventDefault();
  }
};

/**
 * Prevents non-text key presses
 * Use with onKeyPress event
 */
export const preventNonText = (e) => {
  const char = String.fromCharCode(e.which);
  if (!/[a-zA-Z\s]/.test(char)) {
    e.preventDefault();
  }
};

// Character validation utilities
const TEXT_ONLY_FIELDS = new Set([
  "firstName",
  "middleName", 
  "lastName",
  "jobTitle",
  "department",
  "team",
  "Organisation Name",
  "townCity",
  "county",
  "emergencyContactName",
  "emergencyContactRelation",
  "bankName",
  "bankBranch",
  "passportCountry",
  "licenceCountry"
]);

const NUMBER_ONLY_FIELDS = new Set([
  "mobileNumber",
  "workPhone", 
  "salary",
  "accountNumber",
  "sortCode",
  "emergencyContactPhone"
]);

// Fields that may contain alpha-numeric characters (letters and numbers)
const ALPHANUMERIC_FIELDS = new Set([
  "payrollNumber"
]);

const TEXT_ONLY_REGEX = /^[A-Za-z\s'-]+$/;
const NUMBER_ONLY_REGEX = /^[0-9]+$/;
const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

export const validateFieldCharacters = (field, value) => {
  if (!value) return ""

  if (TEXT_ONLY_FIELDS.has(field) && !TEXT_ONLY_REGEX.test(value)) {
    return "Please use letters only.";
  }

  if (NUMBER_ONLY_FIELDS.has(field) && !NUMBER_ONLY_REGEX.test(value)) {
    return "Please use numbers only.";
  }

  if (ALPHANUMERIC_FIELDS.has(field) && !ALPHANUMERIC_REGEX.test(value)) {
    return "Please use letters and numbers only.";
  }

  return "";
};

export const collectCharacterErrors = (data) => {
  const errors = {};

  TEXT_ONLY_FIELDS.forEach((field) => {
    const message = validateFieldCharacters(field, data?.[field]);
    if (message) {
      errors[field] = message;
    }
  });

  NUMBER_ONLY_FIELDS.forEach((field) => {
    const message = validateFieldCharacters(field, data?.[field]);
    if (message) {
      errors[field] = message;
    }
  });

  ALPHANUMERIC_FIELDS.forEach((field) => {
    const message = validateFieldCharacters(field, data?.[field]);
    if (message) {
      errors[field] = message;
    }
  });

  return errors;
};
