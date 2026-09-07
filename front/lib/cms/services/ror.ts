import { cmsFetchJson } from '@/lib/cms/fetch'

/** Slim ROR organization shape returned by `/api/ror/search` and `/api/ror/validate`. */
export type RorOrganization = {
   ror_id: string
   name: string
   country?: string | null
   types: string[]
   status?: string | null
}

export type RorSearchResponse = {
   items?: RorOrganization[]
   error?: string
}

export type RorValidateResponse = {
   valid: boolean
   data?: RorOrganization | Record<string, never>
   error?: string
}

export async function cmsSearchRorOrganizations(query: string, limit = 8) {
   const sp = new URLSearchParams({ query, limit: String(limit) })
   return cmsFetchJson<RorSearchResponse>(`/ror/search?${sp.toString()}`)
}

export async function cmsValidateRorOrganization(value: string) {
   return cmsFetchJson<RorValidateResponse>('/ror/validate', {
      method: 'POST',
      body: JSON.stringify({ value }),
   })
}
