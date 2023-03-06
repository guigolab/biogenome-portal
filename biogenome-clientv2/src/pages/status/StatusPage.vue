<template>
  <va-tabs v-model="tab" grow>
    <template #tabs>
      <va-tab v-for="model in statusModel" :key="model.id" :name="model.id">
        {{ model.label }}
      </va-tab>
    </template>
  </va-tabs>
  <va-divider style="margin: 0"></va-divider>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-tree-view
        :nodes="tree.root"
        track-by="taxid"
        value-by="taxid"
        :expanded="expandendNodes"
        @update:expanded="fetchNode"
      >
        <template #content="node">
          <div @click.stop.prevent>
            <va-collapse :header="`${node.name} (${node.rank})`">
              <Suspense>
                <StatusNodeDetails
                  :key="node.taxid"
                  :taxid="node.taxid"
                  :columns="filteredColumns"
                  :filters="filteredFilters"
                  :selected-status-model="selectedStatusModel"
                />
              </Suspense>
            </va-collapse>
          </div>
          <!-- <div :class="selectedNode.taxid === node.taxid?'selected d-flex align-center':'d-flex align-center'">
                    <div style="margin-right: 0.5rem">
                      <b class="display-6">{{ node.name }}</b>
                      <p class="text--secondary mb-0">{{ node.rank}}</p>
                    </div>
                    <va-chip v-if="node.leaves" color="warning" size="small">{{ node.leaves }}</va-chip>
                    <va-button @click.prevent="selectNode(node)" preset="secondary" icon="open_in_new" style="margin-left: auto" />
                  </div> -->
        </template>
      </va-tree-view>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, onMounted, ref, watch, reactive } from 'vue'
  import { Filter } from '../../data/types'
  import { useStatusStore } from '../../stores/status-store'
  import OrganismService from '../../services/clients/OrganismService'
  import TaxonService from '../../services/clients/TaxonService'
  import StatusNodeDetails from './StatusNodeDetails.vue'

  const rootTaxid = '131567'
  const tree = reactive({
    root: [],
  })
  const statusStore = useStatusStore()
  const expandendNodes = ref([])

  const statusModel = [
    {
      id: 'insdc_status',
      label: 'INSDC Status',
    },
    {
      id: 'goat_status',
      label: 'GoaT Status',
    },
  ]
  const columns = ['scientific_name', 'tolid_prefix', 'insdc_status', 'goat_status', 'target_list_status']

  const filteredColumns = computed(() => {
    if (tab.value === 'goat_status') return columns.filter((f) => f !== 'insdc_status')
    return columns.filter((f) => f !== 'goat_status' && f !== 'target_list_status')
  })

  onMounted(async () => {
    // const {data} = await OrganismService.getOrganisms({...statusStore.searchForm, ...statusStore.pagination})
    // organisms.value = [...data.data]
    // total.value = data.total
    await getNodeInfo(rootTaxid)
  })

  const filters: Filter[] = [
    {
      label: 'search organism',
      placeholder: 'Search by species, taxid, common_name or tolid',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'filter by',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
    },
    {
      label: 'INSDC status',
      key: 'insdc_status',
      type: 'select',
      options: [
        'Sample Acquired',
        'Biosample Submitted',
        'Reads Submitted',
        'Assemblies Submitted',
        'Annotations Created',
      ],
    },
    {
      label: 'GoaT status',
      key: 'goat_status',
      type: 'select',
      options: [
        'Sample Collected',
        'Sample Acquired',
        'Data Generation',
        'In Assembly',
        'INSDC Submitted',
        'Publication Available',
      ],
    },
    {
      label: 'target list status',
      key: 'target_list_status',
      type: 'select',
      options: ['long_list', 'family_representative', 'other_priority'],
    },
  ]

  const filteredFilters = computed(() => {
    if (tab.value === 'goat_status') return filters.filter((f) => f.key !== 'insdc_status')
    return filters.filter((f) => f.key !== 'goat_status' && f.key !== 'target_list_status')
  })
  const tab = ref(statusModel[0].id)

  const selectedStatusModel = ref(statusModel[0])

  watch(tab, () => {
    selectedStatusModel.value = { ...statusModel.find((m) => m.id === tab.value) }
  })

  function traverseTree(treeData, target) {
    if (!treeData.children) return
    if (treeData.taxid === target) {
      return treeData
    }
    for (const child of treeData.children) {
      const found = traverseTree(child, target)
      if (found) {
        return found
      }
    }
  }

  //   async function selectNode(node) {
  //     offset.value = 1
  //     statusStore.resetSearchForm()
  //     statusStore.resetPagination()
  //     selectedNode.value = { ...node }
  //     statusStore.searchForm.parent_taxid = node.taxid
  //     query.value.taxon_lineage = node.taxid
  //     const { data } = await OrganismService.getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
  //     organisms.value = [...data.data]
  //     total.value = data.total
  //     counter.value++
  //   }

  async function fetchNode(nodeList: []) {
    if (nodeList.length < 1) return
    const nodeToFetch = nodeList.find((n) => !expandendNodes.value.includes(n))
    expandendNodes.value = nodeList
    const nodeObject = traverseTree(tree.root[0], nodeToFetch)
    if (!nodeObject) return
    if (nodeObject.children.every((child) => child.children)) return
    const { data } = await TaxonService.getTaxonChildren(nodeObject.taxid)
    nodeObject.children = [...data]
  }
  async function getNodeInfo(taxid: string) {
    const { data } = await TaxonService.getTaxon(taxid)
    tree.root = [data]
    return
  }
</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
  .selected::before {
    background-color: var(--va-primary);
    opacity: var(--va-tree-node-interactive-bg-opacity);
    content: '';
    background-color: var(--va-primary);
    border-radius: var(--va-tree-node-border-radius);
    bottom: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
  }
</style>
