import { ref, computed } from 'vue'
import darkElvesUnits from '../data/dark-elves.json'
import skavenUnits from '../data/skaven.json'
import settings from '../data/settings.json'
import { CATEGORY_ORDER, CATEGORY_LABELS, ROLE_LABELS, MAGIC_TYPE_LABELS, MAGIC_ITEM_TYPES, WIZARD_ITEM_TYPES } from './listConfig.js'

const ARMY_DATA = {
  'dark-elves': { label: 'Dark Elves', units: darkElvesUnits },
  'skaven': { label: 'Skaven', units: skavenUnits },
}

export const ARMIES = Object.entries(ARMY_DATA).map(([key, { label }]) => ({ key, label }))

// A command entry is identified by its name, or by its role when unnamed
const commandKey = c => c.name ?? c.role

let nextId = 1

export function useList() {
  const selectedArmy = ref('dark-elves')
  const activeUnits = computed(() => ARMY_DATA[selectedArmy.value].units)

  const pointsCap = ref(settings.pointsCapDefault)
  // Entries hold selections only:
  // { id, name, count, command: [keys], options: [names], items: { slotKey: [names] } }
  const armyList = ref([])
  const generalId = ref(null)

  const composition = computed(() =>
    settings.compositions.find(c => pointsCap.value <= c.maxPoints) ??
    settings.compositions[settings.compositions.length - 1]
  )

  const unitFor = entry => activeUnits.value.find(u => u.name === entry.name)

  // Some Generals move units to Core (Hellebron: Witch Elves)
  const generalUnit = computed(() => {
    const entry = armyList.value.find(e => e.id === generalId.value)
    return entry ? unitFor(entry) : null
  })
  const categoryOf = unit =>
    generalUnit.value?.generalMakesCore?.includes(unit.name) ? 'core' : unit.category

  const canBeGeneral = unit =>
    ['lord', 'hero'].includes(unit.category) && unit.canBeGeneral !== false

  // The General should be the eligible character with the highest Leadership.
  // Allowed anyway, but the General's row carries a warning when it isn't.
  const generalWarning = computed(() => {
    const general = generalUnit.value
    if (general?.leadership == null) return null
    const better = armyList.value
      .map(unitFor)
      .filter(u => canBeGeneral(u) && u.leadership > general.leadership)
    if (!better.length) return null
    const best = Math.max(...better.map(u => u.leadership))
    const names = [...new Set(better.filter(u => u.leadership === best).map(u => u.name))]
    return `The General must have the highest Leadership in the army. ` +
      `${general.name} has Leadership ${general.leadership}; ${names.join(' and ')} ${names.length > 1 ? 'have' : 'has'} ${best}.`
  })

  const selectedOptions = (unit, entry) =>
    (unit.options ?? []).filter(o => entry.options.includes(o.name))

  // Magic item slots an entry currently has open. A slot is an allowance:
  // which item types it accepts, how many points it may hold in total (no
  // `allowance` = no limit), and who holds it (matched against `onlyFor`).
  //   single     - holds one item
  //   onePerType - holds one item of each type
  //   excludes   - slot keys that must be empty for this slot to hold anything
  function itemSlots(unit, entry) {
    const slots = []
    const gifts = ['gifts_of_khaine']
    const options = selectedOptions(unit, entry)
    if (unit.magicItems) {
      // A number is the allowance; an object may also narrow the types
      const config = typeof unit.magicItems === 'number' ? { allowance: unit.magicItems } : unit.magicItems
      slots.push({
        key: 'items',
        label: 'Magic items',
        types: config.types ?? (unit.wizard ? WIZARD_ITEM_TYPES : MAGIC_ITEM_TYPES),
        allowance: config.allowance,
        onePerType: true,
        holders: [unit.name],
        excludes: ['battleStandard'],
      })
    }
    if (unit.giftsOfKhaine) {
      slots.push({ key: 'gifts', label: 'Gifts of Khaine', types: gifts, allowance: unit.giftsOfKhaine, holders: [unit.name] })
    }
    // A battle standard may be a magic banner of any cost, but then no other magic items
    if (options.some(o => o.battleStandard)) {
      slots.push({ key: 'battleStandard', label: 'Magic banner', types: ['magic_standard'], single: true, holders: [unit.name], excludes: ['items'] })
    }
    for (const c of unit.command ?? []) {
      if (!entry.command.includes(commandKey(c))) continue
      const holders = [c.name, unit.name]
      if (c.magicStandard) {
        slots.push({ key: 'standard', label: 'Magic Standard', types: ['magic_standard'], allowance: c.magicStandard, single: true, holders: [unit.name] })
      }
      if (c.magicItems) {
        slots.push({ key: 'championItems', label: `${c.name} magic items`, types: MAGIC_ITEM_TYPES, allowance: c.magicItems, onePerType: true, holders })
      }
      if (c.giftsOfKhaine) {
        slots.push({ key: 'championGifts', label: `${c.name} Gifts of Khaine`, types: gifts, allowance: c.giftsOfKhaine, holders })
      }
    }
    const mounted = options.some(o => o.group === 'Mount')
    return slots.map(slot => ({ ...slot, mounted }))
  }

  const cap = slot => slot.allowance ?? Infinity

  // Items a slot may hold, ignoring what is already taken
  const slotItems = slot => activeUnits.value.filter(i =>
    slot.types.includes(i.type) &&
    i.pointsCost <= cap(slot) &&
    (!i.onlyFor || i.onlyFor.some(n => slot.holders.includes(n))) &&
    !(i.onFootOnly && slot.mounted)
  )

  // A slot is blocked while a slot it excludes holds something
  const blocked = (slot, entry) =>
    (slot.excludes ?? []).some(key => (entry.items[key] ?? []).length > 0)

  // Items an entry holds in a slot. Stackable items (Dispel Scroll) may repeat.
  const heldItems = (slot, entry) => {
    const items = slotItems(slot)
    return (entry.items[slot.key] ?? []).map(n => items.find(i => i.name === n)).filter(Boolean)
  }

  // Held items that picking `item` would replace. Stackable items sit
  // outside the one-per-type rule.
  const replacedBy = (slot, item, held) =>
    slot.single ? held
      : slot.onePerType && !item.stackable ? held.filter(h => h.type === item.type && !h.stackable)
        : []

  // Whether `item` fits the slot's points total once it has replaced what it replaces
  function fits(slot, item, held) {
    const kept = held.filter(h => !replacedBy(slot, item, held).includes(h))
    return kept.reduce((sum, h) => sum + h.pointsCost, 0) + item.pointsCost <= cap(slot)
  }

  // Drop items the entry can no longer hold (slot closed, mount taken, ...)
  function pruneItems(entry) {
    const items = {}
    for (const slot of itemSlots(unitFor(entry), entry)) {
      const allowed = slotItems(slot).map(i => i.name)
      const kept = (entry.items[slot.key] ?? []).filter(n => allowed.includes(n))
      if (kept.length) items[slot.key] = kept
    }
    entry.items = items
  }

  // Magic items are one per army unless marked repeatable
  const itemHeldBy = name => armyList.value.find(e =>
    Object.values(e.items).some(names => names.includes(name))
  )

  // Entries joined with their unit data; all costs are derived here.
  // pointsCost in the data is per model.
  const resolvedList = computed(() =>
    armyList.value.map(entry => {
      const unit = unitFor(entry)

      const command = (unit.command ?? []).map(c => {
        const key = commandKey(c)
        const selected = entry.command.includes(key)
        return {
          key,
          label: c.name ?? ROLE_LABELS[c.role],
          pointsCost: c.pointsCost,
          selected,
          taken: !selected && c.repeatable === false &&
            armyList.value.some(e => e.command.includes(key)),
        }
      })

      // An option with `requires` needs a command entry of that role selected
      const roles = (unit.command ?? [])
        .filter(c => entry.command.includes(commandKey(c)))
        .map(c => c.role)

      const options = (unit.options ?? []).map(o => {
        const missingRole = !!o.requires && !roles.includes(o.requires)
        const selected = !missingRole && entry.options.includes(o.name)
        const takenElsewhere = !!o.onePerArmy &&
          armyList.value.some(e => e.id !== entry.id && e.options.includes(o.name))
        return {
          key: o.name,
          label: o.name,
          group: o.group ?? null,
          required: !!o.required,
          pointsCost: o.pointsCost,
          perModel: !!o.perModel,
          locked: missingRole || (!selected && takenElsewhere),
          selected,
        }
      })

      const slots = itemSlots(unit, entry).map(slot => {
        const held = heldItems(slot, entry)
        const isBlocked = blocked(slot, entry)
        const choices = slotItems(slot).map(i => {
          const qty = held.filter(h => h === i).length
          const addable = i.stackable || qty === 0
          return {
            name: i.name,
            typeLabel: MAGIC_TYPE_LABELS[i.type],
            pointsCost: i.pointsCost,
            description: i.description,
            selected: qty > 0,
            qty,
            addable,
            disabled: addable && (
              isBlocked || (i.repeatable !== true && !!itemHeldBy(i.name)) || !fits(slot, i, held)
            ),
          }
        })
        return {
          key: slot.key,
          label: slot.label,
          allowance: slot.allowance ?? null,
          spent: held.reduce((total, i) => total + i.pointsCost, 0),
          single: !!slot.single,
          grouped: slot.types.length > 1,
          choices,
        }
      })

      const picked = options.filter(o => o.selected)
      const sum = items => items.reduce((total, i) => total + i.pointsCost, 0)
      const modelCost = unit.pointsCost + sum(picked.filter(o => o.perModel))
      const totalCost = modelCost * entry.count +
        sum(picked.filter(o => !o.perModel)) +
        sum(command.filter(c => c.selected)) +
        slots.reduce((total, s) => total + s.spent, 0)

      return {
        id: entry.id,
        name: unit.name,
        category: categoryOf(unit),
        countsAsCore: categoryOf(unit) === 'core' && unit.countsAsCore !== false,
        canBeGeneral: canBeGeneral(unit),
        isGeneral: entry.id === generalId.value,
        generalWarning: entry.id === generalId.value ? generalWarning.value : null,
        count: entry.count,
        sizable: (unit.count ?? 1) > 1,
        minSize: unit.minSize ?? 1,
        maxSize: unit.maxSize ?? null,
        description: unit.description,
        maxPerSlot: unit.maxPerSlot ?? 1,
        extraHeroSlots: selectedOptions(unit, entry).reduce((total, o) => total + (o.extraHeroSlots ?? 0), 0),
        command,
        options,
        slots,
        totalCost,
      }
    })
  )

  const pointsTotal = computed(() =>
    resolvedList.value.reduce((sum, u) => sum + u.totalCost, 0)
  )

  const overCap = computed(() => pointsTotal.value > pointsCap.value)

  // Choices used per category. Units with `maxPerSlot` share a choice (two
  // Reaper Bolt Throwers = one Rare); some mounts cost an extra Hero choice.
  const slots = computed(() => {
    const inCategory = cat => resolvedList.value.filter(u => u.category === cat)
    const choices = cat => {
      const byName = new Map()
      for (const u of inCategory(cat)) {
        byName.set(u.name, { n: (byName.get(u.name)?.n ?? 0) + 1, per: u.maxPerSlot })
      }
      return Array.from(byName.values()).reduce((total, { n, per }) => total + Math.ceil(n / per), 0)
    }
    const lord = inCategory('lord').length
    const extraHero = resolvedList.value.reduce((total, u) => total + u.extraHeroSlots, 0)
    return {
      lord,
      character: lord + inCategory('hero').length + extraHero,
      core: resolvedList.value.filter(u => u.countsAsCore).length,
      special: choices('special'),
      rare: choices('rare'),
    }
  })

  // Units offered by each header's add menu
  const available = computed(() =>
    Object.fromEntries(CATEGORY_ORDER.map(cat => [
      cat,
      activeUnits.value
        .filter(u => categoryOf(u) === cat)
        .map(u => ({
          ...u,
          taken: u.repeatable === false && armyList.value.some(e => e.name === u.name),
        })),
    ]))
  )

  const listJson = computed(() => ({
    army: selectedArmy.value,
    general: generalUnit.value?.name ?? null,
    pointsCap: pointsCap.value,
    pointsTotal: pointsTotal.value,
    sections: CATEGORY_ORDER.map(cat => {
      const units = resolvedList.value.filter(u => u.category === cat)
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        pointsTotal: units.reduce((sum, u) => sum + u.totalCost, 0),
        units,
      }
    }),
  }))

  function add(unit) {
    // A required group starts on its first option
    const required = new Map()
    for (const o of unit.options ?? []) {
      if (o.required && !required.has(o.group)) required.set(o.group, o.name)
    }
    armyList.value.push({
      id: nextId++,
      name: unit.name,
      count: unit.count ?? 1,
      command: [],
      options: [...required.values()],
      items: {},
    })
  }

  function resize(id, count) {
    const entry = armyList.value.find(u => u.id === id)
    if (!entry) return
    const unit = unitFor(entry)
    if ((unit.count ?? 1) > 1) {
      const size = Math.floor(count) || 0
      entry.count = Math.min(Math.max(size, unit.minSize ?? 1), unit.maxSize ?? Infinity)
    }
  }

  // Selecting a command entry replaces any other entry with the same role
  function toggleCommand(id, key) {
    const entry = armyList.value.find(u => u.id === id)
    const choices = unitFor(entry).command ?? []
    const choice = choices.find(c => commandKey(c) === key)
    if (!choice) return
    if (entry.command.includes(key)) {
      entry.command = entry.command.filter(k => k !== key)
    } else {
      if (choice.repeatable === false && armyList.value.some(e => e.command.includes(key))) return
      const sameRole = choices.filter(c => c.role === choice.role).map(commandKey)
      entry.command = [...entry.command.filter(k => !sameRole.includes(k)), key]
    }
    pruneItems(entry)
  }

  function selectItem(id, slotKey, name) {
    const entry = armyList.value.find(u => u.id === id)
    const slot = itemSlots(unitFor(entry), entry).find(s => s.key === slotKey)
    if (!slot || blocked(slot, entry)) return
    const item = slotItems(slot).find(i => i.name === name)
    const names = entry.items[slotKey] ?? []
    if (!item || (names.includes(name) && !item.stackable)) return
    if (item.repeatable !== true && itemHeldBy(name)) return
    const held = heldItems(slot, entry)
    if (!fits(slot, item, held)) return
    const replaced = replacedBy(slot, item, held).map(i => i.name)
    entry.items = { ...entry.items, [slotKey]: [...names.filter(n => !replaced.includes(n)), name] }
  }

  // Removes one copy
  function removeItem(id, slotKey, name) {
    const entry = armyList.value.find(u => u.id === id)
    const names = entry?.items[slotKey] ?? []
    const at = names.lastIndexOf(name)
    if (at < 0) return
    entry.items = { ...entry.items, [slotKey]: names.filter((_, i) => i !== at) }
  }

  // One General per army; picking the current one again clears it
  function setGeneral(id) {
    const entry = armyList.value.find(u => u.id === id)
    if (!entry || !canBeGeneral(unitFor(entry))) return
    generalId.value = generalId.value === id ? null : id
  }

  // Selecting an option replaces any other option in the same group
  function toggleOption(id, name) {
    const entry = armyList.value.find(u => u.id === id)
    const choices = unitFor(entry).options ?? []
    const choice = choices.find(o => o.name === name)
    if (!choice) return
    if (entry.options.includes(name)) {
      if (choice.required) return
      entry.options = entry.options.filter(n => n !== name)
    } else {
      if (choice.onePerArmy && armyList.value.some(e => e.options.includes(name))) return
      const sameGroup = choice.group
        ? choices.filter(o => o.group === choice.group).map(o => o.name)
        : []
      entry.options = [...entry.options.filter(n => !sameGroup.includes(n)), name]
    }
    pruneItems(entry)
  }

  function remove(id) {
    armyList.value = armyList.value.filter(u => u.id !== id)
    if (generalId.value === id) generalId.value = null
  }

  function reset() {
    armyList.value = []
    generalId.value = null
  }

  function switchArmy(key) {
    reset()
    selectedArmy.value = key
  }

  return {
    selectedArmy,
    pointsCap,
    armyList,
    listJson,
    available,
    pointsTotal,
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
    remove,
    reset,
    switchArmy,
  }
}
