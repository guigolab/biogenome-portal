
import { DataModels } from '../data/types';


export interface Config {
    title: string;
    description: string;
    idField: string,
    columns: string[];
    editRoute?: (rowData: any) => Record<string, any>;
  }

export const config: Record<DataModels, Config> = {
    annotations: {
        title: "Genome Annotations",
        description: "Edit or delete genome annotations",
        idField: 'name',
        columns: ['name', 'scientific_name', 'assembly_name','view', 'edit', 'delete'],
        editRoute: (rowData: any) => ({ name: 'update-annotation', params: { name: rowData.name } })
    },
    assemblies: {
        title: "Assemblies",
        idField: 'accession',
        description: "Delete assemblies",
        columns: ['accession', 'scientific_name', 'assembly_name','view', 'delete']
    },
    biosamples: {
        title: "BioSamples",
        description: "Delete BioSamples",
        idField: 'accession',
        columns: ['accession', 'scientific_name', 'organism_part','view', 'delete'],
    },
    experiments: {
        title: "Experiments",
        description: "Delete Experiments",
        idField: 'experiment_accession',
        columns: ['experiment_accession', 'scientific_name', 'experiment_title','view', 'delete'],
    },
    local_samples: {
        title: "My Samples",
        description: "Delete your local samples. To update or add new local samples, use the spreadsheet import form.",
        idField: 'local_id',
        columns: ['local_id', 'scientific_name','view', 'delete'],
    },
    organisms: {
        title: "My Organisms",
        description: "Edit or delete your organisms",
        columns: ['taxid', 'scientific_name', 'tolid_prefix','view', 'edit', 'delete'],
        idField: 'taxid',
        editRoute: (rowData: any) => ({ name: 'update-organism', params: { taxid: rowData.taxid } })
    },
    submitted_biosamples: {
        title: "My BioSamples",
        description: "Edit or delete your organisms",
        columns: ['taxid', 'scientific_name', 'tolid_prefix','view', 'edit', 'delete'],
        idField: 'taxid',
        editRoute: (rowData: any) => ({ name: 'update-organism', params: { taxid: rowData.taxid } })
    },
};
