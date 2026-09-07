'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePortalConfig } from '@/contexts/portal-context'
import { cmsCheckSession, cmsLogin } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { toast } from 'sonner'

/**
 * Login form and session probe. The CMS-enabled gate (`general.cms`) is checked server-side by
 * `app/login/page.tsx` before this component ever mounts (front-config-centralization-plan.md
 * Phase 5) — this component only handles the login interaction and the "already logged in"
 * redirect to `/admin`, unchanged from before.
 */
export function LoginPageClient() {
   const router = useRouter()
   const { config, loading: portalLoading } = usePortalConfig()
   const mapUser = useCmsAuthStore((s) => s.mapUser)

   const contactEmail =
      typeof config?.general?.contactEmail === 'string' ? config.general.contactEmail : undefined

   const [name, setName] = useState('')
   const [password, setPassword] = useState('')
   const [showPassword, setShowPassword] = useState(false)
   const [submitting, setSubmitting] = useState(false)
   /** Until portal is ready and session probe finishes (or fails), avoid flashing the form. */
   const [sessionBusy, setSessionBusy] = useState(true)

   useEffect(() => {
      if (portalLoading) return
      let alive = true
      ;(async () => {
         try {
            const user = await cmsCheckSession()
            if (!alive) return
            mapUser(user)
            router.replace('/admin')
            router.refresh()
         } catch {
            if (!alive) return
            setSessionBusy(false)
         }
      })()
      return () => {
         alive = false
      }
   }, [portalLoading, router, mapUser])

   async function onSubmit(e: React.FormEvent) {
      e.preventDefault()
      if (!name.trim() || !password) return
      setSubmitting(true)
      try {
         const data = await cmsLogin(name.trim(), password)
         mapUser(data)
         toast.success(`Welcome, ${data.name}!`)
         router.push('/admin')
         router.refresh()
      } catch {
         toast.error('Bad username or password')
      } finally {
         setSubmitting(false)
      }
   }

   if (portalLoading || sessionBusy) {
      return (
         <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking session…</p>
         </div>
      )
   }

   return (
      <div className="flex min-h-screen flex-col bg-background">

         <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-md">
               <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Admin login</CardTitle>
                  <CardDescription>Use your portal curator or admin account.</CardDescription>
               </CardHeader>
               <CardContent>
                  {/* Standard login field names for browser password managers; CMS user form uses a different autocomplete section (`section-portal-cms-user`). */}
                  <form className="grid gap-4" onSubmit={onSubmit} autoComplete="on">
                     <div className="grid gap-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                           id="login-username"
                           name="username"
                           autoComplete="username"
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           disabled={submitting}
                        />
                     </div>
                     <div className="grid gap-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                           <Input
                              id="login-password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={submitting}
                              className="pr-10"
                           />
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                           >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </Button>
                        </div>
                     </div>
                     <Button type="submit" className="w-full" disabled={!name.trim() || !password || submitting}>
                        {submitting ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in…
                           </>
                        ) : (
                           'Sign in'
                        )}
                     </Button>
                     {contactEmail ? (
                        <p className="text-center text-sm text-muted-foreground">
                           <a
                              className="font-medium text-primary underline-offset-4 hover:underline"
                              href={`mailto:${contactEmail}?subject=${encodeURIComponent('Password help')}`}
                           >
                              Forgot your password?
                           </a>
                        </p>
                     ) : null}
                  </form>
               </CardContent>
            </Card>
         </div>
      </div>
   )
}
