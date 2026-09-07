import { cmsFetchJson, cmsFetchOrThrow } from '@/lib/cms/fetch'

/** Catalog row for a funding/scientific authority (CBP: Principal Investigator). */
export type CmsOrganismPrincipal = {
   slug: string
   name: string
   affiliations: string[]
   programs: string[]
   email?: string | null
   metadata?: Record<string, unknown>
}

export type CmsOrganismPrincipalOption = {
   slug: string
   name: string
}

export async function cmsGetOrganismPrincipals(
   params: Record<string, string | number | boolean | undefined>,
) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<{ data?: CmsOrganismPrincipal[]; total?: number }>(
      `/organism_principals${q ? `?${q}` : ''}`,
   )
}

export async function cmsGetOrganismPrincipal(slug: string) {
   return cmsFetchJson<CmsOrganismPrincipal>(`/organism_principals/${encodeURIComponent(slug)}`)
}

export async function cmsGetOrganismPrincipalOptions() {
   return cmsFetchJson<CmsOrganismPrincipalOption[]>('/organism_principals/options')
}

export async function cmsCreateOrganismPrincipal(data: Record<string, unknown>) {
   const res = await cmsFetchOrThrow('/organism_principals', { method: 'POST', body: JSON.stringify(data) })
   return res.json().catch(() => ({}))
}

export async function cmsUpdateOrganismPrincipal(slug: string, data: Record<string, unknown>) {
   const res = await cmsFetchOrThrow(`/organism_principals/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
   })
   return res.json().catch(() => ({}))
}

export async function cmsDeleteOrganismPrincipal(slug: string) {
   await cmsFetchOrThrow(`/organism_principals/${encodeURIComponent(slug)}`, { method: 'DELETE' })
}
