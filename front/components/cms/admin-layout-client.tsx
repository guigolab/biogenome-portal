'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { registerCms401Handler } from '@/lib/cms/fetch'
import { cmsCheckSession } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

import { AdminHeader } from './admin-header'
import { CmsDashboardDrawer } from './cms-dashboard-drawer'

export function AdminLayoutClient({ children }: { children: ReactNode }) {
   const router = useRouter()
   const mapUser = useCmsAuthStore((s) => s.mapUser)
   const clearAuthState = useCmsAuthStore((s) => s.clearAuthState)

   const [gate, setGate] = useState<'loading' | 'ok' | 'redirect'>('loading')

   useEffect(() => {
      registerCms401Handler(() => useCmsAuthStore.getState().clearAuthState())
      return () => registerCms401Handler(null)
   }, [])

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         try {
            const user = await cmsCheckSession()
            if (cancelled) return
            mapUser(user)
            setGate('ok')
         } catch {
            if (cancelled) return
            clearAuthState()
            setGate('redirect')
            router.replace('/login')
         }
      })()
      return () => {
         cancelled = true
      }
   }, [router, mapUser, clearAuthState])

   if (gate === 'loading' || gate === 'redirect') {
      return (
         <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking session…</p>
         </div>
      )
   }

   return (
      <div className="min-h-screen bg-background">
         <AdminHeader />
         <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
         <CmsDashboardDrawer />
      </div>
   )
}
