<template>
    <div>
        <div class="row">
            <div class="flex">
                <va-button-dropdown label="Import data from INSDC">
                    <ul>
                        <li v-for="(action,index) in filteredActions.importActions" :key="index">
                            <va-chip style="width: fit-content;" :to="action.path" square flat>{{action.label}}</va-chip>
                        </li>
                    </ul>
                </va-button-dropdown>
                <va-button-dropdown label="Create data locally">
                    <ul>
                        <li v-for="(action,index) in filteredActions.creationActions" :key="index">
                            <va-chip style="width: fit-content;" :to="action.path" square flat>{{action.label}}</va-chip>
                        </li>
                    </ul>
                </va-button-dropdown>
            </div>
        </div>
        <router-view/>
    </div>
</template>
<script setup>
import { computed } from "vue"

const filteredActions = computed(()=>{
    const obj = {
        importActions:[],
        creationActions:[]
    }
    const role = localStorage.getItem('userRole')
    switch(role){
        case 'SampleManager':
            obj.importActions = importActions.filter(act => act.path === '/admin/biosample-form')
            obj.creationActions = creationActions.filter(act => act.path !== '/admin/organism-form')
            return obj
        default:
            obj.importActions = [...importActions]
            obj.creationActions = [...creationActions]
            return obj
    }
})

const importActions = [
    {label:'Biosample from EBI',path:'/admin/biosample-form'},
    {label:'Assembly from NCBI', path:'/admin/assembly-form'},
    {label:'Reads from ENA',path:'/admin/read-form'},
]

const creationActions = [
    {label:'Edit/Delete data', path:'/admin'},
    {label:'Create organism', path:'/admin/organism-form'},
    {label:'Import local samples from xlsx file', path:'/admin/excel-form'},
]

</script>