<script setup>
import { Info, X } from 'lucide-vue-next'
const props = defineProps({ unit: Object })
const emit = defineEmits(['resize', 'toggle-command', 'toggle-option', 'select-item', 'remove-item', 'remove'])

// A single slot lists every item so the current one shows as the value;
// other slots show held items as chips and list only what can be added.
const addable = slot => slot.single ? slot.choices : slot.choices.filter(i => !i.selected)

function groupChoices(slot) {
  const groups = new Map()
  for (const i of addable(slot)) {
    if (!groups.has(i.typeLabel)) groups.set(i.typeLabel, [])
    groups.get(i.typeLabel).push(i)
  }
  return Array.from(groups, ([label, choices]) => ({ label, choices }))
}

function pickItem(slot, event) {
  const name = event.target.value
  if (name) {
    emit('select-item', props.unit.id, slot.key, name)
  } else {
    const current = slot.choices.find(i => i.selected)
    if (current) emit('remove-item', props.unit.id, slot.key, current.name)
  }
  if (!slot.single) event.target.value = ''
}

const chipClass = selected => [
  'px-2 py-0.5 text-xs font-normal rounded-md border transition-colors disabled:opacity-40',
  selected
    ? 'bg-primary text-primary-foreground border-primary'
    : 'border-border text-muted-foreground hover:bg-accent',
]
</script>

<template>
  <li class="group pl-4 border-l-2 border-border text-neutral-700 space-y-1">
    <div class="flex items-center gap-2">
      <input
        v-if="unit.sizable"
        type="number"
        :value="unit.count"
        :min="unit.minSize"
        :max="unit.maxSize"
        :aria-label="`${unit.name} unit size`"
        class="w-16 px-2 py-0.5 rounded-md border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        @change="emit('resize', unit.id, Number($event.target.value)); $event.target.value = unit.count"
      />
      <span class="relative group/tooltip flex items-center gap-1.5">
        {{ unit.name }} — {{ unit.totalCost }} pts
        <Info v-if="unit.description" class="w-3 h-3 text-muted-foreground shrink-0" />
        <span
          v-if="unit.description"
          class="absolute left-0 top-6 w-64 p-3 bg-neutral-900 text-white text-xs rounded-md opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-10 shadow-lg"
          v-html="unit.description"
        />
      </span>
      <button
        class="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 rounded transition-all shrink-0"
        @click="emit('remove', unit.id)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>

    <div v-if="unit.command.length || unit.options.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="c in unit.command"
        :key="c.key"
        :class="chipClass(c.selected)"
        :aria-pressed="c.selected"
        :disabled="c.taken"
        @click="emit('toggle-command', unit.id, c.key)"
      >
        {{ c.label }} +{{ c.pointsCost }}
      </button>
      <button
        v-for="o in unit.options"
        :key="o.key"
        :class="chipClass(o.selected)"
        :aria-pressed="o.selected"
        :disabled="o.locked"
        @click="emit('toggle-option', unit.id, o.key)"
      >
        {{ o.label }} {{ o.pointsCost ? `+${o.pointsCost}` : 'free' }}{{ o.perModel ? ' / model' : '' }}
      </button>
    </div>

    <div v-for="slot in unit.slots" :key="slot.key" class="flex flex-wrap items-center gap-1.5">
      <template v-if="!slot.single">
        <span class="text-xs text-muted-foreground">
          {{ slot.label }} ({{ slot.spent }} / {{ slot.allowance }} pts)
        </span>
        <template v-for="i in slot.choices" :key="i.name">
          <button
            v-if="i.selected"
            :class="[chipClass(true), 'relative group/item flex items-center gap-1']"
            :aria-label="`Remove ${i.name}`"
            @click="emit('remove-item', unit.id, slot.key, i.name)"
          >
            {{ i.name }} +{{ i.pointsCost }}
            <X class="w-3 h-3" />
            <span
              v-if="i.description"
              class="absolute left-0 top-6 w-64 p-3 bg-neutral-900 text-white text-xs text-left rounded-md opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-10 shadow-lg"
              v-html="i.description"
            />
          </button>
        </template>
      </template>

      <select
        :value="slot.single ? (slot.choices.find(i => i.selected)?.name ?? '') : ''"
        :aria-label="`${unit.name} ${slot.label}`"
        class="px-2 py-0.5 rounded-md border border-border bg-white text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        @change="pickItem(slot, $event)"
      >
        <option value="">{{ slot.single ? `${slot.label} (up to ${slot.allowance} pts)` : 'Add…' }}</option>
        <template v-if="slot.grouped">
          <optgroup v-for="group in groupChoices(slot)" :key="group.label" :label="group.label">
            <option v-for="i in group.choices" :key="i.name" :value="i.name" :disabled="i.disabled">
              {{ i.name }} +{{ i.pointsCost }}
            </option>
          </optgroup>
        </template>
        <template v-else>
          <option v-for="i in addable(slot)" :key="i.name" :value="i.name" :disabled="i.disabled">
            {{ i.name }} +{{ i.pointsCost }}
          </option>
        </template>
      </select>

      <template v-if="slot.single">
        <template v-for="i in slot.choices" :key="i.name">
          <span v-if="i.selected && i.description" class="relative group/item flex items-center">
            <Info class="w-3 h-3 text-muted-foreground shrink-0" />
            <span
              class="absolute left-0 top-5 w-64 p-3 bg-neutral-900 text-white text-xs rounded-md opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-10 shadow-lg"
              v-html="i.description"
            />
          </span>
        </template>
      </template>
    </div>
  </li>
</template>
