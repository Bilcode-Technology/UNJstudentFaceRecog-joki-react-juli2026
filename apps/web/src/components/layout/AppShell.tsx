'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppShellProps {
  role: 'kormat' | 'mahasiswa' | 'superadmin';
  title?: string;
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  role,
  title,
  breadcrumbs = [],
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && Array.isArray(data.data)) {
            const unread = data.data.filter((n: { is_read: boolean }) => !n.is_read).length;
            setUnreadNotificationsCount(unread);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItemsKormat = [
    { label: 'Dashboard', href: '/kormat/dashboard', icon: '??' },
    { label: 'Kelola Kelas', href: '/kormat/courses', icon: '??' },
    { label: 'Notifikasi', href: '/notifications', icon: '??', badge: unreadNotificationsCount },
  ];

  const navItemsMahasiswa = [
    { label: 'Dashboard', href: '/mahasiswa/dashboard', icon: '??' },
    { label: 'Mata Kuliah Saya', href: '/mahasiswa/courses', icon: '??' },
    { label: 'Notifikasi', href: '/notifications', icon: '??', badge: unreadNotificationsCount },
  ];

  const navItemsSuperadmin = [
    { label: 'Dashboard', href: '/superadmin/dashboard', icon: '??' },
    { label: 'Kelola KORMAT', href: '/superadmin/kormat', icon: '??' },
    { label: 'Monitoring Kelas', href: '/superadmin/courses', icon: '??' },
    { label: 'Monitoring Mahasiswa', href: '/superadmin/students', icon: '??' },
    { label: 'Notifikasi', href: '/notifications', icon: '??', badge: unreadNotificationsCount },
  ];

  const navItems =
    role === 'superadmin'
      ? navItemsSuperadmin
      : role === 'mahasiswa'
      ? navItemsMahasiswa
      : navItemsKormat;

  const dashboardHref =
    role === 'superadmin'
      ? '/superadmin/dashboard'
      : role === 'mahasiswa'
      ? '/mahasiswa/dashboard'
      : '/kormat/dashboard';

  const roleLabel =
    role === 'superadmin' ? 'Superadmin' : role === 'mahasiswa' ? 'Mahasiswa' : 'KORMAT';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-unj-teal-dark text-teal-100">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-unj-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Memuat portal...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-unj-teal-dark text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
              <Image
                src="/Lambang_baru_UNJ.png"
                alt="Logo UNJ"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-tight">PresensiFace</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 block">
                Portal {roleLabel}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-teal-200 hover:text-white p-1"
          >
            ?
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400/80 px-3 mb-2">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' &&
                pathname?.startsWith(item.href) &&
                item.href !== '/kormat/dashboard' &&
                item.href !== '/superadmin/dashboard' &&
                item.href !== '/mahasiswa/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-teal-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-unj-gold text-unj-teal-dark rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl">
            <div className="truncate mr-2">
              <span className="block text-xs font-bold text-white truncate">{user.name}</span>
              <span className="block text-[10px] text-teal-300 truncate">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-teal-200 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
            >
              ??
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Buka menu sidebar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                  <Link href={dashboardHref} className="hover:text-unj-teal transition-colors">
                    Home
                  </Link>
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      <span>/</span>
                      {bc.href ? (
                        <Link href={bc.href} className="hover:text-unj-teal transition-colors">
                          {bc.label}
                        </Link>
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}
              {title && (
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {title}
                </h1>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifikasi"
            >
              <span className="text-xl">??</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-unj-red rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-unj-teal/15 text-unj-teal font-bold text-xs flex items-center justify-center border border-unj-teal/30">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
