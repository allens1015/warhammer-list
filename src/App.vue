<script setup>
import { useList } from './composables/useList.js'
import ArmyList from './components/ArmyList.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const {
  selectedArmy,
  pointsCap,
  listJson,
  listText,
  available,
  overCap,
  slots,
  composition,
  add,
  resize,
  toggleCommand,
  toggleOption,
  selectItem,
  removeItem,
  setGeneral,
  duplicate,
  remove,
  reset,
  switchArmy,
} = useList()
</script>

<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-6xl mx-auto space-y-8">
      <SettingsPanel
        v-model:pointsCap="pointsCap"
        :selected-army="selectedArmy"
        :composition="composition"
        :slots="slots"
        @reset="reset"
        @army-change="switchArmy"
      />
      <ArmyList
        :list="listJson"
        :text="listText"
        :available="available"
        :over-cap="overCap"
        @add="add"
        @resize="resize"
        @toggle-command="toggleCommand"
        @toggle-option="toggleOption"
        @select-item="selectItem"
        @remove-item="removeItem"
        @set-general="setGeneral"
        @duplicate="duplicate"
        @remove="remove"
      />
    </div>
  </div>
</template>
