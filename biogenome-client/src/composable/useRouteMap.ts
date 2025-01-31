export const routeMap = (item: any) => ({
    assemblies: { name: 'item', params: {model: 'assemblies', id: item.accession } },
    biosamples: { name: 'item', params: {model: 'biosamples', id: item.accession } },
    experiments: { name: 'item', params: {model: 'experiments', id: item.experiment_accession } },
    organisms: { name: 'item', params: {model: 'organisms', id: item.taxid } },
    local_samples: { name: 'item', params: {model: 'local_samples', id: item.local_id } },
    annotations: { name: 'item', params: {model: 'annotations', id: item.name } }
})