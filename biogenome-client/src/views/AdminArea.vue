<template>
    <div class="layout">
        <div class="row">
            <div class="flex">
                <va-button-dropdown label="Import data from INSDC">
                    <ul>
                        <li v-for="(action,index) in importActions" :key="index">
                            <va-chip style="width: fit-content;" :to="action.path" square flat>{{action.label}}</va-chip>
                        </li>
                    </ul>
                </va-button-dropdown>
                <va-button-dropdown label="Create data locally">
                    <ul>
                        <li v-for="(action,index) in creationActions" :key="index">
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