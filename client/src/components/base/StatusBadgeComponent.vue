<template>
    <b-badge pill :variant="colorOptions[status]">{{status}}</b-badge>
</template>
<script>

import {BBadge} from 'bootstrap-vue'

export default {
    props: ['status'],
    components: {BBadge},
    data(){
        return {
            colorOptions: {
                'Annotation Complete': 'success',
                'Annotation Submitted': 'info',
                'Assemblies Submitted': 'primary',
                'Reads Submitted': 'warning',
                'Biosample Submitted': 'success',
                'Sample Acquired':'info'
            }
        }
    }
}
</script>