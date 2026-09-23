import { BookOpen, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
   publicationExternalUrl,
   publicationMetadataExternalUrl,
   type ParsedPublication,
} from '@/lib/publicationLinks'
import { cn } from '@/lib/utils'

function PublicationCard({
   pub,
   highlighted = false,
}: {
   pub: ParsedPublication
   highlighted?: boolean
}) {
   const data = pub.data
   const title = data?.title?.trim()
   const authors = data?.authors?.trim()
   const journal = data?.journal?.trim()
   const year = data?.year?.trim()
   const journalLine = [journal, year].filter(Boolean).join(', ')
   const href =
      publicationMetadataExternalUrl(data) ?? publicationExternalUrl(pub.source, pub.id)

   return (
      <div
         className={cn(
            'rounded-lg border p-4 space-y-2',
            highlighted
               ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
               : 'border-border bg-card',
         )}
      >
         {highlighted ? (
            <Badge variant="secondary" className="mb-1">
               Genome assembly publication
            </Badge>
         ) : null}

         {title ? (
            <p className="font-medium leading-snug text-foreground">{title}</p>
         ) : (
            <p className="font-medium leading-snug text-foreground">
               <span className="text-muted-foreground font-normal">{pub.source}: </span>
               <span className="font-mono text-sm">{pub.id}</span>
            </p>
         )}

         {authors ? <p className="text-sm text-muted-foreground line-clamp-2">{authors}</p> : null}
         {journalLine ? <p className="text-sm text-muted-foreground">{journalLine}</p> : null}

         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-sm">
            {title ? (
               <span className="text-muted-foreground">
                  {pub.source}: <span className="font-mono text-foreground/80">{pub.id}</span>
               </span>
            ) : null}
            {href ? (
               <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
               >
                  View publication
                  <ExternalLink className="h-3 w-3 shrink-0" />
               </a>
            ) : null}
         </div>
      </div>
   )
}

export type SpeciesPublicationsSectionProps = {
   genomePublication: ParsedPublication | null
   otherPublications: ParsedPublication[]
   className?: string
}

export function SpeciesPublicationsSection({
   genomePublication,
   otherPublications,
   className,
}: SpeciesPublicationsSectionProps) {
   const show = Boolean(genomePublication) || otherPublications.length > 0
   if (!show) return null

   return (
      <Card id="publications" className={cn('mb-6 scroll-mt-24', className)}>
         <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
               <BookOpen className="h-5 w-5 text-primary" />
               Publications
            </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            {genomePublication ? (
               <PublicationCard pub={genomePublication} highlighted />
            ) : null}
            {otherPublications.length > 0 ? (
               <div className="space-y-3">
                  {genomePublication ? (
                     <p className="text-sm font-medium text-muted-foreground">Other publications</p>
                  ) : null}
                  {otherPublications.map((pub, idx) => (
                     <PublicationCard key={`${pub.source}-${pub.id}-${idx}`} pub={pub} />
                  ))}
               </div>
            ) : null}
         </CardContent>
      </Card>
   )
}
