import type { TChartData as ChartData } from 'vue-chartjs/dist/types'

export type ColorThemes = {
  [key: string]: string
}

export type TLineChartData = ChartData<'line'>
export type TBarChartData = ChartData<'bar'>
export type TBubbleChartData = ChartData<'bubble'>
export type TDoughnutChartData = ChartData<'doughnut'>
export type TPieChartData = ChartData<'pie'>

export type TChartData = TLineChartData | TBarChartData | TBubbleChartData | TDoughnutChartData | TPieChartData

interface Node {
  children: Array<string>
  leaves: number
  assemblies?: number
  biosamples?: number
  experiments?: number
  local_samples?: number
  annotations?: number
}

export type Filter = {
  label: string
  placeholder?: string
  type: 'input' | 'select' | 'date'
  options?: Array<string | Record<string,any>>
  key: string
}

export interface SearchForm {
  filter: string
  filter_option?: string
  sort_column: string
  sort_order: string
  start_date?: string
  end_date?: string
  rank?:string
}

export interface OrganismSearchForm extends SearchForm {
  insdc_status: string
  goat_status: string
  parent_taxid: string
  target_list_status: string
  country: string
}

export type StatusSearchForm = {
  goat_status:string
  target_list_status:string
  filter:string
  filter_option:string
}

export type BioSampleSearchForm = SearchForm

export interface ReadSearchForm extends SearchForm {
  center: string
}
export interface AssemblySearchForm extends SearchForm {
  assembly_level: string
  submitter: string
}

export type LocalSampleSearchForm = SearchForm

export type ModelSearchForm = OrganismSearchForm | AssemblySearchForm | ReadSearchForm | BioSampleSearchForm

export interface TaxonNode extends Node {
  name: string
  rank: string
  taxid: string
}

export type BreadCrumb = {
  name: string
  path: Record<string, any>
  active: boolean
}

export type TreeNode = {
  name: string
  rank: string
  taxid: string
  leaves: number
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
}

export type InfoBlock = {
  field: string,
  model: string,
  title: string,
  label: string,
  type: 'pie' | 'dateline' | 'contribution' | 'list' | 'habitat'
  color: string
  class: string
}

export interface Assembly {
  accession: string,
  assembly_name: string,
  scientific_name: string,
  taxid: string,
  sample_accession: string,
  blobtoolkit_id?:string
  chromosomes: Record<string,any>[],
  metadata: Record<string, any>
}
export interface TrackData {
  name: string;
  gff_gz_location: string;
  tab_index_location: string;
}
export interface BioSample {
  accession: string
  scientific_name: string
  taxid:string
  assemblies:string[]
  experiments:string[]
  metadata:Record<string,any>
}

export interface ChromosomeInterface {
  accession_version:string
  metadata:Record<string,any>
}
export interface Details {
  title: string,
  description?:string
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
  taxid:string
  scientific_name:string
  coordinates:Record<number,number>[]
  image?:string
}


export interface SampleLocations {
  taxid:string
  scientific_name:string
  sample_accession:string
  coordinates:{
    coordinates:[number, number]
  }
  is_local_sample:boolean
  image?:string
}

export interface OrganismCoordinates {
  latitude:number
  longitude:number
  id:string,
  taxid:string
  image?:string
}