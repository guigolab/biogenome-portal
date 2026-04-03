'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

type TooltipPayload = {
   title: string
   rank?: string
   organismsCount: number
   assembliesCount: number
   annotationsCount: number
}

export function TaxonomyNodeTooltip({
   position,
   payload,
}: {
   position: { x: number; y: number }
   payload: TooltipPayload
}) {
   const [mounted, setMounted] = useState(false)
   useEffect(() => setMounted(true), [])

   const body = (
      <div
         className="pointer-events-none fixed z-[200] max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
         style={{
            left: position.x + 14,
            top: position.y - 14,
            transform: 'translate(0, -100%)',
         }}
      >
         <div className="font-semibold italic">{payload.title.replace(/_/g, ' ')}</div>
         {payload.rank ? (
            <div className="text-muted-foreground mt-1 text-xs capitalize">{payload.rank.replace(/_/g, ' ')}</div>
         ) : null}
         <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div>Organisms: {payload.organismsCount.toLocaleString()}</div>
            <div>Assemblies: {payload.assembliesCount.toLocaleString()}</div>
            <div>Annotations: {payload.annotationsCount.toLocaleString()}</div>
         </div>
      </div>
   )

   if (!mounted || typeof document === 'undefined') return null
   return createPortal(body, document.body)
}
