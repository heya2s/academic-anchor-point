import DOMPurify from 'dompurify';

// Input validation constants
export const VALIDATION_LIMITS = {
  NOTICE_TITLE: { min: 1, max: 200 },
  NOTICE_MESSAGE: { min: 1, max: 5000 },
  SUBJECT_NAME: { min: 1, max: 100 },
  STUDENT_ID: { min: 1, max: 20 },
  ROLL_NUMBER: { min: 1, max: 20 },
  CLASS_NAME: { min: 1, max: 50 },
  FULL_NAME: { min: 1, max: 100 },
  FILE_NAME: { max: 255 }
};

// HTML sanitization for user content
export const sanitizeHTML = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed - convert to plain text
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Input validation functions
export const validateLength = (value: string, limits: { min: number; max: number }): string | null => {
  if (!value || value.trim().length === 0) {
    return 'This field is required';
  }
  
  const trimmedLength = value.trim().length;
  if (trimmedLength < limits.min) {
    return `Must be at least ${limits.min} characters`;
  }
  if (trimmedLength > limits.max) {
    return `Must be no more than ${limits.max} characters`;
  }
  return null;
};

export const validateStudentId = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return 'Student ID is required';
  }
  
  // Only allow alphanumeric characters and dashes
  const pattern = /^[a-zA-Z0-9-]+$/;
  if (!pattern.test(value)) {
    return 'Student ID can only contain letters, numbers, and dashes';
  }
  
  return validateLength(value, VALIDATION_LIMITS.STUDENT_ID);
};

export const validateRollNumber = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return null; // Roll number is optional
  }
  
  // Only allow alphanumeric characters
  const pattern = /^[a-zA-Z0-9]+$/;
  if (!pattern.test(value)) {
    return 'Roll number can only contain letters and numbers';
  }
  
  return validateLength(value, VALIDATION_LIMITS.ROLL_NUMBER);
};

export const validateEmail = (email: string): string | null => {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};

// Sanitize and validate form data
export const sanitizeFormData = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Trim whitespace and sanitize HTML
      sanitized[key] = sanitizeHTML(value.trim());
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// File name validation and sanitization
export const sanitizeFileName = (fileName: string): string => {
  // Remove dangerous characters and limit length
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
    .substring(0, VALIDATION_LIMITS.FILE_NAME.max);
    
  return sanitized || 'file'; // Fallback if completely sanitized away
};

// Security helper to hide sensitive admin information
export const hideAdminInfo = (isAdmin: boolean, adminId?: string): string => {
  if (isAdmin && adminId) {
    return adminId; // Show actual ID to admins
  }
  return 'Administrator'; // Hide ID from non-admins
};