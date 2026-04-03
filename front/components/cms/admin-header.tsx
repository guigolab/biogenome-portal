'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Dna, Home, LayoutDashboard, LogOut, Pencil, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cmsLogout, cmsUpdateSelf } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { toast } from 'sonner'

export function AdminHeader() {
   const router = useRouter()
   const userName = useCmsAuthStore((s) => s.userName)
   const userRole = useCmsAuthStore((s) => s.userRole)
   const userEmail = useCmsAuthStore((s) => s.userEmail)
   const clearAuthState = useCmsAuthStore((s) => s.clearAuthState)
   const mapUser = useCmsAuthStore((s) => s.mapUser)

   const isAdmin = userRole === 'Admin'
   const [profileOpen, setProfileOpen] = useState(false)
   const [email, setEmail] = useState('')
   const [password, setPassword] = useState('')
   const [saving, setSaving] = useState(false)

   async function handleLogout() {
      try {
         await cmsLogout()
      } finally {
         clearAuthState()
         router.push('/')
      }
   }

   function openProfile() {
      setEmail(userEmail ?? '')
      setPassword('')
      setProfileOpen(true)
   }

   async function saveProfile() {
      if (!email.trim() && !password.trim()) {
         toast.message('Change email or password, or leave blank to keep current values.')
         return
      }
      setSaving(true)
      try {
         const payload: { email?: string; password?: string } = {}
         if (email.trim()) payload.email = email.trim()
         if (password.trim()) payload.password = password.trim()
         await cmsUpdateSelf(userName, payload)
         if (payload.email) mapUser({ name: userName, role: userRole, email: payload.email })
         toast.success('Profile updated.')
         setProfileOpen(false)
      } catch (e) {
         toast.error(e instanceof Error ? e.message : 'Update failed')
      } finally {
         setSaving(false)
      }
   }

   return (
      <>
         <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
               <div className="flex h-16 items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                     <Link
                        href="/admin"
                        className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-foreground"
                     >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                           <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="hidden sm:inline">Admin</span>
                     </Link>
                     <nav className="flex items-center gap-1 border-l border-border pl-3">
                        <Button variant="ghost" size="sm" asChild>
                           <Link href="/" className="gap-2">
                              <Home className="h-4 w-4" />
                              Home
                           </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                           <Link href="/admin" className="gap-2">
                              <Dna className="h-4 w-4" />
                              Dashboard
                           </Link>
                        </Button>
                     </nav>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                     {!isAdmin ? (
                        <Button
                           variant="outline"
                           size="sm"
                           className="max-w-[200px] gap-2"
                           onClick={openProfile}
                           title={`Edit profile for ${userName}`}
                        >
                           <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {(userName?.charAt(0) ?? '?').toUpperCase()}
                           </span>
                           <span className="truncate">{userName}</span>
                        </Button>
                     ) : (
                        <span className="flex max-w-[200px] items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm">
                           <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {(userName?.charAt(0) ?? '?').toUpperCase()}
                           </span>
                           <span className="truncate font-medium">{userName}</span>
                        </span>
                     )}
                     <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                     </Button>
                  </div>
               </div>
            </div>
         </header>

         <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <User className="h-5 w-5" />
                     Edit profile
                  </DialogTitle>
                  <DialogDescription>
                     Update your email or password. Leave a field blank to keep its current value.
                  </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                     <Label htmlFor="cms-profile-email">Email</Label>
                     <Input
                        id="cms-profile-email"
                        type="email"
                        autoComplete="email"
                        placeholder="New email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="cms-profile-password">New password</Label>
                     <Input
                        id="cms-profile-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Leave blank to keep current"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                     />
                  </div>
               </div>
               <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                     Cancel
                  </Button>
                  <Button
                     type="button"
                     disabled={saving || (!email.trim() && !password.trim())}
                     onClick={saveProfile}
                     className="gap-2"
                  >
                     <Pencil className="h-4 w-4" />
                     Save
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   )
}
