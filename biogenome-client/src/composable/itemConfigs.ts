import { dataModels, DataModels } from "../data/types"



export function getColumns(model: DataModels | 'reads') {
    let columns: string[]
    if (model === 'reads') {
        columns = ['run_accession', 'metadata.submitted_bytes', 'actions']
    } else if (model === 'annotations') {
        columns = ['name', 'assembly_accession']
    } else if (model === 'assemblies') {
        columns = ['accession', 'assembly_name', 'metadata.assembly_info.assembly_level']
    } else if (model === 'biosamples') {
        columns = ['accession', 'metadata.tissue', 'metadata.lifestage']
    } else if (model === 'experiments') {
        columns = ['experiment_accession', 'sample_accession', 'metadata.experiment_title']
    } else if (model === 'local_samples') {
        columns = ['local_id']
    } else {
        columns = []
    }
    return columns.map((c: string) => { return { key: c, sortable: true, label: mapField(c) } })
}

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

export function convertBytesToMBOrGB(submittedBytes: string): string {
    const byteStrings: string[] = submittedBytes.split(';');

    let result: string = "";

    byteStrings.forEach(byteString => {
        const bytes: number = parseInt(byteString, 10);
        const mb: number = bytes / (1024 * 1024);
        const gb: number = mb / 1024;

        if (gb >= 1) {
            result += gb.toFixed(2) + ' GB, ';
        } else {
            result += mb.toFixed(2) + ' MB, ';
        }
    });
    result = result.slice(0, -2);

    return result;
}

export function getIdKey(model: DataModels) {
    if (model === 'annotations') {
        return 'name'
    } else if (model === 'assemblies' || model === 'biosamples') {
        return 'accession'
    } else if (model === 'experiments') {
        return 'experiment_accession'
    } else if (model === 'local_samples') {
        return 'local_id'
    } return 'taxid'
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
    { value: 'Biosample Submitted', label: 'insdc.biosample.label', description: 'insdc.biosample.description' },
    { value: 'Reads Submitted', label: 'insdc.experiment.label', description: 'insdc.experiment.description' },
    { value: 'Assemblies Submitted', label: 'insdc.assembly.label', description: 'insdc.assembly.description' },
]

export const goatSteps = [
    { value: 'Sample Collected', label: 'goat.collected.label', description: 'goat.collected.description' },
    { value: 'Sample Acquired', label: 'goat.acquired.label', description: 'goat.acquired.description' },
    { value: 'Data Generation', label: 'goat.generation.label', description: 'goat.generation.description' },
    { value: 'In Assembly', label: 'goat.assembly.label', description: 'goat.assembly.description' },
    { value: 'INSDC Submitted', label: 'goat.submitted.label', description: 'goat.submitted.description' },
    { value: 'Publication Available', label: 'goat.publication.label', description: 'goat.publication.description' },
]

export const extendedModels = [...dataModels, 'reads']