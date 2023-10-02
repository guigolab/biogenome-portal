<template>
    <va-card>
        <va-image fit="fill" :src="images[currentImageIndex]" style="height: 300px" />
        <va-card-title>
            <va-button preset="plain" icon-right="fa-arrow-circle-right" @click="showModal">
                {{ t('dashboard.info.exploreGallery') }}
            </va-button>
        </va-card-title>
    </va-card>
    <va-modal size="large" v-model="modal">
        <va-carousel height="400" lazy fit="contain" v-model="currentImageIndex" :items="images" class="gallery-carousel" />
    </va-modal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    images: string[]
}>()

const modal = ref(false)
const currentImageIndex = ref(0)
function showModal() {
    modal.value = true
}
</script>