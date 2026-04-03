export interface Species {
  id: string
  scientificName: string
  commonName: string
  taxonId: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  conservationStatus: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX'
  sequencingStatus: 'not_started' | 'sample_collected' | 'sequencing' | 'assembly' | 'annotation' | 'completed'
  genomeCount: number
  sampleCount: number
  coordinates: { lat: number; lng: number }[]
  imageUrl?: string
}

/** Map legacy mock `Species` to an API-like organism row for `SpeciesCard`. */
export function speciesMockToOrganismRow(s: Species): Record<string, unknown> {
  return {
    taxid: s.taxonId,
    scientific_name: s.scientificName,
    insdc_common_name: s.commonName,
    assemblies_count: s.genomeCount,
    biosamples_count: s.sampleCount,
    reads_count: 0,
    taxon_lineage: [s.kingdom, s.phylum, s.class, s.order, s.family, s.genus],
    ...(s.imageUrl ? { image: s.imageUrl } : {}),
  }
}

export interface TaxonNode {
  id: string
  name: string
  rank: string
  speciesCount: number
  children?: TaxonNode[]
}

export interface Genome {
  id: string
  speciesId: string
  accession: string
  assemblyLevel: 'Chromosome' | 'Scaffold' | 'Contig' | 'Complete'
  size: string
  gcContent: number
  n50: string
  submissionDate: string
}

export interface BioSample {
  id: string
  speciesId: string
  accession: string
  organism: string
  collectionDate: string
  location: string
  tissue: string
  collector: string
}

export interface SequencingRun {
  id: string
  speciesId: string
  accession: string
  platform: string
  libraryStrategy: string
  readCount: number
  baseCount: string
  submissionDate: string
}

export const mockSpecies: Species[] = [
  {
    id: 'sp-001',
    scientificName: 'Panthera tigris',
    commonName: 'Tiger',
    taxonId: '9694',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Carnivora',
    family: 'Felidae',
    genus: 'Panthera',
    conservationStatus: 'EN',
    sequencingStatus: 'completed',
    genomeCount: 3,
    sampleCount: 12,
    coordinates: [
      { lat: 26.8467, lng: 80.9462 },
      { lat: 27.1751, lng: 78.0421 },
    ],
  },
  {
    id: 'sp-002',
    scientificName: 'Ursus arctos',
    commonName: 'Brown Bear',
    taxonId: '9644',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Carnivora',
    family: 'Ursidae',
    genus: 'Ursus',
    conservationStatus: 'LC',
    sequencingStatus: 'annotation',
    genomeCount: 2,
    sampleCount: 8,
    coordinates: [
      { lat: 61.524, lng: -149.8 },
      { lat: 64.8378, lng: -147.7164 },
    ],
  },
  {
    id: 'sp-003',
    scientificName: 'Elephas maximus',
    commonName: 'Asian Elephant',
    taxonId: '9783',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Proboscidea',
    family: 'Elephantidae',
    genus: 'Elephas',
    conservationStatus: 'EN',
    sequencingStatus: 'sequencing',
    genomeCount: 1,
    sampleCount: 5,
    coordinates: [
      { lat: 7.8731, lng: 80.7718 },
      { lat: 20.5937, lng: 78.9629 },
    ],
  },
  {
    id: 'sp-004',
    scientificName: 'Gorilla gorilla',
    commonName: 'Western Gorilla',
    taxonId: '9593',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Primates',
    family: 'Hominidae',
    genus: 'Gorilla',
    conservationStatus: 'CR',
    sequencingStatus: 'completed',
    genomeCount: 4,
    sampleCount: 15,
    coordinates: [
      { lat: -0.228, lng: 15.8277 },
      { lat: 1.6508, lng: 10.2679 },
    ],
  },
  {
    id: 'sp-005',
    scientificName: 'Aquila chrysaetos',
    commonName: 'Golden Eagle',
    taxonId: '8962',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Aves',
    order: 'Accipitriformes',
    family: 'Accipitridae',
    genus: 'Aquila',
    conservationStatus: 'LC',
    sequencingStatus: 'assembly',
    genomeCount: 1,
    sampleCount: 3,
    coordinates: [
      { lat: 39.7392, lng: -104.9903 },
      { lat: 56.1304, lng: -106.3468 },
    ],
  },
  {
    id: 'sp-006',
    scientificName: 'Dermochelys coriacea',
    commonName: 'Leatherback Sea Turtle',
    taxonId: '8467',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Reptilia',
    order: 'Testudines',
    family: 'Dermochelyidae',
    genus: 'Dermochelys',
    conservationStatus: 'VU',
    sequencingStatus: 'sample_collected',
    genomeCount: 0,
    sampleCount: 4,
    coordinates: [
      { lat: 10.4806, lng: -66.9036 },
      { lat: -8.4095, lng: 115.1889 },
    ],
  },
  {
    id: 'sp-007',
    scientificName: 'Canis lupus',
    commonName: 'Gray Wolf',
    taxonId: '9612',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Carnivora',
    family: 'Canidae',
    genus: 'Canis',
    conservationStatus: 'LC',
    sequencingStatus: 'completed',
    genomeCount: 5,
    sampleCount: 20,
    coordinates: [
      { lat: 44.4268, lng: -110.5885 },
      { lat: 63.7467, lng: -68.5169 },
    ],
  },
  {
    id: 'sp-008',
    scientificName: 'Rhincodon typus',
    commonName: 'Whale Shark',
    taxonId: '259920',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Chondrichthyes',
    order: 'Orectolobiformes',
    family: 'Rhincodontidae',
    genus: 'Rhincodon',
    conservationStatus: 'EN',
    sequencingStatus: 'not_started',
    genomeCount: 0,
    sampleCount: 0,
    coordinates: [
      { lat: 20.6534, lng: -87.0798 },
      { lat: -4.0435, lng: 39.6682 },
    ],
  },
  {
    id: 'sp-009',
    scientificName: 'Ara ararauna',
    commonName: 'Blue-and-yellow Macaw',
    taxonId: '13199',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Aves',
    order: 'Psittaciformes',
    family: 'Psittacidae',
    genus: 'Ara',
    conservationStatus: 'LC',
    sequencingStatus: 'sequencing',
    genomeCount: 0,
    sampleCount: 6,
    coordinates: [
      { lat: -3.4653, lng: -62.2159 },
      { lat: -14.235, lng: -51.9253 },
    ],
  },
  {
    id: 'sp-010',
    scientificName: 'Crocodylus porosus',
    commonName: 'Saltwater Crocodile',
    taxonId: '8502',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Reptilia',
    order: 'Crocodylia',
    family: 'Crocodylidae',
    genus: 'Crocodylus',
    conservationStatus: 'LC',
    sequencingStatus: 'annotation',
    genomeCount: 2,
    sampleCount: 7,
    coordinates: [
      { lat: -12.4634, lng: 130.8456 },
      { lat: 1.3521, lng: 103.8198 },
    ],
  },
]

export const mockTaxonomy: TaxonNode = {
  id: 'root',
  name: 'Life',
  rank: 'Domain',
  speciesCount: 2500000,
  children: [
    {
      id: 'animalia',
      name: 'Animalia',
      rank: 'Kingdom',
      speciesCount: 1500000,
      children: [
        {
          id: 'chordata',
          name: 'Chordata',
          rank: 'Phylum',
          speciesCount: 65000,
          children: [
            {
              id: 'mammalia',
              name: 'Mammalia',
              rank: 'Class',
              speciesCount: 6400,
              children: [
                {
                  id: 'carnivora',
                  name: 'Carnivora',
                  rank: 'Order',
                  speciesCount: 280,
                  children: [
                    { id: 'felidae', name: 'Felidae', rank: 'Family', speciesCount: 37 },
                    { id: 'ursidae', name: 'Ursidae', rank: 'Family', speciesCount: 8 },
                    { id: 'canidae', name: 'Canidae', rank: 'Family', speciesCount: 35 },
                  ],
                },
                {
                  id: 'primates',
                  name: 'Primates',
                  rank: 'Order',
                  speciesCount: 500,
                  children: [
                    { id: 'hominidae', name: 'Hominidae', rank: 'Family', speciesCount: 7 },
                  ],
                },
                {
                  id: 'proboscidea',
                  name: 'Proboscidea',
                  rank: 'Order',
                  speciesCount: 3,
                  children: [
                    { id: 'elephantidae', name: 'Elephantidae', rank: 'Family', speciesCount: 3 },
                  ],
                },
              ],
            },
            {
              id: 'aves',
              name: 'Aves',
              rank: 'Class',
              speciesCount: 10000,
              children: [
                {
                  id: 'accipitriformes',
                  name: 'Accipitriformes',
                  rank: 'Order',
                  speciesCount: 265,
                  children: [
                    { id: 'accipitridae', name: 'Accipitridae', rank: 'Family', speciesCount: 249 },
                  ],
                },
                {
                  id: 'psittaciformes',
                  name: 'Psittaciformes',
                  rank: 'Order',
                  speciesCount: 398,
                  children: [
                    { id: 'psittacidae', name: 'Psittacidae', rank: 'Family', speciesCount: 167 },
                  ],
                },
              ],
            },
            {
              id: 'reptilia',
              name: 'Reptilia',
              rank: 'Class',
              speciesCount: 11000,
              children: [
                {
                  id: 'testudines',
                  name: 'Testudines',
                  rank: 'Order',
                  speciesCount: 360,
                  children: [
                    { id: 'dermochelyidae', name: 'Dermochelyidae', rank: 'Family', speciesCount: 1 },
                  ],
                },
                {
                  id: 'crocodylia',
                  name: 'Crocodylia',
                  rank: 'Order',
                  speciesCount: 27,
                  children: [
                    { id: 'crocodylidae', name: 'Crocodylidae', rank: 'Family', speciesCount: 14 },
                  ],
                },
              ],
            },
            {
              id: 'chondrichthyes',
              name: 'Chondrichthyes',
              rank: 'Class',
              speciesCount: 1200,
              children: [
                {
                  id: 'orectolobiformes',
                  name: 'Orectolobiformes',
                  rank: 'Order',
                  speciesCount: 43,
                  children: [
                    { id: 'rhincodontidae', name: 'Rhincodontidae', rank: 'Family', speciesCount: 1 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'arthropoda',
          name: 'Arthropoda',
          rank: 'Phylum',
          speciesCount: 1200000,
          children: [
            {
              id: 'insecta',
              name: 'Insecta',
              rank: 'Class',
              speciesCount: 1000000,
            },
          ],
        },
      ],
    },
    {
      id: 'plantae',
      name: 'Plantae',
      rank: 'Kingdom',
      speciesCount: 400000,
      children: [
        {
          id: 'magnoliophyta',
          name: 'Magnoliophyta',
          rank: 'Phylum',
          speciesCount: 300000,
        },
      ],
    },
    {
      id: 'fungi',
      name: 'Fungi',
      rank: 'Kingdom',
      speciesCount: 150000,
    },
  ],
}

export const mockGenomes: Genome[] = [
  {
    id: 'gen-001',
    speciesId: 'sp-001',
    accession: 'GCA_000464555.1',
    assemblyLevel: 'Chromosome',
    size: '2.4 Gb',
    gcContent: 41.2,
    n50: '145 Mb',
    submissionDate: '2023-05-15',
  },
  {
    id: 'gen-002',
    speciesId: 'sp-001',
    accession: 'GCA_000464556.2',
    assemblyLevel: 'Scaffold',
    size: '2.3 Gb',
    gcContent: 41.0,
    n50: '22 Mb',
    submissionDate: '2024-01-20',
  },
  {
    id: 'gen-003',
    speciesId: 'sp-004',
    accession: 'GCA_000151905.3',
    assemblyLevel: 'Chromosome',
    size: '3.1 Gb',
    gcContent: 42.5,
    n50: '180 Mb',
    submissionDate: '2022-11-08',
  },
  {
    id: 'gen-004',
    speciesId: 'sp-007',
    accession: 'GCA_000002285.2',
    assemblyLevel: 'Chromosome',
    size: '2.4 Gb',
    gcContent: 41.8,
    n50: '152 Mb',
    submissionDate: '2023-08-12',
  },
]

export const mockBioSamples: BioSample[] = [
  {
    id: 'bio-001',
    speciesId: 'sp-001',
    accession: 'SAMN12345678',
    organism: 'Panthera tigris',
    collectionDate: '2022-03-15',
    location: 'Ranthambore National Park, India',
    tissue: 'Blood',
    collector: 'Wildlife Institute of India',
  },
  {
    id: 'bio-002',
    speciesId: 'sp-004',
    accession: 'SAMN23456789',
    organism: 'Gorilla gorilla',
    collectionDate: '2021-07-22',
    location: 'Dzanga-Sangha, Central African Republic',
    tissue: 'Hair follicle',
    collector: 'WWF Conservation Team',
  },
  {
    id: 'bio-003',
    speciesId: 'sp-007',
    accession: 'SAMN34567890',
    organism: 'Canis lupus',
    collectionDate: '2023-01-10',
    location: 'Yellowstone National Park, USA',
    tissue: 'Blood',
    collector: 'Yellowstone Wolf Project',
  },
]

export const mockSequencingRuns: SequencingRun[] = [
  {
    id: 'run-001',
    speciesId: 'sp-001',
    accession: 'SRR12345678',
    platform: 'Illumina NovaSeq 6000',
    libraryStrategy: 'WGS',
    readCount: 1500000000,
    baseCount: '225 Gb',
    submissionDate: '2023-06-01',
  },
  {
    id: 'run-002',
    speciesId: 'sp-001',
    accession: 'SRR12345679',
    platform: 'PacBio Sequel II',
    libraryStrategy: 'WGS',
    readCount: 5000000,
    baseCount: '80 Gb',
    submissionDate: '2023-06-15',
  },
  {
    id: 'run-003',
    speciesId: 'sp-004',
    accession: 'SRR23456789',
    platform: 'Oxford Nanopore PromethION',
    libraryStrategy: 'WGS',
    readCount: 3000000,
    baseCount: '120 Gb',
    submissionDate: '2022-12-01',
  },
]

export const statusColors: Record<Species['conservationStatus'], string> = {
  LC: 'bg-chart-1 text-primary-foreground',
  NT: 'bg-chart-2 text-accent-foreground',
  VU: 'bg-chart-4 text-accent-foreground',
  EN: 'bg-destructive text-destructive-foreground',
  CR: 'bg-destructive text-destructive-foreground',
  EW: 'bg-muted text-muted-foreground',
  EX: 'bg-muted text-muted-foreground',
}

export const statusLabels: Record<Species['conservationStatus'], string> = {
  LC: 'Least Concern',
  NT: 'Near Threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically Endangered',
  EW: 'Extinct in Wild',
  EX: 'Extinct',
}

export const sequencingStatusLabels: Record<Species['sequencingStatus'], string> = {
  not_started: 'Not Started',
  sample_collected: 'Sample Collected',
  sequencing: 'Sequencing',
  assembly: 'Assembly',
  annotation: 'Annotation',
  completed: 'Completed',
}

export const sequencingStatusColors: Record<Species['sequencingStatus'], string> = {
  not_started: 'bg-muted text-muted-foreground',
  sample_collected: 'bg-chart-4/20 text-chart-4',
  sequencing: 'bg-chart-2/20 text-chart-2',
  assembly: 'bg-chart-3/20 text-chart-3',
  annotation: 'bg-chart-5/20 text-chart-5',
  completed: 'bg-chart-1/20 text-chart-1',
}
