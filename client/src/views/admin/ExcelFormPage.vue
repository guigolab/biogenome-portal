<template>
      <b-row>
          <b-col>
            <excel-sample-parser v-if="!Boolean(xml)" v-on:xml-generated="onXMLGenerated"/>
          </b-col>
      </b-row>
</template>

<script>
import ExcelSampleParser from '../../components/ParserComponent.vue'
// import SampleFormComponent from '../components/SampleFormComponent.vue'
// import MultiForm from '../components/MultiForm.vue'


export default {
    name: 'excel-form-page',
    data() {
        return {
            xml:null
        }
    },
        methods: {
             onXMLGenerated(value){
                 this.xml = value
                    console.log(value)
            }
           
    },
    components: {
        ExcelSampleParser        }
    }
        
</script>
<style>
</style>
