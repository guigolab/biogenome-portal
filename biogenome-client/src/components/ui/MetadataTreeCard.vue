<template>
    <div class="row align-center">
        <div class="flex">
            <va-input v-model="filter" placeholder="Type to search" clearable>
                <template #appendInner>
                    <VaIcon name="search"></VaIcon>
                </template>
            </va-input>
        </div>
    </div>
    <va-tree-view expand-all :nodes="currenNodes" :filter="filter" :filter-method="customFilterMethod">
        <template #content="node">
            <div class="flex items-center">
                <div class="mr-2">
                    <b v-if="node.label" class="display-6">{{ node.label }}</b>
                    <div v-if="node.description">
                        <a class="va-text-secondary mb-0" target="_blank"
                            v-if="node.description && typeof node.description === 'string' && node.description.includes('http')"
                            :href="node.description">{{ node.description }}</a>
                        <p v-else class="va-text-secondary mb-0">
                            {{ node.description }}
                        </p>
                    </div>
                </div>
            </div>
        </template>
    </va-tree-view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { TreeNode } from 'vuestic-ui/web-components';
type ObjectEntry = [string, any];
const filter = ref('')
const props = defineProps<{
    metadata: ObjectEntry[]
}>()
const customFilterMethod = computed(() => {
    return (node: TreeNode, filterText: string, key: any) => {
        return (node.label && node.label.includes(filterText)) ||
            (node.description && typeof node.description === 'string' && node.description.includes(filterText))
    }
})

const nodes = ref([...buildTree(props.metadata, undefined)])

const currenNodes = computed(() => {
    if (nodes.value.length) return nodes
    return [{ id: 'noMetadata', label: "No Metadata Found!", description: "No Metadata are linked to this item!" }]
})

function buildTree(data: ObjectEntry[], parentKey: string | undefined): TreeNode[] {
    const treeNodes: TreeNode[] = [];
    //
    for (const [key, value] of data) {
        const id = parentKey ? `${parentKey}-${key}` : key
        if (!Boolean(value)) continue
        if (Array.isArray(value)) {
            // If the value is an array, create child nodes for each item in the array
            const childNodes = value.flatMap((item: any) => {
                if (typeof item === 'string') {
                    return { id: `${value}-${item}`, label: key, description: item };
                } else {
                    return buildTree(Object.entries(item), id);
                }
            });
            treeNodes.push({ id: id, label: key, children: childNodes });
        }
        else if (typeof value === 'object') {
            // If the value is an object, recursively build child nodes
            const childNodes = buildTree(Object.entries(value), id);
            treeNodes.push({ id: id, label: key, children: childNodes });
        } else if (typeof value == 'string' && value.split(';').length > 1) {
            const childNodes = value.split(';').map((v: string, i: number) => {
                return { id: `${id}-${i}`, description: v }
            })
            // If the value is a primitive, create a leaf node
            treeNodes.push({ id: id, label: key, children: childNodes });
        } else {
            treeNodes.push({ id: id, label: key, description: value });

        }
    }
    return treeNodes;
}
</script>