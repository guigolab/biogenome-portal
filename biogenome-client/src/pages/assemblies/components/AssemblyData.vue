<template>
    
</template>
<script setup lang="ts">
import AssemblyService from '../../../services/clients/AssemblyService'
import { onMounted, reactive, ref } from 'vue'
import Jbrowse2 from '../../../components/genome-browser/Jbrowse2.vue'
import { Assembly, AssemblyAdapter } from '../../../data/types';

const props = defineProps<{
    accession: string,
    assemblyName:string
}>()

const { data } = await AssemblyService.getRelatedAnnotations(props.accession)
data.forEach((d: { name: any; gff_gz_location: any; tab_index_location: any }) => {
    const track = {
        type: "FeatureTrack",
        trackId: d.name,
        name: d.name,
        assemblyNames: [props.assemblyName],
        category: ["Genes"],
        adapter: {
            type: "Gff3TabixAdapter",
            gff_gz_location: {
                uri: d.gff_gz_location,
                locationType: "UriLocation"
            },
            index: {
                location: {
                    uri: d.tab_index_location,
                    locationType: "UriLocation"
                }
            }
        }
    }
    jbrowse.annotations.push({ ...track })
})

function parseAssembly(assembly: Assembly) {
    const assemblyAdapter: AssemblyAdapter = {
        name: assembly.assembly_name,
        sequence: {
            name: assembly.assembly_name,
            trackId: assembly.accession,
            type: 'ReferenceSequenceTrack',
            adapter: {
                type: 'RefGetAdapter',
                sequenceData: {},
            },
        },
    }
    assembly.chromosomes.forEach((chr) => {
        const key = 'insdc:' + chr.accession_version
        assemblyAdapter.sequence.adapter.sequenceData[key] = {
            name: chr.metadata.name,
            size: Number(chr.metadata.length),
        }
    })
    jbrowse.assembly = { ...assemblyAdapter }
}

function setDefaultSession() {
    const defaultSession = {
        name: 'My session',
        view: {
            id: 'linearGenomeView',
            type: 'LinearGenomeView',
            tracks: [
                {
                    // the first track displayed
                },
                {
                    // the second track displayed
                },
                {
                    // ...
                },
            ],
        },
    }
}

</script>