<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                Images (Optional)
            </h2>
            <p class="va-text-secondary">
                Create link to images, the images should be open access and ideally deposited in wikimedia or other open
                sources repositories
            </p>
        </VaCardContent>
        <VaCardContent>
            <div class="row">
                <div class="flex lg6 md6 sm12 xs12">
                    <VaInput v-model="organismStore.organismForm.image" label="Main Image">
                        <template #appendInner>
                            <VaIcon color="danger" name="fa-close" @click="removeAvatar" />
                        </template>
                    </VaInput>
                </div>
                <div v-if="organismStore.organismForm.image" class="flex lg6 md6 sm12 xs12">
                    <VaAvatar size="large" :src="organismStore.organismForm.image"> </VaAvatar>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <div v-for="(img, index) in organismStore.images" :key="index" class="row">
                <div class="flex lg6 md6 sm12 xs12">
                    <VaInput v-model="img.value" :label="`Image url ${index + 1}`">
                        <template #appendInner>
                            <VaIcon :disabled="!img.value" name="fa-close" color="danger"
                                @click="organismStore.images.splice(index, 1)" />
                        </template>
                    </VaInput>
                </div>
                <div v-if="img.value" class="flex lg6 md6 sm12 xs12">
                    <VaAvatar size="large" :src="img.value"> </VaAvatar>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton icon="add" @click="organismStore.images.push({ value: '' })">Add new
                        image</VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent v-if="validImages.length">
            <div class="row justify-center">
                <div class="flex">
                    <p class="va-text-bold">Images preview</p>

                </div>
            </div>
            <div class="row justify-center">
                <div class="flex lg10 md10 sm12 xs12">
                    <VaCarousel height="300px" :items="validImages" stateful />

                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useOrganismStore } from '../../stores/organism-store'

const organismStore = useOrganismStore()

const previewAvatar = ref(false)

const images = ref<Record<string, string>[]>([])

function removeAvatar() {
    organismStore.organismForm.image = ''
    previewAvatar.value = false

}
const validImages = computed(() => {
    return organismStore.images.map((v) => v.value).filter((url) => url)
})

onMounted(() => {
    if (organismStore.organismForm.image_urls.length === 0) return

    const parsedImages = organismStore.organismForm.image_urls.map((url) => {
        return {
            value: url,
        }
    })
    if (parsedImages.length) {
        images.value = [...parsedImages]
    }
})

</script>