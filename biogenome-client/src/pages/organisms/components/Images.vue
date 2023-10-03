<template>
    <va-card>
        <va-image :ratio="1" :src="images[currentImageIndex]" style="height: 400px" />
        <va-card-title>
            <va-button preset="plain" icon-right="fa-arrow-circle-right" @click="showModal">
                {{ t('dashboard.info.exploreGallery') }}
            </va-button>
        </va-card-title>
    </va-card>
    <va-modal v-model="modal">
        <va-carousel :ratio="4/3" lazy v-model="currentImageIndex" :items="images" class="gallery-carousel" />
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
<style lang="scss" scoped>

.gallery-carousel {
    width: 80vw;
    max-width: 100%;

    @media all and (max-width: 576px){
        width: 100%;
    }
}
</style>