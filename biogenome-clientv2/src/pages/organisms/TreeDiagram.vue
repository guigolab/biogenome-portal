<template>
  {{ text }}
  <div ref="tree" class="tree" />
</template>

<script setup lang="ts">
  import * as am5 from '@amcharts/amcharts5'
  import am5themes_Animated from '@amcharts/amcharts5/themes/Animated'
  import { ref, onMounted } from 'vue'
  import * as am5hierarchy from '@amcharts/amcharts5/hierarchy'
  import TaxonService from '../../services/clients/TaxonService'
  const tree = ref()

  const node = '2759'

  onMounted(async () => {
    createTreeDiagram()
  })

  const text = ref('')
  async function createTreeDiagram() {
    const root = am5.Root.new(tree.value)
    root.setThemes([am5themes_Animated.new(root)])
    const container = root.container.children.push(
      am5.Container.new(root, {
        width: am5.percent(100),
        height: am5.percent(100),
        layout: root.verticalLayout,
      }),
    )

    const series = container.children.push(
      am5hierarchy.Tree.new(root, {
        singleBranchOnly: false,
        downDepth: 1,
        initialDepth: 1,
        topDepth: 0,
        valueField: 'leaves',
        categoryField: 'name',
        childDataField: 'children',
        orientation: 'horizontal',
      }),
    )

    const { data } = await TaxonService.getTree(node)
    // data.children = (await TaxonService.getTaxonChildren(node)).data

    // series.nodes.template.events.on('click', async (event)=>{
    //     const node = event.target
    //     const item = node.dataItem
    //     const children = (await TaxonService.getTaxonChildren(item.dataContext.taxid)).data
    //     const fetchedNode = traverseTree(series.data.values[0], item.dataContext.taxid)
    //     fetchedNode.children = [...children]

    //     // console.log(fetchedNode)
    // })

    // series.nodes.each(async (node) => {
    //     const children = [...(await TaxonService.getTaxonChildren(node.dataItem?.dataContext.taxid)).data]

    // })
    series.data.setAll([data])

    // series.set("selectedDataItem", series.dataItems[0]);
  }
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
</script>
<style scoped>
  .tree {
    width: 100%;
    height: 400px;
  }
</style>
