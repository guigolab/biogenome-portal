<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center">
                <div class="flex">
                    <h3 class="va-h6">Metadata</h3>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaInput v-model="filter" placeholder="Type to search metadata" clearable>
                        <template #append>
                            <VaButton style="margin-left: 5px;" preset="primary" color="textPrimary"
                                @click="copyToClipboard" icon="fa-copy">
                            </VaButton>
                            <VaButton style="margin-left: 5px;" preset="primary" color="textPrimary"
                                @click="downloadJsonFile" icon="fa-cloud-download">

                            </VaButton>
                        </template>
                    </VaInput>
                </div>
            </div>
            <VaTreeView style="max-height: 300px;overflow: scroll;" expand-all :nodes="currenNodes" :filter="filter"
                :filter-method="customFilterMethod">
                <template #content="node">
                    <div class="flex items-center">
                        <div class="mr-2">
                            <b v-if="node.label" class="display-6">{{ node.label }}</b>
                            <div v-if="node.description">
                                <a :style="{'color': colors.primary}" class="mb-0" target="_blank"
                                    v-if="node.description && typeof node.description === 'string' && node.description.includes('http')"
                                    :href="node.description">{{ node.description }}</a>
                                <p v-else class="mb-0">
                                    {{ node.description }}
                                </p>
                            </div>
                        </div>
                    </div>
                </template>
            </VaTreeView>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { TreeNode, useColors, VaTreeView } from 'vuestic-ui/web-components';
import { useToast } from 'vuestic-ui/web-components';

const { init } = useToast()
type ObjectEntry = [string, any];
const filter = ref('')
const props = defineProps<{
    metadata: ObjectEntry[]
    id: string
}>()


const {colors} = useColors()
// Pretty-print JSON
const formattedJson = computed(() => JSON.stringify(Object.fromEntries(props.metadata), null, 2));

// Function to copy JSON to the clipboard
const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(formattedJson.value);
        init({ message: "JSON copied to clipboard!", });
    } catch (err) {
        init({ message: "Failed to copy JSON: " + err, color: 'danger' });

    }
};

// Function to download JSON as a file
const downloadJsonFile = () => {
    const blob = new Blob([formattedJson.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${props.id}.json`;
    link.click();
    URL.revokeObjectURL(url); // Clean up
};

const customFilterMethod = computed(() => {
    return (node: TreeNode, filterText: string, key: any) => {
        return (node.label && node.label.includes(filterText)) ||
            (node.description && typeof node.description === 'string' && node.description.includes(filterText))
    }
})

const currenNodes = computed(() => {
    const metadataLenght = props.metadata.length
    if (metadataLenght === 0) return
    const tree = buildTree(props.metadata, undefined)
    if (tree.length) return tree
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