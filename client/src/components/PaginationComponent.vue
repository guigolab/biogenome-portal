<template>
    <b-row>
        <b-col class="my-1">
          <b-form-group
            label="Per page"
            label-for="per-page-select"
            label-cols-sm="6"
            label-cols-md="4"
            label-cols-lg="3"
            label-align-sm="right"
            label-size="sm"
            class="mb-0"
          >
            <b-form-select
              id="per-page-select"
              v-model="perPage"
              :options="pageOptions"
              size="sm"
            ></b-form-select>
          </b-form-group>
        </b-col>
        <b-col class="my-1">
          <b-pagination
            v-model="currentPage"
            :total-rows="totalRows"
            :per-page="perPage"
            align="fill"
            size="sm"
            class="my-0"
            :aria-controls="tableId"
          ></b-pagination>
        </b-col>
        <b-col cols="2" class="my-1">
          <p><strong>Total items: {{totalRows}} </strong></p>
        </b-col>
    </b-row>
</template>
<script>
import {BPagination,BFormGroup,BFormSelect} from 'bootstrap-vue'
import {mapFields} from '../helper'

export default {
    props: 
        ['pageOptions','tableId'],
    components: {
        BPagination,BFormGroup,BFormSelect
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