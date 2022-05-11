<template>
    <b-row>
        <b-col>
            <div>
            <b-table
                :fields="fields"
                :items="items"
                no-border-collapse
                small
                responsive
                :stacked="stacked"
                :head-variant="hVariant? hVariant: 'light'"
                :busy="isBusy"
                :ref="ref"
                show-empty
                :id="id"
                :current-page="currentPage"
                :per-page="perPage"
                :filter-ignored-fields="ignoredFields"
                :filter="filter"
                :filter-included-fields="filterOn"
                :sort-direction="sortDirection"
                :selectable="selectable"
                :selectMode="selectMode"
                :primary-key="primaryKey"
                :sticky-header="stickyHeader"
                :borderless="borderless"
                @row-selected="onRowSelected"
                :table-class="tableClass"
                filter-debounce="300"
                :fixed="fixed"
                sort-icon-left
            >
                <template v-for="(_, slotName) of $scopedSlots" v-slot:[slotName]="scope">
                    <slot :name="slotName" v-bind="scope"/>
                </template>
            </b-table>
            </div>
        </b-col>
    </b-row>
</template>
<script>
import { BTable } from 'bootstrap-vue'

//congifurable bv table
export default {
    props: ['stacked','fields','primaryKey','items','isBusy',
    'ref','currentPage', 'perPage','ignoredFields',
    'borderless','filter','filterOn','sortDirection',
    'customFields','stickyHeader','id','selectable','selectMode','hVariant','tableClass','fixed'],
    components: {
        BTable,
    },
    methods:{
    onRowSelected(items) {
        this.$emit('row-selected', items)
      }
    }
}
</script>