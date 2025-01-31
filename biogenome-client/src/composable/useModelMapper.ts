const mapper = {
    experiments:{
        internalLinks: [
            {key:'sample_accession'}
        ],
        externalLinks:[],
        id: 'experiment_accession',
        scientific_name: (v:Record<string,any>) => v.scientific_name || v.metadata?.scientific_name,
        relatedData:{
            reads: {
                
            }
        }
    }
}


const links = {
    assemblies:[
        {
            key: "accession",
            label: "NCBI",
            internal: false,
            fn: (acc:string) => `https://www.ncbi.nlm.nih.gov/assembly/${acc}`,
            color: ""
        },
        {
            key: "accession",
            label: "ENA",
            internal: false,
            fn: (acc:string) =>  `https://www.ebi.ac.uk/ena/browser/view/${accession}`,
            color: ""
        },
        {
            key: "blobtoolkit_id",
            label: "Blobtoolkit",
            internal: false,
            fn: (id:string) => `https://blobtoolkit.genomehubs.org/view/${id}#Filters`,
            color: ""
        },
        {
            key: "sample_accession",
            label: "Related Sample",
            internal: true,
            fn: (acc:string) => `https://www.ncbi.nlm.nih.gov/assembly/${acc}`,
            color: ""
        },
        {
            key: "accession",
            label: "ENA",
            internal: false,
            fn: (acc:string) => `https://www.ncbi.nlm.nih.gov/assembly/${acc}`,
            color: ""
        },        {
            key: "accession",
            label: "ENA",
            internal: false,
            fn: (acc:string) => `https://www.ncbi.nlm.nih.gov/assembly/${acc}`,
            color: ""
        },        {
            key: "accession",
            label: "ENA",
            internal: false,
            fn: (acc:string) => `https://www.ncbi.nlm.nih.gov/assembly/${acc}`,
            color: ""
        },
    ]
}