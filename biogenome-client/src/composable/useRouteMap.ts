export const routeMap = (item: any) => ({
    assemblies: { name: 'assembly', params: { accession: item.accession } },
    biosamples: { name: 'biosample', params: { accession: item.accession } },
    experiments: { name: 'experiment', params: { accession: item.experiment_accession } },
    organisms: { name: 'organism', params: { taxid: item.taxid } },
    local_samples: { name: 'local_sample', params: { id: item.local_id } },
    annotations: { name: 'annotation', params: { name: item.name } }
})