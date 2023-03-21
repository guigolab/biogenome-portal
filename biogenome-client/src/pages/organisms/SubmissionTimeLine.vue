<template>
    <va-card no-padding-v>
        <!-- <va-card-title>{{ t('timelines.verticalCentered') }}</va-card-title>
        <va-card-content>
        <va-timeline vertical centered style="min-width: 300px">
            <va-timeline-item color="danger" active>
            <template #before>
                <span class="title title--danger va-timeline-item__text" :style="{ color: colors.danger }">
                {{ t('timelines.firstDate') }}
                </span>
            </template>
            <template class="after">
                <va-card stripe stripe-color="danger" class="mb-0">
                <va-card-title>{{ t('timelines.titleFirst') }}</va-card-title>
                <va-card-content>{{ t('timelines.contentFirst') }}</va-card-content>
                </va-card>
            </template>
            </va-timeline-item>
            <va-timeline-item color="danger" active>
            <template #before>
                <span class="title title--danger va-timeline-item__text" :style="{ color: colors.danger }">
                {{ t('timelines.secondDate') }}
                </span>
            </template>
            <template #after>
                <va-card stripe stripe-color="danger">
                <va-card-title>{{ t('timelines.titleSecond') }}</va-card-title>
                <va-card-content>{{ t('timelines.contentSecond') }}</va-card-content>
                </va-card>
            </template>
            </va-timeline-item>
            <va-timeline-item color="danger" active>
            <template #before>
                <span class="title title--danger va-timeline-item__text" :style="{ color: colors.danger }">
                {{ t('timelines.thirdDate') }}
                </span>
            </template>
            <template #after>
                <va-card stripe stripe-color="danger" class="mb-0">
                <va-card-title>{{ t('timelines.titleThird') }}</va-card-title>
                <va-card-content>{{ t('timelines.contentThird') }}</va-card-content>
                </va-card>
            </template>
            </va-timeline-item>
        </va-timeline>
        </va-card-content> -->
    </va-card>
</template>
<script setup lang="ts">
// import { ref } from "vue"
// import OrganismService from "../../services/clients/OrganismService"


// const props = defineProps({
//     taxid: String
// })


// const {data} = await OrganismService.getOrganism(props.taxid)

// const keys = ['biosamples', 'local_samples', 'annotations', 'assemblies', 'reads']

// const dateFields = ['created', 'metadata.collection_date', 'metadata.submission_date', 'metadata.first_created']
// const submissions = ref([])

// await parseData(data)

// async function parseData(data){

//     const validKeys = Object.keys(data).filter( k => keys.includes(k) && data[k].length )

//     validKeys.forEach(async k => {
//         const {data} = await OrganismService.getOrganismRelatedData(props.taxid, k)
//         switch (k) {
//             case 'biosamples':
//                 const biosampleDates = data
//                 .filter(biosample => biosample.metadata && (biosample.metadata.collection_date || biosample.metadata['collection date'])).map(biosample => {
//                    const date = toDate((biosample.metadata.collection_date || biosample.metadata['collection date']))
//                    return {
//                         name: biosample.accession,
//                         date: date
//                    }
//                 })
//             break;
//         return
                
//         }
//     })

// }
// const toDate = (dateStr: string) => {
//     const date = new Date()
//     const [year, month] = dateStr.split('-')
//     date.setFullYear(Number(year), Number(month))
//     return date
//   }
</script>