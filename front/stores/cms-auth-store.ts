'use client'

import { create } from 'zustand'

/** Non-security UX hint (tab-scoped): last successful CMS login in this tab. */
export const CMS_LOGIN_HINT_KEY = 'cms_login_hint'

export type CmsSessionUser = {
   name: string
   role: string
   email?: string
   species?: string[]
}

type CmsAuthState = {
   /** True only after `mapUser` from a verified session or login response — never from storage. */
   isAuthenticated: boolean
   userName: string
   userRole: string
   userEmail: string
   userSpecies: string[]
   mapUser: (data: CmsSessionUser) => void
   clearAuthState: () => void
   setAuth: (value: boolean) => void
}

export const useCmsAuthStore = create<CmsAuthState>((set) => ({
   isAuthenticated: false,
   userName: '',
   userRole: '',
   userEmail: '',
   userSpecies: [],

   mapUser(data: CmsSessionUser) {
      const species =
         data.role !== 'Admin' && Array.isArray(data.species)
            ? data.species.map(String)
            : []
      set({
         userName: String(data.name ?? ''),
         userRole: String(data.role ?? ''),
         userEmail: typeof data.email === 'string' ? data.email : '',
         userSpecies: species,
         isAuthenticated: true,
      })
      if (typeof sessionStorage !== 'undefined') {
         sessionStorage.setItem(CMS_LOGIN_HINT_KEY, '1')
      }
   },

   clearAuthState() {
      set({
         userName: '',
         userRole: '',
         userEmail: '',
         userSpecies: [],
         isAuthenticated: false,
      })
      if (typeof sessionStorage !== 'undefined') {
         sessionStorage.removeItem(CMS_LOGIN_HINT_KEY)
      }
   },

   setAuth(value: boolean) {
      set({ isAuthenticated: value })
   },
}))
