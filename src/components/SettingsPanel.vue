<script setup>
import { ARMIES } from '../composables/useList.js'

defineProps({
  pointsCap: Number,
  composition: Object,
  slots: Object,
  selectedArmy: String,
})

const emit = defineEmits(['update:pointsCap', 'reset', 'army-change'])
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <select
        :value="selectedArmy"
        class="px-3 py-1.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        @change="emit('army-change', $event.target.value)"
      >
        <option v-for="army in ARMIES" :key="army.key" :value="army.key">{{ army.label }}</option>
      </select>

      <label class="flex items-center gap-2 text-sm text-muted-foreground">
        Points Cap
        <input
          type="number"
          :value="pointsCap"
          min="500"
          max="4000"
          step="250"
          class="w-28 px-3 py-1.5 rounded-md border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          @change="emit('update:pointsCap', Number($event.target.value))"
        />
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>Lords: {{ slots.lord }} / {{ composition.maxLords }}</span>
      <span>Characters: {{ slots.character }} / {{ composition.maxCharacters }}</span>
      <span>Core: {{ slots.core }} / {{ composition.minCore }}+</span>
      <span>Special: {{ slots.special }} / {{ composition.maxSpecial }}</span>
      <span>Rare: {{ slots.rare }} / {{ composition.maxRare }}</span>
    </div>

    <button
      class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
      @click="emit('reset')"
    >
      Reset List
    </button>
  </div>
</template>
