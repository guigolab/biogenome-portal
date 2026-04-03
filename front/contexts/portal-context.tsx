'use client'

import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react'

import {
   applyPortalThemeToDocument,
   clearPortalThemeInlineStyles,
   defaultPortalConfig,
   fetchPortalConfig,
   normalizePortalConfig,
   normalizeUiColors,
   type AppConfig,
   type PortalConfig,
} from '@/lib/portal'
import { applyPortalGeneralRuntime } from '@/lib/portal/apiRuntime'

type PortalContextValue = {
   config: AppConfig | null
   raw: PortalConfig | null
   loading: boolean
   error: string | null
   reload: () => Promise<void>
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
   const [config, setConfig] = useState<AppConfig | null>(null)
   const [raw, setRaw] = useState<PortalConfig | null>(null)
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)

   const load = useCallback(async () => {
      setLoading(true)
      setError(null)
      let rawConfig: PortalConfig
      try {
         rawConfig = await fetchPortalConfig()
      } catch (e) {
         const msg = e instanceof Error ? e.message : String(e)
         setError(msg)
         rawConfig = defaultPortalConfig
      }
      applyPortalGeneralRuntime(rawConfig.general)
      const app = normalizePortalConfig(rawConfig, normalizeUiColors)
      setRaw(rawConfig)
      setConfig(app)
      setLoading(false)
   }, [])

   useEffect(() => {
      void load()
   }, [load])

   useEffect(() => {
      if (!config || typeof document === 'undefined') return
      applyPortalThemeToDocument(document.documentElement, config, raw)
      return () => {
         clearPortalThemeInlineStyles(document.documentElement)
      }
   }, [config, raw])

   const value = useMemo(
      () => ({
         config,
         raw,
         loading,
         error,
         reload: load,
      }),
      [config, raw, loading, error, load],
   )

   return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortalConfig(): PortalContextValue {
   const ctx = useContext(PortalContext)
   if (!ctx) throw new Error('usePortalConfig must be used within PortalProvider')
   return ctx
}
