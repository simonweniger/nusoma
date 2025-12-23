import { MINIMUM_PASSWORD_LENGTH } from '@workspace/auth/constants';

export const passwordValidator = {
  containsLowerAndUpperCase(password: string | undefined | null): boolean {
    if (!password) {
      return false;
    }
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    return hasLowerCase && hasUpperCase;
  },
  hasMinimumLength(password: string | undefined | null): boolean {
    if (!password) {
      return false;
    }
    return password.length >= MINIMUM_PASSWORD_LENGTH;
  },
  containsNumber(password: string | undefined | null): boolean {
    if (!password) {
      return false;
    }
    return /\d/.test(password);
  },
  validate(password: string | undefined | null): {
    success: boolean;
    message?: string;
  } {
    if (!password) {
      return { success: false, message: 'Password is required' };
    }
    if (!this.hasMinimumLength(password)) {
      return {
        success: false,
        message: `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long`
      };
    }
    if (!this.containsLowerAndUpperCase(password)) {
      return {
        success: false,
        message: 'Password must contain both uppercase and lowercase letters'
      };
    }
    if (!this.containsNumber(password)) {
      return {
        success: false,
        message: 'Password must contain at least one number'
      };
    }
    return { success: true };
  }
};
