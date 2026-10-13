<script setup>
import { useList } from './composables/useList.js'
import { useSavedLists } from './composables/useSavedLists.js'
import { useAuth } from './composables/useAuth.js'
import { localStore, cloudStore } from './composables/savedListStores.js'
import ArmyList from './components/ArmyList.vue'
import SavedLists from './components/SavedLists.vue'
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
  snapshot,
  load,
} = useList()

const { user, authError, signIn, signOut } = useAuth()

const { savedLists, currentId, listName, dirty, error, save, open, newList, removeSaved } =
  useSavedLists({
    snapshot,
    load,
    reset,
    user,
    local: localStore('warhammer-list:lists'),
    cloud: uid => cloudStore(uid, 'warhammer-lists'),
  })
</script>

<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-6xl mx-auto space-y-8">
      <SavedLists
        v-model:name="listName"
        :saved-lists="savedLists"
        :current-id="currentId"
        :dirty="dirty"
        :user="user"
        :error="error || authError"
        @sign-in="signIn"
        @sign-out="signOut"
        @open="open"
        @new="newList"
        @save="save"
        @delete="removeSaved"
      />
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
