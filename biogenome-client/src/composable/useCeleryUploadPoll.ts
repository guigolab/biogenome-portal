import { ref, onUnmounted } from 'vue'
import { useApiFeedback } from './useApiFeedback'
import AuthService from '../services/AuthService'

export type TaskPhase = 'idle' | 'queued' | 'running' | 'success' | 'error'

interface TaskPayload {
   task_id?: string
   state?: string
   ready?: boolean
   successful?: boolean | null
   failed?: boolean
   result?: { messages?: string[] } | string | null
   error?: { messages?: string[] } | string | null
   info?: { messages?: string[] } | string | null
   hint?: string
   traceback?: string
   messages?: string[]
}

function extractMessages(data: TaskPayload & { messages?: string[] }): string[] {
   // Prefer server-computed convenience field when present
   if (Array.isArray(data.messages) && data.messages.length) {
      return data.messages
   }

   if (data.ready) {
      if (data.successful) {
         const r = data.result
         if (r && typeof r === 'object' && Array.isArray(r.messages)) return r.messages
         if (r && typeof r === 'object' && !Array.isArray(r)) return Object.values(r).map(String)
         if (typeof r === 'string') return [r]
         return []
      }
      const e = data.error
      if (e && typeof e === 'object' && Array.isArray(e.messages)) return e.messages
      if (e && typeof e === 'object' && !Array.isArray(e)) return Object.values(e).map(String)
      if (typeof e === 'string') return [e]
   }
   const info = data.info
   if (info && typeof info === 'object' && Array.isArray(info.messages)) return info.messages
   if (info && typeof info === 'object' && !Array.isArray(info)) return Object.values(info).map(String)
   if (typeof info === 'string') return [info]
   if (data.hint) return [data.hint]
   return []
}

function toPhase(data: TaskPayload): TaskPhase {
   if (!data.state) return 'idle'
   if (data.ready) {
      return data.successful ? 'success' : 'error'
   }
   const s = data.state
   if (s === 'FAILURE' || s === 'ERROR') return 'error'
   if (s === 'PENDING') return 'queued'
   return 'running'
}

const POLL_INTERVAL_MS = 3000
const MAX_IDLE_POLLS = 20 // give up after 60 s of pure PENDING with no info

export function useCeleryUploadPoll() {
   const { notifySuccess, notifyError } = useApiFeedback()

   const messages = ref<string[]>([])
   const phase = ref<TaskPhase>('idle')
   const isPolling = ref(false)
   const taskId = ref<string | null>(null)
   const taskData = ref<TaskPayload | null>(null)

   let intervalId: number | null = null
   let idlePollCount = 0

   function stopPoll() {
      if (intervalId !== null) {
         clearInterval(intervalId)
         intervalId = null
      }
      isPolling.value = false
   }

   async function fetchStatus() {
      if (!taskId.value) return

      let data: TaskPayload
      try {
         const res = await AuthService.taskStatus(taskId.value)
         data = res.data as TaskPayload
      } catch {
         stopPoll()
         phase.value = 'error'
         messages.value = ['Lost connection to task; please refresh and try again.']
         return
      }

      const p = toPhase(data)
      taskData.value = data
      const msgs = extractMessages(data)
      if (msgs.length) {
         messages.value = msgs
      }
      phase.value = p

      const isTerminal = p === 'success' || p === 'error'

      // Stop on known terminal Celery states even if `ready` flag is absent
      if (!isTerminal && (data.state === 'FAILURE' || data.state === 'ERROR')) {
         phase.value = 'error'
         stopPoll()
         notifyError(null, 'Job failed')
         return
      }

      if (isTerminal) {
         stopPoll()
         if (p === 'success') {
            notifySuccess('Job completed successfully.')
         } else {
            notifyError(null, 'Job failed')
         }
         return
      }

      // Back-off for stuck PENDING with no info
      if (data.state === 'PENDING' && !data.info) {
         idlePollCount++
         if (idlePollCount >= MAX_IDLE_POLLS) {
            stopPoll()
            phase.value = 'error'
            messages.value = ['Job is still queued after a long wait. It may have failed to start.']
            notifyError(null, 'Job timed out waiting to start')
         }
      } else {
         idlePollCount = 0
      }
   }

   function startPoll(id: string) {
      stopPoll()
      taskId.value = id
      taskData.value = null
      messages.value = []
      idlePollCount = 0
      phase.value = 'queued'
      isPolling.value = true
      intervalId = window.setInterval(fetchStatus, POLL_INTERVAL_MS)
   }

   function reset() {
      stopPoll()
      messages.value = []
      taskData.value = null
      phase.value = 'idle'
      taskId.value = null
      idlePollCount = 0
   }

   onUnmounted(stopPoll)

   return { messages, phase, isPolling, taskData, startPoll, stopPoll, reset }
}
