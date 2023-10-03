<template>
    <va-card>
        <va-card-title>{{ t('uiComponents.metadata') }}</va-card-title>
        <va-card-content>
            <div class="row align-center">
                <div class="flex lg6 md6">
                    <va-input v-model="filter" placeholder="Filter..." clearable />
                </div>
            </div>
        </va-card-content>
        <va-divider />
        <div style="max-height: 400px;overflow: scroll;">
            <va-tree-view :nodes="nodes" :filter="filter" :filter-method="customFilterMethod">
                <template #content="node">
                    <div class="flex items-center">
                        <div class="mr-2">
                            <b v-if="node.label" class="display-6">{{ node.label }}</b>
                            <p v-if="node.description" class="va-text-secondary mb-0">
                                {{ node.description }}
                            </p>
                        </div>
                    </div>
                </template>
            </va-tree-view>
        </div>
    </va-card>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { TreeNode } from 'vuestic-ui/web-components';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const filter = ref('')
const props = defineProps<{
    metadata: Record<string, any>
}>()
const customFilterMethod = computed(() => {
    return (node: TreeNode, filterText: string, key: any) => {
        return (node.label && node.label.includes(filterText)) || 
        (node.description && typeof node.description === 'string' && node.description.includes(filterText))}
})

const nodes = buildTree(props.metadata, undefined)

function buildTree(data: Record<string, any>, parentKey: string | undefined): TreeNode[] {
    const keys = Object.keys(data);
    const treeNodes: TreeNode[] = [];
    //
    for (const key of keys) {
        const value = data[key];
        const id = parentKey ? `${parentKey}-${key}` : key
        if (!Boolean(value)) continue
        if (Array.isArray(value)) {
            // If the value is an array, create child nodes for each item in the array
            const childNodes = value.flatMap((item: any) => {
                if (typeof item === 'string') {
                    return { id: `${value}-${item}`, label: key, description: item };
                } else {
                    return buildTree(item,id);
                }
            });
            treeNodes.push({ id: id, label: key, children: childNodes });
        }
        else if (typeof value === 'object') {
            // If the value is an object, recursively build child nodes
            const childNodes = buildTree(value, id);
            treeNodes.push({ id: id, label: key, children: childNodes });
        } else if (typeof value == 'string' && value.split(';').length > 1) {
            const childNodes = value.split(';').map((v: string, i: number) => {
                return { id: `${id}-${i}` ,description: v }
            })
            // If the value is a primitive, create a leaf node
            treeNodes.push({ id: id, label: key, children: childNodes });
        } else {
            treeNodes.push({ id: id, label: key, description: value });

        }
    }
    console.log(treeNodes)
    return treeNodes;
}
</script>