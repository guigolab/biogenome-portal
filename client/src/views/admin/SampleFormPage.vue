<template>
    <b-row>
        <b-col>
            <sample-form-container/>
        </b-col>
    </b-row>
</template>

<script>
import SampleFormContainer from '../../components/sample/SampleFormComponent.vue'




export default {
    components: {
        SampleFormContainer,
        }
    }
        
</script>
<style>
.card-container{
    margin-top: 10px;
    margin-bottom: 10px;
    min-height: 50vh;
}
</style>
