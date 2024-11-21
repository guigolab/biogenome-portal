<template>
    <TreeTable :value="nodes" tableStyle="min-width: 50rem">
        <Column field="name" header="Name" expander style="width: 34%"></Column>
        <Column field="size" header="Size" style="width: 33%"></Column>
        <Column field="type" header="Type" style="width: 33%"></Column>
    </TreeTable>
</template>
<script setup lang="ts">

import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';


const nodes = [
    { key: 'Test', children: [{ key: 'Test 2' }] }
]
</script>