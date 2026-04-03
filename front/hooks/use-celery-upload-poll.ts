'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cmsTaskStatus } from '@/lib/cms/services/auth'

export type TaskPhase = 'idle' | 'queued' | 'running' | 'success' | 'error'

type TaskPayload = Record<string, unknown> & { messages?: string[] }

const POLL_MS = 3000
const MAX_IDLE_POLLS = 20

function extractMessages(data: TaskPayload): string[] {
   if (Array.isArray(data.messages) && data.messages.length) return data.messages.map(String)
   const ready = data.ready
   if (ready) {
      if (data.successful) {
         const r = data.result
         if (r && typeof r === 'object' && !Array.isArray(r) && 'messages' in r) {
            const m = (r as { messages?: unknown }).messages
            if (Array.isArray(m)) return m.map(String)
            return Object.values(r as Record<string, unknown>).map(String)
         }
         if (typeof r === 'string') return [r]
         return []
      }
      const e = data.error
      if (e && typeof e === 'object' && 'messages' in e) {
         const m = (e as { messages?: unknown }).messages
         if (Array.isArray(m)) return m.map(String)
         return Object.values(e as Record<string, unknown>).map(String)
      }
      if (typeof e === 'string') return [e]
   }
   const info = data.info
   if (info && typeof info === 'object' && 'messages' in info) {
      const m = (info as { messages?: unknown }).messages
      if (Array.isArray(m)) return m.map(String)
   }
   if (typeof data.hint === 'string') return [data.hint]
   return []
}

function toPhase(data: TaskPayload): TaskPhase {
   if (!data.state) return 'idle'
   if (data.ready) return data.successful ? 'success' : 'error'
   const s = String(data.state)
   if (s === 'FAILURE' || s === 'ERROR') return 'error'
   if (s === 'PENDING') return 'queued'
   return 'running'
}

export function useCeleryUploadPoll() {
   const [messages, setMessages] = useState<string[]>([])
   const [phase, setPhase] = useState<TaskPhase>('idle')
   const [isPolling, setIsPolling] = useState(false)
   const [taskData, setTaskData] = useState<TaskPayload | null>(null)

   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
   const taskIdRef = useRef<string | null>(null)
   const idlePollCount = useRef(0)

   const stopPoll = useCallback(() => {
      if (intervalRef.current) {
         clearInterval(intervalRef.current)
         intervalRef.current = null
      }
      taskIdRef.current = null
      setIsPolling(false)
   }, [])

   const fetchStatus = useCallback(async () => {
      const id = taskIdRef.current
      if (!id) return

      let data: TaskPayload
      try {
         data = (await cmsTaskStatus(id)) as TaskPayload
      } catch {
         stopPoll()
         setPhase('error')
         setMessages(['Lost connection to task; please refresh and try again.'])
         return
      }

      const p = toPhase(data)
      setTaskData(data)
      const msgs = extractMessages(data)
      if (msgs.length) setMessages(msgs)
      setPhase(p)

      const isTerminal = p === 'success' || p === 'error'
      if (!isTerminal && (data.state === 'FAILURE' || data.state === 'ERROR')) {
         setPhase('error')
         stopPoll()
         toast.error('Job failed')
         return
      }

      if (isTerminal) {
         stopPoll()
         if (p === 'success') toast.success('Job completed successfully.')
         else toast.error('Job failed')
         return
      }

      if (data.state === 'PENDING' && !data.info) {
         idlePollCount.current++
         if (idlePollCount.current >= MAX_IDLE_POLLS) {
            stopPoll()
            setPhase('error')
            setMessages(['Job is still queued after a long wait. It may have failed to start.'])
            toast.error('Job timed out waiting to start')
         }
      } else {
         idlePollCount.current = 0
      }
   }, [stopPoll])

   const startPoll = useCallback(
      (id: string) => {
         stopPoll()
         taskIdRef.current = id
         setTaskData(null)
         setMessages([])
         idlePollCount.current = 0
         setPhase('queued')
         setIsPolling(true)
         void fetchStatus()
         intervalRef.current = setInterval(() => void fetchStatus(), POLL_MS)
      },
      [stopPoll, fetchStatus],
   )

   const reset = useCallback(() => {
      stopPoll()
      setMessages([])
      setTaskData(null)
      setPhase('idle')
      idlePollCount.current = 0
   }, [stopPoll])

   useEffect(() => () => stopPoll(), [stopPoll])

   return { messages, phase, isPolling, taskData, startPoll, stopPoll, reset }
}
