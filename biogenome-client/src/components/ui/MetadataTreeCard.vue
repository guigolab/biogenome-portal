<template>
    <va-card>
        <va-card-title>{{ t('uiComponents.metadata') }}</va-card-title>
        <div class="row justify-center">
            <div class="flex lg6 md6">
                <va-input v-model="filter" placeholder="Filter..." clearable />
            </div>
            <div class="flex">
                <va-checkbox v-model="isFilterCaseSensitive" label="Case sensitive" />
            </div>
        </div>
        <div style="max-height: 400px;overflow: scroll;">
            <va-tree-view :nodes="nodes" :filter="filter" :filter-method="customFilterMethod" expand-all>
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
const isFilterCaseSensitive = ref(false)
const props = defineProps<{
    metadata: Record<string, any>
}>()
const customFilterMethod = computed(() => {
    return isFilterCaseSensitive.value
        ? (node: TreeNode, filterText: string, key: any) => node[key].includes(filterText)
        : undefined;
})

const nodes = buildTree(props.metadata)
function buildTree(data: Record<string, any>): TreeNode[] {
    const keys = Object.keys(data);
    const treeNodes: TreeNode[] = [];


    for (const key of keys) {
        const value = data[key];

        if (Array.isArray(value)) {
            // If the value is an array, create child nodes for each item in the array
            const childNodes = value.map((item: any) => {
                if (typeof item === 'string') {
                    return { id: `${value}-${item}`, description: item };
                } else {
                    return buildTree(item);
                }
            });
            treeNodes.push({ id: key, label: key, children: childNodes });
        }
        else if (typeof value === 'object') {
            // If the value is an object, recursively build child nodes
            const childNode = buildTree(value);
            treeNodes.push({ id: key, label: key, children: [childNode] });
        } else {
            // If the value is a primitive, create a leaf node
            treeNodes.push({ id: key, label: key, description: value });
        }
    }

    return treeNodes;
}
</script>