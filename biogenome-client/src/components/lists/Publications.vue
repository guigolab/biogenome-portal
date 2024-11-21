<template>
    <va-list>
        <va-list-item v-for="(pub, index) in publications" :key="index" class="list__item" :href="getLink(pub)"
            target="_blank">
            <va-list-item-section>
                <va-list-item-label>
                    <strong>{{ pub.source }}</strong>
                </va-list-item-label>
            </va-list-item-section>
            <va-list-item-section>
                <va-list-item-label>
                    {{ pub.id }}
                </va-list-item-label>
            </va-list-item-section>
        </va-list-item>
    </va-list>
</template>
<script setup lang="ts">

const props = defineProps<{
    publications: Record<string, string>[]
}>()

function getLink(publication: Record<string, string>) {
    switch (publication.source) {
        case 'DOI':
            return `https://doi.org/${publication.id}`
        case 'PubMed ID':
            return `https://pubmed.ncbi.nlm.nih.gov/${publication.id}`
        default:
            return `http://www.ncbi.nlm.nih.gov/pmc/articles/${publication.id}`
    }

}
</script>