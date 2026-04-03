import type { LucideIcon } from 'lucide-react'
import {
   Database,
   FlaskConical,
   Layers,
   List,
   MapPin,
   Microscope,
   type LucideProps,
} from 'lucide-react'

import type { DataModels } from '@/lib/portal/types'

/**
 * Lucide icons aligned with the home stats strip (Vue `iconMap` / catalog models).
 * organisms → list, assemblies → database, biosamples → flask, reads → microscope.
 */
export const modelLucideMap: Partial<Record<DataModels, LucideIcon>> = {
   organisms: List,
   assemblies: Database,
   biosamples: FlaskConical,
   reads: Microscope,
   local_samples: MapPin,
   annotations: Layers,
   submitted_biosamples: FlaskConical,
}

export function ModelIcon({
   modelKey,
   className,
   ...rest
}: { modelKey: DataModels } & LucideProps) {
   const Icon = modelLucideMap[modelKey] ?? Layers
   return <Icon className={className} aria-hidden {...rest} />
}
