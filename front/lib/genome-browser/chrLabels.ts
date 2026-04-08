function str(v: unknown): string | undefined {
   if (v == null) return undefined
   const s = String(v).trim()
   return s.length ? s : undefined
}

/**
 * Length in bp from NCBI assembly-report style metadata (`Sequence-Length`), then common fallbacks.
 */
export function chromosomeSequenceLengthBp(metadata: Record<string, unknown> | undefined): number {
   const m = metadata ?? {}
   const raw =
      m['Sequence-Length'] ??
      m['sequence_length'] ??
      m['sequence-length'] ??
      m.length
   const n = Number(raw)
   return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Label for UI (cards, tooltips): prefer **Assigned-Molecule** when present (e.g. chromosome number "24").
 */
export function primaryChromosomeLabel(
   metadata: Record<string, unknown> | undefined,
   accessionVersion: string,
): string {
   const m = metadata ?? {}
   return (
      str(m['Assigned-Molecule']) ??
      str(m['assigned_molecule']) ??
      str(m['chr_name']) ??
      str(m['Sequence-Name']) ??
      str(m['sequence_name']) ??
      str(m['ucsc_style_name']) ??
      str(m['UCSC-style-name']) ??
      str(m['name']) ??
      accessionVersion
   )
}
