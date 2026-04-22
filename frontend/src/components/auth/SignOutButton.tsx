'use client'

import { useTransition } from 'react'
import { signout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button 
      variant="outline" 
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signout()
        })
      }}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
