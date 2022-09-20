<template>
    <!-- <div class="row justify--space-between">
        <div class="flex">
            <va-button-dropdown color="gray" leftIcon flat outline :label="(query.offset+1)+'-'+(limit+query.offset>total?total:limit+query.offset)+' of '+total">
                <va-button :disabled="query.offset === 0" @click="query.offset=0" flat color="gray">Start</va-button>
                <va-button :disabled="query.offset+limit >= total" @click="query.offset=total-limit" flat color="gray">End</va-button>
            </va-button-dropdown>
        </div>
        <div class="flex">
            <va-button color="gray" v-if="query.offset-limit >= 0" @click="query.offset=query.offset-limit" flat icon="chevron_left"/>
            <va-button color="gray" v-if="query.offset+limit < total" @click="query.offset=query.offset+limit" flat icon="chevron_right"/>
        </div> 
    </div> -->
    <div class="row justify--end align--center">
            <div class="flex">
                <va-button-dropdown color="primary" leftIcon flat outline :label="(query.offset+1)+'-'+(limit+query.offset>total?total:limit+query.offset)+' of '+total">
                    <va-button :disabled="query.offset === 0" @click="$emit('update',0)" flat color="primary">Start</va-button>
                    <va-button :disabled="query.offset+limit >= total" @click="$emit('update',total-limit)" flat color="primary">End</va-button>
                </va-button-dropdown>
                <va-button color="primary" :disabled="query.offset-limit < 0" @click="$emit('update',query.offset-limit)" flat icon="chevron_left"/>
                <va-button color="primary" :disabled="query.offset+limit >= total" @click="$emit('update',query.offset+limit)" flat icon="chevron_right"/>
            </div>
        </div>
</template>
<script setup>
import { ref,defineEmits } from 'vue'
const props = defineProps({
    query:Object,
    total:Number
})
const limit = ref(props.query.limit)

const emits = defineEmits(['update'])

</script>