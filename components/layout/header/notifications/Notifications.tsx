'use client'

import { useEffect, useState } from 'react';
import { getUnreadNotificationsCount } from '@/app/actions/notifications';
import { useCurrentSession } from '@/hooks/useCurrentSession';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { NotificationsList } from './NotificationsList';

export function Notifications() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useCurrentSession();

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  // Получаем количество непрочитанных при загрузке и при изменении isOpen
  useEffect(() => {
    async function fetchUnreadCount() {
      if (user?.id) {
        const count = await getUnreadNotificationsCount(user.id);
        setUnreadCount(count);
      }
    }
    
    fetchUnreadCount();
  }, [user?.id, isOpen]); // Обновляем счетчик при изменении isOpen

  if (loading) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div className="relative">
          <Bell className="size-5 text-foreground"/>
          {unreadCount > 0 && (
            <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full
              bg-primary px-[5px] text-xs font-semibold text-white">
              {displayCount}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[500px] w-[320px] overflow-y-auto">
        <NotificationsList onRead={() => setUnreadCount(0)} />
      </PopoverContent>
    </Popover>
  );
}
