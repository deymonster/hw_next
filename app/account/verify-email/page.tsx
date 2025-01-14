'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      toast.error("Токен отсутствует");
      setIsVerifying(false);
      return;
    }

    async function verifyEmail() {
      try {
        const res = await fetch(`/api/account/verify-email?token=${token}`);
        const result = await res.json();

        if (result.success) {
          toast.success("Email успешно подтвержден! Перенаправляем на вход...");
          setTimeout(() => {
            router.push('/account/login');
          }, 2000);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Ошибка при подтверждении email");
      } finally {
        setIsVerifying(false);
      }
    }

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      {isVerifying ? (
        <p>Подтверждаем ваш email...</p>
      ) : (
        <p>Ошибка при подтверждении email</p>
      )}
    </div>
  );
}
