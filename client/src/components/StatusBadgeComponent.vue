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
                'Mapped Reads Submitted': 'warning',
                'Biosample Submitted': 'secondary',
            }
        }
    }
}
</script>