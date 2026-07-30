'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface NotificationItem {
  id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    body?: string;
    url?: string;
    action_url?: string;
    course_name?: string;
    session_title?: string;
    status?: string;
  };
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, read_at: new Date().toISOString() } : item
          )
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return item.read_at === null;
    return true;
  });

  const unreadCount = notifications.filter((item) => item.read_at === null).length;

  if (isLoading || loading) {
    return (
      <AppShell role={user?.roles?.some((r: {name: string}) => r.name === 'kormat' || r.name === 'superadmin') ? 'kormat' : 'mahasiswa'} title="Notifikasi">
        <div className="p-8 text-center text-slate-500">Memuat riwayat notifikasi...</div>
      </AppShell>
    );
  }

  const userRole = user?.roles?.some((r: {name: string}) => r.name === 'kormat' || r.name === 'superadmin') ? 'kormat' as const : 'mahasiswa' as const;

  return (
    <AppShell
      role={userRole}
      title="Notifikasi"
      breadcrumbs={[{ label: 'Notifikasi' }]}
    >
        {/* Header Bar */}
        <Card>
          <CardHeader className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-unj-teal block mb-1">
              Pemberitahuan System
            </span>
            <CardTitle className="text-2xl font-bold font-heading text-ink">Riwayat Notifikasi</CardTitle>
            <CardDescription>
              {unreadCount > 0
                ? `Anda memiliki ${unreadCount} notifikasi belum dibaca`
                : 'Semua notifikasi telah dibaca'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Filter Controls */}
        <div className="flex gap-2 border-b border-line pb-3">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            size="default"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            Semua ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            size="default"
            onClick={() => setFilter('unread')}
            className="text-xs"
          >
            Belum Dibaca ({unreadCount})
          </Button>
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500 text-xs">
                Tidak ada notifikasi yang ditemukan.
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = item.read_at === null;
              const title = item.data.title || item.data.course_name || 'Notifikasi';
              const body =
                item.data.body ||
                item.data.message ||
                (item.data.session_title ? `Sesi ${item.data.session_title}` : '');

              return (
                <Card
                  key={item.id}
                  className={`transition-all ${
                    isUnread ? 'border-unj-teal/40 bg-unj-teal/5 shadow-xs' : 'bg-white'
                  }`}
                >
                  <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-unj-teal flex-shrink-0 animate-pulse" />
                        )}
                        <span className="font-bold text-sm text-ink">{title}</span>
                      </div>
                      {body && <p className="text-xs text-slate-600">{body}</p>}
                      <span className="text-[11px] text-slate-400 block pt-1">
                        {new Date(item.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    {isUnread && (
                      <Button
                        variant="ghost"
                        onClick={() => markAsRead(item.id)}
                        className="text-xs text-unj-teal hover:bg-unj-teal/10 whitespace-nowrap"
                      >
                        Tandai Dibaca
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
    </AppShell>
  );
}
