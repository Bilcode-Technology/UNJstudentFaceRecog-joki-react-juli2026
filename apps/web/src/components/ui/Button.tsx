import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'default' | 'lg';
  /** @deprecated Use `loading` instead */
  isLoading?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  loading = false,
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const isSpinning = loading || isLoading;

  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 shadow-2xs';

  const variants = {
    primary:
      'bg-unj-teal hover:bg-unj-teal-dark text-white focus:ring-unj-teal/50 border border-transparent shadow-md shadow-unj-teal/20',
    secondary:
      'bg-unj-teal/10 hover:bg-unj-teal/20 text-unj-teal dark:bg-unj-teal/20 dark:hover:bg-unj-teal/30 dark:text-teal-200 border border-unj-teal/30 dark:border-unj-teal/40 focus:ring-unj-teal/30',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/50 border border-transparent shadow-emerald-600/20 shadow-md',
    danger:
      'bg-unj-red hover:bg-red-700 text-white focus:ring-unj-red/50 border border-transparent shadow-md shadow-unj-red/20',
    warning:
      'bg-amber-500 hover:bg-amber-600 text-slate-950 focus:ring-amber-400/50 border border-transparent shadow-md',
    outline:
      'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:ring-unj-teal/30',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-none focus:ring-unj-teal/20',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl',
    default: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'w-full px-6 py-3.5 text-base font-bold rounded-2xl shadow-md',
  };

  return (
    <button
      disabled={disabled || isSpinning}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isSpinning ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
