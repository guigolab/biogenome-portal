<template>
    <b-row>
        <b-col lg="3">
          <b-input-group>
              <b-input-group-prepend>
                  <b-input-group-text id="per-page-text">Per page:</b-input-group-text>
              </b-input-group-prepend>
            <b-form-select
              id="per-page-select"
              v-model="perPage"
              :options="pageOptions"
            ></b-form-select>
          </b-input-group>
        </b-col>
        <b-col lg="7">
          <b-pagination
            class="organism-table-pagination"
            pills

            v-model="currentPage"
            :total-rows="totalRows"
            :per-page="perPage"
            align="fill"
            :aria-controls="tableId"
          ></b-pagination>
        </b-col>
        <b-col lg="2">
          <p style="float:right;"><strong>Total organisms: {{totalRows}} </strong></p>
        </b-col>
    </b-row>
</template>
<script>
import {BPagination,BFormSelect,BInputGroupPrepend,BInputGroup,BInputGroupText} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'

export default {
    props: 
        ['pageOptions','tableId'],
    components: {
        BPagination,BFormSelect,BInputGroupPrepend,BInputGroup,BInputGroupText
    },
    computed: {
        ...mapFields({
            fields: ['currentPage','totalRows','perPage'],
            module: 'portal',
            mutation: 'portal/setField' 
        })
    }
}
</script>
<style scoped>
#per-page-text{
    background: white;
    color: black;
    font-weight: bold;
    border-radius: 1.25rem 0 0 1.25rem;
}
#per-page-select{
  border-radius: 0 1.25rem 1.25rem 0;
}
</style>