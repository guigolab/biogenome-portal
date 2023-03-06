<template>
    <div ref="tree" class="tree" />
  </template>
  
  <script setup lang="ts">
    import * as am5 from '@amcharts/amcharts5'
    import am5themes_Animated from '@amcharts/amcharts5/themes/Animated'
    import { ref, onMounted } from 'vue'
    import * as am5hierarchy from '@amcharts/amcharts5/hierarchy'
    import OrganismService from '../../services/clients/OrganismService'
    import TaxonService from '../../services/clients/TaxonService'  
    const props = defineProps({
      taxid: String,
    })
  
    const node = '2759'

    const tree = ref()
  
    onMounted(async () => {
        const { data } = await TaxonService.getTree(node)
      createSankeyDiagram(data)
    })
  
    async function createSankeyDiagram(data) {
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
        am5hierarchy.Treemap.new(root, {
          categoryField: 'category',
          idField: 'name',
          valueField: 'leaves',
          childDataField: 'children',
        }),
      )
      series.labels.template.setAll({
        text: "{id}: [bold]{value}[/]",
        fontSize: 14
    });
    //   series.nodes.template.set('tooltipText', '{id}')
    //   series.nodes.template.events.on('click', (event) => {
    //     console.log(event.target.dataItem.dataContext)
    //   })
  
      series.data.setAll([data])
    }
  </script>
  <style scoped>
    .tree {
      width: 100%;
      height: 100%;
    }
  </style>
  