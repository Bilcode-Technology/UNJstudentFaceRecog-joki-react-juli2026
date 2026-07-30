import React from 'react';

export type BadgeStatus =
  | 'hadir'
  | 'izin'
  | 'sakit'
  | 'alfa'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'belum_presensi'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'secondary'
  | 'outline'
  | string;

export interface BadgeProps {
  status?: BadgeStatus | string;
  variant?: BadgeStatus | string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  label,
  className = '',
  children,
}) => {
  const activeStatus = (variant || status || 'neutral').toLowerCase();

  const styleMap: Record<string, { bg: string; text: string; border: string; label: string }> = {
    hadir: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      label: 'Hadir',
    },
    approved: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      label: 'Disetujui',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      label: 'Sukses',
    },
    izin: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      label: 'Izin',
    },
    sakit: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      label: 'Sakit',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      label: 'Peringatan',
    },
    pending: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      label: 'Menunggu Approval',
    },
    alfa: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      label: 'Alfa',
    },
    rejected: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      label: 'Ditolak',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      label: 'Bahaya',
    },
    belum_presensi: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      label: 'Belum Presensi',
    },
    neutral: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      label: 'Netral',
    },
    secondary: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      label: 'Info',
    },
    outline: {
      bg: 'bg-transparent',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      label: 'Outline',
    },
  };

  const currentStyle = styleMap[activeStatus] || {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    label: activeStatus,
  };

  const content = children || label || currentStyle.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-colors ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} ${className}`}
    >
      <span>{content}</span>
    </span>
  );
};

export default Badge;
