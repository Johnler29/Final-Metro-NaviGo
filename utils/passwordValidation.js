/**
 * Password validation utility
 * Provides consistent password requirements across the application
 */

/**
 * Validates a password against security requirements
 * @param {string} password - The password to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecialChar = true,
    customRules = []
  } = options;

  const errors = [];

  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  // Check maximum length
  if (password.length > maxLength) {
    errors.push(`Password must be no more than ${maxLength} characters long`);
  }

  // Check for uppercase letter
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Apply custom rules
  customRules.forEach(rule => {
    if (rule.test && !rule.test.test(password)) {
      errors.push(rule.message || 'Password does not meet custom requirements');
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Gets a user-friendly message describing password requirements
 * @param {object} options - Same options as validatePassword
 * @returns {string} - Human-readable requirements message
 */
export const getPasswordRequirements = (options = {}) => {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecialChar = true
  } = options;

  const requirements = [];

  requirements.push(`At least ${minLength} characters long`);
  
  if (maxLength < Infinity) {
    requirements.push(`No more than ${maxLength} characters`);
  }

  if (requireUppercase) {
    requirements.push('One uppercase letter (A-Z)');
  }

  if (requireLowercase) {
    requirements.push('One lowercase letter (a-z)');
  }

  if (requireNumber) {
    requirements.push('One number (0-9)');
  }

  if (requireSpecialChar) {
    requirements.push('One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  return requirements.join(', ');
};

/**
 * Validates password strength and returns a strength score (0-4)
 * @param {string} password - The password to check
 * @returns {object} - { score: number, label: string, feedback: string[] }
 */
export const getPasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else if (password.length > 0) feedback.push('Mix uppercase and lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else if (password.length > 0) feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  else if (password.length > 0) feedback.push('Add special characters');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const label = labels[Math.min(score, 4)];

  return {
    score: Math.min(score, 4),
    label,
    feedback: feedback.length > 0 ? feedback : []
  };
};

/**
 * Default password validation options for the application
 */
export const DEFAULT_PASSWORD_OPTIONS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};

/**
 * Relaxed password validation options (for backward compatibility)
 */
export const RELAXED_PASSWORD_OPTIONS = {
  minLength: 6,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialChar: false
};







