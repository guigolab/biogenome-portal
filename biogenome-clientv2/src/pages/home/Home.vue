<template>
  <div style="margin-top: 20vh" class="row justify-center align-center">
    <div class="flex lg12 md12 sm12 xs12">
      <div class="row justify-center align-start inner-padding">
        <div class="flex lg4 md4">
          <va-card-content>
            <h1 style="text-align: end; font-size: 4.5rem">Display 1 Heading</h1>
          </va-card-content>
          <va-card-content>
            <p style="text-align: end; font-size: 1.2rem">
              Of all of the celestial bodies that capture our attention and fascination as astronomers, none has a
              greater influence on life on planet Earth than it’s own satellite, the moon. When you think about it.
            </p>
          </va-card-content>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
          <va-card-content>
            <va-tabs v-model="activeTab" grow>
              <template #tabs>
                <va-tab v-for="opt in rootOptions" :key="opt.name" :name="opt.name">
                  <va-icon :name="opt.icon" />
                  {{ opt.label }}
                </va-tab>
              </template>
            </va-tabs>
          </va-card-content>
          <va-card-content>
            <va-input
              v-model="input"
              clearable
              :label="selectedNode?.label"
              :placeholder="`Search in ${selectedNode?.label}`"
              @keyup.enter="searchNode(input)"
            >
              <template #prependInner>
                <va-icon :name="selectedNode?.icon" />
              </template>
              <template #append>
                <va-button icon="search" @click="searchNode(input)"> </va-button>
              </template>
            </va-input>
            <va-divider />
          </va-card-content>
          <va-card-content>
            <va-chip color="warning" icon="bla" /> Number of species under
            {{ selectedNode?.name === 'taxons' ? 'taxon' : 'bioproject' }}
          </va-card-content>
          <va-inner-loading :loading="isLoading" :size="60">
            <div>
              <va-tree-view
                :nodes="tree.root"
                :track-by="activeTab === 'taxons' ? 'taxid' : 'accession'"
                :value-by="activeTab === 'taxons' ? 'taxid' : 'accession'"
                :expanded="expandendNodes"
                @update:expanded="fetchNode"
              >
                <template #content="node">
                  <div class="d-flex align-center">
                    <div style="margin-right: 0.5rem">
                      <b class="display-6">{{ node.name || node.title }}</b>
                      <p class="text--secondary mb-0">{{ node.rank || node.accession }}</p>
                    </div>
                    <va-chip v-if="node.leaves" color="warning" size="small">{{ node.leaves }}</va-chip>
                    <va-button preset="secondary" icon="open_in_new" style="margin-left: auto" />
                  </div>
                </template>
              </va-tree-view>
            </div>
          </va-inner-loading>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { ref, computed, watch, reactive, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import CollapsableTreeView from '../../components/CollapsableTreeView.vue'
  import BioProjectService from '../../services/clients/BioProjectService'
  import TaxonService from '../../services/clients/TaxonService'

  const { t } = useI18n()
  const roots = {
    taxons: '2759',
    bioprojects: 'PRJNA533106',
  }
  const input = ref('')

  const expandendNodes = ref([])

  const isLoading = ref(false)

  const tree = reactive({
    root: [],
  })

  const activeTab = ref('taxons')

  const rootOptions = [
    {
      label: 'Taxons',
      name: 'taxons',
      icon: 'pets',
      get: TaxonService.getTaxon,
      search: TaxonService.searchTaxon,
    },
    {
      label: 'BioProjects',
      name: 'bioprojects',
      icon: 'science',
      get: BioProjectService.getBioProject,
      search: BioProjectService.searchBioproject,
    },
  ]
  const selectedNode = computed(() => {
    return rootOptions.find((opt) => opt.name === activeTab.value)
  })

  async function getNodeInfo(id: string) {
    isLoading.value = true
    const response = await selectedNode.value?.get(id)
    tree.root = [response?.data]
    isLoading.value = false
    return
  }

  async function searchNode(filter: string) {
    isLoading.value = true
    const response = await selectedNode.value?.search({ name: filter })
    tree.root = response?.data
    expandendNodes.value = []
    isLoading.value = false
    return
  }

  async function fetchNode(nodeList: []) {
    if (nodeList.length < 1) return
    console.log(nodeList)
    console.log(expandendNodes.value)
    const nodeToFetch = nodeList.find((n) => !expandendNodes.value.includes(n))
    expandendNodes.value = nodeList
    const nodeObject = traverseTree(tree.root[0], nodeToFetch)
    if (nodeObject.children.every((child) => child.children)) return
    const response = await selectedNode.value?.get(nodeToFetch)
    nodeObject.children = response.data.children
  }

  function traverseTree(treeData, target) {
    if (!treeData.children) return
    if (treeData.taxid === target || treeData.accession === target) {
      return treeData
    }
    for (const child of treeData.children) {
      const found = traverseTree(child, target)

      if (found) {
        return found
      }
    }
  }
  watch(activeTab, () => {
    const value = activeTab.value
    input.value = ''
    getNodeInfo(roots[value])
    expandendNodes.value = [roots[activeTab.value]]
  })

  onMounted(() => {
    getNodeInfo(roots[activeTab.value])
    expandendNodes.value.push(roots[activeTab.value])
  })
</script>
<style scoped>
  .internal-padding {
    padding: 16px;
  }
</style>
