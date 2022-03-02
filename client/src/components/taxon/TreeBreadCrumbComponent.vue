<template>
    <b-col lg="8" style="overflow: scroll;">
        <b-button-group>
            <b-button
                v-for="(taxNameRecord, idx) in taxNameHistory"
                :key="idx"
                @click="updateTaxName(idx)"
                :pressed="taxNameRecord === taxName"
                variant="outline-success"
            >
                <b-row style="margin-bottom:0px">
                    <b-col style="text-align:center">
                        <strong> {{taxNameRecord}} </strong>
                    </b-col>
                </b-row>
            </b-button>
        </b-button-group>
    </b-col>
</template>
<script>
import {BButtonGroup,BButton} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'

export default {
    components:{
        BButtonGroup,BButton
    },
    computed: {
        ...mapFields({
        fields: ['taxName'],
        module: 'portal',
        mutation: 'portal/setField'      
        }),
        taxNameHistory(){
        return this.$store.getters['portal/getTaxNameHistory']
        }
    },
    methods:{
    updateTaxName(idx){
      if(this.taxName !== this.taxNameHistory[idx]){
        this.taxName = this.taxNameHistory[idx]
      }
      else {
        this.taxName = this.taxNameHistory[idx-1]?this.taxNameHistory[idx-1]:'Eukaryota'
      }
        this.$store.commit('portal/removeTaxNameH', idx)
        this.$store.commit('portal/setTree',{value: this.taxName})
        this.$root.$emit('bv::refresh::table', 'organisms-table')

    }
    }
}
</script>