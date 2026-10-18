/**
 * Client-side checks for the login and sign-up forms. They mirror the server rules in
 * src/app/api/auth/register/route.ts, and the server still validates everything.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+91)?[6-9]\d{9}$/;

export function emailError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (v.length > 120 || !EMAIL_RE.test(v)) return 'Enter a valid email address, like name@example.com.';
  return undefined;
}

export function loginPasswordError(value: string): string | undefined {
  return value ? undefined : 'Enter your password.';
}

export function nameError(value: string): string | undefined {
  const v = value.trim();
  if (v.length < 2) return 'Enter your full name (at least 2 characters).';
  if (v.length > 80) return 'Name must be 80 characters or fewer.';
  return undefined;
}

export function passwordChecks(value: string) {
  return {
    length: value.length >= 8,
    letter: /[A-Za-z]/.test(value),
    number: /[0-9]/.test(value),
  };
}

export function newPasswordError(value: string): string | undefined {
  if (!value) return 'Create a password.';
  const c = passwordChecks(value);
  if (!c.length || !c.letter || !c.number) return 'Use at least 8 characters, with a letter and a number.';
  return undefined;
}

/** Optional. Blank is allowed; otherwise a 10-digit Indian mobile number (starting 6–9), with or without +91. */
export function phoneError(value: string): string | undefined {
  const p = value.replace(/[\s-]/g, '');
  if (!p) return undefined;
  return PHONE_RE.test(p) ? undefined : 'Enter a valid 10-digit Indian mobile number, or leave this blank.';
}

/** Returns the number in +91 form for the API, or undefined when blank. */
export function normalisePhone(value: string): string | undefined {
  const p = value.replace(/[\s-]/g, '');
  if (!p) return undefined;
  return p.startsWith('+91') ? p : `+91${p}`;
}
