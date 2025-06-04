<template>
    <VaCollapse v-model="isExpanded" :header="t('taxon.taxonomicTree')">
        <div>
            <div class="tree-content">
                <div v-for="(ancestor, index) in ancestors" :key="ancestor.taxid" class="tree-node">
                    <div class="tree-line" :style="{ marginLeft: `${index * 20}px` }">
                        <VaIcon v-if="index < ancestors.length - 1" name="fa-chevron-right" size="small" />
                        <span class="node-name" :class="{ 'current': ancestor.taxid === taxid }" @click="selectTaxon(ancestor)">
                            {{ ancestor.name }}
                        </span>
                        <span v-if="ancestor.leaves !== undefined" class="leaf-count">
                            ({{ ancestor.leaves }})
                        </span>
                    </div>
                </div>
                <div v-if="children.length" class="children-section">
                    <div v-for="child in children" :key="child.taxid" class="tree-node">
                        <div class="tree-line" :style="{ marginLeft: `${ancestors.length * 20}px` }">
                            <VaIcon name="fa-chevron-right" size="small" />
                            <span class="node-name va-text-primary" @click="selectTaxon(child)">
                                {{ child.name }}
                            </span>
                            <span v-if="child.leaves !== undefined" class="leaf-count va-text-secondary">
                                ({{ child.leaves }})
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </VaCollapse>
</template>

<script setup lang="ts">
import { computed, watchEffect, ref } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { TaxonNode } from '../data/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{
    taxid: string,
    expandAll?: boolean
}>();

const taxonomyStore = useTaxonomyStore();
const isExpanded = ref(false);

const ancestors = computed(() => taxonomyStore.ancestors);
const children = computed(() => taxonomyStore.children);

watchEffect(async () => {
    if (props.taxid) {
        await Promise.all([
            taxonomyStore.getAncestors(props.taxid),
            taxonomyStore.getChildren(props.taxid)
        ]);
    }
});

function selectTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon };
}
</script>

<style lang="scss" scoped>
.tree-content {
    min-width: max-content;
}

.tree-node {
    margin: 0.5rem 0;
}

.tree-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    white-space: nowrap;

    &:hover {
        background-color: var(--va-background-element);
        color: var(--va-primary);
    }
}

.node-name {
    cursor: pointer;

    &.current {
        font-weight: bold;
        color: var(--va-primary);
    }

    &:hover {
        text-decoration: underline;
    }
}

.leaf-count {
    font-size: 0.9em;
    margin-left: 0.25rem;
}

.children-section {
    margin-top: 0.5rem;
}
</style> 