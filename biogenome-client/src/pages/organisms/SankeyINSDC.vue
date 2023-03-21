<template>
  <div ref="tree" class="tree" />
</template>

<script setup lang="ts">
  import * as am5 from '@amcharts/amcharts5'
  import am5themes_Animated from '@amcharts/amcharts5/themes/Animated'
  import { ref, onMounted } from 'vue'
  import * as am5hierarchy from '@amcharts/amcharts5/hierarchy'
  import OrganismService from '../../services/clients/OrganismService'

  const props = defineProps({
    taxid: String,
  })

  const tree = ref()

  onMounted(async () => {
    const { data } = await OrganismService.getINSDCSankeyData(props.taxid)
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
      am5hierarchy.ForceDirected.new(root, {
        categoryField: 'category',
        idField: 'name',
        // downDepth: 1,
        // initialDepth: 1,
        valueField: 'value',
        childDataField: 'children',
        linkWithField: 'links', 
        minRadius: 30,
        maxRadius: am5.percent(10),
        nodePadding: 5,
        velocityDecay: 0.9,
        centerStrength: 0.2,
        manyBodyStrength: 0.2,
        linkWithStrength:0.5,
        showOnFrame:50
      }),
    )
    series.nodes.template.setAll({
      toggleKey: "none",
      cursorOverStyle: "default"
    });
    series.nodes.template.set('tooltipText', '{id}')
    series.nodes.template.events.on('click', (event) => {
      console.log(event.target.dataItem.dataContext)
    })

    series.data.setAll([data])
  }
</script>
<style scoped>
  .tree {
    width: 100%;
    height: 100%;
  }
</style>
