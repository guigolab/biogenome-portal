/** Human-readable message from API error bodies (parity with Vue useApiFeedback). */
export function extractApiMessage(error: unknown, fallback = 'Something went wrong.'): string {
   if (typeof error === 'string' && error.trim()) return error

   if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      const data = err.response as Record<string, unknown> | undefined
      const body = data?.data ?? err.data

      if (typeof body === 'string' && body.trim()) return body
      if (body && typeof body === 'object') {
         const d = body as Record<string, unknown>
         if (typeof d.message === 'string' && d.message.trim()) return d.message
         if (typeof d.detail === 'string' && d.detail.trim()) return d.detail
         if (typeof d.description === 'string' && d.description.trim()) return d.description
         if (Array.isArray(d.errors) && d.errors.length) {
            const first = d.errors[0]
            return typeof first === 'string' ? first : JSON.stringify(first)
         }
         const values = Object.values(d).filter((v) => typeof v === 'string') as string[]
         if (values.length) return values.join(' · ')
      }
      if (typeof err.message === 'string' && err.message !== 'Network Error') return err.message
   }

   return fallback
}
