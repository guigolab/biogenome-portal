import type { TChartData as ChartData } from 'vue-chartjs/dist/types'

export type ColorThemes = {
  [key: string]: string
}
// Define the type for filters and columns objects
export interface ConfigType {
  [key: string]: any[]; // Adjust the type of values if necessary
}

export type ItemDetails = {
  title: string,
  description: string,
  ncbiLink?: string
  enaLink?: string
  blobtoolkitLink?: string
  speciesLink?: Record<string, any>
  sampleLink?: Record<string, any>
  jbrowseLink?: boolean
  downloadLink?: string
  chromosomes?: ChromosomeInterface[]
  annotations?: Annotation[]
  experiments?: Record<string, any>[]
  reads?: Record<string, any>
  biosamples?: Record<string, any>[]
  local_samples?: Record<string, any>[]
  assemblies?: Record<string, any>[]
  coordinates?: Record<string, any>[]
  metadata?: Record<string, any>
  images?: string[]
  avatar?: string
  insdcStatus?:string
  goat?: {status:string,targetList:string}
  publications?: Record<string, any>[]
  vernacularNames?: Record<string, any>[]

}

export interface AppConfig {
  dashboard: ConfigModel
  general: Record<string, any>
  ui: Record<string, any>
  models: Record<DataModels, ConfigModel>
}

export type ConfigModel = {
  title?: Record<string, any>
  description?: Record<string, any>
  label?: Record<string, any>
  filters?: ConfigFilter[]
  columns?: string[]
  charts?: InfoBlock[]
}

export type Pages = DataModels | 'dashboard'

export type Frequency = {
  model: DataModels,
  field: string,
  data: Record<string, number>
}

export interface ChoroplethData {
  countryName: string;
  countryId: string;
  occurrences: number;
  geojson: GeoJSON.Feature;
}

export type CoordinatesFrequency = {
  coordinates: [number, number],
  count: number,
  images: string[]
}
export type TLineChartData = ChartData<'line'>
export type TBarChartData = ChartData<'bar'>
export type TBubbleChartData = ChartData<'bubble'>
export type TDoughnutChartData = ChartData<'doughnut'>
export type TPieChartData = ChartData<'pie'>
export interface ErrorResponseData {
  message?: string; // Optional, because not all error responses may contain a message
}
export type TChartData = TLineChartData | TBarChartData | TBubbleChartData | TDoughnutChartData | TPieChartData

export type LangOption = Record<'es-ct' | 'en', string>

export type ComponentType = 'biosample' | 'organism' | 'assembly' | 'localSample' | 'experiment' | 'annotation';

export interface PageHeaderConfig {
  title: LangOption,
  description: LangOption
}
export type DataModels = 'biosamples' | 'experiments' | 'organisms' | 'annotations' | 'assemblies' | 'local_samples'
export const dataModels: DataModels[] = [
  'biosamples',
  'experiments',
  'organisms',
  'annotations',
  'assemblies',
  'local_samples',
];
export type Stat = {
  key: DataModels,
  count: number,
  icon?: string
  color?: string
}

export type Model = 'biosamples' | 'experiments' | 'organisms' | 'annotations' | 'assemblies' | 'users' | 'local_samples'
export type ColumnShow = {
  show: boolean,
  value: string
}
export type Metatada = {
  key: string
  value: string
}

export type DataCounts = {
  coordinates: number;
  assemblies: number;
  assembly: number;
  experiments: number;
  local_samples: number;
  annotations: number;
  chromosomes: number;
  sub_samples: number;
};


export type DateRange = {
  start: Date | null
  end: Date | null
}
export type Filter = {
  label?: string
  placeholder?: string
  type: 'input' | 'select' | 'date' | 'checkbox'
  options?: Record<string, number>
  key: string
}

export interface SearchForm {
  filter: string
  sort_column: string
  sort_order: string
  start_date?: string
  end_date?: string
  rank?: string
}

export interface ConfigFilter {
  key: string
  type: 'date' | 'select' | 'input' | 'checkbox'
}
export interface OrganismSearchForm extends SearchForm {
  insdc_status: string
  goat_status: string
  parent_taxid: string
  target_list_status: string
  country?: string
}

export type StatusSearchForm = {
  goat_status: string
  target_list_status: string
  filter: string
}

export type BioSampleSearchForm = SearchForm

export interface ReadSearchForm extends SearchForm {
  center: string
}
export interface AssemblySearchForm extends SearchForm {
  assembly_level: string
  submitter: string
  blobtoolkit: boolean
}

export type LocalSampleSearchForm = SearchForm

export type ModelSearchForm = OrganismSearchForm | AssemblySearchForm | ReadSearchForm | BioSampleSearchForm



export type BreadCrumb = {
  name: string
  path: Record<string, any>
  active: boolean
}

export type TaxonNode = {
  name: string
  rank: string
  taxid: string,
  children?: string[],
  leaves?: number
}

export type Publication = {
  source: 'DOI' | 'PubMed ID' | 'PubMed CentralID' | ''
  id: string
}

export type CommonName = {
  value: string
  locality: string
  lang: string
}

export type Contributor = {
  contributions: number
  name: string
}

type Chromosome = {
  name: string
  size: number
}

export type Adapter = {
  type: 'RefGetAdapter'
  sequenceData: Record<string, Chromosome>
}

type Sequence = {
  type: 'ReferenceSequenceTrack'
  trackId: string
  name: string
  adapter: Adapter
}

export type AssemblyAdapter = {
  name: string
  sequence: Sequence
  refNameAliases?: Record<string, any>
}

export type HighLightedMetatada = {
  key: string
  color: string
}

export type ModelConfig = {
  title?: Record<string, string>
  description?: Record<string, string>
}

export type ChartType = 'pie' | 'dateline' | 'bar'
export type InfoBlock = {
  field: string,
  model: string,
  title?: Record<string, string>,
  label?: Record<string, string>,
  type: ChartType
  class: string
  color?: string
}

export interface Assembly {
  accession: string,
  assembly_name: string,
  scientific_name: string,
  taxid: string,
  sample_accession: string,
  blobtoolkit_id?: string
  chromosomes: Record<string, any>[],
  metadata: Record<string, any>,
  has_chromosomes_aliases: boolean
}
export interface Annotation {
  assembly_accession: string,
  assembly_name: string,
  scientific_name: string,
  taxid: string,
  name: string,
  gff_gz_location: string
  tab_index_location: string,
  metadata: Record<string, any>,
}

export interface TrackData {
  name: string;
  gff_gz_location: string;
  tab_index_location: string;
  metadata: Record<string, any>

}
export interface BioSample {
  accession: string
  scientific_name: string
  taxid: string
  assemblies: string[]
  experiments: string[]
  metadata: Record<string, any>
}

export interface ChromosomeInterface {
  accession_version: string
  metadata: Record<string, any>
}
export interface Details {
  title: string,
  description?: string
  button1?: {
    route: Record<string, any>
    label: string
  },
  button2?: {
    route: Record<string, any>
    label: string
  },
  ncbiPath?: string,
  ebiPath?: string,
  blobtoolkit?: string,
}

export interface OrganismLocations {
  taxid: string
  scientific_name: string
  coordinates: Record<number, number>[]
  image?: string
}


export interface SampleLocations {
  taxid: string
  scientific_name: string
  sample_accession: string
  coordinates: {
    coordinates: [number, number]
  }
  is_local_sample: boolean
  image?: string
}

export interface OrganismCoordinates {
  latitude: number
  longitude: number
  id: string,
  taxid: string
  image?: string
}

export type OrganismForm = {
  taxid: string | null,
  scientific_name: string | null,
  common_names: CommonName[],
  image: string,
  image_urls: string[],
  metadata: Record<string, string>,
  publications: Publication[],
  goat_status: string,
  target_list_status: string,
}