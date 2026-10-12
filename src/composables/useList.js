import { ref, computed } from 'vue'
import darkElvesUnits from '../data/dark-elves.json'
import skavenUnits from '../data/skaven.json'
import settings from '../data/settings.json'
import { CATEGORY_ORDER, CATEGORY_LABELS, ROLE_LABELS, MAGIC_TYPE_LABELS, CHAMPION_ITEM_TYPES } from './listConfig.js'

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

  const composition = computed(() =>
    settings.compositions.find(c => pointsCap.value <= c.maxPoints) ??
    settings.compositions[settings.compositions.length - 1]
  )

  const unitFor = entry => activeUnits.value.find(u => u.name === entry.name)

  // Magic item slots an entry currently has open. A slot is an allowance:
  // which item types it accepts, how many points it may hold in total, and
  // who holds it (matched against an item's `onlyFor`).
  //   single     - holds one item
  //   onePerType - holds one item of each type
  function itemSlots(unit, entry) {
    const slots = []
    const gifts = ['gifts_of_khaine']
    if (unit.giftsOfKhaine) {
      slots.push({ key: 'gifts', label: 'Gifts of Khaine', types: gifts, allowance: unit.giftsOfKhaine, holders: [unit.name] })
    }
    for (const c of unit.command ?? []) {
      if (!entry.command.includes(commandKey(c))) continue
      const holders = [c.name, unit.name]
      if (c.magicStandard) {
        slots.push({ key: 'standard', label: 'Magic Standard', types: ['magic_standard'], allowance: c.magicStandard, single: true, holders: [unit.name] })
      }
      if (c.magicItems) {
        slots.push({ key: 'championItems', label: `${c.name} magic items`, types: CHAMPION_ITEM_TYPES, allowance: c.magicItems, onePerType: true, holders })
      }
      if (c.giftsOfKhaine) {
        slots.push({ key: 'championGifts', label: `${c.name} Gifts of Khaine`, types: gifts, allowance: c.giftsOfKhaine, holders })
      }
    }
    return slots
  }

  // Items a slot may hold, ignoring what is already taken
  const slotItems = slot => activeUnits.value.filter(i =>
    slot.types.includes(i.type) &&
    i.pointsCost <= slot.allowance &&
    (!i.onlyFor || i.onlyFor.some(n => slot.holders.includes(n)))
  )

  // Held items that picking `item` would replace
  const replacedBy = (slot, item, held) =>
    slot.single ? held
      : slot.onePerType ? held.filter(h => h.type === item.type)
        : []

  // Whether `item` fits the slot's points total once it has replaced what it replaces
  function fits(slot, item, held) {
    const kept = held.filter(h => !replacedBy(slot, item, held).includes(h))
    return kept.reduce((sum, h) => sum + h.pointsCost, 0) + item.pointsCost <= slot.allowance
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
        const locked = !!o.requires && !roles.includes(o.requires)
        return {
          key: o.name,
          label: o.name,
          pointsCost: o.pointsCost,
          perModel: !!o.perModel,
          locked,
          selected: !locked && entry.options.includes(o.name),
        }
      })

      const slots = itemSlots(unit, entry).map(slot => {
        const names = entry.items[slot.key] ?? []
        const items = slotItems(slot)
        const held = items.filter(i => names.includes(i.name))
        const choices = items.map(i => {
          const selected = held.includes(i)
          return {
            name: i.name,
            typeLabel: MAGIC_TYPE_LABELS[i.type],
            pointsCost: i.pointsCost,
            description: i.description,
            selected,
            disabled: !selected && (
              (i.repeatable !== true && !!itemHeldBy(i.name)) || !fits(slot, i, held)
            ),
          }
        })
        return {
          key: slot.key,
          label: slot.label,
          allowance: slot.allowance,
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
        sum(slots.flatMap(s => s.choices.filter(i => i.selected)))

      return {
        id: entry.id,
        name: unit.name,
        category: unit.category,
        countsAsCore: unit.category === 'core' && unit.countsAsCore !== false,
        count: entry.count,
        sizable: (unit.count ?? 1) > 1,
        minSize: unit.minSize ?? 1,
        maxSize: unit.maxSize ?? null,
        description: unit.description,
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

  // Placeholder math: one slot per entry
  const slots = computed(() => {
    const count = cat => resolvedList.value.filter(u => u.category === cat).length
    const lord = count('lord')
    return {
      lord,
      character: lord + count('hero'),
      core: resolvedList.value.filter(u => u.countsAsCore).length,
      special: count('special'),
      rare: count('rare'),
    }
  })

  // Units offered by each header's add menu
  const available = computed(() =>
    Object.fromEntries(CATEGORY_ORDER.map(cat => [
      cat,
      activeUnits.value
        .filter(u => u.category === cat)
        .map(u => ({
          ...u,
          taken: u.repeatable === false && armyList.value.some(e => e.name === u.name),
        })),
    ]))
  )

  const listJson = computed(() => ({
    army: selectedArmy.value,
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
    armyList.value.push({
      id: nextId++,
      name: unit.name,
      count: unit.count ?? 1,
      command: [],
      options: [],
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
    // Drop items whose slot closed (e.g. the standard bearer was removed)
    const open = itemSlots(unitFor(entry), entry).map(s => s.key)
    entry.items = Object.fromEntries(Object.entries(entry.items).filter(([k]) => open.includes(k)))
  }

  function selectItem(id, slotKey, name) {
    const entry = armyList.value.find(u => u.id === id)
    const slot = itemSlots(unitFor(entry), entry).find(s => s.key === slotKey)
    if (!slot) return
    const items = slotItems(slot)
    const item = items.find(i => i.name === name)
    const names = entry.items[slotKey] ?? []
    if (!item || names.includes(name)) return
    if (item.repeatable !== true && itemHeldBy(name)) return
    const held = items.filter(i => names.includes(i.name))
    if (!fits(slot, item, held)) return
    const replaced = replacedBy(slot, item, held).map(i => i.name)
    entry.items = { ...entry.items, [slotKey]: [...names.filter(n => !replaced.includes(n)), name] }
  }

  function removeItem(id, slotKey, name) {
    const entry = armyList.value.find(u => u.id === id)
    if (!entry?.items[slotKey]) return
    entry.items = { ...entry.items, [slotKey]: entry.items[slotKey].filter(n => n !== name) }
  }

  // Selecting an option replaces any other option in the same group
  function toggleOption(id, name) {
    const entry = armyList.value.find(u => u.id === id)
    const choices = unitFor(entry).options ?? []
    const choice = choices.find(o => o.name === name)
    if (!choice) return
    if (entry.options.includes(name)) {
      entry.options = entry.options.filter(n => n !== name)
      return
    }
    const sameGroup = choice.group
      ? choices.filter(o => o.group === choice.group).map(o => o.name)
      : []
    entry.options = [...entry.options.filter(n => !sameGroup.includes(n)), name]
  }

  function remove(id) {
    armyList.value = armyList.value.filter(u => u.id !== id)
  }

  function reset() {
    armyList.value = []
  }

  function switchArmy(key) {
    armyList.value = []
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
    remove,
    reset,
    switchArmy,
  }
}
