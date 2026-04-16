import type { CmsSessionUser } from '@/stores/cms-auth-store'
import { cmsFetch, cmsFetchBlob, cmsFetchJson } from '@/lib/cms/fetch'
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
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Bad user or password')
   }
   const raw = (await res.json()) as Record<string, unknown>
   return toCmsSessionUser(raw)
}

/** GET /login — current session user or throws. */
export async function cmsCheckSession(): Promise<CmsSessionUser> {
   const res = await cmsFetch('/login', { method: 'GET', skipAuthRedirect: true })
   if (!res.ok) {
      const err = new Error(String(res.status)) as Error & { status: number }
      err.status = res.status
      throw err
   }
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
   const res = await cmsFetch(`/users/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Update failed')
   }
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
   const res = await cmsFetch(`/users/${encodeURIComponent(name)}`, { method: 'DELETE' })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Delete failed')
   }
}

export async function cmsCreateUser(data: Record<string, unknown>) {
   const res = await cmsFetch('/users', { method: 'POST', body: JSON.stringify(data) })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Create failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsUpdateUser(name: string, data: Record<string, unknown>) {
   const res = await cmsFetch(`/users/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Update failed')
   }
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
   const res = await cmsFetch('/organisms', { method: 'POST', body: JSON.stringify(form) })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Create failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsUpdateOrganism(taxid: string, form: Record<string, unknown>) {
   const res = await cmsFetch(`/organisms/${encodeURIComponent(taxid)}`, {
      method: 'PUT',
      body: JSON.stringify(form),
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Update failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsDeleteItem(model: DataModels, id: string) {
   const res = await cmsFetch(`/${model}/${encodeURIComponent(id)}`, { method: 'DELETE' })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Delete failed')
   }
}

export async function cmsCreateDeletionRequest(taxid: string) {
   const res = await cmsFetch(`/organism_deletion_requests/${encodeURIComponent(taxid)}`, {
      method: 'POST',
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Request failed')
   }
}

export async function cmsDeleteDeletionRequest(taxid: string) {
   const res = await cmsFetch(`/organism_deletion_requests/${encodeURIComponent(taxid)}`, {
      method: 'DELETE',
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Deny failed')
   }
}

export async function cmsImportSpreadsheet(formData: FormData) {
   const res = await cmsFetch('/local_samples/upload', { method: 'POST', body: formData })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Upload failed')
   }
   return res.json() as Promise<{ id: string; state?: string; status_url?: string }>
}

export async function cmsImportGoatReport(formData: FormData) {
   const res = await cmsFetch('/goat_report', { method: 'POST', body: formData })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Upload failed')
   }
   return res.json() as Promise<{ id: string; state?: string }>
}

export async function cmsTaskStatus(id: string) {
   return cmsFetchJson<Record<string, unknown>>(`/tasks/${encodeURIComponent(id)}`)
}

export async function cmsCreateAnnotation(form: Record<string, unknown>) {
   const res = await cmsFetch('/annotations', { method: 'POST', body: JSON.stringify(form) })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Create failed')
   }
   return res.json().catch(() => ({}))
}

/** Multipart create (file upload + fields); do not set Content-Type manually. */
export async function cmsCreateAnnotationFormData(formData: FormData) {
   const res = await cmsFetch('/annotations', { method: 'POST', body: formData })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Create failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsUpdateAnnotation(name: string, form: Record<string, unknown>) {
   const res = await cmsFetch(`/annotations/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(form),
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Update failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsLookupPublication(source: string, id: string) {
   const sp = new URLSearchParams({ source, id })
   return cmsFetchJson<Record<string, unknown>>(`/publications/lookup?${sp.toString()}`)
}

export async function cmsImportAssembly(accession: string) {
   const res = await cmsFetch(`/assemblies/${encodeURIComponent(accession)}`, { method: 'POST' })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Import failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsImportBioSample(accession: string) {
   const res = await cmsFetch(`/biosamples/${encodeURIComponent(accession)}`, { method: 'POST' })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Import failed')
   }
   return res.json().catch(() => ({}))
}

export async function cmsImportRead(accession: string) {
   const res = await cmsFetch(`/reads/${encodeURIComponent(accession)}`, { method: 'POST' })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || 'Import failed')
   }
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
   const res = await cmsFetch(`/${model}/${encodeURIComponent(id)}`)
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(text.trim() || `${res.status}`) as Error & { status: number }
      err.status = res.status
      throw err
   }
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
