<template>
    <va-card>
        <va-card-content>
            <va-list>
                <va-list-label> {{ t('organismDetails.publications') }} </va-list-label>
                <va-list-item v-for="(pub, index) in publications" :key="index" class="list__item"
                    :href="getLink(pub)" target="_blank">
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
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    publications:Record<string,string>[]
}>()

function getLink(publication: Record<string, string>) {
    if (publication.source === 'DOI') {
        return `https://doi.org/${publication.id}`
    } else if (publication.source === 'PubMed ID') {
        return `https://pubmed.ncbi.nlm.nih.gov/${publication.id}`
    } else {
        return `http://www.ncbi.nlm.nih.gov/pmc/articles/${publication.id}`
    }
}
</script>