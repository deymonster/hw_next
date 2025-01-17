'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ProtectedPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Защищенная страница</h1>
      <p className="mb-4">Если вы видите это, значит вы авторизованы!</p>
      <Button 
        onClick={() => router.push('/')}
        variant="outline"
      >
        На главную
      </Button>
    </div>
  )
}
