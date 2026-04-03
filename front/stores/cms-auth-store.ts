'use client'

import { create } from 'zustand'

const AUTH_KEY = 'auth'

export type CmsSessionUser = {
   name: string
   role: string
   email?: string
   species?: string[]
}

type CmsAuthState = {
   isAuthenticated: boolean
   userName: string
   userRole: string
   userEmail: string
   userSpecies: string[]
   mapUser: (data: CmsSessionUser) => void
   clearAuthState: () => void
   setAuth: (value: boolean) => void
}

function readAuthHint(): boolean {
   if (typeof localStorage === 'undefined') return false
   return localStorage.getItem(AUTH_KEY) === 'true'
}

export const useCmsAuthStore = create<CmsAuthState>((set) => ({
   isAuthenticated: typeof window !== 'undefined' ? readAuthHint() : false,
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
      if (typeof localStorage !== 'undefined') {
         localStorage.setItem(AUTH_KEY, 'true')
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
      if (typeof localStorage !== 'undefined') {
         localStorage.setItem(AUTH_KEY, 'false')
      }
   },

   setAuth(value: boolean) {
      set({ isAuthenticated: value })
      if (typeof localStorage !== 'undefined') {
         localStorage.setItem(AUTH_KEY, value ? 'true' : 'false')
      }
   },
}))
