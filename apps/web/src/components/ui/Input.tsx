import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-ink placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-unj-teal/40 focus:border-unj-teal disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-unj-red focus:ring-unj-red/40 focus:border-unj-red' : 'border-line'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-unj-red font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
