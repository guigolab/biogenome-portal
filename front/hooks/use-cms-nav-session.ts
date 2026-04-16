'use client'

import { useEffect, useState } from 'react'

import { cmsCheckSession } from '@/lib/cms/services/auth'
import { CMS_LOGIN_HINT_KEY, useCmsAuthStore } from '@/stores/cms-auth-store'

/**
 * When CMS login nav is shown, probe GET /login once so the nav can show
 * "My area" vs "Login". Uses sessionStorage hint for the first paint to avoid
 * flashing "Login" for returning sessions in this tab.
 */
export function useCmsNavSession(opts: { enabled: boolean; portalLoading: boolean }) {
   const { enabled, portalLoading } = opts
   const mapUser = useCmsAuthStore((s) => s.mapUser)
   const clearAuthState = useCmsAuthStore((s) => s.clearAuthState)
   const isAuthenticated = useCmsAuthStore((s) => s.isAuthenticated)

   const [loginHint, setLoginHint] = useState(() => {
      if (typeof window === 'undefined') return false
      return sessionStorage.getItem(CMS_LOGIN_HINT_KEY) === '1'
   })

   useEffect(() => {
      if (portalLoading || !enabled) return
      let alive = true
      ;(async () => {
         try {
            const user = await cmsCheckSession()
            if (!alive) return
            mapUser(user)
            setLoginHint(true)
         } catch {
            if (!alive) return
            clearAuthState()
            setLoginHint(false)
         }
      })()
      return () => {
         alive = false
      }
   }, [portalLoading, enabled, mapUser, clearAuthState])

   const showMyArea = isAuthenticated || loginHint

   return { showMyArea }
}
