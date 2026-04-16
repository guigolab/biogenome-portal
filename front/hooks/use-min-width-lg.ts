'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
   const mq = window.matchMedia(QUERY)
   mq.addEventListener('change', onChange)
   return () => mq.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
   return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
   return false
}

/** Matches Tailwind `lg` (1024px). Server snapshot is false (mobile-first). */
export function useMinWidthLg(): boolean {
   return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
