import { describe, it, expect } from 'vitest';
import { emailError, loginPasswordError, nameError, newPasswordError, phoneError, normalisePhone, passwordChecks } from '@/lib/auth-validation';

describe('auth form validation (mirrors server rules)', () => {
  it('email: required and must look like an address', () => {
    expect(emailError('')).toBeTruthy();
    expect(emailError('   ')).toBeTruthy();
    expect(emailError('no-at-sign')).toBeTruthy();
    expect(emailError('a@b')).toBeTruthy();
    expect(emailError('name@example.com')).toBeUndefined();
    expect(emailError('  name@example.com  ')).toBeUndefined();
    expect(emailError('x'.repeat(116) + '@a.co')).toBeTruthy();
  });

  it('login password: only required', () => {
    expect(loginPasswordError('')).toBeTruthy();
    expect(loginPasswordError('abc')).toBeUndefined();
  });

  it('name: at least 2 characters after trimming', () => {
    expect(nameError(' A ')).toBeTruthy();
    expect(nameError('Al')).toBeUndefined();
    expect(nameError('x'.repeat(81))).toBeTruthy();
  });

  it('new password: 8+ chars with a letter and a number', () => {
    expect(newPasswordError('')).toBeTruthy();
    expect(newPasswordError('abcdefg1')).toBeUndefined();
    expect(newPasswordError('abcdefgh')).toBeTruthy(); // no number
    expect(newPasswordError('12345678')).toBeTruthy(); // no letter
    expect(newPasswordError('abc123')).toBeTruthy(); // too short
    expect(passwordChecks('abc123xy')).toEqual({ length: true, letter: true, number: true });
  });

  it('phone: optional, Indian mobile only', () => {
    expect(phoneError('')).toBeUndefined();
    expect(phoneError('98765 43210')).toBeUndefined();
    expect(phoneError('+91 98765-43210')).toBeUndefined();
    expect(phoneError('5876543210')).toBeTruthy(); // does not start 6-9
    expect(phoneError('12345')).toBeTruthy();
  });

  it('phone normalisation adds +91 once', () => {
    expect(normalisePhone('')).toBeUndefined();
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210');
  });
});
