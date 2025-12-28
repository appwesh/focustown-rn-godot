import { parsePhoneNumber, isPossiblePhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Convert a phone number to E.164 format.
 * Returns null if the number is invalid.
 */
export function toE164(
  phoneNumber: string,
  countryCode?: CountryCode,
  options?: { skipValidation?: boolean }
): string | null {
  if (!phoneNumber) return null;

  try {
    // Clean the input - remove spaces and formatting
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // If skipValidation is true, just format it
    if (options?.skipValidation) {
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length >= 10) {
        if (cleaned.startsWith('+')) {
          return `+${digits}`;
        }
        return `+1${digits}`;
      }
      return null;
    }

    // Try to parse
    const parsed = parsePhoneNumber(cleaned, countryCode || 'US');
    
    if (parsed) {
      return parsed.format('E.164');
    }

    // Fallback: if we have enough digits, format manually
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 10) {
      // If starts with country code already
      if (cleaned.startsWith('+')) {
        return `+${digits}`;
      }
      // Assume US
      if (countryCode === 'US' || !countryCode) {
        return `+1${digits}`;
      }
    }

    return null;
  } catch (error) {
    console.warn('[Phone] Failed to parse:', error);
    
    // Fallback on error
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+1${digits}`;
    }
    return null;
  }
}

/**
 * Check if a phone number is possibly valid for a given country.
 * Uses isPossiblePhoneNumber which is less strict than isValidPhoneNumber.
 * Falls back to digit count check.
 */
export function isValidPhone(
  phoneNumber: string,
  countryCode?: CountryCode
): boolean {
  if (!phoneNumber) return false;

  try {
    // Clean the input
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const digits = cleaned.replace(/\D/g, '');
    
    // Basic length check first (US numbers need 10 digits)
    const minDigits = countryCode === 'US' || !countryCode ? 10 : 8;
    if (digits.length < minDigits) {
      return false;
    }

    // Use isPossiblePhoneNumber (less strict than isValidPhoneNumber)
    // This allows test numbers and numbers that might be valid
    if (isPossiblePhoneNumber(cleaned, countryCode || 'US')) {
      return true;
    }

    // Fallback: accept if we have enough digits
    // This allows test numbers like 555-555-5555
    return digits.length >= minDigits;
  } catch {
    // On error, fall back to simple digit count
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 10;
  }
}

/**
 * Format a phone number for display (national format).
 */
export function formatForDisplay(
  phoneNumber: string,
  countryCode?: CountryCode
): string {
  if (!phoneNumber) return '';

  try {
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const parsed = parsePhoneNumber(cleaned, countryCode || 'US');
    
    if (parsed) {
      return parsed.formatNational();
    }
  } catch {
    // Fall through to return cleaned input
  }

  return phoneNumber;
}

/**
 * Clean phone number input (remove non-digit characters except +).
 */
export function cleanPhoneInput(text: string): string {
  // Keep + at the start, only digits otherwise
  if (text.startsWith('+')) {
    return '+' + text.slice(1).replace(/\D/g, '');
  }
  return text.replace(/\D/g, '');
}

/**
 * Clean verification code input (digits only).
 */
export function cleanVerificationCode(text: string): string {
  return text.replace(/\D/g, '').slice(0, 6);
}
