import type { CmsSessionUser } from '@/stores/cms-auth-store'
import { cmsFetch, cmsFetchBlob, cmsFetchJson, cmsFetchOrThrow, throwCmsFetchError } from '@/lib/cms/fetch'
import type { DataModels } from '@/lib/portal/types'

/**
 * Login JSON may include `access_token` for non-browser clients; the CMS UI uses HttpOnly cookies only.
 * Strip secrets so they are never held in React state, zustand, or accidentally logged.
 */
function toCmsSessionUser(raw: Record<string, unknown>): CmsSessionUser {
   return {
      name: String(raw.name ?? ''),
      role: String(raw.role ?? ''),
      email: typeof raw.email === 'string' ? raw.email : undefined,
      species: Array.isArray(raw.species) ? raw.species.map(String) : undefined,
   }
}

export async function cmsLogin(name: string, password: string): Promise<CmsSessionUser> {
   const res = await cmsFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
      skipAuthRedirect: true,
   })
   if (!res.ok) await throwCmsFetchError(res, 'Bad user or password')
   const raw = (await res.json()) as Record<string, unknown>
   return toCmsSessionUser(raw)
}

/** GET /login — current session user or throws. */
export async function cmsCheckSession(): Promise<CmsSessionUser> {
   const res = await cmsFetch('/login', { method: 'GET', skipAuthRedirect: true })
   if (!res.ok) await throwCmsFetchError(res, String(res.status))
   const raw = (await res.json()) as Record<string, unknown>
   return toCmsSessionUser(raw)
}

export async function cmsLogout(): Promise<void> {
   await cmsFetch('/logout', { method: 'GET' }).catch(() => {})
}

export async function cmsUpdateSelf(
   name: string,
   payload: { email?: string; password?: string },
): Promise<void> {
   await cmsFetchOrThrow(`/users/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
   })
}

export async function cmsGetUsers(params: Record<string, string | number | undefined>) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<{ data?: Record<string, unknown>[]; total?: number }>(
      `/users${q ? `?${q}` : ''}`,
   )
}

export async function cmsGetUser(name: string) {
   return cmsFetchJson<Record<string, unknown>>(`/users/${encodeURIComponent(name)}`)
}

export async function cmsDeleteUser(name: string) {
   await cmsFetchOrThrow(`/users/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

export async function cmsCreateUser(data: Record<string, unknown>) {
   const res = await cmsFetchOrThrow('/users', { method: 'POST', body: JSON.stringify(data) })
   return res.json().catch(() => ({}))
}

export async function cmsUpdateUser(name: string, data: Record<string, unknown>) {
   const res = await cmsFetchOrThrow(`/users/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
   })
   return res.json().catch(() => ({}))
}

/** Add a species taxid to a Data Manager’s `species` list (admin workflow). */
export async function cmsAssignSpeciesToUser(userName: string, taxid: string) {
   const u = await cmsGetUser(userName)
   const role = String(u.role ?? '')
   if (role !== 'DataManager') {
      throw new Error('Only Data Manager accounts can be assigned species.')
   }
   const existing = Array.isArray(u.species) ? u.species.map(String) : []
   const tid = String(taxid)
   if (existing.includes(tid)) return
   const species = [...existing, tid]
   await cmsUpdateUser(userName, {
      name: String(u.name ?? userName),
      role: 'DataManager',
      email: String(u.email ?? ''),
      species,
   })
}

/** Remove a species taxid from a Data Manager’s `species` list. */
export async function cmsUnassignSpeciesFromUser(userName: string, taxid: string) {
   const u = await cmsGetUser(userName)
   const role = String(u.role ?? '')
   if (role !== 'DataManager') {
      throw new Error('Only Data Manager accounts hold species assignments.')
   }
   const tid = String(taxid)
   const species = (Array.isArray(u.species) ? u.species.map(String) : []).filter((t) => t !== tid)
   await cmsUpdateUser(userName, {
      name: String(u.name ?? userName),
      role: 'DataManager',
      email: String(u.email ?? ''),
      species,
   })
}

export async function cmsGetUserRelatedData(name: string) {
   return cmsFetchJson<Partial<Record<DataModels, number>>>(
      `/users/${encodeURIComponent(name)}/lookup`,
   )
}

export async function cmsGetUserSpecies(name: string, params: Record<string, string | number | undefined>) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<{ data?: Record<string, unknown>[]; total?: number }>(
      `/users/${encodeURIComponent(name)}/organisms${q ? `?${q}` : ''}`,
   )
}

export async function cmsGetUserSamples(name: string, params: Record<string, string | number | undefined>) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<{ data?: Record<string, unknown>[]; total?: number }>(
      `/users/${encodeURIComponent(name)}/local_samples${q ? `?${q}` : ''}`,
   )
}

export async function cmsCreateOrganism(form: Record<string, unknown>) {
   const res = await cmsFetchOrThrow('/organisms', { method: 'POST', body: JSON.stringify(form) })
   return res.json().catch(() => ({}))
}

export async function cmsUpdateOrganism(taxid: string, form: Record<string, unknown>) {
   const res = await cmsFetchOrThrow(`/organisms/${encodeURIComponent(taxid)}`, {
      method: 'PUT',
      body: JSON.stringify(form),
   })
   return res.json().catch(() => ({}))
}

/** PATCH a single organism field (e.g. goat_status, target_list_status). */
export async function cmsPatchOrganism(taxid: string, field: string, value: unknown) {
   await cmsFetchOrThrow(`/organisms/${encodeURIComponent(taxid)}`, {
      method: 'PATCH',
      body: JSON.stringify({ field, value }),
   })
}

export async function cmsDeleteItem(model: DataModels, id: string) {
   await cmsFetchOrThrow(`/${model}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function cmsCreateDeletionRequest(taxid: string) {
   await cmsFetchOrThrow(`/organism_deletion_requests/${encodeURIComponent(taxid)}`, {
      method: 'POST',
   })
}

export async function cmsDeleteDeletionRequest(taxid: string) {
   await cmsFetchOrThrow(`/organism_deletion_requests/${encodeURIComponent(taxid)}`, {
      method: 'DELETE',
   })
}

export async function cmsTaskStatus(id: string) {
   return cmsFetchJson<Record<string, unknown>>(`/tasks/${encodeURIComponent(id)}`)
}

export async function cmsCreateAnnotation(form: Record<string, unknown>) {
   const res = await cmsFetchOrThrow('/annotations', { method: 'POST', body: JSON.stringify(form) })
   return res.json().catch(() => ({}))
}

/** Multipart create (file upload + fields); do not set Content-Type manually. */
export async function cmsCreateAnnotationFormData(formData: FormData) {
   const res = await cmsFetchOrThrow('/annotations', { method: 'POST', body: formData })
   return res.json().catch(() => ({}))
}

export async function cmsUpdateAnnotation(name: string, form: Record<string, unknown>) {
   const res = await cmsFetchOrThrow(`/annotations/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(form),
   })
   return res.json().catch(() => ({}))
}

export async function cmsLookupPublication(source: string, id: string) {
   const sp = new URLSearchParams({ source, id })
   return cmsFetchJson<Record<string, unknown>>(`/publications/lookup?${sp.toString()}`)
}

/** Normalized Europe PMC hit returned by POST /publications/validate when valid. */
export type CmsPublicationMetadata = {
   title?: string
   authors?: string
   journal?: string
   year?: string
   doi?: string
   pmid?: string
   pmcid?: string
   abstract?: string
}

export type CmsPublicationValidation = {
   valid: boolean
   data?: CmsPublicationMetadata
   error?: string
}

/**
 * Validate a publication against the supported sources (DOI, PubMed, PubMed Central).
 * Pass `field: 'genome_publication'` + `taxid` to also enforce the "must have a
 * linked assembly" gate server-side (returns a rejected promise with status 400 if
 * no assembly is linked).
 */
export async function cmsValidatePublication(
   source: string,
   id: string,
   opts?: { taxid?: string; field?: 'genome_publication' | 'publications' },
): Promise<CmsPublicationValidation> {
   const res = await cmsFetchOrThrow('/publications/validate', {
      method: 'POST',
      body: JSON.stringify({ source, id, taxid: opts?.taxid, field: opts?.field }),
   })
   return res.json() as Promise<CmsPublicationValidation>
}

export async function cmsImportAssembly(accession: string) {
   const res = await cmsFetchOrThrow(`/assemblies/${encodeURIComponent(accession)}`, { method: 'POST' })
   return res.json().catch(() => ({}))
}

export async function cmsImportBioSample(accession: string) {
   const res = await cmsFetchOrThrow(`/biosamples/${encodeURIComponent(accession)}`, { method: 'POST' })
   return res.json().catch(() => ({}))
}

export async function cmsImportRead(accession: string) {
   const res = await cmsFetchOrThrow(`/reads/${encodeURIComponent(accession)}`, { method: 'POST' })
   return res.json().catch(() => ({}))
}

export async function cmsGetItems(
   model: DataModels,
   params: Record<string, string | number | boolean | undefined>,
) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<{ data?: Record<string, unknown>[]; total?: number }>(
      `/${model}${q ? `?${q}` : ''}`,
   )
}

export async function cmsGetItem(model: DataModels, id: string) {
   const res = await cmsFetchOrThrow(`/${model}/${encodeURIComponent(id)}`)
   return res.json() as Promise<Record<string, unknown>>
}

export async function cmsGetItemsTsv(
   model: DataModels,
   params: Record<string, string | number | boolean | undefined>,
) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   return cmsFetchBlob(`/${model}?${sp.toString()}`)
}

type OrganismListJson = { data?: Record<string, unknown>[]; total?: number }

export type CmsOrganismAuditLogAction =
   | 'create'
   | 'update'
   | 'patch'
   | 'delete'
   | 'request_deletion'
   | 'deny_deletion'
   | string

export type CmsOrganismAuditLogRow = {
   _id?: unknown
   action: CmsOrganismAuditLogAction
   user: string
   timestamp?: string
   previous_object?: Record<string, unknown> | null
   new_object?: Record<string, unknown> | null
   taxid: string
   scientific_name: string
}

export type CmsOrganismAuditLogsResponse = {
   total?: number
   limit?: number
   offset?: number
   data?: CmsOrganismAuditLogRow[]
}

export async function cmsGetOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download?: false,
): Promise<OrganismListJson>
export async function cmsGetOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download: true,
): Promise<Blob>
export async function cmsGetOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download = false,
): Promise<OrganismListJson | Blob> {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const path = `/organisms/with_users?${sp.toString()}`
   if (download) return cmsFetchBlob(path)
   return cmsFetchJson<OrganismListJson>(path)
}

export async function cmsGetAllOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download?: false,
): Promise<OrganismListJson>
export async function cmsGetAllOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download: true,
): Promise<Blob>
export async function cmsGetAllOrganismsWithUsers(
   params: Record<string, string | number | boolean | undefined>,
   download = false,
): Promise<OrganismListJson | Blob> {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const path = `/organisms/all_with_users?${sp.toString()}`
   if (download) return cmsFetchBlob(path)
   return cmsFetchJson<OrganismListJson>(path)
}

export async function cmsGetUnassignedOrganisms(
   params: Record<string, string | number | boolean | undefined>,
   download?: false,
): Promise<OrganismListJson>
export async function cmsGetUnassignedOrganisms(
   params: Record<string, string | number | boolean | undefined>,
   download: true,
): Promise<Blob>
export async function cmsGetUnassignedOrganisms(
   params: Record<string, string | number | boolean | undefined>,
   download = false,
): Promise<OrganismListJson | Blob> {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const path = `/organisms/unassigned?${sp.toString()}`
   if (download) return cmsFetchBlob(path)
   return cmsFetchJson<OrganismListJson>(path)
}

export type CmsOrganismAuditLogsParams = {
   q?: string
   action?: string
   date_from?: string
   date_to?: string
   limit?: number
   offset?: number
   sort_column?: string
   sort_order?: string
}

export async function cmsGetOrganismAuditLogs(params: CmsOrganismAuditLogsParams) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<CmsOrganismAuditLogsResponse>(`/organisms/audit_logs${q ? `?${q}` : ''}`)
}

export async function cmsGetOrganismAuditLogsByTaxid(
   taxid: string,
   params: Record<string, string | number | boolean | undefined>,
) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   const q = sp.toString()
   return cmsFetchJson<CmsOrganismAuditLogsResponse>(
      `/organisms/${encodeURIComponent(taxid)}/audit_logs${q ? `?${q}` : ''}`,
   )
}

export type CmsAdminOverviewStats = {
   assigned_species: number
   unassigned_species: number
   my_submitted_biosamples: number
   all_submitted_biosamples: number
   pending_deletion_requests: number
   goat_status: Record<string, number>
   target_list_status: Record<string, number>
}

export type CmsDataManagerOverviewStats = {
   assigned_species: number
   submitted_biosamples: number
   goat_status: Record<string, number>
   target_list_status: Record<string, number>
}

export async function cmsGetAdminOverviewStats() {
   return cmsFetchJson<CmsAdminOverviewStats>('/cms/stats/admin_overview')
}

export async function cmsGetDataManagerOverviewStats() {
   return cmsFetchJson<CmsDataManagerOverviewStats>('/cms/stats/data_manager_overview')
}

export async function cmsGetModelFieldStats(
   model: DataModels | 'taxons',
   field: string,
   query: Record<string, string | undefined>,
) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue
      sp.set(k, v)
   }
   const q = sp.toString()
   return cmsFetchJson<Record<string, number>>(`/stats/${model}/${field}${q ? `?${q}` : ''}`)
}

export async function cmsGetEnaChecklist() {
   return cmsFetchJson<{ checklist: Record<string, unknown> }>('/biosamples/checklist')
}

export async function cmsSubmitBiosample(payload: Record<string, unknown>) {
   const res = await cmsFetch('/biosamples/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
   })
   if (!res.ok) {
      const text = await res.text()
      let parsed: unknown
      try {
         parsed = JSON.parse(text)
      } catch {
         throw new Error(text || 'Submit failed')
      }
      if (Array.isArray(parsed)) {
         throw Object.assign(new Error('Validation'), { body: parsed })
      }
      if (parsed && typeof parsed === 'object') {
         const obj = parsed as Record<string, unknown>
         const message =
            (typeof obj.message === 'string' && obj.message) ||
            (typeof obj.description === 'string' && obj.description) ||
            text
         throw new Error(message || 'Submit failed')
      }
      throw new Error(text || 'Submit failed')
   }
   return res.text()
}

export async function cmsGetSubmittedBioSamples(params: Record<string, string | number | undefined>) {
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue
      sp.set(k, String(v))
   }
   return cmsFetchJson<{ data?: Record<string, unknown>[]; total?: number }>(
      `/biosamples/submit?${sp.toString()}`,
   )
}

/** GET /biosamples/submit/:accession — full submitted biosample document (characteristics, metadata). */
export async function cmsGetSubmittedBioSample(accession: string) {
   return cmsFetchJson<Record<string, unknown>>(
      `/biosamples/submit/${encodeURIComponent(accession)}`,
   )
}
