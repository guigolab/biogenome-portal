export type InsdcModel = 'biosamples' | 'assemblies' | 'reads'

export type ImportPhase = 'idle' | 'submitting' | 'success' | 'error'

export const INSDC_MODEL_ORDER: InsdcModel[] = ['biosamples', 'assemblies', 'reads']

export type InsdcModelMeta = {
   key: InsdcModel
   label: string
   description: string
   accessionHint: string
   accessionRegex: RegExp
   sideEffects: string
   createLabel: string
}

export const INSDC_MODEL_META: Record<InsdcModel, InsdcModelMeta> = {
   biosamples: {
      key: 'biosamples',
      label: 'Biosample',
      description: 'Import a BioSample record from EBI, NCBI, or DDBJ.',
      accessionHint: 'e.g. SAMN12345678, SAME12345678, SAMD12345678',
      accessionRegex: /^SAM[END][A-Z]?\d+$/i,
      sideEffects: '',
      createLabel: 'Import Biosample',
   },
   assemblies: {
      key: 'assemblies',
      label: 'Assembly',
      description: 'Import a genome assembly from INSDC.',
      accessionHint: 'e.g. GCA_000001405.15 or GCF_000001405.40',
      accessionRegex: /^GC[AF]_\d+\.\d+$/i,
      sideEffects: 'The related biosample will also be imported if not already present.',
      createLabel: 'Import Assembly',
   },
   reads: {
      key: 'reads',
      label: 'Read run',
      description: 'Import a sequencing read run from SRA, ENA, or DRA.',
      accessionHint: 'e.g. SRR12345678, ERR12345678, DRR12345678',
      accessionRegex: /^[SED]RR\d+$/i,
      sideEffects: 'The related biosample will also be imported if not already present.',
      createLabel: 'Import Read run',
   },
}
