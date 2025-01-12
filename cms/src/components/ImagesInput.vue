<template>
    <div class="row">
        <div class="flex">
            <va-input v-model="organismStore.organismForm.image" label="avatar">
                <template #appendInner>
                    <va-icon color="danger" name="delete" @click="removeAvatar" />
                </template>
            </va-input>
        </div>
        <div class="flex">
            <va-avatar size="large" :src="organismStore.organismForm.image"> </va-avatar>

        </div>
    </div>
    <div v-for="(img, index) in organismStore.images" :key="index" class="row">
        <div class="flex">
            <va-input v-model="img.value" :label="`Image url ${index + 1}`">
                <template #appendInner>
                    <va-icon :disabled="!img.value" name="delete" color="danger" @click="organismStore.images.splice(index, 1)" />
                </template>
            </va-input>
        </div>
        <div class="flex">
            <va-avatar size="large" :src="img.value"> </va-avatar>
        </div>
    </div>
    <div class="row">
        <div class="flex">
            <va-button class="mt-3" icon="add" @click="organismStore.images.push({ value: '' })">Add new
                image</va-button>

        </div>
        <div v-if="validImages.length" class="flex">
            <va-carousel height="300px" :ratio="4 / 3" :items="validImages" stateful />

        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useOrganismStore } from '../stores/organism-store'

const organismStore = useOrganismStore()

const previewAvatar = ref(false)

const images = ref<Record<string, string>[]>([])

function removeAvatar() {
    organismStore.organismForm.image = ''
    previewAvatar.value = false
}
const validImages = computed(() => {
    return images.value.map((v) => v.value).filter((url) => url)
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