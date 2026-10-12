<script setup>
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import ArmyListItem from './ArmyListItem.vue'

const props = defineProps({
  list: Object,
  available: Object,
  overCap: Boolean,
})

const emit = defineEmits(['add', 'resize', 'toggle-command', 'toggle-option', 'select-item', 'remove-item', 'remove'])

const openCategory = ref(null)
const copied = ref(false)

function toggle(category) {
  openCategory.value = openCategory.value === category ? null : category
}

function addUnit(unit) {
  emit('add', unit)
  openCategory.value = null
}

function copyToClipboard() {
  navigator.clipboard.writeText(JSON.stringify(props.list, null, 2))
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl text-neutral-900">Army List</h2>
        <div class="text-sm text-muted-foreground mt-1">
          <span :class="overCap ? 'text-destructive font-medium' : ''">
            {{ list.pointsTotal }}
          </span>
          / {{ list.pointsCap }} pts
        </div>
      </div>
      <button
        class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        @click="copyToClipboard"
      >
        {{ copied ? 'Copied!' : 'Copy JSON' }}
      </button>
    </div>

    <div
      v-if="openCategory"
      class="fixed inset-0 z-10"
      @click="openCategory = null"
    />

    <div v-for="section in list.sections" :key="section.category" class="space-y-2">
      <div class="flex items-center gap-2 border-b border-border pb-1">
        <h3 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {{ section.label }}
        </h3>
        <span v-if="section.pointsTotal" class="text-xs text-muted-foreground/70">
          {{ section.pointsTotal }} pts
        </span>

        <div class="relative ml-auto">
          <button
            class="p-1 border border-border rounded-md hover:bg-accent transition-colors"
            :aria-label="`Add ${section.label} unit`"
            @click="toggle(section.category)"
          >
            <Plus class="w-4 h-4" />
          </button>

          <ul
            v-if="openCategory === section.category"
            class="absolute right-0 top-9 z-20 w-80 max-h-80 overflow-y-auto py-1 bg-popover border border-border rounded-md shadow-lg"
          >
            <li v-if="!available[section.category].length" class="px-3 py-1.5 text-sm text-muted-foreground">
              No units available.
            </li>
            <li v-for="unit in available[section.category]" :key="unit.name">
              <button
                class="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm font-normal text-left hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
                :disabled="unit.taken"
                @click="addUnit(unit)"
              >
                <span>{{ unit.name }}</span>
                <span class="text-muted-foreground shrink-0">
                  {{ unit.pointsCost }} {{ unit.count > 1 ? 'pts / model' : 'pts' }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <ul class="space-y-1">
        <ArmyListItem
          v-for="unit in section.units"
          :key="unit.id"
          :unit="unit"
          @resize="(id, count) => emit('resize', id, count)"
          @toggle-command="(id, key) => emit('toggle-command', id, key)"
          @toggle-option="(id, key) => emit('toggle-option', id, key)"
          @select-item="(id, slot, name) => emit('select-item', id, slot, name)"
          @remove-item="(id, slot, name) => emit('remove-item', id, slot, name)"
          @remove="emit('remove', $event)"
        />
      </ul>
    </div>
  </div>
</template>
