<template>
  <div v-if="loadedProjects">
    <BioProjectsInfoBlock :bioprojects="loadedProjects" />
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card>
          <va-card-title> bioproject browser </va-card-title>
          <va-card-content>
            <div class="row">
              <div class="flex lg4 md4 sm12 xs12">
                <va-input
                  v-model="input"
                  clearable
                  label="BioProjects"
                  placeholder="Search BioProjects"
                  @keyup.enter="searchNode(input)"
                >
                  <template #prependInner>
                    <va-icon name="science" />
                  </template>
                  <template #append>
                    <va-button icon="search" @click="searchNode(input)"> </va-button>
                    <va-button color="danger" @click="getRootInfo(root)">Reset</va-button>
                  </template>
                </va-input>
              </div>
            </div>
            <va-divider />
          </va-card-content>
          <va-card-content>
            <div class="row">
              <div class="flex lg4 md4 sm12 xs12">
                <Tree :nodes="bioprojects" :track-by="trackBy" :expanded-nodes="expandedNodes" />
              </div>
            </div>
          </va-card-content>
        </va-card>
      </div>
    </div>
  </div>

  <!-- <va-inner-loading :loading="isLoading" :size="60">
                <div>
                    <Tree :nodes="tree.root" @update:expanded="fetchNode" :track-by="trackBy" :expanded-nodes="expandedNodes"/>
                </div>
            </va-inner-loading> -->
</template>
<script setup lang="ts">
  import Tree from '../../components/tree/Tree.vue'
  import { ref, onMounted } from 'vue'
  import BioProjectService from '../../services/clients/BioProjectService'
  import BioProjectsInfoBlock from './BioProjectsInfoBlock.vue'
  import OrganismService from '../../services/clients/OrganismService'
  import { BioProjectNode } from '../../data/types'

  const root = 'PRJNA533106'

  const trackBy = 'accession'

  const { data } = await BioProjectService.getBioProject(root)

  const bioprojects: BioProjectNode[] = await data.children

  const loadedProjects = ref<BioProjectNode[]>()

  const isLoading = ref(false)

  const input = ref('')

  const expandedNodes = ref([])

  function getStats() {
    let promises: Promise<void | Record<any, any>>[] = []
    const mappedChildren: BioProjectNode[] = []
    bioprojects.forEach((project) => {
      promises.push(
        OrganismService.getOrganismStats({ bioproject: project.accession }).then((resp) => {
          mappedChildren.push({ ...resp.data, ...project })
        }),
      )
    })
    Promise.all(promises).then(() => {
      loadedProjects.value = mappedChildren.sort((a, b) => b.leaves - a.leaves)
    })
    return
  }

  // async function getRootInfo() {
  //     isLoading.value = true
  //     const { data } = await BioProjectService.getBioProject(root)
  //     tree.root = [data]
  //     const sortedChildren = data.children.sort((a,b) => b.leaves - a.leaves)
  //     const labels = sortedChildren.map(ch => ch.title)
  //     const chartData = {
  //         labels: labels,
  //         datasets: [
  //             {
  //                 label:'organisms published by each project',
  //                 backgroundColor: primaryColorVariants,
  //                 data: sortedChildren.map(ch => ch.leaves)
  //             }
  //         ]
  //     }
  //     pieChartDataGenerated.value = chartData
  //     expandedNodes.value = [root]
  //     input.value = ''
  //     isLoading.value = false
  //     return
  //   }

  // async function searchNode(filter: string) {
  //     if(filter.length < 1) return
  //     isLoading.value = true
  //     const response = await BioProjectService.searchBioproject({name: filter})
  //     tree.root = response?.data
  //     expandedNodes.value = []
  //     isLoading.value = false
  //     return
  //   }

  //   async function fetchNode(nodeList: []) {
  //     if (nodeList.length < 1) return
  //     const nodeToFetch = nodeList.find((n) => !expandedNodes.value.includes(n))
  //     expandedNodes.value = nodeList
  //     const nodeObject = traverseTree(tree.root[0], nodeToFetch)
  //     if (nodeObject.children.every((child) => child.children)) return
  //     const response = await BioProjectService.getBioProject(nodeToFetch)
  //     nodeObject.children = response.data.children
  //   }

  //   function traverseTree(treeData, target) {
  //     if (treeData.taxid === target || treeData.accession === target) {
  //       return treeData
  //     }
  //     if (!treeData.children) return
  //     for (const child of treeData.children) {
  //       const found = traverseTree(child, target)

  //       if (found) {
  //         return found
  //       }
  //     }
  //   }

  onMounted(getStats)
</script>
