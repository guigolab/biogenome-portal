<template>
    <div class="row">
        <div v-for="f in filteredModels" class="flex">
            <va-card :to="{ name: f.key }" class="hover-shadow">
                <va-card-content>
                    <div class="row">
                        <div class="flex">
                            <Counter :duration="2000" :target-value="f.count" />
                            <p>
                                {{ f.text }}
                            </p>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import Counter from '../common/Counter.vue'
import LookupService from '../../services/clients/LookupService';
import { onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { models } from '../../../config.json'

const { t } = useI18n()

const filteredModels = reactive(
    Object.keys(models)
        .filter(m => m !== 'status')
        .map(m => {
            return {
                key: m,
                text: t(`sidebar.${m}`),
                count: 0
            }
        })
)


onMounted(async () => {
    const { data } = await LookupService.lookupData()
    filteredModels.forEach(f => {
        if (data[f.key]) {
            f.count = data[f.key]
        }
    })
})


</script>
<style scoped>
.hover-shadow:hover {
    box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}

</style>