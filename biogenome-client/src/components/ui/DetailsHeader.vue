<template>
    <div class="row row-equal justify-space-between">
        <div class="flex">
            <h1 class="va-h1">{{ details.title }}</h1>
            <p v-if="details.description">{{ details.description }}</p>
            <div v-if="hasButtons" class="row">
                <div v-if="details.button1" class="flex">
                    <va-button preset="primary" icon="pets" :to="details.button1.route">{{ details.button1.label }}</va-button>
                </div>
                <div v-if="details.button2" class="flex">
                    <va-button :to="details.button2.route" preset="primary" icon="fa-vial">{{ details.button2.label }}</va-button>
                </div>
                <div v-if="details.blobtoolkit" class="flex">
                    <va-button target="_blank" :href="`https://blobtoolkit.genomehubs.org/view/GCA_905340225.1/dataset/${details.blobtoolkit}/blob#Filters`" preset="primary" color="#9c528b" icon-right="arrow_forward">BlobToolKit</va-button>
                </div>
            </div>
        </div>
        <div class="flex" v-if="details.ncbiPath || details.ebiPath">
            <div class="row row-equal align-center">
                <div class="flex">
                    <a target="_blank" :href="details.ncbiPath">
                        <va-avatar size="large">
                            <img :src="'/ncbi.png'" />
                        </va-avatar>
                    </a>
                </div>
                <div class="flex">
                    <a target="_blank" :href="details.ebiPath">
                        <va-avatar size="large">
                            <img :src="'/ena.jpeg'" />
                        </va-avatar>
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Details } from '../../data/types';


const props = defineProps<{details: Details}>()

const hasButtons = computed(()=>{
    return props.details.button1 || props.details.button2 || props.details.blobtoolkit
})
</script>