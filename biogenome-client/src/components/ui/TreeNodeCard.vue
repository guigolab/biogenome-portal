<template>
  <va-card v-if="showDetails" stripe :stripe-color="selectedNode.color" class="box">
    <va-card-content style="text-align: start">
      <va-list>
        <va-list-item>
          <va-list-item-section>
            <va-list-item-label>
              {{ `${selectedNode.name} (${selectedNode.rank})` }}
            </va-list-item-label>

            <va-list-item-label caption>
              <p class="va-title">taxid: {{ selectedNode.taxid }}</p>
              <p v-if="selectedNode.leaves" class="va-title">organisms: {{ selectedNode.leaves }}</p>
            </va-list-item-label>
          </va-list-item-section>
          <va-list-item-section icon>
            <va-icon color="danger" name="close" @click="showDetails = false" />
          </va-list-item-section>
        </va-list-item>
      </va-list>
    </va-card-content>
    <va-card-actions align="between">
      <va-button size="small" @click="$emit('toOrganismList', selectedNode.taxid)">see organisms</va-button>
      <va-button v-if="selectedNode.leaves" size="small" @click="updateTree(selectedNode)">generate tree</va-button>
    </va-card-actions>
  </va-card>
</template>
<script setup lang="ts"></script>
