import { dataModels, DataModels } from '../data/types'

export function getColumns(model: DataModels) {
   let columns: string[]
   if (model === 'reads') {
      columns = [
         'run_accession',
         'experiment_accession',
         'sample_accession',
         'metadata.experiment_title',
         'metadata.library_strategy',
         'metadata.submitted_bytes',
         'actions',
      ]
   } else if (model === 'annotations') {
      columns = ['name', 'assembly_accession']
   } else if (model === 'assemblies') {
      columns = ['accession', 'assembly_name', 'metadata.assembly_info.assembly_level']
   } else if (model === 'biosamples') {
      columns = ['accession', 'metadata.tissue', 'metadata.lifestage']
   } else if (model === 'local_samples') {
      columns = ['local_id']
   } else {
      columns = []
   }
   return columns.map((c: string) => {
      return { key: c, sortable: true, label: mapField(c) }
   })
}

const mapField = (key: string) => {
   return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

export function convertBytesToMBOrGB(submittedBytes: string): string {
   const byteStrings: string[] = submittedBytes.split(';')

   let result: string = ''

   byteStrings.forEach((byteString) => {
      const bytes: number = parseInt(byteString, 10)
      const mb: number = bytes / (1024 * 1024)
      const gb: number = mb / 1024

      if (gb >= 1) {
         result += gb.toFixed(2) + ' GB, '
      } else {
         result += mb.toFixed(2) + ' MB, '
      }
   })
   result = result.slice(0, -2)

   return result
}

export function getIdKey(model: DataModels) {
   if (model === 'annotations') {
      return 'name'
   } else if (model === 'assemblies' || model === 'biosamples') {
      return 'accession'
   } else if (model === 'reads') {
      return 'run_accession'
   } else if (model === 'local_samples') {
      return 'local_id'
   }
   return 'taxid'
}

export function getLink(publication: Record<string, string>) {
   switch (publication.source) {
      case 'DOI':
         return `https://doi.org/${publication.id}`
      case 'PubMed ID':
         return `https://pubmed.ncbi.nlm.nih.gov/${publication.id}`
      default:
         return `http://www.ncbi.nlm.nih.gov/pmc/articles/${publication.id}`
   }
}

export const insdcSteps = [
   {
      value: 'No Entry',
      label: 'insdc.not_submitted.label',
      description: 'insdc.not_submitted.description',
      icon: 'fa-circle-xmark',
      color: 'status0',
   },
   {
      value: 'Biosample Submitted',
      label: 'insdc.biosample.label',
      description: 'insdc.biosample.description',
      icon: 'fa-vial',
      color: 'status1',
   },
   {
      value: 'Reads Submitted',
      label: 'insdc.experiment.label',
      description: 'insdc.experiment.description',
      icon: 'fa-folder',
      color: 'status2',
   },
   {
      value: 'Assemblies Submitted',
      label: 'insdc.assembly.label',
      description: 'insdc.assembly.description',
      icon: 'fa-dna',
      color: 'status3',
   },
]

export const goatSteps = [
   {
      value: 'No Entry',
      label: 'goat.not_submitted.label',
      description: 'goat.not_submitted.description',
      icon: 'fa-ban',
      color: 'status0',
   },
   {
      value: 'Sample Collected',
      label: 'goat.collected.label',
      description: 'goat.collected.description',
      icon: 'fa-flask',
      color: 'status1',
   },
   {
      value: 'Sample Acquired',
      label: 'goat.acquired.label',
      description: 'goat.acquired.description',
      icon: 'fa-house',
      color: 'status2',
   },
   {
      value: 'Data Generation',
      label: 'goat.generation.label',
      description: 'goat.generation.description',
      icon: 'fa-dna',
      color: 'status3',
   },
   {
      value: 'In Assembly',
      label: 'goat.assembly.label',
      description: 'goat.assembly.description',
      icon: 'fa-cogs',
      color: 'status4',
   },
   {
      value: 'INSDC Submitted',
      label: 'goat.submitted.label',
      description: 'goat.submitted.description',
      icon: 'fa-upload',
      color: 'status5',
   },
   {
      value: 'Publication Available',
      label: 'goat.publication.label',
      description: 'goat.publication.description',
      icon: 'fa-book-open',
      color: 'status6',
   },
]

export const extendedModels = dataModels
