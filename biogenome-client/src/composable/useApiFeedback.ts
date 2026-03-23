import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios'

type FeedbackColor = 'success' | 'warning' | 'danger' | 'info'

/**
 * Extracts a human-readable message string from an unknown API error payload.
 * Handles: string, { message }, { detail }, { description }, { errors: [] }, AxiosError.
 */
export function extractApiMessage(error: unknown, fallback = 'Something went wrong.'): string {
   if (typeof error === 'string' && error.trim()) return error

   const ax = error as AxiosError
   const data = ax?.response?.data

   if (typeof data === 'string' && data.trim()) return data

   if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>
      if (typeof d.message === 'string' && d.message.trim()) return d.message
      if (typeof d.detail === 'string' && d.detail.trim()) return d.detail
      if (typeof d.description === 'string' && d.description.trim()) return d.description
      if (Array.isArray(d.errors) && d.errors.length) {
         const first = d.errors[0]
         return typeof first === 'string' ? first : JSON.stringify(first)
      }
      // Last resort: join all string values
      const values = Object.values(d).filter((v) => typeof v === 'string')
      if (values.length) return (values as string[]).join(' · ')
   }

   if (ax?.message && ax.message !== 'Network Error') return ax.message
   return fallback
}

/**
 * Composable that wraps useToast with standardised message extraction.
 * Usage:
 *   const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useApiFeedback()
 */
export function useApiFeedback() {
   const { init } = useToast()

   function notify(message: string, color: FeedbackColor) {
      init({ message, color })
   }

   function notifySuccess(message: string) {
      notify(message, 'success')
   }

   function notifyError(error: unknown, fallback?: string) {
      const message = extractApiMessage(error, fallback)
      notify(message, 'danger')
   }

   function notifyWarning(message: string) {
      notify(message, 'warning')
   }

   function notifyInfo(message: string) {
      notify(message, 'info')
   }

   return { notifySuccess, notifyError, notifyWarning, notifyInfo, extractApiMessage }
}
