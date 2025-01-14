'use client';

import '@/styles/globals.css';

export default function EnvErrorPage({ searchParams }: { searchParams: { message?: string } }) {
  const errorMessage = searchParams.message || 'Unknown configuration error';

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Ошибка конфигурации
          </h1>
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              {decodeURIComponent(errorMessage)}
            </p>
          </div>
          <p className="mt-4 text-gray-600">
            Пожалуйста, проверьте настройки в файле .env и перезапустите приложение.
          </p>
        </div>
      </div>
    </div>
  );
}
