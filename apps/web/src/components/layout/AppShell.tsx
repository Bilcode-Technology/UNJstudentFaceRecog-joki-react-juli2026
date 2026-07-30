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

// SVG Icons — avoiding emoji which can break on some Windows builds
const IconDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconBell = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconAcademic = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconMenu = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const IconChevron = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
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

  const navItemsKormat: NavItem[] = [
    { label: 'Dashboard', href: '/kormat/dashboard', icon: <IconDashboard /> },
    { label: 'Kelola Kelas', href: '/kormat/courses', icon: <IconBook /> },
    { label: 'Notifikasi', href: '/notifications', icon: <IconBell />, badge: unreadNotificationsCount },
  ];

  const navItemsMahasiswa: NavItem[] = [
    { label: 'Dashboard', href: '/mahasiswa/dashboard', icon: <IconDashboard /> },
    { label: 'Mata Kuliah Saya', href: '/mahasiswa/courses', icon: <IconBook /> },
    { label: 'Notifikasi', href: '/notifications', icon: <IconBell />, badge: unreadNotificationsCount },
  ];

  const navItemsSuperadmin: NavItem[] = [
    { label: 'Dashboard', href: '/superadmin/dashboard', icon: <IconDashboard /> },
    { label: 'Kelola KORMAT', href: '/superadmin/kormat', icon: <IconUsers /> },
    { label: 'Monitoring Kelas', href: '/superadmin/courses', icon: <IconBook /> },
    { label: 'Monitoring Mahasiswa', href: '/superadmin/students', icon: <IconAcademic /> },
    { label: 'Notifikasi', href: '/notifications', icon: <IconBell />, badge: unreadNotificationsCount },
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-unj-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Memuat portal...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900 font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* === SIDEBAR === */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-unj-teal-dark text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 flex-shrink-0">
          <Link href={dashboardHref} className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
              <Image
                src="/Lambang_baru_UNJ.png"
                alt="Logo UNJ"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight text-white block leading-tight">PresensiFace</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 block truncate">
                Portal {roleLabel}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <IconClose />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400/80 px-3 mb-3">
            Menu Utama
          </p>
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
                    ? 'bg-white/15 text-white shadow-sm border border-white/15'
                    : 'text-teal-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-teal-300'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-400 text-unj-teal-dark rounded-full flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info / Logout */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-unj-teal-dark font-bold text-sm flex items-center justify-center flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <span className="block text-xs font-bold text-white truncate">{user.name}</span>
              <span className="block text-[10px] text-teal-300 truncate">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-teal-300 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* === MAIN CONTENT AREA === */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Buka menu sidebar"
            >
              <IconMenu />
            </button>

            {/* Breadcrumb + Title */}
            <div className="min-w-0">
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                  <Link href={dashboardHref} className="hover:text-unj-teal transition-colors font-medium">
                    Home
                  </Link>
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      <IconChevron />
                      {bc.href ? (
                        <Link href={bc.href} className="hover:text-unj-teal transition-colors">
                          {bc.label}
                        </Link>
                      ) : (
                        <span className="text-slate-700 font-semibold truncate">{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}
              {title && (
                <h1 className="text-lg font-bold text-slate-900 leading-none truncate">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-unj-teal transition-colors"
              title="Notifikasi"
            >
              <IconBell />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User avatar */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-unj-teal text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="hidden md:block">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400 block leading-tight capitalize">{role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
