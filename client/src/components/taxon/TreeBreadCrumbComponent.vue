<template>
<b-row>
    <b-col style="overflow: auto;min-height:50px">
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
</b-row>
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
        this.$store.commit('portal/removeTaxNameH', idx+1)
      }
      else {
        const previousName = this.taxNameHistory[idx-1]
        this.taxName =  previousName ? previousName : 'Eukaryota'
        this.$store.commit('portal/removeTaxNameH', idx)
      }
        this.$store.commit('portal/setTree',{value: this.taxName})
        this.$root.$emit('bv::refresh::table', 'organisms-table')

    }
    }
}
</script>