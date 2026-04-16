import { getApiBase } from '@/lib/api/taxon'
import { normalizeOrganismImageLicenseFromApi } from '@/lib/cms/organism-image-license-options'
import { cmsFetch, cmsFetchJson } from '@/lib/cms/fetch'
import type { OrganismImageRow } from '@/stores/organism-form-store'

interface SuggestJobResponse {
   task_id: string
   status_url: string
   message: string
}

interface TaskStatusResponse {
   task_id: string
   state: string
   ready: boolean
   successful: boolean | null
   failed?: boolean
   result?: { status: string; images: OrganismImageRow[] }
   error?: { message?: string; type?: string } | string
}

export async function triggerSuggestImages(
   scientific_name: string,
   max_images = 12,
): Promise<SuggestJobResponse> {
   return cmsFetchJson<SuggestJobResponse>('/organisms/suggest_external_images', {
      method: 'POST',
      body: JSON.stringify({ scientific_name, max_images }),
   })
}

export async function pollTaskStatus(taskId: string): Promise<TaskStatusResponse> {
   const base = getApiBase()
   const res = await fetch(`${base}/tasks/${taskId}`)
   if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
   return res.json() as Promise<TaskStatusResponse>
}

const POLL_INTERVALS_MS = [1000, 2000, 3000, 4000, 4000, 4000, 5000]
const MAX_WAIT_MS = 90_000

export async function pollUntilReady(taskId: string): Promise<TaskStatusResponse> {
   const deadline = Date.now() + MAX_WAIT_MS
   let attempt = 0
   while (Date.now() < deadline) {
      const status = await pollTaskStatus(taskId)
      if (status.ready) return status
      const wait = POLL_INTERVALS_MS[Math.min(attempt, POLL_INTERVALS_MS.length - 1)]
      await new Promise((r) => setTimeout(r, wait))
      attempt++
   }
   throw new Error('Image suggestion timed out. The job may still be running — try again later.')
}

export function mergeImageRows(
   existing: OrganismImageRow[],
   incoming: OrganismImageRow[],
): OrganismImageRow[] {
   const existingUrls = new Set(existing.map((r) => r.url).filter(Boolean))
   const novel = incoming
      .filter((r) => r.url && !existingUrls.has(r.url))
      .map((r) => normalizeOrganismImageLicenseFromApi(r))
   return [...existing, ...novel]
}
