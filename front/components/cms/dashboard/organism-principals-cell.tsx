'use client'

export type OrganismPrincipalRow = {
   slug: string
   name: string
   affiliations?: string[]
   programs?: string[]
}

function dedupe(values: string[]): string[] {
   return Array.from(new Set(values.filter(Boolean)))
}

function EmptyCell() {
   return <span className="text-sm text-muted-foreground">—</span>
}

function TruncatedText({ text }: { text: string }) {
   return <p className="max-w-[14rem] truncate text-sm">{text}</p>
}

/**
 * Read-only PI / institute / program projection for a CMS species table row.
 *
 * Derived server-side from the taxid's assigned curators' `principal_ids` (see
 * docs/cbp-pi-contributor-migration.md) — there is nothing to edit here; link/unlink
 * principals on the user (curator) itself.
 */

export function OrganismPrincipalNamesCell({
   principals,
}: {
   principals: OrganismPrincipalRow[] | undefined
}) {
   if (!principals || principals.length === 0) return <EmptyCell />
   const names = dedupe(principals.map((p) => p.name).filter(Boolean))
   if (names.length === 0) return <EmptyCell />
   return <TruncatedText text={names.join(', ')} />
}

export function OrganismPrincipalAffiliationsCell({
   principals,
}: {
   principals: OrganismPrincipalRow[] | undefined
}) {
   if (!principals || principals.length === 0) return <EmptyCell />
   const affiliations = dedupe(principals.flatMap((p) => p.affiliations ?? []))
   if (affiliations.length === 0) return <EmptyCell />
   return <TruncatedText text={affiliations.join(', ')} />
}

export function OrganismPrincipalProgramsCell({
   principals,
}: {
   principals: OrganismPrincipalRow[] | undefined
}) {
   if (!principals || principals.length === 0) return <EmptyCell />
   const programs = dedupe(principals.flatMap((p) => p.programs ?? []))
   if (programs.length === 0) return <EmptyCell />
   return <TruncatedText text={programs.join(', ')} />
}
