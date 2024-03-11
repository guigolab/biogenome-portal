<template>
    <va-divider>Links to the Species images</va-divider>
    <va-card-content>
        <va-input v-model="organismStore.organismForm.image" label="avatar">
            <template #append>
                <va-icon :disabled="!organismStore.organismForm.image" color="primary" name="visibility"
                    @click="previewAvatar = true" />
                <va-icon color="danger" name="delete" @click="removeAvatar" />
            </template>
        </va-input>
        <va-avatar v-show="previewAvatar" size="large" :src="organismStore.organismForm.image"> </va-avatar>
    </va-card-content>
    <va-card-content>
        <div v-for="(img, index) in organismStore.images" :key="index">
            <va-input v-model="img.value" class="mt-3" :label="`Image url ${index + 1}`">
                <template #appendInner>
                    <va-icon :disabled="!img.value" name="delete" color="danger" @click="images.splice(index, 1)" />
                </template>
            </va-input>
        </div>
        <va-button class="mt-3" icon="add" @click="organismStore.images.push({ value: '' })">Add new image</va-button>
        <va-carousel v-if="validImages.length" height="300px" :ratio="4 / 3" :items="validImages" stateful />
    </va-card-content>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useOrganismStore } from '../../../../stores/organism-store'

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