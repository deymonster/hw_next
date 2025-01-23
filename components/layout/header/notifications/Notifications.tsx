'use client'

import { useEffect, useState } from 'react';
import { getUnreadNotificationsCount } from '@/app/actions/notifications';
import { useCurrentSession } from '@/hooks/useCurrentSession';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { NotificationsList } from './NotificationsList';

export function Notifications() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user, loading } = useCurrentSession();

  const displayCount = unreadCount > 10 ? '+9' : unreadCount;

  useEffect(() => {
    async function fetchUnreadCount() {
      if (user?.id) {
        try {
          const count = await getUnreadNotificationsCount(user.id);
          setUnreadCount(count);
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      }
    }
    fetchUnreadCount();
  }, [user?.id]);

  if (loading) return null;

  return (
    <Popover>
      <PopoverTrigger>
        {unreadCount !== 0 && (
            <div className="absolute right-[72px] top-5 rounded-full
            bg-primary px-[5px] text-xs font-semibold text-white">
                {displayCount}
            </div>
        )}
        <Bell className="size-5 text-foreground"/>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[500px] w-[320px] overflow-y-auto">
        <NotificationsList />
      </PopoverContent>
    </Popover>
  );
}
