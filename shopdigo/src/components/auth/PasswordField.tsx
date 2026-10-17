'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

/** Password input with an accessible show/hide toggle. The value is never logged or stored outside the form. */
export default function PasswordField({
  id, value, onChange, autoComplete, invalid = false, describedBy, required = true,
  placeholder,
}: {
  id: string; value: string; onChange: (v: string) => void; autoComplete: string;
  invalid?: boolean; describedBy?: string; required?: boolean; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="auth-input pr-12"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        aria-controls={id}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {show ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
